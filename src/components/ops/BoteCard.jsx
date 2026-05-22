import { useEffect, useMemo, useRef, useState } from 'react'
import DensidadTab from './DensidadTab.jsx'
import LpTab from './LpTab.jsx'

/**
 * Normaliza un texto para comparaciones flexibles (sin acentos y espacios homogéneos).
 *
 * @param {unknown} v - Texto a normalizar.
 * @returns {string} Texto normalizado (minúsculas, sin diacríticos, espacios colapsados).
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Pasa a minúsculas.
 * 3) Normaliza unicode y elimina diacríticos.
 * 4) Colapsa espacios múltiples y recorta.
 *
 * Dependencias externas:
 * - APIs estándar de string (`normalize`).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normKey('Bote Águila  1') // "bote aguila 1"
 *
 * Notas de mantenimiento:
 * - Mantener consistente con otras funciones `normKey/normHeader` del proyecto.
 */
function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tarjeta UI para un bote dentro de una operación.
 *
 * Muestra un header colapsable con resumen y dos pestañas: Densidad y Peso-Longitud.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.op - Operación actual (contiene `id`, fechas, etc.).
 * @param {object} props.bote - Bote actual (contiene `id`, `nombre`, `zona`, `buzo`, `transectos`, `lpMuestras`, etc.).
 * @param {Array<object>} props.especies - Catálogo de especies para resolver labels.
 * @param {(opId: string, updater: (cur: any) => any) => void} props.updateOperacion - Función para actualizar la operación en el store (inmutable).
 * @param {boolean} props.canWrite - Indica si el usuario puede modificar datos.
 * @param {(msg: string, color?: string) => void} props.toast - Notificador UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.openModal - Abre un modal.
 * @param {() => void} props.closeModal - Cierra el modal actual.
 * @param {object|null} [props.lpJump] - Señal opcional para abrir automáticamente la pestaña LP y hacer scroll al bote.
 * @returns {import('react').JSX.Element} Elemento React de la tarjeta del bote.
 *
 * Lógica:
 * 1) Mantiene estado local `open` (colapsado) y `tab` (dens/lp).
 * 2) Si llega `lpJump` y coincide con este bote y operación, abre la tarjeta, selecciona pestaña LP y scrollea al header.
 * 3) Calcula especies usadas en densidad (`densSpecies`) leyendo transectos/cuadrantes.
 * 4) Calcula totales (unidades, muestras) para mostrar pills en el header.
 * 5) Renderiza contenido condicional según `tab` (DensidadTab o LpTab).
 *
 * Dependencias externas:
 * - React hooks: `useState`, `useEffect`, `useMemo`, `useRef`.
 * - [DensidadTab](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/ops/DensidadTab.jsx)
 * - [LpTab](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/ops/LpTab.jsx)
 *
 * Efectos secundarios:
 * - Puede disparar scroll (`scrollIntoView`) al recibir un `lpJump` válido.
 *
 * Manejo de errores:
 * - Utiliza validaciones defensivas para evitar accesos a `null/undefined`.
 *
 * @example
 * <BoteCard op={op} bote={b} especies={db.especies} updateOperacion={updateOperacion} canWrite={canWrite} toast={toast} openModal={openModal} closeModal={closeModal} />
 *
 * Notas de mantenimiento:
 * - Mantener la lógica de matching de `lpJump` sincronizada con el emisor (por ejemplo, EvadirPreview).
 * - Evitar cálculos pesados sin memoización.
 */
export default function BoteCard({ op, bote, especies, updateOperacion, canWrite, toast, openModal, closeModal, lpJump }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('dens')
  const rootRef = useRef(null)
  const lastTokenRef = useRef(null)

  useEffect(() => {
    const onCollapse = () => {
      setOpen(false)
      setTab('dens')
    }
    window.addEventListener('bitecma:tutorial:collapse-botes', onCollapse)
    return () => window.removeEventListener('bitecma:tutorial:collapse-botes', onCollapse)
  }, [])

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
    setTimeout(() => {
      setOpen(true)
      setTab('lp')
      const target = rootRef.current
      const scroller = target?.closest?.('.main')
      if (target && scroller) {
        const scRect = scroller.getBoundingClientRect()
        const tRect = target.getBoundingClientRect()
        const top = scroller.scrollTop + (tRect.top - scRect.top) - 10
        if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        else scroller.scrollTop = Math.max(0, top)
      } else {
        target?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      }
    }, 0)
  }, [lpJump?.token, lpJump?.opId, lpJump?.boteId, lpJump?.boteNombre, lpJump?.buzo, lpJump?.zona, op?.id, bote?.id, bote?.nombre, bote?.buzo, bote?.zona])

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

  /**
   * Calcula el total de muestras L/P/D del bote, soportando estructuras mixtas de `lpMuestras`.
   *
   * @returns {number} Total de muestras registradas para el bote.
   *
   * Lógica:
   * 1) Normaliza `bote.lpMuestras` a objeto.
   * 2) Para cada especie:
   *    - Si el entry es array, suma su largo (formato heredado).
   *    - Si el entry es `{ ms: [] }`, suma `ms.length` (formato heredado).
   *    - Si el entry es objeto con claves `LP/L/D`, suma largos de cada arreglo.
   *
   * Dependencias externas:
   * - Ninguna.
   *
   * Efectos secundarios:
   * - Ninguno.
   *
   * Notas de mantenimiento:
   * - Mantener compatibilidad con `lpMuestrasService` (esquemas antiguos importados).
   */
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
    <div className="bote-card" ref={rootRef} data-tutorial-role="bote-card">
      <div
        className={`bote-hd${open ? ' open-hd' : ''}`}
        onClick={() => setOpen((v) => !v)}
        data-tutorial-role="bote-header"
        data-tutorial-advance="true"
        data-tutorial-boteid={String(bote?.id ?? '')}
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
          <div
            className={`btab${tab === 'dens' ? ' on' : ''}`}
            onClick={() => setTab('dens')}
            data-tutorial-role="bote-tab-dens"
            data-tutorial-advance="true"
          >
            Densidad
          </div>
          <div
            className={`btab${tab === 'lp' ? ' on' : ''}`}
            onClick={() => setTab('lp')}
            data-tutorial-role="bote-tab-lp"
            data-tutorial-advance="true"
          >
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
