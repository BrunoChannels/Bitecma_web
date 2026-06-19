import { describe, expect, it } from 'vitest'
import {
  combinarOperacionesPorId,
  parsearPayloadOperaciones,
  serializarOperaciones,
} from '../../src/services/operacionesTransferService.js'

describe('operacionesTransferService', () => {
  describe('serializarOperaciones', () => {
    it('envuelve las operaciones con metadata portable', () => {
      const json = serializarOperaciones([{ id: 'OP-1' }])
      const payload = JSON.parse(json)

      expect(payload.version).toBe(1)
      expect(Array.isArray(payload.operaciones)).toBe(true)
      expect(payload.operaciones).toEqual([{ id: 'OP-1' }])
      expect(typeof payload.exportedAt).toBe('string')
    })

    it('serializa arreglo vacio cuando recibe un valor no iterable', () => {
      const json = serializarOperaciones(null)
      const payload = JSON.parse(json)

      expect(payload.operaciones).toEqual([])
    })
  })

  describe('parsearPayloadOperaciones', () => {
    it('parsea el formato nuevo con wrapper', () => {
      const payload = JSON.stringify({ version: 1, operaciones: [{ id: 'OP-1' }] })
      expect(parsearPayloadOperaciones(payload)).toEqual([{ id: 'OP-1' }])
    })

    it('parsea el formato plano legado', () => {
      expect(parsearPayloadOperaciones(JSON.stringify([{ id: 'OP-2' }]))).toEqual([{ id: 'OP-2' }])
    })

    it('lanza error cuando el schema no es reconocible', () => {
      expect(() => parsearPayloadOperaciones(JSON.stringify({ foo: 'bar' }))).toThrow('Formato inválido')
    })
  })

  describe('combinarOperacionesPorId', () => {
    it('prioriza incoming cuando existe el mismo id', () => {
      const resultado = combinarOperacionesPorId(
        [{ id: 'OP-1', sector: 'Viejo' }],
        [{ id: 'OP-1', sector: 'Nuevo' }],
      )

      expect(resultado).toEqual([{ id: 'OP-1', sector: 'Nuevo' }])
    })

    it('mantiene ids distintos y agrega los nuevos', () => {
      const resultado = combinarOperacionesPorId([{ id: 'OP-1' }], [{ id: 'OP-2' }])
      expect(resultado.map((op) => op.id)).toEqual(['OP-1', 'OP-2'])
    })

    it('ignora operaciones sin id y tolera entradas no array', () => {
      const resultado = combinarOperacionesPorId(null, [{ sector: 'Sin id' }, { id: 'OP-3' }])
      expect(resultado).toEqual([{ id: 'OP-3' }])
    })
  })
})
