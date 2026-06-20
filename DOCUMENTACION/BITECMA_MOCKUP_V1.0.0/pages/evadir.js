/** Página EVADIR: retorna el HTML del listado y botones para generar/visualizar EVADIR a partir de una operación. */
function pageEvadir(){
  return `<div class="page" id="pg-evadir">
  <div class="ph">
    <div><h2>Generar EVADIR</h2><p>El EVADIR se construye desde una operación: tabla <strong>DENSIDAD</strong> (transectos) + tablas <strong>PESO-LONGITUD</strong> (muestras por bote/especie)</p></div>
    <div class="ph-a">
      <button class="btn b-out b-sm" onclick="toast('Exportando CSV...')">Exportar CSV</button>
      <button class="btn b-teal b-sm" onclick="openGenEvadir()">Generar nuevo EVADIR</button>
    </div>
  </div>

  <div class="info-box blue mb">
    <span style="font-size:18px">i</span>
    <div>El EVADIR combina dos tipos de tablas: <strong>1) Tabla DENSIDAD</strong> (una fila por transecto, con conteos de cada especie y densidades calculadas automáticamente como N°/área) · <strong>2) Tablas L-P</strong> (una tabla por especie con longitud y peso de cada individuo medido)</div>
  </div>

  <div class="card mb">
    <div class="ct">EVADIR registrados
      <button class="btn b-teal b-sm" onclick="openGenEvadir()">Generar EVADIR</button>
    </div>
    <table class="tbl">
      <thead><tr><th>Sector</th><th>SEG/ESBA</th><th>Operación origen</th><th>Fecha</th><th>Transectos/Cuadrantes</th><th>Botes</th><th>Den Loco</th><th>Den Erizo</th><th>Estado</th><th>Acción</th></tr></thead>
      <tbody>
        <tr><td>HUAPE B</td><td>SEG-16</td><td>OP-2025-033</td><td>17-12-2025</td><td>48</td><td>3</td><td>0.598</td><td>0.000</td><td><span class="pill p-teal">Cerrado</span></td><td>
          <button class="btn b-out b-xs" onclick="openEvadirViewer('OP-2025-033')">Ver</button>
          <button class="btn b-teal b-xs" onclick="toast('Exportando EVADIR_HUAPE_SEG16.csv')">CSV</button>
        </td></tr>
        <tr><td>AMARGOS</td><td>SEG-16</td><td>OP-2026-002</td><td>05-02-2026</td><td><span class="pill p-blu" style="font-size:10px">T 5</span> <span class="pill p-pur" style="font-size:10px">C 3</span></td><td>4</td><td>0.567</td><td>0.333</td><td><span class="pill p-amb">Borrador</span></td><td>
          <button class="btn b-out b-xs" onclick="openEvadirViewer('OP-2026-002')">Ver</button>
          <button class="btn b-green b-xs" onclick="toast('EVADIR finalizado','green')">Finalizar</button>
        </td></tr>
        <tr><td>LOS VILOS B</td><td>SEG-15</td><td>OP-2024-018</td><td>14-10-2024</td><td>36</td><td>3</td><td>0.390</td><td>0.026</td><td><span class="pill p-teal">Archivado</span></td><td>
          <button class="btn b-out b-xs" onclick="openEvadirViewer('OP-2024-018')">Ver</button>
          <button class="btn b-teal b-xs" onclick="toast('Exportando...')">CSV</button>
        </td></tr>
      </tbody>
    </table>
  </div>
</div>`;
}

