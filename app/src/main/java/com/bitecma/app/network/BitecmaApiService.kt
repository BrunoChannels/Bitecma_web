package com.bitecma.app.network

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

// Modelos de Datos para la API
data class LoginRequest(
    val correo: String,
    val contrasena: String
)

data class LoginResponse(
    val success: Boolean? = false,
    val message: String? = null,
    val user: UserDto? = null
)

data class UserDto(
    val id: Int? = 0,
    val nombre: String? = null,
    val correo: String? = null,
    val rol: String? = null
)

data class DocumentoRequest(
    val titulo: String,
    val descripcion: String,
    val userId: Int
)

data class ApiResponse(
    val success: Boolean? = false,
    val message: String? = null
)

// Interface de la API de Bitecma
interface BitecmaApiService {
    
    @POST("login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("operaciones")
    suspend fun getOperaciones(): Response<List<OperacionDto>>

    @POST("operaciones/nueva")
    suspend fun crearOperacion(@Body operacion: OperacionDto): Response<ApiResponse>

    @POST("ingresos/datos")
    suspend fun enviarDatos(@Body datos: Map<String, String>): Response<ApiResponse>
}

data class OperacionDto(
    val id: String,
    val region: String,
    val sector: String,
    val caleta: String,
    val fechaInicio: String,
    val fechaFin: String,
    val botes: List<BoteDto> = emptyList()
)

data class BoteDto(
    val nombre: String,
    val zona: String,
    val buzo: String,
    val tipoUnidad: String,
    val especies: List<String> = emptyList()
)

// Cliente Retrofit
object RetrofitClient {
    private const val BASE_URL = "https://bitecma.cl/api/"

    val apiService: BitecmaApiService by lazy {
        retrofit2.Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
            .build()
            .create(BitecmaApiService::class.java)
    }
}
