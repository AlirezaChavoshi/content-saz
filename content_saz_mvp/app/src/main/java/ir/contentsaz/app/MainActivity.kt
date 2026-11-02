package ir.contentsaz.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.squareup.picasso.Picasso
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private val backendUrl = "https://content-saz-1.onrender.com"

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private lateinit var etTopic: TextInputEditText
    private lateinit var spinnerPlatform: Spinner
    private lateinit var spinnerTone: Spinner
    private lateinit var btnGenerateText: MaterialButton
    private lateinit var btnGenerateImage: MaterialButton
    private lateinit var btnCopy: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvResult: TextView
    private lateinit var ivGenerated: ImageView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        etTopic = findViewById(R.id.etTopic)
        spinnerPlatform = findViewById(R.id.spinnerPlatform)
        spinnerTone = findViewById(R.id.spinnerTone)
        btnGenerateText = findViewById(R.id.btnGenerateText)
        btnGenerateImage = findViewById(R.id.btnGenerateImage)
        btnCopy = findViewById(R.id.btnCopy)
        progressBar = findViewById(R.id.progressBar)
        tvResult = findViewById(R.id.tvResult)
        ivGenerated = findViewById(R.id.ivGenerated)

        val platforms = arrayOf("اینستاگرام", "ایتا", "روبیکا", "تلگرام")
        val platformAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, platforms)
        spinnerPlatform.adapter = platformAdapter

        val tones = arrayOf("صمیمی", "رسمی", "آموزشی", "تبلیغاتی")
        val toneAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, tones)
        spinnerTone.adapter = toneAdapter

        btnGenerateText.setOnClickListener {
            val topic = etTopic.text.toString().trim()
            if (topic.isEmpty()) {
                Toast.makeText(this, "موضوع را وارد کنید", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            generateText(topic, spinnerPlatform.selectedItem.toString(), spinnerTone.selectedItem.toString())
        }

        btnGenerateImage.setOnClickListener {
            val topic = etTopic.text.toString().trim()
            if (topic.isEmpty()) {
                Toast.makeText(this, "موضوع را وارد کنید", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            generateImage(topic)
        }

        btnCopy.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Result", tvResult.text.toString())
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "کپی شد", Toast.LENGTH_SHORT).show()
        }
    }

    private fun generateText(topic: String, platform: String, tone: String) {
        progressBar.visibility = View.VISIBLE
        tvResult.text = "در حال تولید..."
        
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("topic", topic)
                    put("platform", platform)
                    put("tone", tone)
                }
                val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                val request = Request.Builder().url("$backendUrl/api/generate-text").post(body).build()
                val response = client.newCall(request).execute()
                val data = response.body?.string()
                
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    if (response.isSuccessful) {
                        tvResult.text = JSONObject(data!!).optString("content")
                    } else {
                        tvResult.text = "خطای سرور: ${response.code}"
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    tvResult.text = "خطا: ${e.message}"
                }
            }
        }
    }

    private fun generateImage(prompt: String) {
        progressBar.visibility = View.VISIBLE
        tvResult.text = "در حال ساخت تصویر..."
        ivGenerated.visibility = View.GONE
        
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val json = JSONObject().apply { put("prompt", prompt) }
                val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                val request = Request.Builder().url("$backendUrl/api/generate-image").post(body).build()
                val response = client.newCall(request).execute()
                val data = response.body?.string()
                
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    if (response.isSuccessful) {
                        val url = JSONObject(data!!).optString("imageUrl")
                        ivGenerated.visibility = View.VISIBLE
                        Picasso.get().load(url).into(ivGenerated)
                        tvResult.text = "تصویر ساخته شد."
                    } else {
                        tvResult.text = "خطا در تصویر: ${response.code}"
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    tvResult.text = "خطا: ${e.message}"
                }
            }
        }
    }
}
