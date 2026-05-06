package com.bitecma.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.bitecma.app.network.RetrofitClient
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IngresosScreen(navController: NavController, userId: Int) {
    val scope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Capturas", "Muestras", "Densidad")
    
    var isLoading by remember { mutableStateOf(false) }
    var mensaje by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ingreso de Datos", color = Color.White) },
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
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            Column(modifier = Modifier.padding(24.dp)) {
                when (selectedTab) {
                    0 -> FormCaptura(onSave = { /* Lógica API */ })
                    1 -> FormMuestra(onSave = { /* Lógica API */ })
                    2 -> FormDensidad(onSave = { /* Lógica API */ })
                }
            }
        }
    }
}

@Composable
fun FormCaptura(onSave: () -> Unit) {
    var bote by remember { mutableStateOf("") }
    var especie by remember { mutableStateOf("") }
    var cantidad by remember { mutableStateOf("") }

    Column {
        Text("Nueva Captura", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(value = bote, onValueChange = { bote = it }, label = { Text("Nombre del Bote") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = especie, onValueChange = { especie = it }, label = { Text("Especie") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = cantidad, onValueChange = { cantidad = it }, label = { Text("Cantidad (Kg/Unid)") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
            Text("Guardar Captura")
        }
    }
}

@Composable
fun FormMuestra(onSave: () -> Unit) {
    var sector by remember { mutableStateOf("") }
    var talla by remember { mutableStateOf("") }
    var peso by remember { mutableStateOf("") }

    Column {
        Text("Nueva Muestra Biológica", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(value = sector, onValueChange = { sector = it }, label = { Text("Sector") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = talla, onValueChange = { talla = it }, label = { Text("Talla (mm)") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = peso, onValueChange = { peso = it }, label = { Text("Peso (g)") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
            Text("Guardar Muestra")
        }
    }
}

@Composable
fun FormDensidad(onSave: () -> Unit) {
    var area by remember { mutableStateOf("") }
    var conteo by remember { mutableStateOf("") }

    Column {
        Text("Registro de Densidad", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(value = area, onValueChange = { area = it }, label = { Text("Área (m²)") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(value = conteo, onValueChange = { conteo = it }, label = { Text("Conteo de individuos") }, modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) {
            Text("Guardar Densidad")
        }
    }
}
