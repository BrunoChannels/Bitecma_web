package com.bitecma.app.ui.dashboard
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EvadirScreen(navController: NavController, opId: String) {
    val scrollState = rememberScrollState()
    
    // Mock de datos de la tabla EVADIR (Basado en la estructura web)
    val evadirData = listOf(
        mapOf("ITEM" to "1", "FECHA" to "21/04/2026", "BOTE" to "5MENTARIO", "ESPECIE" to "Loco", "CANT" to "150", "UNID" to "Unid"),
        mapOf("ITEM" to "2", "FECHA" to "21/04/2026", "BOTE" to "ABDON I", "ESPECIE" to "Erizo", "CANT" to "45", "UNID" to "Kg"),
        mapOf("ITEM" to "3", "FECHA" to "22/04/2026", "BOTE" to "ABRAHAM", "ESPECIE" to "Lapa", "CANT" to "12", "UNID" to "Kg")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Previsualización EVADIR", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { /* Lógica para descargar PDF/Excel */ }) {
                        Icon(Icons.Default.Download, contentDescription = "Descargar", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF00897B))
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
            Text("Operación: $opId", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Resumen de capturas para exportación a plataforma SERNAPESCA", color = Color.Gray, fontSize = 12.sp)
            
            Spacer(modifier = Modifier.height(16.dp))

            // Tabla con scroll horizontal
            Box(modifier = Modifier.fillMaxSize().horizontalScroll(scrollState)) {
                Column {
                    // Cabecera
                    Row(
                        modifier = Modifier
                            .background(Color(0xFF003366), RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                            .padding(12.dp)
                    ) {
                        TableCell("ITEM", weight = 0.5f)
                        TableCell("FECHA", weight = 1.2f)
                        TableCell("BOTE", weight = 1.5f)
                        TableCell("ESPECIE", weight = 1.2f)
                        TableCell("CANTIDAD", weight = 1f)
                        TableCell("UNIDAD", weight = 0.8f)
                    }

                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(evadirData) { row ->
                            Row(
                                modifier = Modifier
                                    .padding(horizontal = 4.dp)
                                    .background(Color.White)
                                    .padding(vertical = 12.dp)
                            ) {
                                TableCell(row["ITEM"] ?: "", weight = 0.5f, isContent = true)
                                TableCell(row["FECHA"] ?: "", weight = 1.2f, isContent = true)
                                TableCell(row["BOTE"] ?: "", weight = 1.5f, isContent = true)
                                TableCell(row["ESPECIE"] ?: "", weight = 1.2f, isContent = true)
                                TableCell(row["CANT"] ?: "", weight = 1f, isContent = true)
                                TableCell(row["UNID"] ?: "", weight = 0.8f, isContent = true)
                            }
                            Divider(color = Color(0xFFEEEEEE))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RowScope.TableCell(text: String, weight: Float, isContent: Boolean = false) {
    Text(
        text = text,
        modifier = Modifier.weight(weight).padding(horizontal = 8.dp),
        fontSize = if (isContent) 11.sp else 10.sp,
        fontWeight = if (isContent) FontWeight.Normal else FontWeight.Bold,
        color = if (isContent) Color.Black else Color.White
    )
}
