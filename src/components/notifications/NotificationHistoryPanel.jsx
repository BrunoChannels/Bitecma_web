import { useMemo } from 'react'
import { usarInterfaz } from '../../context/uiContext.jsx'
import ItemNotificacion from './NotificationItem.jsx'

export default function PanelHistorialNotificaciones() {
  const { historialToast, eliminarHistorialToast } = usarInterfaz()

  const notificaciones = useMemo(() => {
    const arreglo = Array.isArray(historialToast) ? historialToast : []
    return [...arreglo].reverse()
  }, [historialToast])

  return (
    <div className="notif-panel">
      {notificaciones.length ? (
        <div className="notif-panel-inner">
          {notificaciones.map((notificacion) => (
            <ItemNotificacion key={String(notificacion?.id || '')} notificacion={notificacion} alEliminar={eliminarHistorialToast} />
          ))}
        </div>
      ) : (
        <div className="notif-panel-empty">Sin notificaciones registradas.</div>
      )}
    </div>
  )
}
