---
name: VPS Deployment Configuration
description: Production deployment details for confirmedgrowth.com on VPS
---

## Server
- IP: 82.29.170.114
- OS: Debian (srv1847904)
- Domain: confirmedgrowth.com

## Stack on VPS
- **Web server**: Apache2 (handles SSL + reverse proxy)
- **Node.js process manager**: pm2
- **Database**: PostgreSQL (local, user: postgres, db: confirmed_db, password: Confirmed2024!)

## File Locations
- Server files: `/root/confirmed-server/` (index.mjs, database.sql, pino-*.mjs, .env)
- Frontend files: `/var/www/html/` (copied from confirmed-server/public/)
- Apache config (active): `/etc/apache2/sites-enabled/000-default-le-ssl (1).conf`

## Apache Config (active file)
- DocumentRoot: `/var/www/html`
- ProxyPass `/api/` → `http://127.0.0.1:3000/api/`
- SSL via Let's Encrypt

## pm2 Command
```bash
pm2 start --name confirmed --interpreter node --interpreter-args "--env-file=.env" index.mjs
```
- Use `pm2 restart confirmed --update-env` when .env changes

## Email
- Priority: Resend → SendGrid → Brevo
- Brevo requires VPS IP (82.29.170.114) whitelisted at app.brevo.com/security/authorised_ips
- FROM_EMAIL: noreply@confirmedgrowth.com

## Key Lessons
- Apache on this server uses `000-default-le-ssl (1).conf` (with space+1) as the ACTIVE config, not the regular one
- Apache cannot serve from /root/ by default — files must be in /var/www/html/
- pm2 does NOT auto-load .env — must use `--interpreter-args "--env-file=.env"` or `--update-env`
- NODE_ENV=production must be set to disable pino-pretty worker threads
- `app.get("*")` must be `app.get("*path")` for Express compatibility with newer path-to-regexp
- `nodemailer` must NOT be in esbuild external list (it needs to be bundled)
- `database.sql` must be manually copied from lib/db/drizzle/0000_init.sql to dist/ after build

## Update Process
1. Build: `node ./build.mjs` in artifacts/api-server + `pnpm run build` in artifacts/salon-platform
2. Copy database.sql: `cp lib/db/drizzle/0000_init.sql artifacts/api-server/dist/database.sql`
3. Upload index.mjs to /root/confirmed-server/ via WinSCP
4. Upload public/* to /var/www/html/ via WinSCP
5. SSH: `pm2 restart confirmed --update-env`
