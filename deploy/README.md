# دليل نشر وتشغيل نظام الأنشطة المدرسية على خادم VPS (Production Runbook)

هذا الدليل يوضح خطوات تثبيت وتشغيل وإدارة النظام في بيئة الإنتاج على خادم Linux (Ubuntu 22.04 LTS / 24.04 LTS).

---

## 1. المتطلبات الأولية للخادم (Server Prerequisites)
- نظام التشغيل: Ubuntu 22.04 LTS أو أحدث.
- المعالج والذاكرة: معالجان (2 vCPU) و 4 جيجابايت رام كحد أدنى.
- البرمجيات:
  - Node.js 20.x LTS أو 22.x LTS
  - PostgreSQL 15 أو 16
  - Nginx
  - Certbot (لتثبيت شهادات SSL مجانية)
  - Git

### تثبيت الحزم الأساسية:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx postgresql postgresql-contrib

# تثبيت Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. إعداد قاعدة بيانات PostgreSQL
```bash
sudo -u postgres psql
```
داخل موجه أوامر PostgreSQL:
```sql
CREATE DATABASE activity_db;
CREATE USER activity_user WITH ENCRYPTED PASSWORD 'StrongSecurePasswordHere@2026';
GRANT ALL PRIVILEGES ON DATABASE activity_db TO activity_user;
ALTER DATABASE activity_db OWNER TO activity_user;
\q
```

---

## 3. تنزيل الكود وإعداد المجلدات
```bash
sudo mkdir -p /var/www/activity_web
sudo chown -R www-data:www-data /var/www/activity_web
sudo chmod -R 775 /var/www/activity_web

# استنساخ المشروع
git clone https://github.com/emara21975/activity_web.git /var/www/activity_web
cd /var/www/activity_web

# إنشاء مجلدات التخزين الخاصة
mkdir -p storage/attachments storage/backups
sudo chown -R www-data:www-data storage
sudo chmod -R 700 storage
```

---

## 4. إعداد ملف البيئة الإنتاجي (`.env.production`)
قم بإنشاء ملف `.env.production` داخل `/var/www/activity_web`:
```env
DATABASE_URL="postgresql://activity_user:StrongSecurePasswordHere@2026@localhost:5432/activity_db?schema=public"
JWT_SECRET="GenerateSuperLongRandomSecretStringForProductionAtLeast64CharsLong"
NODE_ENV="production"
PORT=3000
```

---

## 5. البناء الأولي وتطبيق الترقيات
```bash
cd /var/www/activity_web
npm ci
npx prisma migrate deploy
npm run build

# تهيئة حساب مدير النظام الأولي (Super Admin):
npx tsx scripts/bootstrap-admin.ts
```

---

## 6. ضبط خدمة Systemd التلقائية
انسخ ملف الخدمة إلى مجلد النظام:
```bash
sudo cp deploy/activity_web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable activity_web
sudo systemctl start activity_web
sudo systemctl status activity_web
```

---

## 7. ضبط Nginx وشهادة الأمان SSL
1. عدّل النطاق في `deploy/nginx.conf` ليطابق نطاق مدرستك:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/activity_web
sudo ln -s /etc/nginx/sites-available/activity_web /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

2. استخراج شهادة SSL عبر Certbot:
```bash
sudo apt install -y python3-certbot-nginx
sudo certbot --nginx -d activities.school.edu.qa
```

---

## 8. جدولة النسخ الاحتياطي التلقائي (Cron Job)
أضف السطر التالي إلى crontab لتنفيذ نسخة احتياطية يومية في تمام الساعة 2:00 صباحاً:
```bash
sudo crontab -e
```
أضف السطر:
```cron
0 2 * * * /var/www/activity_web/deploy/backup-cron.sh
```

---

## 9. التحديثات الدورية (CI / CD)
عند دفع تحديثات برمجية جديدة إلى المستودع، قم بتشغيل سكريبت النشر:
```bash
cd /var/www/activity_web
sudo bash deploy/deploy.sh
```

---

## 10. أوامر الصيانة والمراقبة السريعة
- متابعة سجلات التطبيق الحية:
  ```bash
  sudo journalctl -u activity_web -f
  ```
- متابعة سجلات Nginx:
  ```bash
  sudo tail -f /var/log/nginx/access.log
  sudo tail -f /var/log/nginx/error.log
  ```
- التحقق من حالة المنافذ والجدار الناري:
  ```bash
  sudo ufw allow 'Nginx Full'
  sudo ufw allow OpenSSH
  sudo ufw enable
  sudo ufw status
  ```
