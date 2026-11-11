package com.liquid.runtime

import android.content.Context
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.widget.ImageView
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

open class LiquidImageView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : ImageView(context, attrs, defStyleAttr) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    init {
        scaleType = ScaleType.FIT_CENTER
    }

    fun setSource(src: String) {
        if (src.isBlank()) {
            setImageDrawable(null)
            return
        }

        if (src.startsWith("http://") || src.startsWith("https://")) {
            executor.execute {
                try {
                    val url = URL(src)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.doInput = true
                    conn.connect()
                    val bitmap = BitmapFactory.decodeStream(conn.inputStream)
                    mainHandler.post { setImageBitmap(bitmap) }
                } catch (e: Exception) {
                    // Ignore or fallback
                }
            }
        } else if (src.startsWith("/") || src.startsWith("file://")) {
            val path = src.removePrefix("file://")
            val file = File(path)
            if (file.exists()) {
                val bitmap = BitmapFactory.decodeFile(file.absolutePath)
                setImageBitmap(bitmap)
            }
        } else {
            // Load from assets
            try {
                val isStream = context.assets.open(src)
                val bitmap = BitmapFactory.decodeStream(isStream)
                setImageBitmap(bitmap)
                isStream.close()
            } catch (e: Exception) {
                // Not in assets
            }
        }
    }
}
