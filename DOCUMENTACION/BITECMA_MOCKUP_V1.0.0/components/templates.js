/** Devuelve un SVG inline según el nombre del ícono, usado en topbar y sidebar. */
function svgIcon(name){
  const icons={
    bell:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM20 17h-1V11a7 7 0 1 0-14 0v6H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2Z"/></svg>`,
    gear:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.8 7.8 0 0 0 0-1.88l2.03-1.58a.8.8 0 0 0 .19-1.01l-1.92-3.32a.8.8 0 0 0-.96-.36l-2.39.96a7.56 7.56 0 0 0-1.63-.95l-.36-2.54A.8.8 0 0 0 13.3 1h-3.6a.8.8 0 0 0-.79.68l-.36 2.54a7.56 7.56 0 0 0-1.63.95l-2.39-.96a.8.8 0 0 0-.96.36L1.65 8.89a.8.8 0 0 0 .19 1.01l2.03 1.58a7.8 7.8 0 0 0 0 1.88l-2.03 1.58a.8.8 0 0 0-.19 1.01l1.92 3.32a.8.8 0 0 0 .96.36l2.39-.96c.5.38 1.05.7 1.63.95l.36 2.54a.8.8 0 0 0 .79.68h3.6a.8.8 0 0 0 .79-.68l.36-2.54c.58-.25 1.13-.57 1.63-.95l2.39.96a.8.8 0 0 0 .96-.36l1.92-3.32a.8.8 0 0 0-.19-1.01l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>`,
    search:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 18a8 8 0 1 1 5.3-14A8 8 0 0 1 10 18Zm11.7 2.3-5.2-5.2a10 10 0 1 0-1.4 1.4l5.2 5.2a1 1 0 0 0 1.4-1.4Z"/></svg>`,
    grid:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>`,
    folder:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4 12 6h8a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h6Z"/></svg>`,
    table:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 4v8h18V9H3Zm4 2h3v2H7v-2Zm0 3h3v2H7v-2Zm6-3h4v2h-4v-2Zm0 3h4v2h-4v-2Z"/></svg>`,
    archive:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18a2 2 0 0 1 2 2v3H1V5a2 2 0 0 1 2-2Zm-2 7h22v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V10Zm7 3a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2H8Z"/></svg>`,
    doc:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5"/></svg>`,
    users:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-3.3 0-6 1.7-6 4v2h12v-2c0-2.3-2.7-4-6-4ZM8 14c-2.8 0-5 1.4-5 3.2V20h6v-2c0-1.5.7-2.8 1.9-3.7A8.2 8.2 0 0 0 8 14Z"/></svg>`,
    map:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 9 3 3 5v16l6-2 6 2 6-2V3l-6 2Zm-6 0v14l-4 1.3V6.3L9 5Zm2 0 4 1.3v14L11 19V5Zm10 13.7-4 1.3V6l4-1.3v14Z"/></svg>`,
    logout:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17a1 1 0 0 0 1-1v-1h7a1 1 0 0 0 0-2h-7v-1a1 1 0 0 0-1.7-.7l-3 3a1 1 0 0 0 0 1.4l3 3A1 1 0 0 0 10 17ZM4 4h8a2 2 0 0 1 2 2v3a1 1 0 0 1-2 0V6H4v12h8v-3a1 1 0 0 1 2 0v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>`
  };
  return icons[name]||'';
}

/** Pantalla Login (HTML): formulario de acceso + selector de rol. */
function tplLogin(){
  return `<div id="scr-login" class="screen active">
  <div class="lcard">
    <div class="lc-logo"><div class="lc-icon">B</div><div class="lc-brand"><h1>BITECMA</h1><span>Sistema AMERB · v5.0</span></div></div>
    <div class="lc-title">Iniciar sesión</div>
    <div class="lc-sub">Sistema de gestión de operaciones bentónicas y generación de EVADIR.</div>
    <div class="lf-g"><label class="lf-lbl">Correo electrónico</label><input class="lf-inp" value="arosson@bitecma.cl"></div>
    <div class="lf-g"><label class="lf-lbl">Contraseña</label><input class="lf-inp" type="password" value="••••••••"></div>
    <div class="lf-g"><label class="lf-lbl">Rol</label>
      <div class="role-row">
        <button class="role-opt sel" onclick="selRole(this)">Admin</button>
        <button class="role-opt" onclick="selRole(this)">Biólogo</button>
        <button class="role-opt" onclick="selRole(this)">Técnico</button>
        <button class="role-opt" onclick="selRole(this)">Analista</button>
      </div>
    </div>
    <button class="btn-login" onclick="enterApp()">Ingresar</button>
    <div class="lc-foot"><a onclick="toast('Correo enviado')">¿Olvidaste tu contraseña?</a> · Bitecma Ltda. © 2026</div>
  </div>
</div>`;
}

/** Layout principal (HTML): toast + modal + topbar + sidebar + contenedor de páginas. */
function tplApp(){
  return `<div class="toast" id="toast"><span id="tmsg">OK</span></div>
<div class="mo" id="mo" onclick="closeMoOut(event)">
  <div class="mb-box" id="mb">
    <div class="mh"><h3 id="mtitle">—</h3><button class="mc" onclick="closeMo()">×</button></div>
    <div id="mbody"></div>
  </div>
</div>

<div id="scr-app" class="screen">
  <div class="topbar">
    <div class="tb-logo" onclick="goPage('dashboard')"><div class="tb-logo-icon">B</div><div class="tb-logo-text">BIT<span>ECMA</span></div></div>
    <div class="tb-sep"></div>
    <div class="tb-bc" id="topbc"><span>Inicio</span><span>/</span><span class="cur">Dashboard</span></div>
    <div class="tb-spacer"></div>
    <div class="tb-search"><span style="color:var(--text3);font-size:12px">${svgIcon('search')}</span><input placeholder="Buscar operación, sector, especie..."></div>
    <div class="tb-actions">
      <button class="tb-btn" onclick="openNotif()">${svgIcon('bell')}<span class="tb-badge">2</span></button>
      <button class="tb-btn" onclick="toast('Configuración')">${svgIcon('gear')}</button>
      <div class="user-chip"><div class="user-av">AR</div><div><div class="user-name">A. Rosson</div><div class="user-role">Admin</div></div></div>
    </div>
  </div>
  <div class="app-body">
    <div class="sidebar">
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
      <div class="sb-foot">
        <div class="nav" style="color:var(--red)" onclick="logout()"><span class="nav-icon">${svgIcon('logout')}</span>Cerrar sesión</div>
      </div>
    </div>

    <div class="main">
      ${pageDashboard()}
      ${pageOps()}
      ${pageEvadir()}
      ${pageHistorico()}
      ${pageInforme()}
      ${pageEspecies()}
      ${pageSectores()}
      ${pageOrgs()}
    </div>
  </div>
</div>`;
}
