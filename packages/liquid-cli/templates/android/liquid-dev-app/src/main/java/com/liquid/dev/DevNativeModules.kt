package com.liquid.dev

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.widget.Toast
import com.liquid.runtime.LiquidNativeModule
import com.liquid.runtime.LiquidNativeModuleRegistry
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object DevNativeModules {

    fun registerAll(context: Context) {
        val appContext = context.applicationContext

        // 1. device
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "device"
            override val version = "1.0.0"

            override fun invoke(method: String, argsJson: String): String {
                if (method == "getInfo") {
                    val isTablet = (appContext.resources.configuration.screenLayout and
                            android.content.res.Configuration.SCREENLAYOUT_SIZE_MASK) >=
                            android.content.res.Configuration.SCREENLAYOUT_SIZE_LARGE

                    val res = JSONObject().apply {
                        put("model", Build.MODEL)
                        put("brand", Build.BRAND)
                        put("manufacturer", Build.MANUFACTURER)
                        put("osVersion", Build.VERSION.RELEASE)
                        put("sdkVersion", Build.VERSION.SDK_INT)
                        put("isTablet", isTablet)
                    }
                    return res.toString()
                }
                return "{\"error\":\"Unknown device method: $method\"}"
            }
        })

        // 2. clipboard
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "clipboard"
            override val version = "1.0.0"

            override fun invoke(method: String, argsJson: String): String {
                val cm = appContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                    ?: return "{\"error\":\"Clipboard unavailable\"}"

                return when (method) {
                    "getString" -> {
                        val clip = cm.primaryClip
                        val text = if (clip != null && clip.itemCount > 0) {
                            clip.getItemAt(0).text?.toString() ?: ""
                        } else ""
                        JSONObject().put("text", text).toString()
                    }
                    "setString" -> {
                        val args = try { JSONObject(argsJson) } catch (_: Exception) { JSONObject() }
                        val text = args.optString("text", "")
                        Handler(Looper.getMainLooper()).post {
                            cm.setPrimaryClip(ClipData.newPlainText("text", text))
                        }
                        "{\"success\":true}"
                    }
                    else -> "{\"error\":\"Unknown clipboard method: $method\"}"
                }
            }
        })

        // 3. haptics
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "haptics"
            override val version = "1.0.0"

            private fun getVibrator(): Vibrator? {
                return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = appContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    appContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
            }

            override fun invoke(method: String, argsJson: String): String {
                val v = getVibrator() ?: return "{\"success\":false,\"error\":\"Vibrator unavailable\"}"
                val args = try { JSONObject(argsJson) } catch (_: Exception) { JSONObject() }

                when (method) {
                    "vibrate" -> {
                        val duration = args.optLong("durationMs", 50L)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                        } else {
                            @Suppress("DEPRECATION")
                            v.vibrate(duration)
                        }
                        return "{\"success\":true}"
                    }
                    "impact" -> {
                        val style = args.optString("style", "medium")
                        val duration = when (style) {
                            "light" -> 20L
                            "heavy" -> 80L
                            else -> 45L
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                        } else {
                            @Suppress("DEPRECATION")
                            v.vibrate(duration)
                        }
                        return "{\"success\":true}"
                    }
                    else -> return "{\"error\":\"Unknown haptics method: $method\"}"
                }
            }
        })

        // 4. toast
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "toast"
            override val version = "1.0.0"

            override fun invoke(method: String, argsJson: String): String {
                if (method == "show") {
                    val args = try { JSONObject(argsJson) } catch (_: Exception) { JSONObject() }
                    val msg = args.optString("message", "")
                    val isLong = args.optString("duration", "short") == "long"
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(appContext, msg, if (isLong) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
                    }
                    return "{\"success\":true}"
                }
                return "{\"error\":\"Unknown toast method: $method\"}"
            }
        })

        // 5. storage (persistent key-value store via SharedPreferences)
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "storage"
            override val version = "1.0.0"
            private val prefs = appContext.getSharedPreferences("liquid_dev_storage", Context.MODE_PRIVATE)

            override fun invoke(method: String, argsJson: String): String {
                val args = try { JSONObject(argsJson) } catch (_: Exception) { JSONObject() }
                return when (method) {
                    "getItem" -> {
                        val key = args.optString("key", "")
                        val value = prefs.getString(key, null)
                        val res = JSONObject()
                        if (value != null) res.put("value", value) else res.put("value", JSONObject.NULL)
                        res.toString()
                    }
                    "setItem" -> {
                        val key = args.optString("key", "")
                        val value = args.optString("value", "")
                        prefs.edit().putString(key, value).apply()
                        "{\"success\":true}"
                    }
                    "removeItem" -> {
                        val key = args.optString("key", "")
                        prefs.edit().remove(key).apply()
                        "{\"success\":true}"
                    }
                    "clear" -> {
                        prefs.edit().clear().apply()
                        "{\"success\":true}"
                    }
                    else -> "{\"error\":\"Unknown storage method: $method\"}"
                }
            }
        })

        // 6. openUrl
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "openUrl"
            override val version = "1.0.0"

            override fun invoke(method: String, argsJson: String): String {
                val args = try { JSONObject(argsJson) } catch (_: Exception) { JSONObject() }
                val urlStr = args.optString("url", "")
                val uri = try { Uri.parse(urlStr) } catch (_: Exception) { null }

                if (uri == null) return "{\"error\":\"Invalid URL\"}"

                val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                return when (method) {
                    "canOpen" -> {
                        val supported = intent.resolveActivity(appContext.packageManager) != null
                        JSONObject().put("supported", supported).toString()
                    }
                    "open" -> {
                        try {
                            appContext.startActivity(intent)
                            JSONObject().put("opened", true).toString()
                        } catch (e: Exception) {
                            JSONObject().put("opened", false).put("error", e.message).toString()
                        }
                    }
                    else -> "{\"error\":\"Unknown openUrl method: $method\"}"
                }
            }
        })

        // 7. fetch (synchronous network invocation from JS thread)
        LiquidNativeModuleRegistry.register(object : LiquidNativeModule {
            override val name = "fetch"
            override val version = "1.0.0"

            override fun invoke(method: String, argsJson: String): String {
                if (method != "request") return "{\"error\":\"Unknown fetch method: $method\"}"
                return try {
                    val args = JSONObject(argsJson)
                    val urlStr = args.getString("url")
                    val reqMethod = args.optString("method", "GET").uppercase()
                    val reqBody = args.optString("body", null)
                    val headersObj = args.optJSONObject("headers")

                    val conn = URL(urlStr).openConnection() as HttpURLConnection
                    conn.requestMethod = reqMethod
                    conn.connectTimeout = 8000
                    conn.readTimeout = 15000

                    if (headersObj != null) {
                        val keys = headersObj.keys()
                        while (keys.hasNext()) {
                            val k = keys.next()
                            conn.setRequestProperty(k, headersObj.getString(k))
                        }
                    }

                    if (reqBody != null && (reqMethod == "POST" || reqMethod == "PUT" || reqMethod == "PATCH")) {
                        conn.doOutput = true
                        val out = OutputStreamWriter(conn.outputStream, Charsets.UTF_8)
                        out.write(reqBody)
                        out.flush()
                        out.close()
                    }

                    val code = conn.responseCode
                    val isSuccess = code in 200..299
                    val stream = if (isSuccess) conn.inputStream else (conn.errorStream ?: conn.inputStream)
                    val body = stream?.let {
                        BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
                    } ?: ""

                    val respHeaders = JSONObject()
                    for ((k, v) in conn.headerFields) {
                        if (k != null && v != null && v.isNotEmpty()) {
                            respHeaders.put(k, v[0])
                        }
                    }

                    JSONObject().apply {
                        put("status", code)
                        put("headers", respHeaders)
                        put("body", body)
                    }.toString()
                } catch (e: Exception) {
                    JSONObject().apply {
                        put("status", 0)
                        put("error", e.message ?: "Network error")
                    }.toString()
                }
            }
        })
    }
}
