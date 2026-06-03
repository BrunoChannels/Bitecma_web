/**
 * Calcula métricas agregadas de una operación (conteos simples para UI).
 *
 * @param {object} op - Operación (se espera `{ botes?: Array }`).
 * @returns {{ totalTx: number, totalLPMuestras: number }} Totales calculados.
 *
 * Lógica:
 * 1) Normaliza `botes` como arreglo.
 * 2) `totalTx`: suma de transectos/cuadrantes por bote.
 * 3) `totalLPMuestras`: suma de muestras L-P por bote, soportando estructuras antiguas/nuevas.
 *
 * Dependencias externas:
 * - Ninguna (solo JS estándar).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Es defensiva con `null/undefined` y estructuras mixtas.
 *
 * @example
 * getOperacionMetricas({ botes: [{ transectos: [1,2], lpMuestras: { 10: { LP: [1] } } }] })
 * // => { totalTx: 2, totalLPMuestras: 1 }
 *
 * Notas de mantenimiento:
 * - Mantener alineado con la estructura que produce `lpMuestrasService`.
 * - La compatibilidad con `entry.ms` existe por datos heredados/importados.
 */
export function obtenerMetricasOperacion(op) {
  const botes = Array.isArray(op?.botes) ? op.botes : []
  const totalTx = botes.reduce((s, b) => s + ((b?.transectos || []).length || 0), 0)
  const totalLPMuestras = botes.reduce(
    (s, b) =>
      s +
      Object.values(b?.lpMuestras || {}).reduce((s2, entry) => {
        if (Array.isArray(entry)) return s2 + entry.length
        if (entry && typeof entry === 'object') {
          if (Array.isArray(entry.ms)) return s2 + entry.ms.length
          return (
            s2 +
            ['LP', 'L', 'D'].reduce((acc, k) => {
              const arr = entry?.[k]
              return acc + (Array.isArray(arr) ? arr.length : 0)
            }, 0)
          )
        }
        return s2
      }, 0),
    0,
  )
  return { totalTx, totalLPMuestras }
}

/**
 * Evalúa si una operación hace match con un texto libre (búsqueda simple).
 *
 * @param {object} op - Operación a evaluar.
 * @param {string} texto - Texto ya normalizado a minúsculas (sin trim interno aquí).
 * @returns {boolean} `true` si el texto está contenido en algún campo relevante.
 *
 * Lógica:
 * 1) Construye un “haystack” con id/sector/org/tipoOrg y nombre/buzo de botes.
 * 2) Normaliza a minúsculas y evalúa `includes`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Si `texto` es falsy, retorna `true` para no filtrar.
 *
 * Notas de mantenimiento:
 * - Si se agregan campos relevantes a la UI (ej. `caleta`, `sectorAmerb`), incluirlos aquí.
 */
function operacionCoincideConTexto(op, texto) {
  if (!texto) return true
  const botesText = (op?.botes || []).map((b) => `${b?.nombre || ''} ${b?.buzo || ''}`)
  const textoBusqueda = [
    op?.id || '',
    op?.sector || '',
    op?.org || '',
    op?.tipoOrg || '',
    ...botesText,
  ]
    .join(' ')
    .toLowerCase()
  return textoBusqueda.includes(texto)
}

/**
 * Filtra operaciones por sector, mes y texto.
 *
 * @param {Array<object>} operaciones - Lista de operaciones.
 * @param {{ sector?: string, mes?: string, texto?: string }} [filters] - Filtros opcionales.
 * @returns {Array<object>} Operaciones filtradas (mantiene referencias de objetos originales).
 *
 * Lógica:
 * 1) Normaliza `operaciones` como arreglo.
 * 2) Filtra por sector (match exacto).
 * 3) Filtra por mes (prefijo `YYYY-MM` comparado con `fechaInicio` o `fechaFin`).
 * 4) Filtra por texto usando `opMatchesText`.
 *
 * Dependencias externas:
 * - `opMatchesText` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a fechas faltantes (se convierten a string vacío).
 *
 * @example
 * filterOperaciones([{ sector:'A', fechaInicio:'2026-05-01' }], { sector:'A', mes:'2026-05' })
 *
 * Notas de mantenimiento:
 * - Este filtro es deliberadamente simple para uso en UI. Para datasets grandes, considerar indexación.
 */
export function filtrarOperaciones(operaciones, { sector = '', mes = '', texto = '' } = {}) {
  const operacionesNormalizadas = Array.isArray(operaciones) ? operaciones : []
  const q = String(texto || '').toLowerCase().trim()
  return operacionesNormalizadas.filter((op) => {
    if (sector && op?.sector !== sector) return false
    if (mes) {
      const fi = String(op?.fechaInicio || '')
      const ff = String(op?.fechaFin || '')
      if (!fi.startsWith(mes) && !ff.startsWith(mes)) return false
    }
    return operacionCoincideConTexto(op, q)
  })
}

export function normalizarZonaMuestreo(zonaMuestreo) {
  const zonaTexto = String(zonaMuestreo ?? '').trim()
  return zonaTexto === '' ? '' : zonaTexto
}

export function compararZonaMuestreo(zonaA, zonaB) {
  const zonaATexto = normalizarZonaMuestreo(zonaA)
  const zonaBTexto = normalizarZonaMuestreo(zonaB)

  if (!zonaATexto && !zonaBTexto) return 0
  if (!zonaATexto) return 1
  if (!zonaBTexto) return -1

  const esNumeroA = /^\d+$/.test(zonaATexto)
  const esNumeroB = /^\d+$/.test(zonaBTexto)

  if (esNumeroA && esNumeroB) {
    const numeroA = parseInt(zonaATexto, 10)
    const numeroB = parseInt(zonaBTexto, 10)
    if (numeroA !== numeroB) return numeroA - numeroB
    return zonaATexto.localeCompare(zonaBTexto, 'es')
  }

  if (esNumeroA !== esNumeroB) return esNumeroA ? -1 : 1

  return zonaATexto.localeCompare(zonaBTexto, 'es', { sensitivity: 'base' })
}
