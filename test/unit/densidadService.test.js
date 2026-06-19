import { describe, expect, it } from 'vitest'
import {
  actualizarUnidad,
  agregarEspecieAUnidad,
  calcularDensidad,
  crearUnidades,
  eliminarUnidad,
  establecerConteoUnidad,
  establecerCoordenadaUnidad,
  establecerEspecieCuadrante,
  quitarEspecieDeUnidad,
  siguienteNumeroUnidad,
} from '../../src/services/densidadService.js'

describe('densidadService', () => {
  it('calcula densidad usando conteo entero normalizado', () => {
    expect(calcularDensidad('3,9', 2)).toBe(1.5)
  })

  it('retorna 0 cuando el area no es valida', () => {
    expect(calcularDensidad(10, 0)).toBe(0)
  })

  it('retorna el siguiente numero cuando no hay unidades', () => {
    expect(siguienteNumeroUnidad([])).toBe(1)
  })

  it('calcula el siguiente numero usando el maximo actual', () => {
    expect(siguienteNumeroUnidad([{ num: 2 }, { num: 7 }, { num: '4' }])).toBe(8)
  })

  it('crea transectos con area por defecto y counts iniciales', () => {
    const unidades = crearUnidades({
      unidades: [],
      tipo: 'transecto',
      cantidad: 2,
      especiesIds: [10, '11'],
      fecha: '2026-06-18',
      sustrato: 'Roca',
      cubierta: 'Algas',
    })

    expect(unidades).toHaveLength(2)
    expect(unidades[0]).toMatchObject({
      num: 1,
      tipo: 'transecto',
      area: 120,
      fecha: '2026-06-18',
      sustrato: 'Roca',
      cubierta: 'Algas',
      counts: { 10: 0, 11: 0 },
    })
  })

  it('crea cuadrantes con especie unica y area por defecto', () => {
    const unidades = crearUnidades({
      unidades: [],
      tipo: 'cuadrante',
      cantidad: 1,
      especieId: 55,
    })

    expect(unidades[0]).toMatchObject({
      num: 1,
      tipo: 'cuadrante',
      area: 1,
      especieId: 55,
      counts: { 55: 0 },
    })
  })

  it('retorna el mismo arreglo base cuando la cantidad a crear es cero', () => {
    const base = [{ num: 1 }]
    expect(crearUnidades({ unidades: base, cantidad: 0 })).toBe(base)
  })

  it('elimina una unidad por numero', () => {
    const resultado = eliminarUnidad([{ num: 1 }, { num: 2 }], 1)
    expect(resultado).toEqual([{ num: 2 }])
  })

  it('actualiza una unidad normalizando area y textos', () => {
    const resultado = actualizarUnidad([{ num: 1, area: 1, fecha: '', sustrato: '', cubierta: '' }], 1, {
      area: '4.5',
      fecha: ' 2026-01-01 ',
      sustrato: ' Arena ',
      cubierta: ' Huiro ',
    })

    expect(resultado[0]).toMatchObject({
      area: 4.5,
      fecha: '2026-01-01',
      sustrato: 'Arena',
      cubierta: 'Huiro',
    })
  })

  it('establece una coordenada numerica tolerando coma decimal', () => {
    const resultado = establecerCoordenadaUnidad([{ num: 1 }], 1, 'lon', '-71,25')
    expect(resultado[0].coordLong).toBe(-71.25)
  })

  it('no modifica el arreglo si la clave de coordenada no existe', () => {
    const base = [{ num: 1 }]
    expect(establecerCoordenadaUnidad(base, 1, 'foo', 10)).toBe(base)
  })

  it('agrega una especie solo a un transecto', () => {
    const resultado = agregarEspecieAUnidad(
      [
        { num: 1, tipo: 'transecto', counts: { 10: 2 } },
        { num: 2, tipo: 'cuadrante', counts: { 99: 1 }, especieId: 99 },
      ],
      1,
      11,
    )

    expect(resultado[0].counts).toEqual({ 10: 2, 11: 0 })
    expect(resultado[1].counts).toEqual({ 99: 1 })
  })

  it('quita una especie existente de un transecto', () => {
    const resultado = quitarEspecieDeUnidad([{ num: 1, tipo: 'transecto', counts: { 10: 2, 11: 0 } }], 1, 10)
    expect(resultado[0].counts).toEqual({ 11: 0 })
  })

  it('establece conteos truncando y evitando negativos', () => {
    const resultado = establecerConteoUnidad([{ num: 1, counts: { 10: 0 } }], 1, 10, '-8')
    expect(resultado[0].counts[10]).toBe(0)
  })

  it('cambia la especie de un cuadrante preservando el conteo actual', () => {
    const resultado = establecerEspecieCuadrante(
      [{ num: 1, tipo: 'cuadrante', especieId: 5, counts: { 5: 7 } }],
      1,
      8,
    )

    expect(resultado[0]).toMatchObject({ especieId: 8, counts: { 8: 7 } })
  })

  it('no cambia la especie cuando la unidad no es cuadrante', () => {
    const base = [{ num: 1, tipo: 'transecto', counts: { 5: 7 } }]
    const resultado = establecerEspecieCuadrante(base, 1, 8)
    expect(resultado).toEqual(base)
  })
})
