package com.bitecma.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.*
import com.bitecma.app.ui.login.LoginScreen
import com.bitecma.app.ui.dashboard.DashboardScreen
import com.bitecma.app.ui.admin.AdminScreen
import com.bitecma.app.ui.login.ForgotPasswordScreen
import com.bitecma.app.ui.dashboard.ProcesoScreen
import com.bitecma.app.ui.dashboard.GenericIngresoScreen
import com.bitecma.app.ui.dashboard.OperacionesScreen
import com.bitecma.app.ui.dashboard.BotesScreen
import com.bitecma.app.ui.dashboard.EspeciesScreen
import com.bitecma.app.ui.dashboard.EvadirScreen
import com.bitecma.app.ui.dashboard.InformesScreen
import com.bitecma.app.ui.dashboard.IngresosScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var isDarkMode by remember { mutableStateOf(false) }
            
            val navyBlue = Color(0xFF1B263B) // Azul marino relajante
            val softGray = Color(0xFFF5F5F5) // Gris suave para la vista

            val colorScheme = if (isDarkMode) {
                darkColorScheme(
                    primary = Color(0xFF415A77),
                    background = navyBlue,
                    surface = Color(0xFF0D1B2A)
                )
            } else {
                lightColorScheme(
                    primary = Color(0xFF003366),
                    background = softGray,
                    surface = Color.White
                )
            }
            
            MaterialTheme(colorScheme = colorScheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    NavHost(navController = navController, startDestination = "login") {
                        composable("login") { LoginScreen(navController) }
                        composable("forgot_password/{email}") { backStackEntry ->
                            val email = backStackEntry.arguments?.getString("email") ?: ""
                            ForgotPasswordScreen(navController, email)
                        }
                        composable("dashboard/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            DashboardScreen(navController, userId, isDarkMode, onDarkModeChange = { isDarkMode = it })
                        }
                        composable("proceso/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            ProcesoScreen(navController, userId)
                        }
                        composable("operaciones/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            OperacionesScreen(navController, userId)
                        }
                        composable("especies/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            EspeciesScreen(navController, userId)
                        }
                        composable("botes/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            BotesScreen(navController, userId)
                        }
                        composable("documentos/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            GenericIngresoScreen(navController, "Documentos", "documentos")
                        }
                        composable("informes/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            InformesScreen(navController, userId)
                        }
                        composable("ingresos/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            IngresosScreen(navController, userId)
                        }
                        composable("admin/{userId}") { backStackEntry ->
                            val userId = backStackEntry.arguments?.getString("userId")?.toIntOrNull() ?: 0
                            AdminScreen(navController, userId)
                        }
                        composable("evadir/{opId}") { backStackEntry ->
                            val opId = backStackEntry.arguments?.getString("opId") ?: ""
                            EvadirScreen(navController, opId)
                        }
                    }
                }
            }
        }
    }
}
