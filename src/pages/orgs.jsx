import { useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { useApp } from '../context/appContext.jsx'
import SvgIcon from '../components/svgIcon.jsx'

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
  const { db, apiEnabled, ensureRegionesLoaded, ensureOpaLoaded, createOpa, updateOpa, deleteOpa } = useDb()
  const { toast } = useUi()
  const { isAdmin } = useApp()
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

  const suggestedNextOpaId = useMemo(() => {
    const max = (Array.isArray(orgs) ? orgs : [])
      .map((o) => Number(o?.id))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return max + 1
  }, [orgs])

  const [regionId, setRegionId] = useState(regiones[0]?.id || 1)
  const [q, setQ] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editorMode, setEditorMode] = useState('create')
  const [editorId, setEditorId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    id: '',
    nombre: '',
    nombrecorto: '',
    comuna: '',
    region: '',
    activo: true,
  }))

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
        <div className="ph-a">
          {isAdmin ? (
            <>
              <button className="btn b-out b-sm" onClick={() => setAdminMode((v) => !v)}>
                {adminMode ? 'Salir administración' : 'Administrar'}
              </button>
              <button
                className="btn b-teal b-sm"
                onClick={() => {
                  if (!apiEnabled) {
                    toast('API no configurada (VITE_API_URL)', 'red')
                    return
                  }
                  setEditorMode('create')
                  setEditorId(null)
                  setShowEditor(true)
                  setForm({ id: String(suggestedNextOpaId), nombre: '', nombrecorto: '', comuna: '', region: String(regionId), activo: true })
                }}
              >
                Agregar organización
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showEditor && isAdmin ? (
        <div className="card" style={{ maxWidth: 1100, width: '100%', margin: '0 auto 14px', padding: 14 }}>
          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>
            {editorMode === 'edit' ? 'Editar organización' : 'Nueva organización'}
          </div>

          <div className="i2">
            <div className="ig">
              <label className="il">ID (numérico)</label>
              <input
                className="ii"
                type="number"
                value={form.id}
                disabled
                onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              />
            </div>
            <div className="ig">
              <label className="il">Región</label>
              <select className="is" value={form.region} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))}>
                {regiones.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.rom} — {r.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="i2">
            <div className="ig">
              <label className="il">Nombre</label>
              <input className="ii" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Nombre corto</label>
              <input className="ii" value={form.nombrecorto} onChange={(e) => setForm((s) => ({ ...s, nombrecorto: e.target.value }))} />
            </div>
          </div>

          <div className="i2">
            <div className="ig">
              <label className="il">Comuna</label>
              <input className="ii" value={form.comuna} onChange={(e) => setForm((s) => ({ ...s, comuna: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Activo</label>
              <select className="is" value={form.activo ? '1' : '0'} onChange={(e) => setForm((s) => ({ ...s, activo: e.target.value === '1' }))}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn b-out" style={{ flex: 1 }} disabled={saving} onClick={() => setShowEditor(false)}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={saving}
              onClick={async () => {
                try {
                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                  setSaving(true)
                  const idNum = parseInt(String(form.id || '').trim(), 10)
                  const rid = parseInt(String(form.region || '').trim(), 10)
                  const nombre = String(form.nombre || '').trim()
                  const nombrecorto = String(form.nombrecorto || '').trim()
                  const comuna = String(form.comuna || '').trim()
                  if (!Number.isFinite(idNum)) throw new Error('ID inválido')
                  if (!Number.isFinite(rid)) throw new Error('Región inválida')
                  if (!nombre) throw new Error('Nombre requerido')

                  if (editorMode === 'edit') {
                    if (!editorId) throw new Error('ID inválido')
                    await updateOpa(editorId, {
                      nombre,
                      nombrecorto: nombrecorto || null,
                      comuna: comuna || null,
                      region: rid,
                      activo: !!form.activo,
                    })
                    toast('Organización actualizada', 'green')
                  } else {
                    await createOpa({
                      id: idNum,
                      nombre,
                      nombrecorto: nombrecorto || null,
                      comuna: comuna || null,
                      region: rid,
                      activo: !!form.activo,
                    })
                    toast('Organización creada', 'green')
                  }

                  setShowEditor(false)
                  setEditorMode('create')
                  setEditorId(null)
                } catch (e) {
                  toast(String(e?.message || 'Error'), 'red')
                } finally {
                  setSaving(false)
                }
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}

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
                  {isAdmin && adminMode ? <th style={{ textAlign: 'right' }}>Acciones</th> : null}
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
                      {isAdmin && adminMode ? (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              className="tb-btn"
                              title="Editar"
                              onClick={() => {
                                if (!apiEnabled) {
                                  toast('API no configurada (VITE_API_URL)', 'red')
                                  return
                                }
                                setEditorMode('edit')
                                setEditorId(o?.id ?? null)
                                setShowEditor(true)
                                setForm({
                                  id: o?.id == null ? '' : String(o.id),
                                  nombre: String(o?.nombre || ''),
                                  nombrecorto: String(o?.nombrecorto || ''),
                                  comuna: String(o?.comuna || ''),
                                  region: String(o?.region ?? regionId),
                                  activo: o?.activo == null ? true : !!o.activo,
                                })
                              }}
                            >
                              <SvgIcon name="edit" aria-hidden="true" />
                            </button>

                            <button
                              className="btn b-sm"
                              style={{
                                border: '1.5px solid',
                                borderColor: (o?.activo == null ? true : !!o.activo) ? 'var(--amber)' : 'var(--green)',
                                background: 'transparent',
                                color: (o?.activo == null ? true : !!o.activo) ? 'var(--amber)' : 'var(--green)',
                                padding: '6px 10px',
                              }}
                              onClick={async () => {
                                try {
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  await updateOpa(o.id, { activo: !(o?.activo == null ? true : !!o.activo) })
                                  toast((o?.activo == null ? true : !!o.activo) ? 'Organización desactivada' : 'Organización activada', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              {(o?.activo == null ? true : !!o.activo) ? 'Desactivar' : 'Activar'}
                            </button>

                            <button
                              className="tb-btn"
                              title="Eliminar"
                              style={{ borderColor: 'rgba(220,38,38,.35)' }}
                              onClick={async () => {
                                try {
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  const ok = confirm(`¿Eliminar organización "${String(o?.nombre || o?.id)}" (ID ${o.id})?`)
                                  if (!ok) return
                                  await deleteOpa(o.id)
                                  toast('Organización eliminada', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              <SvgIcon name="trash" aria-hidden="true" style={{ fill: 'var(--red)' }} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin && adminMode ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
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
