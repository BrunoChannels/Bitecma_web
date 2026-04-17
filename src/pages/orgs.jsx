import { useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'

export default function OrgsPage({ active }) {
  const { db } = useDb()
  const regiones = useMemo(() => {
    const arr = db?.regionesChile
    return Array.isArray(arr) ? arr : []
  }, [db?.regionesChile])
  const orgs = useMemo(() => {
    const arr = db?.opa
    return Array.isArray(arr) ? arr : []
  }, [db?.opa])

  const [regionId, setRegionId] = useState(regiones[0]?.id || 1)
  const [q, setQ] = useState('')

  const orgsFiltradas = useMemo(() => {
    const query = String(q || '').toLowerCase().trim()
    return orgs
      .filter((o) => o.region === regionId)
      .filter((o) =>
        !query
          ? true
          : String(o.nombre || '').toLowerCase().includes(query) ||
            String(o.nombrecorto || '').toLowerCase().includes(query) ||
            String(o.comuna || '').toLowerCase().includes(query),
      )
      .slice(0, 500)
  }, [orgs, regionId, q])

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-orgs">
      <div className="ph">
        <div>
          <h2>Organizaciones</h2>
          <p>Listado OPA por región (con búsqueda)</p>
        </div>
      </div>
      <div className="admin-layout">
        <div className="card admin-menu">
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
        <div className="card admin-content">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              className="flt"
              placeholder="Buscar organización..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              {orgsFiltradas.length} organización(es)
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Nombre corto</th>
                  <th>Comuna</th>
                </tr>
              </thead>
              <tbody>
                {orgsFiltradas.length ? (
                  orgsFiltradas.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>
                        <strong>{o.nombre}</strong>
                      </td>
                      <td>{o.nombrecorto || '—'}</td>
                      <td>{o.comuna || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                      Sin resultados
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
