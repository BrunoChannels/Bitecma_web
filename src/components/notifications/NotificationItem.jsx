import SvgIcon from '../svgIcon.jsx'

function paletteForType(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'green' || t === 'success') return { bg: 'var(--green-lt)', fg: 'var(--green)', border: 'var(--green)' }
  if (t === 'red' || t === 'danger' || t === 'error') return { bg: 'var(--red-lt)', fg: 'var(--red)', border: 'var(--red)' }
  if (t === 'amber' || t === 'warning' || t === 'warn' || t === 'yellow') return { bg: 'var(--amber-lt)', fg: 'var(--amber)', border: 'var(--amber)' }
  if (t === 'blue' || t === 'info') return { bg: 'var(--blue-lt)', fg: 'var(--blue)', border: 'var(--blue)' }
  if (t === 'purple') return { bg: 'var(--purple-lt)', fg: 'var(--purple)', border: 'var(--purple)' }
  if (t === 'teal') return { bg: 'var(--teal-lt)', fg: 'var(--teal)', border: 'var(--teal)' }
  return { bg: 'var(--slate-lt)', fg: 'var(--slate)', border: 'var(--slate)' }
}

export default function NotificationItem({ notification, onRemove }) {
  const n = notification || {}
  const id = String(n.id || '')
  const msg = String(n.msg || n.message || '')
  const type = String(n.type || '')
  const ts = Number(n.ts || n.timestamp || 0) || 0

  const pal = paletteForType(type)
  const when = ts ? new Date(ts).toLocaleString() : ''

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: 10,
        borderRadius: 12,
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${pal.border}`,
        background: pal.bg,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: 'var(--navy)', wordBreak: 'break-word' }}>{msg || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{when}</div>
      </div>
      <button
        type="button"
        className="btn b-out b-xs"
        aria-label="Eliminar"
        onClick={() => onRemove?.(id)}
        style={{ padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <SvgIcon name="trash" aria-hidden="true" style={{ fill: pal.fg }} />
      </button>
    </div>
  )
}
