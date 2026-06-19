import EvadirRegistradosTable from '../components/evadir/EvadirRegistradosTable.jsx'

/**
 * Página EVADIR: listado y acceso a acciones relacionadas con EVADIR registrados.
 *
 * EVADIR se construye desde una operación, combinando:
 * - Densidad (transectos/cuadrantes)
 * - Peso-Longitud / Diámetro (muestras por bote y especie)
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.activo - Indica si la página está activa (se usa para estilos).
 * @returns {import('react').JSX.Element} Página con header informativo y tabla de EVADIR registrados.
 *
 * Lógica:
 * 1) Renderiza texto descriptivo de qué contiene un EVADIR.
 * 2) Renderiza el componente `EvadirRegistradosTable` para filtros, vista previa y exportación.
 *
 * Dependencias externas:
 * - `EvadirRegistradosTable` (componentes/evadir).
 *
 * Efectos secundarios:
 * - Dependen del componente hijo (por ejemplo: carga de perfiles, apertura de modales, exportación).
 *
 * Manejo de errores:
 * - Delegado al componente hijo.
 *
 * @example
 * <EvadirPage activo={page === 'evadir'} />
 *
 * Notas de mantenimiento:
 * - Mantener el copy alineado con el flujo real de importación/generación EVADIR.
 */
export default function EvadirPage({ activo }) {
  return (
    <div className={`page${activo ? ' active' : ''}`} id="pg-evadir">
      <div className="ph">
        <div className="evadir-page-intro">
          <h2>Generar EVADIR</h2>
          <p>
            El EVADIR se construye desde una operación: tabla <strong>DENSIDAD</strong> (transectos) + tablas{' '}
            <strong>PESO-LONGITUD</strong> (muestras por bote/especie)
          </p>
        </div>
        <div className="ph-a"></div>
      </div>

      <div className="card mb evadir-page-card">
        <div className="ct">EVADIR registrados</div>
        <EvadirRegistradosTable />
      </div>
    </div>
  )
}
