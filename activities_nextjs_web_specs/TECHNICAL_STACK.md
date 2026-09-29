# المكدس التقني والمعمارية — Next.js Fullstack

> الإصدار: 2.0 — 2026-09-24 | الحالة: مواصفات تنفيذ معتمدة | النطاق: مدرسة واحدة، مستخدمون متعددون، VPS، قاعدة جديدة فارغة.
> هذه الوثيقة تحل محل النسخة المكتبية المقابلة. لا تنطبق أي تعليمات تخص PySide6 أو SQLite أو Portable EXE أو التشغيل دون إنترنت على نسخة الويب.

## القرار المعماري
تطبيق Next.js واحد (modular monolith) باستخدام App Router وTypeScript، يعمل في Node.js على VPS. React Server Components للقراءة، Server Actions للنماذج المناسبة، Route Handlers للرفع والتنزيل والتكاملات. لا Python/PySide6/SQLite/PyInstaller، ولا يعتمد على LocalStorage كمصدر بيانات. لا خدمات مصغرة ولا Redis إلزامي في V1.

## المكونات المعتمدة
- Next.js App Router + React + TypeScript (strict)، Node.js LTS متوافق مع إصدار Next.js المثبت؛ تثبيت الإصدارات في lockfile والتحقق من متطلبات الإصدار قبل النشر.
- Tailwind CSS + shadcn/ui + Lucide؛ HTML دلالي، RTL عربي، استجابة للشاشات.
- PostgreSQL على الخادم، Prisma ORM + Prisma Migrate؛ اتصالات قاعدة البيانات عبر مستخدم محدود الصلاحية.
- مصادقة جلسات خادمية عبر مكتبة موثوقة متوافقة مع الإصدار المثبت (مثلاً Auth.js)، وكلمات مرور Argon2id أو بديل قوي مدعوم؛ Cookie من نوع HttpOnly/Secure/SameSite؛ فحص RBAC على الخادم.
- Zod للتحقق من مدخلات العميل والخادم؛ React Hook Form اختياري للنماذج؛ SheetJS أو ExcelJS لتوليد/قراءة XLSX بعد مراجعة الترخيص والأمان؛ PDF عبر محرك خادمي يدعم العربية وRTL (قالب HTML للطباعة + Chromium/Puppeteer إن لزم).
- تخزين مرفقات خاص على قرص VPS في V1 خارج public، مع مسار/معرف نسبي في DB، ويمكن استبداله بمخزن كائنات خاص لاحقًا دون تغيير قواعد العمل.
- Vitest أو Jest لاختبارات الوحدات/التكامل، Playwright لمسارات المتصفح؛ lint/typecheck في CI.

## تقسيم المسؤوليات
`app/` مسارات وlayouts وواجهات؛ `features/` وحدات الطلاب والأنشطة والمشاركات والتقارير والمستخدمين؛ `lib/auth/` جلسات وسياسات؛ `lib/db/` Prisma؛ `lib/services/` منطق أعمال وإحصائيات؛ `lib/validation/` مخططات Zod؛ `lib/storage/` الملفات؛ `lib/audit/` السجل؛ `prisma/` schema/migrations/seed؛ `tests/`. لا حسابات أساسية في React أو Excel/PDF؛ جميعها تستدعي خدمات خادمية مشتركة.

## نموذج الطلب
المتصفح → HTTPS reverse proxy → Next.js server → التحقق من الجلسة → فحص الإذن والسجل → Zod → service → Prisma transaction → PostgreSQL → تدقيق → استجابة. لا اتصال مباشر من المتصفح بقاعدة البيانات؛ لا كشف DATABASE_URL أو مفاتيح التخزين في NEXT_PUBLIC_*. Middleware لتحسين التوجيه فقط، وليس بديلًا لفحص الصلاحية داخل كل action/handler/service.

## نشر VPS
Ubuntu LTS مدعوم، مستخدم نشر غير root، SSH بمفاتيح، جدار ناري 22 (مقيد قدر الإمكان) و80/443، PostgreSQL غير مكشوف للإنترنت، Nginx/Caddy كـ reverse proxy، TLS وتجديد تلقائي، خدمة systemd أو حاوية مع restart/healthcheck. بناء production بـ `npm ci`, `npx prisma migrate deploy`, `npm run build`, ثم تشغيل Next.js. لا تستخدم `prisma migrate dev` في الإنتاج ولا `db push` كبديل عن migrations. فصل بيئات dev/staging/prod، أسرار في env محمي، وإعداد أول مدير عبر أمر one-time دون بيانات ثابتة في المستودع.

## التشغيل والبيانات
تاريخ النشاط DATE مدني وفق توقيت قطر Asia/Qatar؛ timestamps للأحداث UTC؛ العرض بتوقيت قطر. Pagination/filtering على الخادم وفهارس للأرقام الأكاديمية والعام والتاريخ والمشاركات؛ طلبات التصدير الكبيرة عبر مهمة خادمية محكومة أو stream عند الحاجة. نسخ pg_dump متسقة مع المرفقات وفحص restore، تدوير سجلات، مراقبة مساحة القرص والأخطاء، حدود حجم الرفع ومعدلات الطلب، حماية CSRF وفق آلية المصادقة، Content Security Policy ملائمة، وتحديث تبعيات أمنية دوري.

## أوامر تشغيل إرشادية
```bash
npm ci
npx prisma migrate dev
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
# production: بعد تهيئة الأسرار وقاعدة البيانات
npx prisma migrate deploy
npm run build
npm run start
```
هذه الأوامر تتطلب تعريف scripts وتثبيت الحزم في المشروع الفعلي؛ الوثائق ليست شفرة تطبيق جاهزة.
