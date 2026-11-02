# سرور ContentSaz

Node.js 20+ / Express proxy. کلید OpenRouter فقط روی سرور از `OPENROUTER_API_KEY` خوانده می‌شود؛ هرگز آن را در APK یا مخزن قرار ندهید.

## اجرا
1. `cp .env.example .env` و فایل `.env` را ویرایش کنید؛ کلید واقعی را فقط در محیط امن سرور وارد کنید.
2. `npm install`
3. `npm start`
4. آزمون سلامت: `curl http://localhost:3000/health`

Endpoints: `GET /health`, `POST /api/generate` (platform/topic و audience/tone/goal اختیاری به جز topic/platform), `POST /api/image` (prompt). هر دو API در برابر payload بزرگ‌تر از 32KB و با rate limit پایه محافظت می‌شوند. مدل‌ها با `OPENROUTER_TEXT_MODEL` و `OPENROUTER_IMAGE_MODEL` قابل تنظیم‌اند؛ برای تولید تصویر، مدلی انتخاب کنید که در OpenRouter شما با API تصویر سازگار و فعال باشد.

### Docker
از پوشهٔ `backend`: `docker build -t contentsaz-api .` سپس نمونه: `docker run --rm -p 3000:3000 --env-file .env contentsaz-api`.
در استقرار واقعی HTTPS با reverse proxy، ثبت/پایش خطا، محدودسازی هزینه و کنترل دسترسی اضافه کنید. `TRUST_PROXY=true` را فقط پشت پراکسی معتمد تنظیم کنید. محدودیت IP به‌تنهایی احراز هویت نیست.
