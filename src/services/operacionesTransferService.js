/**
 * Normaliza un valor a arreglo.
 *
 * @param {unknown} v - Valor candidato.
 * @returns {Array<any>} Arreglo o `[]`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function asArray(v) {
  return Array.isArray(v) ? v : []
}

/**
 * Serializa operaciones a JSON “portable” para export/import.
 *
 * @param {Array<object>} operaciones - Operaciones a exportar.
 * @returns {string} JSON con metadata (`version`, `exportedAt`) y arreglo `operaciones`.
 *
 * Lógica:
 * 1) Normaliza input como arreglo.
 * 2) Envuelve en objeto con versión y timestamp ISO.
 * 3) `JSON.stringify` pretty (indent 2) para facilitar inspección manual.
 *
 * Dependencias externas:
 * - `Date` y `JSON` (APIs estándar).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - Incrementar `version` si cambia el schema del payload.
 */
export function serializeOperaciones(operaciones) {
  const ops = asArray(operaciones)
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      operaciones: ops,
    },
    null,
    2,
  )
}

/**
 * Parsea un payload de operaciones (export antiguo o formato nuevo con wrapper).
 *
 * @param {unknown} raw - Texto JSON o valor convertible a string.
 * @returns {Array<object>} Arreglo de operaciones.
 *
 * Lógica:
 * 1) Parse JSON.
 * 2) Si el root es array, se asume payload “plano”.
 * 3) Si es objeto con `operaciones` array, se retorna esa propiedad.
 * 4) Si no, lanza error.
 *
 * Dependencias externas:
 * - `JSON.parse`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Lanza `Error('Formato inválido')` si no reconoce el schema.
 */
export function parseOperacionesPayload(raw) {
  const text = String(raw || '')
  const data = JSON.parse(text)
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.operaciones)) return data.operaciones
  throw new Error('Formato inválido')
}

/**
 * Fusiona operaciones por id, priorizando `incoming` cuando hay conflicto.
 *
 * @param {Array<object>} existing - Operaciones actuales.
 * @param {Array<object>} incoming - Operaciones nuevas a mezclar.
 * @returns {Array<object>} Arreglo combinado (sin duplicados por id).
 *
 * Lógica:
 * 1) Indexa existentes por `id`.
 * 2) Recorre incoming y reemplaza por id.
 * 3) Devuelve los valores del mapa.
 *
 * Dependencias externas:
 * - `Map` (JS estándar).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - No hace merge profundo: reemplaza el objeto completo por id.
 */
export function mergeOperacionesById(existing, incoming) {
  const cur = asArray(existing)
  const inc = asArray(incoming)
  const byId = new Map(cur.map((o) => [String(o?.id || ''), o]).filter(([id]) => id))
  inc.forEach((o) => {
    const id = String(o?.id || '')
    if (!id) return
    byId.set(id, o)
  })
  return Array.from(byId.values())
}
