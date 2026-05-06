import { useMemo, useState } from 'react'
import DensidadTab from './DensidadTab.jsx'
import LpTab from './LpTab.jsx'

export default function BoteCard({ op, bote, especies, updateOperacion, canWrite, toast, openModal, closeModal, lpJump }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('dens')

  const densSpecies = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    const byId = new Map(arr.map((e) => [Number(e?.id), e]))
    const transectos = Array.isArray(bote?.transectos) ? bote.transectos : []
    const ids = new Set()

    transectos.forEach((t) => {
      const counts = t?.counts && typeof t.counts === 'object' ? t.counts : {}
      Object.keys(counts)
        .map(Number)
        .filter((x) => Number.isFinite(x))
        .forEach((id) => ids.add(id))

      if (t?.tipo === 'cuadrante') {
        const spId = Number(t?.especieId)
        if (Number.isFinite(spId)) ids.add(spId)
      }
    })

    return [...ids]
      .sort((a, b) => a - b)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((sp) => String(sp?.com || sp?.sci || '').trim())
      .filter(Boolean)
  }, [bote, especies])

  const totalUnidades = Array.isArray(bote?.transectos) ? bote.transectos.length : 0
  const totalMuestras = (() => {
    const map = bote?.lpMuestras && typeof bote.lpMuestras === 'object' ? bote.lpMuestras : {}
    return Object.values(map).reduce((acc, entry) => {
      if (Array.isArray(entry)) return acc + entry.length
      if (entry && typeof entry === 'object') {
        if (Array.isArray(entry.ms)) return acc + entry.ms.length
        return (
          acc +
          ['LP', 'L', 'D'].reduce((s, k) => {
            const arr = entry?.[k]
            return s + (Array.isArray(arr) ? arr.length : 0)
          }, 0)
        )
      }
      return acc
    }, 0)
  })()

  return (
    <div className="bote-card">
      <div
        className={`bote-hd${open ? ' open-hd' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <div className={`bote-icon${open ? ' open-ic' : ''}`} />
          <div style={{ minWidth: 0 }}>
            <div className="bote-name">
              {bote?.nombre || '—'} · Zona {bote?.zona ?? '—'}
            </div>
            <div className="bote-meta">
              {bote?.buzo || '—'} · {bote?.densTipo === 'cuadrante' ? 'Cuadrantes' : 'Transectos'}
            </div>
            {densSpecies.length ? (
              <div className="bote-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {densSpecies.slice(0, 6).map((name, idx) => (
                  <span key={`${name}-${idx}`} className="pill p-blu" style={{ fontSize: 10 }}>
                    {name}
                  </span>
                ))}
                {densSpecies.length > 6 ? (
                  <span className="pill p-amb" style={{ fontSize: 10 }}>
                    +{densSpecies.length - 6}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="pill p-amb">{totalUnidades} unidades</span>
          <span className="pill p-teal">{totalMuestras} muestras</span>
        </div>
      </div>

      <div className={`bote-body${open ? ' open' : ''}`}>
        <div className="btabs">
          <div className={`btab${tab === 'dens' ? ' on' : ''}`} onClick={() => setTab('dens')}>
            Densidad
          </div>
          <div className={`btab${tab === 'lp' ? ' on' : ''}`} onClick={() => setTab('lp')}>
            Peso-Longitud
          </div>
        </div>

        {tab === 'dens' ? (
          <DensidadTab
            op={op}
            bote={bote}
            especies={especies}
            updateOperacion={updateOperacion}
            canWrite={canWrite}
            toast={toast}
            openModal={openModal}
            closeModal={closeModal}
          />
        ) : (
          <LpTab
            op={op}
            bote={bote}
            especies={especies}
            updateOperacion={updateOperacion}
            canWrite={canWrite}
            toast={toast}
            openModal={openModal}
            closeModal={closeModal}
            lpJump={lpJump}
          />
        )}
      </div>
    </div>
  )
}
