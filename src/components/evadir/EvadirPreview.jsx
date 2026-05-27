import { useEffect, useMemo, useState } from 'react'
import { buildEvadirPreviewSheets } from '../../services/evadirPreviewService.js'
import { useUi } from '../../context/uiContext.jsx'
import { useApp } from '../../context/appContext.jsx'
import { normalizarZonaMuestreo } from '../../services/operacionesService.js'

const PLOT_PAD = { l: 54, r: 10, t: 24, b: 44 }

/**
 * Normaliza una clave de texto para comparaciones robustas (mayúsculas, sin acentos, espacios colapsados).
 *
 * @param {unknown} v - Texto de entrada.
 * @returns {string} Clave normalizada, apta para comparaciones e inclusión en sets/maps.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Pasa a mayúsculas.
 * 3) Normaliza unicode y elimina diacríticos.
 * 4) Colapsa espacios múltiples y recorta.
 *
 * Dependencias externas:
 * - APIs estándar de string (`normalize`).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica; siempre retorna string.
 *
 * @example
 * normKey('Región Ñuble') // 'REGION NUBLE'
 *
 * Notas de mantenimiento:
 * - Mantener consistente con otros normalizadores si se unifica a un helper común.
 */
function normKey(v) {
  return String(v || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function zonasMuestreoCoinciden(zonaBoteRaw, zonaPuntoRaw) {
  const zonaBote = normalizarZonaMuestreo(zonaBoteRaw)
  const zonaPunto = normalizarZonaMuestreo(zonaPuntoRaw)
  if (!zonaPunto) return true
  if (!zonaBote) return false

  const esNumeroBote = /^\d+$/.test(zonaBote)
  const esNumeroPunto = /^\d+$/.test(zonaPunto)
  if (esNumeroBote && esNumeroPunto) return parseInt(zonaBote, 10) === parseInt(zonaPunto, 10)
  return zonaBote.localeCompare(zonaPunto, 'es', { sensitivity: 'base' }) === 0
}

/**
 * Formatea un valor de coordenada a string con 4 decimales cuando es posible.
 *
 * @param {unknown} v - Valor crudo (string/number) de coordenada.
 * @returns {string} Coordenada formateada o '—' si no hay dato.
 *
 * Lógica:
 * 1) Normaliza a string y recorta.
 * 2) Reemplaza coma por punto.
 * 3) Si es entero, agrega `.0000`.
 * 4) Si es decimal, trunca/complete a 4 decimales.
 * 5) Si no matchea patrón numérico, retorna el original (para no “inventar” datos).
 *
 * Dependencias externas:
 * - RegEx.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; retorna formato seguro.
 *
 * @example
 * fmtCoordString('70,123') // '70.1230'
 *
 * Notas de mantenimiento:
 * - Evitar redondeos agresivos; aquí se busca consistencia visual con 4 decimales.
 */
function fmtCoordString(v) {
  const s0 = String(v ?? '').trim()
  if (s0 === '') return '—'

  const s = s0.replace(',', '.')
  if (/^-?\d+$/.test(s)) return `${s}.0000`

  const m = s.match(/^(-?\d+)\.(\d+)$/)
  if (!m) return s0

  const dec = m[2]
  const dec4 = `${dec}0000`.slice(0, 4)
  return `${m[1]}.${dec4}`
}

/**
 * Formatea un valor de celda para despliegue en la tabla de previsualización.
 *
 * @param {unknown} v - Valor crudo (puede venir como number, string u objeto `{ v }`).
 * @param {'coord'|'dens'|undefined} kind - Tipo de formato especial (coordenadas o densidad).
 * @returns {string} Texto listo para mostrar; retorna '—' si no hay dato.
 *
 * Lógica:
 * 1) Maneja `null/undefined` devolviendo '—'.
 * 2) Si es objeto, intenta leer `v.v` (estructura típica de celdas parseadas).
 * 3) Si `kind` es 'coord', intenta forzar 4 decimales (number) o usa `fmtCoordString` (string).
 * 4) Si es number finito:
 *    - Para 'dens' usa `toFixed(4)`.
 *    - Para otros, retorna string.
 * 5) Para strings: trim y retorna '—' si queda vacío.
 *
 * Dependencias externas:
 * - `fmtCoordString`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; es tolerante a entradas mixtas.
 *
 * @example
 * fmt(12.34567, 'dens') // '12.3457'
 *
 * Notas de mantenimiento:
 * - Mantener el tratamiento de objetos `{ v }` alineado con el servicio que construye hojas.
 */
function fmt(v, kind) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return v?.v ?? '—'

  if (kind === 'coord') {
    if (typeof v === 'number' && Number.isFinite(v)) return v.toFixed(4)
    return fmtCoordString(v)
  }

  if (typeof v === 'number' && Number.isFinite(v)) {
    if (kind === 'dens') return v.toFixed(4)
    return Number.isInteger(v) ? String(v) : String(v)
  }

  const s = String(v).trim()
  return s === '' ? '—' : s
}

/**
 * Convierte una celda/valor a número finito o `null` si no se puede parsear.
 *
 * @param {unknown} v - Valor crudo (number, string, u objeto `{ v }`).
 * @returns {number|null} Número finito o `null` si no hay dato/parseo inválido.
 *
 * Lógica:
 * 1) Trata `null/undefined/''` como ausencia de dato -> `null`.
 * 2) Si es objeto, intenta usar `v.v`.
 * 3) Si es number finito, lo retorna.
 * 4) Si es string, recorta y reemplaza coma por punto, luego `Number(...)`.
 * 5) Si no es finito, retorna `null`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; retorna `null` en inválidos.
 *
 * @example
 * toNumber('12,5') // 12.5
 *
 * Notas de mantenimiento:
 * - Mantener consistente con parseos de EVADIR/LP en otros módulos.
 */
function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const raw = typeof v === 'object' ? v?.v : v
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number(String(raw).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Gráfico de dispersión Longitud vs Peso (LP) con ajuste de potencia y selección de puntos.
 *
 * @param {object} props - Props del componente.
 * @param {Array<object>} props.points - Puntos a graficar (se espera {x, y, ...meta}).
 * @param {number} [props.width=520] - Ancho lógico del SVG (viewBox).
 * @param {number} [props.height=170] - Alto lógico del SVG (viewBox).
 * @param {string} [props.title='Relación Peso - Longitud'] - Título mostrado sobre el gráfico.
 * @param {(meta: any) => void} [props.onJump] - Callback opcional al clickear el tooltip de un punto seleccionado.
 * @returns {import('react').JSX.Element} Card con SVG del scatterplot.
 *
 * Lógica:
 * 1) Normaliza dimensiones y define paddings y escalas.
 * 2) Calcula `stats`:
 *    - máximos x/y para escalar,
 *    - regresión tipo potencia `y = a * x^b` usando log-log,
 *    - R² sobre el espacio log.
 * 3) Construye `plot` con ticks, círculos (puntos) y la curva de regresión (path).
 * 4) Permite seleccionar un punto (click en círculo) y mostrar tooltip; al click en tooltip ejecuta `onJump(meta)` si existe.
 *
 * Dependencias externas:
 * - React hooks: `useState`, `useMemo`.
 * - Helpers locales: `toNumber`.
 *
 * Efectos secundarios:
 * - Ninguno (solo estado local de selección).
 *
 * Manejo de errores:
 * - Si hay pocos puntos o denominadores inválidos, omite regresión (reg = null).
 *
 * @example
 * <LpScatter points={[{ x: 120, y: 40, boteNombre: '...' }]} onJump={(pt) => console.log(pt)} />
 *
 * Notas de mantenimiento:
 * - La regresión se calcula en log; asegurar `x>0` y `y>0` para incluir un punto.
 * - Si se desea performance en datasets grandes, considerar muestreo o canvas.
 */
function LpScatter({ points, width = 520, height = 170, title = 'Relación Peso - Longitud', onJump }) {
  const w = Math.max(240, width)
  const h = Math.max(160, height)
  const [sel, setSel] = useState(null)

  const stats = useMemo(() => {
    const pts = Array.isArray(points) ? points : []
    let maxX = 0
    let maxY = 0
    let minXPos = Infinity
    let minYPos = Infinity
    const forReg = []

    pts.forEach((p) => {
      const x = toNumber(p?.x)
      const y = toNumber(p?.y)
      if (x === null || y === null) return
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (x > 0 && x < minXPos) minXPos = x
      if (y > 0 && y < minYPos) minYPos = y
      if (x > 0 && y > 0) forReg.push({ x, y })
    })

    const xMax = maxX > 0 ? Math.ceil(maxX * 1.05) : 1
    const yMax = maxY > 0 ? Math.ceil(maxY * 1.05) : 1

    /**
     * Calcula parámetros de regresión potencia `y = a * x^b` y R² en el espacio log.
     *
     * @returns {{a:number,b:number,r2:number|null}|null} Parámetros de regresión o `null` si no aplica.
     *
     * Lógica:
     * 1) Requiere al menos 2 puntos con `x>0` y `y>0`.
     * 2) Ajusta por mínimos cuadrados en log-log: `log(y)=a0 + b*log(x)`.
     * 3) Convierte `a = exp(a0)` y calcula R² en log.
     *
     * Dependencias externas:
     * - `forReg` (puntos válidos para regresión).
     *
     * Efectos secundarios:
     * - Ninguno.
     *
     * Notas de mantenimiento:
     * - Si cambia la forma del modelo (lineal, expo, etc.), ajustar aquí y el label de ecuación.
     */
    const reg = (() => {
      const n = forReg.length
      if (n < 2) return null

      let sumX = 0
      let sumY = 0
      let sumXX = 0
      let sumXY = 0
      forReg.forEach(({ x, y }) => {
        const lx = Math.log(x)
        const ly = Math.log(y)
        sumX += lx
        sumY += ly
        sumXX += lx * lx
        sumXY += lx * ly
      })

      const denom = n * sumXX - sumX * sumX
      if (!Number.isFinite(denom) || denom === 0) return null

      const b = (n * sumXY - sumX * sumY) / denom
      const a0 = (sumY - b * sumX) / n
      const a = Math.exp(a0)

      let ssTot = 0
      let ssRes = 0
      const yBar = sumY / n
      forReg.forEach(({ x, y }) => {
        const ly = Math.log(y)
        const lyHat = a0 + b * Math.log(x)
        ssTot += Math.pow(ly - yBar, 2)
        ssRes += Math.pow(ly - lyHat, 2)
      })
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : null

      return { a, b, r2 }
    })()

    return { xMax, yMax, reg }
  }, [points])

  const plot = useMemo(() => {
    const pts = Array.isArray(points) ? points : []
    const x0 = PLOT_PAD.l
    const y0 = h - PLOT_PAD.b
    const x1 = w - PLOT_PAD.r
    const y1 = PLOT_PAD.t

    const sx = (x) => x0 + (x / stats.xMax) * (x1 - x0)
    const sy = (y) => y0 - (y / stats.yMax) * (y0 - y1)

    const ticks = (max, n = 5) => {
      const out = []
      for (let i = 0; i <= n; i++) out.push((max * i) / n)
      return out
    }
    const xTicks = ticks(stats.xMax, 5)
    const yTicks = ticks(stats.yMax, 5)

    const circles = pts
      .map((p, i) => ({ p, i, x: toNumber(p?.x), y: toNumber(p?.y) }))
      .filter((it) => it.x !== null && it.y !== null)
      .map((it) => ({
        key: it.i,
        cx: sx(it.x),
        cy: sy(it.y),
        x: it.x,
        y: it.y,
        meta: it.p,
      }))

    /**
     * Construye el path SVG de la curva de regresión (si existe regresión).
     *
     * @returns {string|null} String `d` para `<path />` o `null` si no hay regresión.
     *
     * Lógica:
     * 1) Samplea `x` en `[0..xMax]` (omitiendo x<=0).
     * 2) Calcula `y = a*x^b`.
     * 3) Proyecta a coordenadas SVG con `sx/sy` y genera comandos `M/L`.
     *
     * Dependencias externas:
     * - `stats.reg`, `stats.xMax`, `sx`, `sy`.
     *
     * Efectos secundarios:
     * - Ninguno.
     */
    const line = (() => {
      if (!stats.reg) return null
      const { a, b } = stats.reg
      const steps = 40
      const xs = Array.from({ length: steps + 1 }, (_, i) => (stats.xMax * i) / steps)
      const d = xs
        .filter((x) => x > 0)
        .map((x, idx) => {
          const y = a * Math.pow(x, b)
          const cmd = idx === 0 ? 'M' : 'L'
          return `${cmd}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`
        })
        .join(' ')
      return d || null
    })()

    return { circles, line, sx, sy, xTicks, yTicks, x0, x1, y0, y1 }
  }, [points, stats, w, h])

  const labelEq = stats.reg
    ? `y = ${stats.reg.a.toFixed(4)}x^${stats.reg.b.toFixed(4)}`
    : null
  const labelR2 = stats.reg && stats.reg.r2 !== null ? `R² = ${stats.reg.r2.toFixed(4)}` : null

  const selected = useMemo(() => {
    if (!sel) return null
    const x = toNumber(sel?.x)
    const y = toNumber(sel?.y)
    if (x === null || y === null) return null
    const cx = plot.sx(x)
    const cy = plot.sy(y)

    const boxW = 132
    const boxH = 38
    const margin = 6
    let bx = cx + 10
    let by = cy - boxH - 10
    if (bx + boxW > plot.x1) bx = cx - boxW - 10
    if (bx < plot.x0) bx = plot.x0 + margin
    if (by < plot.y1) by = cy + 10
    if (by + boxH > plot.y0) by = plot.y0 - boxH - margin

    return { cx, cy, bx, by, boxW, boxH, x, y, meta: sel }
  }, [sel, plot])

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>{title}</div>
        {labelEq || labelR2 ? (
          <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.15, color: 'rgba(0,0,0,0.75)' }}>
            {labelEq ? <div>{labelEq}</div> : null}
            {labelR2 ? <div>{labelR2}</div> : null}
          </div>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
        onClick={() => setSel(null)}
      >
        <rect x="0" y="0" width={w} height={h} fill="white" stroke="rgba(0,0,0,0.06)" />

        {plot.xTicks.slice(1).map((t, i) => {
          const x = plot.sx(t)
          return <line key={`gx-${i}`} x1={x} y1={PLOT_PAD.t} x2={x} y2={h - PLOT_PAD.b} stroke="rgba(0,0,0,0.08)" />
        })}
        {plot.yTicks.slice(1).map((t, i) => {
          const y = plot.sy(t)
          return <line key={`gy-${i}`} x1={PLOT_PAD.l} y1={y} x2={w - PLOT_PAD.r} y2={y} stroke="rgba(0,0,0,0.08)" />
        })}

        <line x1={PLOT_PAD.l} y1={h - PLOT_PAD.b} x2={w - PLOT_PAD.r} y2={h - PLOT_PAD.b} stroke="rgba(0,0,0,0.35)" />
        <line x1={PLOT_PAD.l} y1={PLOT_PAD.t} x2={PLOT_PAD.l} y2={h - PLOT_PAD.b} stroke="rgba(0,0,0,0.35)" />

        {plot.xTicks.map((t, i) => {
          const x = plot.sx(t)
          const txt = Number.isInteger(t) ? String(t) : t.toFixed(0)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={h - PLOT_PAD.b} x2={x} y2={h - PLOT_PAD.b + 4} stroke="rgba(0,0,0,0.35)" />
              <text x={x} y={h - PLOT_PAD.b + 16} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.65)">
                {txt}
              </text>
            </g>
          )
        })}
        {plot.yTicks.map((t, i) => {
          const y = plot.sy(t)
          const txt = Number.isInteger(t) ? String(t) : t.toFixed(0)
          return (
            <g key={`yt-${i}`}>
              <line x1={PLOT_PAD.l - 4} y1={y} x2={PLOT_PAD.l} y2={y} stroke="rgba(0,0,0,0.35)" />
              <text x={PLOT_PAD.l - 8} y={y + 3} textAnchor="end" fontSize="10" fill="rgba(0,0,0,0.65)">
                {txt}
              </text>
            </g>
          )
        })}

        {plot.line ? <path d={plot.line} fill="none" stroke="#2F6FDC" strokeWidth="2" strokeDasharray="4 4" /> : null}
        {plot.circles.map((c) => (
          <circle
            key={c.key}
            cx={c.cx}
            cy={c.cy}
            r="3"
            fill="#2F6FDC"
            opacity="0.85"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              setSel(c.meta)
            }}
          />
        ))}

        {selected ? (
          <g
            style={{ cursor: typeof onJump === 'function' ? 'pointer' : 'default' }}
            onClick={(e) => {
              e.stopPropagation()
              if (typeof onJump !== 'function') return
              onJump(selected.meta)
            }}
          >
            <rect
              x={selected.bx}
              y={selected.by}
              width={selected.boxW}
              height={selected.boxH}
              rx="6"
              ry="6"
              fill="white"
              stroke="rgba(0,0,0,0.22)"
            />
            <text x={selected.bx + 10} y={selected.by + 16} fontSize="11" fill="rgba(0,0,0,0.82)">
              {`L: ${selected.x}`}
            </text>
            <text x={selected.bx + 10} y={selected.by + 32} fontSize="11" fill="rgba(0,0,0,0.82)">
              {`P: ${selected.y}`}
            </text>
          </g>
        ) : null}

        <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="12" fill="rgba(0,0,0,0.75)">
          Longitud (mm)
        </text>
        <text
          x={18}
          y={h / 2}
          textAnchor="middle"
          fontSize="12"
          fill="rgba(0,0,0,0.75)"
          transform={`rotate(-90 18 ${h / 2})`}
        >
          Peso (g)
        </text>
      </svg>
    </div>
  )
}

/**
 * Construye un mapa índice para acceder rápidamente a columnas por nombre exacto.
 *
 * @param {unknown} header - Fila de encabezado (se espera array de strings).
 * @returns {Map<string, number>} Map donde la clave es el encabezado (trim) y el valor es su índice.
 *
 * Lógica:
 * 1) Itera los encabezados (si es array).
 * 2) Convierte cada celda a string y recorta.
 * 3) Inserta en `Map` con su índice.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a entradas no array.
 *
 * @example
 * const map = headerIndexMap(['BOTE','BUZO'])
 * map.get('BUZO') // 1
 *
 * Notas de mantenimiento:
 * - Si hay encabezados duplicados, el último sobrescribe al anterior.
 */
function headerIndexMap(header) {
  const m = new Map()
  ;(Array.isArray(header) ? header : []).forEach((h, i) => {
    m.set(String(h || '').trim(), i)
  })
  return m
}

/**
 * Busca el índice del primer encabezado que cumpla una condición.
 *
 * @param {unknown} header - Fila de encabezado (se espera array).
 * @param {(h: string, idx: number) => boolean} predicate - Predicado de búsqueda.
 * @returns {number} Índice encontrado, o -1 si no hay match.
 *
 * Lógica:
 * 1) Recorre encabezados.
 * 2) Normaliza cada valor a string trim.
 * 3) Retorna el primer índice que cumpla el predicado.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Si `header` no es array, retorna -1.
 *
 * @example
 * findHeaderIndex(['DENS A', 'DENS B'], (h) => h.startsWith('DENS')) // 0
 *
 * Notas de mantenimiento:
 * - Mantener predicados simples para evitar costo alto por fila.
 */
function findHeaderIndex(header, predicate) {
  const arr = Array.isArray(header) ? header : []
  for (let i = 0; i < arr.length; i++) {
    if (predicate(String(arr[i] || '').trim(), i)) return i
  }
  return -1
}

/**
 * Extrae nombres de especies desde columnas tipo `NUM <especie>` del encabezado EVADIR.
 *
 * @param {unknown} header - Fila de encabezado (array).
 * @param {Set<string>} [knownSpeciesNorm] - Set opcional de especies conocidas (normalizadas) para filtrar.
 * @returns {string[]} Lista de nombres de especie tal como aparecen en el encabezado.
 *
 * Lógica:
 * 1) Recorre encabezados y filtra los que empiezan con "NUM ".
 * 2) Extrae el texto posterior como nombre de especie.
 * 3) Excluye explícitamente "SEG ESBA".
 * 4) Si `knownSpeciesNorm` está presente, conserva solo especies que existan en ese set.
 *
 * Dependencias externas:
 * - `normKey` para normalizar comparaciones.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a encabezados no string.
 *
 * @example
 * extractSpeciesFromEvadirHeader(['NUM Loco', 'DENS Loco'], new Set(['LOCO'])) // ['Loco']
 *
 * Notas de mantenimiento:
 * - Si el formato del EVADIR cambia (prefijos distintos), ajustar la detección aquí.
 */
function extractSpeciesFromEvadirHeader(header, knownSpeciesNorm) {
  const out = []
  const known = knownSpeciesNorm instanceof Set ? knownSpeciesNorm : null

  ;(Array.isArray(header) ? header : []).forEach((h) => {
    const s = String(h || '').trim()
    if (!s.toUpperCase().startsWith('NUM ')) return
    const name = s.slice(4).trim()
    if (!name) return

    const nk = normKey(name)
    if (nk === 'SEG ESBA') return
    if (known && !known.has(nk)) return

    out.push(name)
  })

  return out
}


/**
 * Cuenta muestras de LP/L/D presentes en una operación (a través de `botes[].lpMuestras`).
 *
 * @param {object} op - Operación que contiene botes y muestreos.
 * @returns {{ LP: number, L: number, D: number, total: number }} Conteo por tipo y total.
 *
 * Lógica:
 * 1) Inicializa contadores.
 * 2) Recorre botes y sus `lpMuestras` (por especie).
 * 3) Soporta distintos esquemas de storage: arrays, `{type, ms}`, o `{LP,L,D}`.
 * 4) Infere el kind si no viene forzado (si hay peso -> LP, si no -> L).
 * 5) Acumula contadores y total.
 *
 * Dependencias externas:
 * - Ninguna (usa helpers locales internos).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a datos incompletos.
 *
 * @example
 * const c = countSamplesFromOp(op)
 * console.log(c.total)
 *
 * Notas de mantenimiento:
 * - Mantener compatibilidad con estructuras históricas de `lpMuestras`.
 */
function countSamplesFromOp(op) {
  const out = { LP: 0, L: 0, D: 0, total: 0 }
  const botes = Array.isArray(op?.botes) ? op.botes : []

  const normKind = (k) => {
    const kk = String(k || '').trim().toUpperCase()
    if (kk === 'L-P' || kk === 'LP') return 'LP'
    if (kk === 'D') return 'D'
    return 'L'
  }

  const each = (entry, cb) => {
    if (!entry) return
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

  botes.forEach((b) => {
    const lp = b?.lpMuestras && typeof b.lpMuestras === 'object' ? b.lpMuestras : {}
    Object.values(lp).forEach((entry) => {
      each(entry, (m, forcedKind) => {
        const hasPeso = m && m.p !== undefined && m.p !== null && m.p !== ''
        const kind = forcedKind || (hasPeso ? 'LP' : 'L')
        const k = normKind(kind)
        out[k] = (out[k] || 0) + 1
        out.total++
      })
    })
  })

  return out
}

/**
 * Previsualiza la operación EVADIR en formato tabla (y, para LP, un scatterplot LP).
 *
 * Este componente no genera archivos; muestra una vista previa basada en hojas construidas por el servicio.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.db - DB parcial (se usa principalmente `db.especies`).
 * @param {object|null} props.op - Operación a previsualizar. Si es null, se muestra error.
 * @returns {import('react').JSX.Element} UI de previsualización con tabs por “hoja”.
 *
 * Lógica:
 * 1) Construye “sheets” mediante `buildEvadirPreviewSheets`.
 * 2) Mantiene UI state: tab activo, límites de filas, filtro de tipo de unidad y modo móvil.
 * 3) Deriva header/rows y mapas de índice para resolver columnas.
 * 4) Detecta tipo de hoja activa (EVADIR/LP/L/D) y aplica:
 *    - Filtro por unidad (transecto/cuadrante) si corresponde.
 *    - Recorte de filas por `rowLimit`.
 * 5) Para LP:
 *    - Construye `lpPreview` (maxL/maxP/points) y ofrece gráfico de dispersión.
 *    - Al clickear un punto, emite una señal de “jump” vía `sessionStorage` + `CustomEvent` y navega a Operaciones.
 * 6) Renderiza tabla con encabezados sticky y filas formateadas mediante `fmt`.
 *
 * Dependencias externas:
 * - [buildEvadirPreviewSheets](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/evadirPreviewService.js) para construir hojas.
 * - Contextos: [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx) y [useApp](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx).
 * - `sessionStorage` y `window.dispatchEvent` para integración de salto LP.
 *
 * Efectos secundarios:
 * - Registra listeners de `matchMedia` (con cleanup).
 * - Puede escribir en `sessionStorage` y despachar `CustomEvent` para integración de navegación.
 * - Puede disparar navegación (`navigate('ops')`) y cerrar modal (`closeModal()`).
 *
 * Manejo de errores:
 * - Si `op` es null, muestra un “Operación no encontrada”.
 * - Envuelve `sessionStorage`/`dispatchEvent` en try/catch para evitar fallas en entornos restringidos.
 *
 * @example
 * <EvadirPreview db={db} op={operacion} />
 *
 * Notas de mantenimiento:
 * - Mantener nombres de hojas/columnas alineados con el export EVADIR y el servicio de preview.
 * - La lógica de “jump” debe mantenerse compatible con el consumidor (LpTab/BoteCard).
 */
export default function EvadirPreview({ db, op }) {
  const { closeModal } = useUi()
  const { navigate } = useApp()
  const especies = db?.especies
  const { sheets } = useMemo(() => buildEvadirPreviewSheets({ db: { especies }, op }), [especies, op])
  const [tab, setTab] = useState(() => sheets[0]?.name || 'EVADIR')
  const [rowLimit, setRowLimit] = useState(250)
  const [unidadFilter, setUnidadFilter] = useState('todos')
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    const mm = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null
    return !!mm?.matches
  })
  const [showLpChart, setShowLpChart] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia) return
    const mm = window.matchMedia('(max-width: 768px)')
    const handler = () => setIsMobile(!!mm.matches)
    handler()
    if (typeof mm.addEventListener === 'function') mm.addEventListener('change', handler)
    else if (typeof mm.addListener === 'function') mm.addListener(handler)
    return () => {
      if (typeof mm.removeEventListener === 'function') mm.removeEventListener('change', handler)
      else if (typeof mm.removeListener === 'function') mm.removeListener(handler)
    }
  }, [])

  const opHeader = useMemo(() => {
    const id = String(op?.id || '—')
    const seg = op?.numSeg ?? '—'
    const sector = String(op?.sector || '—')
    const region = op?.region ?? '—'
    const org = String(op?.org || '—')
    const tipoOrg = String(op?.tipoOrg || '—')
    const fecha = String(op?.fechaInicio || '—')
    return { id, seg, sector, region, org, tipoOrg, fecha }
  }, [op])

  const resumen = useMemo(() => {
    const botes = Array.isArray(op?.botes) ? op.botes : []
    const totalBotes = botes.length
    const totalUnidades = botes.reduce((acc, b) => acc + ((b?.transectos || []).length || 0), 0)
    const totalTx = botes.reduce((acc, b) => acc + ((b?.transectos || []).filter((t) => t?.tipo !== 'cuadrante').length || 0), 0)
    const totalCq = botes.reduce((acc, b) => acc + ((b?.transectos || []).filter((t) => t?.tipo === 'cuadrante').length || 0), 0)
    const muestras = countSamplesFromOp(op)
    return { totalBotes, totalUnidades, totalTx, totalCq, muestras }
  }, [op])

  const sheetByName = useMemo(() => new Map((Array.isArray(sheets) ? sheets : []).map((s) => [String(s?.name || ''), s])), [sheets])
  const currentSheet = sheetByName.get(tab) || sheets[0] || null
  const aoa = useMemo(() => currentSheet?.aoa || [], [currentSheet])
  const header = useMemo(() => (Array.isArray(aoa?.[0]) ? aoa[0] : []), [aoa])
  const rows = useMemo(() => aoa.slice(1), [aoa])
  const headerMap = useMemo(() => headerIndexMap(header), [header])

  const isEvadirTab = String(tab || '').toUpperCase().startsWith('EVADIR')
  const isLpTab = String(tab || '').toUpperCase().startsWith('LP ')
  const isLTab = String(tab || '').toUpperCase().startsWith('L ')
  const isDTab = String(tab || '').toUpperCase().startsWith('D ')

  const knownSpeciesNorm = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    const set = new Set()
    arr.forEach((e) => {
      const com = String(e?.com || '').trim()
      const sci = String(e?.sci || '').trim()
      if (com) set.add(normKey(com))
      if (sci) set.add(normKey(sci))
    })
    return set
  }, [especies])

  const speciesIdByNorm = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    const m = new Map()
    arr.forEach((e) => {
      const id = Number(e?.id)
      if (!Number.isFinite(id)) return
      const com = String(e?.com || '').trim()
      const sci = String(e?.sci || '').trim()
      if (com) m.set(normKey(com), id)
      if (sci) m.set(normKey(sci), id)
    })
    return m
  }, [especies])

  const importMeta = op?.importMeta && typeof op.importMeta === 'object' ? op.importMeta : null
  const importSpeciesColumns =
    importMeta?.speciesColumns && typeof importMeta.speciesColumns === 'object' ? importMeta.speciesColumns : null

  const getSpeciesColumnMeta = (kind, speciesName) => {
    const k = String(kind || '').toLowerCase()
    if (k !== 'num' && k !== 'dens') return null
    const spName = String(speciesName || '').trim()
    if (!spName) return null
    const spId = speciesIdByNorm.get(normKey(spName)) ?? null
    if (spId == null) return null
    const meta =
      importSpeciesColumns && typeof importSpeciesColumns === 'object'
        ? importSpeciesColumns[spId] && typeof importSpeciesColumns[spId] === 'object'
          ? importSpeciesColumns[spId][k] || null
          : null
        : null
    if (!meta || typeof meta !== 'object') return null
    const source = String(meta.source || '').trim().toLowerCase()
    const excelColumnName = String(meta.excelColumnName || '').trim()
    return { source: source === 'manual' ? 'manual' : 'auto', excelColumnName }
  }

  const availableSpecies = useMemo(
    () => (isEvadirTab ? extractSpeciesFromEvadirHeader(header, knownSpeciesNorm) : []),
    [header, isEvadirTab, knownSpeciesNorm],
  )
  const pickedSpecies = availableSpecies

  const evadirIndexes = useMemo(() => {
    const get = (k) => (headerMap.has(k) ? headerMap.get(k) : -1)
    const idx = {
      bote: get('BOTE'),
      zona: get('ZONA MUESTREO') >= 0 ? get('ZONA MUESTREO') : get('ZONA'),
      buzo: get('BUZO'),
      tipoUnidad: get('TIPO UNIDAD'),
      num: get('NUM'),
      area: get('AREA'),
      sustrato: get('TIPO SUSTRATO'),
      x: get('X'),
      y: get('Y'),
      lon: get('LONG'),
      lat: get('LAT'),
    }
    const sp = pickedSpecies.map((name) => {
      const numKey = `NUM ${name}`
      const numIdx = get(numKey)
      const densIdx = findHeaderIndex(header, (h) => normKey(h).startsWith(normKey(`DENS ${name}`)))
      return { name, numIdx, densIdx }
    })
    return { idx, sp }
  }, [headerMap, header, pickedSpecies])

  const unidadMode = useMemo(() => {
    if (!isEvadirTab) return 'none'
    const idx = evadirIndexes.idx.tipoUnidad
    if (idx < 0) return 'none'

    let hasTransecto = false
    let hasCuadrante = false
    for (let i = 0; i < rows.length; i++) {
      const v = String(rows[i]?.[idx] || '').trim()
      const k = normKey(v)
      if (k === 'TRANSECTO') hasTransecto = true
      if (k === 'CUADRANTE') hasCuadrante = true
      if (hasTransecto && hasCuadrante) return 'mixed'
    }
    if (hasTransecto) return 'transecto'
    if (hasCuadrante) return 'cuadrante'
    return 'none'
  }, [isEvadirTab, evadirIndexes, rows])

  const effectiveUnidadFilter = unidadMode === 'mixed' ? String(unidadFilter || 'todos') : unidadMode

  const evadirRows = useMemo(() => {
    if (!isEvadirTab) return []
    const tipoUnidadIdx = evadirIndexes.idx.tipoUnidad
    const filter = effectiveUnidadFilter
    const limit = Math.max(0, rowLimit)
    const out = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const tipo = tipoUnidadIdx >= 0 ? String(r?.[tipoUnidadIdx] || '') : ''
      const tipoKey = normKey(tipo)
      if (filter === 'transecto' && tipoKey !== 'TRANSECTO') continue
      if (filter === 'cuadrante' && tipoKey !== 'CUADRANTE') continue
      out.push(r)
      if (out.length >= limit) break
    }
    return out
  }, [rows, isEvadirTab, evadirIndexes, effectiveUnidadFilter, rowLimit])

  const muestrasRows = useMemo(() => {
    if (!isLpTab && !isLTab && !isDTab) return []
    const limit = Math.max(0, rowLimit)
    return rows.slice(0, limit)
  }, [rows, isLpTab, isLTab, isDTab, rowLimit])

  const lpPreview = useMemo(() => {
    if (!isLpTab) return null
    const ESPECIES = Array.isArray(especies) ? especies : []

    /**
     * Índice de especies por clave normalizada (común y científico) para resolver `especieId`.
     *
     * @returns {Map<string, number>} Map `key -> especieId`.
     *
     * Lógica:
     * 1) Recorre `ESPECIES`.
     * 2) Normaliza `com` y `sci` con `normKey`.
     * 3) Indexa ambas claves apuntando al id.
     *
     * Dependencias externas:
     * - `ESPECIES`, `normKey`.
     *
     * Efectos secundarios:
     * - Ninguno.
     *
     * Notas de mantenimiento:
     * - Se usa como fallback para tabs cuyo nombre viene como `LP <Especie>`.
     */
    const spKeyToId = (() => {
      const m = new Map()
      ESPECIES.forEach((e) => {
        const id = Number(e?.id)
        if (!Number.isFinite(id)) return
        const com = String(e?.com || '').trim()
        const sci = String(e?.sci || '').trim()
        if (com) m.set(normKey(com), id)
        if (sci) m.set(normKey(sci), id)
      })
      return m
    })()
    const tabName = String(tab || '')
    const tabSpecies = tabName.toUpperCase().startsWith('LP ') ? tabName.slice(3).trim() : ''
    const defaultEspecieId = tabSpecies ? spKeyToId.get(normKey(tabSpecies)) ?? null : null

    const idxL = headerMap.get('LONGITUD MM') ?? -1
    const idxP = headerMap.get('PESO G') ?? -1
    const idxB = headerMap.get('BOTE') ?? -1
    const idxBu = headerMap.get('BUZO') ?? -1
    const idxZ = headerMap.get('ZONA') ?? -1
    const idxEsp = headerMap.get('ESPECIE') ?? -1
    if (idxL < 0 || idxP < 0) return { maxL: null, maxP: null, points: [] }
    let maxL = null
    let maxP = null
    const points = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const l = toNumber(r?.[idxL])
      const p = toNumber(r?.[idxP])
      if (l !== null) maxL = maxL === null ? l : Math.max(maxL, l)
      if (p !== null) maxP = maxP === null ? p : Math.max(maxP, p)
      if (l === null || p === null) continue
      const boteNombre = idxB >= 0 ? String(r?.[idxB] ?? '').trim() : ''
      const buzo = idxBu >= 0 ? String(r?.[idxBu] ?? '').trim() : ''
      const zona = idxZ >= 0 ? toNumber(r?.[idxZ]) : null
      const espName = idxEsp >= 0 ? String(r?.[idxEsp] ?? '').trim() : ''
      const especieId = spKeyToId.get(normKey(espName)) ?? defaultEspecieId ?? null
      points.push({ x: l, y: p, boteNombre, buzo, zona, especieId })
    }
    return { maxL, maxP, points }
  }, [isLpTab, headerMap, rows, especies, tab])

  const lPreview = useMemo(() => {
    if (!isLTab) return null
    const idxL = headerMap.get('LONGITUD MM') ?? -1
    if (idxL < 0) return { maxL: null }
    let maxL = null
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const l = toNumber(r?.[idxL])
      if (l === null) continue
      maxL = maxL === null ? l : Math.max(maxL, l)
    }
    return { maxL }
  }, [isLTab, headerMap, rows])

  const dPreview = useMemo(() => {
    if (!isDTab) return null
    const idxD = headerMap.get('DIAM DISCO CM') ?? -1
    if (idxD < 0) return { maxD: null }
    let maxD = null
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const d = toNumber(r?.[idxD])
      if (d === null) continue
      maxD = maxD === null ? d : Math.max(maxD, d)
    }
    return { maxD }
  }, [isDTab, headerMap, rows])

  const showRowControls = rows.length > rowLimit

  if (!op) {
    return (
      <div className="info-box red">
        <span>!</span>
        <div>Operación no encontrada</div>
      </div>
    )
  }

  return (
    <div className="evp" style={{ height: '70vh', minHeight: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isLpTab && lpPreview ? (
        <div style={{ display: isMobile ? 'block' : 'flex', gap: 10, alignItems: 'stretch', flex: '0 0 auto' }}>
          <div className="info-box blue" style={{ flex: isMobile ? '0 0 auto' : 1, margin: 0 }}>
            <span>i</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <strong>{opHeader.id}</strong> · SEG-{opHeader.seg} · {opHeader.sector} · Región {opHeader.region}
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>
                {opHeader.tipoOrg} · {opHeader.org} · {opHeader.fecha}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill p-blu" style={{ fontSize: 10 }}>
                  Botes {resumen.totalBotes}
                </span>
                <span className="pill p-pur" style={{ fontSize: 10 }}>
                  Unidades {resumen.totalUnidades}
                </span>
                <span className="pill p-grn" style={{ fontSize: 10 }}>
                  T {resumen.totalTx}
                </span>
                <span className="pill p-amb" style={{ fontSize: 10 }}>
                  C {resumen.totalCq}
                </span>
                <span className="pill p-teal" style={{ fontSize: 10 }}>
                  LP {resumen.muestras.LP}
                </span>
              </div>
              {isMobile ? (
                <div>
                  <button className="btn b-out b-sm" onClick={() => setShowLpChart((v) => !v)}>
                    {showLpChart ? 'Ocultar gráfico' : 'Gráfico de dispersión'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {!isMobile ? (
            <div style={{ width: 520 }}>
              <LpScatter
                points={lpPreview.points}
                onJump={(pt) => {
                  if (!pt) return
                  const opBotes = Array.isArray(op?.botes) ? op.botes : []
                  const boteFound = opBotes.find((b) => {
                    if (!b) return false
                    if (normKey(b?.nombre) !== normKey(pt?.boteNombre)) return false
                    if (pt?.buzo && normKey(b?.buzo) !== normKey(pt?.buzo)) return false
                    if (pt?.zona != null && !zonasMuestreoCoinciden(b?.zona, pt?.zona)) return false
                    return true
                  })
                  const boteId = boteFound?.id ?? null
                  const especieId = pt?.especieId ?? null
                  const tl = toNumber(pt?.x)
                  const tp = toNumber(pt?.y)
                  let sampleIdx = null
                  if (boteFound && Number.isFinite(Number(especieId)) && tl !== null && tp !== null) {
                    const raw = boteFound?.lpMuestras && typeof boteFound.lpMuestras === 'object' ? boteFound.lpMuestras : {}
                    const entry = raw?.[Number(especieId)]
                    let arr = []
                    if (Array.isArray(entry)) arr = entry
                    else if (entry && typeof entry === 'object') {
                      if (Array.isArray(entry.ms)) arr = entry.ms
                      else if (Array.isArray(entry.LP)) arr = entry.LP
                    }
                    const tol = 1e-9
                    for (let i = 0; i < arr.length; i++) {
                      const m = arr[i]
                      const l = toNumber(m?.l)
                      const p = toNumber(m?.p)
                      if (l === null || p === null) continue
                      if (Math.abs(l - tl) <= tol && Math.abs(p - tp) <= tol) {
                        sampleIdx = i
                        break
                      }
                    }
                  }
                  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                  const detail = {
                    token,
                    ts: Date.now(),
                    opId: op?.id ?? '',
                    region: op?.region ?? '',
                    boteId,
                    boteNombre: pt?.boteNombre ?? '',
                    buzo: pt?.buzo ?? '',
                    zona: pt?.zona ?? null,
                    especieId,
                    l: tl,
                    p: tp,
                    sampleIdx,
                  }
                  try {
                    sessionStorage.setItem('bitecma_lp_jump', JSON.stringify(detail))
                    window.dispatchEvent(new CustomEvent('bitecma:lp-jump', { detail }))
                  } catch {
                    return
                  }
                  closeModal()
                  navigate('ops')
                }}
              />
            </div>
          ) : showLpChart ? (
            <div style={{ marginTop: 10 }}>
              <LpScatter
                points={lpPreview.points}
                onJump={(pt) => {
                  if (!pt) return
                  const opBotes = Array.isArray(op?.botes) ? op.botes : []
                  const boteFound = opBotes.find((b) => {
                    if (!b) return false
                    if (normKey(b?.nombre) !== normKey(pt?.boteNombre)) return false
                    if (pt?.buzo && normKey(b?.buzo) !== normKey(pt?.buzo)) return false
                    if (pt?.zona != null && !zonasMuestreoCoinciden(b?.zona, pt?.zona)) return false
                    return true
                  })
                  const boteId = boteFound?.id ?? null
                  const especieId = pt?.especieId ?? null
                  const tl = toNumber(pt?.x)
                  const tp = toNumber(pt?.y)
                  let sampleIdx = null
                  if (boteFound && Number.isFinite(Number(especieId)) && tl !== null && tp !== null) {
                    const raw = boteFound?.lpMuestras && typeof boteFound.lpMuestras === 'object' ? boteFound.lpMuestras : {}
                    const entry = raw?.[Number(especieId)]
                    let arr = []
                    if (Array.isArray(entry)) arr = entry
                    else if (entry && typeof entry === 'object') {
                      if (Array.isArray(entry.ms)) arr = entry.ms
                      else if (Array.isArray(entry.LP)) arr = entry.LP
                    }
                    const tol = 1e-9
                    for (let i = 0; i < arr.length; i++) {
                      const m = arr[i]
                      const l = toNumber(m?.l)
                      const p = toNumber(m?.p)
                      if (l === null || p === null) continue
                      if (Math.abs(l - tl) <= tol && Math.abs(p - tp) <= tol) {
                        sampleIdx = i
                        break
                      }
                    }
                  }
                  const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                  const detail = {
                    token,
                    ts: Date.now(),
                    opId: op?.id ?? '',
                    region: op?.region ?? '',
                    boteId,
                    boteNombre: pt?.boteNombre ?? '',
                    buzo: pt?.buzo ?? '',
                    zona: pt?.zona ?? null,
                    especieId,
                    l: tl,
                    p: tp,
                    sampleIdx,
                  }
                  try {
                    sessionStorage.setItem('bitecma_lp_jump', JSON.stringify(detail))
                    window.dispatchEvent(new CustomEvent('bitecma:lp-jump', { detail }))
                  } catch {
                    return
                  }
                  closeModal()
                  navigate('ops')
                }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="info-box blue" style={{ flex: '0 0 auto' }}>
          <span>i</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <strong>{opHeader.id}</strong> · SEG-{opHeader.seg} · {opHeader.sector} · Región {opHeader.region}
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>
              {opHeader.tipoOrg} · {opHeader.org} · {opHeader.fecha}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill p-blu" style={{ fontSize: 10 }}>
                Botes {resumen.totalBotes}
              </span>
              <span className="pill p-pur" style={{ fontSize: 10 }}>
                Unidades {resumen.totalUnidades}
              </span>
              <span className="pill p-grn" style={{ fontSize: 10 }}>
                T {resumen.totalTx}
              </span>
              <span className="pill p-amb" style={{ fontSize: 10 }}>
                C {resumen.totalCq}
              </span>
              <span className="pill p-teal" style={{ fontSize: 10 }}>
                LP {resumen.muestras.LP}
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '0 0 auto' }}>
        {sheets.map((s) => (
          <button
            key={s.name}
            className={`btn b-sm ${s.name === tab ? 'b-teal' : 'b-out'}`}
            onClick={() => {
              setTab(s.name)
              setRowLimit(250)
              setUnidadFilter('todos')
              setShowLpChart(false)
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isEvadirTab ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Tipo unidad</div>
            {unidadMode === 'mixed' ? (
              <>
                <button className={`btn b-sm ${unidadFilter === 'todos' ? 'b-teal' : 'b-out'}`} onClick={() => setUnidadFilter('todos')}>
                  Todos
                </button>
                <button
                  className={`btn b-sm ${unidadFilter === 'transecto' ? 'b-teal' : 'b-out'}`}
                  onClick={() => setUnidadFilter('transecto')}
                >
                  Transecto
                </button>
                <button
                  className={`btn b-sm ${unidadFilter === 'cuadrante' ? 'b-teal' : 'b-out'}`}
                  onClick={() => setUnidadFilter('cuadrante')}
                >
                  Cuadrante
                </button>
              </>
            ) : unidadMode === 'transecto' ? (
              <span className="pill p-teal" style={{ fontSize: 10 }}>
                Tipo Unidad Transecto
              </span>
            ) : unidadMode === 'cuadrante' ? (
              <span className="pill p-teal" style={{ fontSize: 10 }}>
                Tipo Unidad Cuadrante
              </span>
            ) : (
              <span className="pill p-amb" style={{ fontSize: 10 }}>
                —
              </span>
            )}
            {pickedSpecies.length ? (
              <div style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>
                Especies: {pickedSpecies.join(', ')}
              </div>
            ) : null}
          </div>
        ) : null}

        {showRowControls ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>
              Mostrando {Math.min(rowLimit, rows.length)} de {rows.length} filas
            </div>
            <button className="btn b-out b-sm" onClick={() => setRowLimit((n) => Math.min(rows.length, n + 250))}>
              Mostrar más
            </button>
            <button className="btn b-out b-sm" onClick={() => setRowLimit(rows.length)}>
              Mostrar todo
            </button>
          </div>
        ) : rows.length ? (
          <div style={{ color: 'var(--text3)', fontSize: 12 }}>Mostrando {rows.length} filas</div>
        ) : null}

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, border: '1px solid var(--border)', borderRadius: 10 }}>
          <table className="tbl evp-sticky tbl-evp-mobile">
            <thead>
              {isEvadirTab ? (
                <tr>
                  <th style={{ textAlign: 'left' }}>id</th>
                  <th>Bote</th>
                  <th>Zona</th>
                  <th>Buzo</th>
                  {unidadMode === 'mixed' && unidadFilter === 'todos' ? <th>Tipo unidad</th> : null}
                  <th>Num</th>
                  <th>Area</th>
                  {evadirIndexes.sp.map((sp) => (
                    <th
                      key={`num-${sp.name}`}
                      style={
                        getSpeciesColumnMeta('num', sp.name)?.source === 'manual'
                          ? {
                              backgroundColor: 'var(--purple-lt)',
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0, rgba(0,0,0,.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)',
                              borderBottom: '1.5px solid rgba(124,58,237,.35)',
                            }
                          : undefined
                      }
                      title={(() => {
                        const meta = getSpeciesColumnMeta('num', sp.name)
                        if (!meta) return ''
                        const origen = meta.source === 'manual' ? 'Manual' : 'Automático'
                        return `Origen: ${origen}\nExcel: ${meta.excelColumnName || '—'}`
                      })()}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>{`NUM ${sp.name}`}</div>
                        {(() => {
                          const meta = getSpeciesColumnMeta('num', sp.name)
                          if (!meta) return null
                          const origen = meta.source === 'manual' ? 'M' : 'A'
                          const excel = meta.excelColumnName
                          return (
                            <div style={{ fontSize: 8, letterSpacing: 0.2, textTransform: 'none' }}>
                              {origen} · {excel || '—'}
                            </div>
                          )
                        })()}
                      </div>
                    </th>
                  ))}
                  <th>Sustrato</th>
                  {evadirIndexes.sp.map((sp) => (
                    <th
                      key={`dens-${sp.name}`}
                      style={
                        getSpeciesColumnMeta('dens', sp.name)?.source === 'manual'
                          ? {
                              backgroundColor: 'var(--purple-lt)',
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0, rgba(0,0,0,.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)',
                              borderBottom: '1.5px solid rgba(124,58,237,.35)',
                            }
                          : undefined
                      }
                      title={(() => {
                        const meta = getSpeciesColumnMeta('dens', sp.name)
                        if (!meta) return ''
                        const origen = meta.source === 'manual' ? 'Manual' : 'Automático'
                        return `Origen: ${origen}\nExcel: ${meta.excelColumnName || '—'}`
                      })()}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>{`DENS ${sp.name}`}</div>
                        {(() => {
                          const meta = getSpeciesColumnMeta('dens', sp.name)
                          if (!meta) return null
                          const origen = meta.source === 'manual' ? 'M' : 'A'
                          const excel = meta.excelColumnName
                          return (
                            <div style={{ fontSize: 8, letterSpacing: 0.2, textTransform: 'none' }}>
                              {origen} · {excel || '—'}
                            </div>
                          )
                        })()}
                      </div>
                    </th>
                  ))}
                  <th>X</th>
                  <th>Y</th>
                  <th>Long</th>
                  <th>Lat</th>
                </tr>
              ) : isLpTab || isLTab ? (
                <tr>
                  <th style={{ textAlign: 'left' }}>id</th>
                  <th>Bote</th>
                  <th>Zona</th>
                  <th>Buzo</th>
                  <th>Especie</th>
                  <th>
                    Longitud mm
                    {isLpTab && lpPreview?.maxL !== null ? (
                      <span
                        style={{
                          color: 'var(--text3)',
                          fontWeight: 600,
                          marginLeft: 8,
                          paddingLeft: 8,
                          borderLeft: '1px solid var(--border)',
                        }}
                      >{`max: ${Math.round(lpPreview.maxL)}`}</span>
                    ) : isLTab && lPreview?.maxL !== null ? (
                      <span
                        style={{
                          color: 'var(--text3)',
                          fontWeight: 600,
                          marginLeft: 8,
                          paddingLeft: 8,
                          borderLeft: '1px solid var(--border)',
                        }}
                      >{`MAX: ${Math.round(lPreview.maxL)}`}</span>
                    ) : null}
                  </th>
                  {isLpTab ? (
                    <th>
                      Peso g
                      {lpPreview?.maxP !== null ? (
                        <span
                          style={{
                            color: 'var(--text3)',
                            fontWeight: 600,
                            marginLeft: 8,
                            paddingLeft: 8,
                            borderLeft: '1px solid var(--border)',
                          }}
                        >{`max: ${Math.round(lpPreview.maxP)}`}</span>
                      ) : null}
                    </th>
                  ) : null}
                </tr>
              ) : isDTab ? (
                <tr>
                  <th style={{ textAlign: 'left' }}>id</th>
                  <th>Bote</th>
                  <th>Zona</th>
                  <th>Buzo</th>
                  <th>Especie</th>
                  <th>
                    Diam disco cm
                    {dPreview?.maxD !== null ? (
                      <span
                        style={{
                          color: 'var(--text3)',
                          fontWeight: 600,
                          marginLeft: 8,
                          paddingLeft: 8,
                          borderLeft: '1px solid var(--border)',
                        }}
                      >{`MAX: ${Math.round(dPreview.maxD)}`}</span>
                    ) : null}
                  </th>
                </tr>
              ) : (
                <tr>
                  <th>Sin datos</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isEvadirTab ? (
                evadirRows.length ? (
                  evadirRows.map((r, i) => {
                    const idx = evadirIndexes.idx
                    const spCols = evadirIndexes.sp
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text1)', fontWeight: 700, textAlign: 'left' }}>{i + 1}</td>
                        <td>{fmt(r?.[idx.bote])}</td>
                        <td>{fmt(r?.[idx.zona])}</td>
                        <td>{fmt(r?.[idx.buzo])}</td>
                        {unidadMode === 'mixed' && unidadFilter === 'todos' ? <td>{fmt(r?.[idx.tipoUnidad])}</td> : null}
                        <td>{fmt(r?.[idx.num])}</td>
                        <td>{fmt(r?.[idx.area])}</td>
                        {spCols.map((sp) => (
                          <td key={`n-${i}-${sp.name}`}>{sp.numIdx >= 0 ? fmt(r?.[sp.numIdx]) : '—'}</td>
                        ))}
                        <td>{fmt(r?.[idx.sustrato])}</td>
                        {spCols.map((sp) => (
                          <td key={`d-${i}-${sp.name}`}>{sp.densIdx >= 0 ? fmt(r?.[sp.densIdx], 'dens') : '—'}</td>
                        ))}
                        <td>{fmt(r?.[idx.x], 'coord')}</td>
                        <td>{fmt(r?.[idx.y], 'coord')}</td>
                        <td>{fmt(r?.[idx.lon], 'coord')}</td>
                        <td>{fmt(r?.[idx.lat], 'coord')}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7 + (unidadMode === 'mixed' && unidadFilter === 'todos' ? 1 : 0) + evadirIndexes.sp.length * 2 + 5}
                      style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}
                    >
                      Sin datos
                    </td>
                  </tr>
                )
              ) : isLpTab || isLTab || isDTab ? (
                muestrasRows.length ? (
                  muestrasRows.map((r, i) => {
                    const idxBote = headerMap.get('BOTE') ?? -1
                    const idxZona = headerMap.get('ZONA') ?? -1
                    const idxBuzo = headerMap.get('BUZO') ?? -1
                    const idxEsp = headerMap.get('ESPECIE') ?? -1
                    const idxL = headerMap.get('LONGITUD MM') ?? -1
                    const idxP = headerMap.get('PESO G') ?? -1
                    const idxD = headerMap.get('DIAM DISCO CM') ?? -1
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text1)', fontWeight: 700, textAlign: 'left' }}>{i + 1}</td>
                        <td>{idxBote >= 0 ? fmt(r?.[idxBote]) : '—'}</td>
                        <td>{idxZona >= 0 ? fmt(r?.[idxZona]) : '—'}</td>
                        <td>{idxBuzo >= 0 ? fmt(r?.[idxBuzo]) : '—'}</td>
                        <td>{idxEsp >= 0 ? fmt(r?.[idxEsp]) : '—'}</td>
                        {isDTab ? (
                          <td>{idxD >= 0 ? fmt(r?.[idxD]) : '—'}</td>
                        ) : (
                          <td>{idxL >= 0 ? fmt(r?.[idxL]) : '—'}</td>
                        )}
                        {isLpTab ? <td>{idxP >= 0 ? fmt(r?.[idxP]) : '—'}</td> : null}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={isLpTab ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                      Sin datos
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
