import { useMemo } from 'react'
import { useUi } from '../../context/uiContext.jsx'
import NotificationItem from './NotificationItem.jsx'

export default function NotificationHistoryPanel() {
  const { toastHistory, removeToastHistory } = useUi()

  const items = useMemo(() => {
    const arr = Array.isArray(toastHistory) ? toastHistory : []
    return [...arr].reverse()
  }, [toastHistory])

  return (
    <div className="notif-panel">
      {items.length ? (
        <div className="notif-panel-inner">
          {items.map((n) => (
            <NotificationItem key={String(n?.id || '')} notification={n} onRemove={removeToastHistory} />
          ))}
        </div>
      ) : (
        <div className="notif-panel-empty">Sin notificaciones registradas.</div>
      )}
    </div>
  )
}
