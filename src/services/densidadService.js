/**
 * Normaliza un valor a entero no negativo (conteos).
 *
 * @param {unknown} v - Valor a normalizar (string/number/null).
 * @returns {number} Entero truncado >= 0.
 *
 * Lógica:
 * 1) Trata `null/undefined/''` como 0.
 * 2) Parsea números tolerando coma decimal.
 * 3) Si no es finito, retorna 0; si es finito, trunca y limita a >= 0.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - Mantener consistente con inputs numéricos de UI (algunos ingresan coma decimal).
 */
function normInt(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
}

/**
 * Normaliza un valor numérico opcional (coordenadas / medidas).
 *
 * @param {unknown} v - Valor a normalizar.
 * @returns {number|null} Número finito, o `null` si no existe/ no es válido.
 *
 * Lógica:
 * 1) `null/undefined/''` => `null`.
 * 2) Si es number finito, retorna el mismo.
 * 3) Si es string, parsea tolerando coma decimal.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normNum(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Calcula densidad (conteo por unidad de área).
 *
 * @param {unknown} count - Conteo de individuos (se normaliza a entero no negativo).
 * @param {unknown} area - Área (m² u otra unidad) esperada como número > 0.
 * @returns {number} Densidad calculada; si área inválida, retorna 0.
 *
 * Lógica:
 * 1) Normaliza `count` con `normInt`.
 * 2) Convierte `area` a número y valida `> 0`.
 * 3) Retorna `count / area`.
 *
 * Dependencias externas:
 * - `normInt` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function calcDensidad(count, area) {
  const c = normInt(count)
  const a = Number(area) || 0
  if (!(a > 0)) return 0
  return c / a
}

/**
 * Retorna el siguiente número correlativo para una unidad (transecto/cuadrante).
 *
 * @param {Array<object>} unidades - Lista de unidades con campo `num`.
 * @returns {number} Próximo `num` disponible (máximo actual + 1).
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - La unicidad de `num` se asume a nivel UI; si hay duplicados, tomará el máximo.
 */
export function nextUnidadNum(unidades) {
  const arr = Array.isArray(unidades) ? unidades : []
  const nums = arr.map((u) => Number(u?.num)).filter((n) => Number.isFinite(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

/**
 * Crea nuevas unidades (transectos o cuadrantes) y las agrega al arreglo existente.
 *
 * @param {object} args - Parámetros de creación.
 * @param {Array<object>} args.unidades - Unidades actuales.
 * @param {'transecto'|'cuadrante'|string} args.tipo - Tipo solicitado (se normaliza a 'transecto'/'cuadrante').
 * @param {number|string} args.cantidad - Cantidad de unidades a crear.
 * @param {number|string} args.area - Área a asignar (si 0, usa defaults).
 * @param {string} args.fecha - Fecha (string) a asignar.
 * @param {string} args.sustrato - Sustrato.
 * @param {string} args.cubierta - Cubierta.
 * @param {number|string|null} args.especieId - Especie seleccionada (solo cuadrante).
 * @param {Array<number|string>} args.especiesIds - Catálogo de especies a inicializar en `counts` (solo transecto).
 * @returns {Array<object>} Nuevo arreglo con unidades creadas al final.
 *
 * Lógica:
 * 1) Normaliza parámetros (tipo, cantidad, texto, ids).
 * 2) Calcula `start` usando `nextUnidadNum`.
 * 3) Crea `n` unidades con estructura base (incluye `counts` inicial).
 * 4) Para cuadrantes, fuerza `especieId` y `counts` con esa especie.
 *
 * Dependencias externas:
 * - `nextUnidadNum`, `normInt` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno (operación inmutable: retorna un nuevo arreglo).
 *
 * Manejo de errores:
 * - Si `cantidad` inválida/0, retorna el arreglo original.
 *
 * Notas de mantenimiento:
 * - Default de `area`: cuadrante=1, transecto=120 (mantener alineado con reglas de muestreo del proyecto).
 */
export function crearUnidades({
  unidades,
  tipo,
  cantidad,
  area,
  fecha,
  sustrato,
  cubierta,
  especieId,
  especiesIds,
}) {
  const base = Array.isArray(unidades) ? unidades : []
  const t = tipo === 'cuadrante' ? 'cuadrante' : 'transecto'
  const n = Math.max(0, Math.trunc(Number(cantidad) || 0))
  if (!n) return base
  const start = nextUnidadNum(base)
  const a = Number(area) || 0
  const f = String(fecha || '').trim()
  const sus = String(sustrato || '').trim()
  const cub = String(cubierta || '').trim()
  const spId = especieId == null || especieId === '' ? null : Number(especieId)
  const spIds = Array.isArray(especiesIds)
    ? especiesIds.map(Number).filter((x) => Number.isFinite(x))
    : []

  const created = Array.from({ length: n }, (_, i) => {
    const num = start + i
    const unit = {
      num,
      tipo: t,
      area: a || (t === 'cuadrante' ? 1 : 120),
      fecha: f,
      sustrato: sus,
      cubierta: cub,
      counts: t === 'transecto' && spIds.length ? Object.fromEntries(spIds.map((id) => [id, 0])) : {},
    }
    if (t === 'cuadrante' && Number.isFinite(spId)) {
      unit.especieId = spId
      unit.counts = { [spId]: 0 }
    }
    return unit
  })

  return [...base, ...created]
}

/**
 * Elimina una unidad por su número correlativo.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad a eliminar.
 * @returns {Array<object>} Nuevo arreglo sin la unidad indicada.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function eliminarUnidad(unidades, num) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  return base.filter((u) => Number(u?.num) !== n)
}

/**
 * Aplica un patch a una unidad (por `num`) normalizando campos conocidos.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad a actualizar.
 * @param {object} patch - Parcial de campos a actualizar.
 * @returns {Array<object>} Nuevo arreglo con la unidad actualizada.
 *
 * Lógica:
 * 1) Recorre y clona solo la unidad objetivo.
 * 2) Normaliza `area` a número, y `fecha/sustrato/cubierta` a string trimmed cuando vienen en el patch.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function updateUnidad(unidades, num, patch) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  return base.map((u) => {
    if (Number(u?.num) !== n) return u
    const next = { ...u, ...(patch || {}) }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'area')) {
      next.area = Number(patch.area) || 0
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'fecha')) {
      next.fecha = String(patch.fecha || '').trim()
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'sustrato')) {
      next.sustrato = String(patch.sustrato || '').trim()
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'cubierta')) {
      next.cubierta = String(patch.cubierta || '').trim()
    }
    return next
  })
}

/**
 * Setea una coordenada (x/y/lon/lat) de una unidad, guardándola como número o `null`.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad a actualizar.
 * @param {'x'|'y'|'lon'|'lat'|string} key - Clave solicitada.
 * @param {unknown} value - Valor a asignar.
 * @returns {Array<object>} Nuevo arreglo con la unidad actualizada.
 *
 * Dependencias externas:
 * - `normNum` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - Mapea a campos: `coordX`, `coordY`, `coordLong`, `coordLat`.
 */
export function setUnidadCoord(unidades, num, key, value) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  const v = normNum(value)
  const field =
    key === 'x' ? 'coordX' : key === 'y' ? 'coordY' : key === 'lon' ? 'coordLong' : key === 'lat' ? 'coordLat' : null
  if (!field) return base
  return base.map((u) => (Number(u?.num) !== n ? u : { ...u, [field]: v }))
}

/**
 * Agrega una especie al conteo (`counts`) de una unidad tipo transecto.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad a actualizar.
 * @param {number|string} especieId - Id de especie.
 * @returns {Array<object>} Nuevo arreglo con la unidad actualizada.
 *
 * Lógica:
 * 1) Ignora ids inválidos.
 * 2) Solo aplica a transectos (cuadrantes tienen una especie única).
 * 3) Si no existe la clave en `counts`, la agrega con valor 0.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function addEspecieToUnidad(unidades, num, especieId) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return base
  return base.map((u) => {
    if (Number(u?.num) !== n) return u
    if (u?.tipo === 'cuadrante') return u
    const counts = u?.counts && typeof u.counts === 'object' ? u.counts : {}
    if (Object.prototype.hasOwnProperty.call(counts, sp)) return u
    return { ...u, counts: { ...counts, [sp]: 0 } }
  })
}

/**
 * Elimina una especie del conteo (`counts`) de una unidad tipo transecto.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad a actualizar.
 * @param {number|string} especieId - Id de especie.
 * @returns {Array<object>} Nuevo arreglo con la unidad actualizada.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function removeEspecieFromUnidad(unidades, num, especieId) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return base
  return base.map((u) => {
    if (Number(u?.num) !== n) return u
    if (u?.tipo === 'cuadrante') return u
    const counts = u?.counts && typeof u.counts === 'object' ? u.counts : {}
    if (!Object.prototype.hasOwnProperty.call(counts, sp)) return u
    const nextCounts = { ...counts }
    delete nextCounts[sp]
    return { ...u, counts: nextCounts }
  })
}

/**
 * Setea el conteo de una especie dentro de una unidad.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad.
 * @param {number|string} especieId - Id de especie.
 * @param {unknown} value - Valor a setear (se normaliza a entero >= 0).
 * @returns {Array<object>} Nuevo arreglo con la unidad actualizada.
 *
 * Dependencias externas:
 * - `normInt` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function setUnidadCount(unidades, num, especieId, value) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return base
  const cnt = normInt(value)
  return base.map((u) => {
    if (Number(u?.num) !== n) return u
    const counts = u?.counts && typeof u.counts === 'object' ? u.counts : {}
    return { ...u, counts: { ...counts, [sp]: cnt } }
  })
}

/**
 * Cambia la especie asociada a un cuadrante, preservando el valor actual si es posible.
 *
 * @param {Array<object>} unidades - Unidades actuales.
 * @param {number|string} num - Número de unidad.
 * @param {number|string} especieId - Nueva especie id.
 * @returns {Array<object>} Nuevo arreglo con el cuadrante actualizado.
 *
 * Lógica:
 * 1) Solo aplica a unidades tipo `cuadrante`.
 * 2) Lee el conteo actual de la especie previa (si existía).
 * 3) Reescribe `especieId` y reemplaza `counts` a `{ [newId]: oldCount }`.
 *
 * Dependencias externas:
 * - `normInt` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function setCuadranteEspecie(unidades, num, especieId) {
  const base = Array.isArray(unidades) ? unidades : []
  const n = Number(num)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return base
  return base.map((u) => {
    if (Number(u?.num) !== n) return u
    if (u?.tipo !== 'cuadrante') return u
    const curCounts = u?.counts && typeof u.counts === 'object' ? u.counts : {}
    const curSp = u?.especieId == null ? null : Number(u.especieId)
    const curVal = curSp != null && Number.isFinite(curSp) ? Number(curCounts[curSp] ?? 0) : 0
    return { ...u, especieId: sp, counts: { [sp]: normInt(curVal) } }
  })
}
