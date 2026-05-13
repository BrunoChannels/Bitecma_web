import SvgIcon from './svgIcon.jsx'
import { useApp } from '../context/appContext.jsx'
import { useUi } from '../context/uiContext.jsx'

/**
 * Menú lateral de navegación (sidebar).
 *
 * Renderiza secciones y accesos a páginas, respetando permisos del usuario,
 * y cierra el sidebar en móviles al navegar.
 *
 * @returns {import('react').JSX.Element} Componente Sidebar.
 *
 * Lógica:
 * 1) Lee `page`, `navigate` y `logout` desde el contexto App.
 * 2) Lee `closeSidebar` desde el contexto UI.
 * 3) Define `go(to)` para navegar y cerrar sidebar (UX móvil).
 * 4) Renderiza items con estado activo (`.on`).
 *
 * Dependencias externas:
 * - [useApp](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx)
 * - [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx)
 * - [SvgIcon](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/svgIcon.jsx)
 *
 * Efectos secundarios:
 * - Puede disparar navegación interna y cierre de sesión.
 *
 * Manejo de errores:
 * - No maneja errores explícitos; asume que los contextos proveen funciones válidas.
 *
 * Notas de mantenimiento:
 * - Mantener ids (`nav-*`) consistentes si se usan para QA/tests.
 * - Si se agrega una nueva página, sumar aquí y en el router interno de `App.jsx`.
 */
export default function Sidebar() {
  const { page, navigate, logout } = useApp()
  const { closeSidebar } = useUi()

  /**
   * Navega a una página interna y cierra el sidebar (pensado para móvil).
   *
   * @param {string} to - Clave de página (ej: 'dashboard', 'ops', 'evadir').
   * @returns {void}
   *
   * Dependencias externas:
   * - `navigate` (contexto App)
   * - `closeSidebar` (contexto UI)
   *
   * Efectos secundarios:
   * - Cambia navegación global y estado UI del sidebar.
   */
  const go = (to) => {
    navigate(to)
    closeSidebar()
  }

  return (
    <div className="sidebar">
      <div className="sb-sec">Principal</div>
      <div
        className={`nav ${page === 'dashboard' ? 'on' : ''}`}
        id="nav-dashboard"
        onClick={() => go('dashboard')}
      >
        <SvgIcon className="nav-icon" name="grid" aria-hidden="true" />
        Dashboard
      </div>
      <div className="sb-sec">Trabajo de Campo</div>
      <div className={`nav ${page === 'ops' ? 'on' : ''}`} id="nav-ops" onClick={() => go('ops')}>
        <SvgIcon className="nav-icon" name="folder" aria-hidden="true" />
        Operaciones
      </div>
      <div className={`nav ${page === 'evadir' ? 'on' : ''}`} id="nav-evadir" onClick={() => go('evadir')}>
        <SvgIcon className="nav-icon" name="table" aria-hidden="true" />
        EVADIR
      </div>
      <div className="sb-sec">Maestros</div>
      <div
        className={`nav ${page === 'especies' ? 'on' : ''}`}
        id="nav-especies"
        onClick={() => go('especies')}
      >
        <SvgIcon className="nav-icon" name="users" aria-hidden="true" />
        Especies
      </div>
      <div
        className={`nav ${page === 'sectores' ? 'on' : ''}`}
        id="nav-sectores"
        onClick={() => go('sectores')}
      >
        <SvgIcon className="nav-icon" name="map" aria-hidden="true" />
        Sectores
      </div>
      <div className={`nav ${page === 'orgs' ? 'on' : ''}`} id="nav-orgs" onClick={() => go('orgs')}>
        <SvgIcon className="nav-icon" name="users" aria-hidden="true" />
        Organizaciones
      </div>
      <div
        className={`nav ${page === 'botes' ? 'on' : ''}`}
        id="nav-botes"
        onClick={() => go('botes')}
      >
        <SvgIcon className="nav-icon" name="anchor" aria-hidden="true" />
        Botes
      </div>
      <div className="sb-foot">
        <div
          className="nav"
          style={{ color: 'var(--red)' }}
          onClick={() => {
            closeSidebar()
            logout()
          }}
        >
          <SvgIcon className="nav-icon" name="logout" aria-hidden="true" />
          Cerrar sesión
        </div>
      </div>
    </div>
  )
}
