# سجل السداد — النسخة الجديدة (المرحلة 1: الأساس)

هذا الهيكل يحتوي على ثلاثة أجزاء:
- `frontend/` — واجهة React (Vite)
- `backend/` — خادم Node.js/Express
- `database/schema.sql` — مخطط قاعدة البيانات

## خطوات الرفع إلى GitHub (بدون Terminal)

1. أنشئ مستودعاً جديداً فارغاً على GitHub (مثلاً `sedad-tracker-v2`).
2. من صفحة المستودع: **Add file → Upload files**.
3. اسحب مجلد `frontend` كاملاً، ثم مجلد `backend` كاملاً، ثم `database/schema.sql`، إلى نافذة الرفع (المتصفحات الحديثة مثل Chrome تدعم سحب مجلد كامل بمجلداته الفرعية).
4. اكتب رسالة Commit مثل "الهيكل الأساسي" واضغط **Commit changes**.

## خطوات قاعدة البيانات (Supabase — بدون Terminal)

1. أنشئ حساباً/مشروعاً جديداً على supabase.com.
2. من لوحة التحكم: **SQL Editor → New query**.
3. الصق محتوى `database/schema.sql` بالكامل واضغط **Run**.
4. من **Project Settings → Database** انسخ `Connection string` (سيُستخدم كـ `DATABASE_URL`).

## خطوات نشر الـ backend (Render — بدون Terminal)

1. من render.com: **New → Web Service**.
2. اربط حساب GitHub واختر مستودع `sedad-tracker-v2`.
3. اضبط **Root Directory** إلى `backend`.
4. Build Command: `npm install` — Start Command: `npm start`.
5. أضف متغيرات البيئة (Environment) من ملف `.env.example`: `DATABASE_URL` (من Supabase)، `JWT_SECRET` (نص عشوائي طويل تختاره)، `FRONTEND_ORIGIN` (رابط الواجهة، يُضاف لاحقاً بعد نشرها).
6. اضغط **Create Web Service** — سينشر تلقائياً ويعطيك رابطاً مثل `https://sedad-backend.onrender.com`.

## خطوات نشر الواجهة (Vercel — بدون Terminal)

1. من vercel.com: **Add New → Project**.
2. اربط نفس مستودع GitHub، واختر `frontend` كـ **Root Directory**.
3. أضف متغير بيئة: `VITE_API_URL` = رابط الـ backend من Render (مثال أعلاه).
4. اضغط **Deploy**.

## التحقق أن كل شيء متصل

افتح رابط الواجهة على Vercel — يجب أن تظهر رسالة "✅ الخادم يعمل" إن كان الاتصال سليماً بين الواجهة والخادم.

## ما بعد هذه المرحلة

هذا الهيكل يغطي: نشر أساسي فارغ + مسار تسجيل دخول (اسم + PIN) + مصادقة JWT + حاجز صلاحيات يمنع دور "المراقب" من أي كتابة على مستوى الكود نفسه. لا يوجد بعد مستخدمون فعليون في قاعدة البيانات — سيُضافون في المرحلة القادمة مع شاشة الاستيراد وإدارة الفريق.
