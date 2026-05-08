import { useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'

/**
 * Página de sectores: listado de Sectores AMERB y caletas por región, con búsqueda.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (habilita carga inicial).
 * @returns {import('react').JSX.Element} Layout con 3 columnas: regiones, sectores y caletas.
 *
 * Lógica (alto nivel):
 * 1) Al activarse, solicita carga de regiones y sectores AMERB desde el contexto DB.
 * 2) Mantiene estado local:
 *    - región seleccionada (`regionId`),
 *    - query de búsqueda (`q`).
 * 3) Deriva:
 *    - `sectoresFiltrados` (por región + texto),
 *    - `caletas` desde `caletasByRegionStatic` para la región.
 * 4) Renderiza tablas de sectores y caletas en paralelo.
 *
 * Dependencias externas:
 * - `useDb`: `db`, `ensureRegionesLoaded`, `ensureSectoresAmerbLoaded`.
 *
 * Efectos secundarios:
 * - Dispara carga de datos al activarse.
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se asume que el contexto DB expone arreglos seguros.
 *
 * @example
 * <SectoresPage active={page === 'sectores'} />
 *
 * Notas de mantenimiento:
 * - Si se agregan filtros (comuna, id), extender `sectoresFiltrados`.
 * - Si crece el dataset, considerar paginación; hoy se limita a 2000 filas.
 */
export default function SectoresPage({ active }) {
  const { db, ensureRegionesLoaded, ensureSectoresAmerbLoaded } = useDb()
  useEffect(() => {
    if (!active) return
    ensureRegionesLoaded?.()
    ensureSectoresAmerbLoaded?.()
  }, [active, ensureRegionesLoaded, ensureSectoresAmerbLoaded])

  const regiones = useMemo(() => {
    const arr = db?.regionesChile
    return Array.isArray(arr) ? arr : []
  }, [db?.regionesChile])
  const sectoresAmerb = useMemo(() => {
    const arr = db?.sectoresAmerb
    return Array.isArray(arr) ? arr : []
  }, [db?.sectoresAmerb])
  const caletasByRegion = useMemo(() => {
    return db?.caletasByRegionStatic || {}
  }, [db?.caletasByRegionStatic])

  const [regionId, setRegionId] = useState(regiones[0]?.id || 1)
  const [q, setQ] = useState('')

  const sectoresFiltrados = useMemo(() => {
    const query = String(q || '').toLowerCase().trim()
    return sectoresAmerb
      .filter((s) => s.region === regionId)
      .filter((s) =>
        !query
          ? true
          : String(s.nombreamerb || '').toLowerCase().includes(query) ||
            String(s.comuna || '').toLowerCase().includes(query),
      )
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
      .slice(0, 2000)
  }, [sectoresAmerb, regionId, q])

  const caletas = useMemo(() => {
    const arr = caletasByRegion?.[regionId]
    return Array.isArray(arr) ? arr : []
  }, [caletasByRegion, regionId])

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-sectores">
      <div className="ph">
        <div>
          <h2>Sectores</h2>
          <p>Sectores AMERB y caletas por región</p>
        </div>
      </div>
      <div className="admin-layout" style={{ gridTemplateColumns: '240px 1fr 1fr', height: 'calc(100vh - 190px)', alignItems: 'stretch' }}>
        <div className="card admin-menu" style={{ minHeight: 0, overflowY: 'auto' }}>
          {regiones.map((r) => (
            <div
              key={r.id}
              className={`admin-item ${regionId === r.id ? 'on' : ''}`}
              onClick={() => setRegionId(r.id)}
            >
              {r.rom} — {r.nom}
            </div>
          ))}
        </div>
        <div className="card admin-content" style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input className="flt" placeholder="Buscar sector AMERB..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ overflow: 'auto', minHeight: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sector AMERB</th>
                  <th>Comuna</th>
                </tr>
              </thead>
              <tbody>
                {sectoresFiltrados.length ? (
                  sectoresFiltrados.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>
                        <strong>{s.nombreamerb}</strong>
                      </td>
                      <td>{s.comuna || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card admin-content" style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
            Caletas
          </div>
          <div style={{ overflow: 'auto', minHeight: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Caleta</th>
                </tr>
              </thead>
              <tbody>
                {caletas.length ? (
                  caletas.map((c, idx) => (
                    <tr key={`${c}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{c}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                      Sin caletas configuradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
