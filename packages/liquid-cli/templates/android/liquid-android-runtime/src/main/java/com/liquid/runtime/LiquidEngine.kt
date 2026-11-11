package com.liquid.runtime

import android.app.AlertDialog
import android.content.Context
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Log
import android.view.Choreographer
import java.util.concurrent.ConcurrentLinkedQueue

class LiquidEngine(
    private val context: Context,
    private val rootContainer: LiquidFlexLayout,
    private val isDebug: Boolean = false
) : Choreographer.FrameCallback {

    private val TAG = "LiquidEngine"
    private var jsThread: HandlerThread? = null
    private var jsHandler: Handler? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var runtimeHandle: Long = 0
    private var isDestroyed = false

    private val pendingBatches = ConcurrentLinkedQueue<String>()
    private var isFrameScheduled = false

    val batchApplier = BatchOpApplier(
        context = context,
        rootContainer = rootContainer,
        eventDispatcher = { nodeId, eventName, payloadJson ->
            dispatchEvent(nodeId, eventName, payloadJson)
        }
    )

    var onErrorListener: ((String, String) -> Boolean)? = null

    private val bridge = LiquidBridge(
        onBatch = { batchJson ->
            Log.d("LiquidDbg", "LiquidBridge.onBatch received ${batchJson.length} chars from JS, scheduling frame")
            writeLaunchBreadcrumb("LiquidBridge.onBatch received ${batchJson.length} chars from JS")
            pendingBatches.add(batchJson)
            scheduleFrame()
        },
        onError = { msg, stack ->
            mainHandler.post {
                Log.e("LiquidDbg", "Liquid JS Error: $msg\n$stack")
                writeLaunchBreadcrumb("JS Error: $msg\n$stack")
                if (onErrorListener?.invoke(msg, stack) == true) {
                    return@post
                }
                if (isDebug) {
                    showErrorOverlay(msg, stack)
                }
            }
        }
    )

    fun start(bundleSource: BundleSource) {
        writeLaunchBreadcrumb("Engine starting (debug=$isDebug)...")

        if (LiquidBridge.loadError != null) {
            val err = LiquidBridge.loadError!!
            Log.e(TAG, "FATAL: libliquid-quickjs.so failed to load", err)
            mainHandler.post {
                showErrorOverlay("Native Library Error", "Failed to load libliquid-quickjs.so:\n${err.message}\n\nPlease check Android Bionic ABI compatibility.")
            }
            writeLaunchBreadcrumb("FATAL: libliquid-quickjs.so failed to load: ${err.message}")
            return
        }

        jsThread = HandlerThread("LiquidJSThread").apply { start() }
        jsHandler = Handler(jsThread!!.looper)

        jsHandler?.post {
            try {
                runtimeHandle = bridge.nativeInit(isDebug)
            } catch (e: Throwable) {
                Log.e(TAG, "FATAL: nativeInit threw exception", e)
                mainHandler.post {
                    showErrorOverlay("JNI nativeInit Error", e.message ?: "Failed in nativeInit")
                }
                writeLaunchBreadcrumb("FATAL: nativeInit failed: ${e.message}")
                return@post
            }

            if (runtimeHandle == 0L) {
                Log.e(TAG, "Failed to initialize QuickJS native bridge (handle 0)")
                writeLaunchBreadcrumb("FATAL: runtimeHandle is 0")
                return@post
            }

            writeLaunchBreadcrumb("QuickJS native runtime initialized (handle=$runtimeHandle)")

            val bundle = bundleSource.loadBundle()
            when (bundle) {
                is BundleContent.Bytecode -> {
                    Log.i(TAG, "Evaluating bytecode bundle: ${bundle.filename} (${bundle.bytes.size} bytes)")
                    writeLaunchBreadcrumb("Evaluating bytecode bundle (${bundle.bytes.size} bytes)...")
                    val ok = try {
                        bridge.nativeEvaluateBytecode(runtimeHandle, bundle.bytes)
                    } catch (e: Throwable) {
                        Log.w(TAG, "Bytecode evaluation threw exception", e)
                        false
                    }
                    if (!ok) {
                        Log.w(TAG, "Bytecode evaluation failed, falling back to source bundle main.bundle.js")
                        writeLaunchBreadcrumb("Bytecode evaluation returned false, falling back to main.bundle.js...")
                        val fallbackCode = try {
                            val stream = context.assets.open("main.bundle.js")
                            val text = stream.bufferedReader().readText()
                            stream.close()
                            text
                        } catch (e: Exception) { null }

                        if (fallbackCode != null) {
                            bridge.nativeEvaluateScript(runtimeHandle, fallbackCode, "main.bundle.js")
                            writeLaunchBreadcrumb("Source fallback evaluated successfully!")
                        }
                    } else {
                        writeLaunchBreadcrumb("Bytecode evaluated successfully!")
                    }
                }
                is BundleContent.SourceCode -> {
                    Log.i(TAG, "Evaluating source code bundle: ${bundle.filename}")
                    writeLaunchBreadcrumb("Evaluating source code bundle (${bundle.code.length} chars)...")
                    bridge.nativeEvaluateScript(runtimeHandle, bundle.code, bundle.filename)
                    writeLaunchBreadcrumb("Source code bundle evaluated successfully!")
                }
            }
        }
    }

    private fun writeLaunchBreadcrumb(msg: String) {
        try {
            val line = "[${java.util.Date()}] $msg\n"
            val dir = context.getExternalFilesDir(null) ?: context.filesDir
            java.io.File(dir, "launch.log").appendText(line)
            try {
                java.io.File("/sdcard/liquid_launch.log").appendText(line)
            } catch (_: Exception) {}
        } catch (_: Exception) {}
    }

    private fun scheduleFrame() {
        if (!isFrameScheduled && !isDestroyed) {
            isFrameScheduled = true
            mainHandler.post {
                Choreographer.getInstance().postFrameCallback(this)
            }
        }
    }

    override fun doFrame(frameTimeNanos: Long) {
        isFrameScheduled = false
        if (isDestroyed) return

        var batchCount = 0
        while (true) {
            val batch = pendingBatches.poll() ?: break
            batchCount++
            try {
                Log.d("LiquidDbg", "doFrame: applying batch #$batchCount (${batch.length} chars) on UI thread")
                batchApplier.applyBatch(batch)
                writeLaunchBreadcrumb("Choreographer frame applied batch #$batchCount (${batch.length} chars)")
            } catch (e: Exception) {
                Log.e("LiquidDbg", "Error applying UI op batch", e)
                writeLaunchBreadcrumb("Error applying UI op batch: ${e.message}")
            }
        }
    }

    fun dispatchEvent(nodeId: Int, eventName: String, payloadJson: String) {
        if (isDestroyed) return
        val msg = "Posting event '$eventName' on node $nodeId to JS thread"
        Log.d("LiquidDbg", msg)
        writeLaunchBreadcrumb(msg)
        jsHandler?.post {
            if (runtimeHandle != 0L) {
                Log.d("LiquidDbg", "Invoking bridge.nativeDispatchEvent(nodeId=$nodeId, event='$eventName')")
                val ok = bridge.nativeDispatchEvent(runtimeHandle, nodeId, eventName, payloadJson)
                val resMsg = "Native event '$eventName' on node $nodeId executed in JS (result: $ok)"
                Log.d("LiquidDbg", resMsg)
                writeLaunchBreadcrumb(resMsg)
            } else {
                Log.e("LiquidDbg", "runtimeHandle is 0 when dispatching '$eventName'!")
            }
        }
    }

    private fun showErrorOverlay(message: String, stack: String) {
        try {
            AlertDialog.Builder(context)
                .setTitle("Liquid Runtime Exception")
                .setMessage("$message\n\n$stack")
                .setPositiveButton("Dismiss", null)
                .show()
        } catch (e: Exception) {
            Log.e(TAG, "Could not display error dialog: $message")
        }
    }

    fun reload(newBundleSource: BundleSource) {
        destroy()
        isDestroyed = false
        batchApplier.clear()
        start(newBundleSource)
    }

    fun destroy() {
        isDestroyed = true
        pendingBatches.clear()

        jsHandler?.post {
            if (runtimeHandle != 0L) {
                bridge.nativeDestroy(runtimeHandle)
                runtimeHandle = 0
            }
            jsThread?.quitSafely()
        }
        batchApplier.clear()
    }
}
