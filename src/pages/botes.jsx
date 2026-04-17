import { useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'

export default function BotesPage({ active }) {
  const { db } = useDb()
  const regiones = useMemo(() => {
    const arr = db?.regionesChile
    return Array.isArray(arr) ? arr : []
  }, [db?.regionesChile])
  const botes = useMemo(() => {
    const arr = db?.botesMaestro
    return Array.isArray(arr) ? arr : []
  }, [db?.botesMaestro])

  const [regionRom, setRegionRom] = useState(regiones[0]?.rom || 'I')
  const [q, setQ] = useState('')

  const botesFiltrados = useMemo(() => {
    const query = String(q || '').toLowerCase().trim()
    return botes
      .filter((b) => String(b.region || '') === String(regionRom || ''))
      .filter((b) =>
        !query
          ? true
          : String(b.nombre || '').toLowerCase().includes(query) ||
            String(b.caleta || '').toLowerCase().includes(query) ||
            String(b.nrpa || '').toLowerCase().includes(query) ||
            String(b.nmatricula || '').toLowerCase().includes(query),
      )
      .slice(0, 500)
  }, [botes, regionRom, q])

  const resumenGlobal = useMemo(() => {
    const by = new Map()
    botes.forEach((b) => {
      const r = String(b.region || '—')
      by.set(r, (by.get(r) || 0) + 1)
    })
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [botes])

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-botes">
      <div className="ph">
        <div>
          <h2>Botes</h2>
          <p>Listado de botes y embarcaciones por región</p>
        </div>
      </div>
      <div className="admin-layout" id="mb-layout">
        <div className="card admin-menu">
          {regiones.map((r) => (
            <div
              key={r.id}
              className={`admin-item ${regionRom === r.rom ? 'on' : ''}`}
              onClick={() => setRegionRom(r.rom)}
            >
              {r.rom} — {r.nom}
            </div>
          ))}
        </div>
        <div
          id="mb-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
          }}
        >
          <div
            className="card admin-content"
            style={{ flex: 1, minHeight: 0 }}
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                className="flt"
                placeholder="Buscar bote..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {botesFiltrados.length} bote(s)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Caleta</th>
                    <th>NRPA</th>
                    <th>Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {botesFiltrados.length ? (
                    botesFiltrados.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>
                          <strong>{b.nombre}</strong>
                        </td>
                        <td>{b.caleta || '—'}</td>
                        <td>{b.nrpa || '—'}</td>
                        <td>{b.nmatricula || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div
            className="card admin-content"
            style={{ flex: '0 0 240px', minHeight: 0 }}
          >
            <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>
              Resumen global
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Región</th>
                    <th>Total botes</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenGlobal.length ? (
                    resumenGlobal.map(([r, n]) => (
                      <tr key={r}>
                        <td>{r}</td>
                        <td>{n}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
