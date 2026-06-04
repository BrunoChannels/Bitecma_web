/**
 * Retorna el HTML de la barra superior (breadcrumb, acciones y usuario).
 * Orquesta navegación rápida y acceso a notificaciones/configuración.
 */
import { useState } from 'react'
import logoUrl from '../img/logo.png'
import IconoSvg from './svgIcon.jsx'
import PanelHistorialNotificaciones from './notifications/NotificationHistoryPanel.jsx'
import { usarAplicacion } from '../context/appContext.jsx'
import { usarInterfaz } from '../context/uiContext.jsx'
import { usarBaseDatos } from '../context/dbContext.jsx'
import { combinarOperacionesPorId, parsearPayloadOperaciones, serializarOperaciones } from '../services/operacionesTransferService.js'

/**
 * Cuerpo del modal de configuración accesible desde la barra superior.
 *
 * @returns {import('react').JSX.Element} Contenido del modal (tema, panel admin, export/import operaciones).
 *
 * Lógica:
 * 1) Obtiene navegación/rol (admin) desde el contexto de app.
 * 2) Obtiene base de datos local y setter desde el contexto de DB.
 * 3) Obtiene utilidades UI (modal, toast, tema) desde el contexto de UI.
 * 4) Expone acciones de exportación e importación de operaciones (solo Admin).
 * 5) Renderiza controles de tema, acceso admin y botones de migración.
 *
 * Dependencias externas:
 * - [useApp](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx): navegación/rol.
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx): estado DB.
 * - [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx): modal/toast/tema.
 * - `serializeOperaciones`, `parseOperacionesPayload`, `mergeOperacionesById` (servicio de transferencia de operaciones).
 *
 * Efectos secundarios:
 * - Puede modificar tema global.
 * - Puede disparar descargas (exportación) y lectura de archivos (importación).
 * - Puede actualizar el estado global de DB en memoria.
 *
 * Manejo de errores:
 * - Exportación: captura errores genéricos al serializar/descargar y muestra toast rojo.
 * - Importación: valida archivo/JSON; muestra toast rojo si el payload es inválido.
 *
 * @example
 * openModal('Configuración', <ConfigModalBody />, 'wide')
 *
 * Notas de mantenimiento:
 * - Mantener compatibilidad del formato exportado/importado con `operacionesTransferService`.
 * - Evitar loguear contenido de operaciones (puede contener datos sensibles).
 */
function CuerpoModalConfiguracion() {
  const { navegar, esAdmin } = usarAplicacion()
  const { baseDatos, establecerBaseDatos } = usarBaseDatos()
  const { cerrarModal, mostrarToast, tema, establecerTema } = usarInterfaz()
  const [modoImportacion, establecerModoImportacion] = useState('merge')

  /**
   * Exporta operaciones actuales a un archivo JSON descargable.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Serializa `db.operaciones` a JSON.
   * 2) Construye un `Blob` y un ObjectURL para descargarlo.
   * 3) Crea un `<a>` temporal para iniciar la descarga.
   * 4) Revoca el ObjectURL y notifica por toast.
   *
   * Dependencias externas:
   * - `serializeOperaciones` para obtener JSON.
   * - APIs Web: `Blob`, `URL.createObjectURL`, `document.createElement`, `setTimeout`.
   *
   * Efectos secundarios:
   * - Dispara una descarga en el navegador.
   *
   * Manejo de errores:
   * - En cualquier error, muestra toast rojo y no descarga.
   *
   * @example
   * <button onClick={exportOps}>Exportar</button>
   *
   * Notas de mantenimiento:
   * - El nombre del archivo incluye fecha (YYYYMMDD) para evitar colisiones.
   */
  const exportarOperaciones = () => {
    try {
      const jsonOperaciones = serializarOperaciones(baseDatos?.operaciones || [])
      const archivoBlob = new Blob([jsonOperaciones], { type: 'application/json' })
      const urlDescarga = URL.createObjectURL(archivoBlob)
      const fecha = new Date()
      const ano = fecha.getFullYear()
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const dia = String(fecha.getDate()).padStart(2, '0')
      const enlaceDescarga = document.createElement('a')
      enlaceDescarga.href = urlDescarga
      enlaceDescarga.download = `operaciones-${ano}${mes}${dia}.json`
      document.body.appendChild(enlaceDescarga)
      enlaceDescarga.click()
      enlaceDescarga.remove()
      setTimeout(() => URL.revokeObjectURL(urlDescarga), 1200)
      mostrarToast('Operaciones exportadas', 'green')
    } catch {
      mostrarToast('No se pudo exportar', 'red')
    }
  }

  /**
   * Importa operaciones desde un archivo JSON (modo combinar o reemplazar).
   *
   * @param {File} file - Archivo seleccionado desde un `<input type="file">`.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Valida que exista archivo.
   * 2) Lee contenido con `FileReader` como texto.
   * 3) Parsea el payload usando `parseOperacionesPayload`.
   * 4) Según `mode`, combina por ID o reemplaza todo.
   * 5) Actualiza DB en memoria y notifica por toast.
   *
   * Dependencias externas:
   * - `FileReader` (API Web).
   * - `parseOperacionesPayload`, `mergeOperacionesById`.
   * - `setDb` (contexto DB) y `toast` (contexto UI).
   *
   * Efectos secundarios:
   * - Modifica el estado `db.operaciones` en memoria.
   *
   * Manejo de errores:
   * - Si el JSON es inválido o no cumple el esquema esperado, muestra toast rojo.
   *
   * @example
   * importOps(e.target.files?.[0])
   *
   * Notas de mantenimiento:
   * - Mantener tolerancia a cambios de esquema dentro de `parseOperacionesPayload`.
   */
  const importarOperaciones = (archivo) => {
    if (!archivo) return
    const lectorArchivo = new FileReader()
    lectorArchivo.onload = () => {
      try {
        const normalizarSubmareal = (v) => {
          if (v == null) return true
          if (v === true) return true
          if (v === false) return false
          if (v === 1 || v === '1') return true
          if (v === 0 || v === '0') return false
          return Boolean(v)
        }
        const operacionesEntrantes = parsearPayloadOperaciones(String(lectorArchivo.result || '')).map((op) => {
          const raw = op && typeof op === 'object' ? op : {}
          const botes = Array.isArray(raw?.botes) ? raw.botes : []
          const botesNormalizados = botes.map((b) => ({
            ...(b && typeof b === 'object' ? b : {}),
            submareal: normalizarSubmareal(b?.submareal),
          }))
          return { ...raw, botes: botesNormalizados }
        })
        establecerBaseDatos((prev) => {
          const operacionesActuales = prev?.operaciones || []
          const operacionesSiguientes =
            modoImportacion === 'replace' ? operacionesEntrantes : combinarOperacionesPorId(operacionesActuales, operacionesEntrantes)
          return { ...prev, operaciones: operacionesSiguientes }
        })
        mostrarToast('Operaciones importadas', 'green')
      } catch {
        mostrarToast('Archivo inválido', 'red')
      }
    }
    lectorArchivo.readAsText(archivo)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="cfg-row">
        <div>
          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Tema Oscuro</div>
        </div>
        <div className="form-check form-switch" style={{ margin: 0 }}>
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="cfg-theme"
            checked={tema === 'dark'}
            onChange={(e) => {
              /**
               * Actualiza el tema global según el estado del switch.
               *
               * @param {import('react').ChangeEvent<HTMLInputElement>} e - Evento de cambio del input.
               * @returns {void} No retorna valor.
               *
               * Lógica:
               * 1) Lee `e.target.checked`.
               * 2) Setea `dark` si está activado, o `light` en caso contrario.
               *
               * Dependencias externas:
               * - `setTheme` (contexto UI).
               *
               * Efectos secundarios:
               * - Cambia el tema visual global de la aplicación.
               *
               * Manejo de errores:
               * - No aplica (operación simple).
               *
               * @example
               * <input onChange={...} />
               *
               * Notas de mantenimiento:
               * - Mantener sincronía con el valor `theme` para que el switch sea controlado.
               */
              establecerTema(e.target.checked ? 'dark' : 'light')
            }}
            style={{ width: '3.2em', height: '1.7em', cursor: 'pointer' }}
          />
        </div>
      </div>

      {esAdmin ? (
        <>
          <div className="cfg-row">
            <div>
              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Panel Admin</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Acceso a usuarios/roles y auditoría</div>
            </div>
            <button
              className="btn b-out b-sm"
              onClick={() => {
                /**
                 * Cierra el modal y navega al panel de administración.
                 *
                 * @returns {void} No retorna valor.
                 *
                 * Lógica:
                 * 1) Cierra el modal actual.
                 * 2) Navega a la página `'admin'`.
                 *
                 * Dependencias externas:
                 * - `closeModal` (contexto UI).
                 * - `navigate` (contexto App).
                 *
                 * Efectos secundarios:
                 * - Cambia navegación y estado de UI (modal).
                 *
                 * Manejo de errores:
                 * - No gestiona errores; se asume navegación válida.
                 *
                 * @example
                 * <button onClick={...}>Abrir</button>
                 *
                 * Notas de mantenimiento:
                 * - Mantener la ruta `'admin'` sincronizada con el router/estado de app.
                 */
                cerrarModal()
                navegar('admin')
              }}
            >
              Abrir
            </button>
          </div>

          <div className="cfg-row">
            <div>
              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Exportar operaciones</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Descarga un JSON para migrar a otra PC</div>
            </div>
            <button className="btn b-teal b-sm" onClick={exportarOperaciones}>
              Exportar
            </button>
          </div>

          <div className="cfg-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Importar operaciones</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Carga un JSON exportado previamente</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <select className="is" style={{ maxWidth: 220 }} value={modoImportacion} onChange={(e) => establecerModoImportacion(e.target.value)}>
                  <option value="merge">Combinar por ID</option>
                  <option value="replace">Reemplazar todo</option>
                </select>
                <input
                  className="ii"
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    /**
                     * Dispara importación de operaciones desde el archivo seleccionado.
                     *
                     * @param {import('react').ChangeEvent<HTMLInputElement>} e - Evento de selección de archivo.
                     * @returns {void} No retorna valor.
                     *
                     * Lógica:
                     * 1) Obtiene el primer archivo (`files[0]`).
                     * 2) Delegar a `importOps(file)` para lectura y persistencia en memoria.
                     *
                     * Dependencias externas:
                     * - `importOps` (helper local).
                     *
                     * Efectos secundarios:
                     * - Puede actualizar `db.operaciones`.
                     *
                     * Manejo de errores:
                     * - `importOps` muestra toasts por errores de parseo.
                     *
                     * @example
                     * <input type="file" onChange={...} />
                     *
                     * Notas de mantenimiento:
                     * - Mantener `accept` para evitar tipos no deseados.
                     */
                    importarOperaciones(e?.target?.files?.[0])
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="info-box blue">
          <span>i</span>
          <div>Las opciones extras están disponibles solo para Admin.</div>
        </div>
      )}

      <button className="btn b-teal" onClick={cerrarModal}>
        Cerrar
      </button>
    </div>
  )
}

function CuerpoModalTutoriales() {
  const { cerrarModal } = usarInterfaz()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="cfg-row">
        <div>
          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Tutorial Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Recorre el dashboard paso a paso</div>
        </div>
        <button
          className="btn b-teal b-sm"
          onClick={() => {
            cerrarModal()
            window.dispatchEvent(new CustomEvent('bitecma:tutorial', { detail: { action: 'start', tour: 'dashboard' } }))
          }}
        >
          Iniciar
        </button>
      </div>

      <div className="cfg-row">
        <div>
          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Tutorial Operaciones</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Simula crear una operación (página señuelo)</div>
        </div>
        <button
          className="btn b-teal b-sm"
          onClick={() => {
            cerrarModal()
            window.dispatchEvent(new CustomEvent('bitecma:tutorial', { detail: { action: 'start', tour: 'ops' } }))
          }}
        >
          Iniciar
        </button>
      </div>

      <button className="btn b-teal" onClick={cerrarModal}>
        Cerrar
      </button>
    </div>
  )
}

/**
 * Renderiza la barra superior (Topbar) con branding, breadcrumb y accesos rápidos.
 *
 * @returns {import('react').JSX.Element} Elemento React que compone la barra superior.
 *
 * Lógica:
 * 1) Lee navegación/usuario/página/rol desde el contexto de app.
 * 2) Lee acciones UI para modal y sidebar desde el contexto de UI.
 * 3) Resuelve el label de breadcrumb según `page`.
 * 4) Renderiza:
 *    - Botón de menú (móvil) que alterna sidebar.
 *    - Logo clickeable para volver a dashboard.
 *    - Breadcrumb (Inicio / sección actual).
 *    - Acciones: abrir configuración y acceso a perfil.
 *
 * Dependencias externas:
 * - [useApp](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx): `navigate`, `user`, `page`, `role`.
 * - [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx): `openModal`, `toggleSidebar`.
 * - [SvgIcon](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/svgIcon.jsx).
 *
 * Efectos secundarios:
 * - Puede cambiar la navegación (dashboard/perfil).
 * - Puede abrir un modal de configuración.
 * - Puede alternar el sidebar (móvil).
 *
 * Manejo de errores:
 * - No gestiona errores explícitos; se apoya en los contextos.
 *
 * @example
 * <Topbar />
 *
 * Notas de mantenimiento:
 * - Mantener el mapping de `page -> label` en sincronía con las páginas reales.
 * - Evitar lógica compleja en render; mover a helpers si crece.
 */
export default function BarraSuperior() {
  const { navegar, usuario, pagina, rol } = usarAplicacion()
  const { abrirModal, alternarBarraLateral, historialToast, vaciarHistorialToast, mostrarToast } = usarInterfaz()
  const etiquetaActual =
    {
      dashboard: 'Dashboard',
      ops: 'Operaciones',
      'ops-tutorial': 'Operaciones (Tutorial)',
      evadir: 'EVADIR',
      historico: 'Registro Histórico',
      informe: 'Informe',
      especies: 'Especies',
      sectores: 'Sectores',
      orgs: 'Organizaciones',
      botes: 'Botes',
      perfil: 'Perfil',
      admin: 'Admin',
    }[String(pagina || 'dashboard')] || 'Dashboard'

  const urlApi = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const avatarBruto = String(usuario?.avatar_url || usuario?.logo || '').trim()
  const srcAvatar =
    avatarBruto && (avatarBruto.startsWith('http') || avatarBruto.startsWith('data:') || avatarBruto.startsWith('blob:'))
      ? avatarBruto
      : avatarBruto && avatarBruto.startsWith('/')
        ? `${urlApi}${avatarBruto}`
        : avatarBruto && urlApi
          ? `${urlApi}/${avatarBruto.replace(/^\/+/, '')}`
          : ''

  const iniciales = String(usuario?.nombre || 'US')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="topbar">
      <button className="tb-btn tb-menu d-md-none" onClick={alternarBarraLateral} aria-label="Abrir menú">
        ≡
      </button>
      <div
        className="tb-logo"
        onClick={() => {
          /**
           * Navega al dashboard al hacer click en el logo.
           *
           * @returns {void} No retorna valor.
           *
           * Lógica:
           * 1) Llama `navigate('dashboard')`.
           *
           * Dependencias externas:
           * - `navigate` (contexto App).
           *
           * Efectos secundarios:
           * - Cambia la navegación global.
           *
           * Manejo de errores:
           * - No aplica (ruta interna controlada).
           *
           * @example
           * <div onClick={...} />
           *
           * Notas de mantenimiento:
           * - Mantener la ruta `'dashboard'` consistente con el estado de app.
           */
          navegar('dashboard')
        }}
      >
        <div className="tb-logo-icon">
          <img src={logoUrl} alt="BITECMA" />
        </div>
        <div className="tb-logo-text">
          BIT<span>ECMA</span>
        </div>
      </div>
      <div className="tb-sep"></div>
      <div className="tb-mob-loc">{etiquetaActual}</div>
      <div className="tb-bc" id="topbc">
        <span>Inicio</span>
        <span>/</span>
        <span className="cur">{etiquetaActual}</span>
      </div>
      <div className="tb-spacer"></div>
      <div className="tb-actions">
        <button
          className="tb-btn"
          title="Tutoriales"
          aria-label="Tutoriales"
          onClick={() => {
            abrirModal('Tutoriales', <CuerpoModalTutoriales />)
          }}
        >
          ?
        </button>
        <button
          className="tb-btn"
          title="Notificaciones"
          aria-label="Notificaciones"
          onClick={() =>
            abrirModal(
              'Notificaciones',
              <PanelHistorialNotificaciones />,
              'slim',
              <button
                type="button"
                className="btn b-out b-sm"
                disabled={!Array.isArray(historialToast) || !historialToast.length}
                onClick={() => {
                  vaciarHistorialToast?.()
                  mostrarToast?.('Notificaciones vaciadas', 'blue')
                }}
              >
                Vaciar notificaciones
              </button>,
            )
          }
          style={{ position: 'relative' }}
        >
          <IconoSvg name="bell" aria-hidden="true" />
          {Array.isArray(historialToast) && historialToast.length ? (
            <div className="tb-badge" aria-hidden="true">
              {historialToast.length > 9 ? '9+' : historialToast.length}
            </div>
          ) : null}
        </button>
        <button
          className="tb-btn"
          onClick={() => {
            /**
             * Abre el modal de configuración.
             *
             * @returns {void} No retorna valor.
             *
             * Lógica:
             * 1) Invoca `openModal` con título, contenido y tamaño.
             *
             * Dependencias externas:
             * - `openModal` (contexto UI).
             * - [ConfigModalBody](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/topbar.jsx) como contenido.
             *
             * Efectos secundarios:
             * - Muestra un modal en pantalla.
             *
             * Manejo de errores:
             * - No aplica (operación UI).
             *
             * @example
             * <button onClick={...}><SvgIcon name="gear" /></button>
             *
             * Notas de mantenimiento:
             * - Mantener el tamaño `'wide'` alineado a estilos disponibles del modal.
             */
            abrirModal('Configuración', <CuerpoModalConfiguracion />, 'wide')
          }}
        >
          <IconoSvg name="gear" aria-hidden="true" />
        </button>
        <div
          className="user-chip"
          onClick={() => {
            /**
             * Navega al perfil del usuario al hacer click en el chip.
             *
             * @returns {void} No retorna valor.
             *
             * Lógica:
             * 1) Llama `navigate('perfil')`.
             *
             * Dependencias externas:
             * - `navigate` (contexto App).
             *
             * Efectos secundarios:
             * - Cambia navegación global.
             *
             * Manejo de errores:
             * - No aplica.
             *
             * @example
             * <div className="user-chip" onClick={...} />
             *
             * Notas de mantenimiento:
             * - Mantener `'perfil'` consistente con el routing interno.
             */
            navegar('perfil')
          }}
        >
          <div
            className="user-av"
            id="tb-user-av"
            style={{
              backgroundImage: srcAvatar ? `url('${srcAvatar}')` : '',
              backgroundSize: srcAvatar ? 'cover' : '',
              backgroundPosition: srcAvatar ? 'center' : '',
              backgroundRepeat: srcAvatar ? 'no-repeat' : '',
            }}
          >
            {srcAvatar ? null : iniciales}
          </div>
          <div>
            <div className="user-name" id="tb-user-name">
              {usuario?.nombre || 'Usuario'}
            </div>
            <div className="user-role" id="tb-user-role">
              {rol || usuario?.rol || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
