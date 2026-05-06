package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.bitecma.app.network.BitecmaApiService
import com.bitecma.app.network.OperacionDto
import com.bitecma.app.network.RetrofitClient
import com.bitecma.app.data.DataManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OperacionesScreen(navController: NavController, userId: Int) {
    val scope = rememberCoroutineScope()
    var operaciones by remember { mutableStateOf<List<OperacionDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var expandedOpId by remember { mutableStateOf<String?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }

    // Campos para Nueva Operación
    var selectedRegion by remember { mutableStateOf("XIV — Los Ríos") }
    var selectedCaleta by remember { mutableStateOf("") }
    var sectorInput by remember { mutableStateOf("") }
    var fechaInicio by remember { mutableStateOf("") }
    var fechaFin by remember { mutableStateOf("") }

    val regiones = listOf(
        "I — Tarapacá", "II — Antofagasta", "III — Atacama", "IV — Coquimbo", 
        "V — Valparaíso", "VI — O'Higgins", "VII — Maule", "VIII — Biobío",
        "IX — La Araucanía", "X — Los Lagos", "XI — Aysén", "XII — Magallanes",
        "XIV — Los Ríos", "XV — Arica y Parinacota", "XVI — Ñuble"
    )

    // Carga inicial de datos (Híbrido API/Local)
    LaunchedEffect(Unit) {
        try {
            val response = RetrofitClient.apiService.getOperaciones()
            if (response.isSuccessful) {
                operaciones = response.body() ?: emptyList()
            }
        } catch (e: Exception) {
            // Usar DataManager para el respaldo local
            operaciones = DataManager.operaciones
        } finally {
            isLoading = false
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Nueva Operación") },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Región", fontSize = 12.sp, color = Color.Gray)
                    var expandedRegion by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(
                            onClick = { expandedRegion = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(selectedRegion)
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                        DropdownMenu(expanded = expandedRegion, onDismissRequest = { expandedRegion = false }) {
                            regiones.forEach { r ->
                                DropdownMenuItem(
                                    text = { Text(r) },
                                    onClick = { selectedRegion = r; expandedRegion = false }
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = sectorInput,
                        onValueChange = { sectorInput = it },
                        label = { Text("Sector / AMERB") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = selectedCaleta,
                        onValueChange = { selectedCaleta = it },
                        label = { Text("Caleta") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = fechaInicio,
                            onValueChange = { fechaInicio = it },
                            label = { Text("Inicio (YYYY-MM-DD)") },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("2026-05-06") }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        OutlinedTextField(
                            value = fechaFin,
                            onValueChange = { fechaFin = it },
                            label = { Text("Fin (YYYY-MM-DD)") },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("2026-05-06") }
                        )
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    // Simular guardado
                    val newOp = OperacionDto(
                        id = "OP-${(100..999).random()}",
                        region = selectedRegion,
                        sector = sectorInput,
                        caleta = selectedCaleta,
                        fechaInicio = fechaInicio,
                        fechaFin = fechaFin,
                        botes = emptyList()
                    )
                    operaciones = operaciones + newOp
                    showAddDialog = false
                }) {
                    Text("Guardar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Operaciones", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { showAddDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Nueva", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background)
                    .padding(16.dp)
            ) {
                item {
                    Text("Operaciones", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("Cada operación agrupa botes con sus datos técnicos", color = Color.Gray, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(16.dp))
                }

                items(operaciones) { op ->
                    OperacionCard(
                        op = op,
                        isExpanded = expandedOpId == op.id,
                        onExpandClick = { expandedOpId = if (expandedOpId == op.id) null else op.id },
                        onEvadirClick = { navController.navigate("evadir/${op.id}") }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
fun OperacionCard(op: OperacionDto, isExpanded: Boolean, onExpandClick: () -> Unit, onEvadirClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(op.region, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text("${op.sector} · ${op.fechaInicio}", fontSize = 12.sp, color = Color.Gray)
                }
                IconButton(onClick = onExpandClick) {
                    Icon(
                        if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = "Expandir"
                    )
                }
            }

            if (isExpanded) {
                Divider(modifier = Modifier.padding(vertical = 12.dp))
                Text("Botes registrados:", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                
                op.botes.forEach { bote ->
                    BoteItem(bote)
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onEvadirClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00897B))
                ) {
                    Text("Previsualizar EVADIR", color = Color.White)
                }
            }
        }
    }
}

@Composable
fun BoteItem(bote: com.bitecma.app.network.BoteDto) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFF8F9FA), RoundedCornerShape(8.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Placeholder para la foto del bote (basado en el icono de la web)
        Icon(
            Icons.Default.DirectionsBoat,
            contentDescription = null,
            tint = Color(0xFF003366),
            modifier = Modifier.size(32.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(bote.nombre, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text("${bote.buzo} · ${bote.tipoUnidad}", fontSize = 12.sp, color = Color.Gray)
            Row {
                bote.especies.forEach { esp ->
                    SuggestionChip(
                        onClick = { },
                        label = { Text(esp, fontSize = 10.sp) },
                        modifier = Modifier.padding(end = 4.dp)
                    )
                }
            }
        }
    }
}
