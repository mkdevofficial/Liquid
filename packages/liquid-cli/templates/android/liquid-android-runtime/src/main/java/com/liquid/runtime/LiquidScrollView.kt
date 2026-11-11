package com.liquid.runtime

import android.content.Context
import android.util.AttributeSet
import android.widget.ScrollView

open class LiquidScrollView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : ScrollView(context, attrs, defStyleAttr) {

    init {
        isFillViewport = true
        isVerticalScrollBarEnabled = false
    }
}
