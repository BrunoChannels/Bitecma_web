import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ContextoInterfaz = createContext(null)

const claveTema = 'bitecma_theme_v1'
const claveHistorialToast = 'bitecma_toast_history_v1'
const maximoHistorialToast = 250

/**
 * Lee el tema persistido (light/dark) desde localStorage.
 *
 * @returns {'light'|'dark'} Tema.
 *
 * Lógica:
 * 1) Intenta leer `THEME_KEY`.
 * 2) Si el valor es 'dark', retorna 'dark'; en otro caso, 'light'.
 *
 * Dependencias externas:
 * - `localStorage` (browser).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - En navegadores/entornos sin acceso a storage, retorna 'light'.
 */
function leerTema() {
  try {
    const v = localStorage.getItem(claveTema)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Persiste el tema en localStorage.
 *
 * @param {'light'|'dark'|string} v - Tema a guardar.
 * @returns {void}
 *
 * Dependencias externas:
 * - `localStorage` (browser).
 *
 * Efectos secundarios:
 * - Escribe en storage.
 *
 * Manejo de errores:
 * - Si falla, no hace nada (silencioso).
 */
function guardarTema(v) {
  try {
    localStorage.setItem(claveTema, v)
  } catch {
    return
  }
}

function leerHistorialToast() {
  try {
    const bruto = localStorage.getItem(claveHistorialToast)
    if (!bruto) return []
    const parseado = JSON.parse(bruto)
    if (!Array.isArray(parseado)) return []
    return parseado
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        id: String(x.id || ''),
        msg: String(x.msg || ''),
        type: String(x.type || ''),
        ts: Number(x.ts) || Date.now(),
      }))
      .filter((x) => x.id && x.msg)
      .slice(-maximoHistorialToast)
  } catch {
    return []
  }
}

function guardarHistorialToast(arreglo) {
  try {
    localStorage.setItem(claveHistorialToast, JSON.stringify(Array.isArray(arreglo) ? arreglo : []))
  } catch {
    return
  }
}

function crearIdToast() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Provider del contexto de UI.
 *
 * Centraliza estado de:
 * - Toasts
 * - Modal (título, body, tamaño)
 * - Tema (light/dark)
 * - Sidebar móvil (open/close)
 *
 * @param {{ children: import('react').ReactNode }} props - Props del provider.
 * @returns {import('react').JSX.Element} Provider que envuelve la app.
 *
 * Lógica (alto nivel):
 * 1) Maneja toasts con timeout interno.
 * 2) Maneja modal global (open/close).
 * 3) Sincroniza `theme` con atributo `data-theme` del `<html>`.
 * 4) Controla `sidebarOpen` y lo resetea al entrar a viewport móvil (<= 767.98px).
 *
 * Dependencias externas:
 * - `localStorage`, `document.documentElement`, `matchMedia`.
 *
 * Efectos secundarios:
 * - Modifica atributos del DOM (`data-theme`) y escribe en storage.
 *
 * Notas de mantenimiento:
 * - El breakpoint de sidebar está alineado con `main.css` (max-width: 767.98px).
 */
export function ProveedorInterfaz({ children }) {
  const [estadoToast, establecerEstadoToast] = useState({ show: false, msg: 'OK', type: '' })
  const temporizadorToastRef = useRef(null)
  const [historialToast, establecerHistorialToast] = useState(() => leerHistorialToast())
  const errorRecienteRef = useRef({ ultimoMensaje: '', ultimaVez: 0 })

  useEffect(() => {
    guardarHistorialToast(historialToast)
  }, [historialToast])

  const eliminarHistorialToast = useCallback((id) => {
    const idNormalizado = String(id || '')
    if (!idNormalizado) return
    establecerHistorialToast((arreglo) => (Array.isArray(arreglo) ? arreglo.filter((x) => String(x?.id || '') !== idNormalizado) : []))
  }, [])

  const vaciarHistorialToast = useCallback(() => {
    establecerHistorialToast([])
  }, [])

  const mostrarToast = useCallback((msg, type = '') => {
    const mensaje = String(msg || '')
    const tipo = String(type || '')
    const entrada = { id: crearIdToast(), msg: mensaje, type: tipo, ts: Date.now() }
    if (mensaje) {
      establecerHistorialToast((arreglo) => {
        const anterior = Array.isArray(arreglo) ? arreglo : []
        const siguiente = [...anterior, entrada]
        return siguiente.length > maximoHistorialToast ? siguiente.slice(-maximoHistorialToast) : siguiente
      })
    }
    establecerEstadoToast({ show: true, msg: mensaje, type: tipo })
    clearTimeout(temporizadorToastRef.current)
    temporizadorToastRef.current = setTimeout(() => establecerEstadoToast((estado) => ({ ...estado, show: false })), 2600)
  }, [])

  useEffect(() => {
    const alError = (ev) => {
      const mensaje = String(ev?.message || ev?.error?.message || 'Error inesperado')
      const ahora = Date.now()
      const estado = errorRecienteRef.current
      if (mensaje && estado.ultimoMensaje === mensaje && ahora - estado.ultimaVez < 1200) return
      errorRecienteRef.current = { ultimoMensaje: mensaje, ultimaVez: ahora }
      mostrarToast(`Error: ${mensaje}`, 'red')
    }
    const alRechazo = (ev) => {
      const mensaje = String(ev?.reason?.message || ev?.reason || 'Error inesperado')
      const ahora = Date.now()
      const estado = errorRecienteRef.current
      if (mensaje && estado.ultimoMensaje === mensaje && ahora - estado.ultimaVez < 1200) return
      errorRecienteRef.current = { ultimoMensaje: mensaje, ultimaVez: ahora }
      mostrarToast(`Error: ${mensaje}`, 'red')
    }
    window.addEventListener('error', alError)
    window.addEventListener('unhandledrejection', alRechazo)
    return () => {
      window.removeEventListener('error', alError)
      window.removeEventListener('unhandledrejection', alRechazo)
    }
  }, [mostrarToast])

  const [estadoModal, establecerEstadoModal] = useState({ open: false, title: '—', body: null, size: '', encabezadoDerecha: null })
  const abrirModal = useCallback((title, body, size = '', encabezadoDerecha = null) => {
    establecerEstadoModal({ open: true, title: String(title || '—'), body, size: String(size || ''), encabezadoDerecha })
  }, [])
  const cerrarModal = useCallback(() => {
    establecerEstadoModal((estado) => ({ ...estado, open: false, encabezadoDerecha: null }))
  }, [])

  const [tema, establecerTema] = useState(() => leerTema())
  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'dark') raiz.setAttribute('data-theme', 'dark')
    else raiz.removeAttribute('data-theme')
    guardarTema(tema)
  }, [tema])
  const alternarTema = useCallback(() => establecerTema((temaActual) => (temaActual === 'dark' ? 'light' : 'dark')), [])

  const [barraLateralAbierta, establecerBarraLateralAbierta] = useState(false)
  const abrirBarraLateral = useCallback(() => establecerBarraLateralAbierta(true), [])
  const cerrarBarraLateral = useCallback(() => establecerBarraLateralAbierta(false), [])
  const alternarBarraLateral = useCallback(() => establecerBarraLateralAbierta((v) => !v), [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window?.matchMedia) return
    const consultaMedios = window.matchMedia('(max-width: 767.98px)')
    const alCambiar = () => {
      if (consultaMedios.matches) establecerBarraLateralAbierta(false)
    }
    alCambiar()
    if (consultaMedios.addEventListener) consultaMedios.addEventListener('change', alCambiar)
    else consultaMedios.addListener(alCambiar)
    return () => {
      if (consultaMedios.removeEventListener) consultaMedios.removeEventListener('change', alCambiar)
      else consultaMedios.removeListener(alCambiar)
    }
  }, [])

  const valorContexto = useMemo(
    () => ({
      estadoToast,
      mostrarToast,
      historialToast,
      eliminarHistorialToast,
      vaciarHistorialToast,
      estadoModal,
      abrirModal,
      cerrarModal,
      tema,
      establecerTema,
      alternarTema,
      barraLateralAbierta,
      abrirBarraLateral,
      cerrarBarraLateral,
      alternarBarraLateral,
    }),
    [
      estadoToast,
      mostrarToast,
      historialToast,
      eliminarHistorialToast,
      vaciarHistorialToast,
      estadoModal,
      abrirModal,
      cerrarModal,
      tema,
      alternarTema,
      barraLateralAbierta,
      abrirBarraLateral,
      cerrarBarraLateral,
      alternarBarraLateral,
    ],
  )

  return <ContextoInterfaz.Provider value={valorContexto}>{children}</ContextoInterfaz.Provider>
}

/**
 * Hook para consumir el contexto UI.
 *
 * @returns {{
 *  toastState: { show: boolean, msg: string, type: string },
 *  toast: (msg: string, type?: string) => void,
 *  modalState: { open: boolean, title: string, body: any, size: string },
 *  openModal: (title: string, body: any, size?: string) => void,
 *  closeModal: () => void,
 *  theme: 'light'|'dark',
 *  setTheme: (t: 'light'|'dark') => void,
 *  toggleTheme: () => void,
 *  sidebarOpen: boolean,
 *  openSidebar: () => void,
 *  closeSidebar: () => void,
 *  toggleSidebar: () => void,
 * }} API de UI (toast, modal, theme, sidebar).
 *
 * Manejo de errores:
 * - Lanza si se usa fuera de `UiProvider`.
 */
export function usarInterfaz() {
  const contexto = useContext(ContextoInterfaz)
  if (!contexto) throw new Error('UiProvider missing')
  return {
    ...contexto,
    toastState: contexto.estadoToast,
    toast: contexto.mostrarToast,
    modalState: contexto.estadoModal,
    openModal: contexto.abrirModal,
    closeModal: contexto.cerrarModal,
    theme: contexto.tema,
    setTheme: contexto.establecerTema,
    toggleTheme: contexto.alternarTema,
    sidebarOpen: contexto.barraLateralAbierta,
    openSidebar: contexto.abrirBarraLateral,
    closeSidebar: contexto.cerrarBarraLateral,
    toggleSidebar: contexto.alternarBarraLateral,
  }
}

export const UiProvider = ProveedorInterfaz
export const useUi = usarInterfaz
