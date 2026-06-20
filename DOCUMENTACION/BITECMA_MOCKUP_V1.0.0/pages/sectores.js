/** Página Sectores: retorna el HTML del listado de sectores y accesos rápidos a operaciones. */
function pageSectores(){
  return `<div class="page" id="pg-sectores">
  <div class="ph"><div><h2>Sectores AMERB</h2></div><div class="ph-a"><button class="btn b-teal b-sm" onclick="toast('Nuevo sector')">Nuevo</button></div></div>
  <div class="card"><table class="tbl"><thead><tr><th>Sector</th><th>Región</th><th>Sup. (ha)</th><th>Acciones</th></tr></thead><tbody>
    <tr><td>HUAPE SECTOR B</td><td>XIV</td><td>108.0</td><td><button class="btn b-out b-xs" onclick="goPage('ops')">Ver ops.</button></td></tr>
    <tr><td>AMARGOS</td><td>XIV</td><td>66.94</td><td><button class="btn b-out b-xs" onclick="goPage('ops')">Ver ops.</button></td></tr>
    <tr><td>LOS VILOS SECTOR B</td><td>IV</td><td>142.0</td><td><button class="btn b-out b-xs" onclick="goPage('ops')">Ver ops.</button></td></tr>
  </tbody></table></div>
</div>`;
}
