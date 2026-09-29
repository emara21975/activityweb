# مخطط قاعدة البيانات — PostgreSQL / Prisma

> الإصدار: 2.0 — 2026-09-24 | الحالة: مواصفات تنفيذ معتمدة | النطاق: مدرسة واحدة، مستخدمون متعددون، VPS، قاعدة جديدة فارغة.
> هذه الوثيقة تحل محل النسخة المكتبية المقابلة. لا تنطبق أي تعليمات تخص PySide6 أو SQLite أو Portable EXE أو التشغيل دون إنترنت على نسخة الويب.

## قواعد عامة
قاعدة PostgreSQL جديدة للمدرسة الواحدة؛ جميع المفاتيح الداخلية UUID أو BIGINT متسقة في كامل المخطط (الاختيار التنفيذي: UUID)، `created_at/updated_at` بتوقيت UTC، تواريخ النشاط/العام من نوع DATE. جميع العلاقات بمفاتيح خارجية، حذف مقيّد للسجلات المرتبطة، وأرشفة منطقية عند الحاجة. لا تُخزن الإحصائيات المشتقة؛ تستخدم استعلامات معتمدة. ترحيل المخطط عبر Prisma Migrate فقط.

## الجداول الأساسية (أسماء وحقول إلزامية)
| الجدول | الحقول الأساسية | القيود والفهارس |
|---|---|---|
| school_settings | id, school_name_ar/en, school_code, supervisor_name, school_logo_key, ministry_logo_key, current_academic_year_id, created_at, updated_at | سجل إعدادات واحد في V1؛ FK للعام الحالي |
| academic_years | id, name, start_date, end_date, is_current, is_archived, created_at, updated_at | UNIQUE(name)؛ سنة حالية واحدة بفهـرس جزئي PostgreSQL؛ start_date <= end_date |
| grade_levels | id, name_ar/en, sort_order, is_active | ترتيب فريد مناسب |
| sections | id, name, sort_order, is_active | اسم فريد |
| class_groups | id, academic_year_id, grade_level_id, section_id, display_name, is_active | UNIQUE(academic_year_id, grade_level_id, section_id) |
| students | id, academic_number nullable, personal_number nullable, full_name_ar, full_name_en nullable, nationality nullable, nationality_group nullable, is_active, archived_at nullable, notes, created_at, updated_at | UNIQUE(academic_number) عند وجوده؛ لا تُخترع أرقام؛ personal_number مقيد الوصول |
| student_enrollments | id, student_id, class_group_id, academic_year_id, status, enrolled_from, enrolled_to nullable, created_at, updated_at | فهارس (student_id,academic_year_id), (class_group_id, enrolled_from)؛ تحقق توافق العام والشعبة وعدم تداخل التسجيلات الفعالة |
| activity_categories | id, code, name_ar, name_en nullable, description, sort_order, is_active | UNIQUE(code)؛ لا حذف إذا استُخدم |
| activities | id, academic_year_id, category_id, name, activity_date, status, notes, archived_at nullable, created_by_id, updated_by_id, created_at, updated_at | فهارس (academic_year_id,activity_date), (category_id,activity_date)؛ التاريخ داخل العام |
| participations | id, activity_id, student_id, student_enrollment_id, notes nullable, created_by_id, created_at | UNIQUE(activity_id,student_id)؛ فهارس student_id وenrollment_id؛ تحقق أن enrollment صالح بتاريخ النشاط ويتبع العام نفسه |
| activity_attachments | id, activity_id, original_name, storage_key, mime_type, byte_size, checksum, uploaded_by_id, created_at, archived_at nullable | storage_key فريد؛ لا URL عام؛ حذف ملفات آمن مؤجل بعد نجاح DB |
| import_batches | id, kind, filename, uploaded_by_id, status, counts_json, created_at, committed_at nullable | حالات UPLOADED/PREVIEWED/COMMITTED/FAILED؛ عدم إعادة اعتماد batch |
| import_errors | id, batch_id, row_number, field, code, message, raw_value_redacted | FK batch؛ بيانات حساسة محجوبة |
| backup_metadata | id, storage_key, created_by_id, created_at, status, checksum, db_version, attachment_manifest_key | لا تخزين نسخة DB داخل PostgreSQL نفسه |
| audit_logs | id, actor_user_id nullable, action, entity_type, entity_id, before_json_redacted, after_json_redacted, request_id, occurred_at | append-only على مستوى التطبيق؛ فهارس actor/time/entity |

## المستخدمون والأدوار
| الجدول | الحقول الأساسية | القيود |
|---|---|---|
| users | id, username, email nullable, display_name, password_hash, is_active, last_login_at, password_changed_at, created_at, updated_at | UNIQUE(username) وUNIQUE(email) عند وجوده؛ لا كلمة مرور نصية |
| roles | id, code, name_ar, description, is_system, created_at | UNIQUE(code) |
| permissions | id, code, description, module | UNIQUE(code) |
| user_roles | user_id, role_id | PRIMARY KEY(user_id,role_id) |
| role_permissions | role_id, permission_id | PRIMARY KEY(role_id,permission_id) |
| sessions / auth tables | حسب مزود المصادقة المعتمد | تخزين جلسات/رموز الاستعادة بشكل آمن، وعدم تسجيل الرموز الخام |

## قاموس أذون V1
`dashboard.view`; `student.view/create/update/archive/import/export`; `enrollment.view/manage`; `activity.view/create/update/archive`; `participation.view/create/update/remove`; `report.view/export`; `statistics.view`; `attachment.view/upload/remove`; `academic_year.view/manage`; `category.view/manage`; `school_settings.view/manage`; `user.view/create/update/deactivate`; `role.view/manage`; `audit.view`; `backup.create/restore`. تمثل السلاسل التي تحتوي `/` اختصارًا توثيقيًا: تُنشأ أذون منفصلة بالنقطة لكل فعل (مثل `student.view`, `student.create`). لا يمنح امتلاك دور صلاحية لم تُسجل في role_permissions.

## قيود لا تُترك لواجهة المستخدم
- `participations(activity_id,student_id)` فريد حتى تحت الطلبات المتزامنة؛ الحفظ الجماعي داخل transaction.
- منع تداخل تسجيلات الطالب الفعالة لنفس الفترة الزمنية والعام عبر فحص معاملاتي وقيد PostgreSQL مناسب عند اعتماد التصميم النهائي؛ Prisma وحده لا يعبّر عن كل القيود الجزئية/الاستبعادية، فتوضع SQL migrations موثقة.
- النشاط والتسجيل والمشاركة متوافقة في العام والتاريخ؛ تتحقق خدمة الحفظ داخل transaction قبل الإدراج.
- لا يمكن أرشفة/تعطيل آخر مدير نظام فعال، ولا حذف سنة أو طالب أو نشاط له سجلات مرتبطة حذفًا نهائيًا.
- فهرس جزئي لسنة حالية واحدة، مع عملية تبديل سنة حالية ذرية.

## Seed للقاعدة الفارغة
ينشئ التسعة تصنيفات، قوالب الصفوف 10/11/12 والشعب حسب إعداد المدرسة، قاموس الأذون والأدوار الافتراضية فقط؛ بيانات المدرسة والعام الدراسي عبر معالج إعداد أولي؛ حساب المدير بأمر bootstrap آمن؛ لا طلاب أو أنشطة أو مشاركات تجريبية في الإنتاج. بيانات الاختبار في seed منفصل للتطوير فقط.

## توافق أوراق Excel
`record` = participations + activities + enrollments؛ `stu` = student profile query؛ `act` = activity report؛ `kind` = category report؛ `stat` و`النسب` = statistics service؛ لا نسخ جداول Excel أو معادلاتها إلى DB.
