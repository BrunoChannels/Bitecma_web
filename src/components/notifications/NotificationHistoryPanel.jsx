import { useMemo } from 'react'
import { useUi } from '../../context/uiContext.jsx'
import NotificationItem from './NotificationItem.jsx'

export default function NotificationHistoryPanel() {
  const { toastHistory, removeToastHistory } = useUi()

  const items = useMemo(() => {
    const arr = Array.isArray(toastHistory) ? toastHistory : []
    return [...arr].reverse()
  }, [toastHistory])

  if (!items.length) {
    return <div style={{ color: 'var(--text3)', padding: 6 }}>Sin notificaciones registradas.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((n) => (
        <NotificationItem key={String(n?.id || '')} notification={n} onRemove={removeToastHistory} />
      ))}
    </div>
  )
}
