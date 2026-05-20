# Deployment Guide (Vercel + Supabase)

This guide deploys the Next.js app in this repo to Vercel with Supabase as the only persistent backend.

## 1) Create a Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Save these values from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (server only; never client-exposed)
3. In **Authentication → URL Configuration**, set:
   - Site URL: your production URL (for example `https://your-app.vercel.app`)
   - Redirect URLs: production + preview URLs as needed.

## 2) Run database migrations
Run from repo root after linking your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies SQL in `supabase/migrations/` (schema, RLS, sharing, storage policies).

## 3) Configure Supabase Auth
1. In **Authentication → Providers**, enable Email provider.
2. Keep email confirmation settings aligned with your onboarding preference.
3. Ensure redirect URLs include:
   - `https://<your-production-domain>/login`
   - any callback URLs used by your auth provider(s).
4. Confirm middleware protects `/dashboard`, `/tree/*`, and `/admin/*` routes.

## 4) Create storage bucket(s)
1. In **Storage**, create bucket `person-media` as **Private**.
2. Confirm migration `20260520_004_storage_security.sql` is applied.
3. Use signed URLs for private media delivery (short-lived).

## 5) Connect GitHub repository to Vercel
1. In Vercel, click **Add New Project**.
2. Import your GitHub repository.
3. Select production branch (typically `main`).

## 6) Add environment variables in Vercel
Set these in **Project Settings → Environment Variables** for Production (and Preview if needed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (**server only**)
- `ADMIN_EMAILS` (comma-separated)
- `NEXT_PUBLIC_APP_URL` (public app URL)

## 7) Deploy production branch
1. Trigger deploy from Vercel UI or push to production branch.
2. Build command: `npm run build`.
3. After deployment, run smoke tests listed below.

## Runtime compatibility notes
- **Vercel serverless runtime**: Next.js app/router + middleware compatible.
- **Supabase Auth**: SSR client in middleware/server components is configured.
- **RLS**: enforced in SQL migrations and expected in production.
- **Private storage**: bucket is private with tree membership policies; access via signed URLs.

## Production readiness checklist
- [ ] All Supabase migrations applied successfully.
- [ ] RLS enabled on all app tables.
- [ ] No service-role key exposed in client bundle (`NEXT_PUBLIC_*` vars reviewed).
- [ ] Admin approval flow tested end-to-end.
- [ ] Signup flow tested end-to-end.
- [ ] Tree creation tested.
- [ ] Invite flow tested.
- [ ] Export flow tested (if feature enabled in environment).
- [ ] Mobile layout tested on key pages.
- [ ] Confirm persistent data is in Supabase only (no local SQLite, no local file uploads).

## Notes on legacy files
The `legacy/` directory is historical and not part of deployment runtime. Production deployment uses the Next.js app with Supabase-backed persistence.
# Deployment

## Supabase setup
1. Create project and run migrations in `supabase/migrations`.
2. Confirm RLS is enabled for all app tables.
3. Create private storage bucket(s) for person media.

## Vercel setup
1. Import repository to Vercel.
2. Set all required env vars from `.env.example`.
3. Build command: `npm run build`; output: Next.js default.

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `ADMIN_EMAILS`
- `APP_BASE_URL`

## Manual approval workflow
- New users are `pending` by default.
- Admin reviews `/admin/access-requests` and approves/rejects.

## Free-tier limits
- Supabase: database/storage/egress quotas on free plan.
- Vercel: function execution + bandwidth quotas.
- Configure alerts for quota thresholds.

## Backup recommendations
- Enable daily automated database backups.
- Export storage objects periodically.
- Keep monthly off-platform encrypted snapshots.
