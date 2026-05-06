import { useEffect, useMemo, useRef, useState } from 'react'
import DensidadTab from './DensidadTab.jsx'
import LpTab from './LpTab.jsx'

function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function BoteCard({ op, bote, especies, updateOperacion, toast, openModal, closeModal, lpJump }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('dens')
  const rootRef = useRef(null)
  const lastTokenRef = useRef(null)

  const matchesJump = useMemo(() => {
    const token = lpJump?.token ?? null
    if (!token) return false
    const opId = String(lpJump?.opId ?? '')
    if (!opId || String(op?.id ?? '') !== opId) return false
    const byId = lpJump?.boteId != null && String(lpJump.boteId) !== '' ? String(lpJump.boteId) : null
    if (byId) return String(bote?.id ?? '') === byId
    if (!normKey(bote?.nombre) || normKey(bote?.nombre) !== normKey(lpJump?.boteNombre)) return false
    if (lpJump?.buzo && normKey(bote?.buzo) !== normKey(lpJump?.buzo)) return false
    if (lpJump?.zona != null && Number(bote?.zona) !== Number(lpJump?.zona)) return false
    return true
  }, [lpJump, op?.id, bote?.id, bote?.nombre, bote?.buzo, bote?.zona])

  useEffect(() => {
    const token = lpJump?.token ?? null
    if (!token || lastTokenRef.current === token) return
    const opId = String(lpJump?.opId ?? '')
    if (!opId || String(op?.id ?? '') !== opId) return

    const byId = lpJump?.boteId != null && String(lpJump.boteId) !== '' ? String(lpJump.boteId) : null
    const matchId = byId ? String(bote?.id ?? '') === byId : false
    const matchName =
      !byId &&
      normKey(bote?.nombre) &&
      normKey(bote?.nombre) === normKey(lpJump?.boteNombre) &&
      (!lpJump?.buzo || normKey(bote?.buzo) === normKey(lpJump?.buzo)) &&
      (lpJump?.zona == null || Number(bote?.zona) === Number(lpJump?.zona))

    if (!matchId && !matchName) return

    lastTokenRef.current = token
    setOpen(true)
    setTab('lp')
    setTimeout(() => {
      rootRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    }, 0)
  }, [lpJump, op?.id, bote?.id, bote?.nombre, bote?.buzo, bote?.zona])

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
    <div className="bote-card" ref={rootRef}>
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
            toast={toast}
            openModal={openModal}
            closeModal={closeModal}
            lpJump={matchesJump ? lpJump : null}
          />
        )}
      </div>
    </div>
  )
}
