package com.liquid.runtime

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.text.Editable
import android.text.TextWatcher
import android.util.AttributeSet
import android.view.KeyEvent
import android.view.ViewOutlineProvider
import android.view.inputmethod.EditorInfo
import android.widget.EditText

open class LiquidEditText @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : EditText(context, attrs, defStyleAttr) {

    private var isUpdatingFromJs = false
    var onInputChanged: ((String) -> Unit)? = null
    var onEnterPressed: (() -> Unit)? = null

    init {
        // Strip Android default underline
        background = null
        minHeight = 0
        minimumHeight = 0
        includeFontPadding = false
        setHintTextColor(Color.parseColor("#94a3b8"))
        setTextColor(Color.parseColor("#1e293b"))

        addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                if (!isUpdatingFromJs) {
                    onInputChanged?.invoke(s?.toString() ?: "")
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        setOnEditorActionListener { _, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_DONE ||
                actionId == EditorInfo.IME_ACTION_GO ||
                actionId == EditorInfo.IME_ACTION_SEND ||
                (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            ) {
                onEnterPressed?.invoke()
                true
            } else false
        }

        setOnKeyListener { _, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN) {
                onEnterPressed?.invoke()
                true
            } else false
        }
    }

    fun setTextFromJs(newText: String) {
        if (text?.toString() != newText) {
            isUpdatingFromJs = true
            setText(newText)
            setSelection(newText.length)
            isUpdatingFromJs = false
        }
    }

    fun applyCustomStyle(
        backgroundColor: Int,
        cornerRadiusPx: Float,
        borderWidthPx: Float,
        borderColor: Int,
        focusBorderColor: Int = Color.parseColor("#0284c7")
    ) {
        val normalDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            if (cornerRadiusPx > 0f) {
                cornerRadius = cornerRadiusPx
            }
            if (borderWidthPx > 0f && borderColor != 0) {
                setStroke(borderWidthPx.toInt(), borderColor)
            }
            setColor(if (backgroundColor != 0) backgroundColor else Color.WHITE)
        }

        val focusDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            if (cornerRadiusPx > 0f) {
                cornerRadius = cornerRadiusPx
            }
            val strokeW = if (borderWidthPx > 0f) (borderWidthPx * 1.5f).toInt() else 2
            setStroke(strokeW, focusBorderColor)
            setColor(if (backgroundColor != 0) backgroundColor else Color.WHITE)
        }

        val states = StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_focused), focusDrawable)
            addState(intArrayOf(), normalDrawable)
        }
        background = states

        if (cornerRadiusPx > 0f) {
            clipToOutline = true
            outlineProvider = ViewOutlineProvider.BACKGROUND
        }
    }
}
