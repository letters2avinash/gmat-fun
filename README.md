# gmat.fun — Phase 1 scaffold

Adaptive GMAT test engine + mobile-first UI. This is the Phase 1 spine from
the project plan: topic-wise / sectional / full-length adaptive testing.
AI chat, LMS, blog, and marketing pages come in later phases.

## What's in here

- `app/` — Next.js App Router pages and API routes
- `lib/adaptive.ts` — the shared difficulty-stepping engine used by all
  three test modes
- `schema.sql` — run this once in your Supabase project's SQL editor to
  create the tables
- `seed.sql` — a handful of sample questions so you can test the flow
  before the real question bank is loaded
- `tailwind.config.ts` — the gmat.fun brand palette (indigo/amber)

## Deploying — step by step

### 1. Supabase

1. In your Supabase account, create a **New project** named `gmat-fun`
   (pick a region close to your users, e.g. Mumbai/ap-south-1 if offered).
   Set a strong database password and save it somewhere safe.
2. Once it's provisioned, open **SQL Editor > New query**, paste the
   contents of `schema.sql`, and run it. Then do the same with `seed.sql`
   to load sample questions.
3. Go to **Project Settings > API** and copy three values — you'll need
   them in step 3 below:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this one private — never put it in
     client-side code)

### 2. GitHub

1. Create a new repository named `gmat-fun` (public or private, your
   choice).
2. Upload this project's files to it. Easiest no-CLI way: use
   [GitHub Desktop](https://desktop.github.com) — install it, sign in,
   "Add Local Repository", point it at this folder, then Publish. (If you'd
   rather use the web uploader, drag this whole folder's contents onto the
   repo's "Add file > Upload files" page — everything except
   `node_modules`, which doesn't need to be uploaded.)

### 3. Vercel

1. In Vercel, **Add New > Project**, and import the `gmat-fun` GitHub repo
   you just created.
2. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase step 3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase step 3
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase step 3
   - `OPENROUTER_API_KEY` — your gmat.fun-scoped OpenRouter key
3. Click Deploy. Vercel builds and gives you a `*.vercel.app` URL to test
   with immediately.
4. Once it looks right, go to **Project Settings > Domains**, add
   `gmat.fun`, and Vercel will show you the DNS records to add at
   Hostinger (where the domain is registered). Add those records in
   Hostinger's DNS panel — no need to move the domain itself, just point
   it.

### 4. Try it

Visit the Vercel URL, click "Start a free test" — it'll run through the
sample questions in `seed.sql` on the full-length adaptive flow.

## What's deliberately not done yet

- **Auth** — there's a placeholder demo user ID in
  `app/test/[mode]/page.tsx`; real sign-up/login (Supabase Auth) is next
  so attempts are tied to real accounts.
- **AI chat, LMS, blog, testimonials, webinars** — Phases 2–4 per the
  project plan.
- **Real question bank** — `seed.sql` has 4 sample questions; the real
  bank needs to be loaded via the content pipeline once ready.
