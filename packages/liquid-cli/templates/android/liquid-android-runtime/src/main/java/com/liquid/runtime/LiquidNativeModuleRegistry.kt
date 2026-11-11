package com.liquid.runtime

interface LiquidNativeModule {
    val name: String
    val version: String
    fun invoke(method: String, argsJson: String): String
}

object LiquidNativeModuleRegistry {
    private val modules = mutableMapOf<String, LiquidNativeModule>()

    fun register(module: LiquidNativeModule) {
        modules[module.name] = module
    }

    fun unregister(name: String) {
        modules.remove(name)
    }

    fun get(name: String): LiquidNativeModule? = modules[name]

    fun getAll(): List<LiquidNativeModule> = modules.values.toList()

    fun invokeModuleMethod(moduleName: String, method: String, argsJson: String): String {
        val mod = modules[moduleName] ?: return "{\"error\":\"Module not found: $moduleName\"}"
        return try {
            mod.invoke(method, argsJson)
        } catch (e: Exception) {
            "{\"error\":\"${e.message}\"}"
        }
    }
}
