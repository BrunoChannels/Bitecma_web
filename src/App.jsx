import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import LoginScreen from './pages/login.jsx'

const AdminPage = lazy(() => import('./pages/admin.jsx'))
const BotesPage = lazy(() => import('./pages/botes.jsx'))
const DashboardPage = lazy(() => import('./pages/dashboard.jsx'))
const EspeciesPage = lazy(() => import('./pages/especies.jsx'))
const EvadirPage = lazy(() => import('./pages/evadir.jsx'))
const HistoricoPage = lazy(() => import('./pages/historico.jsx'))
const InformePage = lazy(() => import('./pages/informe.jsx'))
const OpsPage = lazy(() => import('./pages/ops.jsx'))
const OpsTutorialPage = lazy(() => import('./pages/opsTutorial.jsx'))
const OrgsPage = lazy(() => import('./pages/orgs.jsx'))
const PerfilPage = lazy(() => import('./pages/perfil.jsx'))
const SectoresPage = lazy(() => import('./pages/sectores.jsx'))
import Topbar from './components/topbar.jsx'
import Sidebar from './components/sidebar.jsx'
import Tutorial from './components/tutorial.jsx'
import { AppProvider, useApp } from './context/appContext.jsx'
import { DbProvider } from './context/dbContext.jsx'
import { UiProvider, useUi } from './context/uiContext.jsx'

function ToastHost() {
  const { toastState } = useUi()
  const bg =
    toastState.type === 'green'
      ? '#065f46'
      : toastState.type === 'red'
        ? '#7f1d1d'
        : 'var(--navy)'
  return (
    <div className={`toast${toastState.show ? ' show' : ''}`} style={{ background: bg }}>
      <span>{toastState.msg}</span>
    </div>
  )
}

function ModalHost() {
  const { modalState, closeModal } = useUi()
  return (
    <div className={`mo${modalState.open ? ' open' : ''}`}>
      <div className={`mb-box${modalState.size ? ' ' + modalState.size : ''}`}>
        <div className="mh">
          <h3>{modalState.title}</h3>
          <button type="button" className="mc" onClick={closeModal} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="mb-body">{modalState.body}</div>
      </div>
    </div>
  )
}

function AppShell() {
  const { page, isAuthed } = useApp()
  const { sidebarOpen } = useUi()
  const [topbarKey, setTopbarKey] = useState(0)
  const topbarWatchRef = useRef({ lastCheckAt: 0, badCount: 0, lastReloadAt: 0 })

  const pageToComp = useMemo(
    () => ({
      dashboard: DashboardPage,
      ops: OpsPage,
      'ops-tutorial': OpsTutorialPage,
      evadir: EvadirPage,
      historico: HistoricoPage,
      informe: InformePage,
      especies: EspeciesPage,
      sectores: SectoresPage,
      orgs: OrgsPage,
      botes: BotesPage,
      perfil: PerfilPage,
      admin: AdminPage,
    }),
    [],
  )
  const ActivePage = pageToComp[page] || DashboardPage

  useEffect(() => {
    if (!isAuthed) return
    let rafId = 0
    const checkEveryMs = 100
    const minReloadGapMs = 1200

    const check = (now) => {
      const s = topbarWatchRef.current
      if (document.hidden) return true
      if (now - s.lastCheckAt < checkEveryMs) return false
      s.lastCheckAt = now

      const el = document.querySelector('.topbar')
      if (!el || !el.isConnected) {
        s.badCount++
      } else {
        const cs = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const displayOk = cs.display !== 'none'
        const visibilityOk = cs.visibility !== 'hidden'
        const opacityOk = Number.isFinite(Number(cs.opacity)) ? Number(cs.opacity) > 0.02 : true
        const heightOk = rect.height >= 20
        const widthOk = rect.width >= 120
        const onScreenOk = rect.bottom > 0 && rect.top < 80
        const ok = displayOk && visibilityOk && opacityOk && heightOk && widthOk && onScreenOk
        s.badCount = ok ? 0 : s.badCount + 1
      }

      if (s.badCount >= 2 && now - s.lastReloadAt >= minReloadGapMs) {
        s.lastReloadAt = now
        s.badCount = 0
        setTopbarKey((k) => k + 1)
        return true
      }

      return false
    }

    const tick = (t) => {
      const now = typeof t === 'number' ? t : performance.now()
      const didReload = check(now)
      rafId = requestAnimationFrame(tick)
      if (didReload) return
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isAuthed])

  return (
    <>
      <ToastHost />
      <ModalHost />
      <Tutorial />

      <LoginScreen active={!isAuthed} />

      <div id="scr-app" className={`screen${isAuthed ? ' active' : ''}`}>
        <Topbar key={topbarKey} />
        <div className="app-body">
          <div className={`sb-wrap${sidebarOpen ? ' open' : ''}`}>
            <Sidebar />
          </div>
          <div className={`sb-backdrop${sidebarOpen ? ' open' : ''}`} />
          <div className={`main${page === 'dashboard' ? ' main-dashboard' : ''}`}>
            <Suspense fallback={<div style={{ padding: 14, color: 'var(--text3)' }}>Cargando…</div>}>
              <ActivePage active />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <DbProvider>
      <UiProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </UiProvider>
    </DbProvider>
  )
}
