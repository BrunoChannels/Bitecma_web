/**
 * Retorna el HTML del menú lateral (navegación por secciones).
 * Controla el acceso a páginas internas y el cierre de sesión.
 */
import { svgIcon } from './svgIcon.jsx'

export default function Sidebar() {
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
      <div className="nav" id="nav-evadir" onClick={() => window.goPage?.('evadir')}>
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
        <div
          className="nav"
          style={{ color: 'var(--red)' }}
          onClick={() => window.logout?.()}
        >
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

export function tplSidebar() {
  return `<div class="sidebar">
      <div class="sb-sec">Principal</div>
      <div class="nav on" id="nav-dashboard" onclick="goPage('dashboard')"><span class="nav-icon">${svgIcon('grid')}</span>Dashboard</div>
      <div class="sb-sec">Trabajo de Campo</div>
      <div class="nav" id="nav-ops" onclick="goPage('ops')"><span class="nav-icon">${svgIcon('folder')}</span>Operaciones</div>
      <div class="nav" id="nav-evadir" onclick="goPage('evadir')"><span class="nav-icon">${svgIcon('table')}</span>EVADIR</div>
      <div class="sb-sec">Análisis</div>
      <div class="nav" id="nav-historico" onclick="goPage('historico')"><span class="nav-icon">${svgIcon('archive')}</span>Registro Histórico</div>
      <div class="sb-sec">Maestros</div>
      <div class="nav" id="nav-especies" onclick="goPage('especies')"><span class="nav-icon">${svgIcon('users')}</span>Especies</div>
      <div class="nav" id="nav-sectores" onclick="goPage('sectores')"><span class="nav-icon">${svgIcon('map')}</span>Sectores</div>
      <div class="nav" id="nav-orgs" onclick="goPage('orgs')"><span class="nav-icon">${svgIcon('users')}</span>Organizaciones</div>
      <div class="nav" id="nav-botes" onclick="goPage('botes')"><span class="nav-icon">${svgIcon('anchor')}</span>Botes</div>
      <div class="sb-foot">
        <div class="nav" style="color:var(--red)" onclick="logout()"><span class="nav-icon">${svgIcon('logout')}</span>Cerrar sesión</div>
      </div>
    </div>`;
}
