package com.bablakov.trainingdiary

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.io.File

/**
 * Оболочка для веб-приложения дневника. Страницы лежат внутри APK (assets/www) и отдаются по
 * https://appassets.androidplatform.net — так у них настоящий https-адрес: работают localStorage,
 * IndexedDB и запросы к api.github.com для синхронизации. Сеть нужна только для синхронизации.
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    /** Импорт: выбор файла экспорта (из Загрузок, Telegram, Диска). */
    private val pickFile = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        fileCallback?.onReceiveValue(uri?.let { arrayOf(it) })
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            setBackgroundColor(0)
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                // Ссылки наружу (например, на GitHub) открываются в браузере, а не внутри приложения.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == HOST) return false
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams,
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    pickFile.launch("*/*")
                    return true
                }
            }
            addJavascriptInterface(Bridge(), "AndroidBridge")
        }

        // Экран рисуется под системными панелями (Android 15): отступаем на их высоту.
        val root = FrameLayout(this).apply { addView(web) }
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)

        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(START)

        // «Назад» листает вкладки приложения, на первой — закрывает его.
        onBackPressedDispatcher.addCallback(this) {
            if (web.canGoBack()) web.goBack() else finish()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    /** То, чего нет у WebView: отдать файл в «Поделиться» и положить текст в буфер обмена. */
    inner class Bridge {
        @JavascriptInterface
        fun shareFile(name: String, text: String) = runOnUiThread {
            val dir = File(cacheDir, "export").apply { mkdirs() }
            val file = File(dir, name.replace(Regex("[^\\w.-]"), "_")).apply { writeText(text) }
            val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(send, "Отправить данные дневника"))
        }

        @JavascriptInterface
        fun copyText(text: String) = runOnUiThread {
            val cm = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Дневник тренировок", text))
        }
    }

    private companion object {
        const val HOST = "appassets.androidplatform.net"
        const val START = "https://$HOST/assets/www/index.html"
    }
}
