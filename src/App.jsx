import { Suspense, lazy, useMemo } from 'react'
import LoginScreen from './pages/login.jsx'

const AdminPage = lazy(() => import('./pages/admin.jsx'))
const BotesPage = lazy(() => import('./pages/botes.jsx'))
const DashboardPage = lazy(() => import('./pages/dashboard.jsx'))
const EspeciesPage = lazy(() => import('./pages/especies.jsx'))
const EvadirPage = lazy(() => import('./pages/evadir.jsx'))
const HistoricoPage = lazy(() => import('./pages/historico.jsx'))
const InformePage = lazy(() => import('./pages/informe.jsx'))
const OpsPage = lazy(() => import('./pages/ops.jsx'))
const OrgsPage = lazy(() => import('./pages/orgs.jsx'))
const PerfilPage = lazy(() => import('./pages/perfil.jsx'))
const SectoresPage = lazy(() => import('./pages/sectores.jsx'))
import Topbar from './components/topbar.jsx'
import Sidebar from './components/sidebar.jsx'
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
    <div
      className={`mo${modalState.open ? ' open' : ''}`}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        closeModal()
      }}
    >
      <div className={`mb-box${modalState.size ? ' ' + modalState.size : ''}`}>
        <div className="mh">
          <h3>{modalState.title}</h3>
          <button className="mc" onClick={closeModal}>
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
  const { sidebarOpen, closeSidebar } = useUi()

  const pageToComp = useMemo(
    () => ({
      dashboard: DashboardPage,
      ops: OpsPage,
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

  return (
    <>
      <ToastHost />
      <ModalHost />

      <LoginScreen active={!isAuthed} />

      <div id="scr-app" className={`screen${isAuthed ? ' active' : ''}`}>
        <Topbar />
        <div className="app-body">
          <div className={`sb-wrap${sidebarOpen ? ' open' : ''}`}>
            <Sidebar />
          </div>
          <div className={`sb-backdrop${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />
          <div className="main">
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
