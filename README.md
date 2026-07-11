# Holcombe FC

Parent registration site for Holcombe FC — sign up, register a player, and (for admins) view all registrations. Built with Next.js (App Router) + Supabase Auth/Postgres, deployed on Vercel.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Supabase (Auth + Postgres, free tier)
- Vercel (Hobby tier)

## Local setup

```bash
npm install
cp .env.example .env.local   # already done — fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is not currently used by the app but is reserved for a future payments webhook — never expose it to the browser (no `NEXT_PUBLIC_` prefix) or commit it.

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL editor (Project → SQL Editor → New query). It creates the `parents`, `teams`, `players`, `registrations`, and `payments` tables, row-level security policies, a trigger that creates a `parents` row on signup, and seeds a starter set of teams.

To make your own account an admin (after signing up once):

```sql
update public.parents set is_admin = true where email = 'you@example.com';
```

## Deploying

1. Import this repo into Vercel.
2. Add the three `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` env vars from `.env.local` in Vercel → Project Settings → Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to `https://holcombefc.club`.
3. In Supabase → Authentication → URL Configuration, add `https://holcombefc.club/auth/callback` as a redirect URL.
4. In Vercel → Domains, add `holcombefc.club` and follow the DNS instructions it gives you.

## Not yet built

- GoCardless payment collection (the `payments` table and `payment status` field are placeholders for this)
- Password reset flow
- Editing/removing a registered player
