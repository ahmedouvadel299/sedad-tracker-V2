# Registre SEDAD — هيكل مشروع React (بداية العمل)

## طريقة الرفع إلى GitHub (بدون Terminal، من المتصفح فقط)

1. افتح مستودعك `sedad-tracker-V2` (أو أنشئ مستودعاً جديداً باسم `sedad-tracker-v3`) على GitHub.
2. اضغط **Add file → Upload files**.
3. فُك ضغط هذا الملف (.zip) على جهازك أولاً.
4. اسحب **كل المجلدات والملفات الموجودة بداخل المجلد المفكوك** (وليس المجلد الأب نفسه) وأفلتها في صفحة الرفع — تأكد أن `src/`، `.github/`، `package.json` تظهر في الجذر مباشرة.
5. اكتب رسالة Commit مثل: `الإصدار الأولي لهيكل React`.
6. اضغط **Commit changes**.

## تفعيل GitHub Pages (مرة واحدة فقط)
1. في المستودع، اذهب إلى **Settings → Pages**.
2. تحت **Build and deployment → Source**، اختر **GitHub Actions**.
3. بعد أول Commit، اذهب لتبويب **Actions** وتابع تشغيل workflow "Build and Deploy" — يبني وينشر تلقائياً.

## قبل النشر: عوّض مفاتيح Firebase
افتح `src/firebase.js` مباشرة من واجهة GitHub (اضغط على الملف ثم أيقونة القلم ✏️) وعوّض القيم `REPLACE_ME` بإعدادات مشروع `sedad-tracker-v3` الحقيقية من:
Firebase Console → ⚙️ Project Settings → Your apps → SDK setup and configuration.

## هيكل المشروع
```
src/
  firebase.js       ← إعدادات الاتصال بـ Firebase
  App.jsx           ← التوجيه حسب الدور (admin / agent / observateur)
  pages/
    Login.jsx
    AgentDashboard.jsx
    AdminDashboard.jsx
    ObserverDashboard.jsx
  styles/theme.css  ← الألوان (أخضر زيتوني + ذهبي)
.github/workflows/deploy.yml  ← بناء ونشر تلقائي عند كل Commit على main
```

كل صفحة حالياً هيكل فارغ (TODO) — نملأها خطوة بخطوة في المحادثات القادمة.
