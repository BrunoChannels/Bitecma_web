/**
 * Retorna el HTML del menú lateral (navegación por secciones).
 * Controla el acceso a páginas internas y el cierre de sesión.
 */
import SvgIcon from './svgIcon.jsx'
import { useApp } from '../context/appContext.jsx'
import { useUi } from '../context/uiContext.jsx'

/**
 * Renderiza el menú lateral de navegación de la aplicación.
 *
 * @returns {import('react').JSX.Element} Elemento React que contiene accesos a secciones y cierre de sesión.
 *
 * Lógica:
 * 1) Lee el estado actual de navegación (`page`) y las acciones (`navigate`, `logout`) desde el contexto de app.
 * 2) Lee la acción `closeSidebar` desde el contexto de UI para cerrar el menú en móvil.
 * 3) Define un helper `go(to)` para navegar y cerrar el sidebar en un único paso.
 * 4) Renderiza un listado de opciones; marca como activa la opción que coincide con `page`.
 * 5) En “Cerrar sesión”, cierra el sidebar y ejecuta `logout()`.
 *
 * Dependencias externas:
 * - [useApp](./Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx): navegación y autenticación.
 * - [useUi](./Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx): control de sidebar.
 * - [SvgIcon](./Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/svgIcon.jsx): íconos del menú.
 *
 * Efectos secundarios:
 * - Cambia el estado global de navegación.
 * - Puede iniciar un flujo de cierre de sesión (limpieza de sesión/estado).
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se asume que `navigate`/`logout` manejan sus propios fallos o están protegidos.
 *
 * @example
 * <Sidebar />
 *
 * Notas de mantenimiento:
 * - Si se agregan nuevas páginas, añadir su ítem de navegación y mantener IDs (`id="nav-..."`) si son usados por tests o CSS.
 * - Evitar lógica pesada en render; preferir helpers como `go` para acciones repetitivas.
 */
export default function Sidebar() {
  const { page, navigate, logout } = useApp()
  const { closeSidebar } = useUi()

  /**
   * Navega a una sección y cierra el sidebar (especialmente útil en móvil).
   *
   * @param {string} to - Identificador de ruta/página interna reconocida por `navigate` (ej.: `'ops'`, `'dashboard'`).
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Ejecuta `navigate(to)` para cambiar de página.
   * 2) Ejecuta `closeSidebar()` para colapsar el menú.
   *
   * Dependencias externas:
   * - `navigate` (contexto de app).
   * - `closeSidebar` (contexto de UI).
   *
   * Efectos secundarios:
   * - Cambia la navegación global y el estado visual del sidebar.
   *
   * Manejo de errores:
   * - No realiza validaciones adicionales; se asume `to` válido.
   *
   * @example
   * go('dashboard')
   *
   * Notas de mantenimiento:
   * - Mantener esta función pequeña para evitar closures complejos en JSX.
   */
  const go = (to) => {
    navigate(to)
    closeSidebar()
  }

  return (
    <div className="sidebar">
      <div className="sb-head">
        <div className="sb-head-title">Menú</div>
        <button type="button" className="mc sb-close" onClick={closeSidebar} aria-label="Cerrar">
          ×
        </button>
      </div>
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
