# محتواساز — MVP اندروید + API

اپلیکیشن بومی Android با رابط راست‌به‌چپ فارسی برای ساخت کپشن/محتوا، هشتگ، دعوت به اقدام و پرامپت مستقل تصویر در اینستاگرام، بله، ایتا، روبیکا و سایر پلتفرم‌ها. پس از تولید محتوا می‌توانید پرامپت تصویر را جداگانه به سرور بفرستید، تصویر دریافتی را ببینید و در گالری ذخیره کنید.

> این بسته سورس کامل MVP است، نه APK آماده. در محیط تولید این فایل‌ها بررسی شد: Java/Gradle/Android SDK نصب نیست، پس ساخت APK آفلاین ممکن نبود. ابزارها/کتابخانه‌ها از اینترنت نصب نشده‌اند و APK ساختگی ارائه نشده است.

## توالی دقیق ساخت APK با Android Studio
1. Android Studio به‌روز را روی رایانه نصب کنید؛ هنگام راه‌اندازی Android SDK Platform 35 و Build Tools مناسب، JDK 17 (معمولاً JBR همراه Studio) را نصب کنید. Gradle 8.9+ با Android Gradle Plugin 8.7.3 سازگار است. اتصال اینترنت فقط برای دریافت وابستگی‌های استاندارد Gradle در اولین Sync لازم است.
2. این ZIP را باز کنید و پوشهٔ `content_saz_mvp` (پوشهٔ دارای `settings.gradle.kts`) را در Android Studio با **Open** باز کنید. در صورت درخواست Gradle Sync را انجام دهید.
3. ابتدا backend را مطابق بخش بعد روی یک سرور واقعی مستقر و گواهی TLS/دامنهٔ HTTPS را آماده کنید.
4. آدرس backend را برای build تنظیم کنید: از پوشهٔ ریشهٔ پروژه اجرا کنید:
   - Linux/macOS: `./gradlew :app:assembleDebug -PAPI_BASE_URL=https://api.example.com`
   - Windows: `gradlew.bat :app:assembleDebug -PAPI_BASE_URL=https://api.example.com`
   در Android Studio نیز از **Settings/Build, Execution, Deployment/Build Tools/Gradle** می‌توانید در **Gradle project properties** مقدار `API_BASE_URL=https://api.example.com` را تعریف کنید، یا در فایل محلی و نادیده‌گرفته‌شدهٔ `gradle.properties` اضافه کنید. مقدار پیش‌فرض عمداً `https://YOUR_BACKEND_DOMAIN` است و بدون جایگزینی، اپ درخواست شبکه را رد می‌کند. فقط HTTPS استفاده کنید.
5. خروجی build موفق: `app/build/outputs/apk/debug/app-debug.apk`. در Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**. نصب آزمایشی با `adb install -r app/build/outputs/apk/debug/app-debug.apk`.

در این مخزن Gradle Wrapper JAR و اسکریپت‌های wrapper نیامده‌اند؛ wrapper را با Android Studio یا Gradle نصب‌شده تولید کنید (`gradle wrapper --gradle-version 8.9`) یا پروژه را مستقیماً در Studio باز کنید. SDK/Java/Gradle در محیط تولید موجود نبود؛ ساخت آفلاین یا اعتبارسنجی APK انجام نشده است. SDK 35 و Gradle dependencies باید پیش‌تر نصب/دریافت شده باشند تا build کاملاً آفلاین شود.

## استقرار backend (Node.js)
1. پوشهٔ `backend` را روی سرور با Node.js 20 یا جدیدتر کپی کنید.
2. `cd backend`، سپس `cp .env.example .env` و در `.env` مقدار واقعی `OPENROUTER_API_KEY` را قرار دهید. هرگز کلید را در اپ، APK، git یا log نگذارید. کلید در فایل نمونه خالی است؛ هیچ کلید واقعی/جعلی داخل بسته نیست.
3. `npm install && npm start`؛ سلامت سرویس را با `curl https://api.example.com/health` بررسی کنید (خروجی JSON با `ok:true`).
4. برای سرور بدون Node محلی: از پوشهٔ backend اجرا کنید: `docker build -t contentsaz-api .` و `docker run --env-file .env -p 3000:3000 contentsaz-api`. پشت reverse proxy تنظیم‌شده برای HTTPS منتشر کنید؛ پورت 3000 را مستقیماً عمومی نکنید.
5. هنگام build اپ مقدار دامنهٔ HTTPS واقعی را در مرحلهٔ 4 بدهید. مدل متنی و تصویر با `OPENROUTER_TEXT_MODEL` / `OPENROUTER_IMAGE_MODEL` قابل تغییرند. مقدارهای پیش‌فرض در نمونهٔ env درج شده‌اند؛ قبل از استفاده، سازگاری/دسترسی مدل انتخابی برای حساب OpenRouter و endpoint تصویر را بررسی کنید.

### API و محدودیت‌ها
- `GET /health`
- `POST /api/generate`: JSON شامل `platform`, `topic`, `audience`, `tone`, `goal`. خروجی `content` و `imagePrompt`.
- `POST /api/image`: JSON شامل `prompt`. خروجی تصویر با `imageBase64`؛ اگر ارائه‌دهنده URL تصویر برگرداند، backend آن را سمت سرور دریافت می‌کند تا اپ فقط با backend ارتباط داشته باشد.
- درخواست‌های API سقف بدنهٔ 32KB و rate limit پایهٔ per-IP دارند (پیش‌فرض 20 درخواست در 60 ثانیه؛ با `RATE_LIMIT_WINDOW_MS` و `RATE_LIMIT_MAX` قابل تنظیم).

## امنیت، هزینه و شفافیت
API key هرگز داخل Android قرار نمی‌گیرد و کلاینت فقط به URL backend تنظیم‌شده درخواست می‌زند. بااین‌حال این MVP یک پراکسی ناشناس است: rate limit ابتدایی **احراز هویت نیست** و به‌تنهایی جلوی سوءاستفاده یا هزینهٔ ناخواسته را نمی‌گیرد. قبل از انتشار عمومی، احراز هویت/سهمیهٔ کاربر، محدودیت هزینه، پایش و ثبت امن، قواعد abuse، سیاست نگهداری داده و سخت‌سازی زیرساخت اضافه کنید. کلید OpenRouter را در secrets manager/environment امن نگه دارید و در صورت افشا rotate کنید. تولید به دسترسی اینترنت سرور، دسترسی/اعتبار OpenRouter، موجودبودن مدل انتخابی و شبکهٔ کاربر وابسته است؛ هزینه و محدودیت سرویس مدل بر عهدهٔ مالک backend است. دسترس‌پذیری مدل تصویر یا ساخت تصویر تضمین نشده و باید متناسب با حساب/endpoint روز تنظیم شود. متن تولیدشده را پیش از انتشار بازبینی کنید.

## چیدمان
- `app/`: برنامهٔ تک‌اکتیویتی Kotlin، بدون Compose و بدون کلید API، با `BuildConfig.API_BASE_URL`.
- `backend/`: Express proxy، تنظیم مدل، اعتبارسنجی، health check و rate limit.
