/**
 * One-off admin diagnostic/repair script.
 *
 * Why: since Phase 3, admin login checks a real, hashed account in MongoDB
 * (not a live comparison against ADMIN_EMAIL/ADMIN_PASSWORD). Those two env
 * vars only get used ONCE — to create the very first admin account, the
 * moment the admin collection is empty. If an admin document already
 * exists (from an earlier deploy, a typo, or a different password), editing
 * ADMIN_EMAIL/ADMIN_PASSWORD in Render afterwards does nothing, and the
 * login form will always say "Incorrect email or password" whether the
 * account doesn't exist at all or just has different credentials than
 * you're typing — that message is deliberately the same for both cases.
 *
 * This script tells you which situation you're actually in, and can fix it.
 *
 * USAGE — run this from Render's Shell tab for your backend service
 * (or locally, with your real MONGODB_URI in backend/.env):
 *
 *   cd backend
 *   node scripts/fixAdmin.js
 *       -> lists every admin account that currently exists (email, name,
 *          created date — never the password), so you can see whether one
 *          exists at all and which email it uses.
 *
 *   node scripts/fixAdmin.js --reset you@example.com "NewPassword123"
 *       -> creates that admin account if it doesn't exist yet, or resets
 *          its password if it does. Either way, you can log in with that
 *          email/password right after this finishes.
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectMongo, mongoose } = require("../utils/mongo");
const Admin = require("../models/admin");

async function main() {
  const args = process.argv.slice(2);
  await connectMongo();

  const admins = await Admin.find({}).select("email name createdAt");

  console.log("\n=== Current admin accounts ===");
  if (!admins.length) {
    console.log("(none — no admin account exists in the database yet)");
  } else {
    admins.forEach((a) => {
      console.log(`- ${a.email}  (name: ${a.name || "—"}, created: ${a.createdAt?.toISOString() || "unknown"})`);
    });
  }
  console.log("");

  const resetIndex = args.indexOf("--reset");
  if (resetIndex === -1) {
    if (!admins.length) {
      console.log(
        "No admin account exists yet, which is why every login attempt fails with\n" +
        "\"Incorrect email or password\" — that message doesn't distinguish\n" +
        "\"wrong password\" from \"no such account.\"\n\n" +
        "Run this again with --reset to create one:\n" +
        '  node scripts/fixAdmin.js --reset you@example.com "YourNewPassword"\n'
      );
    } else {
      console.log(
        "If none of the emails above is what you're typing to log in, or you've\n" +
        "forgotten the password for one of them, run:\n" +
        '  node scripts/fixAdmin.js --reset <email> "<newPassword>"\n' +
        "to reset it (or create a new admin with a different email).\n"
      );
    }
    await mongoose.disconnect();
    return;
  }

  const email = (args[resetIndex + 1] || "").trim().toLowerCase();
  const password = args[resetIndex + 2];

  if (!email || !password) {
    console.error('Usage: node scripts/fixAdmin.js --reset <email> "<newPassword>"');
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await Admin.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Password reset for existing admin: ${email}`);
  } else {
    await Admin.create({ email, passwordHash, name: "Admin" });
    console.log(`Created new admin account: ${email}`);
  }
  console.log("You can log in with that email and the password you just set.\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exitCode = 1;
});