import { useEffect, useMemo, useState } from 'react'
import { usarBaseDatos } from '../context/dbContext.jsx'
import { usarInterfaz } from '../context/uiContext.jsx'
import { usarAplicacion } from '../context/appContext.jsx'
import IconoSvg from '../components/svgIcon.jsx'

/**
 * Página de sectores: listado de Sectores AMERB y caletas por región, con búsqueda.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.activo - Indica si la página está activa (habilita carga inicial).
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
 * <SectoresPage activo={page === 'sectores'} />
 *
 * Notas de mantenimiento:
 * - Si se agregan filtros (comuna, id), extender `sectoresFiltrados`.
 * - Si crece el dataset, considerar paginación; hoy se limita a 2000 filas.
 */
export default function SectoresPage({ activo }) {
  const {
    baseDatos: db,
    apiHabilitada: apiEnabled,
    asegurarRegionesCargadas: ensureRegionesLoaded,
    asegurarCaletasCargadas: ensureCaletasLoaded,
    asegurarSectoresAmerbCargados: ensureSectoresAmerbLoaded,
    crearSectorAmerb: createSectorAmerb,
    actualizarSectorAmerb: updateSectorAmerb,
    eliminarSectorAmerb: deleteSectorAmerb,
    crearCaleta: createCaleta,
    actualizarCaleta: updateCaleta,
    eliminarCaleta: deleteCaleta,
  } = usarBaseDatos()
  const { mostrarToast: toast } = usarInterfaz()
  const { esAdmin: isAdmin } = usarAplicacion()

  useEffect(() => {
    if (!activo) return
    ensureRegionesLoaded?.()
    ensureCaletasLoaded?.()
    ensureSectoresAmerbLoaded?.()
  }, [activo, ensureRegionesLoaded, ensureCaletasLoaded, ensureSectoresAmerbLoaded])

  const regiones = useMemo(() => {
    const arr = db?.regionesChile
    return Array.isArray(arr) ? arr : []
  }, [db?.regionesChile])
  const sectoresAmerb = useMemo(() => {
    const arr = db?.sectoresAmerb
    return Array.isArray(arr) ? arr : []
  }, [db?.sectoresAmerb])
  const caletasByRegion = useMemo(() => {
    return db?.caletasByRegionId || db?.caletasByRegionStatic || {}
  }, [db?.caletasByRegionId, db?.caletasByRegionStatic])
  const caletasList = useMemo(() => {
    const arr = db?.caletas
    return Array.isArray(arr) ? arr : []
  }, [db?.caletas])

  const suggestedNextSectorId = useMemo(() => {
    const max = (Array.isArray(sectoresAmerb) ? sectoresAmerb : [])
      .map((s) => Number(s?.id))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return max + 1
  }, [sectoresAmerb])

  const suggestedNextCaletaId = useMemo(() => {
    const max = (Array.isArray(caletasList) ? caletasList : [])
      .map((c) => Number(c?.id))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return max + 1
  }, [caletasList])

  const [regionId, setRegionId] = useState(regiones[0]?.id || 1)
  const [q, setQ] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editorType, setEditorType] = useState('sector')
  const [editorMode, setEditorMode] = useState('create')
  const [editorId, setEditorId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    id: '',
    region_id: '',
    nombre: '',
    comuna: '',
    activo: true,
  }))

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
    const list = caletasList
      .filter((c) => Number(c?.region_id) === Number(regionId))
      .sort((a, b) => String(a?.nombre || '').localeCompare(String(b?.nombre || '')))
    if (list.length) return list
    const arr = caletasByRegion?.[regionId]
    const names = Array.isArray(arr) ? arr : []
    return names.map((n) => ({ id: null, nombre: n, region_id: regionId }))
  }, [caletasByRegion, caletasList, regionId])

  return (
    <div className={`page${activo ? ' active' : ''}`} id="pg-sectores">
      <div className="ph">
        <div>
          <h2>Sectores</h2>
          <p>Sectores AMERB y caletas por región</p>
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
                  setEditorType('sector')
                  setEditorMode('create')
                  setEditorId(null)
                  setShowEditor(true)
                  setForm({ id: String(suggestedNextSectorId), region_id: String(regionId), nombre: '', comuna: '', activo: true })
                }}
              >
                Agregar sector
              </button>
              <button
                className="btn b-teal b-sm"
                onClick={() => {
                  if (!apiEnabled) {
                    toast('API no configurada (VITE_API_URL)', 'red')
                    return
                  }
                  setEditorType('caleta')
                  setEditorMode('create')
                  setEditorId(null)
                  setShowEditor(true)
                  setForm({ id: String(suggestedNextCaletaId), region_id: String(regionId), nombre: '', comuna: '', activo: true })
                }}
              >
                Agregar caleta
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showEditor && isAdmin ? (
        <div className="card" style={{ maxWidth: 1100, width: '100%', margin: '0 auto 14px', padding: 14 }}>
          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>
            {editorMode === 'edit'
              ? editorType === 'sector'
                ? 'Editar sector AMERB'
                : 'Editar caleta'
              : editorType === 'sector'
                ? 'Nuevo sector AMERB'
                : 'Nueva caleta'}
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
              <select className="is" value={form.region_id} onChange={(e) => setForm((s) => ({ ...s, region_id: e.target.value }))}>
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
              <label className="il">{editorType === 'sector' ? 'Sector AMERB' : 'Caleta'}</label>
              <input className="ii" value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
            </div>
            {editorType === 'sector' ? (
              <div className="ig">
                <label className="il">Comuna</label>
                <input className="ii" value={form.comuna} onChange={(e) => setForm((s) => ({ ...s, comuna: e.target.value }))} />
              </div>
            ) : (
              <div className="ig">
                <label className="il">Activo</label>
                <select className="is" value={form.activo ? '1' : '0'} onChange={(e) => setForm((s) => ({ ...s, activo: e.target.value === '1' }))}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            )}
          </div>

          {editorType === 'sector' ? (
            <div className="ig" style={{ marginTop: 8 }}>
              <label className="il">Activo</label>
              <select className="is" value={form.activo ? '1' : '0'} onChange={(e) => setForm((s) => ({ ...s, activo: e.target.value === '1' }))}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          ) : null}

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
                  const rid = parseInt(String(form.region_id || '').trim(), 10)
                  const nombre = String(form.nombre || '').trim()
                  const comuna = String(form.comuna || '').trim()
                  if (!Number.isFinite(idNum)) throw new Error('ID inválido')
                  if (!Number.isFinite(rid)) throw new Error('Región inválida')
                  if (!nombre) throw new Error(editorType === 'sector' ? 'Sector requerido' : 'Caleta requerida')

                  if (editorType === 'sector') {
                    if (editorMode === 'edit') {
                      if (!editorId) throw new Error('ID inválido')
                      await updateSectorAmerb(editorId, { region: rid, nombre, comuna: comuna || null, activo: !!form.activo })
                      toast('Sector actualizado', 'green')
                    } else {
                      await createSectorAmerb({ id: idNum, region: rid, nombre, comuna: comuna || null, activo: !!form.activo })
                      toast('Sector creado', 'green')
                    }
                  } else {
                    if (editorMode === 'edit') {
                      if (!editorId) throw new Error('ID inválido')
                      await updateCaleta(editorId, { region_id: rid, nombre, activo: !!form.activo })
                      toast('Caleta actualizada', 'green')
                    } else {
                      await createCaleta({ id: idNum, region_id: rid, nombre, activo: !!form.activo })
                      toast('Caleta creada', 'green')
                    }
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

      <div className="admin-layout masters-layout" style={{ gridTemplateColumns: '240px 1fr 1fr' }}>
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
            <input className="flt" placeholder="Buscar sector AMERB..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="masters-table">
            <table className="tbl tbl-static-mobile">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sector AMERB</th>
                  <th>Comuna</th>
                  {isAdmin && adminMode ? <th style={{ textAlign: 'right' }}>Acciones</th> : null}
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
                                setEditorType('sector')
                                setEditorMode('edit')
                                setEditorId(s?.id ?? null)
                                setShowEditor(true)
                                setForm({
                                  id: s?.id == null ? '' : String(s.id),
                                  region_id: String(s?.region_id ?? s?.region ?? regionId),
                                  nombre: String(s?.nombreamerb ?? s?.nombre ?? ''),
                                  comuna: String(s?.comuna ?? ''),
                                  activo: s?.activo == null ? true : !!s.activo,
                                })
                              }}
                            >
                              <IconoSvg name="edit" aria-hidden="true" />
                            </button>

                            <button
                              className="btn b-sm"
                              style={{
                                border: '1.5px solid',
                                borderColor: (s?.activo == null ? true : !!s.activo) ? 'var(--amber)' : 'var(--green)',
                                background: 'transparent',
                                color: (s?.activo == null ? true : !!s.activo) ? 'var(--amber)' : 'var(--green)',
                                padding: '6px 10px',
                              }}
                              onClick={async () => {
                                try {
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  await updateSectorAmerb(s.id, { activo: !(s?.activo == null ? true : !!s.activo) })
                                  toast((s?.activo == null ? true : !!s.activo) ? 'Sector desactivado' : 'Sector activado', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              {(s?.activo == null ? true : !!s.activo) ? 'Desactivar' : 'Activar'}
                            </button>

                            <button
                              className="tb-btn"
                              title="Eliminar"
                              style={{ borderColor: 'rgba(220,38,38,.35)' }}
                              onClick={async () => {
                                try {
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  const ok = confirm(`¿Eliminar sector "${String(s?.nombreamerb || s?.id)}" (ID ${s.id})?`)
                                  if (!ok) return
                                  await deleteSectorAmerb(s.id)
                                  toast('Sector eliminado', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              <IconoSvg name="trash" aria-hidden="true" style={{ fill: 'var(--red)' }} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin && adminMode ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card admin-content" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
            Caletas
          </div>
          <div className="masters-table">
            <table className="tbl tbl-static-mobile">
              <thead>
                <tr>
                  {isAdmin && adminMode ? <th>ID</th> : <th>#</th>}
                  <th>Caleta</th>
                  {isAdmin && adminMode ? <th style={{ textAlign: 'right' }}>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {caletas.length ? (
                  caletas.map((c, idx) => (
                    <tr key={c?.id != null ? `c-${c.id}` : `${c?.nombre}-${idx}`}>
                      {isAdmin && adminMode ? <td>{c?.id ?? '—'}</td> : <td>{idx + 1}</td>}
                      <td>{c?.nombre}</td>
                      {isAdmin && adminMode ? (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              className="tb-btn"
                              title="Editar"
                              disabled={c?.id == null}
                              onClick={() => {
                                if (c?.id == null) return
                                if (!apiEnabled) {
                                  toast('API no configurada (VITE_API_URL)', 'red')
                                  return
                                }
                                setEditorType('caleta')
                                setEditorMode('edit')
                                setEditorId(c?.id ?? null)
                                setShowEditor(true)
                                setForm({
                                  id: String(c?.id ?? ''),
                                  region_id: String(c?.region_id ?? regionId),
                                  nombre: String(c?.nombre ?? ''),
                                  comuna: '',
                                  activo: c?.activo == null ? true : !!c.activo,
                                })
                              }}
                            >
                              <IconoSvg name="edit" aria-hidden="true" />
                            </button>

                            <button
                              className="btn b-sm"
                              disabled={c?.id == null}
                              style={{
                                border: '1.5px solid',
                                borderColor: (c?.activo == null ? true : !!c.activo) ? 'var(--amber)' : 'var(--green)',
                                background: 'transparent',
                                color: (c?.activo == null ? true : !!c.activo) ? 'var(--amber)' : 'var(--green)',
                                padding: '6px 10px',
                              }}
                              onClick={async () => {
                                try {
                                  if (c?.id == null) return
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  await updateCaleta(c.id, { activo: !(c?.activo == null ? true : !!c.activo) })
                                  toast((c?.activo == null ? true : !!c.activo) ? 'Caleta desactivada' : 'Caleta activada', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              {(c?.activo == null ? true : !!c.activo) ? 'Desactivar' : 'Activar'}
                            </button>

                            <button
                              className="tb-btn"
                              title="Eliminar"
                              disabled={c?.id == null}
                              style={{ borderColor: 'rgba(220,38,38,.35)' }}
                              onClick={async () => {
                                try {
                                  if (c?.id == null) return
                                  if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                                  const ok = confirm(`¿Eliminar caleta "${String(c?.nombre || c?.id)}" (ID ${c.id})?`)
                                  if (!ok) return
                                  await deleteCaleta(c.id)
                                  toast('Caleta eliminada', 'green')
                                } catch (err) {
                                  toast(String(err?.message || 'Error'), 'red')
                                }
                              }}
                            >
                              <IconoSvg name="trash" aria-hidden="true" style={{ fill: 'var(--red)' }} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin && adminMode ? 3 : 2} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
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
