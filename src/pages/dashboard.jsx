import { useApp } from '../context/appContext.jsx'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'

export default function DashboardPage({ active }) {
  const { navigate } = useApp()
  const { db } = useDb()
  const { toast } = useUi()

  const barData = (() => {
    const especies = Array.isArray(db?.especies) ? db.especies : []
    const ops = Array.isArray(db?.operaciones) ? db.operaciones : []

    const locoId = especies.find((e) => String(e.com || '').toLowerCase() === 'loco')?.id
    const erizoId = especies.find((e) => String(e.com || '').toLowerCase() === 'erizo rojo')?.id
    const lapaIds = new Set(
      especies
        .filter((e) => String(e.com || '').toLowerCase().startsWith('lapa'))
        .map((e) => e.id),
    )

    const sums = { loco: 0, erizo: 0, lapa: 0, otros: 0 }
    for (const op of ops) {
      const botes = Array.isArray(op?.botes) ? op.botes : []
      for (const bote of botes) {
        const lp = bote?.lpMuestras && typeof bote.lpMuestras === 'object' ? bote.lpMuestras : {}
        for (const [k, arr] of Object.entries(lp)) {
          const id = Number(k)
          const n = Array.isArray(arr) ? arr.length : 0
          if (locoId != null && id === locoId) sums.loco += n
          else if (erizoId != null && id === erizoId) sums.erizo += n
          else if (lapaIds.has(id)) sums.lapa += n
          else sums.otros += n
        }
      }
    }

    const items = [
      { key: 'loco', label: 'Loco', color: 'var(--teal)', value: sums.loco },
      { key: 'erizo', label: 'Erizo rojo', color: 'var(--amber)', value: sums.erizo },
      { key: 'lapa', label: 'Lapa', color: 'var(--green)', value: sums.lapa },
      { key: 'otros', label: 'Otros', color: 'var(--blue)', value: sums.otros },
    ]
    const max = Math.max(1, ...items.map((x) => x.value))
    return { items, max }
  })()

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-dashboard">
      <div className="ph">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen operacional · EVADIR importados</p>
        </div>
        <div className="ph-a">
          <button className="btn b-out b-sm" onClick={() => toast('Exportando...')}>
            Exportar
          </button>
          <button className="btn b-teal b-sm" onClick={() => navigate('ops')}>
            Nueva operación
          </button>
        </div>
      </div>
      <div className="g4 mb">
        <div className="sc sc-tl" onClick={() => navigate('ops')}>
          <div className="sc-lbl">Operaciones</div>
          <div className="sc-val">2</div>
          <div className="sc-sub">2 importadas</div>
        </div>
        <div className="sc sc-bl" onClick={() => navigate('evadir')}>
          <div className="sc-lbl">EVADIR generados</div>
          <div className="sc-val">2</div>
          <div className="sc-sub">2 disponibles</div>
        </div>
        <div className="sc sc-gr" onClick={() => toast('Ver muestras')}>
          <div className="sc-lbl">Muestras L-P</div>
          <div className="sc-val">35</div>
          <div className="sc-sub">Subconjunto</div>
        </div>
        <div className="sc sc-pu" onClick={() => toast('Ver transectos')}>
          <div className="sc-lbl">Unidades densidad</div>
          <div className="sc-val">30</div>
          <div className="sc-sub">Transectos y cuadrantes</div>
        </div>
      </div>
      <div className="g2 mb">
        <div className="card">
          <div className="ct">
            Operaciones recientes
            <button className="btn b-out b-sm" onClick={() => navigate('ops')}>
              Ver todas
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Sector</th>
                <th>Fecha</th>
                <th>Botes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr onClick={() => navigate('ops')} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>OP-2026-002</strong>
                </td>
                <td>AMARGOS</td>
                <td>05-02-2026</td>
                <td>3</td>
                <td>
                  <span className="pill p-grn">Importada</span>
                </td>
              </tr>
              <tr onClick={() => navigate('ops')} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>OP-2024-007</strong>
                </td>
                <td>BAHIA CHINCUI</td>
                <td>20-03-2024</td>
                <td>2</td>
                <td>
                  <span className="pill p-grn">Importada</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="ct">
            EVADIR recientes
            <button className="btn b-out b-sm" onClick={() => navigate('evadir')}>
              Ver
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Sector</th>
                <th>SEG</th>
                <th>Operación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr onClick={() => navigate('evadir')} style={{ cursor: 'pointer' }}>
                <td>AMARGOS</td>
                <td>16</td>
                <td>OP-2026-002</td>
                <td>
                  <span className="pill p-amb">Borrador</span>
                </td>
              </tr>
              <tr onClick={() => navigate('evadir')} style={{ cursor: 'pointer' }}>
                <td>BAHIA CHINCUI</td>
                <td>7</td>
                <td>OP-2024-007</td>
                <td>
                  <span className="pill p-amb">Borrador</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="ct">Composición de muestras por especie · Últimas operaciones</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, paddingTop: 8 }}>
          {barData.items.map((it) => (
            <div key={it.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
              <div
                style={{
                  width: 18,
                  height: Math.round((it.value / barData.max) * 92) + 8,
                  background: it.color,
                  borderRadius: 6,
                }}
                title={`${it.label}: ${it.value}`}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{it.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, flexWrap: 'wrap' }}>
          <span>
            <span style={{ color: 'var(--teal)' }}>■</span> Loco
          </span>
          <span>
            <span style={{ color: 'var(--amber)' }}>■</span> Erizo rojo
          </span>
          <span>
            <span style={{ color: 'var(--green)' }}>■</span> Lapa
          </span>
          <span>
            <span style={{ color: 'var(--blue)' }}>■</span> Otros
          </span>
        </div>
      </div>
    </div>
  )
}
