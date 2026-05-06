package com.bitecma.app.data

import androidx.compose.runtime.mutableStateListOf
import com.bitecma.app.network.OperacionDto
import com.bitecma.app.network.BoteDto
import com.bitecma.app.ui.dashboard.BoteMaestro
import com.bitecma.app.ui.dashboard.EspecieMaestra

object DataManager {
    // Maestro de Botes
    val botes = mutableStateListOf(
        BoteMaestro("5MENTARIO", "RIQUELME", "963244", "1980", "I — Tarapacá"),
        BoteMaestro("ABDON I", "CAVANCHA", "700599", "3490", "I — Tarapacá"),
        BoteMaestro("ABRAHAM", "RIQUELME", "18200", "934", "I — Tarapacá"),
        BoteMaestro("VICENTE ANDRÉS I", "CHAN-CHAN", "123456", "788", "XIV — Los Ríos")
    )

    // Maestro de Especies
    val especies = listOf(
        EspecieMaestra(1, "Loco", "Concholepas concholepas"),
        EspecieMaestra(2, "Choro", "Choromytilus chorus"),
        EspecieMaestra(5, "Erizo rojo", "Loxechinus albus"),
        EspecieMaestra(7, "Lapa rosada", "Fissurella cumingi"),
        EspecieMaestra(25, "Macha", "Mesodesma donacium")
    )

    // Operaciones
    val operaciones = mutableStateListOf(
        OperacionDto(
            id = "OP-2026-001",
            region = "Región de Los Ríos — XIV",
            sector = "Chan-chan",
            caleta = "Chan-chan",
            fechaInicio = "2026-04-21",
            fechaFin = "2026-04-21",
            botes = listOf(
                BoteDto("VICENTE ANDRÉS I", "Zona 1", "CHINO", "Transecto", listOf("Loco", "Choro", "Erizo rojo")),
                BoteDto("DANIELITO I", "Zona 2", "RAMÓN", "Cuadrante", listOf("Loco", "Choro", "Lapa rosada"))
            )
        )
    )
}
