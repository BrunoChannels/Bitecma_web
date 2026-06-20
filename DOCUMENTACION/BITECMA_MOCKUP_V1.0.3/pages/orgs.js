/** Página Organizaciones: retorna el HTML del listado de organizaciones (vista estática para mockup). */
function pageOrgs(){
  return `<div class="page" id="pg-orgs">
  <div class="ph"><div><h2>Organizaciones</h2></div><div class="ph-a"><button class="btn b-teal b-sm" onclick="toast('Nueva organización')">Nueva</button></div></div>
  <div class="card"><table class="tbl"><thead><tr><th>Sector</th><th>Organización</th><th>Tipo</th><th>Socios</th></tr></thead><tbody>
    <tr><td>AMARGOS</td><td>S.T.I. Buzos, Pescadores Artesanales de Amargo</td><td>STI</td><td>54</td></tr>
    <tr><td>HUAPE B</td><td>S.T.I. Pescadores... Caleta de Huape</td><td>STI</td><td>37</td></tr>
    <tr><td>LOS VILOS B</td><td>S.T.I. Pescadores Artesanales Los Vilos</td><td>STI</td><td>28</td></tr>
  </tbody></table></div>
</div>`;
}
