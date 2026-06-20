/** Página Organizaciones: retorna el HTML del listado de organizaciones (vista estática para mockup). */
function pageOrgs(){
  return `<div class="page" id="pg-orgs">
  <div class="ph"><div><h2>Organizaciones</h2><p>Listado OPA por región (con búsqueda)</p></div></div>
  <div class="admin-layout">
    <div class="card admin-menu" id="mo-regions"></div>
    <div class="card admin-content" id="mo-orgs-content"></div>
  </div>
</div>`;
}
