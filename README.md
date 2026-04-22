# Joyful Venue Planner

تطبيق ويب لإدارة حجز القاعات والمناسبات (نظام VELOURA VENUE) — مبني بـ [TanStack Start](https://tanstack.com/start) + React 19 + TypeScript + Tailwind 4، مع جلسات تسجيل دخول وقاعدة بيانات PostgreSQL.

**المستودع:** [github.com/feras995h/joyful-venue-planner](https://github.com/feras995h/joyful-venue-planner)

## المتطلبات

- Node.js 20+
- قاعدة بيانات PostgreSQL (مثلاً على Coolify أو أي مضيف)

## التشغيل محلياً

```bash
npm install
cp .env.example .env   # إن وُجد؛ ثم اضبط COOLIFY_DATABASE_URL أو DATABASE_URL
npm run dev
```

## الأسرار (مهم)

- ضع `DATABASE_URL` أو `COOLIFY_DATABASE_URL` في ملف **`.env` محلياً** وفي **متغيرات بيئة الاستضافة** (لا تُرفع أبداً على Git).
- **لا** تُلصق مفاتيح قاعدة البيانات في issues أو تعليقات.

## البناء للإنتاج

```bash
npm run build
```

الإعداد الفعلي للنشر (Cloudflare Workers، Coolify، إلخ) يعتمد على بيئتك؛ احرص على تمرير `DATABASE_URL` ومتغيرات الجلسة من لوحة الاستضافة.

## الترخيص

خاص بالمشروع — راجع مالك المستودع.
