/**
 * Retorna el HTML de la barra superior (breadcrumb, acciones y usuario).
 * Orquesta navegación rápida y acceso a notificaciones/configuración.
 */
import logoUrl from '../img/logo.png'
import { svgIcon } from './svgIcon.jsx'

export default function Topbar() {
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

export function tplTopbar() {
  return `<div class="topbar">
    <div class="tb-logo" onclick="goPage('dashboard')"><div class="tb-logo-icon"><img src="${logoUrl}" alt="BITECMA"></div><div class="tb-logo-text">BIT<span>ECMA</span></div></div>
    <div class="tb-sep"></div>
    <div class="tb-bc" id="topbc"><span>Inicio</span><span>/</span><span class="cur">Dashboard</span></div>
    <div class="tb-spacer"></div>
    <div class="tb-actions">
      <button class="tb-btn" onclick="openNotif()">${svgIcon('bell')}<span class="tb-badge">2</span></button>
      <button class="tb-btn" onclick="openConfig()">${svgIcon('gear')}</button>
      <div class="user-chip" onclick="openUserProfile()"><div class="user-av" id="tb-user-av">AR</div><div><div class="user-name" id="tb-user-name">A. Rosson</div><div class="user-role" id="tb-user-role">Admin</div></div></div>
    </div>
  </div>`;
}
