const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.json());

// صفحه اصلی و ظاهر برنامه
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>محتواساز هوشمند</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 20px; border-radius: 12px; }
    h1 { text-align: center; color: #38bdf8; font-size: 1.3rem; }
    label { display: block; margin-top: 12px; margin-bottom: 5px; font-weight: bold; }
    textarea, select { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 1rem; }
    button { width: 100%; margin-top: 15px; padding: 14px; border: none; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; background: #2563eb; color: #fff; }
    button:disabled { opacity: 0.5; }
    #result { margin-top: 15px; padding: 12px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; display: none; white-space: pre-wrap; line-height: 1.6; }
    #status { text-align: center; color: #f59e0b; margin-top: 10px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 محتواساز هوشمند</h1>
    <label>پلتفرم:</label>
    <select id="platform">
      <option value="اینستاگرام">اینستاگرام</option>
      <option value="ایتا">ایتا</option>
      <option value="بله">بله</option>
      <option value="روبیکا">روبیکا</option>
      <option value="تلگرام">تلگرام</option>
    </select>
    <label>موضوع محتوا:</label>
    <textarea id="prompt" rows="3" placeholder="مثال: معرفی ۳ ترفند کاربردی..."></textarea>
    <button id="btn" onclick="generate()">📝 تولید محتوا</button>
    <div id="status"></div>
    <div id="result"></div>
  </div>
  <script>
    async function generate() {
      const prompt = document.getElementById('prompt').value.trim();
      const platform = document.getElementById('platform').value;
      if (!prompt) return alert('موضوع را بنویسید');
      
      const btn = document.getElementById('btn');
      const status = document.getElementById('status');
      const result = document.getElementById('result');
      
      btn.disabled = true;
      status.innerText = 'در حال تولید محتوا با هوش مصنوعی...';
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
        status.innerText = '✅ محتوا آماده شد!';
      } catch (e) {
        status.innerText = '❌ خطا: ' + e.message;
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
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          { role: 'system', content: `یک تولیدکننده محتوا برای ${platform} هستید. متنی جذاب، تیتر، کپشن و هشتگ به زبان فارسی بنویسید.` },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ content: data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
