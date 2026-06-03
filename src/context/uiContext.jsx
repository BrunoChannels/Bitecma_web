import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const UiContext = createContext(null)

const THEME_KEY = 'bitecma_theme_v1'
const TOAST_HISTORY_KEY = 'bitecma_toast_history_v1'
const MAX_TOAST_HISTORY = 250

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
function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
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
function writeTheme(v) {
  try {
    localStorage.setItem(THEME_KEY, v)
  } catch {
    return
  }
}

function readToastHistory() {
  try {
    const raw = localStorage.getItem(TOAST_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        id: String(x.id || ''),
        msg: String(x.msg || ''),
        type: String(x.type || ''),
        ts: Number(x.ts) || Date.now(),
      }))
      .filter((x) => x.id && x.msg)
      .slice(-MAX_TOAST_HISTORY)
  } catch {
    return []
  }
}

function writeToastHistory(arr) {
  try {
    localStorage.setItem(TOAST_HISTORY_KEY, JSON.stringify(Array.isArray(arr) ? arr : []))
  } catch {
    return
  }
}

function newToastId() {
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
export function UiProvider({ children }) {
  const [toastState, setToastState] = useState({ show: false, msg: 'OK', type: '' })
  const toastT = useRef(null)
  const [toastHistory, setToastHistory] = useState(() => readToastHistory())
  const errRef = useRef({ lastMsg: '', lastAt: 0 })

  useEffect(() => {
    writeToastHistory(toastHistory)
  }, [toastHistory])

  const removeToastHistory = useCallback((id) => {
    const rid = String(id || '')
    if (!rid) return
    setToastHistory((arr) => (Array.isArray(arr) ? arr.filter((x) => String(x?.id || '') !== rid) : []))
  }, [])

  const vaciarHistorialToast = useCallback(() => {
    setToastHistory([])
  }, [])

  const toast = useCallback((msg, type = '') => {
    const m = String(msg || '')
    const t = String(type || '')
    const entry = { id: newToastId(), msg: m, type: t, ts: Date.now() }
    if (m) {
      setToastHistory((arr) => {
        const prev = Array.isArray(arr) ? arr : []
        const next = [...prev, entry]
        return next.length > MAX_TOAST_HISTORY ? next.slice(-MAX_TOAST_HISTORY) : next
      })
    }
    setToastState({ show: true, msg: m, type: t })
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastState((s) => ({ ...s, show: false })), 2600)
  }, [])

  useEffect(() => {
    const onErr = (ev) => {
      const msg = String(ev?.message || ev?.error?.message || 'Error inesperado')
      const now = Date.now()
      const s = errRef.current
      if (msg && s.lastMsg === msg && now - s.lastAt < 1200) return
      errRef.current = { lastMsg: msg, lastAt: now }
      toast(`Error: ${msg}`, 'red')
    }
    const onRej = (ev) => {
      const msg = String(ev?.reason?.message || ev?.reason || 'Error inesperado')
      const now = Date.now()
      const s = errRef.current
      if (msg && s.lastMsg === msg && now - s.lastAt < 1200) return
      errRef.current = { lastMsg: msg, lastAt: now }
      toast(`Error: ${msg}`, 'red')
    }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [toast])

  const [modalState, setModalState] = useState({ open: false, title: '—', body: null, size: '', encabezadoDerecha: null })
  const openModal = useCallback((title, body, size = '', encabezadoDerecha = null) => {
    setModalState({ open: true, title: String(title || '—'), body, size: String(size || ''), encabezadoDerecha })
  }, [])
  const closeModal = useCallback(() => {
    setModalState((s) => ({ ...s, open: false, encabezadoDerecha: null }))
  }, [])

  const [theme, setTheme] = useState(() => readTheme())
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    writeTheme(theme)
  }, [theme])
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window?.matchMedia) return
    const mq = window.matchMedia('(max-width: 767.98px)')
    const onChange = () => {
      if (mq.matches) setSidebarOpen(false)
    }
    onChange()
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  const value = useMemo(
    () => ({
      toastState,
      toast,
      toastHistory,
      removeToastHistory,
      vaciarHistorialToast,
      modalState,
      openModal,
      closeModal,
      theme,
      setTheme,
      toggleTheme,
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [
      toastState,
      toast,
      toastHistory,
      removeToastHistory,
      vaciarHistorialToast,
      modalState,
      openModal,
      closeModal,
      theme,
      toggleTheme,
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    ],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
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
export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('UiProvider missing')
  return ctx
}
