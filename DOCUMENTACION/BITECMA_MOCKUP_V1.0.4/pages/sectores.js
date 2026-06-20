/** Página Sectores: retorna el HTML del listado de sectores y accesos rápidos a operaciones. */
function pageSectores(){
  return `<div class="page" id="pg-sectores">
  <div class="ph"><div><h2>Sectores</h2><p>Sectores AMERB y caletas por región</p></div></div>
  <div class="admin-layout" style="grid-template-columns: 240px 1fr 1fr;">
    <div class="card admin-menu" id="ms-regions"></div>
    <div class="card admin-content" id="ms-sectores-content"></div>
    <div class="card admin-content" id="ms-caletas-content"></div>
  </div>
</div>`;
}
