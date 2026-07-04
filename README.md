# Vijaya Fabrics — Full-Stack Website

A website for **Vijaya Fabrics**, a saree and textile shop in Chirala, Andhra Pradesh — built as a Full Stack Web Development internship project (Task 3).

This is the **backend-powered version**: a Node.js/Express API with a real (file-based) database, JWT-protected admin routes, and photo uploads, so catalog changes made by staff are visible to every visitor — not just the device that made them.

## File structure

```
vijaya-fabrics/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── package.json
│   ├── .env.example           # copy to .env before running
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login
│   │   ├── sarees.js          # GET/POST/PUT/DELETE /api/sarees
│   │   └── categories.js      # GET /api/categories
│   ├── middleware/
│   │   └── auth.js            # JWT verification for admin-only routes
│   ├── utils/
│   │   ├── db.js              # JSON-file "database" + seed data + CRUD helpers
│   │   ├── categories.js      # category/subtype definitions + validators
│   │   └── swatch.js          # generates placeholder swatch images (SVG)
│   ├── data/
│   │   └── db.json            # auto-created on first run (git-ignored)
│   └── uploads/                # saree photos uploaded via the admin panel
│
├── frontend/
│   ├── index.html             # home page
│   ├── catalog.html           # full catalog with filters + detail modal
│   ├── admin.html             # login-gated admin panel
│   ├── css/style.css
│   └── js/
│       ├── api.js             # fetch wrapper for every backend call
│       ├── common.js          # nav toggle, toasts, currency formatting
│       ├── catalog.js         # catalog page logic
│       └── admin.js           # admin login + CRUD logic
│
├── .gitignore
├── README.md
└── PITCH.md                   # client-facing pitch for the shop owner
```

## How it works

- **Frontend**: plain HTML/CSS/JS (no framework, no build step). Talks to the backend only through `fetch()` calls in `js/api.js`.
- **Backend**: Express serves both the REST API (`/api/...`) and the frontend's static files, so it's a single server to run and deploy.
- **Database**: a JSON file (`backend/data/db.json`), read and written by `backend/utils/db.js`. This keeps the project dependency-free and easy to inspect, while behaving like a real shared database — every visitor sees the same catalog. Swapping in a proper database (SQLite, MongoDB, PostgreSQL) later only means rewriting `utils/db.js`; nothing else changes.
- **Auth**: the admin panel logs in against a password stored in `.env` and receives a JWT, which it attaches as `Authorization: Bearer <token>` on every add/edit/delete request. The server rejects those requests without a valid token.
- **Photo uploads**: handled by `multer`, saved into `backend/uploads/`, and served back at `/uploads/<filename>`. If no photo is uploaded, the server generates a branded placeholder swatch automatically.

## Running it locally

```bash
cd backend
cp .env.example .env      # then edit ADMIN_PASSWORD / JWT_SECRET if you want
npm install
npm start
```

Visit `http://localhost:4000`. The catalog, home page, and admin panel are all served from there — there's nothing separate to start for the frontend.

Admin login password (from `.env.example`): `vijaya2026`

## API reference

| Method | Endpoint                  | Auth required | Description                          |
|--------|----------------------------|:---:|---------------------------------------|
| GET    | `/api/categories`          |     | List all categories & subtypes        |
| GET    | `/api/sarees`               |     | List sarees (`?category=&subtype=`)   |
| GET    | `/api/sarees/:id`           |     | Get one saree                         |
| POST   | `/api/auth/login`           |     | Log in, returns a JWT                 |
| POST   | `/api/sarees`                | ✅  | Add a saree (multipart form, `image` optional) |
| PUT    | `/api/sarees/:id`            | ✅  | Update a saree                        |
| DELETE | `/api/sarees/:id`            | ✅  | Delete a saree                        |
| POST   | `/api/sarees/reset/seed`     | ✅  | Reset catalog to the sample data      |

## Deploying it for real

This needs an actual Node.js host (unlike the static-only version, it can't run on GitHub Pages alone). Simple, mostly-free options:
- **Render** or **Railway**: point them at this repo, set the build command to `npm install` inside `backend/`, start command `node server.js`, and add the same environment variables from `.env.example` in their dashboard.
- Either way, set `ADMIN_PASSWORD` and `JWT_SECRET` to real values in the host's environment settings — don't reuse the demo ones.

## Notes on production-readiness

This is built to be genuinely usable, with a few honest simplifications worth knowing about before charging a client for it:
- **Single admin account**: fine for a small shop with one or two staff sharing a password; a bigger operation would want individual staff logins.
- **JSON-file database**: handles a catalog of hundreds of sarees without issue, but a database like SQLite or PostgreSQL would be the next step if the shop wants concurrent heavy editing or reporting.
- **Uploaded photos live on the server's disk**: fine for one server; if you ever move to multiple servers or a platform with ephemeral storage, photos should move to something like Cloudinary or S3.
