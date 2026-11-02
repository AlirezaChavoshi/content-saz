package ir.contentsaz.app

import android.app.Activity
import android.os.Bundle
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.content.ContentValues
import android.provider.MediaStore
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import android.util.Base64

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var topic: EditText
    private lateinit var audience: EditText
    private lateinit var tone: EditText
    private lateinit var goal: EditText
    private lateinit var platform: Spinner
    private lateinit var result: TextView
    private lateinit var promptResult: TextView
    private lateinit var imageView: ImageView
    private lateinit var status: TextView
    private var lastBitmap: Bitmap? = null
    private val navy = Color.rgb(30, 48, 75)
    private val teal = Color.rgb(0, 121, 107)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = navy
        window.navigationBarColor = navy
        val scroll = ScrollView(this)
        scroll.setBackgroundColor(Color.rgb(247, 249, 252))
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(18), dp(20), dp(28)); layoutDirection = View.LAYOUT_DIRECTION_RTL }
        scroll.addView(box)
        setContentView(scroll)
        box.addView(label("محتواساز هوشمند", 26, navy, true))
        box.addView(label("کپشن، هشتگ و ایدهٔ تصویر برای شبکه‌های اجتماعی", 14, Color.DKGRAY))
        box.addView(label("پلتفرم", 16, navy, true))
        platform = Spinner(this)
        platform.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("اینستاگرام", "بله", "ایتا", "روبیکا", "سایر"))
        box.addView(platform)
        topic = input(box, "محصول یا موضوع *", "مثلاً شمع دست‌ساز، تخفیف بهاره")
        audience = input(box, "مخاطب هدف", "مثلاً علاقه‌مندان دکوراسیون")
        tone = input(box, "لحن", "مثلاً صمیمی، رسمی، شوخ‌طبع")
        goal = input(box, "هدف محتوا", "مثلاً افزایش فروش، آگاهی از برند")
        val gen = button("تولید محتوا و هشتگ", teal)
        box.addView(gen)
        result = output(box, "متن پیشنهادی")
        box.addView(label("پرامپت تصویر (جداگانه)", 18, navy, true))
        promptResult = output(box, "پرامپت تصویر پس از تولید محتوا نمایش داده می‌شود.")
        val imgBtn = button("ساخت تصویر", navy)
        box.addView(imgBtn)
        imageView = ImageView(this).apply { adjustViewBounds = true; scaleType = ImageView.ScaleType.FIT_CENTER; contentDescription = "تصویر تولیدشده" }
        box.addView(imageView, LinearLayout.LayoutParams(-1, dp(280)))
        val saveBtn = button("ذخیرهٔ تصویر در گالری", Color.rgb(96, 75, 145))
        box.addView(saveBtn)
        status = label("", 14, teal)
        box.addView(status)
        gen.setOnClickListener { generateText(gen) }
        imgBtn.setOnClickListener { generateImage(imgBtn) }
        saveBtn.setOnClickListener { saveImage() }
    }

    private fun input(parent: LinearLayout, title: String, hint: String): EditText {
        parent.addView(label(title, 15, navy, true))
        val e = EditText(this).apply { this.hint = hint; textSize = 15f; setSingleLine(false); minLines = 1; maxLines = 3; gravity = Gravity.RIGHT or Gravity.CENTER_VERTICAL; layoutDirection = View.LAYOUT_DIRECTION_RTL; setPadding(dp(12), dp(8), dp(12), dp(8)); setBackgroundColor(Color.WHITE) }
        parent.addView(e, LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(4) })
        return e
    }
    private fun label(s: String, size: Int, color: Int, bold: Boolean = false) = TextView(this).apply { text = s; textSize = size.toFloat(); setTextColor(color); gravity = Gravity.RIGHT; layoutDirection = View.LAYOUT_DIRECTION_RTL; if (bold) setTypeface(null, android.graphics.Typeface.BOLD); setPadding(0, dp(9), 0, dp(5)) }
    private fun output(parent: LinearLayout, initial: String): TextView = TextView(this).apply { text = initial; textSize = 15f; setTextColor(Color.rgb(40, 45, 55)); gravity = Gravity.RIGHT; layoutDirection = View.LAYOUT_DIRECTION_RTL; setPadding(dp(14), dp(14), dp(14), dp(14)); setBackgroundColor(Color.WHITE); parent.addView(this, LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) }) }
    private fun button(text: String, color: Int) = Button(this).apply { this.text = text; setTextColor(Color.WHITE); setBackgroundTintList(android.content.res.ColorStateList.valueOf(color)); layoutDirection = View.LAYOUT_DIRECTION_RTL; isAllCaps = false; setPadding(dp(12), dp(4), dp(12), dp(4)) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun baseUrl(): String {
        val b = BuildConfig.API_BASE_URL.trim().trimEnd('/')
        require(b.startsWith("https://")) { "آدرس سرور را با HTTPS در API_BASE_URL تنظیم کنید." }
        require(!b.contains("YOUR_BACKEND_DOMAIN")) { "ابتدا دامنهٔ واقعی سرور را در API_BASE_URL تنظیم کنید." }
        return b
    }
    private fun payload() = JSONObject().put("platform", platform.selectedItem.toString()).put("topic", topic.text.toString().trim()).put("audience", audience.text.toString().trim()).put("tone", tone.text.toString().trim()).put("goal", goal.text.toString().trim())
    private fun request(path: String, body: JSONObject): JSONObject {
        val conn = (URL(baseUrl() + path).openConnection() as HttpURLConnection)
        conn.requestMethod = "POST"; conn.connectTimeout = 20000; conn.readTimeout = 90000; conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val text = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        if (conn.responseCode !in 200..299) throw Exception("سرور (${conn.responseCode}): " + runCatching { JSONObject(text).optString("error", text) }.getOrDefault(text))
        return JSONObject(text)
    }
    private fun generateText(button: Button) {
        if (topic.text.toString().trim().isEmpty()) { status.text = "موضوع یا محصول را وارد کنید."; return }
        busy(button, true); status.text = "در حال تولید محتوا…"
        val data = payload()
        executor.execute { try {
            val r = request("/api/generate", data)
            runOnUiThread { result.text = r.optString("content", "پاسخ خالی بود."); promptResult.text = r.optString("imagePrompt", "پرامپت تصویر در دسترس نیست."); status.text = "محتوا آماده شد."; busy(button, false) }
        } catch (e: Exception) { runOnUiThread { status.text = e.message ?: "خطا در ارتباط با سرور"; busy(button, false) } } }
    }
    private fun generateImage(button: Button) {
        val p = promptResult.text.toString().trim()
        if (p.isEmpty() || p.startsWith("پرامپت تصویر پس")) { status.text = "ابتدا محتوا را تولید کنید تا پرامپت تصویر آماده شود."; return }
        busy(button, true); status.text = "در حال ساخت تصویر؛ ممکن است کمی طول بکشد…"
        executor.execute { try {
            val r = request("/api/image", JSONObject().put("prompt", p))
            val b64 = r.optString("imageBase64", "")
            require(b64.isNotEmpty()) { "سرور تصویر معتبر برنگرداند." }
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                ?: throw Exception("دریافت/رمزگشایی تصویر ناموفق بود.")
            runOnUiThread { lastBitmap = bitmap; imageView.setImageBitmap(bitmap); status.text = "تصویر آماده شد."; busy(button, false) }
        } catch (e: Exception) { runOnUiThread { status.text = e.message ?: "خطا در ساخت تصویر"; busy(button, false) } } }
    }
    private fun saveImage() {
        val bitmap = lastBitmap ?: run { status.text = "ابتدا یک تصویر بسازید."; return }
        try {
            val values = ContentValues().apply { put(MediaStore.Images.Media.DISPLAY_NAME, "contentsaz-${System.currentTimeMillis()}.png"); put(MediaStore.Images.Media.MIME_TYPE, "image/png"); put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/ContentSaz") }
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: throw Exception("امکان ایجاد فایل نبود")
            contentResolver.openOutputStream(uri).use { out -> if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out!!)) throw Exception("ذخیره‌سازی ناموفق بود") }
            status.text = "تصویر در گالری، پوشهٔ Pictures/ContentSaz ذخیره شد."
        } catch (e: Exception) { status.text = e.message ?: "خطا در ذخیرهٔ تصویر" }
    }
    private fun busy(button: Button, value: Boolean) { button.isEnabled = !value; button.alpha = if (value) .55f else 1f }
    override fun onDestroy() { super.onDestroy(); executor.shutdown() }
}
