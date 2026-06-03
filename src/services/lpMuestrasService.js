/**
 * Normaliza un valor a número finito o `null` (para inputs de L/P/D).
 *
 * @param {unknown} v - Valor a normalizar.
 * @returns {number|null} Número finito o `null` si no es válido.
 *
 * Lógica:
 * 1) `null/undefined/''` => `null`.
 * 2) Si es number finito, se retorna tal cual.
 * 3) Si es string, se parsea tolerando coma decimal.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normalizarNumero(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Garantiza que `lpMuestras` sea un objeto mapa.
 *
 * @param {unknown} lpMuestras - Valor recibido desde operación/bote.
 * @returns {Record<string, any>} Objeto (si no lo es, retorna `{}`).
 *
 * Notas de mantenimiento:
 * - La estructura histórica varía entre: array de muestras, `{ ms: [] }` o `{ LP: [], L: [], D: [] }`.
 */
function asegurarMapa(lpMuestras) {
  return lpMuestras && typeof lpMuestras === 'object' ? lpMuestras : {}
}

/**
 * Garantiza que un valor sea arreglo.
 *
 * @param {unknown} v - Valor a normalizar.
 * @returns {Array<any>} Arreglo (o `[]` si no lo es).
 */
function asegurarArreglo(v) {
  return Array.isArray(v) ? v : []
}

/**
 * Normaliza el “tipo” de muestra a una de las claves soportadas.
 *
 * @param {unknown} kind - Entrada tipo (LP/L-P/L/D).
 * @returns {'LP'|'L'|'D'} Clave normalizada.
 *
 * Notas de mantenimiento:
 * - 'LP' representa muestras Peso-Longitud (`{ l, p }`).
 * - 'L' representa solo longitud (`{ l }`).
 * - 'D' representa diámetro (`{ d }`).
 */
function normalizarTipo(kind) {
  const tipo = String(kind || '').trim().toUpperCase()
  if (tipo === 'L-P' || tipo === 'LP') return 'LP'
  if (tipo === 'D') return 'D'
  return 'L'
}

/**
 * Infere el tipo de muestra desde su shape.
 *
 * @param {unknown} sample - Muestra candidata.
 * @returns {'LP'|'L'|'D'} Tipo inferido.
 *
 * Lógica:
 * - Si tiene propiedad `d` => 'D'
 * - Si tiene propiedad `p` => 'LP'
 * - En otro caso => 'L'
 *
 * Notas de mantenimiento:
 * - Esta heurística permite compatibilidad con formatos antiguos importados.
 */
function tipoDesdeMuestra(sample) {
  const muestra = sample && typeof sample === 'object' ? sample : {}
  if (Object.prototype.hasOwnProperty.call(muestra, 'd')) return 'D'
  if (Object.prototype.hasOwnProperty.call(muestra, 'p')) return 'LP'
  return 'L'
}

/**
 * Normaliza una “entry” de `lpMuestras[especieId]` a formato por tipo.
 *
 * @param {unknown} entry - Entrada existente.
 * @returns {{ LP?: Array<object>, L?: Array<object>, D?: Array<object> }} Mapa por tipo.
 *
 * Lógica:
 * - Si `entry` es array, agrupa por `kindFromSample`.
 * - Si `entry` es objeto con `ms`, mapea a `{ [type]: ms }`.
 * - Si `entry` ya tiene claves `LP/L/D`, las conserva si son arrays.
 *
 * Dependencias externas:
 * - `kindFromSample`, `normKind`, `ensureArr`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normalizarEntrada(entry) {
  if (Array.isArray(entry)) {
    const out = {}
    entry.forEach((m) => {
      const k = tipoDesdeMuestra(m)
      if (!out[k]) out[k] = []
      out[k].push(m)
    })
    return out
  }
  if (entry && typeof entry === 'object') {
    if (Array.isArray(entry.ms)) {
      const k = normalizarTipo(entry.type || 'LP')
      return { [k]: asegurarArreglo(entry.ms) }
    }
    const out = {}
    ;['LP', 'L', 'D'].forEach((k) => {
      if (Array.isArray(entry[k])) out[k] = entry[k]
    })
    return out
  }
  return {}
}

/**
 * Normaliza una muestra según tipo (LP/L/D), descartando incompletas.
 *
 * @param {unknown} kind - Tipo solicitado.
 * @param {unknown} sample - Muestra candidata.
 * @returns {{l:number,p:number}|{l:number}|{d:number}|null} Muestra normalizada o `null`.
 *
 * Lógica:
 * - LP requiere `l` y `p`.
 * - D requiere `d`.
 * - L requiere `l`.
 *
 * Dependencias externas:
 * - `normKind`, `normNum`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normalizarMuestra(kind, sample) {
  const muestra = sample && typeof sample === 'object' ? sample : {}
  const k = normalizarTipo(kind)
  if (k === 'LP') {
    const l = normalizarNumero(muestra.l)
    const p = normalizarNumero(muestra.p)
    if (l === null || p === null) return null
    return { l, p }
  }
  if (k === 'D') {
    const d = normalizarNumero(muestra.d)
    if (d === null) return null
    return { d }
  }
  const l = normalizarNumero(muestra.l)
  if (l === null) return null
  return { l }
}

/**
 * Asegura que exista el bucket de un tipo de muestra para una especie.
 *
 * @param {unknown} lpMuestras - Mapa actual (objeto o formatos heredados).
 * @param {number|string} especieId - Id de especie.
 * @param {string} [kind='LP'] - Tipo a asegurar.
 * @returns {Record<string, any>} Nuevo mapa con la especie/tipo presente.
 *
 * Lógica:
 * 1) Valida `especieId`.
 * 2) Normaliza el entry actual a formato por tipo.
 * 3) Si el tipo no existe, lo crea con arreglo vacío.
 *
 * Dependencias externas:
 * - `ensureMap`, `normKind`, `normalizeEntry`.
 *
 * Efectos secundarios:
 * - Ninguno (retorna un nuevo objeto).
 */
export function asegurarTipo(lpMuestras, especieId, kind = 'LP') {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  const k = normalizarTipo(kind)
  const cur = normalizarEntrada(map[sp])
  if (Object.prototype.hasOwnProperty.call(cur, k)) return { ...map, [sp]: cur }
  return { ...map, [sp]: { ...cur, [k]: [] } }
}

/**
 * Elimina un tipo de muestras para una especie; si queda vacío, elimina la especie completa.
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @param {string} kind - Tipo a eliminar.
 * @returns {Record<string, any>} Nuevo mapa.
 *
 * Dependencias externas:
 * - `ensureMap`, `normKind`, `normalizeEntry`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function eliminarTipo(lpMuestras, especieId, kind) {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  const k = normalizarTipo(kind)
  if (!Object.prototype.hasOwnProperty.call(map, sp)) return map
  const cur = normalizarEntrada(map[sp])
  if (!Object.prototype.hasOwnProperty.call(cur, k)) return { ...map, [sp]: cur }
  const nextEntry = { ...cur }
  delete nextEntry[k]
  const hasAny = Object.keys(nextEntry).some((kk) => Array.isArray(nextEntry[kk]))
  if (!hasAny) {
    const next = { ...map }
    delete next[sp]
    return next
  }
  return { ...map, [sp]: nextEntry }
}

/**
 * Alias semántico: asegura que la especie exista con un tipo inicial.
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @param {string} [kind='LP'] - Tipo inicial.
 * @returns {Record<string, any>} Nuevo mapa.
 *
 * Notas de mantenimiento:
 * - Se mantiene para legibilidad en UI (agregar especie vs agregar tipo).
 */
export function asegurarEspecie(lpMuestras, especieId, kind = 'LP') {
  return asegurarTipo(lpMuestras, especieId, kind)
}

/**
 * Elimina todas las muestras de una especie (independiente del tipo).
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @returns {Record<string, any>} Nuevo mapa.
 *
 * Dependencias externas:
 * - `ensureMap`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function eliminarEspecie(lpMuestras, especieId) {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  if (!Object.prototype.hasOwnProperty.call(map, sp)) return map
  const next = { ...map }
  delete next[sp]
  return next
}

/**
 * Agrega una muestra a una especie (soporta llamada por kind o por shape).
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @param {string|object} kindOrSample - Tipo (LP/L/D) o una muestra (si no se pasa `sampleMaybe`).
 * @param {object} [sampleMaybe] - Muestra si se indicó `kindOrSample` como tipo.
 * @returns {Record<string, any>} Nuevo mapa con la muestra agregada.
 *
 * Lógica:
 * 1) Determina `kind` (por argumento o por `kindFromSample`).
 * 2) Normaliza la muestra (descarta si incompleta).
 * 3) Normaliza entry actual y agrega la muestra al arreglo del tipo.
 *
 * Dependencias externas:
 * - `ensureMap`, `kindFromSample`, `normKind`, `normalizeSample`, `normalizeEntry`, `ensureArr`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function agregarMuestra(lpMuestras, especieId, kindOrSample, sampleMaybe) {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  const kind = sampleMaybe === undefined ? tipoDesdeMuestra(kindOrSample) : normalizarTipo(kindOrSample)
  const sample = sampleMaybe === undefined ? kindOrSample : sampleMaybe
  const nextSample = normalizarMuestra(kind, sample)
  if (!nextSample) return map

  const curEntry = normalizarEntrada(map[sp])
  const curArr = asegurarArreglo(curEntry[kind])
  const nextEntry = { ...curEntry, [kind]: [...curArr, nextSample] }
  return { ...map, [sp]: nextEntry }
}

/**
 * Actualiza una muestra existente por índice.
 *
 * Soporta dos formatos:
 * - Formato heredado: `lpMuestras[sp]` es array y se actualiza por `index` directo.
 * - Formato actual: `lpMuestras[sp]` es entry por tipo (`LP/L/D`) y se actualiza por tipo + índice.
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @param {string|number} kindOrIndex - Tipo (LP/L/D) o índice (formato heredado).
 * @param {number|object} indexOrSample - Índice (si `kindOrIndex` es tipo) o muestra (si es heredado).
 * @param {object} [sampleMaybe] - Muestra (si `kindOrIndex` es tipo).
 * @returns {Record<string, any>} Nuevo mapa con la muestra actualizada.
 *
 * Dependencias externas:
 * - `ensureMap`, `ensureArr`, `kindFromSample`, `normKind`, `normalizeSample`, `normalizeEntry`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function actualizarMuestra(lpMuestras, especieId, kindOrIndex, indexOrSample, sampleMaybe) {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  if (typeof kindOrIndex === 'number') {
    const cur = asegurarArreglo(map[sp])
    const idx = Number(kindOrIndex)
    if (!Number.isFinite(idx) || idx < 0 || idx >= cur.length) return map
    const nextSample = normalizarMuestra(tipoDesdeMuestra(indexOrSample), indexOrSample)
    if (!nextSample) return map
    return { ...map, [sp]: cur.map((x, i) => (i === idx ? nextSample : x)) }
  }

  const kind = normalizarTipo(kindOrIndex)
  const idx = Number(indexOrSample)
  if (!Number.isFinite(idx)) return map
  const nextSample = normalizarMuestra(kind, sampleMaybe)
  if (!nextSample) return map

  const curEntry = normalizarEntrada(map[sp])
  const curArr = asegurarArreglo(curEntry[kind])
  if (idx < 0 || idx >= curArr.length) return { ...map, [sp]: curEntry }
  const nextEntry = { ...curEntry, [kind]: curArr.map((x, i) => (i === idx ? nextSample : x)) }
  return { ...map, [sp]: nextEntry }
}

/**
 * Elimina una muestra por índice (formato heredado o por tipo+índice en formato actual).
 *
 * @param {unknown} lpMuestras - Mapa actual.
 * @param {number|string} especieId - Id de especie.
 * @param {string|number} kindOrIndex - Tipo (LP/L/D) o índice (formato heredado).
 * @param {number} [indexMaybe] - Índice (si `kindOrIndex` es tipo).
 * @returns {Record<string, any>} Nuevo mapa con la muestra eliminada.
 *
 * Dependencias externas:
 * - `ensureMap`, `ensureArr`, `normKind`, `normalizeEntry`.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function eliminarMuestra(lpMuestras, especieId, kindOrIndex, indexMaybe) {
  const map = asegurarMapa(lpMuestras)
  const sp = Number(especieId)
  if (!Number.isFinite(sp)) return map
  if (typeof kindOrIndex === 'number') {
    const cur = asegurarArreglo(map[sp])
    const idx = Number(kindOrIndex)
    if (!Number.isFinite(idx) || idx < 0 || idx >= cur.length) return map
    return { ...map, [sp]: cur.filter((_, i) => i !== idx) }
  }

  const kind = normalizarTipo(kindOrIndex)
  const idx = Number(indexMaybe)
  if (!Number.isFinite(idx)) return map
  const curEntry = normalizarEntrada(map[sp])
  const curArr = asegurarArreglo(curEntry[kind])
  if (idx < 0 || idx >= curArr.length) return { ...map, [sp]: curEntry }
  const nextEntry = { ...curEntry, [kind]: curArr.filter((_, i) => i !== idx) }
  return { ...map, [sp]: nextEntry }
}
