import { useEffect, useMemo, useState } from 'react'
import { useEvadirRegistrados } from '../../hooks/useEvadirRegistrados.js'
import { fmtDMY } from '../../services/evadirService.js'
import { useDb } from '../../context/dbContext.jsx'
import { useUi } from '../../context/uiContext.jsx'
import { exportEvadirXlsx } from '../../utils/evadirExport.js'
import EvadirPreview from './EvadirPreview.jsx'

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
  }, [db?.perfiles])

  const opById = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(db?.operaciones) ? db.operaciones : []).forEach((o) => {
      const id = o?.id
      if (!id) return
      map.set(String(id), o)
    })
    return map
  }, [db?.operaciones])

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

      <table className="tbl">
        <thead>
          <tr>
            <th>Sector</th>
            <th>SEG/ESBA</th>
            <th>Creador</th>
            <th>Fecha</th>
            <th>Transectos/Cuadrantes</th>
            <th>Botes</th>
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
                  <td>{r.sector}</td>
                  <td>SEG-{r.numSeg}</td>
                  <td>{creador}</td>
                  <td>{fmtDMY(r.fechaInicio)}</td>
                  <td>{txCqUI}</td>
                  <td>{r.totalBotes}</td>
                  <td>
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
                      CSV
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
