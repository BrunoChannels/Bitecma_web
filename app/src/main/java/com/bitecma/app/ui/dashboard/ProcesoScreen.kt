package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.bitecma.app.data.PerfilesData
import com.bitecma.app.data.DataManager
import com.bitecma.app.network.OperacionDto

data class OperacionLocal(
    val id: Int,
    var sector: String,
    var fecha: String,
    var botes: Int,
    var estado: String = "Pendiente"
)

object OperacionesData {
    val lista = mutableStateListOf<OperacionLocal>()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcesoScreen(navController: NavController, userId: Int) {
    val user = PerfilesData.perfiles.find { it.id == userId }
    val isAdmin = user?.rol == "Admin"
    
    var showDialog by remember { mutableStateOf(false) }
    var editingOp by remember { mutableStateOf<OperacionDto?>(null) }
    
    var sectorInput by remember { mutableStateOf("") }
    var fechaInput by remember { mutableStateOf("") }
    var botesInput by remember { mutableStateOf("") }
    var inputErrorMessage by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Proceso de Operaciones", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { 
                    editingOp = null
                    sectorInput = ""
                    fechaInput = ""
                    botesInput = ""
                    showDialog = true 
                },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nueva Operación", tint = Color.White)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp)
        ) {
            Text("Operaciones Registradas", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(16.dp))
            
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(DataManager.operaciones) { op ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Sector: ${op.sector}", fontWeight = FontWeight.Bold)
                                Text("Fecha: ${op.fechaInicio}", fontSize = 12.sp, color = Color.Gray)
                                Text("Botes: ${op.botes.size}", fontSize = 12.sp, color = Color.Gray)
                            }
                            
                            if (isAdmin) {
                                IconButton(onClick = {
                                    editingOp = op
                                    sectorInput = op.sector
                                    fechaInput = op.fechaInicio
                                    botesInput = op.botes.size.toString()
                                    showDialog = true
                                }) {
                                    Icon(Icons.Default.Edit, contentDescription = "Editar", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }

        if (showDialog) {
            AlertDialog(
                onDismissRequest = { showDialog = false },
                title = { Text(if (editingOp == null) "Nueva Operación" else "Editar Operación") },
                text = {
                    Column {
                        OutlinedTextField(
                            value = sectorInput,
                            onValueChange = { sectorInput = it },
                            label = { Text("Sector") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = fechaInput,
                            onValueChange = { fechaInput = it },
                            label = { Text("Fecha (AAAA-MM-DD)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = botesInput,
                            onValueChange = { botesInput = it },
                            label = { Text("Número de Botes") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        if (inputErrorMessage.isNotEmpty()) {
                            Text(
                                text = inputErrorMessage,
                                color = Color.Red,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = {
                        val sector = sectorInput.trim()
                        val fecha = fechaInput.trim()
                        val botesNum = botesInput.toIntOrNull() ?: 0

                        // Validaciones Alfanuméricas para Sector
                        val sectorRegex = "^[a-zA-Z0-9 ]+$".toRegex()
                        
                        // Validación de Fecha AAAA-MM-DD
                        val fechaRegex = "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$".toRegex()

                        if (sector.isEmpty() || !sector.matches(sectorRegex)) {
                            inputErrorMessage = "El sector debe ser alfanumérico y no estar vacío."
                            return@Button
                        }

                        if (!fecha.matches(fechaRegex)) {
                            inputErrorMessage = "Formato de fecha inválido (Use AAAA-MM-DD)."
                            return@Button
                        }

                        if (botesInput.isEmpty() || botesNum < 0) {
                            inputErrorMessage = "Ingrese un número válido de botes."
                            return@Button
                        }

                        if (editingOp == null) {
                            DataManager.operaciones.add(
                                OperacionDto(
                                    id = "OP-LOCAL-${DataManager.operaciones.size + 1}",
                                    region = "Región Local",
                                    sector = sector,
                                    caleta = "Caleta Local",
                                    fechaInicio = fecha,
                                    fechaFin = fecha,
                                    botes = List(botesNum) { com.bitecma.app.network.BoteDto("Bote $it", "Zona", "Buzo", "Tipo") }
                                )
                            )
                        } else {
                            // En una app real, aquí se actualizaría el objeto reactivo
                            // Para mock, simplemente removemos y agregamos o actualizamos si es mutable
                            val index = DataManager.operaciones.indexOf(editingOp)
                            if (index != -1) {
                                DataManager.operaciones[index] = editingOp!!.copy(
                                    sector = sector,
                                    fechaInicio = fecha,
                                    botes = List(botesNum) { com.bitecma.app.network.BoteDto("Bote $it", "Zona", "Buzo", "Tipo") }
                                )
                            }
                        }
                        inputErrorMessage = ""
                        showDialog = false
                    }) {
                        Text("Guardar")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDialog = false }) {
                        Text("Cancelar")
                    }
                }
            )
        }
    }
}
