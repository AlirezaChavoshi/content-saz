const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚀 محتواساز هوشمند</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 22px; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { text-align: center; color: #38bdf8; font-size: 1.3rem; margin-top: 0; }
    label { display: block; margin-top: 14px; margin-bottom: 6px; font-weight: bold; font-size: 0.95rem; }
    textarea, select { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 1rem; }
    button { width: 100%; margin-top: 18px; padding: 14px; border: none; border-radius: 8px; font-size: 1.05rem; font-weight: bold; cursor: pointer; background: #2563eb; color: #fff; transition: 0.2s; }
    button:active { background: #1d4ed8; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #result { margin-top: 18px; padding: 14px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; display: none; white-space: pre-wrap; line-height: 1.7; font-size: 0.95rem; }
    #status { text-align: center; color: #f59e0b; margin-top: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 محتواساز هوشمند شبکه‌های اجتماعی</h1>
    
    <label>شبکه اجتماعی:</label>
    <select id="platform">
      <option value="اینستاگرام">اینستاگرام (Instagram)</option>
      <option value="ایتا">ایتا (Eitaa)</option>
      <option value="بله">بله (Bale)</option>
      <option value="روبیکا">روبیکا (Rubika)</option>
      <option value="تلگرام">تلگرام (Telegram)</option>
    </select>

    <label>موضوع، ایده یا محصول:</label>
    <textarea id="prompt" rows="3" placeholder="مثال: ۵ روش افزایش فروش آنلاین با هوش مصنوعی..."></textarea>

    <button id="btn" onclick="generate()">⚡ تولید محتوا و کپشن</button>

    <div id="status"></div>
    <div id="result"></div>
  </div>

  <script>
    async function generate() {
      const prompt = document.getElementById('prompt').value.trim();
      const platform = document.getElementById('platform').value;
      if (!prompt) return alert('لطفاً ابتدا موضوع را وارد کنید');

      const btn = document.getElementById('btn');
      const status = document.getElementById('status');
      const result = document.getElementById('result');

      btn.disabled = true;
      status.innerText = '⏳ در حال ارتباط با هوش مصنوعی و نگارش متن...';
      result.style.display = 'none';

      try {
        const res = await fetch('/api/generate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        result.innerText = data.content;
        result.style.display = 'block';
        status.innerText = '✅ محتوا با موفقیت آماده شد!';
      } catch (err) {
        status.innerText = '❌ خطا: ' + err.message;
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`);
});

app.post('/api/generate-text', async (req, res) => {
  const { prompt, platform } = req.body;
  if (!prompt) return res.status(400).json({ error: 'موضوع الزامی است' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content: `شما یک دستیار خبره تولید محتوا برای شبکه اجتماعی ${platform} هستید. متنی جذاب، حرفه‌ای، دارای تیتر گیرا، بدنه اصلی، دعوت به اقدام (CTA) و هشتگ‌های ترند به زبان فارسی بنویسید.`
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
      return res.status(500).json({ error: data.error.message || 'خطا در مدل هوش مصنوعی' });
    }

    const reply = data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.';
    res.json({ content: reply });
  } catch (err) {
    res.status(500).json({ error: 'خطای سرور: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
