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

import Topbar from './components/topbar.jsx'
import Sidebar from './components/sidebar.jsx'

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
