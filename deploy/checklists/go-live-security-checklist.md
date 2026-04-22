# Go-Live Security Checklist (VPS)

Use this before opening production traffic.

## 1) Credentials and Secrets
- [ ] Rotate database password if it was ever exposed.
- [ ] Set strong `OWNER_SETUP_KEY` in production env.
- [ ] Do not keep `.env` inside the Git repository path.
- [ ] Store production env at `/opt/veloura-venue/shared/.env.production`.

## 2) System Baseline
- [ ] Create non-root deploy user (example: `veloura`).
- [ ] Disable root SSH login and password auth (keys only).
- [ ] Enable firewall (`ufw`) with only: `22`, `80`, `443`.
- [ ] Install and enable `fail2ban`.
- [ ] Keep OS patched (`apt update && apt upgrade`).

## 3) App Runtime
- [ ] `systemd` service installed and enabled.
- [ ] Service runs as non-root user.
- [ ] `NODE_ENV=production`.
- [ ] Health check endpoint tested through Nginx.
- [ ] Logs visible via `journalctl -u veloura-venue -f`.

## 4) TLS and Reverse Proxy
- [ ] Nginx config enabled from `deploy/nginx/veloura-venue.conf`.
- [ ] Certbot certificate issued and auto-renew enabled.
- [ ] HTTP to HTTPS redirect verified.
- [ ] HSTS header verified.

## 5) Database Security
- [ ] `DB_SSL=true` in production.
- [ ] Database accepts only trusted source IPs (VPS allowlist).
- [ ] Automatic backups enabled and restore tested.

## 6) Application Security
- [ ] First owner account created once, then setup path is blocked.
- [ ] Session logout works and token is invalidated server-side.
- [ ] No stack traces shown to end users in production.
- [ ] Rate limiting is active in Nginx.

## 7) Release Safety
- [ ] Deploy with `npm run build:release` (removes `.dev.vars` artifact).
- [ ] Confirm `dist/server/.dev.vars` does not exist after release build.
- [ ] Smoke test after deployment: login, dashboard, create booking, create payment.
- [ ] Rollback plan tested (switch symlink to previous release).
