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
export function getOperacionMetricas(op) {
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
function opMatchesText(op, texto) {
  if (!texto) return true
  const botesText = (op?.botes || []).map((b) => `${b?.nombre || ''} ${b?.buzo || ''}`)
  const haystack = [
    op?.id || '',
    op?.sector || '',
    op?.org || '',
    op?.tipoOrg || '',
    ...botesText,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(texto)
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
export function filterOperaciones(operaciones, { sector = '', mes = '', texto = '' } = {}) {
  const ops = Array.isArray(operaciones) ? operaciones : []
  const q = String(texto || '').toLowerCase().trim()
  return ops.filter((op) => {
    if (sector && op?.sector !== sector) return false
    if (mes) {
      const fi = String(op?.fechaInicio || '')
      const ff = String(op?.fechaFin || '')
      if (!fi.startsWith(mes) && !ff.startsWith(mes)) return false
    }
    return opMatchesText(op, q)
  })
}
