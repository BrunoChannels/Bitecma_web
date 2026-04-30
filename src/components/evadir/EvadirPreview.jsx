import { useMemo, useState } from 'react'
import { buildEvadirPreviewSheets } from '../../services/evadirPreviewService.js'

function normKey(v) {
  return String(v || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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

function headerIndexMap(header) {
  const m = new Map()
  ;(Array.isArray(header) ? header : []).forEach((h, i) => {
    m.set(String(h || '').trim(), i)
  })
  return m
}

function findHeaderIndex(header, predicate) {
  const arr = Array.isArray(header) ? header : []
  for (let i = 0; i < arr.length; i++) {
    if (predicate(String(arr[i] || '').trim(), i)) return i
  }
  return -1
}

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

export default function EvadirPreview({ db, op }) {
  const especies = db?.especies
  const { sheets } = useMemo(() => buildEvadirPreviewSheets({ db: { especies }, op }), [especies, op])
  const [tab, setTab] = useState(() => sheets[0]?.name || 'EVADIR')
  const [rowLimit, setRowLimit] = useState(250)
  const [unidadFilter, setUnidadFilter] = useState('todos')

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

  const availableSpecies = useMemo(
    () => (isEvadirTab ? extractSpeciesFromEvadirHeader(header, knownSpeciesNorm) : []),
    [header, isEvadirTab, knownSpeciesNorm],
  )
  const pickedSpecies = availableSpecies

  const evadirIndexes = useMemo(() => {
    const get = (k) => (headerMap.has(k) ? headerMap.get(k) : -1)
    const idx = {
      bote: get('BOTE'),
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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '0 0 auto' }}>
        {sheets.map((s) => (
          <button
            key={s.name}
            className={`btn b-sm ${s.name === tab ? 'b-teal' : 'b-out'}`}
            onClick={() => {
              setTab(s.name)
              setRowLimit(250)
              setUnidadFilter('todos')
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
          <table className="tbl evp-sticky">
            <thead>
              {isEvadirTab ? (
                <tr>
                  <th>Bote</th>
                  <th>Buzo</th>
                  {unidadMode === 'mixed' && unidadFilter === 'todos' ? <th>Tipo unidad</th> : null}
                  <th>Num</th>
                  <th>Area</th>
                  {evadirIndexes.sp.map((sp) => (
                    <th key={`num-${sp.name}`}>{`NUM ${sp.name}`}</th>
                  ))}
                  <th>Sustrato</th>
                  {evadirIndexes.sp.map((sp) => (
                    <th key={`dens-${sp.name}`}>{`DENS ${sp.name}`}</th>
                  ))}
                  <th>X</th>
                  <th>Y</th>
                  <th>Long</th>
                  <th>Lat</th>
                </tr>
              ) : isLpTab || isLTab ? (
                <tr>
                  <th>Bote</th>
                  <th>Buzo</th>
                  <th>Especie</th>
                  <th>Longitud mm</th>
                  {isLpTab ? <th>Peso g</th> : null}
                </tr>
              ) : isDTab ? (
                <tr>
                  <th>Bote</th>
                  <th>Buzo</th>
                  <th>Especie</th>
                  <th>Diam disco cm</th>
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
                        <td>{fmt(r?.[idx.bote])}</td>
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
                      colSpan={5 + (unidadMode === 'mixed' && unidadFilter === 'todos' ? 1 : 0) + evadirIndexes.sp.length * 2 + 5}
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
                    const idxBuzo = headerMap.get('BUZO') ?? -1
                    const idxEsp = headerMap.get('ESPECIE') ?? -1
                    const idxL = headerMap.get('LONGITUD MM') ?? -1
                    const idxP = headerMap.get('PESO G') ?? -1
                    const idxD = headerMap.get('DIAM DISCO CM') ?? -1
                    return (
                      <tr key={i}>
                        <td>{idxBote >= 0 ? fmt(r?.[idxBote]) : '—'}</td>
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
                    <td colSpan={isLpTab ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
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
