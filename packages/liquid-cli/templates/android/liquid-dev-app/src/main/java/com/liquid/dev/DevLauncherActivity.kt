package com.liquid.dev

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

class DevLauncherActivity : Activity() {

    private lateinit var urlEditText: EditText
    private lateinit var tokenEditText: EditText
    private lateinit var recentsContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if opened via deep link
        if (handleDeepLink(intent)) {
            return
        }

        buildUi()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?): Boolean {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "liquid" && data.host == "dev") {
            val targetUrl = data.getQueryParameter("url") ?: "http://127.0.0.1:3000"
            val token = data.getQueryParameter("token") ?: ""
            launchDevSession(targetUrl, token)
            return true
        }
        return false
    }

    private fun buildUi() {
        val rootScroll = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0F172A")) // slate-900
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            isFillViewport = true
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val p = (24 * resources.displayMetrics.density).toInt()
            setPadding(p, p * 2, p, p)
        }

        // Title & Logo
        val titleView = TextView(this).apply {
            text = "🫟 Liquid dev"
            setTextColor(Color.parseColor("#38BDF8")) // sky-400
            textSize = 28f
            setTypeface(Typeface.DEFAULT_BOLD)
        }
        content.addView(titleView)

        val subtitleView = TextView(this).apply {
            text = "Expo-Go-style instant reload for Liquid Android"
            setTextColor(Color.parseColor("#94A3B8")) // slate-400
            textSize = 14f
            val mb = (24 * resources.displayMetrics.density).toInt()
            setPadding(0, 4, 0, mb)
        }
        content.addView(subtitleView)

        // Quick Connect Localhost Button
        val localhostBtn = Button(this).apply {
            text = "⚡ Connect Localhost (127.0.0.1:3000)"
            setTextColor(Color.WHITE)
            textSize = 14f
            setTypeface(Typeface.DEFAULT_BOLD)
            val btnBg = GradientDrawable().apply {
                setColor(Color.parseColor("#0284C7")) // sky-600
                cornerRadius = 16f
            }
            background = btnBg
            val p16 = (14 * resources.displayMetrics.density).toInt()
            setPadding(p16, p16, p16, p16)
            setOnClickListener {
                val token = tokenEditText.text.toString().trim()
                launchDevSession("http://127.0.0.1:3000", token)
            }
        }
        content.addView(localhostBtn)

        val divider = View(this).apply {
            val my = (24 * resources.displayMetrics.density).toInt()
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 2).apply {
                setMargins(0, my, 0, my)
            }
            setBackgroundColor(Color.parseColor("#334155")) // slate-700
        }
        content.addView(divider)

        // Manual Connection Form
        val manualLabel = TextView(this).apply {
            text = "Manual Connection"
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(Typeface.DEFAULT_BOLD)
            val mb = (12 * resources.displayMetrics.density).toInt()
            setPadding(0, 0, 0, mb)
        }
        content.addView(manualLabel)

        // URL Label & Input
        val urlLabel = TextView(this).apply {
            text = "Server URL (HTTP / LAN IP):"
            setTextColor(Color.parseColor("#CBD5E1"))
            textSize = 12f
            setPadding(0, 0, 0, 6)
        }
        content.addView(urlLabel)

        val inputBg = GradientDrawable().apply {
            setColor(Color.parseColor("#1E293B"))
            cornerRadius = 12f
            setStroke(2, Color.parseColor("#475569"))
        }

        urlEditText = EditText(this).apply {
            hint = "http://127.0.0.1:3000"
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.parseColor("#F8FAFC"))
            textSize = 14f
            background = inputBg
            val p12 = (12 * resources.displayMetrics.density).toInt()
            setPadding(p12, p12, p12, p12)
            setText(getLastUsedUrl())
        }
        content.addView(urlEditText)

        // Token Label & Input
        val tokenLabel = TextView(this).apply {
            text = "Pairing Token (printed in server terminal):"
            setTextColor(Color.parseColor("#CBD5E1"))
            textSize = 12f
            val mt = (14 * resources.displayMetrics.density).toInt()
            setPadding(0, mt, 0, 6)
        }
        content.addView(tokenLabel)

        val tokenBg = GradientDrawable().apply {
            setColor(Color.parseColor("#1E293B"))
            cornerRadius = 12f
            setStroke(2, Color.parseColor("#475569"))
        }

        tokenEditText = EditText(this).apply {
            hint = "e.g. 41d669cb"
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.parseColor("#F8FAFC"))
            textSize = 14f
            background = tokenBg
            val p12 = (12 * resources.displayMetrics.density).toInt()
            setPadding(p12, p12, p12, p12)
            setText(getLastUsedToken())
        }
        content.addView(tokenEditText)

        // Connect Button
        val connectBtn = Button(this).apply {
            text = "Connect"
            setTextColor(Color.WHITE)
            textSize = 15f
            setTypeface(Typeface.DEFAULT_BOLD)
            val btnBg = GradientDrawable().apply {
                setColor(Color.parseColor("#0EA5E9")) // sky-500
                cornerRadius = 14f
            }
            background = btnBg
            val mt = (16 * resources.displayMetrics.density).toInt()
            val p14 = (14 * resources.displayMetrics.density).toInt()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, mt, 0, 0)
            }
            setPadding(p14, p14, p14, p14)
            setOnClickListener {
                var url = urlEditText.text.toString().trim()
                if (url.isEmpty()) url = "http://127.0.0.1:3000"
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "http://$url"
                }
                val token = tokenEditText.text.toString().trim()
                launchDevSession(url, token)
            }
        }
        content.addView(connectBtn)

        // Recent Connections Section
        val recentsLabel = TextView(this).apply {
            text = "Recent Servers"
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(Typeface.DEFAULT_BOLD)
            val mt = (32 * resources.displayMetrics.density).toInt()
            val mb = (10 * resources.displayMetrics.density).toInt()
            setPadding(0, mt, 0, mb)
        }
        content.addView(recentsLabel)

        recentsContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        content.addView(recentsContainer)

        renderRecents()

        rootScroll.addView(content)
        setContentView(rootScroll)
    }

    private fun renderRecents() {
        recentsContainer.removeAllViews()
        val recents = getRecents()

        if (recents.length() == 0) {
            val empty = TextView(this).apply {
                text = "No recent connections yet."
                setTextColor(Color.parseColor("#64748B"))
                textSize = 13f
            }
            recentsContainer.addView(empty)
            return
        }

        for (i in 0 until recents.length()) {
            val item = recents.getJSONObject(i)
            val serverUrl = item.optString("url", "")
            val token = item.optString("token", "")

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                val p = (12 * resources.displayMetrics.density).toInt()
                setPadding(p, p, p, p)
                val cardBg = GradientDrawable().apply {
                    setColor(Color.parseColor("#1E293B"))
                    cornerRadius = 10f
                }
                background = cardBg
                val mb = (8 * resources.displayMetrics.density).toInt()
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, mb)
                }
                isClickable = true
                setOnClickListener {
                    launchDevSession(serverUrl, token)
                }
            }

            val infoLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val urlText = TextView(this).apply {
                text = serverUrl
                setTextColor(Color.parseColor("#38BDF8"))
                textSize = 14f
                setTypeface(Typeface.DEFAULT_BOLD)
            }
            infoLayout.addView(urlText)

            val tokenText = TextView(this).apply {
                text = if (token.isNotEmpty()) "Token: $token" else "No token"
                setTextColor(Color.parseColor("#94A3B8"))
                textSize = 12f
            }
            infoLayout.addView(tokenText)

            row.addView(infoLayout)

            // Remove button
            val removeBtn = TextView(this).apply {
                text = "✕"
                setTextColor(Color.parseColor("#EF4444"))
                textSize = 16f
                setPadding(16, 8, 16, 8)
                setOnClickListener {
                    removeRecent(i)
                    renderRecents()
                }
            }
            row.addView(removeBtn)

            recentsContainer.addView(row)
        }
    }

    private fun launchDevSession(serverUrl: String, token: String) {
        saveRecent(serverUrl, token)
        val intent = Intent(this, DevLiquidActivity::class.java).apply {
            putExtra("SERVER_URL", serverUrl)
            putExtra("TOKEN", token)
        }
        startActivity(intent)
    }

    private fun saveRecent(url: String, token: String) {
        val prefs = getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("last_url", url).putString("last_token", token).apply()

        val list = getRecents()
        val newList = JSONArray()
        val entry = JSONObject().apply {
            put("url", url)
            put("token", token)
            put("time", System.currentTimeMillis())
        }
        newList.put(entry)

        for (i in 0 until list.length()) {
            val item = list.getJSONObject(i)
            if (item.optString("url") != url && newList.length() < 5) {
                newList.put(item)
            }
        }
        prefs.edit().putString("recents", newList.toString()).apply()
    }

    private fun removeRecent(index: Int) {
        val list = getRecents()
        val newList = JSONArray()
        for (i in 0 until list.length()) {
            if (i != index) newList.put(list.getJSONObject(i))
        }
        val prefs = getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("recents", newList.toString()).apply()
    }

    private fun getRecents(): JSONArray {
        val prefs = getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
        val raw = prefs.getString("recents", null) ?: return JSONArray()
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    }

    private fun getLastUsedUrl(): String {
        return getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
            .getString("last_url", "http://127.0.0.1:3000") ?: "http://127.0.0.1:3000"
    }

    private fun getLastUsedToken(): String {
        return getSharedPreferences("liquid_dev_prefs", Context.MODE_PRIVATE)
            .getString("last_token", "") ?: ""
    }
}
