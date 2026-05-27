import { useMemo, useState } from 'react'
import { useUi } from '../../context/uiContext.jsx'
import MappedColumnPreview from './MappedColumnPreview.jsx'

const IGNORE_VALUE = '__ignore__'

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
  const { toast } = useUi()

  const columnasSinMapear = Array.isArray(unmappedColumns) ? unmappedColumns : []
  const camposSistema = Array.isArray(systemSpeciesFields) ? systemSpeciesFields : []

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
      if (!seleccionado || seleccionado === IGNORE_VALUE) return
      out.push({
        excelColumnName: nombre,
        fieldId: seleccionado,
        systemFieldName: labelById.get(seleccionado) || seleccionado,
        sampleData: Array.isArray(c?.sampleData) ? c.sampleData : [],
      })
    })
    return out
  }, [columnasSinMapear, labelById, mapeoPorColumna])

  const fieldCount = useMemo(() => {
    const m = new Map()
    mapeosActivos.forEach((x) => {
      m.set(x.fieldId, (m.get(x.fieldId) || 0) + 1)
    })
    return m
  }, [mapeosActivos])

  const setMapping = (columnName, fieldId) => {
    const col = String(columnName || '').trim()
    const next = String(fieldId || '').trim()
    if (!col) return

    if (!allowDuplicateFields && next && next !== IGNORE_VALUE && fieldCount.get(next) >= 1 && String(mapeoPorColumna[col] || '') !== next) {
      toast('Este campo ya ha sido asignado a otra columna. Elige uno distinto.', 'red')
      return
    }

    setMapeoPorColumna((prev) => {
      const out = { ...(prev || {}) }
      if (!next) delete out[col]
      else out[col] = next
      return out
    })

    if (next && next !== IGNORE_VALUE) onMap?.(col, next)
    if (!next || next === IGNORE_VALUE) onUnmap?.(col)
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
        return !v
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
      const assigned = new Set(mapeosActivos.map((x) => x.fieldId))
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
                <MappedColumnPreview
                  key={m.excelColumnName}
                  excelColumnName={m.excelColumnName}
                  systemFieldName={m.systemFieldName}
                  sampleData={m.sampleData}
                  onRemoveMapping={removeMapping}
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
