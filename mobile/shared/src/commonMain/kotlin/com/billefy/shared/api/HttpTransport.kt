package com.billefy.shared.api

import io.ktor.client.HttpClient
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.ContentType

/** Platform code supplies an HttpClient configured with its Ktor engine. */
class KtorHttpTransport(private val client: HttpClient) : HttpTransport {
    override suspend fun execute(request: HttpRequest): HttpResponse {
        val response = client.request(request.url) {
            method = HttpMethod.parse(request.method)
            request.headers.forEach { (name, value) -> headers.append(name, value) }
            if (request.body != null) {
                contentType(ContentType.Application.Json)
                setBody(request.body)
            }
        }
        return HttpResponse(response.status.value, response.bodyAsText())
    }
}

data class HttpRequest(
    val method: String,
    val url: String,
    val path: String,
    val headers: Map<String, String> = emptyMap(),
    val body: String? = null
)

data class HttpResponse(val status: Int, val body: String)

interface HttpTransport {
    suspend fun execute(request: HttpRequest): HttpResponse
}

internal fun apiUrl(baseUrl: String, path: String): String =
    baseUrl.trimEnd('/') + "/" + path.trimStart('/')

internal fun jsonHeaders(): Map<String, String> = mapOf(
    HttpHeaders.Accept to ContentType.Application.Json.toString(),
    HttpHeaders.ContentType to ContentType.Application.Json.toString()
)
