package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.bitecma.app.data.DataManager

data class BoteMaestro(
    val nombre: String,
    val caleta: String,
    val rpa: String,
    val matricula: String,
    val regionId: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BotesScreen(navController: NavController, userId: Int) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedRegion by remember { mutableStateOf("I — Tarapacá") }
    var selectedBote by remember { mutableStateOf<BoteMaestro?>(null) }
    
    val regiones = listOf(
        "I — Tarapacá", "II — Antofagasta", "III — Atacama", "IV — Coquimbo", 
        "V — Valparaíso", "VI — O'Higgins", "VII — Maule", "VIII — Biobío",
        "IX — La Araucanía", "X — Los Lagos", "XI — Aysén", "XII — Magallanes",
        "XIV — Los Ríos", "XV — Arica y Parinacota", "XVI — Ñuble"
    )

    // Usar DataManager para centralizar datos
    val botesData = DataManager.botes

    val filteredBotes = botesData.filter { 
        it.regionId == selectedRegion && 
        (it.nombre.contains(searchQuery, ignoreCase = true) || 
         it.rpa.contains(searchQuery) || 
         it.matricula.contains(searchQuery))
    }

    if (selectedBote != null) {
        AlertDialog(
            onDismissRequest = { selectedBote = null },
            title = { Text(selectedBote!!.nombre, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    DetailRow("Caleta:", selectedBote!!.caleta)
                    DetailRow("RPA:", selectedBote!!.rpa)
                    DetailRow("Matrícula:", selectedBote!!.matricula)
                    DetailRow("Región:", selectedBote!!.regionId)
                }
            },
            confirmButton = {
                Button(onClick = { selectedBote = null }) {
                    Text("Cerrar")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Botes", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        }
    ) { padding ->
        Row(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Sidebar de Regiones
            Column(
                modifier = Modifier
                    .width(180.dp)
                    .fillMaxHeight()
                    .background(Color(0xFFF8F9FA))
                    .padding(8.dp)
            ) {
                LazyColumn {
                    items(regiones) { region ->
                        val isSelected = region == selectedRegion
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp)
                                .clickable { selectedRegion = region },
                            color = if (isSelected) Color(0xFFE0F2F1) else Color.Transparent,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = region,
                                modifier = Modifier.padding(12.dp),
                                fontSize = 12.sp,
                                color = if (isSelected) Color(0xFF00897B) else Color.DarkGray,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            // Contenido Principal
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Buscar por nombre, RPA o matrícula...") },
                    modifier = Modifier.fillMaxWidth(),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Cabecera de Tabla
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF1F3F4), RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                        .padding(12.dp)
                ) {
                    Text("NOMBRE", modifier = Modifier.weight(1.5f), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("CALETA", modifier = Modifier.weight(1.2f), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("RPA", modifier = Modifier.weight(1f), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Text("MATRÍCULA", modifier = Modifier.weight(1f), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                }

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(filteredBotes) { bote ->
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedBote = bote }
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(bote.nombre, modifier = Modifier.weight(1.5f), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                Text(bote.caleta, modifier = Modifier.weight(1.2f), fontSize = 11.sp)
                                Text(bote.rpa, modifier = Modifier.weight(1f), fontSize = 11.sp)
                                Text(bote.matricula, modifier = Modifier.weight(1f), fontSize = 11.sp)
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
fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(text = label, fontWeight = FontWeight.Bold, modifier = Modifier.width(100.dp), fontSize = 14.sp)
        Text(text = value, fontSize = 14.sp)
    }
}
