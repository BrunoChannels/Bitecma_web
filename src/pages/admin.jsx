import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { useApp } from '../context/appContext.jsx'

/**
 * Página Admin: gestión de usuarios y visualización de matriz de permisos por rol.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (se usa para ejecutar efectos de seguridad/carga).
 * @returns {import('react').JSX.Element} Elemento React de la página Admin.
 *
 * Lógica (alto nivel):
 * 1) Valida acceso: si la página está activa y el usuario no es Admin, notifica y redirige a dashboard.
 * 2) Determina si hay API configurada (`VITE_API_URL`):
 *    - Si hay API: gestiona usuarios desde backend (`/usuarios`).
 *    - Si no hay API: usa perfiles locales (`db.perfiles`) como fallback “solo lectura”.
 * 3) Permite:
 *    - Ver listado de usuarios.
 *    - Crear/editar usuarios mediante un modal (solo si API está habilitada).
 *    - Ver matriz de permisos por rol (tabla estática informativa).
 *
 * Dependencias externas:
 * - Contextos: `useDb` (db), `useUi` (toast/modal), `useApp` (navigate/isAdmin).
 * - APIs Web: `fetch` y `localStorage` (token).
 * - Variables de entorno: `import.meta.env.VITE_API_URL`.
 *
 * Efectos secundarios:
 * - Puede navegar a otra página (redirect de seguridad).
 * - Puede disparar requests HTTP a la API.
 * - Puede abrir/cerrar modales.
 *
 * Manejo de errores:
 * - Captura errores de red/API y muestra toast rojo con mensaje.
 * - Maneja ausencia de token o bloqueo de `localStorage` con try/catch.
 *
 * @example
 * <AdminPage active={page === 'admin'} />
 *
 * Notas de mantenimiento:
 * - Mantener sincronía de rutas API (`/usuarios`) con backend.
 * - Evitar exponer tokens en logs/errores; actualmente solo se usa en header Authorization.
 */
export default function AdminPage({ active }) {
  const { db } = useDb()
  const { toast, openModal, closeModal } = useUi()
  const { navigate, isAdmin } = useApp()
  const [tab, setTab] = useState('usuarios')
  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl
  const [backupLoading, setBackupLoading] = useState(false)

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

  /**
   * Wrapper de fetch hacia la API configurada, agregando headers y validación de respuesta.
   *
   * @param {string} path - Ruta relativa a la API (ej.: `/usuarios`).
   * @param {RequestInit} [opts] - Opciones de `fetch` (método, body, headers, etc.).
   * @returns {Promise<any>} JSON validado (se espera `{ ok: true, data: ... }`).
   *
   * Lógica:
   * 1) Construye URL base usando `VITE_API_URL` y el `path`.
   * 2) Recupera token desde `localStorage` (si existe) y lo inyecta como Bearer.
   * 3) Setea `Content-Type: application/json` si hay body y no viene definido.
   * 4) Ejecuta `fetch` y parsea JSON (tolerante a fallas de parseo).
   * 5) Si la respuesta no es ok, lanza Error con mensaje legible.
   *
   * Dependencias externas:
   * - `fetch` y `localStorage`.
   * - `apiUrl` derivado de env.
   *
   * Efectos secundarios:
   * - Acceso a `localStorage` y request de red.
   *
   * Manejo de errores:
   * - Lanza `Error` con mensaje consumible por caller.
   *
   * @example
   * const { data } = await apiFetch('/usuarios')
   *
   * Notas de mantenimiento:
   * - Mantener formato esperado de respuesta `{ ok, data, error }` alineado al backend.
   */
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

  /**
   * Carga el listado de usuarios desde la API (si está habilitada).
   *
   * @returns {Promise<void>} Promesa que resuelve al finalizar la carga.
   *
   * Lógica:
   * 1) Si no hay API, sale.
   * 2) Setea estado de carga.
   * 3) Llama `apiFetch('/usuarios')` y actualiza `apiUsers`.
   * 4) En error, muestra toast rojo.
   * 5) En finally, apaga loading.
   *
   * Dependencias externas:
   * - `apiFetch`, `toast`, `apiEnabled`.
   *
   * Efectos secundarios:
   * - Request de red y actualización de estado React.
   *
   * Manejo de errores:
   * - Captura y notifica errores.
   *
   * @example
   * await loadUsers()
   *
   * Notas de mantenimiento:
   * - Mantener shape `json.data` alineado al backend.
   */
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

  /**
   * Determina la clase CSS de la pill de rol para el listado de usuarios.
   *
   * @param {unknown} rol - Rol crudo (string u otro).
   * @returns {string} Clase CSS (ej.: `p-red`, `p-grn`, ...).
   *
   * Lógica:
   * 1) Normaliza a minúsculas.
   * 2) Mapea roles conocidos a colores.
   * 3) Retorna un fallback.
   *
   * Dependencias externas:
   * - Ninguna.
   *
   * Efectos secundarios:
   * - Ninguno.
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
   * <span className={`pill ${rolePillClass(u.rol)}`}>{u.rol}</span>
   *
   * Notas de mantenimiento:
   * - Si se agregan roles, extender el mapping.
   */
  const rolePillClass = (rol) => {
    const r = String(rol || '').toLowerCase()
    if (r === 'admin') return 'p-red'
    if (r === 'usuario') return 'p-grn'
    if (r === 'visualizador') return 'p-amb'
    if (r === 'biólogo' || r === 'biologo') return 'p-grn'
    return 'p-slt'
  }

  const users = apiEnabled ? apiUsers : perfiles

  /**
   * Abre el modal de creación/edición de usuario.
   *
   * @param {{ mode: 'create'|'edit', user: any }} args - Parámetros de apertura.
   * @param {'create'|'edit'} args.mode - Modo de formulario.
   * @param {any} args.user - Usuario inicial (solo en edición).
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Determina si es edición (`mode === 'edit'`) y arma `initial`.
   * 2) Abre modal con `UserEditor`.
   * 3) Al guardar, cierra modal y recarga usuarios desde API si corresponde.
   *
   * Dependencias externas:
   * - `openModal/closeModal` (UI), `loadUsers`, `apiFetch`, `toast`.
   *
   * Efectos secundarios:
   * - Abre modal y puede disparar recarga.
   *
   * Manejo de errores:
   * - La persistencia y errores se manejan dentro de `UserEditor`.
   *
   * @example
   * openUserEditor({ mode: 'create', user: null })
   *
   * Notas de mantenimiento:
   * - Mantener consistencia de tamaños del modal (`slim`) con estilos globales.
   */
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

  const downloadSqlBackup = useCallback(async ({ auto } = {}) => {
    if (!apiEnabled) {
      toast('API no configurada', 'red')
      return
    }
    if (backupLoading) return
    setBackupLoading(true)
    try {
      const token = (() => {
        try {
          return localStorage.getItem('bitecma_token')
        } catch {
          return null
        }
      })()
      if (!token) throw new Error('No autorizado')

      const url = `${apiUrl}/backup/sql`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        const msg = String(json?.error || res.statusText || 'Error')
        throw new Error(msg)
      }

      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const m = cd.match(/filename="([^"]+)"/i)
      const now = new Date()
      const pad2 = (n) => String(n).padStart(2, '0')
      const ts = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(
        now.getMinutes(),
      )}${pad2(now.getSeconds())}`
      const filename = m?.[1] || `backup_${ts}.sql`

      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)

      try {
        if (auto) localStorage.setItem('bitecma_last_backup_download_at', String(Date.now()))
      } catch {
        ;
      }
      toast('Respaldo descargado', 'green')
    } catch (err) {
      toast(String(err?.message || 'Error descargando respaldo'), 'red')
    } finally {
      setBackupLoading(false)
    }
  }, [apiEnabled, apiUrl, backupLoading, toast])

  useEffect(() => {
    if (!active) return
    if (!apiEnabled) return
    if (!isAdmin) return
    if (tab !== 'usuarios') return
    if (backupLoading) return

    const key = 'bitecma_last_backup_download_at'
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const last = (() => {
      try {
        const raw = localStorage.getItem(key)
        const n = raw ? Number(raw) : 0
        return Number.isFinite(n) ? n : 0
      } catch {
        return 0
      }
    })()
    if (last > 0 && now - last < weekMs) return

    downloadSqlBackup({ auto: true })
  }, [active, apiEnabled, backupLoading, downloadSqlBackup, isAdmin, tab])

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
          <div className={`admin-item ${tab === 'respaldo' ? 'on' : ''}`} onClick={() => setTab('respaldo')}>
            Respaldo de Datos
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

          {tab === 'respaldo' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--ff-d)', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                    Respaldo de Datos
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    Descarga un respaldo SQL de la base de datos desde la API
                  </div>
                  <div>
                    <button
                    className="btn b-out"
                    onClick={() => downloadSqlBackup()}
                    disabled={!apiEnabled || backupLoading}
                  >
                    {backupLoading ? 'Generando…' : 'Descargar respaldo SQL'}
                  </button>
                  </div>
                </div>
                  
              </div>
              {!apiEnabled ? (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>API no configurada</div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Normaliza un texto para comparaciones (minúsculas, sin diacríticos, trim).
 *
 * @param {unknown} s - Texto a normalizar.
 * @returns {string} Texto normalizado.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Lowercase + normalize NFD.
 * 3) Elimina diacríticos y recorta.
 *
 * Dependencias externas:
 * - API estándar de string (`normalize`).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normKey('Biólogo') // 'biologo'
 *
 * Notas de mantenimiento:
 * - Usar solo para matching; no para display.
 */
function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Normaliza un rol a uno de los valores canónicos usados por la UI/API.
 *
 * @param {unknown} rol - Rol crudo ingresado o proveniente de datos.
 * @returns {'Admin'|'Usuario'|'Visualizador'|string} Rol normalizado (title case) o fallback.
 *
 * Lógica:
 * 1) Normaliza con `normKey`.
 * 2) Mapea aliases conocidos (biologo/biologa -> Usuario, viewer/readonly -> Visualizador).
 * 3) Si no hay match, devuelve el string original (o 'Usuario' como fallback).
 *
 * Dependencias externas:
 * - `normKey`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normalizeRole('read-only') // 'Visualizador'
 *
 * Notas de mantenimiento:
 * - Mantener la lista de aliases alineada con backend y data histórica.
 */
function normalizeRole(rol) {
  const r = normKey(rol)
  if (r === 'admin') return 'Admin'
  if (r === 'usuario' || r === 'biologo' || r === 'biologa') return 'Usuario'
  if (r === 'visualizador' || r === 'viewer' || r === 'readonly' || r === 'read-only') return 'Visualizador'
  return String(rol || '').trim() || 'Usuario'
}

/**
 * Valida formato básico de correo electrónico.
 *
 * @param {unknown} email - Correo a validar.
 * @returns {boolean} `true` si parece email válido; `false` si no.
 *
 * Lógica:
 * 1) Convierte a string y recorta.
 * 2) Rechaza vacío.
 * 3) Aplica regex simple `usuario@dominio.tld`.
 *
 * Dependencias externas:
 * - RegExp.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * isValidEmail('ana@empresa.cl') // true
 *
 * Notas de mantenimiento:
 * - Regex deliberadamente simple; validación definitiva debe estar en backend.
 */
function isValidEmail(email) {
  const e = String(email || '').trim()
  if (!e) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

/**
 * Formulario de edición/creación de usuario (en modal).
 *
 * @param {object} props - Props del componente.
 * @param {'create'|'edit'} props.mode - Modo del formulario.
 * @param {any} props.initial - Usuario inicial (cuando mode es edit).
 * @param {() => void} props.onCancel - Callback para cancelar/cerrar.
 * @param {() => (void|Promise<void>)} props.onSaved - Callback al guardar correctamente.
 * @param {boolean} props.apiEnabled - Indica si la API está habilitada.
 * @param {(path: string, opts?: RequestInit) => Promise<any>} props.apiFetch - Función de fetch hacia API (con auth y validación).
 * @param {(msg: string, color?: string) => void} props.toast - Notificador UI.
 * @returns {import('react').JSX.Element} UI del editor de usuario.
 *
 * Lógica (alto nivel):
 * 1) Inicializa estado local desde `initial`.
 * 2) Permite editar nombre/correo/rol/estado y contraseña (obligatoria en create, opcional en edit).
 * 3) Valida inputs (nombre, email, rol, password) y construye payload.
 * 4) Ejecuta `apiFetch` con POST/PUT según modo.
 * 5) Notifica por toast, ejecuta `onSaved` y deshabilita botones durante guardado.
 *
 * Dependencias externas:
 * - `apiFetch` (requiere backend).
 * - `normalizeRole`, `isValidEmail`.
 *
 * Efectos secundarios:
 * - Requests de red y toasts.
 *
 * Manejo de errores:
 * - Captura error de API y muestra toast rojo.
 *
 * @example
 * <UserEditor mode="create" initial={{}} onCancel={closeModal} onSaved={...} apiEnabled apiFetch={apiFetch} toast={toast} />
 *
 * Notas de mantenimiento:
 * - Mantener el mínimo de contraseña (8) alineado con políticas del backend.
 */
function UserEditor({ mode, initial, onCancel, onSaved, apiEnabled, apiFetch, toast }) {
  const isEdit = mode === 'edit'
  const [nombre, setNombre] = useState(String(initial?.nombre || ''))
  const [correo, setCorreo] = useState(String(initial?.correo || ''))
  const [rol, setRol] = useState(normalizeRole(initial?.rol || 'Usuario'))
  const [activo, setActivo] = useState(initial?.activo === false ? false : true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  /**
   * Valida el formulario y persiste el usuario vía API.
   *
   * @returns {Promise<void>} Promesa que resuelve al finalizar el guardado.
   *
   * Lógica:
   * 1) Normaliza inputs (trim/lowercase) y valida requeridos.
   * 2) En create o si se ingresó contraseña en edit:
   *    - valida longitud mínima y confirmación.
   * 3) Construye payload `{ nombre, correo, rol, activo, password? }`.
   * 4) Ejecuta `apiFetch`:
   *    - PUT `/usuarios/:id` si es edit,
   *    - POST `/usuarios` si es create.
   * 5) En éxito, muestra toast verde y dispara `onSaved`.
   * 6) En error, muestra toast rojo.
   *
   * Dependencias externas:
   * - `apiFetch`, `toast`, `normalizeRole`, `isValidEmail`.
   *
   * Efectos secundarios:
   * - Request de red, toasts y cambios de estado `saving`.
   *
   * Manejo de errores:
   * - Captura errores de API y los presenta al usuario.
   *
   * @example
   * <button onClick={submit}>Guardar</button>
   *
   * Notas de mantenimiento:
   * - Mantener rutas/contratos de API consistentes con backend.
   */
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
