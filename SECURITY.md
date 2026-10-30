# Security policy

## Supported versions

Only the latest release on the default branch receives security fixes.

## Reporting a vulnerability

Do not open a public issue for security problems. Report them privately to the
maintainers with:

- a description of the issue and affected endpoint or page;
- reproduction steps or a proof of concept;
- the impact you believe it has;
- any suggested mitigation.

You should receive an acknowledgement within a few business days. Please give us
reasonable time to fix the issue before public disclosure.

## Deployment checklist

- Use strong, unique values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
  (32+ characters). The server refuses to start in production otherwise.
- Set `COOKIE_SECURE=true` behind HTTPS and configure `CORS_ORIGINS` explicitly.
- Configure SMTP so verification and password-reset emails are delivered.
- Keep MongoDB authenticated and not publicly reachable.
- Back up `server/.keys/` if you need to preserve credential signatures, and never
  commit it.
- Review admin accounts, feature flags and self-registration settings regularly.
