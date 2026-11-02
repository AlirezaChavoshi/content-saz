require('dotenv').config();
const express = require('express');
const { rateLimit } = require('express-rate-limit');

const app = express();
const port = Number(process.env.PORT || 3000);
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb', strict: true }));
const limiter = rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000), limit: Number(process.env.RATE_LIMIT_MAX || 20), standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' } });
app.use('/api/', limiter);
app.get('/health', (_req, res) => res.json({ ok: true, service: 'contentsaz-backend' }));

function text(value, name, required = false, max = 600) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw Object.assign(new Error(`${name} باید متن باشد.`), { status: 400 });
  const v = value.trim();
  if (required && !v) throw Object.assign(new Error(`${name} الزامی است.`), { status: 400 });
  if (v.length > max) throw Object.assign(new Error(`${name} بیش از حد طولانی است (حداکثر ${max} نویسه).`), { status: 400 });
  return v;
}
function apiKey() {
  if (!process.env.OPENROUTER_API_KEY) throw Object.assign(new Error('کلید OpenRouter روی سرور تنظیم نشده است.'), { status: 503 });
  return process.env.OPENROUTER_API_KEY;
}
async function openrouter(path, body) {
  const response = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.APP_PUBLIC_URL || 'https://example.invalid', 'X-Title': 'ContentSaz' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000)
  });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = { error: { message: raw.slice(0, 500) } }; }
  if (!response.ok) { const err = new Error(data?.error?.message || `OpenRouter error ${response.status}`); err.status = response.status >= 500 ? 502 : 400; throw err; }
  return data;
}
app.post('/api/generate', async (req, res, next) => {
  try {
    const platform = text(req.body?.platform, 'platform', true, 60);
    const topic = text(req.body?.topic, 'topic', true, 600);
    const audience = text(req.body?.audience, 'audience', false, 300);
    const tone = text(req.body?.tone, 'tone', false, 150);
    const goal = text(req.body?.goal, 'goal', false, 250);
    const data = await openrouter('chat/completions', {
      model: process.env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini', temperature: 0.8, max_tokens: 1100,
      messages: [
        { role: 'system', content: 'تو دستیار بازاریابی فارسی‌زبان هستی. پاسخ را کاملاً فارسی، کاربردی و آماده انتشار بنویس. متن را با برچسب‌های روشن بخش‌بندی کن: کپشن/محتوا، هشتگ‌ها (هشتگ واقعی با #)، دعوت به اقدام (CTA)، و «پرامپت تصویر» جداگانه. پرامپت تصویر را به فارسی یا انگلیسی واضح و توصیفی بنویس. ادعا یا مشخصهٔ محصول را که کاربر نداده جعل نکن. از قالب مارک‌داون ساده استفاده کن.' },
        { role: 'user', content: `پلتفرم: ${platform}
محصول/موضوع: ${topic}
مخاطب هدف: ${audience || 'عمومی'}
لحن: ${tone || 'صمیمی و حرفه‌ای'}
هدف: ${goal || 'تعامل و آگاهی از برند'}
برای این ورودی یک محتوای مناسب پلتفرم بساز.` }
      ]
    });
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw Object.assign(new Error('مدل پاسخ متنی قابل استفاده نداد.'), { status: 502 });
    const match = content.match(/(?:پرامپت\s*تصویر|image\s*prompt)\s*[:：\-]?\s*([\s\S]*)$/i);
    res.json({ content, imagePrompt: match?.[1]?.trim() || `تصویر تبلیغاتی حرفه‌ای و چشم‌نواز دربارهٔ ${topic}، مناسب ${platform}، بدون نوشتهٔ خوانا` });
  } catch (e) { next(e); }
});
app.post('/api/image', async (req, res, next) => {
  try {
    const prompt = text(req.body?.prompt, 'prompt', true, 1800);
    const data = await openrouter('images', { model: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image', prompt, n: 1, size: '1024x1024' });
    const item = data?.data?.[0] || data?.images?.[0];
    if (!item) throw Object.assign(new Error('مدل تصویر خروجی تصویر برنگرداند.'), { status: 502 });
    const encoded = item.b64_json || item.base64 || item.image;
    const imageUrl = item.url || item.image_url?.url || (typeof item.image_url === 'string' ? item.image_url : null);
    if (typeof encoded === 'string' && encoded.length) return res.json({ imageBase64: encoded, mimeType: item.mime_type || 'image/png' });
    if (typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
      // Fetch provider-hosted output server-side so the Android client only contacts this backend.
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(90000) });
      if (!imageResponse.ok) throw Object.assign(new Error('دریافت تصویر از ارائه‌دهنده ناموفق بود.'), { status: 502 });
      const type = imageResponse.headers.get('content-type') || '';
      if (!type.startsWith('image/')) throw Object.assign(new Error('پاسخ ارائه‌دهنده تصویر نیست.'), { status: 502 });
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw Object.assign(new Error('حجم تصویر نامعتبر است.'), { status: 502 });
      return res.json({ imageBase64: bytes.toString('base64'), mimeType: type.split(';')[0] });
    }
    throw Object.assign(new Error('فرمت خروجی تصویر پشتیبانی نمی‌شود.'), { status: 502 });
  } catch (e) { next(e); }
});
app.use((err, _req, res, _next) => {
  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err.message);
  res.status(status).json({ error: status >= 500 && !err.status ? 'خطای داخلی سرور.' : err.message || 'درخواست نامعتبر است.' });
});
app.listen(port, '0.0.0.0', () => console.log(`ContentSaz backend listening on ${port}`));
