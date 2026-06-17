# Wellbeing-Companion 🌱

A responsive web app for student health and wellbeing, built for **SDG 3: Good Health and Wellbeing**.

> **Live Demo:** [wellbeing-companion-app.web.app](https://wellbeing-companion-app.web.app)

## About

Wellbeing-Companion helps students track and improve their wellbeing across five key areas:

| Page | Features |
|---|---|
| 🏠 **Dashboard** | Wellness score, daily streaks, quick-add logging |
| 🧠 **Mental Health** | Mood journal, 4-7-8 breathing exercise, crisis resources |
| 💪 **Physical Health** | Activity logger, stretch break timer with exercises |
| 🥗 **Nutrition** | Water tracker (8-glass goal), meal logger with ratings |
| 📚 **Study-Life** | Pomodoro timer, study session logger, break reminders |

## How It Works

- **Local-first storage** — Your health data is stored in your browser via `localStorage` and syncs to Firestore when signed in.
- **Google & Microsoft Sign-in** — Optionally sign in with your Google or Microsoft account to back up your data to the cloud and access it across devices. Firebase Auth persists your session so you stay signed in.
- **Works offline** — After your first visit, the app works without internet (PWA with Service Worker).
- **Installable** — Add to your phone's home screen for a native app feel (PWA).
- **Responsive** — Works on desktop, tablet, and mobile.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, and JavaScript (no frameworks, no build tools)
- **Local Dev Server:** Python Flask (one file, ~30 lines)
- **Client Storage:** `localStorage` (local-first, offline-capable)
- **Cloud Storage:** Firebase Firestore (syncs when signed in)
- **Authentication:** Firebase Auth with Google and Microsoft (Azure AD) providers
- **PWA:** Service Worker + Web App Manifest
- **Hosting:** Firebase Hosting

## Project Structure

```
├── app.py                  # Flask dev server
├── build.py                # Build static site for deployment
├── firebase.json           # Firebase Hosting configuration
├── .firebaserc             # Firebase project reference
├── requirements.txt        # Python dependencies
│
├── templates/              # Jinja2 HTML templates (source)
│   ├── base.html           # Shared layout (nav, header, scripts)
│   ├── index.html          # Dashboard
│   ├── mental-health.html  # Mental wellbeing tools
│   ├── physical-health.html# Physical health tools
│   ├── nutrition.html      # Nutrition & hydration
│   └── study-life.html     # Study-life balance
│
├── static/                 # Static assets
│   ├── style.css           # All styles (responsive, dark mode)
│   ├── storage.js          # localStorage data layer
│   ├── app.js              # App logic (page router + features)
│   ├── sw.js               # Service Worker (offline support)
│   ├── manifest.json       # PWA manifest
│   └── icons/              # PWA icons (192px, 512px)
│
└── public/                 # Built output (deployed to Firebase)
```

## Running Locally

```bash
# Install dependencies
python3 -m pip install flask

# Run development server
python3 app.py
# Open http://localhost:5555
```

Built for the SDG 3 (Health & Wellbeing) Hackathon. The app addresses student health holistically — mental, physical, nutritional, and academic wellbeing — in a single, accessible tool.
