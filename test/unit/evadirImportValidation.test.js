import { describe, expect, it } from 'vitest'
import {
  ErrorImportacionEvadir,
  mensajeAmigableImportacion,
  validarArchivoExcelBasico,
} from '../../src/services/evadirImportValidation.js'

describe('evadirImportValidation', () => {
  it('construye un error tipado con codigo y detalles', () => {
    const error = new ErrorImportacionEvadir('CODIGO_X', 'Mensaje', { fila: 3 })

    expect(error.name).toBe('ErrorImportacionEvadir')
    expect(error.codigo).toBe('CODIGO_X')
    expect(error.message).toBe('Mensaje')
    expect(error.detalles).toEqual({ fila: 3 })
  })

  it('falla cuando no se selecciona archivo', () => {
    expect(() => validarArchivoExcelBasico(null)).toThrowError(
      expect.objectContaining({ codigo: 'ARCHIVO_VACIO' }),
    )
  })

  it('falla cuando el archivo no tiene contenido', () => {
    expect(() => validarArchivoExcelBasico({ name: 'evadir.xlsx', size: 0 })).toThrowError(
      expect.objectContaining({ codigo: 'ARCHIVO_SIN_CONTENIDO' }),
    )
  })

  it('falla cuando el archivo excede el limite configurado', () => {
    expect(() => validarArchivoExcelBasico({ name: 'evadir.xlsx', size: 11 }, { maxBytes: 10 })).toThrowError(
      expect.objectContaining({
        codigo: 'ARCHIVO_MUY_GRANDE',
        detalles: expect.objectContaining({ nombre: 'evadir.xlsx', size: 11, limite: 10 }),
      }),
    )
  })

  it('falla cuando la extension no es excel', () => {
    expect(() => validarArchivoExcelBasico({ name: 'evadir.csv', size: 100 })).toThrowError(
      expect.objectContaining({ codigo: 'FORMATO_NO_VALIDO' }),
    )
  })

  it('acepta archivos xlsx validos', () => {
    expect(() => validarArchivoExcelBasico({ name: 'evadir.xlsx', size: 100 })).not.toThrow()
  })

  it('acepta archivos xls validos en mayusculas', () => {
    expect(() => validarArchivoExcelBasico({ name: 'EVADIR.XLS', size: 100 })).not.toThrow()
  })

  it('retorna el mensaje base para errores conocidos', () => {
    const error = new ErrorImportacionEvadir('FORMATO_NO_VALIDO', 'Debe ser excel')
    expect(mensajeAmigableImportacion(error)).toBe('Debe ser excel')
  })

  it('retorna el mensaje base para errores desconocidos', () => {
    expect(mensajeAmigableImportacion(new Error('Error genérico'))).toBe('Error genérico')
  })
})
