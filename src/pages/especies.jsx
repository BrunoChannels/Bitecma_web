import { useMemo, useState } from 'react'
import { useEspecies } from '../hooks/useEspecies.js'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { useApp } from '../context/appContext.jsx'
import SvgIcon from '../components/svgIcon.jsx'

/**
 * Página de maestro de especies: lista especies bentónicas disponibles en el sistema.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (se usa para estilos; la carga ocurre en el hook).
 * @returns {import('react').JSX.Element} Tabla con especies (nombre común y científico).
 *
 * Lógica:
 * 1) Obtiene `especies` desde el hook `useEspecies`.
 * 2) Renderiza una tabla simple con índice y nombres.
 *
 * Dependencias externas:
 * - `useEspecies` (hook de datos).
 *
 * Efectos secundarios:
 * - Dependen del hook (por ejemplo: carga desde DB o API). El componente en sí es de solo lectura.
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se asume que el hook entrega un arreglo seguro.
 *
 * @example
 * <EspeciesPage active={page === 'especies'} />
 *
 * Notas de mantenimiento:
 * - Si se agregan columnas (tallas mínimas, códigos), extender encabezado y filas manteniendo accesibilidad.
 */
export default function EspeciesPage({ active }) {
  const { especies } = useEspecies()
  const { createEspecie, updateEspecie, deleteEspecie, apiEnabled } = useDb()
  const { toast } = useUi()
  const { isAdmin } = useApp()

  const suggestedNextId = useMemo(() => {
    const max = (Array.isArray(especies) ? especies : [])
      .map((e) => Number(e?.id))
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.max(a, b), 0)
    return max + 1
  }, [especies])

  const [adminMode, setAdminMode] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [mode, setMode] = useState('create')
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    id: '',
    com: '',
    sci: '',
    lp: true,
    dens: true,
    is_alga: false,
    activo: true,
  }))

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-especies">
      <div className="ph">
        <div>
          <h2>Especies</h2>
          <p>Bentónicas de Chile</p>
        </div>
        <div className="ph-a">
          {isAdmin ? (
            <>
              <button
                className="btn b-out b-sm"
                onClick={() => {
                  setAdminMode((v) => !v)
                }}
              >
                {adminMode ? 'Salir administración' : 'Administrar especies'}
              </button>
              <button
                className="btn b-teal b-sm"
                onClick={() => {
                  if (!apiEnabled) {
                    toast('API no configurada (VITE_API_URL)', 'red')
                    return
                  }
                  setMode('create')
                  setEditId(null)
                  setShowAdd(true)
                  setForm({
                    id: String(suggestedNextId),
                    com: '',
                    sci: '',
                    lp: true,
                    dens: true,
                    is_alga: false,
                    activo: true,
                  })
                }}
              >
                Agregar especie
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showAdd && isAdmin ? (
        <div className="card" style={{ maxWidth: 1100, width: '100%', margin: '0 auto 14px', padding: 14 }}>
          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>
            {mode === 'edit' ? 'Editar especie' : 'Nueva especie'}
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">ID (numérico)</label>
              <input
                className="ii"
                type="number"
                value={form.id}
                onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
                placeholder={String(suggestedNextId)}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="ig">
              <label className="il">Activo</label>
              <select
                className="is"
                value={form.activo ? '1' : '0'}
                onChange={(e) => setForm((s) => ({ ...s, activo: e.target.value === '1' }))}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="i2">
            <div className="ig">
              <label className="il">Nombre común</label>
              <input
                className="ii"
                value={form.com}
                onChange={(e) => setForm((s) => ({ ...s, com: e.target.value }))}
                placeholder="Ej: Loco"
              />
            </div>
            <div className="ig">
              <label className="il">Nombre científico</label>
              <input
                className="ii"
                value={form.sci}
                onChange={(e) => setForm((s) => ({ ...s, sci: e.target.value }))}
                placeholder="Ej: Concholepas concholepas"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!form.dens} onChange={(e) => setForm((s) => ({ ...s, dens: e.target.checked }))} />
              Densidad
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!form.lp} onChange={(e) => setForm((s) => ({ ...s, lp: e.target.checked }))} />
              Peso-Longitud
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!form.is_alga} onChange={(e) => setForm((s) => ({ ...s, is_alga: e.target.checked }))} />
              Alga (diámetro disco)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              className="btn b-out"
              style={{ flex: 1 }}
              disabled={saving}
              onClick={() => {
                setShowAdd(false)
              }}
            >
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true)
                  const idNum = parseInt(String(form.id || '').trim(), 10)
                  const com = String(form.com || '').trim()
                  const sci = String(form.sci || '').trim()
                  if (!Number.isFinite(idNum)) throw new Error('ID inválido')
                  if (!com) throw new Error('Nombre común requerido')

                  if (mode === 'edit') {
                    if (!editId) throw new Error('ID inválido')
                    await updateEspecie(editId, {
                      com,
                      sci: sci || null,
                      lp: !!form.lp,
                      dens: !!form.dens,
                      is_alga: !!form.is_alga,
                      activo: !!form.activo,
                    })
                    toast('Especie actualizada', 'green')
                  } else {
                    await createEspecie({
                      id: idNum,
                      com,
                      sci: sci || null,
                      lp: !!form.lp,
                      dens: !!form.dens,
                      is_alga: !!form.is_alga,
                      activo: !!form.activo,
                    })
                    toast('Especie creada', 'green')
                  }

                  setShowAdd(false)
                  setMode('create')
                  setEditId(null)
                  setForm({
                    id: '',
                    com: '',
                    sci: '',
                    lp: true,
                    dens: true,
                    is_alga: false,
                    activo: true,
                  })
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

      <div className="card" style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
        <table className="tbl tbl-static-mobile">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre común</th>
              <th>Nombre científico</th>
              {isAdmin && adminMode ? <th style={{ textAlign: 'right' }}>Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {especies.map((e, idx) => (
              <tr key={e.id ?? idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{e.com}</strong>
                </td>
                <td>
                  <em>{e.sci}</em>
                </td>
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
                          setMode('edit')
                          setEditId(e?.id ?? null)
                          setShowAdd(true)
                          setForm({
                            id: e?.id == null ? '' : String(e.id),
                            com: String(e?.com || ''),
                            sci: String(e?.sci || ''),
                            lp: !!e?.lp,
                            dens: !!e?.dens,
                            is_alga: !!e?.is_alga,
                            activo: e?.activo == null ? true : !!e.activo,
                          })
                        }}
                      >
                        <SvgIcon name="edit" aria-hidden="true" />
                      </button>

                      <button
                        className="btn b-sm"
                        style={{
                          border: '1.5px solid',
                          borderColor: e?.activo ? 'var(--amber)' : 'var(--green)',
                          background: 'transparent',
                          color: e?.activo ? 'var(--amber)' : 'var(--green)',
                          padding: '6px 10px',
                        }}
                        onClick={async () => {
                          try {
                            if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                            const id = e?.id
                            if (id == null || String(id) === '') throw new Error('ID inválido')
                            await updateEspecie(id, { activo: !e?.activo })
                            toast(!e?.activo ? 'Especie activada' : 'Especie desactivada', 'green')
                          } catch (err) {
                            toast(String(err?.message || 'Error'), 'red')
                          }
                        }}
                      >
                        {e?.activo ? 'Desactivar' : 'Activar'}
                      </button>

                      <button
                        className="tb-btn"
                        title="Eliminar"
                        style={{ borderColor: 'rgba(220,38,38,.35)' }}
                        onClick={async () => {
                          try {
                            if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
                            const id = e?.id
                            if (id == null || String(id) === '') throw new Error('ID inválido')
                            const ok = confirm(`¿Eliminar especie "${String(e?.com || id)}" (ID ${id})?`)
                            if (!ok) return
                            await deleteEspecie(id)
                            toast('Especie eliminada', 'green')
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
