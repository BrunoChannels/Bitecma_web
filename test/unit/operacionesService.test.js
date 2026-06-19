import { describe, expect, it } from 'vitest'
import {
  compararZonaMuestreo,
  filtrarOperaciones,
  normalizarZonaMuestreo,
  obtenerMetricasOperacion,
} from '../../src/services/operacionesService.js'

describe('operacionesService', () => {
  describe('obtenerMetricasOperacion', () => {
    it('retorna ceros cuando no hay botes', () => {
      expect(obtenerMetricasOperacion(null)).toEqual({ totalTx: 0, totalLPMuestras: 0 })
    })

    it('suma transectos y muestras LP/L/D de la estructura actual', () => {
      const op = {
        botes: [
          {
            transectos: [{}, {}],
            lpMuestras: {
              10: { LP: [{}, {}], L: [{}], D: [{}, {}] },
            },
          },
        ],
      }

      expect(obtenerMetricasOperacion(op)).toEqual({ totalTx: 2, totalLPMuestras: 5 })
    })

    it('soporta estructuras heredadas en array y ms', () => {
      const op = {
        botes: [
          { transectos: [{}], lpMuestras: { 10: [{}, {}] } },
          { transectos: [], lpMuestras: { 11: { ms: [{}, {}, {}] } } },
        ],
      }

      expect(obtenerMetricasOperacion(op)).toEqual({ totalTx: 1, totalLPMuestras: 5 })
    })
  })

  describe('filtrarOperaciones', () => {
    const operaciones = [
      {
        id: 'OP-1',
        sector: 'Las Conchas',
        org: 'Sindicato Norte',
        tipoOrg: 'STI',
        fechaInicio: '2026-05-10',
        fechaFin: '2026-05-11',
        botes: [{ nombre: 'Lobo Marino', buzo: 'Pedro' }],
      },
      {
        id: 'OP-2',
        sector: 'Puerto Oscuro',
        org: 'Asociacion Sur',
        tipoOrg: 'ASOC',
        fechaInicio: '2026-04-28',
        fechaFin: '2026-06-02',
        botes: [{ nombre: 'Aurora', buzo: 'Maria' }],
      },
    ]

    it('filtra por sector exacto', () => {
      const resultado = filtrarOperaciones(operaciones, { sector: 'Las Conchas' })
      expect(resultado.map((op) => op.id)).toEqual(['OP-1'])
    })

    it('filtra por mes usando fechaInicio', () => {
      const resultado = filtrarOperaciones(operaciones, { mes: '2026-05' })
      expect(resultado.map((op) => op.id)).toEqual(['OP-1'])
    })

    it('filtra por mes usando fechaFin cuando fechaInicio no coincide', () => {
      const resultado = filtrarOperaciones(operaciones, { mes: '2026-06' })
      expect(resultado.map((op) => op.id)).toEqual(['OP-2'])
    })

    it('filtra por texto en organizacion', () => {
      const resultado = filtrarOperaciones(operaciones, { texto: 'sindicato' })
      expect(resultado.map((op) => op.id)).toEqual(['OP-1'])
    })

    it('filtra por texto en nombre de bote o buzo ignorando mayusculas y espacios', () => {
      const resultado = filtrarOperaciones(operaciones, { texto: '  maria  ' })
      expect(resultado.map((op) => op.id)).toEqual(['OP-2'])
    })
  })

  describe('zona de muestreo', () => {
    it('normaliza zona recortando espacios', () => {
      expect(normalizarZonaMuestreo('  7A  ')).toBe('7A')
    })

    it('ordena zonas vacias despues de una zona valida', () => {
      expect(compararZonaMuestreo('', '2')).toBeGreaterThan(0)
    })

    it('ordena zonas numericas por valor numerico', () => {
      expect(compararZonaMuestreo('2', '10')).toBeLessThan(0)
    })

    it('ordena zonas numericas antes que zonas de texto', () => {
      expect(compararZonaMuestreo('3', 'A')).toBeLessThan(0)
    })
  })
})
