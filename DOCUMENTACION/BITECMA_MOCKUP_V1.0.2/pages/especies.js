/** Página Especies: retorna el HTML del maestro; la tabla se llena dinámicamente con `renderEspTbl()` desde la BD en memoria. */
function pageEspecies(){
  return `<div class="page" id="pg-especies">
  <div class="ph"><div><h2>Maestro de Especies</h2><p>36 especies bentónicas de Chile</p></div>
    <div class="ph-a"><button class="btn b-teal b-sm" onclick="toast('Nueva especie')">Nueva especie</button></div>
  </div>
  <div class="card"><table class="tbl" id="esp-tbl"><thead><tr><th>#</th><th>Nombre común</th><th>Nombre científico</th><th>Clase</th><th>Registro habitual</th></tr></thead><tbody id="esp-body"></tbody></table></div>
</div>`;
}
