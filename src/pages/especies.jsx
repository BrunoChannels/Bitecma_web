import { useEspecies } from '../hooks/useEspecies.js'

/**
 * Página de maestro de especies: lista especies bentónicas disponibles en el sistema.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (se usa para estilos; la carga ocurre en el hook).
 * @returns {import('react').JSX.Element} Tabla con especies (nombre común y científico).
 *
 * Lógica:
 * 1) Obtiene `especies` desde el hook `useEspecies`.
 * 2) Renderiza una tabla simple con índice y nombres.
 *
 * Dependencias externas:
 * - `useEspecies` (hook de datos).
 *
 * Efectos secundarios:
 * - Dependen del hook (por ejemplo: carga desde DB o API). El componente en sí es de solo lectura.
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se asume que el hook entrega un arreglo seguro.
 *
 * @example
 * <EspeciesPage active={page === 'especies'} />
 *
 * Notas de mantenimiento:
 * - Si se agregan columnas (tallas mínimas, códigos), extender encabezado y filas manteniendo accesibilidad.
 */
export default function EspeciesPage({ active }) {
  const { especies } = useEspecies()

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-especies">
      <div className="ph">
        <div>
          <h2>Maestro de Especies</h2>
          <p>36 especies bentónicas de Chile</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: 0, overflow: 'hidden' }}>
        <table className="tbl tbl-static-mobile">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre común</th>
              <th>Nombre científico</th>
            </tr>
          </thead>
          <tbody>
            {especies.map((e, idx) => (
              <tr key={e.id ?? idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{e.com}</strong>
                </td>
                <td>
                  <em>{e.sci}</em>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
