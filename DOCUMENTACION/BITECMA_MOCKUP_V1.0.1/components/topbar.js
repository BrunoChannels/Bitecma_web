function tplTopbar(){
  return `<div class="topbar">
    <div class="tb-logo" onclick="goPage('dashboard')"><div class="tb-logo-icon">B</div><div class="tb-logo-text">BIT<span>ECMA</span></div></div>
    <div class="tb-sep"></div>
    <div class="tb-bc" id="topbc"><span>Inicio</span><span>/</span><span class="cur">Dashboard</span></div>
    <div class="tb-spacer"></div>
    <div class="tb-actions">
      <button class="tb-btn" onclick="openNotif()">${svgIcon('bell')}<span class="tb-badge">2</span></button>
      <button class="tb-btn" onclick="toast('Configuración')">${svgIcon('gear')}</button>
      <div class="user-chip"><div class="user-av">AR</div><div><div class="user-name">A. Rosson</div><div class="user-role">Admin</div></div></div>
    </div>
  </div>`;
}
