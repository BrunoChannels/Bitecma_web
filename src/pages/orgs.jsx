import { useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'

/**
 * Página de organizaciones (OPA): listado por región con búsqueda.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (habilita carga inicial).
 * @returns {import('react').JSX.Element} Tabla de organizaciones filtrada por región y texto.
 *
 * Lógica:
 * 1) Al activarse, solicita carga de regiones y OPA desde el contexto DB.
 * 2) Mantiene estado local:
 *    - región seleccionada (`regionId`),
 *    - query de búsqueda (`q`).
 * 3) Deriva `orgsFiltradas`:
 *    - filtra por región,
 *    - filtra por texto (nombre, nombre corto, comuna),
 *    - ordena por ID y limita tamaño para performance.
 *
 * Dependencias externas:
 * - `useDb`: `db`, `ensureRegionesLoaded`, `ensureOpaLoaded`.
 *
 * Efectos secundarios:
 * - Dispara carga de datos (regiones y OPA) al activarse.
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se asume que el contexto DB maneja fallas y expone arreglos seguros.
 *
 * @example
 * <OrgsPage active={page === 'orgs'} />
 *
 * Notas de mantenimiento:
 * - Si el dataset crece, considerar paginación/virtualización. Hoy se limita a 2000 filas.
 */
export default function OrgsPage({ active }) {
  const { db, ensureRegionesLoaded, ensureOpaLoaded } = useDb()
  useEffect(() => {
    if (!active) return
    ensureRegionesLoaded?.()
    ensureOpaLoaded?.()
  }, [active, ensureRegionesLoaded, ensureOpaLoaded])

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
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
      .slice(0, 2000)
  }, [orgs, regionId, q])

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-orgs">
      <div className="ph">
        <div>
          <h2>Organizaciones</h2>
          <p>Listado OPA por región (con búsqueda)</p>
        </div>
      </div>
      <div className="admin-layout masters-layout">
        <div className="card region-combo">
          <div className="ig" style={{ marginBottom: 0 }}>
            <label className="il">Región</label>
            <select
              className="is"
              value={regionId}
              onChange={(e) => {
                const rid = parseInt(e.target.value, 10)
                setRegionId(Number.isFinite(rid) ? rid : regionId)
              }}
            >
              {regiones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rom} — {r.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card admin-menu region-menu" style={{ minHeight: 0, overflowY: 'auto' }}>
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
        <div className="card admin-content" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="masters-actions">
            <input className="flt" placeholder="Buscar organización..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="masters-table">
            <table className="tbl tbl-static-mobile">
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
