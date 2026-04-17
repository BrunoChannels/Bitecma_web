import { useState } from 'react'
import { useOperaciones } from '../hooks/useOperaciones.js'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { getOperacionMetricas } from '../services/operacionesService.js'
import BoteCard from '../components/ops/BoteCard.jsx'
import EvadirPreview from '../components/evadir/EvadirPreview.jsx'

function nextOpId(ops, year) {
  const y = String(year)
  const nums = ops
    .map((o) => String(o?.id || ''))
    .map((id) => {
      const m = id.match(/^OP-(\d{4})-(\d{3})$/)
      if (!m) return null
      if (m[1] !== y) return null
      return parseInt(m[2], 10)
    })
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `OP-${y}-${String(max + 1).padStart(3, '0')}`
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function OpsPage({ active }) {
  const { db, upsertOperacion, updateOperacion, deleteOperacion } = useDb()
  const { toast, openModal, closeModal } = useUi()
  const { filtered, sectores, meses, sector, setSector, mes, setMes, texto, setTexto, operaciones } =
    useOperaciones()

  const [expanded, setExpanded] = useState(() => new Set())

  const toggleExpanded = (opId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(opId)) next.delete(opId)
      else next.add(opId)
      return next
    })
  }

  const regiones = db?.regionesChile || []
  const sectorAmerb = db?.sectoresAmerb || []
  const opa = db?.opa || []

  const openNewOp = () => {
    const iso = todayISO()
    const y = iso.slice(0, 4)
    const baseRegion = regiones[0]?.id || 1
    const form = {
      region: baseRegion,
      sectorAmerbId: '',
      sectorAmerb: '',
      sector: '',
      tipoOrg: 'STI',
      opaId: '',
      org: '',
      numSeg: '',
      fechaInicio: iso,
      fechaFin: iso,
    }

    const Body = () => {
      const [s, setS] = useState(form)
      const amerbOpts = sectorAmerb.filter((a) => a.region === s.region).slice(0, 2000)
      const opaOpts = opa.filter((o) => o.region === s.region).slice(0, 2000)
      const onSave = () => {
        const segRaw = String(s.numSeg || '').trim()
        const segNum = segRaw === '' ? null : parseInt(segRaw, 10)
        if (segRaw !== '' && !Number.isFinite(segNum)) {
          toast('SEG inválido', 'red')
          return
        }
        if (!String(s.sector || '').trim()) {
          toast('Ingresa sector/caleta', 'red')
          return
        }
        const opId = nextOpId(operaciones, y)
        upsertOperacion({
          id: opId,
          region: s.region,
          sectorAmerbId: s.sectorAmerbId,
          sectorAmerb: s.sectorAmerb,
          sector: s.sector,
          tipoOrg: s.tipoOrg,
          org: s.org,
          opaId: s.opaId,
          numSeg: segNum,
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
          botes: [],
        })
        closeModal()
        toast('Operación creada', 'green')
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Región</label>
              <select
                className="is"
                value={s.region}
                onChange={(e) => setS((p) => ({ ...p, region: parseInt(e.target.value, 10) }))}
              >
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rom} — {r.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="ig">
              <label className="il">N° Seguimiento / ESBA</label>
              <input
                className="ii"
                placeholder="Ej: 16"
                value={s.numSeg}
                onChange={(e) => setS((p) => ({ ...p, numSeg: e.target.value }))}
              />
            </div>
          </div>
          <div className="ig">
            <label className="il">Sector AMERB</label>
            <select
              className="is"
              value={s.sectorAmerbId}
              onChange={(e) => {
                const id = e.target.value
                const f = amerbOpts.find((x) => String(x.id) === String(id))
                setS((p) => ({
                  ...p,
                  sectorAmerbId: id,
                  sectorAmerb: f?.nombreamerb || '',
                }))
              }}
            >
              <option value="">—</option>
              {amerbOpts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombreamerb}
                </option>
              ))}
            </select>
          </div>
          <div className="ig">
            <label className="il">Sector / Caleta</label>
            <input
              className="ii"
              value={s.sector}
              onChange={(e) => setS((p) => ({ ...p, sector: e.target.value }))}
            />
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">Tipo organización</label>
              <select
                className="is"
                value={s.tipoOrg}
                onChange={(e) => setS((p) => ({ ...p, tipoOrg: e.target.value }))}
              >
                <option value="STI">STI</option>
                <option value="ASOC">ASOC</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
            <div className="ig">
              <label className="il">Organización (OPA)</label>
              <select
                className="is"
                value={s.opaId}
                onChange={(e) => {
                  const id = e.target.value
                  const f = opaOpts.find((x) => String(x.id) === String(id))
                  setS((p) => ({ ...p, opaId: id, org: f?.nombre || '' }))
                }}
              >
                <option value="">—</option>
                {opaOpts.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombrecorto || o.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">Fecha inicio</label>
              <input
                className="ii"
                type="date"
                value={s.fechaInicio}
                onChange={(e) => setS((p) => ({ ...p, fechaInicio: e.target.value }))}
              />
            </div>
            <div className="ig">
              <label className="il">Fecha fin</label>
              <input
                className="ii"
                type="date"
                value={s.fechaFin}
                onChange={(e) => setS((p) => ({ ...p, fechaFin: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button className="btn b-teal" style={{ flex: 1 }} onClick={onSave}>
              Crear
            </button>
          </div>
        </div>
      )
    }

    openModal('Nueva operación', <Body />, 'wide')
  }

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-ops">
      <div className="ph">
        <div>
          <h2>Operaciones</h2>
          <p>
            Cada operación agrupa botes con sus datos de{' '}
            <strong>
              Peso-Longitud, Diametro del Disco de fijación y Transectos de
              densidad
            </strong>
          </p>
        </div>
        <div className="ph-a">
          <button className="btn b-out b-sm" onClick={() => toast('Subida EVADIR (pendiente)', 'blue')}>
            Subir EVADIR
          </button>
          <button className="btn b-teal b-sm" onClick={openNewOp}>
            Nueva operación
          </button>
        </div>
      </div>

      <div className="filters">
        <select className="flt" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Todos los sectores</option>
          {sectores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="flt" value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="">Todas las fechas</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="flt"
          type="text"
          placeholder="Buscar operación, buzo, org..."
          style={{ minWidth: 220 }}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button
          className="btn b-out b-sm"
          onClick={() => {
            setSector('')
            setMes('')
            setTexto('')
          }}
        >
          Limpiar
        </button>
        <span style={{ fontFamily: 'var(--ff-m)', fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
          {filtered.length} operaciones
        </span>
      </div>

      <div>
        {filtered.map((op) => {
          const open = expanded.has(op.id)
          const { totalTx, totalLPMuestras } = getOperacionMetricas(op)
          return (
            <div className="op-card card mb" key={op.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--navy)' }}>
                    {op.id} · SEG-{op.numSeg ?? '—'} · {op.sector}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {op.org} · {op.fechaInicio}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="pill p-pur">{(op.botes || []).length} botes</span>
                    <span className="pill p-blu">{totalTx} unidades densidad</span>
                    <span className="pill p-amb">{totalLPMuestras} muestras L-P</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn b-out b-sm" onClick={() => toggleExpanded(op.id)}>
                    {open ? 'Ocultar' : 'Abrir'}
                  </button>
                  <button
                    className="btn b-teal b-sm"
                    onClick={() => {
                      openModal(
                        'Previsualización EVADIR',
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <EvadirPreview db={db} op={op} />
                          <button className="btn b-teal" onClick={closeModal}>
                            Cerrar
                          </button>
                        </div>,
                        'wide',
                      )
                    }}
                  >
                    Previsualizar EVADIR
                  </button>
                  <button
                    className="btn b-out b-sm"
                    onClick={() => {
                      if (!confirm(`Eliminar ${op.id}?`)) return
                      deleteOperacion(op.id)
                      toast('Operación eliminada', 'green')
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {open ? (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
                      Botes
                    </div>
                    <button
                      className="btn b-teal b-sm"
                      onClick={() => {
                        const Body = () => {
                          const [b, setB] = useState({ nombre: '', buzo: '', zona: 1, densTipo: 'transecto' })
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div className="ig">
                                <label className="il">Nombre bote</label>
                                <input className="ii" value={b.nombre} onChange={(e) => setB((s) => ({ ...s, nombre: e.target.value }))} />
                              </div>
                              <div className="ig">
                                <label className="il">Buzo</label>
                                <input className="ii" value={b.buzo} onChange={(e) => setB((s) => ({ ...s, buzo: e.target.value }))} />
                              </div>
                              <div className="i2">
                                <div className="ig">
                                  <label className="il">Zona</label>
                                  <input className="ii" type="number" value={b.zona} onChange={(e) => setB((s) => ({ ...s, zona: parseInt(e.target.value, 10) || 1 }))} />
                                </div>
                                <div className="ig">
                                  <label className="il">Tipo densidad</label>
                                  <select className="is" value={b.densTipo} onChange={(e) => setB((s) => ({ ...s, densTipo: e.target.value }))}>
                                    <option value="transecto">Transecto</option>
                                    <option value="cuadrante">Cuadrante</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
                                  Cancelar
                                </button>
                                <button
                                  className="btn b-teal"
                                  style={{ flex: 1 }}
                                  onClick={() => {
                                    if (!String(b.nombre || '').trim()) {
                                      toast('Ingresa nombre del bote', 'red')
                                      return
                                    }
                                    updateOperacion(op.id, (cur) => {
                                      const nextBotes = Array.isArray(cur.botes) ? [...cur.botes] : []
                                      const nextId = `B${nextBotes.length + 1}`
                                      nextBotes.push({
                                        id: nextId,
                                        nombre: b.nombre,
                                        buzo: b.buzo,
                                        zona: b.zona,
                                        densTipo: b.densTipo,
                                        lpMuestras: {},
                                        transectos: [],
                                      })
                                      return { ...cur, botes: nextBotes }
                                    })
                                    closeModal()
                                    toast('Bote agregado', 'green')
                                  }}
                                >
                                  Agregar
                                </button>
                              </div>
                            </div>
                          )
                        }
                        openModal('Agregar bote', <Body />, 'slim')
                      }}
                    >
                      + Agregar bote
                    </button>
                  </div>

                  {(op.botes || []).length === 0 ? (
                    <div className="info-box amber">
                      <span>i</span>
                      <div>Esta operación no tiene botes aún.</div>
                    </div>
                  ) : (
                    (op.botes || [])
                      .slice()
                      .sort((a, b) => {
                        const za = Number(a?.zona) || 0
                        const zb = Number(b?.zona) || 0
                        if (za !== zb) return za - zb
                        return String(a?.nombre || '').localeCompare(String(b?.nombre || ''))
                      })
                      .map((b) => (
                        <BoteCard
                          key={b.id}
                          op={op}
                          bote={b}
                          especies={db?.especies || []}
                          updateOperacion={updateOperacion}
                          toast={toast}
                          openModal={openModal}
                          closeModal={closeModal}
                        />
                      ))
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
