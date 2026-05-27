export class ErrorImportacionEvadir extends Error {
  constructor(codigo, mensaje, detalles) {
    super(String(mensaje || 'Error importando EVADIR'))
    this.name = 'ErrorImportacionEvadir'
    this.codigo = String(codigo || 'DESCONOCIDO')
    this.detalles = detalles
  }
}

export function validarArchivoExcelBasico(archivo, { maxBytes } = {}) {
  if (!archivo) throw new ErrorImportacionEvadir('ARCHIVO_VACIO', 'No se seleccionó ningún archivo.')

  const nombre = String(archivo?.name || '').trim()
  const size = Number(archivo?.size || 0)
  const limite = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 15 * 1024 * 1024

  if (!Number.isFinite(size) || size <= 0) {
    throw new ErrorImportacionEvadir('ARCHIVO_SIN_CONTENIDO', 'El archivo está vacío o no se pudo leer su tamaño.')
  }

  if (size > limite) {
    throw new ErrorImportacionEvadir('ARCHIVO_MUY_GRANDE', `El archivo excede el límite de tamaño (${Math.round(limite / (1024 * 1024))} MB).`, {
      size,
      limite,
      nombre,
    })
  }

  const lower = nombre.toLowerCase()
  const okExt = lower.endsWith('.xlsx') || lower.endsWith('.xls')
  if (!okExt) {
    throw new ErrorImportacionEvadir('FORMATO_NO_VALIDO', 'Formato de archivo no válido. Debe ser un Excel .xlsx o .xls.', { nombre })
  }
}

export function mensajeAmigableImportacion(error) {
  const codigo = String(error?.codigo || '')
  const base = String(error?.message || 'No se pudo importar el Excel')

  if (codigo === 'ARCHIVO_MUY_GRANDE') return base
  if (codigo === 'FORMATO_NO_VALIDO') return base
  if (codigo === 'ARCHIVO_SIN_CONTENIDO') return base
  if (codigo === 'ARCHIVO_VACIO') return base
  if (codigo === 'XLSX_LECTURA_FALLIDA') return base
  if (codigo === 'HOJA_EVADIR_NO_ENCONTRADA') return base
  if (codigo === 'PLANTILLA_INVALIDA') return base
  if (codigo === 'SIN_FILAS_VALIDAS') return base
  if (codigo === 'ESPECIES_NO_CARGADAS') return base

  return base
}

