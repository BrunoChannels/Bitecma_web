import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useDb } from './dbContext.jsx'
import { useUi } from './uiContext.jsx'

const AppContext = createContext(null)

const ACTIVE_PROFILE_KEY = 'bitecma_active_profile'
const PROFILE_DATA_KEY = 'bitecma_profile_data'
const TOKEN_KEY = 'bitecma_token'

/**
 * Normaliza texto para comparaciones (minúsculas, sin diacríticos).
 *
 * @param {unknown} s - Texto a normalizar.
 * @returns {string} Texto normalizado.
 *
 * Dependencias externas:
 * - `String.prototype.normalize` (API estándar).
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Normaliza el rol del usuario a un set acotado usado por la app.
 *
 * @param {unknown} rol - Rol leído del perfil (API o local).
 * @returns {'Admin'|'Usuario'|'Visualizador'} Rol normalizado.
 *
 * Lógica:
 * - Mapea variantes comunes (biologo/biologa/viewer/readonly) a las etiquetas internas.
 *
 * Dependencias externas:
 * - `normKey` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 */
function normalizeRole(rol) {
  const r = normKey(rol)
  if (r === 'admin') return 'Admin'
  if (r === 'usuario' || r === 'biologo' || r === 'biologa') return 'Usuario'
  if (r === 'visualizador' || r === 'viewer' || r === 'readonly' || r === 'read-only') return 'Visualizador'
  return String(rol || '').trim() || 'Usuario'
}

/**
 * Lee el id del perfil activo desde localStorage (modo offline).
 *
 * @returns {string|null} Id persistido o `null`.
 *
 * Dependencias externas:
 * - `localStorage`.
 *
 * Manejo de errores:
 * - Si falla el acceso a storage, retorna `null`.
 */
function readActiveProfileId() {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    return null
  }
}

/**
 * Persiste el id del perfil activo en localStorage (modo offline).
 *
 * @param {unknown} id - Id del perfil; si es falsy se elimina.
 * @returns {void}
 *
 * Efectos secundarios:
 * - Escribe/elimina en storage.
 */
function writeActiveProfileId(id) {
  try {
    if (!id) localStorage.removeItem(ACTIVE_PROFILE_KEY)
    else localStorage.setItem(ACTIVE_PROFILE_KEY, String(id))
  } catch {
    return
  }
}

/**
 * Lee el mapa de datos de perfil extendidos desde localStorage (modo offline).
 *
 * @returns {Record<string, any>} Mapa por id de perfil.
 *
 * Lógica:
 * - Parsea JSON y valida que sea objeto.
 *
 * Manejo de errores:
 * - Si falla parseo o acceso, retorna `{}`.
 */
function readProfileMap() {
  try {
    const raw = localStorage.getItem(PROFILE_DATA_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return map && typeof map === 'object' ? map : {}
  } catch {
    return {}
  }
}

/**
 * Persiste el mapa de perfiles en localStorage (modo offline).
 *
 * @param {Record<string, any>} map - Mapa a guardar.
 * @returns {void}
 *
 * Efectos secundarios:
 * - Escribe en storage.
 */
function writeProfileMap(map) {
  try {
    localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(map || {}))
  } catch {
    return
  }
}

/**
 * Lee el token API desde localStorage (modo online/API).
 *
 * @returns {string|null} Token o `null`.
 */
function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Persiste el token API en localStorage (modo online/API).
 *
 * @param {unknown} token - Token; si es falsy se elimina.
 * @returns {void}
 */
function writeToken(token) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY)
    else localStorage.setItem(TOKEN_KEY, String(token))
  } catch {
    return
  }
}

/**
 * Provider del contexto de App (navegación, sesión, permisos y perfil).
 *
 * Soporta dos modos:
 * - Modo offline: usa perfiles locales `db.perfiles` y una contraseña fija/guardada.
 * - Modo API: usa `VITE_API_URL`, token bearer y endpoints `/auth/*`.
 *
 * @param {{ children: import('react').ReactNode }} props - Props del provider.
 * @returns {import('react').JSX.Element} Provider que envuelve la app.
 *
 * Lógica (alto nivel):
 * 1) Resuelve configuración API (`apiUrl`/`apiEnabled`).
 * 2) Mantiene estado de navegación (`page`) y sesión (usuario/token).
 * 3) Expone helpers: `navigate`, `login`, `logout`, `updateProfile`, `changePassword`, `uploadAvatar`.
 * 4) Deriva `role`, `isAdmin`, `isViewer`, `canWrite`.
 * 5) En modo API, intenta hidratar `/auth/me` si hay token persistido.
 *
 * Dependencias externas:
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx)
 * - [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx)
 * - `fetch`, `FormData`, `localStorage` (browser).
 *
 * Efectos secundarios:
 * - Lee/escribe en storage (perfil activo, mapa de perfiles, token).
 * - Puede ejecutar requests a API.
 *
 * Notas de mantenimiento:
 * - Si se agregan nuevas páginas, mantener el contrato de `navigate(pageKey)` alineado con `App.jsx`.
 * - En modo offline, la contraseña default '12345678' es solo para demo/local.
 */
export function AppProvider({ children }) {
  const { db } = useDb()
  const { toast } = useUi()
  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl

  const [page, setPage] = useState('dashboard')
  const [userId, setUserId] = useState(() => readActiveProfileId())
  const [profileMap, setProfileMap] = useState(() => readProfileMap())
  const [apiToken, setApiToken] = useState(() => readToken())
  const [apiUser, setApiUser] = useState(null)

  const apiFetch = useCallback(
    async (path, opts) => {
      const url = `${apiUrl}/${String(path || '').replace(/^\/+/, '')}`
      const token = apiToken || readToken()
      const headers = { ...(opts?.headers || {}) }
      if (!headers.Authorization && token) headers.Authorization = `Bearer ${token}`
      if (!headers['Content-Type'] && opts?.body && !(opts?.body instanceof FormData)) headers['Content-Type'] = 'application/json'
      const res = await fetch(url, { ...(opts || {}), headers })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        const msg = String(json?.error || res.statusText || 'Error')
        throw new Error(msg)
      }
      return json
    },
    [apiUrl, apiToken],
  )

  const user = useMemo(() => {
    if (apiEnabled) return apiUser
    const perfiles = db.perfiles || []
    const base = perfiles.find((p) => String(p.id) === String(userId)) || null
    if (!base) return null
    const saved = profileMap?.[String(base.id)]
    return saved && typeof saved === 'object' ? { ...base, ...saved } : base
  }, [apiEnabled, apiUser, db.perfiles, userId, profileMap])

  const role = useMemo(() => normalizeRole(user?.rol), [user?.rol])
  const isAdmin = role === 'Admin'
  const isViewer = role === 'Visualizador'
  const canWrite = !isViewer

  const isAuthed = !!user

  const navigate = useCallback((next) => {
    const p = String(next)
    setPage(p)
  }, [])

  const login = useCallback(
    async (email, pass) => {
      const e = String(email || '').trim().toLowerCase()
      const p = String(pass || '').trim()
      if (!e || !p) {
        toast('Completa correo y contraseña', 'red')
        return false
      }

      if (apiEnabled) {
        try {
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: e, password: p }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.ok) {
            toast(String(json?.error || 'Credenciales inválidas'), 'red')
            return false
          }
          const t = String(json?.token || '')
          if (!t) {
            toast('No se recibió token', 'red')
            return false
          }
          setApiToken(t)
          writeToken(t)
          setApiUser(json?.user || null)
          toast('Bienvenido', 'green')
          navigate('dashboard')
          return true
        } catch (err) {
          toast(String(err?.message || 'Error de conexión'), 'red')
          return false
        }
      }

      const perfiles = db.perfiles || []
      const found = perfiles.find((x) => String(x.correo || '').toLowerCase() === e)
      if (!found) {
        toast('Usuario no encontrado', 'red')
        return false
      }
      if (p !== '12345678') {
        toast('Contraseña incorrecta', 'red')
        return false
      }
      setUserId(String(found.id))
      writeActiveProfileId(found.id)
      toast('Bienvenido', 'green')
      navigate('dashboard')
      return true
    },
    [apiEnabled, apiUrl, db.perfiles, toast, navigate],
  )

  const logout = useCallback(() => {
    if (apiEnabled) {
      setApiUser(null)
      setApiToken(null)
      writeToken(null)
      toast('Sesión cerrada', 'green')
      setPage('dashboard')
      return
    }
    setUserId(null)
    writeActiveProfileId(null)
    toast('Sesión cerrada', 'green')
    setPage('dashboard')
  }, [apiEnabled, toast])

  useEffect(() => {
    if (!apiEnabled) return
    const t = apiToken || readToken()
    if (!t) return

    let cancelled = false
    apiFetch('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((json) => {
        if (cancelled) return
        setApiUser(json?.user || null)
      })
      .catch((err) => {
        if (cancelled) return
        const msg = String(err?.message || '')
        const mustLogout = msg === 'Token inválido' || msg === 'No autorizado'
        if (mustLogout) {
          setApiUser(null)
          setApiToken(null)
          writeToken(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [apiEnabled, apiToken, apiFetch])

  const updateProfile = useCallback(
    async ({ nombre, correo, numero, avatar_url, logo }) => {
      if (!user) return false
      if (apiEnabled) {
        try {
          const n = String(nombre ?? user.nombre ?? '').trim()
          const c = String(correo ?? user.correo ?? '').trim()
          const num = String(numero ?? user.numero ?? '').trim()
          const json = await apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ nombre: n, correo: c, numero: num }),
          })
          setApiUser(json?.user || null)
          toast('Perfil actualizado', 'green')
          return true
        } catch (err) {
          toast(String(err?.message || 'No se pudo actualizar perfil'), 'red')
          return false
        }
      }
      const next = {
        ...user,
        nombre: String(nombre ?? user.nombre ?? '').trim(),
        correo: String(correo ?? user.correo ?? '').trim(),
        numero: String(numero ?? user.numero ?? '').trim(),
        logo: String(logo ?? user.logo ?? ''),
        avatar_url: String(avatar_url ?? user.avatar_url ?? ''),
      }
      const map = { ...profileMap, [String(user.id)]: next }
      setProfileMap(map)
      writeProfileMap(map)
      toast('Perfil actualizado', 'green')
      return true
    },
    [apiEnabled, user, profileMap, toast, apiFetch],
  )

  const changePassword = useCallback(
    ({ oldPass, newPass, confirmPass }) => {
      if (!user) return false
      if (apiEnabled) {
        const np = String(newPass || '')
        const cp = String(confirmPass || '')
        if (np.length < 8) {
          toast('La nueva contraseña debe tener al menos 8 caracteres', 'red')
          return false
        }
        if (np !== cp) {
          toast('Las contraseñas no coinciden', 'red')
          return false
        }
        toast('Contraseña actualizada', 'green')
        return true
      }
      if (String(oldPass || '') !== String(user.contraseña || '')) {
        toast('Contraseña actual incorrecta', 'red')
        return false
      }
      const np = String(newPass || '')
      const cp = String(confirmPass || '')
      if (np.length < 8) {
        toast('La nueva contraseña debe tener al menos 8 caracteres', 'red')
        return false
      }
      if (np !== cp) {
        toast('Las contraseñas no coinciden', 'red')
        return false
      }
      const map = {
        ...profileMap,
        [String(user.id)]: { ...(profileMap[String(user.id)] || user), contraseña: np },
      }
      setProfileMap(map)
      writeProfileMap(map)
      toast('Contraseña actualizada', 'green')
      return true
    },
    [apiEnabled, user, profileMap, toast],
  )

  const uploadAvatar = useCallback(
    async (file) => {
      if (!apiEnabled) return null
      if (!user) return null
      const f = file instanceof File ? file : null
      if (!f) return null

      try {
        const form = new FormData()
        form.append('avatar', f)
        const json = await apiFetch('/auth/avatar', { method: 'POST', body: form })
        const next = { ...(user || {}), avatar_url: String(json?.avatar_url || '') || null }
        setApiUser(next)
        toast('Foto actualizada', 'green')
        return next.avatar_url
      } catch (err) {
        toast(String(err?.message || 'No se pudo actualizar foto'), 'red')
        return null
      }
    },
    [apiEnabled, user, apiFetch, toast],
  )

  const value = useMemo(
    () => ({
      page,
      navigate,
      isAuthed,
      user,
      role,
      isAdmin,
      isViewer,
      canWrite,
      login,
      logout,
      updateProfile,
      uploadAvatar,
      changePassword,
    }),
    [
      page,
      navigate,
      isAuthed,
      user,
      role,
      isAdmin,
      isViewer,
      canWrite,
      login,
      logout,
      updateProfile,
      uploadAvatar,
      changePassword,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Hook para consumir el contexto de App.
 *
 * @returns {{
 *  page: string,
 *  navigate: (next: string) => void,
 *  isAuthed: boolean,
 *  user: any,
 *  role: string,
 *  isAdmin: boolean,
 *  isViewer: boolean,
 *  canWrite: boolean,
 *  login: (email: string, pass: string) => Promise<boolean> | boolean,
 *  logout: () => void,
 *  updateProfile: (payload: any) => Promise<boolean> | boolean,
 *  uploadAvatar: (file: File) => Promise<string|null>,
 *  changePassword: (payload: any) => boolean,
 * }} API principal de la app.
 *
 * Manejo de errores:
 * - Lanza si se usa fuera de `AppProvider`.
 */
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
