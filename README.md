# Joyful Venue Planner

تطبيق ويب لإدارة حجز القاعات والمناسبات (نظام VELOURA VENUE) — مبني بـ [TanStack Start](https://tanstack.com/start) + React 19 + TypeScript + Tailwind 4، مع جلسات تسجيل دخول وقاعدة بيانات PostgreSQL.

**المستودع:** [github.com/feras995h/joyful-venue-planner](https://github.com/feras995h/joyful-venue-planner)

## المتطلبات

- Node.js 20+
- قاعدة بيانات PostgreSQL (مثلاً على Coolify أو أي مضيف)

## التشغيل محلياً

```bash
npm install
cp .env.example .env
npm run dev
```

## الأسرار (مهم)

- ضع `DATABASE_URL` أو `COOLIFY_DATABASE_URL` في ملف **`.env` محلياً** وفي **متغيرات بيئة الاستضافة** (لا تُرفع أبداً على Git).
- للإنتاج يُنصح بتعيين `OWNER_SETUP_KEY` بقيمة قوية، ثم استخدامها مرة واحدة فقط عند إنشاء أول حساب مدير.
- للإنتاج يُنصح بتفعيل `DB_SSL=true` (مع `DB_SSL_REJECT_UNAUTHORIZED=true` حسب مزود قاعدة البيانات).
- **لا** تُلصق مفاتيح قاعدة البيانات في issues أو تعليقات.

## البناء للإنتاج

```bash
npm run build
```

الإعداد الفعلي للنشر (Cloudflare Workers، Coolify، إلخ) يعتمد على بيئتك؛ احرص على تمرير `DATABASE_URL` ومتغيرات الجلسة من لوحة الاستضافة.

## نشر سريع على VPS

```bash
npm ci
cp .env.example .env
# عدّل .env بقيم الإنتاج
npm run build:release
npm run start
```

بعد التأكد من التشغيل:
- استخدم reverse proxy (Nginx/Caddy) أمام المنفذ `8081`
- فعّل HTTPS
- شغّل التطبيق كخدمة (PM2 أو systemd)

## Hardening جاهز (Nginx + systemd + Deploy Script)

تم توفير ملفات جاهزة داخل:
- `deploy/nginx/veloura-venue.conf`
- `deploy/systemd/veloura-venue.service`
- `deploy/systemd/.env.production.example`
- `deploy/scripts/deploy-vps.sh`
- `deploy/checklists/go-live-security-checklist.md`

### 1) تجهيز النظام (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx fail2ban
sudo adduser --system --group --home /opt/veloura-venue veloura
sudo mkdir -p /opt/veloura-venue/{releases,shared}
sudo chown -R veloura:veloura /opt/veloura-venue
```

### 2) إعداد env الإنتاج

```bash
sudo cp deploy/systemd/.env.production.example /opt/veloura-venue/shared/.env.production
sudo nano /opt/veloura-venue/shared/.env.production
```

### 3) إعداد خدمة systemd

```bash
sudo cp deploy/systemd/veloura-venue.service /etc/systemd/system/veloura-venue.service
sudo systemctl daemon-reload
sudo systemctl enable veloura-venue
```

### 4) أول نشر

```bash
chmod +x deploy/scripts/deploy-vps.sh
APP_USER=veloura APP_ROOT=/opt/veloura-venue \
  ./deploy/scripts/deploy-vps.sh git@github.com:YOUR_ORG/YOUR_REPO.git main
```

### 5) إعداد Nginx و TLS

```bash
sudo cp deploy/nginx/veloura-venue.conf /etc/nginx/sites-available/veloura-venue.conf
sudo ln -s /etc/nginx/sites-available/veloura-venue.conf /etc/nginx/sites-enabled/veloura-venue.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d www.example.com
```

### 6) فحص نهائي قبل Go-Live

نفّذ checklist بالكامل:
- `deploy/checklists/go-live-security-checklist.md`

## الترخيص

خاص بالمشروع — راجع مالك المستودع.
