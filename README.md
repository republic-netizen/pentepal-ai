# PentePal (plain HTML / CSS / JavaScript version)

A study-help chat app for Pentecost Preparatory School. No build tools, no
`node_modules` for the front end — just HTML, CSS, and JavaScript files you
can open, read, and edit directly, including right in GitHub's web editor.

Built with:
- **Plain HTML/CSS/JS** for every page
- **Supabase** (auth + database), loaded via a CDN link — no install needed
- **One small serverless function** (`api/chat.js`) that talks to Claude,
  so your Anthropic API key never reaches the browser

---

## File map

```
index.html        → checks if you're logged in, sends you to login or chat
login.html + js/login.js   → sign up / log in (username + password to log in)
chat.html + js/chat.js     → the chat app itself
css/styles.css     → every style on every page, including dark/light mode
js/config.js       → your Supabase URL + public key go here
js/supabaseClient.js → sets up the Supabase connection (uses config.js)
js/theme.js        → dark/light mode toggle logic
api/chat.js         → serverless function, the only place your Anthropic key lives
supabase/schema.sql → run this in Supabase to create your tables
package.json        → tells Vercel what api/chat.js needs installed
```

---

## Part 1 — Set up Supabase (same as before, if you already did this once you can skip to Part 2)

1. supabase.com → **New project**. Save your database password somewhere safe.
2. **Settings → API Keys** — copy your **Project URL** and **Publishable key**
   (this used to be called the "anon key").
3. **SQL Editor → New query** — paste in the entire contents of
   `supabase/schema.sql`, click **Run**.
4. **Authentication → Providers → Email** — turn off **Confirm email** while
   you're testing (fewer things to trip over).

---

## Part 2 — Fill in `js/config.js`

Open `js/config.js` and replace the two placeholder values:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "your-publishable-key";
```

This file is safe to be public — the publishable key is meant to be visible
in the browser. Your Anthropic key is **not** in this file; that one only
goes into Vercel's environment variables (Part 4).

---

## Part 3 — Try it locally (optional)

Since there's no build step, you just need *any* local web server (browsers
block ES module imports when you open an HTML file directly with
`file://`). If you have Python installed, this is the simplest option:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/login.html`.

Note: the chat page won't be able to reach `/api/chat` this way, since that
part only exists once deployed to Vercel — so locally you can preview the
design and try signing up/logging in, but sending a chat message will show
a connection error until it's deployed. That's expected.

---

## Part 4 — Deploy to Vercel

1. Push this project to your GitHub repo (same `pentepal-ai` repo — this
   replaces the old Next.js version entirely).
2. In your Vercel project settings, go to **General** and check the
   **Framework Preset** — set it to **Other** if it still says Next.js,
   since this project has no framework anymore.
3. Go to **Settings → Environment Variables** and add:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_ANON_KEY` — your publishable key
   - `ANTHROPIC_API_KEY` — your `sk-ant-...` key
4. Redeploy (or push a new commit to trigger it).
5. Visit your live `.vercel.app` link — you should land on `index.html`,
   which sends you to the login page.

---

## How it fits together

```
Browser (login.html / chat.html)
   │
   ├── signs up / logs in ──────────► Supabase Auth
   │                                   (via js/supabaseClient.js, using
   │                                    the public key in js/config.js)
   │
   ├── loads/saves chat history ────► Supabase Database
   │                                   (row-level security enforced —
   │                                    a student only ever sees their own)
   │
   └── asks a question ─────────────► /api/chat  (Vercel serverless function)
                                            │
                                            ├── checks the Supabase session
                                            │   is valid
                                            │
                                            └── calls Claude using
                                                ANTHROPIC_API_KEY
                                                (server-side only)
```

---

## Editing this on GitHub directly

Every file here is small enough to open, edit, and commit right in GitHub's
web interface — click the file, click the pencil icon, edit, commit. The
only thing the browser upload page can't handle well is uploading **new**
nested folders at once (like `js/` or `api/` from scratch) — for that,
use **Add file → Create new file** and type the full path
(e.g. `js/chat.js`) into the filename box, which creates the folder
automatically.
