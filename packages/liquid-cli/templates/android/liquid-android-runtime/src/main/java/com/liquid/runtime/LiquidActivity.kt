package com.liquid.runtime

import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Date

open class LiquidActivity : Activity() {

    data class BuildStamp(
        val id: String = "unknown",
        val time: String = "",
        val mode: String = "debug",
        val inspect: Boolean = false,
        val stamp: Boolean = false
    )

    protected lateinit var rootContainer: LiquidFlexLayout
    protected lateinit var engine: LiquidEngine
    protected lateinit var bundleSource: BundleSource
    protected var debugInspector: LiquidDebugInspector? = null
    protected var currentBuildStamp: BuildStamp = BuildStamp()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Install debug crash handler to capture uncaught crashes to disk
        setupCrashHandler()

        currentBuildStamp = loadBuildStamp()

        rootContainer = LiquidFlexLayout(this).apply {
            flexDirection = FlexDirection.COLUMN
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            customBackgroundColor = android.graphics.Color.parseColor("#f1f5f9")
        }
        setContentView(rootContainer)

        // Handle window insets so content fills window but respects system bars
        window.decorView.setOnApplyWindowInsetsListener { _, insets ->
            val top = insets.systemWindowInsetTop
            val bottom = insets.systemWindowInsetBottom
            rootContainer.setPadding(0, top, 0, bottom)
            insets
        }

        val isDebug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        val shouldInspect = isDebug || currentBuildStamp.inspect

        // Write build stamp to /sdcard/liquid_build.txt so user/scripts can read it on phone
        try {
            val stampText = "Build ID: ${currentBuildStamp.id} | Mode: ${currentBuildStamp.mode} | Time: ${currentBuildStamp.time} | Inspect: ${currentBuildStamp.inspect}\n"
            File("/sdcard/liquid_build.txt").writeText(stampText)
        } catch (_: Exception) {}

        bundleSource = createBundleSource()
        engine = LiquidEngine(this, rootContainer, isDebug)
        engine.start(bundleSource)

        if (shouldInspect) {
            debugInspector = LiquidDebugInspector(rootContainer, engine.batchApplier, currentBuildStamp, port = 8765)
            debugInspector?.start()
        }

        // Discrete on-screen build stamp badge shown only in debug builds or when --stamp is passed
        val shouldShowStamp = isDebug || currentBuildStamp.stamp
        if (shouldShowStamp) {
            addBuildStampBadge(currentBuildStamp)
        }

        // Automated on-device verification check
        rootContainer.postDelayed({
            try {
                verifyOnDeviceInteractions()
            } catch (e: Exception) {
                Log.e("LiquidDbg", "Verification check error: ${e.message}")
            }
        }, 1200)
    }

    private fun loadBuildStamp(): BuildStamp {
        return try {
            assets.open("liquid_build.json").use { stream ->
                val json = org.json.JSONObject(stream.bufferedReader().readText())
                BuildStamp(
                    id = json.optString("id", "unknown"),
                    time = json.optString("time", ""),
                    mode = json.optString("mode", if ((applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) "debug" else "release"),
                    inspect = json.optBoolean("inspect", false),
                    stamp = json.optBoolean("stamp", false)
                )
            }
        } catch (_: Exception) {
            BuildStamp()
        }
    }

    private fun addBuildStampBadge(stamp: BuildStamp) {
        try {
            val content = findViewById<android.widget.FrameLayout>(android.R.id.content) ?: return
            val badge = android.widget.TextView(this).apply {
                text = "🫟 ${stamp.id} (${stamp.mode})"
                textSize = 9f
                setTextColor(android.graphics.Color.WHITE)
                val shape = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#aa0f172a"))
                    cornerRadius = 12f * resources.displayMetrics.density
                }
                background = shape
                val padH = (8 * resources.displayMetrics.density).toInt()
                val padV = (4 * resources.displayMetrics.density).toInt()
                setPadding(padH, padV, padH, padV)
                elevation = 50f
                isClickable = true
                setOnClickListener {
                    android.widget.Toast.makeText(
                        this@LiquidActivity,
                        "Liquid Build: ${stamp.id}\nMode: ${stamp.mode}\nTime: ${stamp.time}",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                }
                layoutParams = android.widget.FrameLayout.LayoutParams(
                    android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = android.view.Gravity.BOTTOM or android.view.Gravity.END
                    rightMargin = (12 * resources.displayMetrics.density).toInt()
                    bottomMargin = (12 * resources.displayMetrics.density).toInt()
                }
            }
            content.addView(badge)
        } catch (_: Exception) {}
    }

    private fun verifyOnDeviceInteractions() {
        val allViews = mutableListOf<android.view.View>()
        fun collectViews(v: android.view.View) {
            allViews.add(v)
            if (v is ViewGroup) {
                for (i in 0 until v.childCount) collectViews(v.getChildAt(i))
            }
        }
        collectViews(rootContainer)

        val plusBtn = allViews.filterIsInstance<android.widget.Button>().firstOrNull { it.text == "+" }
        val counterTv = allViews.filterIsInstance<android.widget.TextView>().firstOrNull {
            it.text.contains("Count:") || it.text == "0"
        }

        if (plusBtn != null && counterTv != null) {
            val beforeText = counterTv.text.toString()
            Log.i("LiquidDbg", "[ON-DEVICE TEST] Found '+' button and counter ('$beforeText'). Performing test tap...")

            plusBtn.performClick()

            rootContainer.postDelayed({
                val afterText = counterTv.text.toString()
                val success = afterText.contains("1") || afterText == "1"
                val report = "[ON-DEVICE TEST RESULT] Tap '+' changed counter from '$beforeText' to '$afterText' (Verified: $success)"
                Log.i("LiquidDbg", report)
                try {
                    val line = "[${Date()}] $report\n"
                    val dir = getExternalFilesDir(null) ?: filesDir
                    File(dir, "launch.log").appendText(line)
                    try {
                        File("/sdcard/liquid_launch.log").appendText(line)
                    } catch (_: Exception) {}
                } catch (_: Exception) {}
            }, 300)
        } else {
            Log.d("LiquidDbg", "[ON-DEVICE TEST] Views for self-test tap: plusBtn=$plusBtn, counterTv=$counterTv")
        }
    }

    private fun setupCrashHandler() {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            writeCrashLog(thread, throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    fun writeCrashLog(thread: Thread, throwable: Throwable) {
        try {
            val sw = StringWriter()
            throwable.printStackTrace(PrintWriter(sw))
            val logContent = "=== LIQUID CRASH REPORT ===\n" +
                "Date: ${Date()}\n" +
                "Thread: ${thread.name} (id: ${thread.id})\n" +
                "Exception: ${throwable.javaClass.name}: ${throwable.message}\n" +
                "Stacktrace:\n$sw\n"

            // 1. External files directory (e.g. /sdcard/Android/data/<package_id>/files/crash.log)
            getExternalFilesDir(null)?.let { dir ->
                File(dir, "crash.log").writeText(logContent)
            }
            // 2. Internal app files directory
            File(filesDir, "crash.log").writeText(logContent)

            // 3. Root of SDCard if accessible
            try {
                File("/sdcard/liquid_crash.log").writeText(logContent)
            } catch (_: Exception) {}

            Log.e("LiquidCrash", logContent)
        } catch (_: Exception) {}
    }

    open fun createBundleSource(): BundleSource {
        return AssetBundleSource(this)
    }

    fun reload() {
        engine.reload(bundleSource)
    }

    override fun onBackPressed() {
        // Dispatch navigation back event to Liquid Router in JS
        engine.dispatchEvent(1, "back", "{}")
        super.onBackPressed()
    }

    override fun onDestroy() {
        debugInspector?.stop()
        super.onDestroy()
        engine.destroy()
    }
}
