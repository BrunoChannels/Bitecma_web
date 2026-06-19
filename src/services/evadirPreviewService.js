/**
 * Normaliza un valor a número finito o `null` (utilidad para export EVADIR).
 *
 * @param {unknown} v - Valor a normalizar.
 * @returns {number|null} Número finito o `null`.
 *
 * Lógica:
 * 1) `null/undefined/''` => `null`.
 * 2) Si es number finito, retorna tal cual.
 * 3) Si es string, parsea tolerando coma decimal.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function normNumber(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Devuelve un número normalizado o un string vacío, para celdas de planilla.
 *
 * @param {unknown} v - Valor candidato.
 * @returns {number|string} Número si es válido; si no, ''.
 *
 * Dependencias externas:
 * - `normNumber` (este módulo).
 *
 * Notas de mantenimiento:
 * - EVADIR suele preferir celdas vacías en vez de `0` cuando no hay dato.
 */
export function numOrBlank(v) {
  const n = normNumber(v)
  return n === null ? '' : n
}

/**
 * Formatea un valor de coordenada para celda EVADIR con 4 decimales (cuando aplica).
 *
 * @param {unknown} v - Valor de coordenada (número o string).
 * @returns {string} String listo para celda (vacío si no hay valor).
 *
 * Lógica:
 * - Si es número finito => `toFixed(4)`.
 * - Si es entero en string => agrega `.0000`.
 * - Si tiene decimales => recorta/completea a 4 decimales.
 * - Si no parsea => devuelve el original (para no destruir formatos externos).
 *
 * Notas de mantenimiento:
 * - Se prefiere devolver string (no number) para mantener formato exacto en export.
 */
function coordCell(v) {
  if (v === null || v === undefined || v === '') return ''

  if (typeof v === 'number' && Number.isFinite(v)) return v.toFixed(4)

  const s0 = String(v).trim()
  if (s0 === '') return ''

  const s = s0.replace(',', '.')
  if (/^-?\d+$/.test(s)) return `${s}.0000`

  const m = s.match(/^(-?\d+)\.(\d+)$/)
  if (!m) return s0

  const dec = m[2]
  const dec4 = `${dec}0000`.slice(0, 4)
  return `${m[1]}.${dec4}`
}

/**
 * Obtiene el valor de coordenada de un transecto/cuadrante usando claves alternas.
 *
 * @param {object} t - Transecto/cuadrante.
 * @param {'x'|'y'|'lon'|'lat'} key - Coordenada solicitada.
 * @returns {number|string} Número (si parseable) o string (si viene textual); '' si no hay dato.
 *
 * Lógica:
 * 1) Recorre candidatos por key: `coordX/x`, `coordY/y`, `coordLong/lon`, `coordLat/lat`.
 * 2) Si es number finito, retorna número.
 * 3) Si es string numérico, intenta parsearlo; si no, retorna string original.
 *
 * Dependencias externas:
 * - `normNumber` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - Este fallback existe para soportar datos importados con distintas claves.
 */
export function getTxCoordValue(t, key) {
  if (!t) return ''
  const map = {
    x: ['coordX', 'x'],
    y: ['coordY', 'y'],
    lon: ['coordLong', 'lon'],
    lat: ['coordLat', 'lat'],
  }
  const candidates = map[key] || []
  for (const k of candidates) {
    const v = t[k]
    if (v === null || v === undefined) continue
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = normNumber(v)
    if (n !== null) return n
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

/**
 * Construye las “sheets” (arreglo-de-arreglos) para previsualizar/exportar EVADIR.
 *
 * @param {object} args - Parámetros.
 * @param {object} args.db - DB en memoria (se usa `db.especies`).
 * @param {object} args.op - Operación a exportar (con `botes`, `transectos`, `lpMuestras`).
 * @returns {{ sheets: Array<{name:string, aoa:any[][]}>, meta: any }} Sheets para export y metadata opcional.
 *
 * Lógica (alto nivel):
 * 1) Construye mapa de especies por id.
 * 2) Determina especies usadas en densidad (transectos/cuadrantes) y arma header EVADIR dinámico.
 * 3) Genera AOA de densidad, incluyendo conteos, densidades y coordenadas.
 * 4) Agrupa muestras L/P/D por especie y genera una sheet por especie/tipo.
 *
 * Dependencias externas:
 * - `normNumber`, `numOrBlank`, `coordCell`, `getTxCoordValue` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Si `op` es falsy retorna `{ sheets: [], meta: null }`.
 *
 * Notas de mantenimiento:
 * - Mantener nombres/headers alineados a las plantillas EVADIR vigentes.
 * - Hay compatibilidad con formatos heredados de `lpMuestras` (array, `{ ms }`, entry por tipo).
 */
export function buildEvadirPreviewSheets({ db, op }) {
  const ESPECIES = Array.isArray(db?.especies) ? db.especies : []
  if (!op) return { sheets: [], meta: null }

  const speciesById = (() => {
    const m = new Map()
    for (const e of ESPECIES) {
      const id = Number(e?.id)
      if (!Number.isFinite(id)) continue
      m.set(id, e)
    }
    return m
  })()

  const allTx = (op.botes || []).flatMap((b) => (b.transectos || []).map((t) => ({ b, t })))
  const hasAnyTx = allTx.some((x) => x.t?.tipo !== 'cuadrante')
  const hasAnyCuad = allTx.some((x) => x.t?.tipo === 'cuadrante')
  const mixedTypes = hasAnyTx && hasAnyCuad

  const allSpIds = [
    ...new Set(allTx.flatMap((x) => Object.keys(x.t?.counts || {}).map(Number)).filter((x) => !isNaN(x))),
  ].sort((a, b) => a - b)
  const allSp = allSpIds.map((id) => speciesById.get(id)).filter(Boolean)

  const txSpeciesIds = new Set()
  const cuadSpeciesIds = new Set()
  allTx.forEach(({ t }) => {
    const tipo = String(t?.tipo || 'transecto')
    const countIds = Object.keys(t?.counts || {})
      .map(Number)
      .filter((x) => Number.isFinite(x))
    if (tipo === 'cuadrante') {
      const especieId = Number(t?.especieId)
      if (Number.isFinite(especieId)) cuadSpeciesIds.add(especieId)
      countIds.forEach((id) => cuadSpeciesIds.add(id))
      return
    }
    countIds.forEach((id) => txSpeciesIds.add(id))
  })

  const getCountCell = (t, spId) => {
    const tipo = String(t?.tipo || 'transecto')
    const counts = t?.counts && typeof t.counts === 'object' ? t.counts : {}
    const hasOwn = Object.prototype.hasOwnProperty.call(counts, spId)
    const raw = hasOwn ? counts?.[spId] : undefined
    const n = raw === '' ? null : Number(raw)

    const isBlank = !hasOwn || raw === null || raw === undefined || raw === '' || !Number.isFinite(n)
    if (tipo === 'cuadrante') {
      const especieId = Number(t?.especieId)
      const isRowSpecies = Number.isFinite(especieId) ? especieId === spId : hasOwn
      if (!isRowSpecies) return ''
      if (isBlank) return ''
      return n
    }
    if (mixedTypes && !txSpeciesIds.has(spId) && cuadSpeciesIds.has(spId)) return ''
    if (isBlank) return ''
    return n
  }

  const densHeader = [
    'REGION',
    'NOMBRE SECTOR',
    'TIPO DE ORGANIZACIÓN',
    'NOMBRE ORGANIZACIÓN',
    'FECHA',
    'DIA',
    'MES',
    'AÑO',
    'BOTE',
    'ZONA MUESTREO',
    'BUZO',
    'TIPO UNIDAD',
    'NUM',
    'AREA',
    ...allSp.map((s) => `NUM ${String(s.com || s.sci || '').toUpperCase()}`),
    'TIPO SUSTRATO',
    'CUBIERTA BIOLOGICA',
    ...allSp.map((s) => `DENS ${String(s.com || s.sci || '').toUpperCase()} (N° IND/M2)`),
    'X',
    'Y',
    'LONG',
    'LAT',
    'DATUM',
  ]

  const densAoa = [densHeader]
  ;(op.botes || []).forEach((b) => {
    ;(b.transectos || []).forEach((t) => {
      if (!t) return
      const f = String(t.fecha || op.fechaInicio || '')
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f.slice(8, 10) : ''
      const mes = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f.slice(5, 7) : ''
      const año = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f.slice(0, 4) : ''
      const tipoUnidad = t.tipo === 'cuadrante' ? 'Cuadrante' : 'Transecto'
      const row = []
      row.push(
        op.region,
        op.sector,
        op.tipoOrg,
        op.org,
        f,
        dia,
        mes,
        año,
        b.nombre,
        b.zona,
        b.buzo,
        tipoUnidad,
        t.num,
        t.area,
      )
      allSpIds.forEach((id) => row.push(getCountCell(t, id)))
      row.push(String(t.sustrato || ''), String(t.cubierta || ''))
      allSpIds.forEach((id) => {
        const area = Number(t.area) || 0
        const cntCell = getCountCell(t, id)
        if (cntCell === '') {
          row.push('')
          return
        }
        const cnt = Number(cntCell)
        const dens = area > 0 ? cnt / area : 0
        row.push(dens)
      })
      row.push(
        coordCell(getTxCoordValue(t, 'x')),
        coordCell(getTxCoordValue(t, 'y')),
        coordCell(getTxCoordValue(t, 'lon')),
        coordCell(getTxCoordValue(t, 'lat')),
        String(t.datum || 'WGS 84'),
      )
      densAoa.push(row)
    })
  })

  const ALGA_IDS = new Set([14, 15, 16, 17, 18, 30, 31, 32])
  const isAlgaId = (spId) => ALGA_IDS.has(parseInt(spId))

  const lpGroups = new Map()
  const pushLP = (kind, spId, row) => {
    const key = `${kind}:${spId}`
    if (!lpGroups.has(key)) lpGroups.set(key, [])
    lpGroups.get(key).push(row)
  }
  const especiesConLongitudExplicita = new Set()

  const normKind = (kind) => {
    const k = String(kind || '').trim().toUpperCase()
    if (k === 'L-P' || k === 'LP') return 'LP'
    if (k === 'D') return 'D'
    return 'L'
  }
  const eachLpSample = (entry, cb) => {
    if (Array.isArray(entry)) {
      entry.forEach((m) => cb(m, null))
      return
    }
    if (entry && typeof entry === 'object') {
      if (Array.isArray(entry.ms)) {
        const k = normKind(entry.type || 'LP')
        entry.ms.forEach((m) => cb(m, k))
        return
      }
      ;['D', 'LP', 'L'].forEach((k) => {
        const arr = entry?.[k]
        if (Array.isArray(arr)) arr.forEach((m) => cb(m, k))
      })
    }
  }

  const getBoteCell = (b) => {
    const submareal = b?.submareal == null ? true : b?.submareal === true || b?.submareal === 1 || b?.submareal === '1'
    if (!submareal) return 'Intermareal'
    return String(b?.nombre || '').trim()
  }

  ;(op.botes || []).forEach((b) => {
    Object.entries(b.lpMuestras || {}).forEach(([spIdRaw, entry]) => {
      const spId = parseInt(spIdRaw)
      const hasExplicitL =
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        !Array.isArray(entry.ms) &&
        Object.prototype.hasOwnProperty.call(entry, 'L')
      if (hasExplicitL) especiesConLongitudExplicita.add(spId)
    })
  })

  ;(op.botes || []).forEach((b) => {
    Object.entries(b.lpMuestras || {}).forEach(([spIdRaw, entry]) => {
      const spId = parseInt(spIdRaw)
      const sp = speciesById.get(spId)

      eachLpSample(entry, (m, forcedKind) => {
        const isAlga = isAlgaId(spId)
        const hasPeso = m && m.p !== undefined && m.p !== null && m.p !== ''
        const kind = forcedKind || (isAlga ? 'D' : hasPeso ? 'LP' : 'L')
        const row = {
          region: op.region,
          sector: op.sector,
          tipoOrg: op.tipoOrg,
          org: op.org,
          fecha: op.fechaInicio,
          dia: String(op.fechaInicio || '').slice(8, 10),
          mes: String(op.fechaInicio || '').slice(5, 7),
          año: String(op.fechaInicio || '').slice(0, 4),
          seg: op.numSeg ?? '',
          zona: b.zona,
          bote: getBoteCell(b),
          buzo: b.buzo,
          especie: sp?.com || sp?.sci || '',
          l: m?.l ?? m?.d ?? '',
          p: m?.p ?? '',
          d: m?.d ?? m?.l ?? '',
        }
        pushLP(kind, spId, row)
        if (!isAlga && especiesConLongitudExplicita.has(spId) && kind === 'LP') pushLP('L', spId, row)
      })
    })
  })

  const sheets = [{ name: 'EVADIR', aoa: densAoa }]

  ;[...lpGroups.entries()].forEach(([key, rows]) => {
    const [kind, spIdRaw] = key.split(':')
    const spId = parseInt(spIdRaw)
    const sp = speciesById.get(spId)
    const com = String(sp?.com || sp?.sci || spIdRaw)
    if (kind === 'LP') {
      const header = [
        'REGION',
        'SECTOR',
        'TIPO ORG',
        'ORGANIZACIÓN',
        'FECHA',
        'DIA',
        'MES',
        'AÑO',
        'SEG',
        'BOTE',
        'ZONA',
        'BUZO',
        'ESPECIE',
        'LONGITUD MM',
        'PESO G',
        'IC',
      ]
      const aoa = [
        header,
        ...rows.map((r) => {
          const l = numOrBlank(r.l)
          const p = numOrBlank(r.p)
          const ic = l && p && Number(l) > 0 ? Number(p) / Math.pow(Number(l), 3) : 0
          return [
            r.region,
            r.sector,
            r.tipoOrg,
            r.org,
            r.fecha,
            r.dia,
            r.mes,
            r.año,
            r.seg,
            r.bote,
            r.zona,
            r.buzo,
            r.especie,
            l,
            p,
            ic,
          ]
        }),
      ]
      sheets.push({ name: `LP ${com}`, aoa })
    } else if (kind === 'L') {
      const header = [
        'REGION',
        'SECTOR',
        'TIPO ORG',
        'ORGANIZACIÓN',
        'FECHA',
        'DIA',
        'MES',
        'AÑO',
        'SEG',
        'BOTE',
        'ZONA',
        'BUZO',
        'ESPECIE',
        'LONGITUD MM',
      ]
      const aoa = [
        header,
        ...rows.map((r) => [
          r.region,
          r.sector,
          r.tipoOrg,
          r.org,
          r.fecha,
          r.dia,
          r.mes,
          r.año,
          r.seg,
          r.bote,
          r.zona,
          r.buzo,
          r.especie,
          numOrBlank(r.l),
        ]),
      ]
      sheets.push({ name: `L ${com}`, aoa })
    } else if (kind === 'D') {
      const header = [
        'REGION',
        'SECTOR',
        'TIPO ORG',
        'ORGANIZACIÓN',
        'FECHA',
        'DIA',
        'MES',
        'AÑO',
        'SEG',
        'BOTE',
        'ZONA',
        'BUZO',
        'ESPECIE',
        'DIAM DISCO CM',
      ]
      const aoa = [
        header,
        ...rows.map((r) => [
          r.region,
          r.sector,
          r.tipoOrg,
          r.org,
          r.fecha,
          r.dia,
          r.mes,
          r.año,
          r.seg,
          r.bote,
          r.zona,
          r.buzo,
          r.especie,
          numOrBlank(r.d),
        ]),
      ]
      sheets.push({ name: `D ${com}`, aoa })
    }
  })

  return {
    meta: { opId: op.id, sector: op.sector, seg: op.numSeg, fechaInicio: op.fechaInicio },
    sheets,
  }
}
