import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useDb } from './dbContext.jsx'
import { useUi } from './uiContext.jsx'

const AppContext = createContext(null)

const ACTIVE_PROFILE_KEY = 'bitecma_active_profile'
const PROFILE_DATA_KEY = 'bitecma_profile_data'
const TOKEN_KEY = 'bitecma_token'

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

function readActiveProfileId() {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    return null
  }
}

function writeActiveProfileId(id) {
  try {
    if (!id) localStorage.removeItem(ACTIVE_PROFILE_KEY)
    else localStorage.setItem(ACTIVE_PROFILE_KEY, String(id))
  } catch {
    return
  }
}

function readProfileMap() {
  try {
    const raw = localStorage.getItem(PROFILE_DATA_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return map && typeof map === 'object' ? map : {}
  } catch {
    return {}
  }
}

function writeProfileMap(map) {
  try {
    localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(map || {}))
  } catch {
    return
  }
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY)
    else localStorage.setItem(TOKEN_KEY, String(token))
  } catch {
    return
  }
}

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
    fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(async (r) => {
        const json = await r.json().catch(() => null)
        return { status: r.status, json }
      })
      .then(({ status, json }) => {
        if (cancelled) return

        const err = String(json?.error || '').trim()
        const mustLogout = status === 401 || status === 403 || err === 'Token inválido' || err === 'No autorizado'

        if (mustLogout) {
          setApiUser(null)
          setApiToken(null)
          writeToken(null)
          return
        }

        if (json?.ok) setApiUser(json?.user || null)
      })
      .catch(() => {
        if (cancelled) return
        return
      })
    return () => {
      cancelled = true
    }
  }, [apiEnabled, apiToken, apiUrl])

  const updateProfile = useCallback(
    ({ nombre, correo, numero, logo }) => {
      if (!user) return false
      if (apiEnabled) {
        const next = {
          ...user,
          nombre: String(nombre ?? user.nombre ?? '').trim(),
          correo: String(correo ?? user.correo ?? '').trim(),
          numero: String(numero ?? user.numero ?? '').trim(),
          logo: String(logo ?? user.logo ?? ''),
        }
        setApiUser(next)
        toast('Perfil actualizado', 'green')
        return true
      }
      const next = {
        ...user,
        nombre: String(nombre ?? user.nombre ?? '').trim(),
        correo: String(correo ?? user.correo ?? '').trim(),
        numero: String(numero ?? user.numero ?? '').trim(),
        logo: String(logo ?? user.logo ?? ''),
      }
      const map = { ...profileMap, [String(user.id)]: next }
      setProfileMap(map)
      writeProfileMap(map)
      toast('Perfil actualizado', 'green')
      return true
    },
    [apiEnabled, user, profileMap, toast],
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
      changePassword,
    }),
    [page, navigate, isAuthed, user, role, isAdmin, isViewer, canWrite, login, logout, updateProfile, changePassword],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
