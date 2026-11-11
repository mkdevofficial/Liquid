package com.liquid.dev

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class DevErrorOverlay(
    context: Context,
    private val onReloadRequest: () -> Unit,
    private val onDismissRequest: () -> Unit
) : LinearLayout(context) {

    private val titleView: TextView
    private val fileView: TextView
    private val messageView: TextView
    private val frameView: TextView

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#E60F172A")) // 90% slate-900
        val p = (20 * resources.displayMetrics.density).toInt()
        setPadding(p, p * 2, p, p)
        visibility = View.GONE
        isClickable = true
        isFocusable = true

        val card = LinearLayout(context).apply {
            orientation = VERTICAL
            val cardP = (16 * resources.displayMetrics.density).toInt()
            setPadding(cardP, cardP, cardP, cardP)
            setBackgroundColor(Color.parseColor("#1E293B")) // slate-800
        }

        // Title row
        titleView = TextView(context).apply {
            text = "🫟 Liquid Error"
            setTextColor(Color.parseColor("#EF4444")) // red-500
            textSize = 18f
            setTypeface(Typeface.DEFAULT_BOLD)
            val mb = (8 * resources.displayMetrics.density).toInt()
            setPadding(0, 0, 0, mb)
        }
        card.addView(titleView)

        // File and position
        fileView = TextView(context).apply {
            text = ""
            setTextColor(Color.parseColor("#94A3B8")) // slate-400
            textSize = 13f
            val mb = (6 * resources.displayMetrics.density).toInt()
            setPadding(0, 0, 0, mb)
        }
        card.addView(fileView)

        // Message
        messageView = TextView(context).apply {
            text = ""
            setTextColor(Color.parseColor("#F87171")) // red-400
            textSize = 14f
            setTypeface(Typeface.DEFAULT_BOLD)
            val mb = (12 * resources.displayMetrics.density).toInt()
            setPadding(0, 0, 0, mb)
        }
        card.addView(messageView)

        // Code Frame (Horizontal + Vertical scrollable monospace)
        val hScroll = HorizontalScrollView(context)
        frameView = TextView(context).apply {
            typeface = Typeface.MONOSPACE
            textSize = 12f
            setTextColor(Color.parseColor("#E2E8F0")) // slate-200
            setBackgroundColor(Color.parseColor("#0F172A")) // slate-900
            val codeP = (10 * resources.displayMetrics.density).toInt()
            setPadding(codeP, codeP, codeP, codeP)
        }
        hScroll.addView(frameView)

        val frameScroll = ScrollView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
        }
        frameScroll.addView(hScroll)
        card.addView(frameScroll)

        // Actions row
        val btnRow = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.END
            val mt = (12 * resources.displayMetrics.density).toInt()
            setPadding(0, mt, 0, 0)
        }

        val dismissBtn = Button(context).apply {
            text = "Dismiss"
            setTextColor(Color.parseColor("#E2E8F0"))
            setBackgroundColor(Color.parseColor("#475569"))
            setOnClickListener {
                visibility = View.GONE
                onDismissRequest()
            }
        }
        btnRow.addView(dismissBtn)

        val spacer = View(context).apply {
            layoutParams = LayoutParams((12 * resources.displayMetrics.density).toInt(), 1)
        }
        btnRow.addView(spacer)

        val reloadBtn = Button(context).apply {
            text = "Reload"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#0284C7")) // sky-600
            setOnClickListener {
                visibility = View.GONE
                onReloadRequest()
            }
        }
        btnRow.addView(reloadBtn)

        card.addView(btnRow)

        val cardParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        addView(card, cardParams)
    }

    fun showError(title: String, file: String, line: Int, column: Int, message: String, frame: String) {
        titleView.text = "🫟 $title"
        fileView.text = if (file.isNotEmpty()) "File: $file:$line:$column" else ""
        messageView.text = message
        frameView.text = frame.ifEmpty { message }
        visibility = View.VISIBLE
        bringToFront()
    }

    fun hideError() {
        visibility = View.GONE
    }
}
