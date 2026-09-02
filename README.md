# CloudVault — Cloud-Based File Backup & Recovery System

A full-stack file backup and recovery system: users sign up, log in, reset
forgotten passwords, and manage files from a dashboard. Files are stored on
Cloudinary (free tier), with soft-delete (trash) and version history so
deleted or overwritten files can be recovered.

This README is written so you can go from zip file to a live, deployed app
by filling in `.env` values and following the deploy steps — no additional
code required.

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, Cloudinary, Nodemailer
- **Frontend:** React (Vite), React Router, Axios

## Project structure

```
file-backup-system/
├── backend/
│   ├── config/db.js            MongoDB connection
│   ├── models/                 User.js, File.js (versions + soft delete + reset token)
│   ├── middleware/auth.js      JWT verification
│   ├── controllers/            authController.js, fileController.js
│   ├── routes/                 authRoutes.js, fileRoutes.js
│   ├── utils/                  cloudinary.js, email.js
│   ├── server.js
│   ├── .env                    ← already filled in with your MongoDB URI and a generated JWT secret
│   └── .env.example            ← blank template, for reference
└── frontend/
    ├── .env.example             ← blank template for the API URL
    └── src/
        ├── api/client.js        Axios instance with auth token + configurable API URL
        ├── context/AuthContext.jsx
        ├── components/          UploadBox, FileList, ProtectedRoute
        ├── pages/                Login, Signup, ForgotPassword, ResetPassword, Dashboard
        └── App.jsx
```

## What's already done for you

- `backend/.env` already has your **MongoDB connection string** and a freshly
  generated **JWT secret** filled in. You only need to add Cloudinary and
  email credentials (steps below).
- CORS, error handling, file-size limits, and password-reset security are
  all wired up.

## Step 1 — Get your free Cloudinary account (file storage)

1. Go to [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) and sign up (no card required).
2. After signup you land on your **Dashboard** — it shows a "Product Environment Credentials" panel with three values you need:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click "Reveal" to see it)
3. Open `backend/.env` and fill in:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

Note: Cloudinary's free plan caps individual file uploads at **10MB** for
images/documents and **100MB** for video. The app already enforces this limit
and will show a friendly error if someone tries to upload something larger.

## Step 2 — Get free email sending (for password reset)

Password reset emails are sent over SMTP. The simplest free option is a
Gmail account with an **App Password** (this does not use your normal Gmail
password, and doesn't require a paid account):

1. Go to your Google Account → **Security** → turn on **2-Step Verification** if it isn't already on.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create an app password (name it anything, e.g. "CloudVault"), and copy the 16-character password shown.
3. Open `backend/.env` and fill in:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASS=the_16_character_app_password
   EMAIL_FROM=your_gmail_address@gmail.com
   ```

**Alternative (if you'd rather not use Gmail):** [Brevo](https://www.brevo.com)
(formerly Sendinblue) has a free tier (300 emails/day, no card required) with
its own SMTP credentials — sign up, go to **SMTP & API** in settings, and use
the SMTP host/login/key they give you in the same four `EMAIL_*` fields.

## Step 3 — Run it locally to confirm everything works

```bash
cd backend
npm install
npm run dev
```
You should see `MongoDB connected: ...` and `Server running on port 5000`.

In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`, sign up, upload a file, and try
"Forgot password?" from the login page to confirm the reset email arrives.

## Step 4 — Deploy to the cloud

### Backend → Render (free tier)

1. Push this project to a GitHub repo (the included `.gitignore` already keeps `.env` and `node_modules` out of git — **do not commit your `.env` file**).
2. Go to [render.com](https://render.com), sign up, click **New → Web Service**, and connect your repo.
3. Set:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Under **Environment**, add every variable from your local `backend/.env` (MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, CLOUDINARY_*, EMAIL_*, PORT). For `FRONTEND_URL`, leave it for now — you'll come back and set it after Step 4b.
5. Deploy. Render gives you a URL like `https://cloudvault-backend.onrender.com`.

### Frontend → Vercel (free tier)

1. Go to [vercel.com](https://vercel.com), sign up, **Add New → Project**, and import the same GitHub repo.
2. Set:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Add an environment variable:
   ```
   VITE_API_URL=https://cloudvault-backend.onrender.com/api
   ```
   (use your actual Render URL from the previous step, keeping the trailing `/api`)
4. Deploy. Vercel gives you a URL like `https://cloudvault.vercel.app`.

### Final step — connect them

Go back to Render, open your backend's **Environment** settings, and set:
```
FRONTEND_URL=https://cloudvault.vercel.app
```
(your actual Vercel URL). This lets the backend accept requests from your
live frontend (CORS) and builds correct password-reset links. Redeploy the
backend for the change to take effect.

Your app is now fully live — visiting the Vercel URL talks to the Render
backend, which talks to MongoDB Atlas and Cloudinary.

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in, returns JWT |
| POST | `/api/auth/forgot-password` | Request a password reset email |
| POST | `/api/auth/reset-password/:token` | Set a new password using the emailed token |
| GET | `/api/auth/me` | Current user (auth required) |
| POST | `/api/files/upload` | Upload a file (multipart, field `file`) |
| POST | `/api/files/:id/version` | Upload a new version of an existing file |
| GET | `/api/files` | List files (supports `?search=`, `?folder=`) |
| GET | `/api/files/trash` | List soft-deleted files |
| GET | `/api/files/:id/download` | Get a signed, expiring download URL |
| GET | `/api/files/:id/versions/:i/download` | Download a specific version |
| PATCH | `/api/files/:id/restore-version/:i` | Roll back to an older version |
| PATCH | `/api/files/:id/restore` | Restore a file from trash |
| DELETE | `/api/files/:id` | Soft delete (move to trash) |
| DELETE | `/api/files/:id/permanent` | Permanently delete file + all versions |

All `/api/files/*` routes require `Authorization: Bearer <token>`.

## Recovery model

- **Trash:** deleting a file just sets `isDeleted: true` — it's hidden from
  the dashboard but stays in Cloudinary until permanently deleted, so it can
  be restored.
- **Versioning:** every upload to an existing file adds a new entry to
  `versions[]` rather than overwriting anything. You can restore any prior
  version as the current one.
- **Password reset:** a reset request generates a random token, stores only
  its SHA-256 hash on the user record (never the raw token), and expires it
  after 1 hour. The raw token only ever appears in the emailed link.

## A note on your MongoDB URI

Your connection string doesn't specify a database name, so MongoDB will use
a default database called `test`. If you'd prefer a named database (e.g.
`cloudvault`), edit `MONGO_URI` in `backend/.env` to insert it before the
`?`:
```
mongodb+srv://elite:<password>@cluster0.ps7a6fl.mongodb.net/**********
```
This is optional — the app works fine either way.

## Security reminders

- `.env` is already in `.gitignore` for both `backend/` and `frontend/` —
  never commit it or paste its contents anywhere public.
- The MongoDB user password in your connection string should eventually be
  rotated if it's ever shared or exposed (Atlas → Database Access → Edit User).

## Ideas for later

- Folder/nesting UI in the frontend (the `folder` field already exists on `File`)
- Storage quota enforcement using `User.storageUsed`
- Email verification on signup
