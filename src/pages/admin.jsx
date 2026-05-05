import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { useApp } from '../context/appContext.jsx'

export default function AdminPage({ active }) {
  const { db } = useDb()
  const { toast, openModal, closeModal } = useUi()
  const { navigate, isAdmin } = useApp()
  const [tab, setTab] = useState('usuarios')
  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl

  const perfiles = useMemo(() => {
    const arr = db?.perfiles
    return Array.isArray(arr) ? arr : []
  }, [db?.perfiles])

  const [apiUsers, setApiUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (!active) return
    if (isAdmin) return
    toast('Acceso restringido: solo Admin', 'red')
    navigate('dashboard')
  }, [active, isAdmin, navigate, toast])

  const apiFetch = useCallback(
    async (path, opts) => {
      const url = `${apiUrl}/${String(path || '').replace(/^\/+/, '')}`
      const token = (() => {
        try {
          return localStorage.getItem('bitecma_token')
        } catch {
          return null
        }
      })()
      const headers = { ...(opts?.headers || {}) }
      if (!headers['Content-Type'] && opts?.body) headers['Content-Type'] = 'application/json'
      if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`
      const res = await fetch(url, { ...(opts || {}), headers })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        const msg = String(json?.error || res.statusText || 'Error')
        throw new Error(msg)
      }
      return json
    },
    [apiUrl],
  )

  const loadUsers = useCallback(async () => {
    if (!apiEnabled) return
    setUsersLoading(true)
    try {
      const json = await apiFetch('/usuarios')
      const arr = json?.data
      setApiUsers(Array.isArray(arr) ? arr : [])
    } catch (err) {
      toast(String(err?.message || 'Error cargando usuarios'), 'red')
    } finally {
      setUsersLoading(false)
    }
  }, [apiEnabled, apiFetch, toast])

  useEffect(() => {
    if (!active) return
    if (!apiEnabled) return
    loadUsers()
  }, [active, apiEnabled, loadUsers])

  const rolePillClass = (rol) => {
    const r = String(rol || '').toLowerCase()
    if (r === 'admin') return 'p-red'
    if (r === 'usuario') return 'p-grn'
    if (r === 'visualizador') return 'p-amb'
    if (r === 'biólogo' || r === 'biologo') return 'p-grn'
    return 'p-slt'
  }

  const users = apiEnabled ? apiUsers : perfiles

  const openUserEditor = useCallback(
    ({ mode, user }) => {
      const isEdit = mode === 'edit'
      const initial = user || {}
      openModal(
        isEdit ? 'Editar usuario' : 'Nuevo usuario',
        <UserEditor
          mode={mode}
          initial={initial}
          onCancel={closeModal}
          onSaved={async () => {
            closeModal()
            if (apiEnabled) await loadUsers()
          }}
          apiEnabled={apiEnabled}
          apiFetch={apiFetch}
          toast={toast}
        />,
        'slim',
      )
    },
    [apiEnabled, apiFetch, closeModal, loadUsers, openModal, toast],
  )

  const usuariosRows = users
    .map((u) => {
      const rol = u?.rol || '—'
      return (
        <tr key={u?.id}>
          <td>{u?.id}</td>
          <td>
            <strong>{u?.nombre || '—'}</strong>
          </td>
          <td>{u?.correo || '—'}</td>
          <td>
            <span className={`pill ${rolePillClass(rol)}`}>{rol}</span>
          </td>
          <td>
            <span className={`pill ${u?.activo === false ? 'p-amb' : 'p-grn'}`}>
              {u?.activo === false ? 'Inactivo' : 'Activo'}
            </span>
          </td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <button className="btn b-out b-xs" onClick={() => openUserEditor({ mode: 'edit', user: u })}>
              Editar
            </button>{' '}
          </td>
        </tr>
      )
    })
    .filter(Boolean)

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-admin">
      <div className="ph">
        <div>
          <h2>Panel Admin</h2>
          <p>Gestión de usuarios y roles</p>
        </div>
        <div className="ph-a">
          <button className="btn b-out" onClick={() => navigate('dashboard')}>
            Volver
          </button>
        </div>
      </div>
      <div className="admin-layout">
        <div className="admin-menu card">
          <div className={`admin-item ${tab === 'usuarios' ? 'on' : ''}`} onClick={() => setTab('usuarios')}>
            Usuarios
          </div>
          <div className={`admin-item ${tab === 'roles' ? 'on' : ''}`} onClick={() => setTab('roles')}>
            Roles y Accesos
          </div>
        </div>
        <div className="admin-content card">
          {tab === 'usuarios' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--ff-d)', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                    Usuarios
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    Crear, editar, desactivar y asignar roles
                  </div>
                </div>
                <button className="btn b-teal" onClick={() => openUserEditor({ mode: 'create', user: null })}>
                  + Nuevo usuario
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosRows.length ? (
                      usuariosRows
                    ) : usersLoading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                          Cargando…
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                          Sin usuarios
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {tab === 'roles' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--ff-d)', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                    Roles y Accesos
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Matriz de permisos por rol</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Acción / Módulo</th>
                      <th>Admin</th>
                      <th>Usuario</th>
                      <th>Visualizador</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Operaciones</strong> (crear/editar)
                      </td>
                      <td>✔</td>
                      <td>✔</td>
                      <td>—</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>EVADIR</strong> (generar/exportar)
                      </td>
                      <td>✔</td>
                      <td>✔</td>
                      <td>Ver</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Maestros</strong> (especies/sectores)
                      </td>
                      <td>✔</td>
                      <td>✔</td>
                      <td>Ver</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Usuarios</strong> (gestión)
                      </td>
                      <td>✔</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizeRole(rol) {
  const r = normKey(rol)
  if (r === 'admin') return 'Admin'
  if (r === 'usuario' || r === 'biologo' || r === 'biologa') return 'Usuario'
  if (r === 'visualizador' || r === 'viewer' || r === 'readonly' || r === 'read-only') return 'Visualizador'
  return String(rol || '').trim() || 'Usuario'
}

function isValidEmail(email) {
  const e = String(email || '').trim()
  if (!e) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function UserEditor({ mode, initial, onCancel, onSaved, apiEnabled, apiFetch, toast }) {
  const isEdit = mode === 'edit'
  const [nombre, setNombre] = useState(String(initial?.nombre || ''))
  const [correo, setCorreo] = useState(String(initial?.correo || ''))
  const [rol, setRol] = useState(normalizeRole(initial?.rol || 'Usuario'))
  const [activo, setActivo] = useState(initial?.activo === false ? false : true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = useCallback(async () => {
    const n = String(nombre || '').trim()
    const c = String(correo || '').trim().toLowerCase()
    const r = normalizeRole(rol)
    if (!n) return toast('Nombre requerido', 'red')
    if (!isValidEmail(c)) return toast('Correo inválido', 'red')
    if (!r) return toast('Rol requerido', 'red')
    if (!apiEnabled) return toast('API no configurada (VITE_API_URL)', 'red')

    const payload = { nombre: n, correo: c, rol: r, activo: !!activo }
    if (!isEdit || String(password || '').trim()) {
      const p = String(password || '')
      const cp = String(confirm || '')
      if (p.length < 8) return toast('La contraseña debe tener al menos 8 caracteres', 'red')
      if (p !== cp) return toast('Las contraseñas no coinciden', 'red')
      payload.password = p
    }

    setSaving(true)
    try {
      if (isEdit) {
        await apiFetch(`/usuarios/${initial?.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast('Usuario actualizado', 'green')
      } else {
        await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(payload) })
        toast('Usuario creado', 'green')
      }
      await onSaved?.()
    } catch (err) {
      toast(String(err?.message || 'Error guardando usuario'), 'red')
    } finally {
      setSaving(false)
    }
  }, [activo, apiEnabled, apiFetch, confirm, correo, initial?.id, isEdit, nombre, onSaved, password, rol, toast])

  return (
    <div>
      <div className="ig">
        <label className="il">Nombre</label>
        <input className="ii" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
      </div>

      <div className="ig">
        <label className="il">Correo</label>
        <input className="ii" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@dominio.cl" />
      </div>

      <div className="ig">
        <label className="il">Rol</label>
        <select className="is" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="Admin">Admin</option>
          <option value="Usuario">Usuario</option>
          <option value="Visualizador">Visualizador</option>
        </select>
      </div>

      <div className="cfg-row" style={{ marginBottom: 10 }}>
        <div>
          <div className="cfg-title">Estado</div>
          <div className="cfg-sub">{activo ? 'Activo' : 'Inactivo'}</div>
        </div>
        <label className="sw">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span className="sw-track"></span>
          <span className="sw-thumb"></span>
        </label>
      </div>

      <div className="ig">
        <label className="il">{isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
        <input className="ii" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div className="ig">
        <label className="il">Confirmar contraseña</label>
        <input className="ii" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button className="btn b-out" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button className="btn b-teal" onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
