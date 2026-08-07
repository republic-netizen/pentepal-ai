# PentePal

A study-help chat app for Pentecost Preparatory School. Students sign up, log in,
and ask PentePal questions — answers are short, clear, and age-appropriate.

Built with **Next.js**, **Supabase** (auth + database), and the **Claude API**.
The Anthropic API key never reaches the browser — it lives only on the server,
inside `pages/api/chat.js`.

This guide assumes no prior experience with any of these tools. Follow it top
to bottom and you'll have a working, deployed app.

---

## Part 1 — Set up Supabase (auth + database)

1. Go to **supabase.com** and create a free account, then click **New project**.
2. Give it a name (e.g. `pentepal`), set a database password (save this
   somewhere safe), and pick a region close to Ghana (e.g. `eu-west` /
   `af-south`, whichever is offered).
3. Once the project finishes setting up, go to **Settings → API** in the left
   sidebar. You'll need two values from this page:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string)
4. Go to the **SQL Editor** (left sidebar), click **New query**, then open
   `supabase/schema.sql` from this project, copy its entire contents, paste
   it in, and click **Run**. This creates two tables:
   - `profiles` — student name, class, student ID
   - `messages` — every question and answer, so history persists
   Both have **row-level security** turned on, meaning a student can only ever
   read or write their own data.
5. Decide on email confirmation. By default, Supabase emails a confirmation
   link after signup and won't let the student log in until they click it.
   For a school pilot, that's often more friction than it's worth. To turn
   it off: **Authentication → Providers → Email**, toggle
   **Confirm email** to off. (You can turn it back on later once you're
   ready for it.)

That's the entire backend for auth and storage — no server to manage.

---

## Part 2 — Get your Anthropic API key

This is separate from a normal claude.ai account, even if you already use
Claude Pro.

1. Go to **platform.claude.com** and sign in or create an account.
2. Add a payment method under **Settings → Billing**. The API is pay-as-you-go
   (no monthly fee) — for a small school pilot, costs are typically a few
   dollars a month. You can set a spending cap here too; **starting with a
   $10–$25 monthly cap is a reasonable safety net.**
3. Go to **Settings → API keys**, click **Create key**, give it a name like
   `pentepal-production`, and click create.
4. **Copy the key immediately** — it starts with `sk-ant-` and is shown only
   once. If you lose it, you'll need to create a new one.

Keep this key private. Never put it in code that goes to GitHub or into
anything that runs in a browser — that's exactly what `pages/api/chat.js`
is built to prevent.

---

## Part 3 — Run it locally (optional but recommended first)

1. Install [Node.js](https://nodejs.org) if you don't have it (v18 or later).
2. In this project folder, copy the example env file:
   ```
   cp .env.local.example .env.local
   ```
3. Open `.env.local` and fill in your three values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Install dependencies and start the app:
   ```
   npm install
   npm run dev
   ```
5. Open `http://localhost:3000` — you should land on the login page. Try
   creating an account, then asking PentePal a question.

---

## Part 4 — Deploy it for real

The easiest path is **Vercel** (made by the creators of Next.js, free tier is
enough for a school pilot).

1. Push this project to a GitHub repository (private is fine).
2. Go to **vercel.com**, sign in with GitHub, click **Add New → Project**,
   and pick your repository.
3. Before deploying, add your three environment variables (**Settings →
   Environment Variables**) — the same three from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. Click **Deploy**. In a couple of minutes you'll get a live URL like
   `pentepal.vercel.app`. You can attach a custom domain later under
   **Settings → Domains**.

---

## How it fits together

```
Student's browser
   │
   ├── logs in / signs up ───────────► Supabase Auth
   │                                    (accounts, sessions, passwords)
   │
   ├── loads/saves chat history ─────► Supabase Database
   │                                    (profiles + messages tables,
   │                                     row-level security enforced)
   │
   └── asks a question ──────────────► /api/chat  (your Next.js server)
                                            │
                                            ├── checks the student's
                                            │   Supabase session is valid
                                            │
                                            └── calls the Claude API with
                                                your ANTHROPIC_API_KEY
                                                (never sent to the browser)
```

---

## What's included vs. what's next

**Included in this MVP:**
- Sign up / log in with Supabase auth
- Persistent chat history per student
- Subject quick-prompts (Math, English, Science, Social Studies, French,
  ICT, R.M.E)
- A locked-down API route so your key stays private

**Reasonable next steps, not yet built:**
- The dashboard/home screen we designed earlier (can slot in as a page
  between login and chat)
- A "forgot password" flow (Supabase supports this out of the box —
  `supabase.auth.resetPasswordForEmail`)
- A teacher/admin view to see flagged or unusual conversations
- Rate-limiting per student, so no single account can run up API costs
