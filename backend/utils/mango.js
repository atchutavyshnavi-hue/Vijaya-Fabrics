const mongoose = require("mongoose");

let connectingPromise = null;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and set it.");
  }

  connectingPromise = mongoose
    .connect(uri)
    .then((conn) => {
      console.log("MongoDB connected:", conn.connection.name);
      return conn.connection;
    })
    .catch((err) => {
      connectingPromise = null;
      throw err;
    });

  return connectingPromise;
}

module.exports = { connectMongo, mongoose };
