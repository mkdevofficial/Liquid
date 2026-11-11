package com.liquid.runtime

import android.util.Log

class LiquidBridge(
    private val onBatch: (String) -> Unit,
    private val onError: (String, String) -> Unit
) {
    companion object {
        private const val TAG = "LiquidBridge"
        var loadError: Throwable? = null
        var isLoaded = false

        init {
            try {
                System.loadLibrary("liquid-quickjs")
                isLoaded = true
                Log.i(TAG, "Successfully loaded libliquid-quickjs.so (Bionic arm64-v8a)")
            } catch (e: Throwable) {
                loadError = e
                Log.e(TAG, "CRITICAL: Failed to load libliquid-quickjs.so: ${e.message}", e)
            }
        }
    }

    external fun nativeInit(isDebug: Boolean): Long
    external fun nativeDestroy(handle: Long)
    external fun nativeEvaluateScript(handle: Long, script: String, filename: String): Boolean
    external fun nativeEvaluateBytecode(handle: Long, bytecode: ByteArray): Boolean
    external fun nativeDispatchEvent(handle: Long, nodeId: Int, eventName: String, payloadJson: String): Boolean

    // Callbacks invoked from JNI C bridge
    fun onNativeBatchOps(batchJson: String) {
        onBatch(batchJson)
    }

    fun onNativeError(error: String, stack: String) {
        onError(error, stack)
    }
}
