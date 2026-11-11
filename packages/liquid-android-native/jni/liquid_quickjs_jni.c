#include <jni.h>
#if defined(__ANDROID__) || defined(ANDROID)
#include <android/log.h>
#define LOG_TAG "LiquidEngine"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#else
#include <stdio.h>
#define LOGI(...) do { printf("[INFO] " __VA_ARGS__); printf("\n"); } while(0)
#define LOGW(...) do { printf("[WARN] " __VA_ARGS__); printf("\n"); } while(0)
#define LOGE(...) do { fprintf(stderr, "[ERROR] " __VA_ARGS__); fprintf(stderr, "\n"); } while(0)
#endif
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "../quickjs/quickjs.h"



typedef struct {
    JavaVM *jvm;
    jobject bridge_global_ref;
    JSRuntime *rt;
    JSContext *ctx;
    int is_debug;
} LiquidRuntimeContext;

static void pump_pending_jobs(JSContext *ctx) {
    JSContext *pctx;
    int ret;
    while ((ret = JS_ExecutePendingJob(JS_GetRuntime(ctx), &pctx)) > 0) {
        // Pumping jobs
    }
    if (ret < 0) {
        JSValue ex = JS_GetException(pctx);
        const char *str = JS_ToCString(pctx, ex);
        LOGE("Unhandled promise rejection / error: %s", str ? str : "unknown");
        if (str) JS_FreeCString(pctx, str);
        JS_FreeValue(pctx, ex);
    }
}

// Global console.log / warn / error
static JSValue js_console_log(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic) {
    int i;
    char buffer[4096];
    size_t offset = 0;
    buffer[0] = '\0';

    for (i = 0; i < argc; i++) {
        const char *str = JS_ToCString(ctx, argv[i]);
        if (str) {
            size_t len = strlen(str);
            if (offset + len + 2 < sizeof(buffer)) {
                if (i > 0) buffer[offset++] = ' ';
                memcpy(buffer + offset, str, len);
                offset += len;
                buffer[offset] = '\0';
            }
            JS_FreeCString(ctx, str);
        }
    }

    if (magic == 1) {
        LOGW("%s", buffer);
    } else if (magic == 2) {
        LOGE("%s", buffer);
    } else {
        LOGI("%s", buffer);
    }

    return JS_UNDEFINED;
}

// __liquid_native_bridge.applyBatch(batchJson)
static JSValue js_apply_batch(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_UNDEFINED;

    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)JS_GetContextOpaque(ctx);
    if (!lctx || !lctx->jvm || !lctx->bridge_global_ref) return JS_UNDEFINED;

    const char *batch_str = JS_ToCString(ctx, argv[0]);
    if (!batch_str) return JS_UNDEFINED;

    LOGI("[LiquidDbg] JNI js_apply_batch invoked from JS (%zu bytes)", strlen(batch_str));

    JNIEnv *env = NULL;
    int attached = 0;
    if ((*lctx->jvm)->GetEnv(lctx->jvm, (void **)&env, JNI_VERSION_1_6) != JNI_OK) {
        if ((*lctx->jvm)->AttachCurrentThread(lctx->jvm, &env, NULL) == 0) {
            attached = 1;
        }
    }

    if (env) {
        jclass clazz = (*env)->GetObjectClass(env, lctx->bridge_global_ref);
        jmethodID method = (*env)->GetMethodID(env, clazz, "onNativeBatchOps", "(Ljava/lang/String;)V");
        if (method) {
            jstring jstr = (*env)->NewStringUTF(env, batch_str);
            (*env)->CallVoidMethod(env, lctx->bridge_global_ref, method, jstr);
            (*env)->DeleteLocalRef(env, jstr);
        } else {
            LOGE("[LiquidDbg] onNativeBatchOps method not found on bridge!");
        }
        (*env)->DeleteLocalRef(env, clazz);
    }

    JS_FreeCString(ctx, batch_str);
    return JS_UNDEFINED;
}

static void register_globals(LiquidRuntimeContext *lctx) {
    JSContext *ctx = lctx->ctx;
    JSValue global = JS_GetGlobalObject(ctx);

    // 1. console object
    JSValue console = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, console, "log", JS_NewCFunctionMagic(ctx, js_console_log, "log", 1, JS_CFUNC_generic_magic, 0));
    JS_SetPropertyStr(ctx, console, "info", JS_NewCFunctionMagic(ctx, js_console_log, "info", 1, JS_CFUNC_generic_magic, 0));
    JS_SetPropertyStr(ctx, console, "warn", JS_NewCFunctionMagic(ctx, js_console_log, "warn", 1, JS_CFUNC_generic_magic, 1));
    JS_SetPropertyStr(ctx, console, "error", JS_NewCFunctionMagic(ctx, js_console_log, "error", 1, JS_CFUNC_generic_magic, 2));
    JS_SetPropertyStr(ctx, global, "console", console);

    // 2. __liquid_native_bridge object
    JSValue bridge = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, bridge, "applyBatch", JS_NewCFunction(ctx, js_apply_batch, "applyBatch", 1));
    JS_SetPropertyStr(ctx, global, "__liquid_native_bridge", bridge);

    // 3. Polyfills: queueMicrotask via Promises, requestAnimationFrame, and timers
    const char *timer_shim =
        "globalThis.queueMicrotask = function(fn) {\n"
        "  Promise.resolve().then(fn).catch(function(err) {\n"
        "    console.error('[LiquidDbg] Uncaught in queueMicrotask:', err);\n"
        "  });\n"
        "};\n"
        "globalThis._liquid_timers = new Map();\n"
        "globalThis._liquid_timer_id = 1;\n"
        "globalThis.setTimeout = function(fn, delay) {\n"
        "  var id = globalThis._liquid_timer_id++;\n"
        "  globalThis._liquid_timers.set(id, fn);\n"
        "  queueMicrotask(function() {\n"
        "    var cb = globalThis._liquid_timers.get(id);\n"
        "    if (cb) {\n"
        "      globalThis._liquid_timers.delete(id);\n"
        "      cb();\n"
        "    }\n"
        "  });\n"
        "  return id;\n"
        "};\n"
        "globalThis.clearTimeout = function(id) {\n"
        "  globalThis._liquid_timers.delete(id);\n"
        "};\n"
        "globalThis.setInterval = globalThis.setTimeout;\n"
        "globalThis.clearInterval = globalThis.clearTimeout;\n"
        "globalThis.requestAnimationFrame = function(cb) {\n"
        "  return setTimeout(cb, 16);\n"
        "};\n"
        "globalThis.cancelAnimationFrame = clearTimeout;\n";

    JSValue shim_val = JS_Eval(ctx, timer_shim, strlen(timer_shim), "<timer_shim>", JS_EVAL_TYPE_GLOBAL);
    JS_FreeValue(ctx, shim_val);

    JS_FreeValue(ctx, global);
}

// JNI exports for com.liquid.runtime.LiquidBridge
JNIEXPORT jlong JNICALL Java_com_liquid_runtime_LiquidBridge_nativeInit(JNIEnv *env, jobject thiz, jboolean is_debug) {
    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)malloc(sizeof(LiquidRuntimeContext));
    if (!lctx) return 0;

    memset(lctx, 0, sizeof(LiquidRuntimeContext));
    (*env)->GetJavaVM(env, &lctx->jvm);
    lctx->bridge_global_ref = (*env)->NewGlobalRef(env, thiz);
    lctx->is_debug = is_debug;

    lctx->rt = JS_NewRuntime();
    if (!lctx->rt) {
        free(lctx);
        return 0;
    }

    lctx->ctx = JS_NewContext(lctx->rt);
    if (!lctx->ctx) {
        JS_FreeRuntime(lctx->rt);
        free(lctx);
        return 0;
    }

    JS_SetContextOpaque(lctx->ctx, lctx);
    register_globals(lctx);

    LOGI("Liquid QuickJS Runtime initialized successfully (debug=%d)", is_debug);
    return (jlong)(intptr_t)lctx;
}

JNIEXPORT void JNICALL Java_com_liquid_runtime_LiquidBridge_nativeDestroy(JNIEnv *env, jobject thiz, jlong handle) {
    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)(intptr_t)handle;
    if (!lctx) return;

    if (lctx->bridge_global_ref) {
        (*env)->DeleteGlobalRef(env, lctx->bridge_global_ref);
    }
    if (lctx->ctx) {
        JS_FreeContext(lctx->ctx);
    }
    if (lctx->rt) {
        JS_FreeRuntime(lctx->rt);
    }
    free(lctx);
    LOGI("Liquid QuickJS Runtime destroyed");
}

JNIEXPORT jboolean JNICALL Java_com_liquid_runtime_LiquidBridge_nativeEvaluateScript(
    JNIEnv *env, jobject thiz, jlong handle, jstring script, jstring filename) {
    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)(intptr_t)handle;
    if (!lctx || !lctx->ctx) return JNI_FALSE;

    const char *c_script = (*env)->GetStringUTFChars(env, script, NULL);
    const char *c_filename = (*env)->GetStringUTFChars(env, filename, NULL);

    JSValue val = JS_Eval(lctx->ctx, c_script, strlen(c_script), c_filename, JS_EVAL_TYPE_GLOBAL);
    pump_pending_jobs(lctx->ctx);

    int success = 1;
    if (JS_IsException(val)) {
        success = 0;
        JSValue ex = JS_GetException(lctx->ctx);
        const char *ex_str = JS_ToCString(lctx->ctx, ex);
        LOGE("JS Execution Exception in %s: %s", c_filename, ex_str ? ex_str : "unknown");

        jclass clazz = (*env)->GetObjectClass(env, thiz);
        jmethodID err_method = (*env)->GetMethodID(env, clazz, "onNativeError", "(Ljava/lang/String;Ljava/lang/String;)V");
        if (err_method) {
            jstring jmsg = (*env)->NewStringUTF(env, ex_str ? ex_str : "Runtime Error");
            jstring jstack = (*env)->NewStringUTF(env, c_filename);
            (*env)->CallVoidMethod(env, thiz, err_method, jmsg, jstack);
            (*env)->DeleteLocalRef(env, jmsg);
            (*env)->DeleteLocalRef(env, jstack);
        }
        (*env)->DeleteLocalRef(env, clazz);

        if (ex_str) JS_FreeCString(lctx->ctx, ex_str);
        JS_FreeValue(lctx->ctx, ex);
    }

    JS_FreeValue(lctx->ctx, val);
    (*env)->ReleaseStringUTFChars(env, script, c_script);
    (*env)->ReleaseStringUTFChars(env, filename, c_filename);

    return success ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL Java_com_liquid_runtime_LiquidBridge_nativeEvaluateBytecode(
    JNIEnv *env, jobject thiz, jlong handle, jbyteArray bytecode) {
    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)(intptr_t)handle;
    if (!lctx || !lctx->ctx) return JNI_FALSE;

    jsize len = (*env)->GetArrayLength(env, bytecode);
    jbyte *buf = (*env)->GetByteArrayElements(env, bytecode, NULL);

    JSValue obj = JS_ReadObject(lctx->ctx, (const uint8_t *)buf, len, JS_READ_OBJ_BYTECODE);
    (*env)->ReleaseByteArrayElements(env, bytecode, buf, JNI_ABORT);

    if (JS_IsException(obj)) {
        LOGE("Failed to read QuickJS bytecode");
        return JNI_FALSE;
    }

    JSValue res = JS_EvalFunction(lctx->ctx, obj);
    pump_pending_jobs(lctx->ctx);

    int success = 1;
    if (JS_IsException(res)) {
        success = 0;
        JSValue ex = JS_GetException(lctx->ctx);
        const char *ex_str = JS_ToCString(lctx->ctx, ex);
        LOGE("Bytecode execution exception: %s", ex_str ? ex_str : "unknown");
        if (ex_str) JS_FreeCString(lctx->ctx, ex_str);
        JS_FreeValue(lctx->ctx, ex);
    }

    JS_FreeValue(lctx->ctx, res);
    return success ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL Java_com_liquid_runtime_LiquidBridge_nativeDispatchEvent(
    JNIEnv *env, jobject thiz, jlong handle, jint node_id, jstring event_name, jstring payload_json) {
    LiquidRuntimeContext *lctx = (LiquidRuntimeContext *)(intptr_t)handle;
    if (!lctx || !lctx->ctx) {
        LOGE("[LiquidDbg] nativeDispatchEvent: invalid runtime handle");
        return JNI_FALSE;
    }

    const char *c_event = (*env)->GetStringUTFChars(env, event_name, NULL);
    const char *c_payload = (*env)->GetStringUTFChars(env, payload_json, NULL);

    LOGI("[LiquidDbg] nativeDispatchEvent: nodeId=%d, event='%s'", node_id, c_event);

    char call_buf[1024];
    snprintf(call_buf, sizeof(call_buf),
             "if (typeof globalThis.__liquid_dispatch_event === 'function') {\n"
             "  globalThis.__liquid_dispatch_event(%d, '%s', %s);\n"
             "} else {\n"
             "  console.error('[LiquidDbg] __liquid_dispatch_event function is not defined!');\n"
             "}",
             node_id, c_event, (c_payload && strlen(c_payload) > 0) ? c_payload : "{}");

    JSValue val = JS_Eval(lctx->ctx, call_buf, strlen(call_buf), "<event_dispatch>", JS_EVAL_TYPE_GLOBAL);
    pump_pending_jobs(lctx->ctx);

    int success = !JS_IsException(val);
    if (!success) {
        JSValue ex = JS_GetException(lctx->ctx);
        const char *ex_str = JS_ToCString(lctx->ctx, ex);
        LOGE("[LiquidDbg] Event dispatch JS Exception: %s", ex_str ? ex_str : "unknown");
        if (ex_str) JS_FreeCString(lctx->ctx, ex_str);
        JS_FreeValue(lctx->ctx, ex);
    }

    JS_FreeValue(lctx->ctx, val);
    (*env)->ReleaseStringUTFChars(env, event_name, c_event);
    (*env)->ReleaseStringUTFChars(env, payload_json, c_payload);

    return success ? JNI_TRUE : JNI_FALSE;
}
