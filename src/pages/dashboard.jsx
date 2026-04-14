/** Página Dashboard: retorna el HTML estático del dashboard (tarjetas, tablas y contenedor de gráfico). */
function dashboardInner() {
  return `<div class="ph">
    <div><h2>Dashboard</h2><p>Resumen operacional · EVADIR importados</p></div>
    <div class="ph-a">
      <button class="btn b-out b-sm" onclick="toast('Exportando...')">Exportar</button>
      <button class="btn b-teal b-sm" onclick="goPage('ops')">Nueva operación</button>
    </div>
  </div>
  <div class="g4 mb">
    <div class="sc sc-tl" onclick="goPage('ops')"><div class="sc-lbl">Operaciones</div><div class="sc-val">2</div><div class="sc-sub">2 importadas</div></div>
    <div class="sc sc-bl" onclick="goPage('evadir')"><div class="sc-lbl">EVADIR generados</div><div class="sc-val">2</div><div class="sc-sub">2 disponibles</div></div>
    <div class="sc sc-gr" onclick="toast('Ver muestras')"><div class="sc-lbl">Muestras L-P</div><div class="sc-val">35</div><div class="sc-sub">Subconjunto</div></div>
    <div class="sc sc-pu" onclick="toast('Ver transectos')"><div class="sc-lbl">Unidades densidad</div><div class="sc-val">30</div><div class="sc-sub">Transectos y cuadrantes</div></div>
  </div>
  <div class="g2 mb">
    <div class="card">
      <div class="ct">Operaciones recientes<button class="btn b-out b-sm" onclick="goPage('ops')">Ver todas</button></div>
      <table class="tbl">
        <thead><tr><th>ID</th><th>Sector</th><th>Fecha</th><th>Botes</th><th>Estado</th></tr></thead>
        <tbody>
          <tr onclick="goPage('ops')" style="cursor:pointer"><td><strong>OP-2026-002</strong></td><td>AMARGOS</td><td>05-02-2026</td><td>3</td><td><span class="pill p-grn">Importada</span></td></tr>
          <tr onclick="goPage('ops')" style="cursor:pointer"><td><strong>OP-2024-007</strong></td><td>BAHIA CHINCUI</td><td>20-03-2024</td><td>2</td><td><span class="pill p-grn">Importada</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="ct">EVADIR recientes<button class="btn b-out b-sm" onclick="goPage('evadir')">Ver</button></div>
      <table class="tbl">
        <thead><tr><th>Sector</th><th>SEG</th><th>Operación</th><th>Estado</th></tr></thead>
        <tbody>
          <tr onclick="goPage('evadir')" style="cursor:pointer"><td>AMARGOS</td><td>16</td><td>OP-2026-002</td><td><span class="pill p-amb">Borrador</span></td></tr>
          <tr onclick="goPage('evadir')" style="cursor:pointer"><td>BAHIA CHINCUI</td><td>7</td><td>OP-2024-007</td><td><span class="pill p-amb">Borrador</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="ct">Composición de muestras por especie · Últimas operaciones</div>
    <div style="display:flex;align-items:flex-end;gap:5px;height:100px;padding-top:8px" id="dash-bars"></div>
    <div style="display:flex;gap:14px;margin-top:8px;font-size:11px;flex-wrap:wrap">
      <span><span style="color:var(--teal)">■</span> Loco</span>
      <span><span style="color:var(--amber)">■</span> Erizo rojo</span>
      <span><span style="color:var(--green)">■</span> Lapa</span>
      <span><span style="color:var(--blue)">■</span> Otros</span>
    </div>
  </div>`
}

export default function DashboardPage() {
  return (
    <div
      className="page active"
      id="pg-dashboard"
      dangerouslySetInnerHTML={{ __html: dashboardInner() }}
    />
  )
}
