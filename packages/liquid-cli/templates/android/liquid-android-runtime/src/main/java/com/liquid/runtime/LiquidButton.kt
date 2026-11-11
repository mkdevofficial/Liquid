package com.liquid.runtime

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Build
import android.util.AttributeSet
import android.view.Gravity
import android.view.ViewOutlineProvider
import android.widget.Button

open class LiquidButton @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : Button(context, attrs, defStyleAttr) {

    init {
        // Strip Android default button background and stateListAnimator
        stateListAnimator = null
        minHeight = 0
        minWidth = 0
        minimumHeight = 0
        minimumWidth = 0
        includeFontPadding = false
        gravity = Gravity.CENTER
        isClickable = true
        isFocusable = true
    }

    fun applyCustomStyle(
        backgroundColor: Int,
        cornerRadiusPx: Float,
        borderWidthPx: Float,
        borderColor: Int,
        pressedColor: Int? = null
    ) {
        val normalDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            if (cornerRadiusPx > 0f) {
                cornerRadius = cornerRadiusPx
            }
            if (borderWidthPx > 0f && borderColor != 0) {
                setStroke(borderWidthPx.toInt(), borderColor)
            }
            setColor(backgroundColor)
        }

        val pressedBg = pressedColor ?: darkenColor(backgroundColor)
        val pressedDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            if (cornerRadiusPx > 0f) {
                cornerRadius = cornerRadiusPx
            }
            if (borderWidthPx > 0f && borderColor != 0) {
                setStroke(borderWidthPx.toInt(), borderColor)
            }
            setColor(pressedBg)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val rippleColor = ColorStateList.valueOf(pressedBg)
            val ripple = RippleDrawable(rippleColor, normalDrawable, pressedDrawable)
            background = ripple
        } else {
            val states = StateListDrawable().apply {
                addState(intArrayOf(android.R.attr.state_pressed), pressedDrawable)
                addState(intArrayOf(), normalDrawable)
            }
            background = states
        }

        if (cornerRadiusPx > 0f) {
            clipToOutline = true
            outlineProvider = ViewOutlineProvider.BACKGROUND
        }
    }

    private fun darkenColor(color: Int): Int {
        if (color == 0 || color == Color.TRANSPARENT) return Color.parseColor("#33000000")
        val hsv = FloatArray(3)
        Color.colorToHSV(color, hsv)
        hsv[2] = (hsv[2] * 0.85f).coerceIn(0f, 1f)
        return Color.HSVToColor(Color.alpha(color), hsv)
    }
}
