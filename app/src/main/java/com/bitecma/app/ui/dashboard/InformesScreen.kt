package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

data class Informe(
    val id: String,
    val titulo: String,
    val fecha: String,
    val tipo: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InformesScreen(navController: NavController, userId: Int) {
    val informes = listOf(
        Informe("INF-001", "Reporte Mensual Abril", "2026-04-30", "PDF"),
        Informe("INF-002", "Resumen Capturas Chan-chan", "2026-04-21", "Excel"),
        Informe("INF-003", "Densidad Poblacional Erizo", "2026-04-15", "PDF")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Informes y Reportes", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
        ) {
            Text("Listado de Informes", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Descarga y visualiza reportes generados", color = Color.Gray, fontSize = 12.sp)
            
            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(informes) { informe ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (informe.tipo == "PDF") Icons.Default.Description else Icons.Default.TableChart,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(informe.titulo, fontWeight = FontWeight.Bold)
                                Text("${informe.fecha} · ${informe.id}", fontSize = 12.sp, color = Color.Gray)
                            }
                            IconButton(onClick = { /* Simular descarga */ }) {
                                Icon(Icons.Default.Download, contentDescription = "Descargar")
                            }
                        }
                    }
                }
            }
        }
    }
}
