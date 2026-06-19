import { describe, expect, it } from 'vitest'
import { normalizarNombreBoteParaMatch, resolverOCrearBoteSubmarealFaltante } from '../../src/components/ops/EvadirImporter.jsx'

describe('EvadirImporter - botes faltantes en biometría', () => {
  it('crea un bote submareal cuando la hoja biométrica trae un bote no presente en EVADIR', () => {
    const { bote, creado } = resolverOCrearBoteSubmarealFaltante(
      [{ id: 'B1', zona: '1', submareal: true, nombre: 'Chipana', buzo: '', lpMuestras: {}, transectos: [] }],
      2,
      'PAN DE AZUCAR',
      'Roberto Guerra',
    )

    expect(creado).toBe(true)
    expect(bote).toEqual({
      id: 'B2',
      zona: '2',
      submareal: true,
      nombre: 'PAN DE AZUCAR',
      buzo: 'Roberto Guerra',
      densTipo: 'transecto',
      lpMuestras: {},
      transectos: [],
    })
  })

  it('reutiliza el bote existente cuando ya está en la misma zona', () => {
    const botes = [{ id: 'B4', zona: '5', submareal: true, nombre: 'PAN DE AZUCAR', buzo: '', lpMuestras: {}, transectos: [] }]

    const { bote, creado } = resolverOCrearBoteSubmarealFaltante(botes, 5, 'Pan de Azucar', 'Buzo Demo')

    expect(creado).toBe(false)
    expect(bote).toBe(botes[0])
    expect(botes[0].buzo).toBe('Buzo Demo')
  })

  it('preserva el bote llamado guion para matching', () => {
    expect(normalizarNombreBoteParaMatch('-')).toBe('-')
  })

  it('crea un bote llamado guion cuando viene desde biometría y no existe en EVADIR', () => {
    const { bote, creado } = resolverOCrearBoteSubmarealFaltante([], 3, '-', '')

    expect(creado).toBe(true)
    expect(bote).toEqual({
      id: 'B1',
      zona: '3',
      submareal: true,
      nombre: '-',
      buzo: '',
      densTipo: 'transecto',
      lpMuestras: {},
      transectos: [],
    })
  })

  it('no crea bote cuando el nombre viene vacío', () => {
    const { bote, creado } = resolverOCrearBoteSubmarealFaltante([], 1, '   ', 'Buzo Demo')

    expect(creado).toBe(false)
    expect(bote).toBeNull()
  })
})
