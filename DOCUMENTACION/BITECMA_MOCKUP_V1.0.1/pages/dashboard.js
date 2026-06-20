/** Página Dashboard: retorna el HTML estático del dashboard (tarjetas, tablas y contenedor de gráfico). */
function pageDashboard(){
  return `<div class="page active" id="pg-dashboard">
  <div class="ph">
    <div><h2>Dashboard</h2><p>Resumen operacional · Temporada 2026</p></div>
    <div class="ph-a">
      <button class="btn b-out b-sm" onclick="toast('Exportando...')">Exportar</button>
      <button class="btn b-teal b-sm" onclick="goPage('ops')">Nueva operación</button>
    </div>
  </div>
  <div class="g4 mb">
    <div class="sc sc-tl" onclick="goPage('ops')"><div class="sc-lbl">Operaciones</div><div class="sc-val">12</div><div class="sc-sub">3 activas · Feb 2026</div></div>
    <div class="sc sc-bl" onclick="goPage('evadir')"><div class="sc-lbl">EVADIR generados</div><div class="sc-val">58</div><div class="sc-sub">SEG-16 en curso</div></div>
    <div class="sc sc-gr" onclick="toast('Ver muestras')"><div class="sc-lbl">Muestras L-P</div><div class="sc-val">2.847</div><div class="sc-sub">↑ 12% este mes</div></div>
    <div class="sc sc-pu" onclick="toast('Ver transectos')"><div class="sc-lbl">Transectos densidad</div><div class="sc-val">384</div><div class="sc-sub">48 últimos 30 días</div></div>
  </div>
  <div class="g2 mb">
    <div class="card">
      <div class="ct">Operaciones recientes<button class="btn b-out b-sm" onclick="goPage('ops')">Ver todas</button></div>
      <table class="tbl">
        <thead><tr><th>ID</th><th>Sector</th><th>Fecha</th><th>Botes</th><th>Estado</th></tr></thead>
        <tbody>
          <tr onclick="goPage('ops')" style="cursor:pointer"><td><strong>OP-2026-002</strong></td><td>AMARGOS</td><td>05-02-2026</td><td>4</td><td><span class="pill p-grn">Completa</span></td></tr>
          <tr onclick="goPage('ops')" style="cursor:pointer"><td><strong>OP-2025-033</strong></td><td>HUAPE B</td><td>17-12-2025</td><td>3</td><td><span class="pill p-grn">Completa</span></td></tr>
          <tr onclick="goPage('ops')" style="cursor:pointer"><td><strong>OP-2026-005</strong></td><td>LOS VILOS B</td><td>10-03-2026</td><td>4</td><td><span class="pill p-amb">En curso</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="ct">EVADIR recientes<button class="btn b-out b-sm" onclick="goPage('evadir')">Ver</button></div>
      <table class="tbl">
        <thead><tr><th>Sector</th><th>SEG</th><th>Operación</th><th>Estado</th></tr></thead>
        <tbody>
          <tr onclick="goPage('evadir')" style="cursor:pointer"><td>HUAPE B</td><td>16</td><td>OP-2025-033</td><td><span class="pill p-teal">Cerrado</span></td></tr>
          <tr onclick="goPage('evadir')" style="cursor:pointer"><td>AMARGOS</td><td>16</td><td>OP-2026-002</td><td><span class="pill p-amb">Borrador</span></td></tr>
          <tr onclick="goPage('evadir')" style="cursor:pointer"><td>LOS VILOS B</td><td>15</td><td>OP-2024-018</td><td><span class="pill p-teal">Archivado</span></td></tr>
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
  </div>
</div>`;
}
