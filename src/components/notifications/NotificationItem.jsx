import IconoSvg from '../svgIcon.jsx'

function paletaPorTipo(type) {
  const tipo = String(type || '').toLowerCase()
  if (tipo === 'green' || tipo === 'success') return { bg: 'var(--green-lt)', fg: 'var(--green)', border: 'var(--green)' }
  if (tipo === 'red' || tipo === 'danger' || tipo === 'error') return { bg: 'var(--red-lt)', fg: 'var(--red)', border: 'var(--red)' }
  if (tipo === 'amber' || tipo === 'warning' || tipo === 'warn' || tipo === 'yellow') return { bg: 'var(--amber-lt)', fg: 'var(--amber)', border: 'var(--amber)' }
  if (tipo === 'blue' || tipo === 'info') return { bg: 'var(--blue-lt)', fg: 'var(--blue)', border: 'var(--blue)' }
  if (tipo === 'purple') return { bg: 'var(--purple-lt)', fg: 'var(--purple)', border: 'var(--purple)' }
  if (tipo === 'teal') return { bg: 'var(--teal-lt)', fg: 'var(--teal)', border: 'var(--teal)' }
  return { bg: 'var(--slate-lt)', fg: 'var(--slate)', border: 'var(--slate)' }
}

export default function ItemNotificacion({ notificacion, alEliminar }) {
  const notificacionNormalizada = notificacion || {}
  const idNotificacion = String(notificacionNormalizada.id || '')
  const mensaje = String(notificacionNormalizada.msg || notificacionNormalizada.message || '')
  const tipo = String(notificacionNormalizada.type || '')
  const marcaTiempo = Number(notificacionNormalizada.ts || notificacionNormalizada.timestamp || 0) || 0

  const paleta = paletaPorTipo(tipo)
  const fechaHora = marcaTiempo ? new Date(marcaTiempo).toLocaleString() : ''

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: 10,
        borderRadius: 12,
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${paleta.border}`,
        background: paleta.bg,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: 'var(--navy)', wordBreak: 'break-word' }}>{mensaje || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{fechaHora}</div>
      </div>
      <button
        type="button"
        className="btn b-out b-xs"
        aria-label="Eliminar"
        onClick={() => alEliminar?.(idNotificacion)}
        style={{
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: 'var(--red)',
          color: 'var(--red)',
        }}
      >
        <IconoSvg name="trash" aria-hidden="true" style={{ width: 16, height: 16, fill: 'currentColor' }} />
      </button>
    </div>
  )
}
