import SvgIcon from '../svgIcon.jsx'

export default function MappedColumnPreview({ excelColumnName, systemFieldName, sampleData, onRemoveMapping }) {
  const nombreColumnaExcel = String(excelColumnName || '').trim()
  const nombreCampoSistema = String(systemFieldName || '').trim()
  const valoresMuestra = Array.isArray(sampleData) ? sampleData : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--white)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: 'var(--navy)', overflowWrap: 'anywhere' }}>
            {nombreColumnaExcel || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflowWrap: 'anywhere' }}>
            {nombreCampoSistema || 'Sin asignación'}
          </div>
        </div>
        <button
          type="button"
          className="btn b-out b-xs"
          title="Eliminar mapeo"
          aria-label="Eliminar mapeo"
          onClick={() => onRemoveMapping?.(nombreColumnaExcel)}
          style={{ padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <SvgIcon name="trash" aria-hidden="true" style={{ fill: 'var(--red)' }} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="pill p-teal" style={{ fontSize: 10 }}>
          Vista previa (5)
        </span>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>
          {valoresMuestra.length ? valoresMuestra.join(' · ') : '—'}
        </div>
      </div>
    </div>
  )
}
