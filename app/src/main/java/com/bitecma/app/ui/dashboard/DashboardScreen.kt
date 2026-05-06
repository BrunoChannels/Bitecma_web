package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.ui.text.style.TextAlign
import com.bitecma.app.data.PerfilesData
import com.bitecma.app.data.DataManager
import com.bitecma.app.data.AppState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    navController: NavController, 
    userId: Int,
    isDarkMode: Boolean,
    onDarkModeChange: (Boolean) -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val user = PerfilesData.perfiles.find { it.id == userId }
    
    // Métricas Reales del Dashboard (Centralizadas)
    val totalOps = DataManager.operaciones.size
    val totalMuestras = 1076 
    val unidadesDensidad = 115 

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface,
                modifier = Modifier.width(280.dp)
            ) {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    "BITECMA", 
                    fontSize = 24.sp, 
                    fontWeight = FontWeight.Bold, 
                    modifier = Modifier.padding(16.dp), 
                    color = if (isDarkMode) Color.White else Color(0xFF003366)
                )
                Divider()
                
                val menuItems = listOf(
                    "Dashboard" to "dashboard/$userId",
                    "Proceso" to "proceso/$userId",
                    "Operaciones" to "operaciones/$userId",
                    "Especies" to "especies/$userId",
                    "Botes" to "botes/$userId",
                    "Documentos" to "documentos/$userId",
                    "Informes" to "informes/$userId",
                    "Ingresos" to "ingresos/$userId"
                )
                
                menuItems.forEach { (title, route) ->
                    NavigationDrawerItem(
                        label = { Text(title) },
                        selected = title == "Dashboard",
                        onClick = {
                            scope.launch { drawerState.close() }
                            if (route != null && title != "Dashboard") {
                                navController.navigate(route)
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.weight(1f))
                
                // Indicador de Estado de Conexión (Online/Offline)
                Surface(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .fillMaxWidth(),
                    color = if (AppState.isOnline) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    if (AppState.isOnline) Color(0xFF2E7D32) else Color(0xFFC62828),
                                    shape = androidx.compose.foundation.shape.CircleShape
                                )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (AppState.isOnline) "MODO ONLINE" else "MODO OFFLINE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (AppState.isOnline) Color(0xFF2E7D32) else Color(0xFFC62828)
                        )
                    }
                }

                // Botón de Modo Oscuro Estático en la parte inferior
                NavigationDrawerItem(
                    label = { 
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                                contentDescription = null
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(if (isDarkMode) "Modo Claro" else "Modo Oscuro")
                        }
                    },
                    selected = false,
                    onClick = {
                        onDarkModeChange(!isDarkMode)
                    },
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )

                Divider()
                NavigationDrawerItem(
                    label = { Text("Cerrar sesión", color = Color.Red) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        navController.navigate("login") {
                            popUpTo(0)
                        }
                    },
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Dashboard", color = Color.White) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menú", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF003366))
                )
            }
        ) { padding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background)
                    .padding(16.dp)
            ) {
                item {
                    Text("Dashboard", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("Resumen operacional · EVADIR importados", color = Color.Gray, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Summary Cards (Replica Foto 3)
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        SummaryCard(
                            title = "OPERACIONES",
                            value = totalOps.toString(),
                            subtitle = "Total registradas",
                            color = Color(0xFF00897B),
                            isDarkMode = isDarkMode,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        SummaryCard(
                            title = "MUESTRAS L-P",
                            value = "1.076",
                            subtitle = "Subconjunto L-P",
                            color = Color(0xFF003366),
                            isDarkMode = isDarkMode,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        SummaryCard(
                            title = "DENSIDAD",
                            value = "115",
                            subtitle = "Unidades registradas",
                            color = Color(0xFF7E57C2),
                            isDarkMode = isDarkMode,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Recent Operations y Gráfico (Replica Foto 3)
                item {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        // Tabla Operaciones Recientes
                        Card(
                            modifier = Modifier.weight(1.5f),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("OPERACIONES RECIENTES", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Gray)
                                    TextButton(onClick = { navController.navigate("operaciones/$userId") }) {
                                        Text("Ver todas", fontSize = 12.sp)
                                    }
                                }
                                Divider(modifier = Modifier.padding(vertical = 8.dp))
                                
                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Text("ID", modifier = Modifier.weight(1.5f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    Text("SECTOR", modifier = Modifier.weight(1.5f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    Text("FECHA", modifier = Modifier.weight(1.5f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    Text("BOTES", modifier = Modifier.weight(0.8f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                                
                                DataManager.operaciones.take(5).forEach { op ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                        Text(op.id, modifier = Modifier.weight(1.5f), fontSize = 11.sp)
                                        Text(op.sector, modifier = Modifier.weight(1.5f), fontSize = 11.sp)
                                        Text(op.fechaInicio, modifier = Modifier.weight(1.5f), fontSize = 11.sp)
                                        Text(op.botes.size.toString(), modifier = Modifier.weight(0.8f), fontSize = 11.sp)
                                    }
                                }
                                
                                if (DataManager.operaciones.isEmpty()) {
                                    Text("Sin operaciones", modifier = Modifier.fillMaxWidth().padding(16.dp), textAlign = TextAlign.Center, color = Color.Gray)
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.width(16.dp))

                        // Gráfico de Composición (Foto 3)
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("COMPOSICIÓN POR ESPECIE", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Gray)
                                Divider(modifier = Modifier.padding(vertical = 8.dp))
                                
                                // Simulación de Barras del Gráfico (Foto 3)
                                listOf(
                                    "Choro" to 0.8f, "Erizo" to 0.75f, "Loco" to 0.7f, "Lapa" to 0.4f, "Macha" to 0.2f
                                ).forEach { (name, ratio) ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically, 
                                        modifier = Modifier.padding(vertical = 6.dp)
                                    ) {
                                        Text(name, modifier = Modifier.width(50.dp), fontSize = 10.sp, fontWeight = FontWeight.Medium)
                                        Box(modifier = Modifier.fillMaxWidth()) {
                                            LinearProgressIndicator(
                                                progress = ratio,
                                                modifier = Modifier.fillMaxWidth().height(12.dp),
                                                color = when {
                                                    ratio > 0.7f -> Color(0xFF2D6A4F)
                                                    ratio > 0.4f -> Color(0xFF003366)
                                                    else -> Color(0xFF7E57C2)
                                                },
                                                trackColor = Color(0xFFEEEEEE)
                                            )
                                            Text(
                                                text = "${(ratio * 100).toInt()}%",
                                                modifier = Modifier.align(Alignment.CenterEnd).padding(end = 4.dp),
                                                fontSize = 8.sp,
                                                color = if (ratio > 0.5f) Color.White else Color.Black
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryCard(title: String, value: String, subtitle: String, color: Color, isDarkMode: Boolean, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.height(100.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isDarkMode) Color(0xFF1E1E1E) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(title, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(value, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color.Gray, fontSize = 10.sp)
        }
    }
}
