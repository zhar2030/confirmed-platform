==============================
  CONFIRMED – نشر المشروع على السيرفر
==============================

المجلدات:
  /frontend  → ملفات HTML/CSS/JS الجاهزة (ارفعيها على Nginx أو Apache)
  /backend   → سيرفر Node.js (API)

==============================
خطوات النشر
==============================

1. الواجهة (frontend):
   - ارفعي محتوى مجلد /frontend كاملاً على السيرفر
   - إذا تستخدمين Nginx، اجعلي root يشير لهذا المجلد
   - مثال Nginx:
       server {
           listen 80;
           root /var/www/confirmed/frontend;
           index index.html;
           location / {
               try_files $uri $uri/ /index.html;
           }
           location /api/ {
               proxy_pass http://localhost:3001;
           }
       }

2. السيرفر (backend):
   - ارفعي مجلد /backend على السيرفر
   - ثبّتي Node.js 20+ على السيرفر
   - شغّلي السيرفر:
       node backend/index.mjs

   - أو استخدمي PM2 للتشغيل الدائم:
       npm install -g pm2
       pm2 start backend/index.mjs --name confirmed-api
       pm2 save

3. متغيرات البيئة المطلوبة (أنشئي ملف .env):
   DATABASE_URL=postgresql://...
   SESSION_SECRET=...
   BREVO_API_KEY=...
   PORT=3001
   NODE_ENV=production

==============================
