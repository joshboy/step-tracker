# StepTracker - Daily Activity Tracker

A web app for tracking daily step counts, competing with friends on leaderboards, and monitoring fitness progress over time.

Built with React + Vite, powered by Firebase (Auth, Firestore, Storage), hosted on GitHub Pages.

## Features

- **Google SSO + Email/Password** authentication
- **Admin approval** workflow — new users require admin approval before access
- **User profiles** — nickname, photo, height, weight, step goal, target weight
- **Daily step logging** — enter/edit step counts for any past date
- **Leaderboard** — weekly and monthly rankings across all users
- **Statistics** — daily averages, trends over day/week/month/year with charts
- **Responsive** — works on desktop and mobile
- **Admin dashboard** — approve/reject user registrations

## Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** and follow the wizard
3. Once created, go to **Project Settings > General**
4. Under **Your apps**, click the web icon (`</>`) to add a web app
5. Copy the Firebase config values

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication > Sign-in method**
2. Enable **Google** provider (select your support email)
3. Enable **Email/Password** provider

### 3. Create Firestore Database

1. Go to **Firestore Database > Create database**
2. Start in **production mode**
3. Choose a region close to your users
4. Go to **Rules** tab and paste the contents of `firestore.rules` from this repo

### 4. Enable Storage

1. Go to **Storage > Get started**
2. Accept the default rules for now
3. Storage is used for profile photo uploads

### 5. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 6. Run Locally

```bash
npm install
npm run dev
```

## Deployment to GitHub Pages

### Automatic (GitHub Actions)

1. Push this repo to GitHub
2. Go to **Settings > Pages** and set source to **GitHub Actions**
3. Go to **Settings > Secrets and variables > Actions**
4. Add each `VITE_FIREBASE_*` value as a repository secret
5. Push to `main` — the workflow in `.github/workflows/deploy.yml` will build and deploy

Your app will be available at `https://<username>.github.io/activity-tracker/`

### Manual

```bash
npm run build
# Deploy the `dist/` folder to your hosting
```

## Data Model (Firestore)

```
users/{uid}
  email, displayName, nickname, photoURL
  height, weight, stepGoal, targetWeight
  status: "pending" | "approved" | "rejected"
  role: "user" | "admin"
  createdAt, updatedAt

activities/{userId_date}
  userId, date (YYYY-MM-DD), steps
  updatedAt
```

## Admin

The admin is identified by email: `jithankurian@gmail.com`. When this email signs up (via Google or email/password), the account is auto-approved with admin role. All other users start as "pending" and must be approved from the Admin dashboard.

## Extending

The profile schema is designed to be extended. To add new fields:

1. Add the field to `createUserProfile()` in `src/services/users.js`
2. Add the form field to `src/pages/Profile.jsx`
3. No database migration needed — Firestore is schemaless

Future activity types (calories, distance, sleep) can be added as additional fields on the activities document.
