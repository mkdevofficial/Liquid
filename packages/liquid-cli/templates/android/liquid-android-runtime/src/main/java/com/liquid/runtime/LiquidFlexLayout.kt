package com.liquid.runtime

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.ViewGroup
import kotlin.math.max
import kotlin.math.min

enum class FlexDirection { ROW, COLUMN, ROW_REVERSE, COLUMN_REVERSE }
enum class FlexWrap { NOWRAP, WRAP, WRAP_REVERSE }
enum class JustifyContent { FLEX_START, CENTER, FLEX_END, SPACE_BETWEEN, SPACE_AROUND, SPACE_EVENLY }
enum class AlignItems { STRETCH, FLEX_START, CENTER, FLEX_END, BASELINE }
enum class AlignSelf { AUTO, STRETCH, FLEX_START, CENTER, FLEX_END, BASELINE }

/**
 * Lightweight, high-performance Flexbox ViewGroup implemented in pure Kotlin.
 * Zero external dependencies (no Yoga, no AndroidX Flexbox).
 */
open class LiquidFlexLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : ViewGroup(context, attrs, defStyleAttr) {

    var flexDirection: FlexDirection = FlexDirection.COLUMN
        set(value) { field = value; requestLayout() }

    var flexWrap: FlexWrap = FlexWrap.NOWRAP
        set(value) { field = value; requestLayout() }

    var justifyContent: JustifyContent = JustifyContent.FLEX_START
        set(value) { field = value; requestLayout() }

    var alignItems: AlignItems = AlignItems.STRETCH
        set(value) { field = value; requestLayout() }

    var rowGapPx: Int = 0
        set(value) { field = value; requestLayout() }

    var columnGapPx: Int = 0
        set(value) { field = value; requestLayout() }

    var overflowHidden: Boolean = false
        set(value) { field = value; invalidate() }

    var cornerRadiusPx: Float = 0f
        set(value) {
            field = value
            if (value > 0f) {
                clipToOutline = true
                outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            }
            invalidate()
        }

    var borderWidthPx: Float = 0f
        set(value) { field = value; invalidate() }

    var borderColor: Int = 0
        set(value) { field = value; invalidate() }

    var borderBottomWidthPx: Float = 0f
        set(value) { field = value; invalidate() }

    var borderBottomColor: Int = 0
        set(value) { field = value; invalidate() }

    var borderTopWidthPx: Float = 0f
        set(value) { field = value; invalidate() }

    var borderTopColor: Int = 0
        set(value) { field = value; invalidate() }

    var borderLeftWidthPx: Float = 0f
        set(value) { field = value; invalidate() }

    var borderLeftColor: Int = 0
        set(value) { field = value; invalidate() }

    var borderRightWidthPx: Float = 0f
        set(value) { field = value; invalidate() }

    var borderRightColor: Int = 0
        set(value) { field = value; invalidate() }

    var customBackgroundColor: Int = 0
        set(value) { field = value; invalidate() }

    private val clipPath = Path()
    private val boundsRect = RectF()
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    class LayoutParams : ViewGroup.MarginLayoutParams {
        var flexGrow: Float = 0f
        var flexShrink: Float = 1f
        var flexBasisPx: Int = -1
        var alignSelf: AlignSelf = AlignSelf.AUTO
        var isAbsolute: Boolean = false
        var isMarginLeftAuto: Boolean = false
        var isMarginRightAuto: Boolean = false
        var isMarginTopAuto: Boolean = false
        var isMarginBottomAuto: Boolean = false
        var topPx: Int? = null
        var rightPx: Int? = null
        var bottomPx: Int? = null
        var leftPx: Int? = null
        var minWidthPx: Int = 0
        var maxWidthPx: Int = Int.MAX_VALUE
        var minHeightPx: Int = 0
        var maxHeightPx: Int = Int.MAX_VALUE

        constructor(width: Int, height: Int) : super(width, height)
        constructor(source: ViewGroup.LayoutParams) : super(source)
        constructor(source: ViewGroup.MarginLayoutParams) : super(source)
    }

    override fun generateDefaultLayoutParams(): LayoutParams {
        return LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    override fun generateLayoutParams(p: ViewGroup.LayoutParams): ViewGroup.LayoutParams {
        return LayoutParams(p)
    }

    override fun checkLayoutParams(p: ViewGroup.LayoutParams?): Boolean {
        return p is LayoutParams
    }

    private data class FlexItem(
        val view: View,
        val params: LayoutParams,
        var mainSize: Int = 0,
        var crossSize: Int = 0
    )

    private data class FlexLine(
        val items: MutableList<FlexItem> = mutableListOf(),
        var mainSize: Int = 0,
        var crossSize: Int = 0,
        var totalGrow: Float = 0f,
        var totalShrink: Float = 0f
    )

    private val lines = mutableListOf<FlexLine>()

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
        val widthMode = MeasureSpec.getMode(widthMeasureSpec)
        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
        val heightMode = MeasureSpec.getMode(heightMeasureSpec)

        val paddingHorizontal = paddingLeft + paddingRight
        val paddingVertical = paddingTop + paddingBottom

        val isRow = flexDirection == FlexDirection.ROW || flexDirection == FlexDirection.ROW_REVERSE
        val mainGap = if (isRow) columnGapPx else rowGapPx
        val crossGap = if (isRow) rowGapPx else columnGapPx

        val maxAvailableMain = if (isRow) {
            if (widthMode != MeasureSpec.UNSPECIFIED) widthSize - paddingHorizontal else Int.MAX_VALUE
        } else {
            if (heightMode != MeasureSpec.UNSPECIFIED) heightSize - paddingVertical else Int.MAX_VALUE
        }

        val availableCross = if (isRow) {
            if (heightMode == MeasureSpec.EXACTLY) heightSize - paddingVertical else 0
        } else {
            if (widthMode == MeasureSpec.EXACTLY) widthSize - paddingHorizontal else 0
        }

        lines.clear()
        var currentLine = FlexLine()

        val childCount = childCount
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (child.visibility == View.GONE) continue

            val lp = child.layoutParams as LayoutParams
            if (lp.isAbsolute) {
                // Measure absolute child independently
                val childWidthSpec = getChildMeasureSpec(widthMeasureSpec, paddingHorizontal, lp.width)
                val childHeightSpec = getChildMeasureSpec(heightMeasureSpec, paddingVertical, lp.height)
                child.measure(childWidthSpec, childHeightSpec)
                continue
            }

            // Measure child with initial specs
            val childWidthSpec = getChildMeasureSpec(widthMeasureSpec, paddingHorizontal, lp.width)
            val childHeightSpec = getChildMeasureSpec(heightMeasureSpec, paddingVertical, lp.height)
            child.measure(childWidthSpec, childHeightSpec)

            val childMain = if (isRow) {
                child.measuredWidth + lp.leftMargin + lp.rightMargin
            } else {
                child.measuredHeight + lp.topMargin + lp.bottomMargin
            }

            val childCross = if (isRow) {
                child.measuredHeight + lp.topMargin + lp.bottomMargin
            } else {
                child.measuredWidth + lp.leftMargin + lp.rightMargin
            }

            val item = FlexItem(child, lp, childMain, childCross)

            // Check wrapping
            val neededMain = if (currentLine.items.isEmpty()) childMain else currentLine.mainSize + mainGap + childMain
            if (flexWrap != FlexWrap.NOWRAP && currentLine.items.isNotEmpty() && neededMain > maxAvailableMain) {
                lines.add(currentLine)
                currentLine = FlexLine()
            }

            if (currentLine.items.isNotEmpty()) {
                currentLine.mainSize += mainGap
            }
            currentLine.items.add(item)
            currentLine.mainSize += childMain
            currentLine.crossSize = max(currentLine.crossSize, childCross)
            currentLine.totalGrow += max(0f, lp.flexGrow)
            currentLine.totalShrink += max(0f, lp.flexShrink)
        }

        if (currentLine.items.isNotEmpty() || lines.isEmpty()) {
            lines.add(currentLine)
        }

        // For single-line or column layouts with known cross dimension, ensure crossSize spans available cross
        if (!isRow && availableCross > 0) {
            for (line in lines) {
                line.crossSize = max(line.crossSize, availableCross)
            }
        }

        // Flex grow / shrink distribution per line
        for (line in lines) {
            val availableMain = maxAvailableMain
            if (availableMain < Int.MAX_VALUE) {
                val delta = availableMain - line.mainSize
                if (delta > 0 && line.totalGrow > 0f) {
                    // Distribute positive free space
                    for (item in line.items) {
                        if (item.params.flexGrow > 0f) {
                            val extra = (delta * (item.params.flexGrow / line.totalGrow)).toInt()
                            item.mainSize += extra
                            remeasureItem(item, isRow, widthMeasureSpec, heightMeasureSpec)
                            line.crossSize = max(line.crossSize, item.crossSize)
                        }
                    }
                    line.mainSize = availableMain
                } else if (delta < 0 && line.totalShrink > 0f) {
                    // Absorb negative overflow
                    val shrinkTotal = -delta
                    for (item in line.items) {
                        if (item.params.flexShrink > 0f) {
                            val shrinkAmount = (shrinkTotal * (item.params.flexShrink / line.totalShrink)).toInt()
                            item.mainSize = max(0, item.mainSize - shrinkAmount)
                            remeasureItem(item, isRow, widthMeasureSpec, heightMeasureSpec)
                        }
                    }
                    line.mainSize = availableMain
                }
            }

            // Remeasure cross-axis for stretch items
            for (item in line.items) {
                val lp = item.params
                val effectiveAlign = if (lp.alignSelf != AlignSelf.AUTO) {
                    when (lp.alignSelf) {
                        AlignSelf.FLEX_START -> AlignItems.FLEX_START
                        AlignSelf.CENTER -> AlignItems.CENTER
                        AlignSelf.FLEX_END -> AlignItems.FLEX_END
                        AlignSelf.STRETCH -> AlignItems.STRETCH
                        else -> alignItems
                    }
                } else alignItems

                if (effectiveAlign == AlignItems.STRETCH) {
                    if (isRow) {
                        val targetH = max(0, line.crossSize - lp.topMargin - lp.bottomMargin)
                        if (item.view.measuredHeight != targetH) {
                            val wSpec = MeasureSpec.makeMeasureSpec(item.view.measuredWidth, MeasureSpec.EXACTLY)
                            val hSpec = MeasureSpec.makeMeasureSpec(targetH, MeasureSpec.EXACTLY)
                            item.view.measure(wSpec, hSpec)
                        }
                    } else {
                        val targetW = max(0, line.crossSize - lp.leftMargin - lp.rightMargin)
                        if (item.view.measuredWidth != targetW) {
                            val wSpec = MeasureSpec.makeMeasureSpec(targetW, MeasureSpec.EXACTLY)
                            val hSpec = MeasureSpec.makeMeasureSpec(item.view.measuredHeight, MeasureSpec.EXACTLY)
                            item.view.measure(wSpec, hSpec)
                        }
                    }
                }
            }
        }

        // Calculate total layout dimensions
        var totalMain = 0
        var totalCross = 0
        for ((idx, line) in lines.withIndex()) {
            totalMain = max(totalMain, line.mainSize)
            totalCross += line.crossSize
            if (idx > 0) totalCross += crossGap
        }

        val measuredW = if (isRow) {
            resolveDimension(widthMode, widthSize, totalMain + paddingHorizontal)
        } else {
            resolveDimension(widthMode, widthSize, totalCross + paddingHorizontal)
        }

        val measuredH = if (isRow) {
            resolveDimension(heightMode, heightSize, totalCross + paddingVertical)
        } else {
            resolveDimension(heightMode, heightSize, totalMain + paddingVertical)
        }

        setMeasuredDimension(measuredW, measuredH)
    }

    private fun remeasureItem(item: FlexItem, isRow: Boolean, widthSpec: Int, heightSpec: Int) {
        val lp = item.params
        val wSpec: Int
        val hSpec: Int
        if (isRow) {
            val targetW = max(lp.minWidthPx, min(lp.maxWidthPx, item.mainSize - lp.leftMargin - lp.rightMargin))
            wSpec = MeasureSpec.makeMeasureSpec(targetW, MeasureSpec.EXACTLY)
            hSpec = getChildMeasureSpec(heightSpec, paddingTop + paddingBottom, lp.height)
        } else {
            val targetH = max(lp.minHeightPx, min(lp.maxHeightPx, item.mainSize - lp.topMargin - lp.bottomMargin))
            hSpec = MeasureSpec.makeMeasureSpec(targetH, MeasureSpec.EXACTLY)
            wSpec = getChildMeasureSpec(widthSpec, paddingLeft + paddingRight, lp.width)
        }
        item.view.measure(wSpec, hSpec)
        item.crossSize = if (isRow) {
            item.view.measuredHeight + lp.topMargin + lp.bottomMargin
        } else {
            item.view.measuredWidth + lp.leftMargin + lp.rightMargin
        }
    }

    private fun resolveDimension(mode: Int, specSize: Int, contentSize: Int): Int {
        return when (mode) {
            MeasureSpec.EXACTLY -> specSize
            MeasureSpec.AT_MOST -> min(specSize, contentSize)
            else -> contentSize
        }
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        val parentWidth = r - l
        val parentHeight = b - t
        val isRow = flexDirection == FlexDirection.ROW || flexDirection == FlexDirection.ROW_REVERSE
        val isReverse = flexDirection == FlexDirection.ROW_REVERSE || flexDirection == FlexDirection.COLUMN_REVERSE
        val mainGap = if (isRow) columnGapPx else rowGapPx
        val crossGap = if (isRow) rowGapPx else columnGapPx

        var crossOffset = if (isRow) paddingTop else paddingLeft

        for (line in lines) {
            val availableMain = (if (isRow) parentWidth - paddingLeft - paddingRight else parentHeight - paddingTop - paddingBottom)
            val freeSpace = max(0, availableMain - line.mainSize)

            // Auto margin distribution on main axis
            val autoMarginCount = if (isRow) {
                line.items.sumOf { (if (it.params.isMarginLeftAuto) 1 else 0) + (if (it.params.isMarginRightAuto) 1 else 0) }
            } else {
                line.items.sumOf { (if (it.params.isMarginTopAuto) 1 else 0) + (if (it.params.isMarginBottomAuto) 1 else 0) }
            }

            val autoMarginExtra = if (autoMarginCount > 0) freeSpace / autoMarginCount else 0
            val (startOffset, itemSpacing) = if (autoMarginCount > 0) Pair(0, 0) else computeJustifyOffsets(justifyContent, freeSpace, line.items.size)

            val isRtl = layoutDirection == View.LAYOUT_DIRECTION_RTL
            val isRowRtl = (isRow && isRtl && !isReverse) || (isRow && !isRtl && isReverse)

            var currentMain = if (isRow) {
                if (isRowRtl) width - paddingRight - startOffset else paddingLeft + startOffset
            } else {
                paddingTop + startOffset
            }

            val orderedItems = if (isReverse && !isRow) line.items.asReversed() else line.items

            for (item in orderedItems) {
                val child = item.view
                val lp = item.params

                val childW = child.measuredWidth
                val childH = child.measuredHeight

                val effectiveAlign = if (lp.alignSelf != AlignSelf.AUTO) {
                    when (lp.alignSelf) {
                        AlignSelf.FLEX_START -> AlignItems.FLEX_START
                        AlignSelf.CENTER -> AlignItems.CENTER
                        AlignSelf.FLEX_END -> AlignItems.FLEX_END
                        AlignSelf.STRETCH -> AlignItems.STRETCH
                        else -> alignItems
                    }
                } else alignItems

                if (isRow) {
                    val extraLeft = if (lp.isMarginLeftAuto) autoMarginExtra else 0
                    val extraRight = if (lp.isMarginRightAuto) autoMarginExtra else 0

                    val childLeft = if (isRowRtl) {
                        val childRight = currentMain - lp.rightMargin - extraRight
                        childRight - childW
                    } else {
                        currentMain + lp.leftMargin + extraLeft
                    }

                    // Cross axis alignment and auto margins (top/bottom)
                    val freeCross = max(0, line.crossSize - childH - lp.topMargin - lp.bottomMargin)
                    val childTop = when {
                        lp.isMarginTopAuto && lp.isMarginBottomAuto -> crossOffset + lp.topMargin + (freeCross / 2)
                        lp.isMarginTopAuto -> crossOffset + lp.topMargin + freeCross
                        lp.isMarginBottomAuto -> crossOffset + lp.topMargin
                        effectiveAlign == AlignItems.FLEX_START -> crossOffset + lp.topMargin
                        effectiveAlign == AlignItems.CENTER -> crossOffset + (line.crossSize - childH - lp.topMargin - lp.bottomMargin) / 2 + lp.topMargin
                        effectiveAlign == AlignItems.FLEX_END -> crossOffset + line.crossSize - childH - lp.bottomMargin
                        else -> crossOffset + lp.topMargin
                    }
                    val layoutH = if (effectiveAlign == AlignItems.STRETCH && !lp.isMarginTopAuto && !lp.isMarginBottomAuto) {
                        max(childH, line.crossSize - lp.topMargin - lp.bottomMargin)
                    } else childH
                    child.layout(childLeft, childTop, childLeft + childW, childTop + layoutH)

                    if (isRowRtl) {
                        currentMain -= (childW + lp.leftMargin + extraLeft + lp.rightMargin + extraRight + mainGap + itemSpacing)
                    } else {
                        currentMain += childW + lp.leftMargin + extraLeft + lp.rightMargin + extraRight + mainGap + itemSpacing
                    }
                } else {
                    val extraTop = if (lp.isMarginTopAuto) autoMarginExtra else 0
                    val extraBottom = if (lp.isMarginBottomAuto) autoMarginExtra else 0
                    val childTop = currentMain + lp.topMargin + extraTop

                    // Cross axis alignment and auto margins (left/right) in column layout
                    val freeCross = max(0, line.crossSize - childW - lp.leftMargin - lp.rightMargin)
                    val childLeft = when {
                        lp.isMarginLeftAuto && lp.isMarginRightAuto -> crossOffset + lp.leftMargin + (freeCross / 2)
                        lp.isMarginLeftAuto -> crossOffset + lp.leftMargin + freeCross
                        lp.isMarginRightAuto -> crossOffset + lp.leftMargin
                        isRtl -> {
                            when (effectiveAlign) {
                                AlignItems.FLEX_START -> crossOffset + line.crossSize - childW - lp.rightMargin
                                AlignItems.CENTER -> crossOffset + (line.crossSize - childW - lp.leftMargin - lp.rightMargin) / 2 + lp.leftMargin
                                AlignItems.FLEX_END -> crossOffset + lp.leftMargin
                                else -> crossOffset + line.crossSize - childW - lp.rightMargin
                            }
                        }
                        else -> {
                            when (effectiveAlign) {
                                AlignItems.FLEX_START -> crossOffset + lp.leftMargin
                                AlignItems.CENTER -> crossOffset + (line.crossSize - childW - lp.leftMargin - lp.rightMargin) / 2 + lp.leftMargin
                                AlignItems.FLEX_END -> crossOffset + line.crossSize - childW - lp.rightMargin
                                else -> crossOffset + lp.leftMargin
                            }
                        }
                    }
                    val layoutW = if (effectiveAlign == AlignItems.STRETCH && !lp.isMarginLeftAuto && !lp.isMarginRightAuto) {
                        max(childW, line.crossSize - lp.leftMargin - lp.rightMargin)
                    } else childW
                    child.layout(childLeft, childTop, childLeft + layoutW, childTop + childH)
                    currentMain += childH + lp.topMargin + extraTop + lp.bottomMargin + extraBottom + mainGap + itemSpacing
                }
            }

            crossOffset += line.crossSize + crossGap
        }

        // Layout absolute children
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            val lp = child.layoutParams as LayoutParams
            if (lp.isAbsolute && child.visibility != View.GONE) {
                val childW = child.measuredWidth
                val childH = child.measuredHeight

                val left = lp.leftPx ?: if (lp.rightPx != null) parentWidth - childW - lp.rightPx!! else paddingLeft
                val top = lp.topPx ?: if (lp.bottomPx != null) parentHeight - childH - lp.bottomPx!! else paddingTop
                child.layout(left, top, left + childW, top + childH)
            }
        }
    }

    private fun computeJustifyOffsets(justify: JustifyContent, freeSpace: Int, itemCount: Int): Pair<Int, Int> {
        if (itemCount <= 0 || freeSpace <= 0) return Pair(0, 0)
        return when (justify) {
            JustifyContent.FLEX_START -> Pair(0, 0)
            JustifyContent.CENTER -> Pair(freeSpace / 2, 0)
            JustifyContent.FLEX_END -> Pair(freeSpace, 0)
            JustifyContent.SPACE_BETWEEN -> {
                if (itemCount > 1) Pair(0, freeSpace / (itemCount - 1)) else Pair(0, 0)
            }
            JustifyContent.SPACE_AROUND -> {
                val space = freeSpace / itemCount
                Pair(space / 2, space)
            }
            JustifyContent.SPACE_EVENLY -> {
                val space = freeSpace / (itemCount + 1)
                Pair(space, space)
            }
        }
    }

    override fun dispatchDraw(canvas: Canvas) {
        boundsRect.set(0f, 0f, width.toFloat(), height.toFloat())

        // Draw background
        if (customBackgroundColor != 0) {
            backgroundPaint.color = customBackgroundColor
            if (cornerRadiusPx > 0f) {
                canvas.drawRoundRect(boundsRect, cornerRadiusPx, cornerRadiusPx, backgroundPaint)
            } else {
                canvas.drawRect(boundsRect, backgroundPaint)
            }
        }

        val saveCount = canvas.save()
        if (overflowHidden && cornerRadiusPx > 0f) {
            clipPath.reset()
            clipPath.addRoundRect(boundsRect, cornerRadiusPx, cornerRadiusPx, Path.Direction.CW)
            canvas.clipPath(clipPath)
        }

        super.dispatchDraw(canvas)
        canvas.restoreToCount(saveCount)

        // Draw 4-side border
        if (borderWidthPx > 0f && borderColor != 0) {
            borderPaint.strokeWidth = borderWidthPx
            borderPaint.color = borderColor
            val halfBorder = borderWidthPx / 2f
            val borderRect = RectF(halfBorder, halfBorder, width - halfBorder, height - halfBorder)
            if (cornerRadiusPx > 0f) {
                canvas.drawRoundRect(borderRect, cornerRadiusPx, cornerRadiusPx, borderPaint)
            } else {
                canvas.drawRect(borderRect, borderPaint)
            }
        }

        // Draw per-side borders (dividers)
        if (borderBottomWidthPx > 0f && borderBottomColor != 0) {
            borderPaint.strokeWidth = borderBottomWidthPx
            borderPaint.color = borderBottomColor
            val y = height - borderBottomWidthPx / 2f
            canvas.drawLine(0f, y, width.toFloat(), y, borderPaint)
        }
        if (borderTopWidthPx > 0f && borderTopColor != 0) {
            borderPaint.strokeWidth = borderTopWidthPx
            borderPaint.color = borderTopColor
            val y = borderTopWidthPx / 2f
            canvas.drawLine(0f, y, width.toFloat(), y, borderPaint)
        }
        if (borderLeftWidthPx > 0f && borderLeftColor != 0) {
            borderPaint.strokeWidth = borderLeftWidthPx
            borderPaint.color = borderLeftColor
            val x = borderLeftWidthPx / 2f
            canvas.drawLine(x, 0f, x, height.toFloat(), borderPaint)
        }
        if (borderRightWidthPx > 0f && borderRightColor != 0) {
            borderPaint.strokeWidth = borderRightWidthPx
            borderPaint.color = borderRightColor
            val x = width - borderRightWidthPx / 2f
            canvas.drawLine(x, 0f, x, height.toFloat(), borderPaint)
        }
    }
}
