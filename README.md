# JPL Casting Service — Deployment Guide

A gated casting service for Joelhood Pictures Limited. Producers and directors don't
browse the roster — they submit a **Casting Brief**, JPL's system auto-matches it
against the roster, notifies you by email, and you approve and send a curated
shortlist. No commission changes hands — JPL introduces, producer and actor deal
and pay each other directly.

## How it's split up

| File | Who sees it | What it does |
|---|---|---|
| `index.html` | Public | Landing page: what JPL offers, pricing, the Casting Brief form. No actor browsing. |
| `actor.html` | Sent via shortlist emails only | One actor's full casting profile — never linked from the public site |
| `admin.html` | You only | Password-gated: manage the roster (expanded casting fields), review incoming briefs, approve & send shortlists |
| `edit.html` | One actor, via their private link | Upload headshot, add social links — nothing else editable |
| `Code.gs` | Backend | Google Sheets database (`Actors` + `Briefs`), matching logic, email notifications |

## If you already have an `Actors` sheet from an earlier version

This version uses a wider set of columns (casting age, gender, height, etc.) than the original build. The script only creates the sheet's header row if the sheet doesn't exist yet — it won't upgrade an existing one. **Delete or rename your current `Actors` tab** before using this version; the script recreates it correctly on first use. Re-add any actors you had. If you need to preserve existing actor data instead of re-entering it, ask for a one-time migration script rather than deleting the tab.

## Step 1 — Set up the Google Sheet + Apps Script backend

1. Create a new Google Sheet. Go to **Extensions → Apps Script**.
2. Replace the default code with the contents of `Code.gs` from this folder. Save.
3. Create a Google Drive folder for headshots and copy its folder ID from the URL.
4. In **Project Settings → Script Properties**, add:
   - `ADMIN_PASSWORD` → your admin password
   - `DRIVE_FOLDER_ID` → the folder ID from step 3
   - `SITE_URL` → your GitHub Pages base URL, e.g. `https://you.github.io/jpl-talent-roster/` (set this **after** Step 3 below, once you know the real URL — you can come back and update it)
   - `ADMIN_EMAIL` → the email that should get notified of new casting briefs, e.g. `joelhoodpictures@ymail.com`
5. This version emails you and producers, which is a new permission the script hasn't asked for before. Before deploying: in the Apps Script editor, pick any function from the dropdown next to "Run" (e.g. `getSiteUrl_`) and click **Run** once. Google will prompt you to authorize — accept it. This grants the Mail permission so notifications actually send instead of failing quietly.
6. **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone**. Deploy, authorize again if prompted, and copy the Web app URL (`.../exec`).

> **When you edit `Code.gs` later:** use **Deploy → Manage deployments → pencil icon → New version**, not "New deployment" — that keeps the same URL. A new deployment issues a new URL and breaks every file still pointing at the old one.

## Step 2 — Wire up the frontend

Paste your Apps Script Web app URL into the `API_URL` line near the bottom of `index.html`, `actor.html`, `admin.html`, and `edit.html`.

## Step 3 — Publish on GitHub Pages

Upload the four HTML files to a GitHub repo root (`Code.gs` stays inside Apps Script, not here). Enable **Settings → Pages**, source: branch `main`, folder `/root`. Note the live URL — that's your `SITE_URL` for Step 1.

## Step 4 — Add actors and set your admin email

1. Log into `admin.html`, go to the **Roster** tab, add actors with the full casting detail fields (gender, casting age, height, languages, accents, casting categories, etc.) — the richer these are, the better the auto-matching works.
2. Set each actor's **Admission status** to `Approved` for them to be eligible for matching. `Not yet ready` / `Reassess later` actors stay in the system but are excluded from shortlists.
3. Copy each actor's private edit link and send it to them so they can upload their headshot and social links.

## How a casting brief flows through the system

1. A producer fills in the brief on `index.html`. The system checks how many prior briefs came from that email — 1st and 2nd are `Free`, 3rd onward is `Paid`.
2. The backend scores every `Active` + `Approved` actor against the brief (gender, age range, language, accent, casting category keywords) and saves the top matches as an auto-shortlist.
3. You get an email at `ADMIN_EMAIL` with the brief summary and the auto-matched shortlist.
4. In `admin.html → Casting Briefs`, click **Review** on that brief. Tick/untick actors as needed, then **Approve & send** — this emails the producer directly with a curated shortlist and a link to each actor's profile page.

The matching is attribute-based (gender/age/language/category keywords), not judgment — that's why the send step stays a manual click. It's a quality gate, not a bottleneck: review takes seconds, and it's what lets you say "if JPL sends it, it's been checked."

## Notes and limits

- **This is link-based security, not accounts.** Don't post actor edit links or the admin URL publicly.
- **Pricing is tracked but not charged automatically.** The system labels a brief `Paid` from the third request onward; there's no payment processing built in yet — you follow up with pricing directly, as the landing page tells producers you will.
- **Visit counting matches on either email or company name.** Company name is required to submit a brief at all — no company, no submission. Switching just the email, or just the company name, won't reset the free-visit count; both would have to be faked at once, which is a real barrier rather than a loophole.
- **Photos** live in the Drive folder from Step 1, served via public view links.

---
Joackim Joel Sakala ©2026. All Rights Reserved.
