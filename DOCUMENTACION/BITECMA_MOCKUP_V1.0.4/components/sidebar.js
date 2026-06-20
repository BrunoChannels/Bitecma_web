/**
 * Retorna el HTML del menú lateral (navegación por secciones).
 * Controla el acceso a páginas internas y el cierre de sesión.
 */
function tplSidebar(){
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
