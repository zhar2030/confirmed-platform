---
name: Production Server Structure
description: Confirmed production server (confirmedgrowth.com) file layout and deployment targets
---

# Production Server Structure

## Correct File Locations
- **Frontend (Apache DocumentRoot):** `/var/www/html/` ← static files go HERE
- **Frontend assets:** `/var/www/html/assets/`
- **Backend:** `/root/api-server/dist/index.mjs`
- **Environment (.env):** `/root/confirmed-server/.env` (contains DATABASE_URL)
- **Process manager:** `pm2` — app name: `confirmed`, id: 0
- **Apache SSL config:** `/etc/apache2/sites-enabled/000-default-le-ssl.conf`

## Common Mistakes to Avoid
- `/root/confirmed-server/public/` is NOT the Apache DocumentRoot — copying files there has NO effect on the live site
- `/root/salon-platform/dist/public/` is also NOT served by Apache
- There was a duplicate SSL config `000-default-le-ssl (1).conf` pointing to `/var/www/html` — it was deleted; only `000-default-le-ssl.conf` should exist in sites-enabled

## Critical: .htaccess Must Exclude /api/ Paths
`/var/www/html/.htaccess` was intercepting ALL requests including `/api/` and returning index.html,
causing the React app to load JS/CSS but crash silently (all API calls returned HTML 200 instead of JSON).

**Correct .htaccess content:**
```
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /index.html [QSA,L]
```

**Why:** Apache mod_rewrite in .htaccess runs BEFORE ProxyPass evaluation when AllowOverride All is set.
Without the `!^/api/` exclusion, ALL API calls get rewritten to index.html silently (returns 200 with HTML).

## Apache VirtualHost Config (000-default-le-ssl.conf)
Must also have `RewriteCond %{REQUEST_URI} !^/api/` in the VirtualHost-level rewrite block.
Both the .htaccess AND the VirtualHost block need the exclusion — the .htaccess takes precedence.

## Deployment Steps (manual, no deploy.sh)
```bash
# 1. Fix .htaccess
cat > /var/www/html/.htaccess << 'EOF'
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /index.html [QSA,L]
EOF

# 2. Copy frontend
cp /path/to/index.html /var/www/html/
cp /path/to/assets/* /var/www/html/assets/

# 3. Copy backend
cp /path/to/index.mjs /root/api-server/dist/index.mjs

# 4. Restart
pm2 restart confirmed && systemctl reload apache2
```

**Why:** Discovered after multiple failed deployments — the .htaccess file was silently intercepting /api/ requests.
