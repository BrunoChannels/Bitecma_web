import logoUrl from './img/logo.png'
import { svgIcon } from './components/svgIcon.js'

import AdminPage from './pages/admin.jsx'
import BotesPage from './pages/botes.jsx'
import DashboardPage from './pages/dashboard.jsx'
import EspeciesPage from './pages/especies.jsx'
import EvadirPage from './pages/evadir.jsx'
import HistoricoPage from './pages/historico.jsx'
import InformePage from './pages/informe.jsx'
import LoginScreen from './pages/login.jsx'
import OpsPage from './pages/ops.jsx'
import OrgsPage from './pages/orgs.jsx'
import PerfilPage from './pages/perfil.jsx'
import SectoresPage from './pages/sectores.jsx'

function Topbar() {
  return (
    <div className="topbar">
      <div className="tb-logo" onClick={() => window.goPage?.('dashboard')}>
        <div className="tb-logo-icon">
          <img src={logoUrl} alt="BITECMA" />
        </div>
        <div className="tb-logo-text">
          BIT<span>ECMA</span>
        </div>
      </div>
      <div className="tb-sep"></div>
      <div className="tb-bc" id="topbc">
        <span>Inicio</span>
        <span>/</span>
        <span className="cur">Dashboard</span>
      </div>
      <div className="tb-spacer"></div>
      <div className="tb-actions">
        <button className="tb-btn" onClick={() => window.openNotif?.()}>
          <span
            dangerouslySetInnerHTML={{ __html: svgIcon('bell') }}
            aria-hidden="true"
          />
          <span className="tb-badge">2</span>
        </button>
        <button className="tb-btn" onClick={() => window.openConfig?.()}>
          <span
            dangerouslySetInnerHTML={{ __html: svgIcon('gear') }}
            aria-hidden="true"
          />
        </button>
        <div className="user-chip" onClick={() => window.openUserProfile?.()}>
          <div className="user-av" id="tb-user-av">
            AR
          </div>
          <div>
            <div className="user-name" id="tb-user-name">
              A. Rosson
            </div>
            <div className="user-role" id="tb-user-role">
              Admin
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sb-sec">Principal</div>
      <div
        className="nav on"
        id="nav-dashboard"
        onClick={() => window.goPage?.('dashboard')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('grid') }}
          aria-hidden="true"
        />
        Dashboard
      </div>
      <div className="sb-sec">Trabajo de Campo</div>
      <div className="nav" id="nav-ops" onClick={() => window.goPage?.('ops')}>
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('folder') }}
          aria-hidden="true"
        />
        Operaciones
      </div>
      <div
        className="nav"
        id="nav-evadir"
        onClick={() => window.goPage?.('evadir')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('table') }}
          aria-hidden="true"
        />
        EVADIR
      </div>
      <div className="sb-sec">Análisis</div>
      <div
        className="nav"
        id="nav-historico"
        onClick={() => window.goPage?.('historico')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('archive') }}
          aria-hidden="true"
        />
        Registro Histórico
      </div>
      <div className="sb-sec">Maestros</div>
      <div
        className="nav"
        id="nav-especies"
        onClick={() => window.goPage?.('especies')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('users') }}
          aria-hidden="true"
        />
        Especies
      </div>
      <div
        className="nav"
        id="nav-sectores"
        onClick={() => window.goPage?.('sectores')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('map') }}
          aria-hidden="true"
        />
        Sectores
      </div>
      <div className="nav" id="nav-orgs" onClick={() => window.goPage?.('orgs')}>
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('users') }}
          aria-hidden="true"
        />
        Organizaciones
      </div>
      <div
        className="nav"
        id="nav-botes"
        onClick={() => window.goPage?.('botes')}
      >
        <span
          className="nav-icon"
          dangerouslySetInnerHTML={{ __html: svgIcon('anchor') }}
          aria-hidden="true"
        />
        Botes
      </div>
      <div className="sb-foot">
        <div className="nav" style={{ color: 'var(--red)' }} onClick={() => window.logout?.()}>
          <span
            className="nav-icon"
            dangerouslySetInnerHTML={{ __html: svgIcon('logout') }}
            aria-hidden="true"
          />
          Cerrar sesión
        </div>
      </div>
    </div>
  )
}

function ToastHost() {
  return (
    <div className="toast" id="toast">
      <span id="tmsg">OK</span>
    </div>
  )
}

function ModalHost() {
  return (
    <div className="mo" id="mo" onClick={(e) => window.closeMoOut?.(e)}>
      <div className="mb-box" id="mb">
        <div className="mh">
          <h3 id="mtitle">—</h3>
          <button className="mc" onClick={() => window.closeMo?.()}>
            ×
          </button>
        </div>
        <div id="mbody"></div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ToastHost />
      <ModalHost />

      <LoginScreen />

      <div id="scr-app" className="screen">
        <Topbar />
        <div className="app-body">
          <Sidebar />
          <div className="main">
            <DashboardPage />
            <OpsPage />
            <EvadirPage />
            <HistoricoPage />
            <InformePage />
            <EspeciesPage />
            <SectoresPage />
            <OrgsPage />
            <BotesPage />
            <PerfilPage />
            <AdminPage />
          </div>
        </div>
      </div>
    </>
  )
}
