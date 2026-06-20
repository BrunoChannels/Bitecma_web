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
      <tbody id="evadir-rows"></tbody>
    </table>
  </div>
</div>`;
}

