package com.liquid.runtime

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

data class BundleManifest(
    val name: String,
    val version: String,
    val entry: String,
    val runtimeVersion: String,
    val requiredPermissions: List<String>,
    val assets: List<String>
) {
    companion object {
        fun fromJson(jsonStr: String): BundleManifest {
            val json = JSONObject(jsonStr)
            val perms = mutableListOf<String>()
            val permArray = json.optJSONArray("requiredPermissions")
            if (permArray != null) {
                for (i in 0 until permArray.length()) perms.add(permArray.getString(i))
            }
            val assetsList = mutableListOf<String>()
            val assetArray = json.optJSONArray("assets")
            if (assetArray != null) {
                for (i in 0 until assetArray.length()) assetsList.add(assetArray.getString(i))
            }
            return BundleManifest(
                name = json.optString("name", "Liquid App"),
                version = json.optString("version", "1.0.0"),
                entry = json.optString("entry", "main.bundle.js"),
                runtimeVersion = json.optString("runtimeVersion", "1.0"),
                requiredPermissions = perms,
                assets = assetsList
            )
        }
    }
}

sealed class BundleContent {
    data class SourceCode(val code: String, val filename: String) : BundleContent()
    data class Bytecode(val bytes: ByteArray, val filename: String) : BundleContent()
}

interface BundleSource {
    fun loadManifest(): BundleManifest
    fun loadBundle(): BundleContent
}

class AssetBundleSource(
    private val context: Context,
    private val assetPath: String = "main.bundle.js",
    private val bytecodePath: String = "main.bundle.qbc",
    private val manifestPath: String = "liquid.manifest.json"
) : BundleSource {

    override fun loadManifest(): BundleManifest {
        return try {
            val stream = context.assets.open(manifestPath)
            val reader = BufferedReader(InputStreamReader(stream))
            val text = reader.readText()
            reader.close()
            BundleManifest.fromJson(text)
        } catch (e: Exception) {
            BundleManifest("Liquid App", "1.0.0", assetPath, "1.0", emptyList(), emptyList())
        }
    }

    override fun loadBundle(): BundleContent {
        // Prefer bytecode if present (release builds)
        return try {
            val stream = context.assets.open(bytecodePath)
            val bytes = stream.readBytes()
            stream.close()
            BundleContent.Bytecode(bytes, bytecodePath)
        } catch (e: Exception) {
            // Fallback to plain source (debug builds)
            val stream = context.assets.open(assetPath)
            val reader = BufferedReader(InputStreamReader(stream))
            val code = reader.readText()
            reader.close()
            BundleContent.SourceCode(code, assetPath)
        }
    }
}

class NetworkBundleSource(
    private val bundleUrl: String
) : BundleSource {

    override fun loadManifest(): BundleManifest {
        val manifestUrl = if (bundleUrl.endsWith(".js")) {
            bundleUrl.substringBeforeLast("/") + "/liquid.manifest.json"
        } else "$bundleUrl/liquid.manifest.json"

        return try {
            val conn = URL(manifestUrl).openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            val text = conn.inputStream.bufferedReader().readText()
            BundleManifest.fromJson(text)
        } catch (e: Exception) {
            BundleManifest("Remote App", "1.0.0", bundleUrl, "1.0", emptyList(), emptyList())
        }
    }

    override fun loadBundle(): BundleContent {
        val conn = URL(bundleUrl).openConnection() as HttpURLConnection
        conn.connectTimeout = 5000
        val text = conn.inputStream.bufferedReader().readText()
        return BundleContent.SourceCode(text, bundleUrl)
    }
}
