# Vijaya Fabrics — Full-Stack Website

A website for **Vijaya Fabrics**, a saree and textile shop in Chirala, Andhra Pradesh — built as a Full Stack Web Development internship project (Task 3).

This is the **backend-powered version**: a Node.js/Express API on **MongoDB**, JWT-protected admin routes, customer accounts with cart/checkout/order tracking, and photo uploads — so catalog and order changes are visible to every visitor and staff member immediately, not just the device that made them.

## File structure

```
vijaya-fabrics/
├── backend/
│   ├── server.js              # Express app entry point — connects Mongo, then listens
│   ├── package.json
│   ├── .env.example           # copy to .env before running
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login — admin login (unchanged)
│   │   ├── customerAuth.js    # signup/login/refresh/logout, profile, saved addresses
│   │   ├── sarees.js          # GET/POST/PUT/DELETE /api/sarees
│   │   ├── categories.js      # GET /api/categories
│   │   ├── cart.js            # GET/POST/PUT/DELETE /api/cart
│   │   └── orders.js          # POST/GET /api/orders — checkout + order history/tracking
│   ├── middleware/
│   │   └── auth.js            # requireAdmin, requireCustomer, optionalCustomer
│   ├── models/
│   │   ├── Saree.js           # Mongoose schema for the catalog
│   │   ├── User.js            # customer accounts + embedded saved addresses
│   │   ├── Cart.js            # one cart document per user
│   │   └── Order.js           # order + shipping address + status history
│   ├── utils/
│   │   ├── mongo.js           # Mongoose connection helper
│   │   ├── db.js              # Mongo-backed catalog CRUD (same function names as before)
│   │   ├── seedSarees.js      # the 20 sample sarees, seeded into Mongo on first run
│   │   ├── tokens.js          # signs/verifies access & refresh JWTs, hashes refresh tokens
│   │   ├── categories.js      # category/subtype definitions + validators
│   │   └── swatch.js          # generates placeholder swatch images (SVG)
│   └── uploads/                # saree photos uploaded via the admin panel
│
├── frontend/
│   ├── index.html             # home page
│   ├── catalog.html           # full catalog with filters, detail modal, quick "+ Cart"
│   ├── cart.html              # cart page
│   ├── checkout.html          # address selection + place order
│   ├── profile.html           # personal info / saved addresses / order history & tracking
│   ├── admin.html             # login-gated admin panel (staff catalog management)
│   ├── css/style.css
│   └── js/
│       ├── api.js             # fetch wrapper: catalog + admin + api.customer/cart/orders
│       ├── common.js          # nav toggle, toasts, currency formatting
│       ├── auth.js            # login/signup modal, nav auth state, requireLogin() gate
│       ├── catalog.js         # catalog page logic + quick add-to-cart
│       ├── cart.js            # cart page logic
│       ├── checkout.js        # checkout page logic
│       ├── profile.js         # profile tabs: info, addresses, order tracking
│       └── admin.js           # admin login + CRUD logic
│
├── .gitignore
├── README.md
└── PITCH.md                   # client-facing pitch for the shop owner
```

## How it works

- **Frontend**: plain HTML/CSS/JS (no framework, no build step). Talks to the backend only through `fetch()` calls in `js/api.js`.
- **Backend**: Express serves both the REST API (`/api/...`) and the frontend's static files, so it's a single server to run and deploy.
- **Database**: **MongoDB**, via Mongoose. Four collections: `sarees`, `users` (with embedded saved addresses), `carts` (one per user), and `orders`. The catalog auto-seeds with the original 20 sample sarees the first time it's queried against an empty database.
- **Admin auth (unchanged)**: the admin panel logs in against a password stored in `.env` and receives a JWT, attached as `Authorization: Bearer <token>` on every add/edit/delete request.
- **Customer auth**: signup/login issue a short-lived **access token** (kept in memory in the browser, never localStorage) plus a long-lived **refresh token** stored as an **httpOnly cookie**. On every page load, the frontend silently calls `/api/auth/customer/refresh` to restore the session from that cookie — this is what keeps a customer logged in until they explicitly log out, without exposing a long-lived token to JS. Refresh tokens are stored server-side only as a SHA-256 hash and are rotated on every refresh, so logging out (or changing your password) immediately invalidates them.
- **Cart**: one cart document per logged-in customer, so it's the same cart whether they're on their phone or a shop computer. Browsing and viewing the catalog never requires login; adding to cart or checking out prompts a login/signup modal first.
- **Checkout & orders**: checkout collects a shipping address (from saved addresses or a new one, which also gets saved to the account) and places an order from the current cart (Cash on Delivery only for now — see "What's next" in `PITCH.md`). Orders carry a status (`Received → Processing → Packed → Shipped → Out for Delivery → Delivered`, or `Cancelled`) and a status history, shown to the customer as a tracker on their Profile → Order History tab.
- **Photo uploads**: handled by `multer`, saved into `backend/uploads/`, and served back at `/uploads/<filename>`. If no photo is uploaded, the server generates a branded placeholder swatch automatically.

## Running it locally.

You'll need a MongoDB instance — either a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (recommended, no local install) or a local `mongod`.

```bash
cd backend
cp .env.example .env      # then fill in MONGODB_URI and the token secrets — see below
npm install
npm start
```

Visit `http://localhost:4000`. The catalog, home page, cart, checkout, profile, and admin panel are all served from there — there's nothing separate to start for the frontend.

**Required `.env` values** (see `.env.example` for the full list with comments):
- `MONGODB_URI` — your connection string (Atlas or local)
- `ADMIN_PASSWORD`, `JWT_SECRET` — admin panel login (unchanged from before)
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — **two different** long random strings for customer login
- `COOKIE_SECURE` — leave `false` for local HTTP dev; set to `true` once the site is served over HTTPS

Admin login password (from `.env.example`): `vijaya2026`

## API reference

| Method | Endpoint                              | Auth              | Description                                     |
|--------|-----------------------------------------|:---:|--------------------------------------------------|
| GET    | `/api/categories`                       |     | List all categories & subtypes                   |
| GET    | `/api/sarees`                           |     | List sarees (`?category=&subtype=`)               |
| GET    | `/api/sarees/:id`                       |     | Get one saree                                     |
| POST   | `/api/auth/login`                       |     | Admin login, returns a JWT                        |
| POST   | `/api/sarees`                           | Admin | Add a saree (multipart form, `image` optional)  |
| PUT    | `/api/sarees/:id`                       | Admin | Update a saree                                   |
| DELETE | `/api/sarees/:id`                       | Admin | Delete a saree                                   |
| POST   | `/api/sarees/reset/seed`                | Admin | Reset catalog to the sample data                 |
| POST   | `/api/auth/customer/signup`             |     | Create a customer account, starts a session       |
| POST   | `/api/auth/customer/login`              |     | Log in, starts a session                          |
| POST   | `/api/auth/customer/refresh`            |     | Silently renew the session from the refresh cookie|
| POST   | `/api/auth/customer/logout`             |     | End the session, clear the refresh cookie         |
| GET    | `/api/auth/customer/me`                 | Customer | Get the logged-in customer's profile           |
| PUT    | `/api/auth/customer/me`                 | Customer | Update name/phone                              |
| PUT    | `/api/auth/customer/me/password`        | Customer | Change password                                |
| POST/PUT/DELETE | `/api/auth/customer/me/addresses[/:id]` | Customer | Manage saved addresses            |
| GET    | `/api/cart`                             | Customer | View the current cart                          |
| POST   | `/api/cart`                             | Customer | Add an item (`{ sareeId, qty }`)               |
| PUT    | `/api/cart/:sareeId`                    | Customer | Update an item's quantity                      |
| DELETE | `/api/cart/:sareeId` or `/api/cart`     | Customer | Remove one item, or clear the cart             |
| POST   | `/api/orders`                           | Customer | Place an order from the current cart           |
| GET    | `/api/orders`                           | Customer | Order history for the logged-in customer       |
| GET    | `/api/orders/:id`                       | Customer | One order's detail/tracking                    |

## Deploying it for real

This needs an actual Node.js host. Simple, mostly-free options:
- **Render** or **Railway**: point them at this repo, set the build command to `npm install` inside `backend/`, start command `node server.js`, and add the same environment variables from `.env.example` in their dashboard.
- Pair it with a free **MongoDB Atlas** cluster for `MONGODB_URI` — no server to manage.
- Set `ADMIN_PASSWORD`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` to real, different, random values in the host's environment settings — don't reuse the demo ones. Set `COOKIE_SECURE=true` once the site is on HTTPS (it will be, on Render/Railway).

## Notes on production-readiness

This is built to be genuinely usable, with a few honest simplifications worth knowing about before charging a client for it:
- **Single admin account**: fine for a small shop with one or two staff sharing a password; a bigger operation would want individual staff logins and a separate hidden admin login URL (planned next — see `PITCH.md`).
- **Cash on Delivery only**: there's no payment gateway wired in yet. `paymentStatus` on an order exists and is ready for one (e.g. Razorpay/Stripe) to update it.
- **No admin order management UI yet**: orders are fully modeled and trackable by customers, but staff currently can't see/update them from the admin panel — that's the next phase (CRM dashboard with analytics, from the requirements doc).
- **Uploaded photos live on the server's disk**: fine for one server; if you ever move to multiple servers or a platform with ephemeral storage, photos should move to something like Cloudinary or S3.
