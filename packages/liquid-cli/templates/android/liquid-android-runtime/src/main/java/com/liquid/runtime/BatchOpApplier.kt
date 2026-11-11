package com.liquid.runtime

import android.content.Context
import android.graphics.Color
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import org.json.JSONArray
import org.json.JSONObject

class BatchOpApplier(
    private val context: Context,
    private val rootContainer: LiquidFlexLayout,
    private val eventDispatcher: (nodeId: Int, eventName: String, payloadJson: String) -> Unit
) {
    private val TAG = "LiquidDbg"
    val nodeViews = mutableMapOf<Int, View>()
    val nodeStyles = mutableMapOf<Int, JSONObject>()
    val nodeParents = mutableMapOf<Int, Int>()
    val parentChildTexts = mutableMapOf<Int, MutableList<Int>>()
    val textNodeParents = mutableMapOf<Int, Int>()
    val nodeTextValues = mutableMapOf<Int, String>()
    val nodeDirections = mutableMapOf<Int, String>()
    private val explicitDirections = mutableSetOf<Int>()
    private val density = context.resources.displayMetrics.density

    fun getView(nodeId: Int): View? = nodeViews[nodeId]
    fun getNodeId(view: View): Int? = nodeViews.entries.firstOrNull { it.value == view }?.key
    fun getNodeStyle(nodeId: Int): JSONObject? = nodeStyles[nodeId]

    init {
        // Node 1 is the root container
        nodeViews[1] = rootContainer
        rootContainer.customBackgroundColor = Color.parseColor("#f1f5f9")
    }

    fun applyBatch(batchJsonString: String) {
        val array = JSONArray(batchJsonString)
        val len = array.length()
        Log.d(TAG, "Applying UI batch of $len ops")
        for (i in 0 until len) {
            val op = array.getJSONArray(i)
            val opcode = op.getInt(0)
            when (opcode) {
                1 -> applyCreateNode(op)
                2 -> applyCreateText(op)
                3 -> applySetProp(op)
                4 -> applySetStyle(op)
                5 -> applySetText(op)
                6 -> applyInsert(op)
                7 -> applyRemove(op)
                8 -> applyListen(op)
                9 -> applyUnlisten(op)
            }
        }
    }

    private fun applyCreateNode(op: JSONArray) {
        val nodeId = op.getInt(1)
        val nativeType = op.getInt(2)
        val tagName = op.optString(3, "").lowercase()

        val view: View = when (nativeType) {
            1 -> LiquidFlexLayout(context)
            2 -> LiquidTextView(context)
            3 -> LiquidImageView(context)
            4 -> LiquidEditText(context).apply {
                isFocusable = true
                isFocusableInTouchMode = true
            }
            5 -> LiquidButton(context).apply {
                isClickable = true
                isFocusable = true
            }
            6 -> {
                val scroll = LiquidScrollView(context).apply {
                    isFillViewport = true
                    setBackgroundColor(Color.parseColor("#f1f5f9"))
                }
                val inner = LiquidFlexLayout(context).apply {
                    flexDirection = FlexDirection.COLUMN
                    layoutParams = LiquidFlexLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    customBackgroundColor = Color.parseColor("#f1f5f9")
                }
                scroll.addView(inner, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                scroll
            }
            else -> LiquidFlexLayout(context)
        }

        if (tagName == "a") {
            view.isClickable = true
            view.isFocusable = true
        }

        // Block elements (flex containers / scroll) default to MATCH_PARENT width in column layouts
        val isBlock = nativeType == 1 || nativeType == 6
        val lp = LiquidFlexLayout.LayoutParams(
            if (isBlock) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT,
            if (nativeType == 6) ViewGroup.LayoutParams.MATCH_PARENT else ViewGroup.LayoutParams.WRAP_CONTENT
        )

        // Paragraphs default to standard 1em bottom margin unless overridden by style
        if (tagName == "p") {
            lp.bottomMargin = (16 * density).toInt()
        }

        view.layoutParams = lp
        nodeViews[nodeId] = view
    }

    private fun applyCreateText(op: JSONArray) {
        val nodeId = op.getInt(1)
        val initialText = op.optString(2, "")
        nodeTextValues[nodeId] = initialText
        val tv = LiquidTextView(context).apply {
            text = initialText
            layoutParams = LiquidFlexLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        nodeViews[nodeId] = tv
    }

    private fun applySetProp(op: JSONArray) {
        val nodeId = op.getInt(1)
        val name = op.getString(2)
        val view = nodeViews[nodeId] ?: return

        when (name) {
            "value" -> {
                val valStr = op.optString(3, "")
                if (view is LiquidEditText) {
                    view.setTextFromJs(valStr)
                } else if (view is android.widget.TextView) {
                    view.text = valStr
                }
            }
            "placeholder" -> {
                val hintStr = op.optString(3, "")
                if (view is android.widget.EditText) {
                    view.hint = hintStr
                }
            }
            "src" -> {
                val srcStr = op.optString(3, "")
                if (view is LiquidImageView) {
                    view.setSource(srcStr)
                }
            }
            "hidden" -> {
                val isHidden = op.optBoolean(3, false)
                view.visibility = if (isHidden) View.GONE else View.VISIBLE
            }
            "dir" -> {
                val dirVal = op.optString(3, "").lowercase()
                applyDirection(nodeId, view, dirVal)
            }
            "href" -> {
                view.isClickable = true
                view.isFocusable = true
            }
        }
    }

    private fun applySetStyle(op: JSONArray) {
        val nodeId = op.getInt(1)
        val styleObj = op.optJSONObject(2) ?: return
        val view = nodeViews[nodeId] ?: return
        nodeStyles[nodeId] = styleObj
        val lp = view.layoutParams as? LiquidFlexLayout.LayoutParams
            ?: LiquidFlexLayout.LayoutParams(view.layoutParams)

        // Visibility / display
        if (styleObj.has("display")) {
            val disp = styleObj.getString("display").lowercase()
            view.visibility = if (disp == "none") View.GONE else View.VISIBLE
        }

        // Direction & BiDi
        val currentDir = if (styleObj.has("direction")) {
            val dir = styleObj.getString("direction").lowercase().trim()
            applyDirection(nodeId, view, dir)
            dir
        } else {
            val inheritedDir = resolveInheritedDirection(nodeId)
            if (inheritedDir != null) {
                applyDirection(nodeId, view, inheritedDir, isInherited = true)
                inheritedDir
            } else {
                nodeDirections[nodeId] ?: "ltr"
            }
        }
        val isRtl = currentDir == "rtl"

        // Common visual attributes
        val hasBg = styleObj.has("backgroundColor")
        val bgColor = if (hasBg) parseColorSafe(styleObj.getString("backgroundColor")) else 0

        val hasRadius = styleObj.has("borderRadius")
        val radiusPx = if (hasRadius) (styleObj.getDouble("borderRadius") * density).toFloat() else 0f

        val hasBorderW = styleObj.has("borderWidth")
        val borderWPx = if (hasBorderW) (styleObj.getDouble("borderWidth") * density).toFloat() else 0f

        val hasBorderC = styleObj.has("borderColor")
        val borderC = if (hasBorderC) parseColorSafe(styleObj.getString("borderColor")) else 0

        // Flex layout styles
        if (view is LiquidFlexLayout) {
            if (styleObj.has("flexDirection")) {
                view.flexDirection = when (styleObj.getString("flexDirection").lowercase()) {
                    "column" -> FlexDirection.COLUMN
                    "column-reverse" -> FlexDirection.COLUMN_REVERSE
                    "row-reverse" -> FlexDirection.ROW_REVERSE
                    else -> FlexDirection.ROW
                }
            }
            if (styleObj.has("flexWrap")) {
                view.flexWrap = if (styleObj.getString("flexWrap").lowercase() == "wrap") {
                    FlexWrap.WRAP
                } else FlexWrap.NOWRAP
            }
            if (styleObj.has("justifyContent")) {
                view.justifyContent = when (styleObj.getString("justifyContent").lowercase()) {
                    "center" -> JustifyContent.CENTER
                    "flex-end" -> JustifyContent.FLEX_END
                    "space-between" -> JustifyContent.SPACE_BETWEEN
                    "space-around" -> JustifyContent.SPACE_AROUND
                    "space-evenly" -> JustifyContent.SPACE_EVENLY
                    else -> JustifyContent.FLEX_START
                }
            }
            if (styleObj.has("alignItems")) {
                view.alignItems = when (styleObj.getString("alignItems").lowercase()) {
                    "flex-start" -> AlignItems.FLEX_START
                    "center" -> AlignItems.CENTER
                    "flex-end" -> AlignItems.FLEX_END
                    else -> AlignItems.STRETCH
                }
            }
            if (styleObj.has("rowGap")) {
                view.rowGapPx = (styleObj.getDouble("rowGap") * density).toInt()
            }
            if (styleObj.has("columnGap")) {
                view.columnGapPx = (styleObj.getDouble("columnGap") * density).toInt()
            }
            if (styleObj.has("overflow")) {
                view.overflowHidden = styleObj.getString("overflow").lowercase() == "hidden"
            }
            if (hasRadius) {
                view.cornerRadiusPx = radiusPx
            }
            if (hasBorderW) {
                view.borderWidthPx = borderWPx
            }
            if (hasBorderC) {
                view.borderColor = borderC
            }
            if (hasBg) {
                view.customBackgroundColor = bgColor
            }

            // Per-side borders
            if (styleObj.has("borderBottomWidth")) {
                view.borderBottomWidthPx = (styleObj.getDouble("borderBottomWidth") * density).toFloat()
            }
            if (styleObj.has("borderBottomColor")) {
                view.borderBottomColor = parseColorSafe(styleObj.getString("borderBottomColor"))
            }
            if (styleObj.has("borderTopWidth")) {
                view.borderTopWidthPx = (styleObj.getDouble("borderTopWidth") * density).toFloat()
            }
            if (styleObj.has("borderTopColor")) {
                view.borderTopColor = parseColorSafe(styleObj.getString("borderTopColor"))
            }
            if (styleObj.has("borderLeftWidth")) {
                view.borderLeftWidthPx = (styleObj.getDouble("borderLeftWidth") * density).toFloat()
            }
            if (styleObj.has("borderLeftColor")) {
                view.borderLeftColor = parseColorSafe(styleObj.getString("borderLeftColor"))
            }
            if (styleObj.has("borderRightWidth")) {
                view.borderRightWidthPx = (styleObj.getDouble("borderRightWidth") * density).toFloat()
            }
            if (styleObj.has("borderRightColor")) {
                view.borderRightColor = parseColorSafe(styleObj.getString("borderRightColor"))
            }

            // Logical borders
            if (styleObj.has("borderInlineStartWidth")) {
                val bw = (styleObj.getDouble("borderInlineStartWidth") * density).toFloat()
                if (isRtl) view.borderRightWidthPx = bw else view.borderLeftWidthPx = bw
            }
            if (styleObj.has("borderInlineStartColor")) {
                val bc = parseColorSafe(styleObj.getString("borderInlineStartColor"))
                if (isRtl) view.borderRightColor = bc else view.borderLeftColor = bc
            }
            if (styleObj.has("borderInlineEndWidth")) {
                val bw = (styleObj.getDouble("borderInlineEndWidth") * density).toFloat()
                if (isRtl) view.borderLeftWidthPx = bw else view.borderRightWidthPx = bw
            }
            if (styleObj.has("borderInlineEndColor")) {
                val bc = parseColorSafe(styleObj.getString("borderInlineEndColor"))
                if (isRtl) view.borderLeftColor = bc else view.borderRightColor = bc
            }
        } else if (view is LiquidButton) {
            val pressedBg = if (styleObj.has("pressedStyle")) {
                val pObj = styleObj.getJSONObject("pressedStyle")
                if (pObj.has("backgroundColor")) parseColorSafe(pObj.getString("backgroundColor")) else null
            } else null
            view.applyCustomStyle(bgColor, radiusPx, borderWPx, borderC, pressedBg)
        } else if (view is LiquidEditText) {
            val focusBorder = if (styleObj.has("focusStyle")) {
                val fObj = styleObj.getJSONObject("focusStyle")
                if (fObj.has("borderColor")) parseColorSafe(fObj.getString("borderColor")) else Color.parseColor("#0284c7")
            } else Color.parseColor("#0284c7")
            view.applyCustomStyle(bgColor, radiusPx, borderWPx, borderC, focusBorder)
        } else if (view is LiquidTextView) {
            view.applyCustomStyle(bgColor, radiusPx, borderWPx, borderC)
        } else if (hasBg) {
            view.setBackgroundColor(bgColor)
        }

        // Child LayoutParams properties
        if (styleObj.has("flexGrow")) {
            lp.flexGrow = styleObj.getDouble("flexGrow").toFloat()
        }
        if (styleObj.has("flexShrink")) {
            lp.flexShrink = styleObj.getDouble("flexShrink").toFloat()
        }
        if (styleObj.has("alignSelf")) {
            lp.alignSelf = when (styleObj.getString("alignSelf").lowercase()) {
                "flex-start" -> AlignSelf.FLEX_START
                "center" -> AlignSelf.CENTER
                "flex-end" -> AlignSelf.FLEX_END
                "stretch" -> AlignSelf.STRETCH
                else -> AlignSelf.AUTO
            }
        }

        // Dimensions
        if (styleObj.has("width")) {
            val w = styleObj.get("width")
            lp.width = if (w == "100%") ViewGroup.LayoutParams.MATCH_PARENT
                       else if (w is Number) (w.toDouble() * density).toInt()
                       else ViewGroup.LayoutParams.WRAP_CONTENT
        }
        if (styleObj.has("height")) {
            val h = styleObj.get("height")
            lp.height = if (h == "100%") ViewGroup.LayoutParams.MATCH_PARENT
                        else if (h is Number) (h.toDouble() * density).toInt()
                        else ViewGroup.LayoutParams.WRAP_CONTENT
        }
        if (styleObj.has("minWidth")) {
            lp.minWidthPx = (styleObj.getDouble("minWidth") * density).toInt()
        }
        if (styleObj.has("maxWidth")) {
            lp.maxWidthPx = (styleObj.getDouble("maxWidth") * density).toInt()
        }
        if (styleObj.has("minHeight")) {
            lp.minHeightPx = (styleObj.getDouble("minHeight") * density).toInt()
        }
        if (styleObj.has("maxHeight")) {
            lp.maxHeightPx = (styleObj.getDouble("maxHeight") * density).toInt()
        }

        // Margins
        var ml = lp.leftMargin
        var mt = lp.topMargin
        var mr = lp.rightMargin
        var mb = lp.bottomMargin
        if (styleObj.has("marginLeft")) {
            val v = styleObj.get("marginLeft")
            if (v == "auto") {
                lp.isMarginLeftAuto = true
                ml = 0
            } else if (v is Number) {
                lp.isMarginLeftAuto = false
                ml = (v.toDouble() * density).toInt()
            }
        }
        if (styleObj.has("marginRight")) {
            val v = styleObj.get("marginRight")
            if (v == "auto") {
                lp.isMarginRightAuto = true
                mr = 0
            } else if (v is Number) {
                lp.isMarginRightAuto = false
                mr = (v.toDouble() * density).toInt()
            }
        }
        if (styleObj.has("marginInlineStart")) {
            val v = styleObj.get("marginInlineStart")
            if (v == "auto") {
                if (isRtl) {
                    lp.isMarginRightAuto = true
                    mr = 0
                } else {
                    lp.isMarginLeftAuto = true
                    ml = 0
                }
            } else if (v is Number) {
                val px = (v.toDouble() * density).toInt()
                if (isRtl) {
                    lp.isMarginRightAuto = false
                    mr = px
                } else {
                    lp.isMarginLeftAuto = false
                    ml = px
                }
            }
        }
        if (styleObj.has("marginInlineEnd")) {
            val v = styleObj.get("marginInlineEnd")
            if (v == "auto") {
                if (isRtl) {
                    lp.isMarginLeftAuto = true
                    ml = 0
                } else {
                    lp.isMarginRightAuto = true
                    mr = 0
                }
            } else if (v is Number) {
                val px = (v.toDouble() * density).toInt()
                if (isRtl) {
                    lp.isMarginLeftAuto = false
                    ml = px
                } else {
                    lp.isMarginRightAuto = false
                    mr = px
                }
            }
        }
        if (styleObj.has("marginTop")) {
            val v = styleObj.get("marginTop")
            if (v == "auto") {
                lp.isMarginTopAuto = true
                mt = 0
            } else if (v is Number) {
                lp.isMarginTopAuto = false
                mt = (v.toDouble() * density).toInt()
            }
        }
        if (styleObj.has("marginBottom")) {
            val v = styleObj.get("marginBottom")
            if (v == "auto") {
                lp.isMarginBottomAuto = true
                mb = 0
            } else if (v is Number) {
                lp.isMarginBottomAuto = false
                mb = (v.toDouble() * density).toInt()
            }
        }
        lp.setMargins(ml, mt, mr, mb)

        // Paddings
        var pl = view.paddingLeft
        var pt = view.paddingTop
        var pr = view.paddingRight
        var pb = view.paddingBottom
        if (styleObj.has("paddingLeft")) pl = (styleObj.getDouble("paddingLeft") * density).toInt()
        if (styleObj.has("paddingTop")) pt = (styleObj.getDouble("paddingTop") * density).toInt()
        if (styleObj.has("paddingRight")) pr = (styleObj.getDouble("paddingRight") * density).toInt()
        if (styleObj.has("paddingBottom")) pb = (styleObj.getDouble("paddingBottom") * density).toInt()
        if (styleObj.has("paddingInlineStart")) {
            val px = (styleObj.getDouble("paddingInlineStart") * density).toInt()
            if (isRtl) pr = px else pl = px
        }
        if (styleObj.has("paddingInlineEnd")) {
            val px = (styleObj.getDouble("paddingInlineEnd") * density).toInt()
            if (isRtl) pl = px else pr = px
        }
        view.setPadding(pl, pt, pr, pb)

        // Positioning
        if (styleObj.has("position")) {
            lp.isAbsolute = styleObj.getString("position").lowercase() == "absolute"
        }
        if (styleObj.has("top")) lp.topPx = (styleObj.getDouble("top") * density).toInt()
        if (styleObj.has("right")) lp.rightPx = (styleObj.getDouble("right") * density).toInt()
        if (styleObj.has("bottom")) lp.bottomPx = (styleObj.getDouble("bottom") * density).toInt()
        if (styleObj.has("left")) lp.leftPx = (styleObj.getDouble("left") * density).toInt()
        if (styleObj.has("insetInlineStart")) {
            val px = (styleObj.getDouble("insetInlineStart") * density).toInt()
            if (isRtl) lp.rightPx = px else lp.leftPx = px
        }
        if (styleObj.has("insetInlineEnd")) {
            val px = (styleObj.getDouble("insetInlineEnd") * density).toInt()
            if (isRtl) lp.leftPx = px else lp.rightPx = px
        }

        // Opacity & Elevation
        if (styleObj.has("opacity")) {
            view.alpha = styleObj.getDouble("opacity").toFloat()
        }
        if (styleObj.has("elevation")) {
            view.elevation = (styleObj.getDouble("elevation") * density).toFloat()
            view.outlineProvider = ViewOutlineProvider.BACKGROUND
        }

        // Typography for TextView, Button, and EditText
        if (view is android.widget.TextView) {
            if (styleObj.has("color")) {
                view.setTextColor(parseColorSafe(styleObj.getString("color")))
            } else {
                val inheritedColor = resolveInheritedColor(nodeId)
                if (inheritedColor != null) {
                    view.setTextColor(inheritedColor)
                }
            }
            if (styleObj.has("fontSize")) {
                view.textSize = styleObj.getDouble("fontSize").toFloat()
            }
            if (styleObj.has("fontWeight") || styleObj.has("fontStyle")) {
                val weight = if (styleObj.has("fontWeight")) styleObj.getString("fontWeight").lowercase() else ""
                val isBold = if (styleObj.has("fontWeight")) {
                    weight == "bold" || (weight.toIntOrNull() ?: 400) >= 600
                } else {
                    view.typeface?.isBold == true
                }
                val isItalic = if (styleObj.has("fontStyle")) {
                    val s = styleObj.getString("fontStyle").lowercase()
                    s.contains("italic") || s.contains("oblique")
                } else {
                    view.typeface?.isItalic == true
                }
                val styleFlag = when {
                    isBold && isItalic -> android.graphics.Typeface.BOLD_ITALIC
                    isBold -> android.graphics.Typeface.BOLD
                    isItalic -> android.graphics.Typeface.ITALIC
                    else -> android.graphics.Typeface.NORMAL
                }
                val currentBase = view.typeface ?: android.graphics.Typeface.DEFAULT
                view.typeface = android.graphics.Typeface.create(currentBase, styleFlag)
            }
            if (styleObj.has("fontFamily")) {
                val fam = styleObj.getString("fontFamily").lowercase()
                val base = when {
                    fam.contains("serif") && !fam.contains("sans") -> android.graphics.Typeface.SERIF
                    fam.contains("mono") -> android.graphics.Typeface.MONOSPACE
                    else -> android.graphics.Typeface.SANS_SERIF
                }
                val isBold = view.typeface?.isBold == true
                val isItalic = view.typeface?.isItalic == true
                val styleFlag = when {
                    isBold && isItalic -> android.graphics.Typeface.BOLD_ITALIC
                    isBold -> android.graphics.Typeface.BOLD
                    isItalic -> android.graphics.Typeface.ITALIC
                    else -> android.graphics.Typeface.NORMAL
                }
                view.typeface = android.graphics.Typeface.create(base, styleFlag)
            }
            if (styleObj.has("textAlign")) {
                when (styleObj.getString("textAlign").lowercase()) {
                    "center" -> view.textAlignment = View.TEXT_ALIGNMENT_CENTER
                    "right", "end" -> view.textAlignment = View.TEXT_ALIGNMENT_TEXT_END
                    else -> view.textAlignment = View.TEXT_ALIGNMENT_TEXT_START
                }
            }
            if (styleObj.has("letterSpacing")) {
                val ls = styleObj.getDouble("letterSpacing").toFloat()
                val ts = view.textSize
                view.letterSpacing = if (ts > 0f) ls / ts else ls
            }
            if (styleObj.has("lineHeight")) {
                val lh = (styleObj.getDouble("lineHeight") * density).toFloat()
                val fs = view.paint.fontSpacing
                if (lh > fs) view.setLineSpacing(lh - fs, 1.0f)
            }

            if (view is LiquidTextView) {
                if (styleObj.has("textDecoration")) {
                    view.setTextDecoration(styleObj.getString("textDecoration"))
                }
                if (styleObj.has("textOverflow")) {
                    view.setTextOverflow(styleObj.getString("textOverflow"))
                }
            }
        } else if (view is ViewGroup && styleObj.has("color")) {
            // Inheritable CSS color property: propagate down to text children without explicit color
            val inheritedColor = parseColorSafe(styleObj.getString("color"))
            if (inheritedColor != 0) {
                propagateColorToDescendants(nodeId, inheritedColor)
            }
        }

        view.layoutParams = lp
    }

    private fun resolveInheritedColor(nodeId: Int): Int? {
        var curr = nodeParents[nodeId]
        while (curr != null) {
            val st = nodeStyles[curr]
            if (st != null && st.has("color")) {
                val c = parseColorSafe(st.getString("color"))
                if (c != 0) return c
            }
            curr = nodeParents[curr]
        }
        return null
    }

    private fun propagateColorToDescendants(parentId: Int, color: Int) {
        for ((childId, pId) in nodeParents) {
            if (pId == parentId) {
                val childStyle = nodeStyles[childId]
                if (childStyle == null || !childStyle.has("color")) {
                    val childView = nodeViews[childId]
                    if (childView is android.widget.TextView) {
                        childView.setTextColor(color)
                    }
                    if (childView is ViewGroup) {
                        propagateColorToDescendants(childId, color)
                    }
                }
            }
        }
    }

    private fun applyDirection(nodeId: Int, view: View, dir: String, isInherited: Boolean = false) {
        val cleanDir = dir.lowercase().trim()
        if (cleanDir != "rtl" && cleanDir != "ltr") return
        if (!isInherited) {
            explicitDirections.add(nodeId)
        }
        nodeDirections[nodeId] = cleanDir
        val isRtl = cleanDir == "rtl"
        view.layoutDirection = if (isRtl) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
        if (view is android.widget.TextView) {
            view.textDirection = if (isRtl) View.TEXT_DIRECTION_ANY_RTL else View.TEXT_DIRECTION_LTR
        }
        propagateDirectionToDescendants(nodeId, cleanDir)
    }

    private fun resolveInheritedDirection(nodeId: Int): String? {
        var curr = nodeParents[nodeId]
        while (curr != null) {
            if (nodeDirections.containsKey(curr)) {
                return nodeDirections[curr]
            }
            val st = nodeStyles[curr]
            if (st != null && st.has("direction")) {
                val d = st.getString("direction").lowercase().trim()
                if (d == "rtl" || d == "ltr") return d
            }
            curr = nodeParents[curr]
        }
        return null
    }

    private fun propagateDirectionToDescendants(parentId: Int, dir: String) {
        val isRtl = dir == "rtl"
        for ((childId, pId) in nodeParents) {
            if (pId == parentId && !explicitDirections.contains(childId)) {
                nodeDirections[childId] = dir
                val childView = nodeViews[childId]
                if (childView != null) {
                    childView.layoutDirection = if (isRtl) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
                    if (childView is android.widget.TextView) {
                        childView.textDirection = if (isRtl) View.TEXT_DIRECTION_ANY_RTL else View.TEXT_DIRECTION_LTR
                    }
                    if (childView is ViewGroup) {
                        propagateDirectionToDescendants(childId, dir)
                    }
                }
            }
        }
    }

    private fun updateParentText(parentId: Int) {
        val parentView = nodeViews[parentId] as? android.widget.TextView ?: return
        val children = parentChildTexts[parentId] ?: return
        val fullText = children.joinToString("") { id ->
            nodeTextValues[id] ?: (nodeViews[id] as? android.widget.TextView)?.text?.toString() ?: ""
        }
        parentView.text = fullText
    }

    private fun applySetText(op: JSONArray) {
        val nodeId = op.getInt(1)
        val text = op.optString(2, "")
        nodeTextValues[nodeId] = text
        val view = nodeViews[nodeId]
        Log.d(TAG, "applySetText: node=$nodeId, text='$text', view=${view?.javaClass?.simpleName}")
        if (view is android.widget.TextView) {
            view.text = text
        }
        val parentId = textNodeParents[nodeId]
        if (parentId != null) {
            updateParentText(parentId)
        }
    }

    private fun applyInsert(op: JSONArray) {
        val parentId = op.getInt(1)
        val childId = op.getInt(2)
        val anchorId = op.optInt(3, 0)

        val parentView = nodeViews[parentId]
        val childView = nodeViews[childId] ?: return
        nodeParents[childId] = parentId

        // If parent is a TextView / Button and child is a TextView, manage concatenated multi-chunk text
        if (parentView is android.widget.TextView && childView is android.widget.TextView) {
            val children = parentChildTexts.getOrPut(parentId) { mutableListOf() }
            children.remove(childId)
            if (anchorId > 0 && children.contains(anchorId)) {
                val idx = children.indexOf(anchorId)
                children.add(idx, childId)
            } else {
                children.add(childId)
            }
            textNodeParents[childId] = parentId
            updateParentText(parentId)
            return
        }

        // Inherit CSS color from parent if child TextView or ViewGroup does not have explicit color
        val inherited = resolveInheritedColor(childId)
        if (inherited != null) {
            if (childView is android.widget.TextView) {
                val childStyle = nodeStyles[childId]
                if (childStyle == null || !childStyle.has("color")) {
                    childView.setTextColor(inherited)
                }
            } else if (childView is ViewGroup) {
                propagateColorToDescendants(childId, inherited)
            }
        }

        // Inherit CSS direction from parent if child does not have explicit direction
        val inheritedDir = resolveInheritedDirection(childId)
        if (inheritedDir != null && !explicitDirections.contains(childId)) {
            applyDirection(childId, childView, inheritedDir, isInherited = true)
        }

        val container = when (parentView) {
            is LiquidScrollView -> parentView.getChildAt(0) as? ViewGroup ?: parentView
            is ViewGroup -> parentView
            else -> return
        }

        // In ROW containers, block elements default to WRAP_CONTENT unless explicit width/flex is set
        if (container is LiquidFlexLayout && (container.flexDirection == FlexDirection.ROW || container.flexDirection == FlexDirection.ROW_REVERSE)) {
            val childStyle = nodeStyles[childId]
            if (childStyle == null || (!childStyle.has("width") && !childStyle.has("flexBasis"))) {
                (childView.layoutParams as? ViewGroup.LayoutParams)?.width = ViewGroup.LayoutParams.WRAP_CONTENT
            }
        }

        (childView.parent as? ViewGroup)?.removeView(childView)

        if (anchorId > 0 && nodeViews.containsKey(anchorId)) {
            val anchorView = nodeViews[anchorId]
            val idx = container.indexOfChild(anchorView)
            if (idx >= 0) {
                container.addView(childView, idx)
                return
            }
        }
        container.addView(childView)
    }

    private fun applyRemove(op: JSONArray) {
        val nodeId = op.getInt(1)
        nodeStyles.remove(nodeId)
        nodeTextValues.remove(nodeId)
        val parentId = textNodeParents.remove(nodeId)
        if (parentId != null) {
            parentChildTexts[parentId]?.remove(nodeId)
            updateParentText(parentId)
        }
        parentChildTexts.remove(nodeId)
        nodeParents.remove(nodeId)
        val view = nodeViews.remove(nodeId) ?: return
        (view.parent as? ViewGroup)?.removeView(view)
    }

    private fun applyListen(op: JSONArray) {
        val nodeId = op.getInt(1)
        val eventName = op.getString(2)
        val handlerId = op.optInt(3, -1)
        val view = nodeViews[nodeId]
        if (view == null) {
            Log.w(TAG, "applyListen: view not found for nodeId=$nodeId (event=$eventName)")
            return
        }

        Log.d(TAG, "applyListen: attached '$eventName' (handlerId=$handlerId) to view $nodeId (${view.javaClass.simpleName})")

        when (eventName.lowercase()) {
            "click" -> {
                view.isClickable = true
                view.setOnClickListener {
                    Log.d(TAG, "onClick fired on view $nodeId (${view.javaClass.simpleName}), dispatching to JS")
                    eventDispatcher(nodeId, "click", "{}")
                }
            }
            "input" -> {
                if (view is LiquidEditText) {
                    view.isFocusable = true
                    view.isFocusableInTouchMode = true
                    view.onInputChanged = { text ->
                        Log.d(TAG, "onInputChanged on view $nodeId: '$text'")
                        val escaped = JSONObject.quote(text)
                        eventDispatcher(nodeId, "input", "{\"target\":{\"value\":$escaped}}")
                    }
                }
            }
            "change" -> {
                if (view is LiquidEditText) {
                    view.onInputChanged = { text ->
                        val escaped = JSONObject.quote(text)
                        eventDispatcher(nodeId, "change", "{\"target\":{\"value\":$escaped}}")
                    }
                }
            }
            "keydown", "keydown.enter" -> {
                if (view is LiquidEditText) {
                    view.onEnterPressed = {
                        Log.d(TAG, "onEnterPressed on view $nodeId")
                        eventDispatcher(nodeId, "keydown", "{\"key\":\"Enter\",\"keyCode\":13}")
                    }
                }
            }
        }
    }

    private fun applyUnlisten(op: JSONArray) {
        val nodeId = op.getInt(1)
        val eventName = op.getString(2)
        val view = nodeViews[nodeId] ?: return
        if (eventName.equals("click", ignoreCase = true)) {
            view.setOnClickListener(null)
        }
    }

    private fun parseColorSafe(colorStr: String): Int {
        if (colorStr.isEmpty()) return Color.TRANSPARENT
        val str = colorStr.trim()
        return try {
            if (str.startsWith("#")) {
                Color.parseColor(str)
            } else if (str.startsWith("rgb", ignoreCase = true)) {
                val nums = str.replace(Regex("[^0-9,./]"), "").split(Regex("[,/]")).map { it.trim().toFloatOrNull() ?: 0f }
                if (nums.size >= 3) {
                    val a = if (nums.size >= 4) (nums[3] * 255).toInt() else 255
                    Color.argb(a, nums[0].toInt(), nums[1].toInt(), nums[2].toInt())
                } else Color.TRANSPARENT
            } else {
                Color.parseColor(str)
            }
        } catch (e: Exception) {
            Color.TRANSPARENT
        }
    }

    fun clear() {
        nodeViews.clear()
        nodeStyles.clear()
        nodeParents.clear()
        parentChildTexts.clear()
        textNodeParents.clear()
        nodeTextValues.clear()
        nodeDirections.clear()
        explicitDirections.clear()
        nodeViews[1] = rootContainer
        rootContainer.removeAllViews()
    }
}
