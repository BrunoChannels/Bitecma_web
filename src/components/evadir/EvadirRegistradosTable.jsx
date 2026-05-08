import { useEffect, useMemo, useState } from 'react'
import { useEvadirRegistrados } from '../../hooks/useEvadirRegistrados.js'
import { fmtDMY } from '../../services/evadirService.js'
import { useDb } from '../../context/dbContext.jsx'
import { useUi } from '../../context/uiContext.jsx'
import { exportEvadirXlsx } from '../../utils/evadirExport.js'
import EvadirPreview from './EvadirPreview.jsx'

/**
 * Tabla de EVADIR registrados (histórico) con filtros y acciones (ver / exportar).
 *
 * @returns {import('react').JSX.Element} Tabla con filtros por texto y región.
 *
 * Lógica:
 * 1) Obtiene DB (operaciones, perfiles, regiones) y flags de API desde el contexto.
 * 2) Carga perfiles si la API está habilitada.
 * 3) Construye maps (`perfilById`, `opById`) para resolver nombres y operaciones rápidamente.
 * 4) Filtra filas por texto y región.
 * 5) Renderiza tabla con botón “Ver” (modal con previsualización) y “CSV” (exportación).
 *
 * Dependencias externas:
 * - [useEvadirRegistrados](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/hooks/useEvadirRegistrados.js): fuente de filas.
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx): db, perfiles, operaciones.
 * - [useUi](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/uiContext.jsx): modal/toast.
 * - `exportEvadirXlsx` para exportación.
 * - [EvadirPreview](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/evadir/EvadirPreview.jsx) para vista previa.
 *
 * Efectos secundarios:
 * - Puede disparar carga de perfiles vía API.
 * - Puede abrir modales y disparar descargas/exportaciones.
 *
 * Manejo de errores:
 * - No gestiona errores explícitos aquí; delega en `ensurePerfilesLoaded`, `exportEvadirXlsx` y toasts.
 *
 * @example
 * <EvadirRegistradosTable />
 *
 * Notas de mantenimiento:
 * - Mantener `resolveNombrePersona` robusto ante esquemas mixtos de perfiles/usuarios.
 * - Si crece el listado, considerar paginación o virtualización.
 */
export default function EvadirRegistradosTable() {
  const { db, apiEnabled, ensurePerfilesLoaded } = useDb()
  const { toast, openModal, closeModal } = useUi()
  const { rows } = useEvadirRegistrados()
  const regiones = Array.isArray(db?.regionesChile) ? db.regionesChile : []
  const [q, setQ] = useState('')
  const [regionId, setRegionId] = useState('')

  useEffect(() => {
    if (!apiEnabled) return
    ensurePerfilesLoaded?.()
  }, [apiEnabled, ensurePerfilesLoaded])

  const perfilById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(db?.perfiles) ? db.perfiles : []).forEach((p) => {
      const id = p?.id
      if (id == null) return
      map.set(String(id), p)
    })
    return map
  }, [db])

  const opById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(db?.operaciones) ? db.operaciones : []).forEach((o) => {
      const id = o?.id
      if (!id) return
      map.set(String(id), o)
    })
    return map
  }, [db])

  /**
   * Resuelve una representación legible de una persona (creador/importador) desde distintas formas de dato.
   *
   * @param {unknown} v - Valor a resolver (puede ser objeto perfil/usuario, ID, email o string libre).
   * @returns {string} Nombre legible; string vacío si no hay información.
   *
   * Lógica:
   * 1) Si es objeto, intenta `nombre/name`, luego `nombres+apellidos`, luego `correo/email`.
   * 2) Si es string, intenta resolverlo como ID de perfil en `perfilById`.
   * 3) Si no hay match, retorna el string crudo.
   *
   * Dependencias externas:
   * - `perfilById` (memo) para resolver IDs a perfil.
   *
   * Efectos secundarios:
   * - Ninguno.
   *
   * Manejo de errores:
   * - Tolerante a `null/undefined` y esquemas mixtos.
   *
   * @example
   * resolveNombrePersona({ nombres: 'Ana', apellidos: 'Pérez' }) // 'Ana Pérez'
   *
   * Notas de mantenimiento:
   * - Si el backend estandariza campos, simplificar esta función.
   */
  const resolveNombrePersona = (v) => {
    if (v == null) return ''

    if (typeof v === 'object') {
      const nombre = String(v?.nombre || v?.name || '').trim()
      if (nombre) return nombre
      const nombres = String(v?.nombres || '').trim()
      const apellidos = String(v?.apellidos || '').trim()
      const full = String(`${nombres} ${apellidos}`).trim()
      if (full) return full
      const correo = String(v?.correo || v?.email || '').trim()
      if (correo) return correo
      return ''
    }

    const raw = String(v).trim()
    if (!raw) return ''
    const p = perfilById.get(raw)
    if (p) return resolveNombrePersona(p)
    return raw
  }

  /**
   * Obtiene una etiqueta de “creador” para una operación, soportando múltiples claves posibles.
   *
   * @param {object|null} op - Operación (puede ser null si no está en DB local).
   * @returns {string} Nombre del creador/importador, o '—' si no se puede resolver.
   *
   * Lógica:
   * 1) Busca campos de importador (importedBy*) en distintas variantes de nombres.
   * 2) Si no hay importador, busca campos de creador (createdBy*, creador*, user*, etc.).
   * 3) Resuelve el nombre final con `resolveNombrePersona`.
   *
   * Dependencias externas:
   * - `resolveNombrePersona`.
   *
   * Efectos secundarios:
   * - Ninguno.
   *
   * Manejo de errores:
   * - Tolerante a operaciones parcialmente cargadas.
   *
   * @example
   * const label = getCreadorLabel(op)
   *
   * Notas de mantenimiento:
   * - Si se normalizan nombres de campos (snake/camel), reducir lista de aliases.
   */
  const getCreadorLabel = (op) => {
    const o = op && typeof op === 'object' ? op : {}

    const importer =
      o?.importedByName ??
      o?.imported_by_name ??
      o?.importedBy ??
      o?.imported_by ??
      o?.importador ??
      o?.importadoPor ??
      o?.importado_por ??
      o?.importedByUser ??
      o?.imported_by_user ??
      o?.importedById ??
      o?.imported_by_id ??
      o?.importUserId ??
      o?.import_user_id ??
      null

    const creator =
      o?.createdByName ??
      o?.created_by_name ??
      o?.createdBy ??
      o?.created_by ??
      o?.creador ??
      o?.creadoPor ??
      o?.creado_por ??
      o?.usuario ??
      o?.user ??
      o?.usuarioId ??
      o?.usuario_id ??
      o?.userId ??
      o?.user_id ??
      o?.owner ??
      o?.ownerId ??
      null

    const nombre = resolveNombrePersona(importer || creator)
    return nombre || '—'
  }

  const filtered = useMemo(() => {
    const qq = String(q || '').toLowerCase().trim()
    const rid = String(regionId || '')
    return (rows || [])
      .filter((r) => (!rid ? true : String(r?.region ?? '') === rid))
      .filter((r) => {
        if (!qq) return true
        return (
          String(r?.sector || '').toLowerCase().includes(qq) ||
          String(r?.id || '').toLowerCase().includes(qq) ||
          String(r?.numSeg ?? '').toLowerCase().includes(qq)
        )
      })
  }, [rows, q, regionId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <input
            className="flt"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar EVADIR..."
            style={{ width: '100%' }}
          />
        </div>
        <select className="flt" value={regionId} onChange={(e) => setRegionId(e.target.value)} style={{ minWidth: 220 }}>
          <option value="">Todas las regiones</option>
          {regiones.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.rom} — {r.nom}
            </option>
          ))}
        </select>
      </div>

      <table className="tbl tbl-static-mobile evadir-rt">
        <thead>
          <tr>
            <th>Sector</th>
            <th>SEG/ESBA</th>
            <th className="evadir-rt-hide-mobile">Creador</th>
            <th>Fecha</th>
            <th className="evadir-rt-hide-mobile">Transectos/Cuadrantes</th>
            <th className="evadir-rt-hide-mobile">Botes</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>
                Sin resultados
              </td>
            </tr>
          ) : (
            filtered.map((r) => {
              const op = opById.get(String(r?.id || '')) || null
              const creador = getCreadorLabel(op)
              const txCqUI =
                r.totalTx > 0 || r.totalCq > 0 ? (
                  <>
                    {r.totalTx ? (
                      <span className="pill p-blu" style={{ fontSize: 10 }}>
                        T {r.totalTx}
                      </span>
                    ) : null}{' '}
                    {r.totalCq ? (
                      <span className="pill p-pur" style={{ fontSize: 10 }}>
                        C {r.totalCq}
                      </span>
                    ) : null}
                  </>
                ) : (
                  '—'
                )

              return (
                <tr key={r.id}>
                  <td className="evadir-rt-sector">{r.sector}</td>
                  <td>SEG-{r.numSeg}</td>
                  <td className="evadir-rt-hide-mobile">{creador}</td>
                  <td>{fmtDMY(r.fechaInicio)}</td>
                  <td className="evadir-rt-hide-mobile">{txCqUI}</td>
                  <td className="evadir-rt-hide-mobile">{r.totalBotes}</td>
                  <td className="evadir-rt-action">
                    <button
                      className="btn b-out b-xs"
                      onClick={() => {
                        openModal(
                          'Previsualización EVADIR',
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <EvadirPreview db={db} op={op} />
                            <button className="btn b-teal" onClick={closeModal}>
                              Cerrar
                            </button>
                          </div>,
                          'full',
                        )
                      }}
                    >
                      Ver
                    </button>{' '}
                    <button className="btn b-teal b-xs" onClick={() => exportEvadirXlsx({ db, opId: r.id, toast })}>
                      EXCEL
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
