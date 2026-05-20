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
