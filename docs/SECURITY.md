# Security

## Threat model
- Unauthenticated internet users attempting account takeover or data exfiltration.
- Authenticated but non-approved users attempting privilege escalation.
- Approved users attempting cross-tree data access.
- Malicious members attempting unauthorized writes.

## Data categories
- Account data: email, profile status, role.
- Tree data: persons, relationships, invitations.
- Audit data: actor/action/entity/metadata.

## Access model
- RLS is enabled on all domain tables.
- Access requires approved profile + membership checks.
- Owner/editor rights are enforced in both SQL policies and server actions.

## SOC 2-aligned controls
- Logical access controls via Supabase Auth + RLS.
- Change traceability via audit_logs.
- Rate limiting for approval/admin auth-adjacent actions.
- Defense-in-depth headers (CSP, HSTS, frame deny, nosniff).

## Privacy model
- Default-private trees.
- No service role key in browser-exposed env vars.
- Invitations are hashed tokens with expiry.

## Backup/export policy
- Use Supabase scheduled backups for Postgres.
- Export jobs should only use signed URLs with short expiry.
- Run periodic restore tests in staging.
