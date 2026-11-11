package com.liquid.runtime

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.drawable.ColorDrawable
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/**
 * Debug-only inspector for Liquid Android.
 * Runs only in debug builds, bound strictly to 127.0.0.1 for local device security.
 *
 * Endpoints:
 * - GET  /dump       -> Full JSON hierarchy of native views with metrics, contrast, and layout bounds
 * - POST /tap?id=N   -> Programmatic click on node N on the UI thread
 * - POST /type?id=N&text=... -> Programmatic text input on node N
 * - GET  /screenshot -> Native view hierarchy rendered directly to PNG bitmap
 */
class LiquidDebugInspector(
    private val rootContainer: LiquidFlexLayout,
    private val batchApplier: BatchOpApplier,
    private val buildStamp: LiquidActivity.BuildStamp? = null,
    private val port: Int = 8765
) {
    private val TAG = "LiquidInspector"
    private var serverSocket: ServerSocket? = null
    @Volatile private var isRunning = false
    private val mainHandler = Handler(Looper.getMainLooper())

    fun start() {
        if (isRunning) return
        isRunning = true
        Thread {
            try {
                // Strictly bind to 127.0.0.1 (loopback only, no external access)
                val loopback = InetAddress.getByName("127.0.0.1")
                serverSocket = ServerSocket(port, 50, loopback)
                Log.i(TAG, "LiquidDebugInspector started on http://127.0.0.1:$port")

                while (isRunning) {
                    val socket = serverSocket?.accept() ?: break
                    handleClient(socket)
                }
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e(TAG, "Inspector server stopped: ${e.message}")
                }
            }
        }.apply {
            isDaemon = true
            name = "LiquidDebugInspector"
            start()
        }
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (_: Exception) {}
        serverSocket = null
    }

    private fun handleClient(socket: Socket) {
        Thread {
            try {
                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                val out = socket.getOutputStream()
                val requestLine = reader.readLine() ?: return@Thread
                val parts = requestLine.split(" ")
                if (parts.size < 2) return@Thread

                val method = parts[0].uppercase()
                val rawUri = parts[1]
                val path = if (rawUri.contains("?")) rawUri.substringBefore("?") else rawUri
                val queryString = if (rawUri.contains("?")) rawUri.substringAfter("?") else ""
                val queryParams = parseQueryParams(queryString)

                when {
                    method == "GET" && path == "/dump" -> handleDump(out)
                    method == "POST" && path == "/tap" -> handleTap(queryParams, out)
                    method == "POST" && path == "/type" -> handleType(queryParams, out)
                    method == "GET" && path == "/screenshot" -> handleScreenshot(out)
                    else -> sendResponse(out, 404, "text/plain", "Not Found")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error handling inspector request: ${e.message}")
            } finally {
                try { socket.close() } catch (_: Exception) {}
            }
        }.start()
    }

    private fun handleDump(out: OutputStream) {
        val latch = CountDownLatch(1)
        val dumpRef = AtomicReference<JSONObject?>(null)

        mainHandler.post {
            try {
                val density = rootContainer.resources.displayMetrics.density
                dumpRef.set(dumpViewHierarchy(rootContainer, density))
            } catch (e: Exception) {
                Log.e(TAG, "Error generating dump: ${e.message}", e)
            } finally {
                latch.countDown()
            }
        }

        latch.await(3, TimeUnit.SECONDS)
        val json = dumpRef.get()

        if (json != null) {
            if (buildStamp != null) {
                val bs = JSONObject()
                bs.put("id", buildStamp.id)
                bs.put("time", buildStamp.time)
                bs.put("mode", buildStamp.mode)
                bs.put("inspect", buildStamp.inspect)
                bs.put("stamp", buildStamp.stamp)
                json.put("buildStamp", bs)
            }
            val responseBytes = json.toString(2).toByteArray(Charsets.UTF_8)
            sendResponseBytes(out, 200, "application/json", responseBytes)
        } else {
            sendResponse(out, 500, "text/plain", "Failed to dump view tree")
        }
    }

    private fun dumpViewHierarchy(view: View, density: Float): JSONObject {
        val json = JSONObject()
        val nodeId = batchApplier.getNodeId(view) ?: -1
        json.put("nodeId", nodeId)

        val primitiveType = when (view) {
            is LiquidButton -> "button"
            is LiquidEditText -> "input"
            is LiquidTextView -> "text"
            is LiquidImageView -> "image"
            is LiquidScrollView -> "scroll"
            is LiquidFlexLayout -> "view"
            else -> "view"
        }
        json.put("primitiveType", primitiveType)
        json.put("className", view.javaClass.simpleName)

        val text = when (view) {
            is TextView -> view.text.toString()
            else -> ""
        }
        json.put("text", text)

        val layoutText = when (view) {
            is TextView -> view.layout?.text?.toString() ?: view.text.toString()
            else -> ""
        }
        json.put("layoutText", layoutText)

        // Real measured and laid-out bounds in DP
        val bounds = JSONObject()
        bounds.put("x", view.left / density)
        bounds.put("y", view.top / density)
        bounds.put("width", view.width / density)
        bounds.put("height", view.height / density)
        bounds.put("measuredWidth", view.measuredWidth / density)
        bounds.put("measuredHeight", view.measuredHeight / density)
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        bounds.put("screenX", loc[0] / density)
        bounds.put("screenY", loc[1] / density)
        json.put("bounds", bounds)

        val visibilityStr = when (view.visibility) {
            View.VISIBLE -> "visible"
            View.INVISIBLE -> "invisible"
            else -> "gone"
        }
        json.put("visibility", visibilityStr)
        json.put("alpha", view.alpha)
        json.put("clickable", view.isClickable)
        json.put("focusable", view.isFocusable)

        if (view is TextView) {
            // TextView.getCurrentTextColor() gives the REAL rendered text color
            json.put("textColor", formatColor(view.currentTextColor))
            json.put("fontSize", view.textSize / density)
            val isBold = view.typeface?.isBold == true
            val isItalic = view.typeface?.isItalic == true
            json.put("fontWeight", if (isBold) "bold" else "normal")
            json.put("fontStyle", if (isItalic) "italic" else "normal")

            val layout = view.layout
            val ellipsisCount = if (layout != null) {
                (0 until layout.lineCount).sumOf { layout.getEllipsisCount(it) }
            } else 0
            json.put("ellipsisCount", ellipsisCount)
            json.put("isTruncated", ellipsisCount > 0)
            json.put("lineCount", view.lineCount)

            val hasStrike = (view.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG) != 0
            val hasUnderline = (view.paintFlags and Paint.UNDERLINE_TEXT_FLAG) != 0
            json.put("paintFlags", view.paintFlags)
            json.put("hasStrikeThru", hasStrike)
            json.put("hasUnderline", hasUnderline)
            val textDecoration = when {
                hasStrike -> "line-through"
                hasUnderline -> "underline"
                else -> "none"
            }
            json.put("textDecoration", textDecoration)
        } else {
            json.put("textColor", "")
            json.put("fontSize", 0)
            json.put("fontWeight", "normal")
            json.put("ellipsisCount", 0)
            json.put("isTruncated", false)
            json.put("lineCount", 0)
            json.put("paintFlags", 0)
            json.put("hasStrikeThru", false)
            json.put("hasUnderline", false)
            json.put("textDecoration", "none")
        }

        // Resolved background colors (self vs effective resolved through parent chain)
        val selfBg = when (view) {
            is LiquidFlexLayout -> view.customBackgroundColor
            else -> {
                val bg = view.background
                if (bg is ColorDrawable) bg.color else 0
            }
        }
        json.put("selfBackgroundColor", formatColor(selfBg))

        var effectiveBg = selfBg
        if (effectiveBg == 0 || effectiveBg == android.graphics.Color.TRANSPARENT) {
            var currParent: android.view.ViewParent? = view.parent
            while (currParent != null) {
                if (currParent is View) {
                    val pBg = when (currParent) {
                        is LiquidFlexLayout -> currParent.customBackgroundColor
                        else -> {
                            val bg = currParent.background
                            if (bg is ColorDrawable) bg.color else 0
                        }
                    }
                    if (pBg != 0 && pBg != android.graphics.Color.TRANSPARENT) {
                        effectiveBg = pBg
                        break
                    }
                }
                currParent = currParent.parent
            }
        }
        if (effectiveBg == 0 || effectiveBg == android.graphics.Color.TRANSPARENT) {
            effectiveBg = android.graphics.Color.parseColor("#f1f5f9")
        }
        json.put("backgroundColor", formatColor(effectiveBg))
        json.put("effectiveBackgroundColor", formatColor(effectiveBg))

        // Per-side borders
        if (view is LiquidFlexLayout) {
            json.put("borderBottomWidth", view.borderBottomWidthPx / density)
            json.put("borderBottomColor", formatColor(view.borderBottomColor))
            json.put("borderTopWidth", view.borderTopWidthPx / density)
            json.put("borderTopColor", formatColor(view.borderTopColor))
            json.put("borderWidth", view.borderWidthPx / density)
            json.put("borderColor", formatColor(view.borderColor))
            json.put("borderRadius", view.cornerRadiusPx / density)
        } else {
            json.put("borderBottomWidth", 0)
            json.put("borderBottomColor", "")
            json.put("borderTopWidth", 0)
            json.put("borderTopColor", "")
            json.put("borderWidth", 0)
            json.put("borderColor", "")
            json.put("borderRadius", 0)
        }

        // Raw styles received from JS
        val rawStyles = batchApplier.getNodeStyle(nodeId) ?: JSONObject()
        json.put("styles", rawStyles)
        json.put("rawStyles", rawStyles)

        // Flag discrepancies between raw style and actual view state
        val mismatches = JSONArray()
        if (view is TextView && rawStyles.has("color")) {
            val rawColor = parseColorSafe(rawStyles.optString("color", ""))
            if (rawColor != 0 && view.currentTextColor != rawColor) {
                mismatches.put("TextColor mismatch: rawStyle='${rawStyles.optString("color")}', rendered='${formatColor(view.currentTextColor)}'")
            }
        }
        if (view is TextView && rawStyles.has("textDecoration")) {
            val rawDec = rawStyles.optString("textDecoration", "").lowercase()
            val hasStrike = (view.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG) != 0
            if (rawDec.contains("line-through") && !hasStrike) {
                mismatches.put("TextDecoration mismatch: rawStyle has 'line-through', but Paint hasStrikeThru is false")
            }
        }
        if (view is LiquidFlexLayout && rawStyles.has("borderBottomWidth")) {
            val rawBbw = rawStyles.optDouble("borderBottomWidth", 0.0)
            if (rawBbw > 0.0 && view.borderBottomWidthPx <= 0f) {
                mismatches.put("BorderBottomWidth mismatch: rawStyle has $rawBbw, rendered is 0")
            }
        }
        json.put("mismatches", mismatches)

        // Children
        val childrenArray = JSONArray()
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                val child = view.getChildAt(i)
                childrenArray.put(dumpViewHierarchy(child, density))
            }
        }
        json.put("children", childrenArray)

        return json
    }

    private fun handleTap(queryParams: Map<String, String>, out: OutputStream) {
        val idStr = queryParams["id"]
        val nodeId = idStr?.toIntOrNull()
        if (nodeId == null) {
            sendResponse(out, 400, "application/json", "{\"error\": \"Missing or invalid id parameter\"}")
            return
        }

        val latch = CountDownLatch(1)
        val foundRef = AtomicBoolean(false)
        mainHandler.post {
            try {
                val view = batchApplier.getView(nodeId)
                if (view != null) {
                    view.performClick()
                    foundRef.set(true)
                }
            } finally {
                latch.countDown()
            }
        }

        latch.await(2, TimeUnit.SECONDS)

        if (foundRef.get()) {
            sendResponse(out, 200, "application/json", "{\"ok\": true, \"tappedId\": $nodeId}")
        } else {
            sendResponse(out, 404, "application/json", "{\"error\": \"Node $nodeId not found\"}")
        }
    }

    private fun handleType(queryParams: Map<String, String>, out: OutputStream) {
        val idStr = queryParams["id"]
        val nodeId = idStr?.toIntOrNull()
        val text = queryParams["text"] ?: ""
        if (nodeId == null) {
            sendResponse(out, 400, "application/json", "{\"error\": \"Missing or invalid id parameter\"}")
            return
        }

        val latch = CountDownLatch(1)
        val typedRef = AtomicBoolean(false)
        mainHandler.post {
            try {
                val view = batchApplier.getView(nodeId)
                if (view is LiquidEditText) {
                    view.setTextFromJs(text)
                    view.onInputChanged?.invoke(text)
                    typedRef.set(true)
                } else if (view is TextView) {
                    view.text = text
                    typedRef.set(true)
                }
            } finally {
                latch.countDown()
            }
        }

        latch.await(2, TimeUnit.SECONDS)

        if (typedRef.get()) {
            val escapedText = JSONObject.quote(text)
            sendResponse(out, 200, "application/json", "{\"ok\": true, \"typedId\": $nodeId, \"text\": $escapedText}")
        } else {
            sendResponse(out, 404, "application/json", "{\"error\": \"Editable node $nodeId not found\"}")
        }
    }

    private fun handleScreenshot(out: OutputStream) {
        val latch = CountDownLatch(1)
        val pngRef = AtomicReference<ByteArray?>(null)

        mainHandler.post {
            try {
                val w = rootContainer.width.coerceAtLeast(1)
                val h = rootContainer.height.coerceAtLeast(1)
                val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                rootContainer.draw(canvas)
                val baos = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
                pngRef.set(baos.toByteArray())
                bitmap.recycle()
            } catch (e: Exception) {
                Log.e(TAG, "Screenshot capture failed: ${e.message}")
            } finally {
                latch.countDown()
            }
        }

        latch.await(3, TimeUnit.SECONDS)
        val bytes = pngRef.get()

        if (bytes != null) {
            // Automatically save screenshot to /sdcard/Download/liquid-shot.png
            try {
                val dlDir = java.io.File("/sdcard/Download")
                if (!dlDir.exists()) dlDir.mkdirs()
                java.io.File(dlDir, "liquid-shot.png").writeBytes(bytes)
                Log.i(TAG, "Saved screenshot to /sdcard/Download/liquid-shot.png (${bytes.size} bytes)")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to write screenshot to /sdcard/Download: ${e.message}")
            }
            sendResponseBytes(out, 200, "image/png", bytes)
        } else {
            sendResponse(out, 500, "text/plain", "Failed to capture screenshot")
        }
    }

    private fun parseColorSafe(colorStr: String): Int {
        if (colorStr.isBlank()) return 0
        return try {
            if (colorStr.startsWith("#")) {
                val clean = colorStr.trim()
                if (clean.length == 7) android.graphics.Color.parseColor(clean)
                else if (clean.length == 9) android.graphics.Color.parseColor(clean)
                else if (clean.length == 4) {
                    val r = clean[1]
                    val g = clean[2]
                    val b = clean[3]
                    android.graphics.Color.parseColor("#$r$r$g$g$b$b")
                } else android.graphics.Color.parseColor(clean)
            } else if (colorStr.startsWith("rgb")) {
                val nums = colorStr.replace(Regex("[^0-9,.]"), "").split(",").map { it.trim().toFloatOrNull() ?: 0f }
                if (nums.size >= 3) {
                    val a = if (nums.size >= 4) (nums[3] * 255).toInt() else 255
                    android.graphics.Color.argb(a, nums[0].toInt(), nums[1].toInt(), nums[2].toInt())
                } else 0
            } else 0
        } catch (_: Exception) { 0 }
    }

    private fun formatColor(color: Int): String {
        return if (color == 0) "" else String.format("#%06X", 0xFFFFFF and color).lowercase()
    }

    private fun parseQueryParams(query: String): Map<String, String> {
        val map = mutableMapOf<String, String>()
        if (query.isEmpty()) return map
        val pairs = query.split("&")
        for (p in pairs) {
            val idx = p.indexOf("=")
            if (idx > 0) {
                val key = URLDecoder.decode(p.substring(0, idx), "UTF-8")
                val value = URLDecoder.decode(p.substring(idx + 1), "UTF-8")
                map[key] = value
            }
        }
        return map
    }

    private fun sendResponse(out: OutputStream, code: Int, contentType: String, body: String) {
        sendResponseBytes(out, code, contentType, body.toByteArray(Charsets.UTF_8))
    }

    private fun sendResponseBytes(out: OutputStream, code: Int, contentType: String, bytes: ByteArray) {
        val statusText = when (code) {
            200 -> "OK"
            400 -> "Bad Request"
            404 -> "Not Found"
            else -> "Internal Server Error"
        }
        val header = "HTTP/1.1 $code $statusText\r\n" +
                "Content-Type: $contentType\r\n" +
                "Content-Length: ${bytes.size}\r\n" +
                "Connection: close\r\n" +
                "Access-Control-Allow-Origin: *\r\n\r\n"
        out.write(header.toByteArray(Charsets.UTF_8))
        out.write(bytes)
        out.flush()
    }
}
