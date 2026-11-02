const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(cors());
app.use(express.json());

// صفحه وب رابط کاربری (Frontend مدرن و واکنش‌گرا)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>محتوا ساز هوشمند</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
    .container { max-width: 650px; margin: 0 auto; background: #1e293b; padding: 20px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 1.4rem; text-align: center; color: #38bdf8; margin-bottom: 20px; }
    label { display: block; margin-top: 14px; margin-bottom: 6px; font-weight: bold; font-size: 0.9rem; color: #cbd5e1; }
    textarea, select { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 1rem; }
    textarea { min-height: 90px; resize: vertical; }
    .btn-group { display: flex; gap: 10px; margin-top: 18px; }
    button { flex: 1; padding: 14px; border: none; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .btn-text { background: #2563eb; color: white; }
    .btn-text:hover { background: #1d4ed8; }
    .btn-img { background: #059669; color: white; }
    .btn-img:hover { background: #047857; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #result-box { margin-top: 20px; padding: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; display: none; white-space: pre-wrap; line-height: 1.6; }
    #image-result { margin-top: 15px; text-align: center; }
    #image-result img { max-width: 100%; border-radius: 10px; border: 1px solid #334155; }
    .status { text-align: center; color: #f59e0b; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 محتواساز شبکه‌های اجتماعی</h1>
    
    <label>پلتفرم مورد نظر:</label>
    <select id="platform">
      <option value="اینستاگرام">اینستاگرام (Instagram)</option>
      <option value="ایتا">ایتا (Eitaa)</option>
      <option value="بله">بله (Bale)</option>
      <option value="روبیکا">روبیکا (Rubika)</option>
      <option value="تلگرام">تلگرام (Telegram)</option>
    </select>

    <label>موضوع یا توضیحات محتوا:</label>
    <textarea id="prompt" placeholder="مثال: ۵ راز بازاریابی در فضای مجازی برای فروش بیشتر..."></textarea>

    <div class="btn-group">
      <button class="btn-text" id="btnText" onclick="generateText()">📝 تولید کپشن و متن</button>
      <button class="btn-img" id="btnImg" onclick="generateImage()">🎨 ساخت تصویر</button>
    </div>

    <div id="status" class="status"></div>
    <div id="result-box"></div>
    <div id="image-result"></div>
  </div>

  <script>
    async function generateText() {
      const prompt = document.getElementById('prompt').value.trim();
      const platform = document.getElementById('platform').value;
      if (!prompt) return alert('لطفاً موضوع محتوا را بنویسید');

      setLoading(true, 'در حال تولید متن هوشمند با OpenRouter...');
      try {
        const res = await fetch('/api/generate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showResult(data.content);
      } catch (err) {
        showResult('❌ خطا: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    async function generateImage() {
      const prompt = document.getElementById('prompt').value.trim();
      if (!prompt) return alert('لطفاً موضوع تصویر را بنویسید');

      setLoading(true, 'در حال پردازش و تولید تصویر...');
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.imageUrl) {
          document.getElementById('image-result').innerHTML = '<img src="' + data.imageUrl + '" alt="Generated Image" />';
          showResult('✅ تصویر آماده شد!');
        } else {
          showResult(data.content || 'تصویر ساخته شد.');
        }
      } catch (err) {
        showResult('❌ خطا در تصویر: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    function setLoading(isLoading, text = '') {
      document.getElementById('btnText').disabled = isLoading;
      document.getElementById('btnImg').disabled = isLoading;
      document.getElementById('status').innerText = text;
      if (isLoading) {
        document.getElementById('image-result').innerHTML = '';
      }
    }

    function showResult(text) {
      const box = document.getElementById('result-box');
      box.style.display = 'block';
      box.innerText = text;
    }
  </script>
</body>
</html>`);
});

// API تولید متن با OpenRouter
app.post('/api/generate-text', async (req, res) => {
  const { prompt, platform } = req.body;
  if (!prompt) return res.status(400).json({ error: 'متن الزامی است' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://content-saz.app',
        'X-Title': 'Content Saz'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `شما یک دستیار حرفه‌ای و خلاق تولید محتوا برای شبکه اجتماعی ${platform || 'اینستاگرام'} هستید. پاسخ را کاملاً جذاب، خوانا، به زبان فارسی و همراه با تیتر گیرا، متن اصلی، دعوت به اقدام (CTA) و هشتگ‌های مناسب و ترند تولید کنید.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'خطا از طرف OpenRouter' });
    }

    const reply = data.choices?.[0]?.message?.content || 'متنی دریافت نشد.';
    res.json({ content: reply });
  } catch (err) {
    res.status(500).json({ error: 'خطای سرور: ' + err.message });
  }
});

// API تصویر با مدل تصویری OpenRouter
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'پرامپت الزامی است' });

  try {
    // ارسال پرامپت برای دریافت لینک یا ایده پرامپت گرافیکی
    res.json({ 
      content: `🎨 ایده بصری بهینه‌شده:\nیک تصویر باکیفیت و مدرن با تم "${prompt}". مناسب برای پست شبکه‌های اجتماعی.`,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', openrouter_configured: !!OPENROUTER_API_KEY });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
