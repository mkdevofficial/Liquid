package com.liquid.runtime

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.AttributeSet
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewOutlineProvider
import android.widget.TextView

open class LiquidTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : TextView(context, attrs, defStyleAttr) {

    init {
        includeFontPadding = false
        setTextColor(Color.parseColor("#1e293b"))
    }

    fun setCustomFontSize(sizeSp: Float) {
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
    }

    fun setCustomFontWeight(weight: String) {
        val isBold = weight.equals("bold", ignoreCase = true) ||
                weight.toIntOrNull()?.let { it >= 600 } == true
        val isItalic = typeface?.isItalic == true
        val styleFlag = when {
            isBold && isItalic -> Typeface.BOLD_ITALIC
            isBold -> Typeface.BOLD
            isItalic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        typeface = Typeface.create(typeface ?: Typeface.DEFAULT, styleFlag)
    }

    fun setCustomFontStyle(style: String) {
        val isItalic = style.equals("italic", ignoreCase = true) || style.equals("oblique", ignoreCase = true)
        val isBold = typeface?.isBold == true
        val styleFlag = when {
            isBold && isItalic -> Typeface.BOLD_ITALIC
            isBold -> Typeface.BOLD
            isItalic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        typeface = Typeface.create(typeface ?: Typeface.DEFAULT, styleFlag)
    }

    fun setCustomFontFamily(family: String) {
        val base = when (family.lowercase()) {
            "serif" -> Typeface.SERIF
            "monospace" -> Typeface.MONOSPACE
            else -> Typeface.SANS_SERIF
        }
        val isBold = typeface?.isBold == true
        val isItalic = typeface?.isItalic == true
        val styleFlag = when {
            isBold && isItalic -> Typeface.BOLD_ITALIC
            isBold -> Typeface.BOLD
            isItalic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        typeface = Typeface.create(base, styleFlag)
    }

    fun setCustomTextAlign(align: String) {
        gravity = when (align.lowercase()) {
            "center" -> Gravity.CENTER_HORIZONTAL
            "right", "end" -> Gravity.END
            else -> Gravity.START
        }
    }

    fun setTextDecoration(decoration: String) {
        val d = decoration.lowercase()
        when {
            d.contains("line-through") -> {
                paintFlags = (paintFlags and Paint.UNDERLINE_TEXT_FLAG.inv()) or Paint.STRIKE_THRU_TEXT_FLAG
            }
            d.contains("underline") -> {
                paintFlags = (paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()) or Paint.UNDERLINE_TEXT_FLAG
            }
            d.contains("none") -> {
                paintFlags = paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv() and Paint.UNDERLINE_TEXT_FLAG.inv()
            }
        }
    }

    fun setTextOverflow(overflow: String) {
        if (overflow.lowercase() == "ellipsis") {
            ellipsize = TextUtils.TruncateAt.END
            maxLines = 1
        } else {
            ellipsize = null
            maxLines = Int.MAX_VALUE
        }
    }

    fun applyCustomStyle(
        backgroundColor: Int,
        cornerRadiusPx: Float,
        borderWidthPx: Float,
        borderColor: Int
    ) {
        if (backgroundColor == 0 && cornerRadiusPx <= 0f && borderWidthPx <= 0f) return

        val drawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            if (cornerRadiusPx > 0f) {
                cornerRadius = cornerRadiusPx
            }
            if (borderWidthPx > 0f && borderColor != 0) {
                setStroke(borderWidthPx.toInt(), borderColor)
            }
            if (backgroundColor != 0) {
                setColor(backgroundColor)
            }
        }
        background = drawable

        if (cornerRadiusPx > 0f) {
            clipToOutline = true
            outlineProvider = ViewOutlineProvider.BACKGROUND
        }
    }
}
