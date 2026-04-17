import { useMemo, useRef, useState } from 'react'
import {
  addEspecieToUnidad,
  calcDensidad,
  crearUnidades,
  eliminarUnidad,
  removeEspecieFromUnidad,
  setCuadranteEspecie,
  setUnidadCoord,
  setUnidadCount,
  updateUnidad,
} from '../../services/densidadService.js'

function focusNextInput(from, root) {
  const container = root || document
  const inputs = Array.from(container.querySelectorAll('input[data-nav="dens"]'))
  const idx = inputs.indexOf(from)
  if (idx < 0) return
  const next = inputs[idx + 1]
  if (!next) return
  next.focus()
  next.select?.()
}

export default function DensidadTab({ op, bote, especies, updateOperacion, toast, openModal, closeModal }) {
  const rootRef = useRef(null)
  const [openUnits, setOpenUnits] = useState(() => new Set())

  const unidades = useMemo(() => {
    const arr = Array.isArray(bote?.transectos) ? bote.transectos : []
    return [...arr].sort((a, b) => (Number(a?.num) || 0) - (Number(b?.num) || 0))
  }, [bote?.transectos])

  const especiesDens = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.filter((e) => e?.dens)
  }, [especies])

  const byId = useMemo(() => {
    const m = new Map()
    especiesDens.forEach((e) => m.set(Number(e.id), e))
    return m
  }, [especiesDens])

  const toggleUnit = (num) => {
    setOpenUnits((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const openCrearUnidades = () => {
    const Body = () => {
      const [form, setForm] = useState(() => ({
        tipo: bote?.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto',
        cantidad: 5,
        area: bote?.densTipo === 'cuadrante' ? 1 : 120,
        fecha: String(op?.fechaInicio || ''),
        sustrato: '',
        cubierta: '',
        especieId: '',
      }))

      const canSave = form.tipo !== 'cuadrante' || String(form.especieId || '').trim() !== ''

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Tipo</label>
              <select className="is" value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}>
                <option value="transecto">Transectos</option>
                <option value="cuadrante">Cuadrantes</option>
              </select>
            </div>
            <div className="ig">
              <label className="il">Cantidad</label>
              <input
                className="ii"
                type="number"
                value={form.cantidad}
                onChange={(e) => setForm((s) => ({ ...s, cantidad: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <div className="i2">
            <div className="ig">
              <label className="il">Área</label>
              <input
                className="ii"
                type="number"
                step="any"
                value={form.area}
                onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))}
              />
            </div>
            <div className="ig">
              <label className="il">Fecha</label>
              <input className="ii" type="date" value={form.fecha} onChange={(e) => setForm((s) => ({ ...s, fecha: e.target.value }))} />
            </div>
          </div>

          {form.tipo === 'cuadrante' ? (
            <div className="ig">
              <label className="il">Especie (cuadrante)</label>
              <select className="is" value={form.especieId} onChange={(e) => setForm((s) => ({ ...s, especieId: e.target.value }))}>
                <option value="">Selecciona...</option>
                {especiesDens.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.com}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="i2">
            <div className="ig">
              <label className="il">Sustrato</label>
              <input className="ii" value={form.sustrato} onChange={(e) => setForm((s) => ({ ...s, sustrato: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Cubierta biológica</label>
              <input className="ii" value={form.cubierta} onChange={(e) => setForm((s) => ({ ...s, cubierta: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return
                updateOperacion(op.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const nextUnits = crearUnidades({
                      unidades: x.transectos,
                      tipo: form.tipo,
                      cantidad: form.cantidad,
                      area: form.area,
                      fecha: form.fecha,
                      sustrato: form.sustrato,
                      cubierta: form.cubierta,
                      especieId: form.especieId,
                    })
                    return { ...x, transectos: nextUnits }
                  })
                  return { ...cur, botes: nextBotes }
                })
                closeModal()
                toast?.('Unidades creadas', 'green')
              }}
            >
              Crear
            </button>
          </div>
        </div>
      )
    }

    openModal('Crear unidades de densidad', <Body />, 'wide')
  }

  return (
    <div ref={rootRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
          {bote?.densTipo === 'cuadrante' ? 'Cuadrantes' : 'Transectos'}
        </div>
        <button className="btn b-teal b-sm" onClick={openCrearUnidades}>
          + Crear
        </button>
      </div>

      {unidades.length === 0 ? (
        <div className="info-box amber">
          <span>i</span>
          <div>Sin unidades de densidad. Crea transectos/cuadrantes para comenzar.</div>
        </div>
      ) : (
        unidades.map((t) => {
          const num = Number(t?.num) || 0
          const isCuad = t?.tipo === 'cuadrante'
          const open = openUnits.has(num)
          const counts = t?.counts && typeof t.counts === 'object' ? t.counts : {}
          const spIds = Object.keys(counts)
            .map(Number)
            .filter((x) => Number.isFinite(x))
            .sort((a, b) => a - b)
          const usedSet = new Set(spIds)
          const addable = especiesDens.filter((e) => !usedSet.has(Number(e.id)))
          const area = Number(t.area) || 0
          const coordX = t?.coordX ?? ''
          const coordY = t?.coordY ?? ''
          const coordLong = t?.coordLong ?? ''
          const coordLat = t?.coordLat ?? ''

          return (
            <div key={`${bote.id}-${num}`} className={`tx-card${isCuad ? ' cuad' : ''}`}>
              <div className="tx-hd" onClick={() => toggleUnit(num)}>
                <div style={{ fontWeight: 800, color: 'var(--navy)' }}>
                  {isCuad ? `C-${num}` : `T-${num}`} · Área {area || '—'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{String(t.fecha || op.fechaInicio || '') || '—'}</span>
                  <button
                    className="btn b-out b-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Eliminar ${isCuad ? 'C' : 'T'}-${num}?`)) return
                      updateOperacion(op.id, (cur) => {
                        const nextBotes = (cur.botes || []).map((x) => {
                          if (x.id !== bote.id) return x
                          return { ...x, transectos: eliminarUnidad(x.transectos, num) }
                        })
                        return { ...cur, botes: nextBotes }
                      })
                      toast?.('Unidad eliminada', 'green')
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className={`tx-body${open ? ' open' : ''}`}>
                <div className="i2">
                  <div className="ig">
                    <label className="il">Área</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      value={t.area ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { area: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Fecha</label>
                    <input
                      className="ii"
                      type="date"
                      value={String(t.fecha || '')}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { fecha: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">Sustrato</label>
                    <input
                      className="ii"
                      value={t.sustrato || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { sustrato: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Cubierta biológica</label>
                    <input
                      className="ii"
                      value={t.cubierta || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { cubierta: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">X</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordX}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'x', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Y</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordY}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'y', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">LONG</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordLong}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lon', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">LAT</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordLat}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lat', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                {isCuad ? (
                  <div className="ig">
                    <label className="il">Especie (cuadrante)</label>
                    <select
                      className="is"
                      value={String(t.especieId ?? spIds[0] ?? '')}
                      onChange={(e) => {
                        const nextId = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setCuadranteEspecie(x.transectos, num, nextId) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    >
                      <option value="">Selecciona...</option>
                      {especiesDens.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.com}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
                  {!isCuad ? (
                    <div className="ig" style={{ marginBottom: 0, minWidth: 240 }}>
                      <label className="il">Agregar especie</label>
                      <select
                        className="is"
                        value=""
                        onChange={(e) => {
                          const spId = e.target.value
                          if (!spId) return
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: addEspecieToUnidad(x.transectos, num, spId) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                          e.target.value = ''
                        }}
                      >
                        <option value="">Selecciona...</option>
                        {addable.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.com}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table className="tbl lp-tbl">
                    <thead>
                      <tr>
                        <th>Especie</th>
                        <th>N° IND</th>
                        <th>Dens</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {spIds.length ? (
                        spIds.map((spId) => {
                          const sp = byId.get(Number(spId))
                          const cnt = Number(counts?.[spId] ?? 0)
                          const dens = calcDensidad(cnt, area)
                          return (
                            <tr key={`${num}-${spId}`}>
                              <td style={{ textAlign: 'left' }}>{sp?.com || spId}</td>
                              <td>
                                <input
                                  className="ii lp-num-inp"
                                  style={{ width: 90, textAlign: 'center' }}
                                  type="number"
                                  step="1"
                                  min="0"
                                  data-nav="dens"
                                  value={String(cnt)}
                                  onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return
                                    e.preventDefault()
                                    focusNextInput(e.currentTarget, rootRef.current)
                                  }}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    updateOperacion(op.id, (cur) => {
                                      const nextBotes = (cur.botes || []).map((x) => {
                                        if (x.id !== bote.id) return x
                                        return { ...x, transectos: setUnidadCount(x.transectos, num, spId, v) }
                                      })
                                      return { ...cur, botes: nextBotes }
                                    })
                                  }}
                                />
                              </td>
                              <td>{dens.toFixed(4)}</td>
                              <td style={{ textAlign: 'right' }}>
                                {!isCuad ? (
                                  <button
                                    className="btn b-out b-sm"
                                    onClick={() => {
                                      updateOperacion(op.id, (cur) => {
                                        const nextBotes = (cur.botes || []).map((x) => {
                                          if (x.id !== bote.id) return x
                                          return { ...x, transectos: removeEspecieFromUnidad(x.transectos, num, spId) }
                                        })
                                        return { ...cur, botes: nextBotes }
                                      })
                                    }}
                                  >
                                    Quitar
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)' }}>
                            {isCuad ? 'Selecciona especie' : 'Agrega especies para contar'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

