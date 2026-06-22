# MySmartHealth 🌱

An AI-powered student health & wellbeing PWA — built for **SDG 3: Good Health and Wellbeing**.

> **Primary:** [smarthealth-site.web.app](https://smarthealth-site.web.app)  
> **Legacy:** [wellbeing-companion-app.web.app](https://wellbeing-companion-app.web.app) *(AI limited to 2 msg/day)*

## About

MySmartHealth helps students track and improve their wellbeing across six areas with AI-powered photo analysis, smart reminders, and a personalized wellness coach.

| Page | Features |
|---|---|
| 🏠 **Dashboard** | Wellness score, streaks, achievements, goals, weekly AI report |
| 🧠 **Mental Health** | Mood journal, 4-7-8 breathing, crisis resources |
| 💪 **Physical Health** | Activity logger, stretch timer, AI water tracker |
| 🥗 **Nutrition** | Water tracker, meal logger, AI food analysis (calories/macros) |
| 📚 **Study-Life** | Pomodoro timer, study logger, AI study verification |
| 😴 **Sleep** | Bedtime/wake-time logger, quality tracking, AI sleep tips |
| ✍️ **Gratitude** | Daily gratitude journal, 14-day history |
| 🤖 **AI Coach** | Chatbot — 6 free on first visit, 4/day, share for 6/day |
| 🔔 **Reminders** | Water, stretch, bedtime, study — toggle on/off |
| 🌓 **Theme** | Manual dark/light toggle, saved per-device |
| ⭐ **Rating** | 5-star rating widget in footer |

## How It Works

- **Local-first** — data in `localStorage`, sync to Firestore when signed in
- **AI-powered** — photo → nutrition facts, water cup count, study verification
- **Smart reminders** — page + service worker timers, native notifications
- **Offline PWA** — installable, cache-first SW, works without internet
- **Google, Microsoft & Email sign-in** — required for AI chatbot, optional otherwise
- **Export** — download all wellness data as JSON
- **Metric** — all measurements in metric (metres, ml, etc.)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (zero frameworks) |
| Dev Server | Python Flask + Jinja2 |
| Storage | `localStorage` (local-first) + Firebase Firestore (cloud sync) |
| Auth | Firebase Auth (Google, Microsoft, Email/Password) |
| AI Vision | Mistral `pixtral-12b-2409` |
| AI Text | Mistral `mistral-small-latest` |
| AI Backend | Cloudflare Worker (free tier, 100k req/day) |
| PWA | Service Worker + Web App Manifest |
| Hosting | Firebase Hosting (multi-site) |
| CI/CD | Git + manual `firebase deploy` |

## Project Structure

```
├── app.py                  # Flask dev server + /api/analyze
├── build.py                # Jinja2 → static HTML
├── worker.js               # Cloudflare Worker (AI proxy)
├── wrangler.toml           # Worker config
├── firebase.json           # Multi-site hosting config
├── .firebaserc             # Project targets
├── requirements.txt        # flask, flask-cors, openai
│
├── templates/
│   ├── base.html           # Layout, nav, theme toggle, chatbot, footer
│   ├── index.html          # Dashboard
│   ├── mental-health.html  # Mood + breathing
│   ├── physical-health.html# Activity + stretch + AI water
│   ├── nutrition.html      # Water + meals + AI food
│   ├── study-life.html     # Pomodoro + AI study
│   ├── sleep.html          # Sleep tracker + AI tips
│   ├── gratitude.html      # Gratitude journal
│   └── auth.html           # Sign in / sign up
│
├── static/
│   ├── style.css           # All styles (responsive, dark/light themes)
│   ├── app.js              # Pages, AI, chatbot, notifications, export
│   ├── storage.js          # Data layer + Firestore sync
│   ├── auth.js             # Firebase Auth
│   ├── sw.js               # Service Worker (offline + reminders)
│   ├── firebase-config.example.js
│   ├── manifest.json
│   └── icons/
│
└── public/                 # Built output (deployed)
```

## Running Locally

```bash
pip install -r requirements.txt
python3 app.py
# Open http://localhost:5555
```

## Deployment

```bash
# Frontend (both sites)
python3 build.py
firebase deploy --only hosting

# AI Backend
npx wrangler deploy
```

### Environment Variables
- `MISTRAL_API_KEY` — Cloudflare Worker secret for AI features

## Setting Up Auth

1. [Firebase Console → Auth → Sign-in method](https://console.firebase.google.com/project/wellbeing-companion-app/authentication/providers)
2. Enable **Google** (one click), **Email/Password** (one click)
3. **Microsoft** requires Azure AD app registration

## CyberTech

A [CyberTech](https://cybertech-co.web.app) product — student-made, student-driven.  
[GitHub](https://github.com/RyanL1028/wellbeing-companion)
