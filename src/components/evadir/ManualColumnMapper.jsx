import { useEffect, useMemo, useState } from 'react'
import { usarInterfaz } from '../../context/uiContext.jsx'
import { usarBaseDatos } from '../../context/dbContext.jsx'
import { usarAplicacion } from '../../context/appContext.jsx'
import VistaPreviaColumnaMapeada from './MappedColumnPreview.jsx'

const IGNORE_VALUE = '__ignore__'
const ADD_NEW_SPECIES_VALUE = '__add_new_species__'

export default function ManualColumnMapper({
  unmappedColumns,
  systemSpeciesFields,
  onMap,
  onUnmap,
  onConfirm,
  initialMappingByColumn,
  allowIgnore = true,
  allowDuplicateFields = false,
  showGuardarPreferencias = true,
  headerTitle = 'Mapeo manual de columnas de especies',
  headerText = '1) Revisa las columnas no reconocidas. 2) Asigna cada columna al campo correcto (o marca Ignorar). 3) Valida la vista previa y confirma.',
  leftTitle = 'Columnas no reconocidas',
  rightTitle = 'Mapeos aplicados',
  confirmLabel = 'Confirmar mapeo',
}) {
  const { mostrarToast: toast } = usarInterfaz()
  const { baseDatos: db, asegurarEspeciesCargadas: ensureEspeciesLoaded, crearEspecie: createEspecie, apiHabilitada: apiEnabled } = usarBaseDatos()
  const { esAdmin: isAdmin } = usarAplicacion()

  const columnasSinMapear = Array.isArray(unmappedColumns) ? unmappedColumns : []
  const camposSistemaProp = Array.isArray(systemSpeciesFields) ? systemSpeciesFields : []

  useEffect(() => {
    if (!apiEnabled) return
    Promise.resolve(ensureEspeciesLoaded?.()).catch(() => null)
  }, [apiEnabled, ensureEspeciesLoaded])

  const suggestedNextSpeciesId = useMemo(() => {
    const especies = Array.isArray(db?.especies) ? db.especies : []
    const max = especies
      .map((e) => Number(e?.id))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return max + 1
  }, [db?.especies])

  const camposEspeciesDb = useMemo(() => {
    const especies = Array.isArray(db?.especies) ? db.especies : []
    const out = []
    especies.forEach((sp) => {
      const id = Number(sp?.id)
      if (!Number.isFinite(id)) return
      const com = String(sp?.com || '').trim()
      const sci = String(sp?.sci || '').trim()
      const labelBase = com || sci || `Especie ${id}`
      const extra = com && sci && com !== sci ? ` (${sci})` : ''
      out.push({ id: `NUM:${id}`, label: `NUM ${labelBase}${extra}`, required: false })
    })
    return out
  }, [db?.especies])

  const camposSistema = useMemo(() => {
    const out = []
    const seen = new Set()
    ;(Array.isArray(camposSistemaProp) ? camposSistemaProp : []).forEach((f) => {
      const id = String(f?.id || '').trim()
      if (!id || seen.has(id)) return
      seen.add(id)
      out.push(f)
    })
    camposEspeciesDb.forEach((f) => {
      const id = String(f?.id || '').trim()
      if (!id || seen.has(id)) return
      seen.add(id)
      out.push(f)
    })
    return out
  }, [camposSistemaProp, camposEspeciesDb])

  const mapaInicial = initialMappingByColumn && typeof initialMappingByColumn === 'object' ? initialMappingByColumn : {}
  const [mapeoPorColumna, setMapeoPorColumna] = useState(() => {
    const out = {}
    columnasSinMapear.forEach((c) => {
      const nombre = String(c?.name || '').trim()
      if (!nombre) return
      const v = String(mapaInicial[nombre] || '').trim()
      if (v) out[nombre] = v
    })
    return out
  })
  const [guardarPreferencias, setGuardarPreferencias] = useState(true)
  const [nuevoFormularioPorColumna, setNuevoFormularioPorColumna] = useState({})

  const labelById = useMemo(() => {
    const m = new Map()
    camposSistema.forEach((f) => {
      const id = String(f?.id || '').trim()
      const label = String(f?.label || '').trim()
      if (id) m.set(id, label || id)
    })
    return m
  }, [camposSistema])

  const requeridos = useMemo(() => camposSistema.filter((f) => !!f?.required), [camposSistema])

  const mapeosActivos = useMemo(() => {
    const out = []
    columnasSinMapear.forEach((c) => {
      const nombre = String(c?.name || '').trim()
      if (!nombre) return
      const seleccionado = String(mapeoPorColumna[nombre] || '').trim()
      if (!seleccionado || seleccionado === IGNORE_VALUE || seleccionado === ADD_NEW_SPECIES_VALUE) return
      out.push({
        nombreColumnaExcel: nombre,
        idCampo: seleccionado,
        nombreCampoSistema: labelById.get(seleccionado) || seleccionado,
        datosMuestra: Array.isArray(c?.sampleData) ? c.sampleData : [],
      })
    })
    return out
  }, [columnasSinMapear, labelById, mapeoPorColumna])

  const fieldCount = useMemo(() => {
    const m = new Map()
    mapeosActivos.forEach((x) => {
      m.set(x.idCampo, (m.get(x.idCampo) || 0) + 1)
    })
    return m
  }, [mapeosActivos])

  const setMapping = (columnName, fieldId) => {
    const col = String(columnName || '').trim()
    const next = String(fieldId || '').trim()
    if (!col) return

    if (
      !allowDuplicateFields &&
      next &&
      next !== IGNORE_VALUE &&
      next !== ADD_NEW_SPECIES_VALUE &&
      fieldCount.get(next) >= 1 &&
      String(mapeoPorColumna[col] || '') !== next
    ) {
      toast('Este campo ya ha sido asignado a otra columna. Elige uno distinto.', 'red')
      return
    }

    if (next !== ADD_NEW_SPECIES_VALUE) {
      setNuevoFormularioPorColumna((prev) => {
        const out = { ...(prev || {}) }
        delete out[col]
        return out
      })
    } else {
      setNuevoFormularioPorColumna((prev) => {
        const out = { ...(prev || {}) }
        if (!out[col]) {
          out[col] = {
            id: String(suggestedNextSpeciesId),
            com: '',
            sci: '',
            lp: true,
            dens: true,
            is_alga: false,
            activo: true,
            saving: false,
          }
        }
        return out
      })
    }

    setMapeoPorColumna((prev) => {
      const out = { ...(prev || {}) }
      if (!next) delete out[col]
      else out[col] = next
      return out
    })

    if (next && next !== IGNORE_VALUE && next !== ADD_NEW_SPECIES_VALUE) onMap?.(col, next)
    if (!next || next === IGNORE_VALUE || next === ADD_NEW_SPECIES_VALUE) onUnmap?.(col)
  }

  const removeMapping = (columnName) => {
    const col = String(columnName || '').trim()
    if (!col) return
    setMapeoPorColumna((prev) => {
      const out = { ...(prev || {}) }
      delete out[col]
      return out
    })
    onUnmap?.(col)
  }

  const validarAntesDeConfirmar = () => {
    const faltanAsignaciones = columnasSinMapear
      .map((c) => String(c?.name || '').trim())
      .filter(Boolean)
      .filter((nombre) => {
        const v = String(mapeoPorColumna[nombre] || '').trim()
        return !v || v === ADD_NEW_SPECIES_VALUE
      })

    if (faltanAsignaciones.length) {
      toast('Debes asignar todas las filas listadas antes de continuar.', 'red')
      return false
    }

    if (!allowDuplicateFields) {
      const duplicados = Array.from(fieldCount.entries()).filter(([, n]) => n > 1)
      if (duplicados.length) {
        toast('Hay campos asignados más de una vez. Corrige los duplicados para continuar.', 'red')
        return false
      }
    }

    if (requeridos.length) {
      const requiredIds = requeridos.map((f) => String(f?.id || '').trim()).filter(Boolean)
      const assigned = new Set(mapeosActivos.map((x) => x.idCampo))
      const missing = requiredIds.filter((id) => !assigned.has(id))
      if (missing.length) {
        toast('Faltan campos obligatorios de especies por asignar.', 'red')
        return false
      }
    }

    return true
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="info-box teal" style={{ marginBottom: 0 }}>
        <span>i</span>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{headerTitle}</div>
          <div style={{ fontSize: 12 }}>{headerText}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 900, color: 'var(--navy)' }}>{leftTitle}</div>

          {columnasSinMapear.length ? (
            columnasSinMapear.map((c, idx) => {
              const nombre = String(c?.name || '').trim()
              const muestra = Array.isArray(c?.sampleData) ? c.sampleData : []
              const seleccionado = String(mapeoPorColumna[nombre] || '').trim()

              return (
                <div
                  key={`${nombre || 'columna'}-${idx}`}
                  style={{
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--white)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: 'var(--navy)', overflowWrap: 'anywhere' }}>{nombre || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        Vista previa: {muestra.length ? muestra.join(' · ') : '—'}
                      </div>
                    </div>

                    <select
                      className="flt"
                      value={seleccionado}
                      onChange={(e) => setMapping(nombre, e.target.value)}
                      title="Selecciona el campo del sistema que corresponde a esta columna"
                      style={{ minWidth: 260 }}
                    >
                      <option value="">Seleccionar…</option>
                      {allowIgnore ? <option value={IGNORE_VALUE}>Ignorar</option> : null}
                      {apiEnabled && isAdmin ? <option value={ADD_NEW_SPECIES_VALUE}>Agregar nueva especie</option> : null}
                      {camposSistema.map((f) => {
                        const id = String(f?.id || '').trim()
                        const label = String(f?.label || '').trim()
                        if (!id) return null
                        return (
                          <option key={id} value={id}>
                            {label || id}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {seleccionado === ADD_NEW_SPECIES_VALUE ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 13 }}>Nueva especie</div>
                      <div className="i2" style={{ marginBottom: 0 }}>
                        <div className="ig">
                          <label className="il">ID (numérico)</label>
                          <input
                            className="ii"
                            type="number"
                            value={String(nuevoFormularioPorColumna?.[nombre]?.id ?? '')}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), id: e.target.value },
                              }))
                            }
                            placeholder={String(suggestedNextSpeciesId)}
                          />
                        </div>
                        <div className="ig">
                          <label className="il">Activo</label>
                          <select
                            className="is"
                            value={nuevoFormularioPorColumna?.[nombre]?.activo ? '1' : '0'}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), activo: e.target.value === '1' },
                              }))
                            }
                          >
                            <option value="1">Sí</option>
                            <option value="0">No</option>
                          </select>
                        </div>
                      </div>
                      <div className="i2" style={{ marginBottom: 0 }}>
                        <div className="ig">
                          <label className="il">Nombre común</label>
                          <input
                            className="ii"
                            value={String(nuevoFormularioPorColumna?.[nombre]?.com ?? '')}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), com: e.target.value },
                              }))
                            }
                            placeholder="Ej: Lapa reina"
                          />
                        </div>
                        <div className="ig">
                          <label className="il">Nombre científico</label>
                          <input
                            className="ii"
                            value={String(nuevoFormularioPorColumna?.[nombre]?.sci ?? '')}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), sci: e.target.value },
                              }))
                            }
                            placeholder="Ej: Fissurella maxima"
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!nuevoFormularioPorColumna?.[nombre]?.dens}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), dens: e.target.checked },
                              }))
                            }
                          />
                          Densidad
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!nuevoFormularioPorColumna?.[nombre]?.lp}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), lp: e.target.checked },
                              }))
                            }
                          />
                          Peso-Longitud
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!nuevoFormularioPorColumna?.[nombre]?.is_alga}
                            onChange={(e) =>
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), is_alga: e.target.checked },
                              }))
                            }
                          />
                          Alga (diámetro disco)
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn b-out b-sm"
                          disabled={!!nuevoFormularioPorColumna?.[nombre]?.saving}
                          onClick={() => {
                            setNuevoFormularioPorColumna((prev) => {
                              const out = { ...(prev || {}) }
                              delete out[nombre]
                              return out
                            })
                            setMapping(nombre, '')
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn b-teal b-sm"
                          disabled={!!nuevoFormularioPorColumna?.[nombre]?.saving}
                          onClick={async () => {
                            if (!apiEnabled) {
                              toast('API no configurada (VITE_API_URL)', 'red')
                              return
                            }
                            if (!isAdmin) {
                              toast('Solo el administrador puede crear especies', 'blue')
                              return
                            }
                            try {
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), saving: true },
                              }))

                              const f = nuevoFormularioPorColumna?.[nombre] || {}
                              const idNum = parseInt(String(f?.id ?? '').trim(), 10)
                              const com = String(f?.com ?? '').trim()
                              const sci = String(f?.sci ?? '').trim()
                              if (!Number.isFinite(idNum)) throw new Error('ID inválido')
                              if (!com) throw new Error('Nombre común requerido')

                              const saved = await createEspecie({
                                id: idNum,
                                com,
                                sci: sci || null,
                                lp: !!f?.lp,
                                dens: !!f?.dens,
                                is_alga: !!f?.is_alga,
                                activo: f?.activo !== false,
                              })
                              const savedId = Number(saved?.id)
                              if (!Number.isFinite(savedId)) throw new Error('No se pudo crear la especie')

                              toast('Especie creada', 'green')
                              setNuevoFormularioPorColumna((prev) => {
                                const out = { ...(prev || {}) }
                                delete out[nombre]
                                return out
                              })
                              setMapping(nombre, `NUM:${savedId}`)
                            } catch (err) {
                              toast(String(err?.message || 'No se pudo crear la especie'), 'red')
                              setNuevoFormularioPorColumna((prev) => ({
                                ...(prev || {}),
                                [nombre]: { ...(prev?.[nombre] || {}), saving: false },
                              }))
                            }
                          }}
                        >
                          Guardar y usar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>No hay columnas para mapear.</div>
          )}
        </div>

        <div style={{ flex: '1 1 520px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900, color: 'var(--navy)' }}>{rightTitle}</div>
            {showGuardarPreferencias ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 12 }}>
                <input type="checkbox" checked={guardarPreferencias} onChange={(e) => setGuardarPreferencias(e.target.checked)} />
                Guardar este mapeo para futuras importaciones
              </label>
            ) : null}
          </div>

          {mapeosActivos.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mapeosActivos.map((m) => (
                <VistaPreviaColumnaMapeada
                  key={m.nombreColumnaExcel}
                  nombreColumnaExcel={m.nombreColumnaExcel}
                  nombreCampoSistema={m.nombreCampoSistema}
                  datosMuestra={m.datosMuestra}
                  alEliminarMapeo={removeMapping}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aún no hay mapeos.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn b-out" onClick={() => onConfirm?.(null)}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn b-teal"
          onClick={() => {
            if (!validarAntesDeConfirmar()) return
            onConfirm?.({ mappingByColumn: { ...mapeoPorColumna }, guardarPreferencias: showGuardarPreferencias ? guardarPreferencias : false })
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
