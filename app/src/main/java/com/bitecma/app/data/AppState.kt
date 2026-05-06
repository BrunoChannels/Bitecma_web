package com.bitecma.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object AppState {
    // Estado global de la conexión
    var isOnline by mutableStateOf(false)
    
    // Usuario actualmente logueado
    var currentUserId by mutableStateOf<Int?>(null)
}
