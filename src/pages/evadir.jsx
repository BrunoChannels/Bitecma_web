/** Página EVADIR: retorna el HTML del listado y botones para generar/visualizar EVADIR a partir de una operación. */
import EvadirExportBridge from '../components/evadirExport.jsx'

function evadirInner() {
  return `<div class="ph">
    <div><h2>Generar EVADIR</h2><p>El EVADIR se construye desde una operación: tabla <strong>DENSIDAD</strong> (transectos) + tablas <strong>PESO-LONGITUD</strong> (muestras por bote/especie)</p></div>
    <div class="ph-a"></div>
  </div>

  <div class="card mb">
    <div class="ct">EVADIR registrados
    </div>
    <table class="tbl">
      <thead><tr><th>Sector</th><th>SEG/ESBA</th><th>Operación origen</th><th>Fecha</th><th>Transectos/Cuadrantes</th><th>Botes</th><th>Den Loco</th><th>Den Erizo</th><th>Estado</th><th>Acción</th></tr></thead>
      <tbody id="evadir-rows"></tbody>
    </table>
  </div>`
}

export default function EvadirPage() {
  return (
    <>
      <EvadirExportBridge />
      <div
        className="page"
        id="pg-evadir"
        dangerouslySetInnerHTML={{ __html: evadirInner() }}
      />
    </>
  )
}

