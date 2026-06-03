import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usarBaseDatos } from './dbContext.jsx'
import { usarInterfaz } from './uiContext.jsx'

const ContextoAplicacion = createContext(null)

const clavePerfilActivo = 'bitecma_active_profile'
const claveDatosPerfil = 'bitecma_profile_data'
const claveToken = 'bitecma_token'

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
function normalizarClave(s) {
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
function normalizarRol(rol) {
  const r = normalizarClave(rol)
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
function leerIdPerfilActivo() {
  try {
    return localStorage.getItem(clavePerfilActivo)
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
function guardarIdPerfilActivo(id) {
  try {
    if (!id) localStorage.removeItem(clavePerfilActivo)
    else localStorage.setItem(clavePerfilActivo, String(id))
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
function leerMapaPerfiles() {
  try {
    const bruto = localStorage.getItem(claveDatosPerfil)
    const mapa = bruto ? JSON.parse(bruto) : {}
    return mapa && typeof mapa === 'object' ? mapa : {}
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
function guardarMapaPerfiles(mapa) {
  try {
    localStorage.setItem(claveDatosPerfil, JSON.stringify(mapa || {}))
  } catch {
    return
  }
}

/**
 * Lee el token API desde localStorage (modo online/API).
 *
 * @returns {string|null} Token o `null`.
 */
function leerToken() {
  try {
    return localStorage.getItem(claveToken)
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
function guardarToken(token) {
  try {
    if (!token) localStorage.removeItem(claveToken)
    else localStorage.setItem(claveToken, String(token))
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
export function ProveedorAplicacion({ children }) {
  const { baseDatos } = usarBaseDatos()
  const { mostrarToast } = usarInterfaz()
  const urlApi = String(import.meta.env?.VITE_API_URL || '')
    .trim()
    .replace(/\/+$/, '')
  const apiHabilitada = !!urlApi

  const [pagina, establecerPagina] = useState('dashboard')
  const [idPerfilActivo, establecerIdPerfilActivo] = useState(() => leerIdPerfilActivo())
  const [mapaPerfiles, establecerMapaPerfiles] = useState(() => leerMapaPerfiles())
  const [tokenApi, establecerTokenApi] = useState(() => leerToken())
  const [usuarioApi, establecerUsuarioApi] = useState(null)

  const solicitarApi = useCallback(
    async (ruta, opciones) => {
      const url = `${urlApi}/${String(ruta || '').replace(/^\/+/, '')}`
      const token = tokenApi || leerToken()
      const encabezados = { ...(opciones?.headers || {}) }
      if (!encabezados.Authorization && token) encabezados.Authorization = `Bearer ${token}`
      if (!encabezados['Content-Type'] && opciones?.body && !(opciones?.body instanceof FormData)) encabezados['Content-Type'] = 'application/json'
      const respuesta = await fetch(url, { ...(opciones || {}), headers: encabezados })
      const json = await respuesta.json().catch(() => null)
      if (!respuesta.ok || !json?.ok) {
        const mensaje = String(json?.error || respuesta.statusText || 'Error')
        throw new Error(mensaje)
      }
      return json
    },
    [urlApi, tokenApi],
  )

  const usuario = useMemo(() => {
    if (apiHabilitada) return usuarioApi
    const perfiles = baseDatos.perfiles || []
    const perfilBase = perfiles.find((p) => String(p.id) === String(idPerfilActivo)) || null
    if (!perfilBase) return null
    const perfilGuardado = mapaPerfiles?.[String(perfilBase.id)]
    return perfilGuardado && typeof perfilGuardado === 'object' ? { ...perfilBase, ...perfilGuardado } : perfilBase
  }, [apiHabilitada, usuarioApi, baseDatos.perfiles, idPerfilActivo, mapaPerfiles])

  const rol = useMemo(() => normalizarRol(usuario?.rol), [usuario?.rol])
  const esAdmin = rol === 'Admin'
  const esVisualizador = rol === 'Visualizador'
  const puedeEscribir = !esVisualizador

  const estaAutenticado = !!usuario

  const navegar = useCallback((siguientePagina) => {
    const paginaNormalizada = String(siguientePagina)
    establecerPagina(paginaNormalizada)
  }, [])

  const iniciarSesion = useCallback(
    async (correo, contrasena) => {
      const correoNormalizado = String(correo || '').trim().toLowerCase()
      const contrasenaNormalizada = String(contrasena || '').trim()
      if (!correoNormalizado || !contrasenaNormalizada) {
        mostrarToast('Completa correo y contraseña', 'red')
        return false
      }

      if (apiHabilitada) {
        try {
          const respuesta = await fetch(`${urlApi}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoNormalizado, password: contrasenaNormalizada }),
          })
          const json = await respuesta.json().catch(() => null)
          if (!respuesta.ok || !json?.ok) {
            mostrarToast(String(json?.error || 'Credenciales inválidas'), 'red')
            return false
          }
          const tokenRecibido = String(json?.token || '')
          if (!tokenRecibido) {
            mostrarToast('No se recibió token', 'red')
            return false
          }
          establecerTokenApi(tokenRecibido)
          guardarToken(tokenRecibido)
          establecerUsuarioApi(json?.user || null)
          mostrarToast('Bienvenido', 'green')
          navegar('dashboard')
          return true
        } catch (err) {
          mostrarToast(String(err?.message || 'Error de conexión'), 'red')
          return false
        }
      }

      const perfiles = baseDatos.perfiles || []
      const perfilEncontrado = perfiles.find((x) => String(x.correo || '').toLowerCase() === correoNormalizado)
      if (!perfilEncontrado) {
        mostrarToast('Usuario no encontrado', 'red')
        return false
      }
      if (contrasenaNormalizada !== '12345678') {
        mostrarToast('Contraseña incorrecta', 'red')
        return false
      }
      establecerIdPerfilActivo(String(perfilEncontrado.id))
      guardarIdPerfilActivo(perfilEncontrado.id)
      mostrarToast('Bienvenido', 'green')
      navegar('dashboard')
      return true
    },
    [apiHabilitada, urlApi, baseDatos.perfiles, mostrarToast, navegar],
  )

  const cerrarSesion = useCallback(() => {
    if (apiHabilitada) {
      establecerUsuarioApi(null)
      establecerTokenApi(null)
      guardarToken(null)
      mostrarToast('Sesión cerrada', 'green')
      establecerPagina('dashboard')
      return
    }
    establecerIdPerfilActivo(null)
    guardarIdPerfilActivo(null)
    mostrarToast('Sesión cerrada', 'green')
    establecerPagina('dashboard')
  }, [apiHabilitada, mostrarToast])

  useEffect(() => {
    if (!apiHabilitada) return
    const token = tokenApi || leerToken()
    if (!token) return

    let cancelado = false
    solicitarApi('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((json) => {
        if (cancelado) return
        establecerUsuarioApi(json?.user || null)
      })
      .catch((err) => {
        if (cancelado) return
        const mensaje = String(err?.message || '')
        const debeCerrarSesion = mensaje === 'Token inválido' || mensaje === 'No autorizado'
        if (debeCerrarSesion) {
          establecerUsuarioApi(null)
          establecerTokenApi(null)
          guardarToken(null)
        }
      })

    return () => {
      cancelado = true
    }
  }, [apiHabilitada, tokenApi, solicitarApi])

  const actualizarPerfil = useCallback(
    async ({ nombre, correo, numero, avatar_url: urlAvatar, logo }) => {
      if (!usuario) return false
      if (apiHabilitada) {
        try {
          const nombreActualizado = String(nombre ?? usuario.nombre ?? '').trim()
          const correoActualizado = String(correo ?? usuario.correo ?? '').trim()
          const numeroActualizado = String(numero ?? usuario.numero ?? '').trim()
          const json = await solicitarApi('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ nombre: nombreActualizado, correo: correoActualizado, numero: numeroActualizado }),
          })
          establecerUsuarioApi(json?.user || null)
          mostrarToast('Perfil actualizado', 'green')
          return true
        } catch (err) {
          mostrarToast(String(err?.message || 'No se pudo actualizar perfil'), 'red')
          return false
        }
      }
      const perfilActualizado = {
        ...usuario,
        nombre: String(nombre ?? usuario.nombre ?? '').trim(),
        correo: String(correo ?? usuario.correo ?? '').trim(),
        numero: String(numero ?? usuario.numero ?? '').trim(),
        logo: String(logo ?? usuario.logo ?? ''),
        avatar_url: String(urlAvatar ?? usuario.avatar_url ?? ''),
      }
      const mapaActualizado = { ...mapaPerfiles, [String(usuario.id)]: perfilActualizado }
      establecerMapaPerfiles(mapaActualizado)
      guardarMapaPerfiles(mapaActualizado)
      mostrarToast('Perfil actualizado', 'green')
      return true
    },
    [apiHabilitada, usuario, mapaPerfiles, mostrarToast, solicitarApi],
  )

  const cambiarContrasena = useCallback(
    ({ oldPass: contrasenaActual, newPass: nuevaContrasena, confirmPass: confirmarContrasena }) => {
      if (!usuario) return false
      if (apiHabilitada) {
        const nuevaContrasenaNormalizada = String(nuevaContrasena || '')
        const confirmarContrasenaNormalizada = String(confirmarContrasena || '')
        if (nuevaContrasenaNormalizada.length < 8) {
          mostrarToast('La nueva contraseña debe tener al menos 8 caracteres', 'red')
          return false
        }
        if (nuevaContrasenaNormalizada !== confirmarContrasenaNormalizada) {
          mostrarToast('Las contraseñas no coinciden', 'red')
          return false
        }
        mostrarToast('Contraseña actualizada', 'green')
        return true
      }
      if (String(contrasenaActual || '') !== String(usuario.contraseña || '')) {
        mostrarToast('Contraseña actual incorrecta', 'red')
        return false
      }
      const nuevaContrasenaNormalizada = String(nuevaContrasena || '')
      const confirmarContrasenaNormalizada = String(confirmarContrasena || '')
      if (nuevaContrasenaNormalizada.length < 8) {
        mostrarToast('La nueva contraseña debe tener al menos 8 caracteres', 'red')
        return false
      }
      if (nuevaContrasenaNormalizada !== confirmarContrasenaNormalizada) {
        mostrarToast('Las contraseñas no coinciden', 'red')
        return false
      }
      const mapaActualizado = {
        ...mapaPerfiles,
        [String(usuario.id)]: { ...(mapaPerfiles[String(usuario.id)] || usuario), contraseña: nuevaContrasenaNormalizada },
      }
      establecerMapaPerfiles(mapaActualizado)
      guardarMapaPerfiles(mapaActualizado)
      mostrarToast('Contraseña actualizada', 'green')
      return true
    },
    [apiHabilitada, usuario, mapaPerfiles, mostrarToast],
  )

  const subirAvatar = useCallback(
    async (archivo) => {
      if (!apiHabilitada) return null
      if (!usuario) return null
      const archivoAvatar = archivo instanceof File ? archivo : null
      if (!archivoAvatar) return null

      try {
        const formulario = new FormData()
        formulario.append('avatar', archivoAvatar)
        const json = await solicitarApi('/auth/avatar', { method: 'POST', body: formulario })
        const usuarioActualizado = { ...(usuario || {}), avatar_url: String(json?.avatar_url || '') || null }
        establecerUsuarioApi(usuarioActualizado)
        mostrarToast('Foto actualizada', 'green')
        return usuarioActualizado.avatar_url
      } catch (err) {
        mostrarToast(String(err?.message || 'No se pudo actualizar foto'), 'red')
        return null
      }
    },
    [apiHabilitada, usuario, solicitarApi, mostrarToast],
  )

  const valorContexto = useMemo(
    () => ({
      pagina,
      navegar,
      estaAutenticado,
      usuario,
      rol,
      esAdmin,
      esVisualizador,
      puedeEscribir,
      iniciarSesion,
      cerrarSesion,
      actualizarPerfil,
      subirAvatar,
      cambiarContrasena,
    }),
    [
      pagina,
      navegar,
      estaAutenticado,
      usuario,
      rol,
      esAdmin,
      esVisualizador,
      puedeEscribir,
      iniciarSesion,
      cerrarSesion,
      actualizarPerfil,
      subirAvatar,
      cambiarContrasena,
    ],
  )

  return <ContextoAplicacion.Provider value={valorContexto}>{children}</ContextoAplicacion.Provider>
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
export function usarAplicacion() {
  const contexto = useContext(ContextoAplicacion)
  if (!contexto) throw new Error('AppProvider missing')
  return contexto
}
