import { useEspecies } from '../hooks/useEspecies.js'

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
      <div className="card" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <table className="tbl">
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
