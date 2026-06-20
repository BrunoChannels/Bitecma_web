/** Página Operaciones: retorna el HTML de filtros y contenedor donde se renderiza la lista de operaciones (desde la BD en memoria). */
function pageOps(){
  return `<div class="page" id="pg-ops">
  <div class="ph">
    <div>
      <h2>Operaciones</h2>
      <p>Cada operación agrupa botes
       con sus datos de <strong>Peso-Longitud, Diametro del Disco de fijación y 
       Transectos de densidad</strong></p>
    </div>
    <div class="ph-a">
      <button class="btn b-out b-sm" onclick="openUploadExcel()">Subir Excel L-P</button>
      <button class="btn b-teal b-sm" onclick="openNuevaOp()">Nueva operación</button>
    </div>
  </div>

  <div class="filters" id="ops-filters">
    <select class="flt" id="flt-sector">
      <option value="">Todos los sectores</option>
    </select>
    <select class="flt" id="flt-mes">
      <option value="">Todas las fechas</option>
    </select>
    <input class="flt" id="flt-texto" type="text" placeholder="Buscar operación, buzo, org..." style="min-width:220px" onkeydown="if(event.key==='Enter')aplicarFiltros()">
    <button class="btn b-teal b-sm" onclick="aplicarFiltros()">Buscar</button>
    <button class="btn b-out b-sm" onclick="limpiarFiltros()">Limpiar</button>
    <span id="flt-resultado" style="font-family:var(--ff-m);font-size:11px;color:var(--text3);margin-left:4px"></span>
  </div>

  <div id="ops-list"></div>
</div>`;
}
