package ir.contentsaz.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {

    private val backendBaseUrl = "https://content-saz-1.onrender.com"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ContentSazScreen(
                        onGenerateText = { topic, platform, tone ->
                            requestGenerateText(topic, platform, tone)
                        },
                        onGenerateImage = { prompt ->
                            requestGenerateImage(prompt)
                        }
                    )
                }
            }
        }
    }

    private suspend fun requestGenerateText(topic: String, platform: String, tone: String): String =
        withContext(Dispatchers.IO) {
            val url = URL("$backendBaseUrl/api/generate-text")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                doOutput = true
                connectTimeout = 60000
                readTimeout = 60000
            }

            val body = JSONObject().apply {
                put("topic", topic)
                put("platform", platform)
                put("tone", tone)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }

            if (responseCode !in 200..299) {
                throw RuntimeException("خطای سرور ($responseCode): $responseText")
            }

            val json = JSONObject(responseText)
            json.optString("result", "متنی دریافت نشد")
        }

    private suspend fun requestGenerateImage(prompt: String): String =
        withContext(Dispatchers.IO) {
            val url = URL("$backendBaseUrl/api/generate-image")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                doOutput = true
                connectTimeout = 60000
                readTimeout = 60000
            }

            val body = JSONObject().apply {
                put("prompt", prompt)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { it.write(body.toString()) }

            val responseCode = conn.responseCode
            val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }

            if (responseCode !in 200..299) {
                throw RuntimeException("خطای سرور ($responseCode): $responseText")
            }

            val json = JSONObject(responseText)
            json.optString("imageUrl", "لینکی دریافت نشد")
        }
}

@Composable
fun ContentSazScreen(
    onGenerateText: suspend (String, String, String) -> String,
    onGenerateImage: suspend (String) -> String
) {
    val scope = rememberCoroutineScope()
    var topic by remember { mutableStateOf("") }
    var platform by remember { mutableStateOf("اینستاگرام") }
    var tone by remember { mutableStateOf("جذاب و صمیمی") }
    var resultText by remember { mutableStateOf("") }
    var isLoadingText by remember { mutableStateOf(false) }
    var isLoadingImage by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("تولیدکننده محتوا (هوش مصنوعی)", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = topic,
            onValueChange = { topic = it },
            label = { Text("موضوع یا ایده محتوا") },
            placeholder = { Text("مثال: ۵ راز فروش بیشتر در روبیکا") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = platform,
            onValueChange = { platform = it },
            label = { Text("پلتفرم (اینستاگرام، روبیکا، ایتا، بله)") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = tone,
            onValueChange = { tone = it },
            label = { Text("لحن متن (صمیمی، رسمی، فروشگاهی)") },
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = {
                if (topic.isBlank()) {
                    errorMessage = "لطفاً موضوع محتوا را بنویسید"
                    return@Button
                }
                isLoadingText = true
                errorMessage = null
                scope.launch {
                    try {
                        resultText = onGenerateText(topic, platform, tone)
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "خطای ناشناخته در ارتباط با سرور"
                    } finally {
                        isLoadingText = false
                    }
                }
            },
            enabled = !isLoadingText,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isLoadingText) "در حال تولید متن... (کمی صبر کنید)" else "تولید متن محتوا")
        }

        Button(
            onClick = {
                if (topic.isBlank()) {
                    errorMessage = "لطفاً ابتدا موضوع یا پرامپت تصویر را بنویسید"
                    return@Button
                }
                isLoadingImage = true
                errorMessage = null
                scope.launch {
                    try {
                        val img = onGenerateImage(topic)
                        resultText = "لینک تصویر ساخته شده:\n$img"
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "خطای ناشناخته در ارتباط با سرور"
                    } finally {
                        isLoadingImage = false
                    }
                }
            },
            enabled = !isLoadingImage,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isLoadingImage) "در حال تولید تصویر..." else "تولید تصویر با هوش مصنوعی")
        }

        errorMessage?.let {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }

        if (resultText.isNotBlank()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                SelectionContainer {
                    Text(
                        text = resultText,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}
