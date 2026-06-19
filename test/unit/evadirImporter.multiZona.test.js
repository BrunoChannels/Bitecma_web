import { describe, expect, it } from 'vitest'
import { analizarBotesMultiZonaDesdePares } from '../../src/components/ops/EvadirImporter.jsx'

describe('EvadirImporter - detección de botes con múltiples zonas', () => {
  it('detecta 2 zonas distintas para un mismo bote', () => {
    const { botesConMultiplesZonas, filasZonaInvalida } = analizarBotesMultiZonaDesdePares([
      { nombreBote: 'En tierra', zonaRaw: 5 },
      { nombreBote: 'EN TIERRA', zonaRaw: 6 },
    ])

    expect(filasZonaInvalida).toHaveLength(0)
    expect(botesConMultiplesZonas).toHaveLength(1)
    expect(botesConMultiplesZonas[0].zonas).toEqual(['5', '6'])
  })

  it('detecta 3 o más zonas distintas para un mismo bote (caso En tierra 5/6/7)', () => {
    const pares = []
    for (let i = 0; i < 12; i++) pares.push({ nombreBote: 'EN TIERRA', zonaRaw: 5 })
    for (let i = 0; i < 12; i++) pares.push({ nombreBote: 'EN TIERRA', zonaRaw: 6 })
    for (let i = 0; i < 12; i++) pares.push({ nombreBote: 'EN TIERRA', zonaRaw: 7 })

    const { botesConMultiplesZonas, filasZonaInvalida } = analizarBotesMultiZonaDesdePares(pares)

    expect(filasZonaInvalida).toHaveLength(0)
    expect(botesConMultiplesZonas).toHaveLength(1)
    expect(botesConMultiplesZonas[0].zonas).toEqual(['5', '6', '7'])
  })

  it('no genera multi-zona cuando el bote tiene una única zona', () => {
    const { botesConMultiplesZonas } = analizarBotesMultiZonaDesdePares([
      { nombreBote: 'Barracuda II', zonaRaw: 4 },
      { nombreBote: 'BARRACUDA II', zonaRaw: '4' },
    ])

    expect(botesConMultiplesZonas).toHaveLength(0)
  })

  it('registra zonas vacías como inválidas y detecta multi-zona cuando también existe una zona textual válida', () => {
    const { botesConMultiplesZonas, filasZonaInvalida } = analizarBotesMultiZonaDesdePares([
      { nombreBote: 'En tierra', zonaRaw: '' },
      { nombreBote: 'En tierra', zonaRaw: null },
      { nombreBote: 'En tierra', zonaRaw: 'abc' },
      { nombreBote: 'En tierra', zonaRaw: 6 },
    ])

    expect(filasZonaInvalida).toHaveLength(2)
    expect(botesConMultiplesZonas).toHaveLength(1)
    expect(botesConMultiplesZonas[0].zonas).toEqual(['6', 'abc'])
  })
})
