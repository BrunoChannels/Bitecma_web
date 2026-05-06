import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const UiContext = createContext(null)

const THEME_KEY = 'bitecma_theme_v1'

function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function writeTheme(v) {
  try {
    localStorage.setItem(THEME_KEY, v)
  } catch {
    return
  }
}

export function UiProvider({ children }) {
  const [toastState, setToastState] = useState({ show: false, msg: 'OK', type: '' })
  const toastT = useRef(null)

  const toast = useCallback((msg, type = '') => {
    setToastState({ show: true, msg: String(msg || ''), type: String(type || '') })
    clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastState((s) => ({ ...s, show: false })), 2600)
  }, [])

  const [modalState, setModalState] = useState({ open: false, title: '—', body: null, size: '' })
  const openModal = useCallback((title, body, size = '') => {
    setModalState({ open: true, title: String(title || '—'), body, size: String(size || '') })
  }, [])
  const closeModal = useCallback(() => {
    setModalState((s) => ({ ...s, open: false }))
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
    [toastState, toast, modalState, openModal, closeModal, theme, toggleTheme, sidebarOpen, openSidebar, closeSidebar, toggleSidebar],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('UiProvider missing')
  return ctx
}
