package com.liquid.dev

import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.Socket
import java.net.URI
import java.security.SecureRandom
import javax.net.ssl.SSLSocketFactory

interface LiquidWebSocketListener {
    fun onOpen()
    fun onMessage(text: String)
    fun onClose(code: Int, reason: String)
    fun onError(t: Throwable)
}

class LiquidWebSocketClient(
    private val endpointUrl: String,
    private val listener: LiquidWebSocketListener,
    private val autoReconnect: Boolean = true
) {
    private val TAG = "LiquidWS"
    private var socket: Socket? = null
    private var outputStream: OutputStream? = null
    private var isConnected = false
    private var isClosedExplicitly = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val random = SecureRandom()
    private var workerThread: Thread? = null

    fun connect() {
        isClosedExplicitly = false
        workerThread = Thread({
            try {
                runConnection()
            } catch (t: Throwable) {
                if (!isClosedExplicitly) {
                    Log.e(TAG, "WebSocket error: ${t.message}", t)
                    mainHandler.post { listener.onError(t) }
                    scheduleReconnect()
                }
            }
        }, "LiquidWebSocketThread").apply { start() }
    }

    private fun runConnection() {
        val uri = URI(endpointUrl.replace("ws://", "http://").replace("wss://", "https://"))
        val isSecure = endpointUrl.startsWith("wss://")
        val host = uri.host ?: "127.0.0.1"
        val port = if (uri.port > 0) uri.port else if (isSecure) 443 else 80
        val path = if (uri.rawPath.isNullOrEmpty()) "/" else uri.rawPath
        val query = if (uri.rawQuery.isNullOrEmpty()) "" else "?${uri.rawQuery}"
        val fullPath = "$path$query"

        val rawSocket = if (isSecure) {
            SSLSocketFactory.getDefault().createSocket(host, port)
        } else {
            Socket(host, port)
        }
        rawSocket.tcpNoDelay = true
        rawSocket.soTimeout = 0
        socket = rawSocket

        val out = BufferedOutputStream(rawSocket.getOutputStream())
        outputStream = out
        val inStream = BufferedInputStream(rawSocket.getInputStream())

        // Handshake
        val nonce = ByteArray(16).apply { random.nextBytes(this) }
        val secKey = Base64.encodeToString(nonce, Base64.NO_WRAP)

        val handshake = StringBuilder().apply {
            append("GET $fullPath HTTP/1.1\r\n")
            append("Host: $host:$port\r\n")
            append("Upgrade: websocket\r\n")
            append("Connection: Upgrade\r\n")
            append("Sec-WebSocket-Key: $secKey\r\n")
            append("Sec-WebSocket-Version: 13\r\n")
            append("\r\n")
        }.toString()

        out.write(handshake.toByteArray(Charsets.US_ASCII))
        out.flush()

        // Read handshake response
        val responseHeaders = readHeaders(inStream)
        if (!responseHeaders.contains("101")) {
            throw IllegalStateException("Server rejected WebSocket handshake: $responseHeaders")
        }

        isConnected = true
        mainHandler.post { listener.onOpen() }

        // Frame read loop
        while (!isClosedExplicitly && !rawSocket.isClosed) {
            val b0 = inStream.read()
            if (b0 == -1) break
            val b1 = inStream.read()
            if (b1 == -1) break

            val fin = (b0 and 0x80) != 0
            val opcode = b0 and 0x0F
            val masked = (b1 and 0x80) != 0
            var payloadLen = (b1 and 0x7F).toLong()

            if (payloadLen == 126L) {
                val len0 = inStream.read()
                val len1 = inStream.read()
                if (len0 == -1 || len1 == -1) break
                payloadLen = ((len0 shl 8) or len1).toLong()
            } else if (payloadLen == 127L) {
                var len: Long = 0
                for (i in 0 until 8) {
                    val b = inStream.read()
                    if (b == -1) break
                    len = (len shl 8) or (b.toLong() and 0xFF)
                }
                payloadLen = len
            }

            val mask = ByteArray(4)
            if (masked) {
                readFully(inStream, mask)
            }

            val payload = ByteArray(payloadLen.toInt())
            readFully(inStream, payload)

            if (masked) {
                for (i in payload.indices) {
                    payload[i] = (payload[i].toInt() xor mask[i % 4].toInt()).toByte()
                }
            }

            when (opcode) {
                0x01 -> { // Text frame
                    val text = String(payload, Charsets.UTF_8)
                    mainHandler.post { listener.onMessage(text) }
                }
                0x08 -> { // Close frame
                    val code = if (payload.size >= 2) {
                        ((payload[0].toInt() and 0xFF) shl 8) or (payload[1].toInt() and 0xFF)
                    } else 1000
                    val reason = if (payload.size > 2) {
                        String(payload, 2, payload.size - 2, Charsets.UTF_8)
                    } else "Closed"
                    mainHandler.post { listener.onClose(code, reason) }
                    break
                }
                0x09 -> { // Ping frame -> send Pong
                    sendRawFrame(0x0A, payload)
                }
                0x0A -> { // Pong frame -> ignore
                }
            }
        }

        cleanupSocket()
        if (!isClosedExplicitly) {
            mainHandler.post { listener.onClose(1006, "Abnormal closure") }
            scheduleReconnect()
        }
    }

    @Synchronized
    fun send(text: String) {
        val payload = text.toByteArray(Charsets.UTF_8)
        sendRawFrame(0x01, payload)
    }

    @Synchronized
    private fun sendRawFrame(opcode: Int, payload: ByteArray) {
        val out = outputStream ?: return
        try {
            val b0 = 0x80 or (opcode and 0x0F) // FIN = 1
            out.write(b0)

            val mask = ByteArray(4).apply { random.nextBytes(this) }
            val len = payload.size

            if (len < 126) {
                out.write(0x80 or len)
            } else if (len <= 0xFFFF) {
                out.write(0x80 or 126)
                out.write((len shr 8) and 0xFF)
                out.write(len and 0xFF)
            } else {
                out.write(0x80 or 127)
                for (i in 7 downTo 0) {
                    out.write(((len.toLong() shr (i * 8)) and 0xFF).toInt())
                }
            }

            out.write(mask)

            val masked = ByteArray(payload.size)
            for (i in payload.indices) {
                masked[i] = (payload[i].toInt() xor mask[i % 4].toInt()).toByte()
            }
            out.write(masked)
            out.flush()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send frame: ${e.message}")
        }
    }

    private fun readHeaders(stream: InputStream): String {
        val sb = StringBuilder()
        var lastFour = 0
        while (true) {
            val b = stream.read()
            if (b == -1) break
            sb.append(b.toChar())
            lastFour = (lastFour shl 8) or (b and 0xFF)
            if (lastFour == 0x0D0A0D0A) break // \r\n\r\n
        }
        return sb.toString()
    }

    private fun readFully(stream: InputStream, buffer: ByteArray) {
        var offset = 0
        while (offset < buffer.size) {
            val read = stream.read(buffer, offset, buffer.size - offset)
            if (read == -1) throw IllegalStateException("Unexpected EOF in WebSocket frame")
            offset += read
        }
    }

    private fun scheduleReconnect() {
        if (!autoReconnect || isClosedExplicitly) return
        mainHandler.postDelayed({
            if (!isClosedExplicitly && !isConnected) {
                Log.i(TAG, "Reconnecting to $endpointUrl...")
                connect()
            }
        }, 2000)
    }

    private fun cleanupSocket() {
        isConnected = false
        try { socket?.close() } catch (_: Exception) {}
        socket = null
        outputStream = null
    }

    fun close() {
        isClosedExplicitly = true
        cleanupSocket()
        workerThread?.interrupt()
    }
}
