# Travel Companion — Deploy to Phone (PWA via Vercel)

## What you need
- Node.js installed on your computer (https://nodejs.org — LTS version)
- A free GitHub account (https://github.com)
- A free Vercel account (https://vercel.com — sign in with GitHub)
- Chrome on your Samsung phone

---

## Step 1 — Set up the project locally

Open a terminal and run:

```bash
# Navigate to wherever you store projects
cd ~/Documents

# Copy the travel-pwa folder here (the folder you downloaded)
# Then enter it
cd travel-pwa

# Install dependencies
npm install

# Test it runs locally
npm run dev
```

Open http://localhost:5173 in your browser — the app should appear.
Press Ctrl+C to stop when done.

---

## Step 2 — Push to GitHub

Go to https://github.com/new and create a new repository:
- Name: travel-companion
- Private (recommended)
- Do NOT initialise with README

Then in your terminal:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/travel-companion.git
git push -u origin main
```

Replace YOUR-USERNAME with your GitHub username.

---

## Step 3 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project"
3. Find and import your travel-companion repository
4. Vercel will auto-detect Vite — leave all settings as default
5. Click "Deploy"

Vercel builds and deploys in about 30 seconds.
You get a URL like: https://travel-companion-xyz.vercel.app

---

## Step 4 — Install on your Samsung

1. Open Chrome on your Samsung Galaxy
2. Go to your Vercel URL
3. Tap the three-dot menu (⋮) in Chrome
4. Tap "Add to Home screen"
5. Confirm — name it "Travel" or "Travel Companion"

It now appears on your home screen like any other app.
Tap it — it opens fullscreen with no browser UI.

---

## Going forward — updating the app

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel redeploys automatically within 30 seconds.
The app on your phone updates the next time you open it.

---

## Offline support

The service worker caches the app on first load.
After that, it works without an internet connection.
Your data is stored in the phone's localStorage — it stays
on your device and is never sent anywhere.

---

## Troubleshooting

**"Add to Home screen" option doesn't appear**
→ Make sure you're using Chrome, not Samsung Internet or Firefox.
→ The site must be served over HTTPS — Vercel does this automatically.

**App shows old version after an update**
→ Open the app, pull down to refresh, or clear Chrome's cache for the site.

**Data disappeared**
→ Clearing Chrome's site data clears localStorage.
   Don't use "Clear browsing data" for the Vercel domain.
   Consider this when doing a factory reset too.
