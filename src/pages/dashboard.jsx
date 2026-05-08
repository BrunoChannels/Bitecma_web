import { useMemo } from 'react'
import { useApp } from '../context/appContext.jsx'
import { useDb } from '../context/dbContext.jsx'

/**
 * Convierte una fecha ISO (YYYY-MM-DD) a un valor numérico comparable (timestamp).
 *
 * @param {unknown} v - Valor de fecha esperado como string ISO.
 * @returns {number} Timestamp (ms) a medianoche local, o 0 si el formato es inválido.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Valida formato ISO estricto `YYYY-MM-DD`.
 * 3) Construye Date en `T00:00:00` y retorna `getTime()` si es finito.
 *
 * Dependencias externas:
 * - `Date` (API estándar).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Si el parseo falla o el formato no calza, retorna 0.
 *
 * @example
 * toDateValue('2026-05-07') // 1778112000000 (depende de zona horaria local)
 *
 * Notas de mantenimiento:
 * - El uso de zona horaria local es intencional para ordenar fechas de operación; si se requiere UTC, ajustar construcción del Date.
 */
function toDateValue(v) {
  const s = String(v || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 0
  const t = new Date(`${s}T00:00:00`).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a formato DD/MM/YYYY para visualización.
 *
 * @param {unknown} iso - Fecha ISO.
 * @returns {string} Fecha en formato DMY o '—' si es inválida.
 *
 * Lógica:
 * 1) Valida formato `YYYY-MM-DD`.
 * 2) Reordena substrings a `DD/MM/YYYY`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Retorna '—' si el formato no coincide.
 *
 * @example
 * fmtDMY('2026-02-05') // '05/02/2026'
 *
 * Notas de mantenimiento:
 * - No valida existencia real del día/mes (solo formato). La validación completa debe ocurrir al ingresar datos.
 */
function fmtDMY(iso) {
  const s = String(iso || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
}

/**
 * Dashboard principal: muestra métricas y accesos rápidos al módulo de operaciones.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (se usa para estilos; no dispara efectos aquí).
 * @returns {import('react').JSX.Element} Elemento React del dashboard.
 *
 * Lógica (alto nivel):
 * 1) Lee `db` desde contexto y construye:
 *    - Conteo total de operaciones,
 *    - Conteo total de unidades de densidad (transectos/cuadrantes),
 *    - Conteo de muestras LP registradas.
 * 2) Deriva lista de operaciones recientes por `fechaInicio`.
 * 3) Calcula composición de muestras por especie (top 8) para gráfico de barras.
 * 4) Renderiza tarjetas métricas, tabla de operaciones recientes y gráfico.
 *
 * Dependencias externas:
 * - `useApp` (navigate).
 * - `useDb` (db: especies y operaciones).
 *
 * Efectos secundarios:
 * - Ninguno (solo lectura y navegación por click).
 *
 * Manejo de errores:
 * - Tolerante a DB incompleta (usa arrays vacíos y defensas).
 *
 * @example
 * <DashboardPage active={page === 'dashboard'} />
 *
 * Notas de mantenimiento:
 * - El conteo de `totalMuestras` asume estructura `lpMuestras` como objeto de especie -> {LP,L,D}; mantener alineado con servicios.
 * - Si el dataset crece, considerar memoización más fina o pre-cálculo en selector/contexto.
 */
export default function DashboardPage({ active }) {
  const { navigate } = useApp()
  const { db } = useDb()

  const especies = useMemo(() => (Array.isArray(db?.especies) ? db.especies : []), [db])
  const ops = useMemo(() => (Array.isArray(db?.operaciones) ? db.operaciones : []), [db])

  const totalOps = ops.length
  const totalUnidades = ops.reduce(
    (acc, op) => acc + (op?.botes || []).reduce((a, b) => a + ((b?.transectos || []).length || 0), 0),
    0,
  )
  const totalMuestras = useMemo(() => {
    return ops.reduce(
      (acc, op) =>
        acc +
        (op?.botes || []).reduce(
          (a, b) =>
            a +
            Object.values(b?.lpMuestras || {}).reduce(
              (x, entry) =>
                x +
                Object.values(entry || {}).reduce(
                  (y, arr) => y + (Array.isArray(arr) ? arr.length : 0),
                  0,
                ),
              0,
            ),
          0,
        ),
      0,
    )
  }, [ops])

  const recentOps = ops
    .slice()
    .sort((a, b) => toDateValue(b?.fechaInicio) - toDateValue(a?.fechaInicio))
    .slice(0, 5)

  const chartData = useMemo(() => {
    const byId = new Map((especies || []).map((e) => [Number(e.id), String(e.com || e.sci || e.id)]))
    const counts = new Map()
    for (const op of ops) {
      for (const bote of op?.botes || []) {
        const lp = bote?.lpMuestras && typeof bote.lpMuestras === 'object' ? bote.lpMuestras : {}
        for (const [k, entry] of Object.entries(lp)) {
          const spId = Number(k)
          if (!Number.isFinite(spId)) continue
          const n = Object.values(entry || {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
          counts.set(spId, (counts.get(spId) || 0) + n)
        }
      }
    }

    const palette = ['var(--blue)', 'var(--teal)', 'var(--green)', 'var(--purple)', 'var(--amber)', '#22c55e', '#38bdf8', '#a78bfa']
    const items = [...counts.entries()]
      .map(([spId, value]) => ({ key: `sp-${spId}`, label: byId.get(spId) || `Esp. ${spId}`, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((x, i) => ({ ...x, color: palette[i % palette.length] }))

    return { items, max: Math.max(1, ...items.map((x) => x.value)) }
  }, [especies, ops])

  const yTicksCount = 5
  const yStep = Math.max(1, Math.ceil(chartData.max / yTicksCount))
  const yMax = yStep * yTicksCount
  const yLabels = Array.from({ length: yTicksCount + 1 }, (_, i) => yMax - i * yStep)

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-dashboard">
      <div className="ph">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen operacional · EVADIR importados</p>
        </div>
        <div className="ph-a"></div>
      </div>
      <div className="g3 mb">
        <div className="sc sc-tl" onClick={() => navigate('ops')}>
          <div className="sc-lbl">Operaciones</div>
          <div className="sc-val">{totalOps}</div>
          <div className="sc-sub">Total registradas</div>
        </div>
        <div className="sc sc-gr">
          <div className="sc-lbl">Muestras L-P</div>
          <div className="sc-val">{totalMuestras}</div>
          <div className="sc-sub">Subconjunto</div>
        </div>
        <div className="sc sc-pu">
          <div className="sc-lbl">Unidades densidad</div>
          <div className="sc-val">{totalUnidades}</div>
          <div className="sc-sub">Transectos y cuadrantes</div>
        </div>
      </div>
      <div className="dashboard-grid g2 mb">
        <div className="card" style={{ minHeight: 440, display: 'flex', flexDirection: 'column' }}>
          <div className="ct">
            Operaciones recientes
            <button className="btn b-out b-sm" onClick={() => navigate('ops')}>Ver todas</button>
          </div>
          <div className="dashboard-recent-ops-table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sector</th>
                  <th>Fecha</th>
                  <th>Botes</th>
                </tr>
              </thead>
              <tbody>
                {recentOps.length ? recentOps.map((op) => (
                  <tr key={op.id} onClick={() => navigate('ops')} style={{ cursor: 'pointer' }}>
                    <td><strong>{op.id}</strong></td>
                    <td>{op.sector || '—'}</td>
                    <td>{fmtDMY(op.fechaInicio)}</td>
                    <td>{(op.botes || []).length}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>Sin operaciones</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <div className="ct">Composición de muestras por especie</div>
          <div className="dashboard-chart-wrap">
            <div style={{ minHeight: 320, display: 'grid', gridTemplateColumns: '34px 1fr', gap: 0 }}>
              <div style={{
                height: 280,
                display: 'grid',
                gridTemplateRows: 'repeat(6, 1fr)',
                alignItems: 'end'
              }}>
                {yLabels.map((n) => (
                  <div key={`y-${n}`} style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', paddingRight: 4 }}>{n}</div>
                ))}
              </div>

              <div style={{ overflow: 'hidden' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    height: 280,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    padding: '0',
                    borderLeft: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border2)',
                    backgroundImage: 'repeating-linear-gradient(to top, transparent 0, transparent 46px, rgba(148,163,184,.16) 46px, rgba(148,163,184,.16) 47px)'
                  }}>
                    {chartData.items.map((it) => (
                      <div key={it.key} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, marginBottom: 6 }}>{it.value}</div>
                        <div style={{ width: 34, height: Math.max(12, Math.round((it.value / yMax) * 260)), background: it.color, borderRadius: 0 }} title={`${it.label}: ${it.value}`} />
                      </div>
                    ))}
                    {!chartData.items.length ? <div style={{ color: 'var(--text3)', fontSize: 12, paddingBottom: 6 }}>Sin muestras registradas</div> : null}
                  </div>

                  <div style={{ display: 'flex', gap: 10, padding: '4px 0 0 0' }}>
                    {chartData.items.map((it) => (
                      <div key={`${it.key}-x`} style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--text2)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {chartData.items.map((it) => (
                <span key={`${it.key}-lg`} style={{ fontSize: 11, color: 'var(--text2)' }}><span style={{ color: it.color }}>■</span> {it.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
