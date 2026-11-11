package com.liquid.dev

import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import com.liquid.runtime.BundleContent
import com.liquid.runtime.BundleManifest
import com.liquid.runtime.BundleSource
import com.liquid.runtime.FlexDirection
import com.liquid.runtime.LiquidActivity
import com.liquid.runtime.LiquidDebugInspector
import com.liquid.runtime.LiquidEngine
import com.liquid.runtime.LiquidFlexLayout
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class DevLiquidActivity : Activity() {

    private val TAG = "LiquidDev"

    private lateinit var rootFrame: FrameLayout
    private lateinit var rootContainer: LiquidFlexLayout
    private lateinit var errorOverlay: DevErrorOverlay
    private lateinit var floatingDevButton: TextView

    private var engine: LiquidEngine? = null
    private var debugInspector: LiquidDebugInspector? = null
    private var wsClient: LiquidWebSocketClient? = null
    private var shakeDetector: DevShakeDetector? = null

    private var serverUrl: String = "http://127.0.0.1:3000"
    private var token: String = ""
    private var currentBuildId: String = "initial"

    private val logBuffer = mutableListOf<String>()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        serverUrl = intent.getStringExtra("SERVER_URL") ?: "http://127.0.0.1:3000"
        token = intent.getStringExtra("TOKEN") ?: ""
        if (serverUrl.endsWith("/")) serverUrl = serverUrl.dropLast(1)

        // Register built-in native modules
        DevNativeModules.registerAll(this)

        buildDevLayout()
        setupShakeDetector()
        connectWebSocket()
        loadAndStartProject()
    }

    private fun buildDevLayout() {
        rootFrame = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#F1F5F9")) // slate-100
        }

        // 1. Root Container for Liquid Flex Views
        rootContainer = LiquidFlexLayout(this).apply {
            flexDirection = FlexDirection.COLUMN
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            customBackgroundColor = Color.parseColor("#F1F5F9")
        }
        rootFrame.addView(rootContainer)

        // Window insets
        window.decorView.setOnApplyWindowInsetsListener { _, insets ->
            val top = insets.systemWindowInsetTop
            val bottom = insets.systemWindowInsetBottom
            rootContainer.setPadding(0, top, 0, bottom)
            insets
        }

        // 2. Error Overlay
        errorOverlay = DevErrorOverlay(
            context = this,
            onReloadRequest = {
                requestServerReload()
            },
            onDismissRequest = {
                // dismissed
            }
        ).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        rootFrame.addView(errorOverlay)

        // 3. Floating Dev Menu Button
        val prefs = getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
        val isHidden = prefs.getBoolean("hide_floating_button", false)

        floatingDevButton = TextView(this).apply {
            text = "🫟"
            textSize = 15f
            gravity = Gravity.CENTER
            alpha = 0.65f
            val size = (36 * resources.displayMetrics.density).toInt()
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#991E293B")) // semi-transparent slate
                setStroke((1.5f * resources.displayMetrics.density).toInt(), Color.parseColor("#8038BDF8"))
            }
            background = bg
            val params = FrameLayout.LayoutParams(size, size).apply {
                gravity = Gravity.BOTTOM or Gravity.END
                val margin = (16 * resources.displayMetrics.density).toInt()
                setMargins(0, 0, margin, margin)
            }
            layoutParams = params
            visibility = if (isHidden) View.GONE else View.VISIBLE

            // Draggable with edge-snapping and tap recognition
            val touchSlop = ViewConfiguration.get(this@DevLiquidActivity).scaledTouchSlop
            var dX = 0f
            var dY = 0f
            var startX = 0f
            var startY = 0f
            var isDragging = false

            setOnTouchListener { view, event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        dX = view.x - event.rawX
                        dY = view.y - event.rawY
                        startX = event.rawX
                        startY = event.rawY
                        isDragging = false
                        view.animate().scaleX(1.15f).scaleY(1.15f).alpha(1.0f).setDuration(100).start()
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val deltaX = Math.abs(event.rawX - startX)
                        val deltaY = Math.abs(event.rawY - startY)
                        if (deltaX > touchSlop || deltaY > touchSlop) {
                            isDragging = true
                        }
                        if (isDragging) {
                            val parentW = (view.parent as? View)?.width ?: rootFrame.width
                            val parentH = (view.parent as? View)?.height ?: rootFrame.height
                            val newX = (event.rawX + dX).coerceIn(0f, (parentW - view.width).toFloat())
                            val newY = (event.rawY + dY).coerceIn(0f, (parentH - view.height).toFloat())
                            view.x = newX
                            view.y = newY
                        }
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        view.animate().scaleX(1.0f).scaleY(1.0f).alpha(0.65f).setDuration(150).start()
                        if (!isDragging) {
                            showDevMenu()
                        } else {
                            val parentW = (view.parent as? View)?.width ?: rootFrame.width
                            val margin = 8 * resources.displayMetrics.density
                            val targetX = if (view.x + view.width / 2 < parentW / 2) {
                                margin
                            } else {
                                (parentW - view.width - margin).coerceAtLeast(0f)
                            }
                            view.animate()
                                .x(targetX)
                                .setDuration(200)
                                .start()
                        }
                        true
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        view.animate().scaleX(1.0f).scaleY(1.0f).alpha(0.65f).setDuration(150).start()
                        false
                    }
                    else -> false
                }
            }
        }
        rootFrame.addView(floatingDevButton)

        setContentView(rootFrame)
    }

    private fun setupShakeDetector() {
        shakeDetector = DevShakeDetector(this) {
            showDevMenu()
        }
        shakeDetector?.start()
    }

    private fun showDevMenu() {
        val prefs = getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
        val buttonHidden = prefs.getBoolean("hide_floating_button", false)
        val buttonToggleText = if (buttonHidden) "👁 Show Floating Button" else "🙈 Hide Floating Button (Shake to open)"

        val items = arrayOf(
            "🔄 Reload Bundle",
            buttonToggleText,
            "📋 Copy Server URL",
            "🔍 Toggle Debug Inspector (:8765)",
            "📜 View Logs (${logBuffer.size})",
            "🚪 Disconnect / Home"
        )

        AlertDialog.Builder(this)
            .setTitle("Liquid Dev Menu")
            .setItems(items) { _, which ->
                when (which) {
                    0 -> requestServerReload()
                    1 -> {
                        val nextHidden = !prefs.getBoolean("hide_floating_button", false)
                        prefs.edit().putBoolean("hide_floating_button", nextHidden).apply()
                        floatingDevButton.visibility = if (nextHidden) View.GONE else View.VISIBLE
                        val msg = if (nextHidden) {
                            "Floating button hidden. Shake device to open menu."
                        } else {
                            "Floating button shown."
                        }
                        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
                    }
                    2 -> {
                        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                        cm?.setPrimaryClip(ClipData.newPlainText("URL", serverUrl))
                        Toast.makeText(this, "Copied $serverUrl", Toast.LENGTH_SHORT).show()
                    }
                    3 -> toggleDebugInspector()
                    4 -> showLogsDialog()
                    5 -> finish()
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun showLogsDialog() {
        val message = if (logBuffer.isEmpty()) "No logs captured yet." else logBuffer.takeLast(40).joinToString("\n")
        AlertDialog.Builder(this)
            .setTitle("Dev Logs")
            .setMessage(message)
            .setPositiveButton("Clear") { _, _ -> logBuffer.clear() }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun toggleDebugInspector() {
        if (debugInspector == null && engine != null) {
            val stamp = LiquidActivity.BuildStamp(
                id = currentBuildId,
                mode = "dev",
                inspect = true,
                stamp = true
            )
            debugInspector = LiquidDebugInspector(rootContainer, engine!!.batchApplier, stamp, port = 8765)
            debugInspector?.start()
            Toast.makeText(this, "Inspector running on 127.0.0.1:8765", Toast.LENGTH_SHORT).show()
        } else {
            debugInspector?.stop()
            debugInspector = null
            Toast.makeText(this, "Inspector stopped", Toast.LENGTH_SHORT).show()
        }
    }

    private fun connectWebSocket() {
        val wsUrl = serverUrl.replace("http://", "ws://").replace("https://", "wss://") +
                "/ws" + if (token.isNotEmpty()) "?token=$token" else ""

        wsClient = LiquidWebSocketClient(
            endpointUrl = wsUrl,
            listener = object : LiquidWebSocketListener {
                override fun onOpen() {
                    Log.i(TAG, "Connected to Liquid Dev server WebSocket")
                    appendLog("[WS] Connected to $serverUrl")

                    // Send hello message
                    val hello = JSONObject().apply {
                        put("type", "hello")
                        put("protocolVersion", 1)
                        val devInfo = JSONObject().apply {
                            put("model", Build.MODEL)
                            put("brand", Build.BRAND)
                            put("androidVersion", Build.VERSION.RELEASE)
                            put("sdkVersion", Build.VERSION.SDK_INT)
                            put("runtimeVersion", "1.0")
                            put("appVersion", "1.0.0")
                            val mods = JSONArray().apply {
                                put("device"); put("clipboard"); put("haptics")
                                put("toast"); put("storage"); put("openUrl"); put("fetch")
                            }
                            put("supportedModules", mods)
                        }
                        put("device", devInfo)
                    }
                    wsClient?.send(hello.toString())
                }

                override fun onMessage(text: String) {
                    handleServerMessage(text)
                }

                override fun onClose(code: Int, reason: String) {
                    Log.w(TAG, "WebSocket closed ($code: $reason)")
                    appendLog("[WS] Disconnected ($reason)")
                }

                override fun onError(t: Throwable) {
                    Log.e(TAG, "WebSocket error: ${t.message}")
                    appendLog("[WS Error] ${t.message}")
                }
            }
        )
        wsClient?.connect()
    }

    private fun handleServerMessage(text: String) {
        try {
            val msg = JSONObject(text)
            val type = msg.optString("type")

            when (type) {
                "reload" -> {
                    currentBuildId = msg.optString("buildId", currentBuildId)
                    appendLog("[Reload] New build $currentBuildId ready")
                    errorOverlay.hideError()
                    reloadProject()
                }

                "compile-error" -> {
                    val err = msg.optJSONObject("error") ?: JSONObject()
                    val file = err.optString("file", "")
                    val line = err.optInt("line", 1)
                    val column = err.optInt("column", 1)
                    val message = err.optString("message", "Compilation Error")
                    val frame = err.optString("frame", "")

                    appendLog("[Compile Error] $file:$line:$column - $message")
                    errorOverlay.showError("Compilation Error", file, line, column, message, frame)
                }

                "clear-error" -> {
                    errorOverlay.hideError()
                }

                "hello-ack" -> {
                    currentBuildId = msg.optString("buildId", currentBuildId)
                    appendLog("[Server] Connected (build $currentBuildId)")
                }

                "error" -> {
                    val errMsg = msg.optString("message", "Server error")
                    appendLog("[Server Error] $errMsg")
                    Toast.makeText(this, errMsg, Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling WS message: ${e.message}")
        }
    }

    private fun loadAndStartProject() {
        val bundleSource = DevNetworkBundleSource(serverUrl, token)

        engine = LiquidEngine(this, rootContainer, isDebug = true)
        engine?.onErrorListener = { msg, stack ->
            handleRuntimeError(msg, stack)
            true
        }
        engine?.start(bundleSource)

        // Start debug inspector
        val stamp = LiquidActivity.BuildStamp(
            id = currentBuildId,
            mode = "dev",
            inspect = true,
            stamp = false
        )
        debugInspector = LiquidDebugInspector(rootContainer, engine!!.batchApplier, stamp, port = 8765)
        debugInspector?.start()

        sendAckToDevServer()
    }

    private fun handleRuntimeError(message: String, stack: String) {
        appendLog("[Runtime Error] $message")

        // 1. Notify dev server over WebSocket for terminal logging & sourcemap resolution
        val errObj = JSONObject().apply {
            put("type", "runtime-error")
            put("protocolVersion", 1)
            put("message", message)
            put("stack", stack)
        }
        wsClient?.send(errObj.toString())

        // 2. Local immediate display on error overlay
        val lineColRegex = Regex(""":(\d+)(?::(\d+))?""")
        val match = lineColRegex.find(stack)
        val line = match?.groupValues?.get(1)?.toIntOrNull() ?: 1
        val col = match?.groupValues?.getOrNull(2)?.toIntOrNull() ?: 1

        mainHandler.post {
            errorOverlay.showError(
                title = "Runtime Exception",
                file = "bundle.js",
                line = line,
                column = col,
                message = message,
                frame = stack
            )
        }
    }

    private fun reloadProject() {
        val bundleSource = DevNetworkBundleSource(serverUrl, token)
        engine?.reload(bundleSource)
        sendAckToDevServer()
    }

    private fun requestServerReload() {
        val req = JSONObject().apply {
            put("type", "request-reload")
            put("protocolVersion", 1)
        }
        wsClient?.send(req.toString())
    }

    private fun sendAckToDevServer() {
        val ack = JSONObject().apply {
            put("type", "ack")
            put("protocolVersion", 1)
            put("buildId", currentBuildId)
        }
        wsClient?.send(ack.toString())
    }

    private fun appendLog(line: String) {
        logBuffer.add(line)
        if (logBuffer.size > 200) logBuffer.removeAt(0)
    }

    override fun onDestroy() {
        super.onDestroy()
        shakeDetector?.stop()
        debugInspector?.stop()
        wsClient?.close()
        engine?.destroy()
    }
}

class DevNetworkBundleSource(
    private val serverUrl: String,
    private val token: String
) : BundleSource {

    private fun buildUrl(endpoint: String): String {
        val base = if (serverUrl.endsWith("/")) serverUrl.dropLast(1) else serverUrl
        val sep = if (endpoint.startsWith("/")) "" else "/"
        val tParam = if (token.isNotEmpty()) "?token=$token" else ""
        return "$base$sep$endpoint$tParam"
    }

    override fun loadManifest(): BundleManifest {
        val url = buildUrl("manifest.json")
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 6000
            val text = conn.inputStream.bufferedReader().readText()
            BundleManifest.fromJson(text)
        } catch (_: Exception) {
            BundleManifest("Dev App", "1.0.0", "bundle.js", "1.0", emptyList(), emptyList())
        }
    }

    override fun loadBundle(): BundleContent {
        val url = buildUrl("bundle.js")
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 6000
        conn.readTimeout = 12000

        val code = conn.inputStream.bufferedReader().readText()
        return BundleContent.SourceCode(code, "bundle.js")
    }
}
