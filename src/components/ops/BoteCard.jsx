import { useEffect, useMemo, useRef, useState } from 'react'
import PestanaDensidad from './DensidadTab.jsx'
import PestanaLp from './LpTab.jsx'
import { normalizarZonaMuestreo } from '../../services/operacionesService.js'

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
function normalizarClave(v) {
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
export default function TarjetaBote({
  operacion,
  bote,
  especies,
  actualizarOperacion,
  puedeEscribir,
  mostrarToast,
  abrirModal,
  cerrarModal,
  saltoLp,
  saltoTutorial,
}) {
  const [estaAbierta, establecerAbierta] = useState(false)
  const [pestanaActiva, establecerPestanaActiva] = useState('dens')
  const referenciaRaiz = useRef(null)
  const tokenSaltoLpAnteriorRef = useRef(null)
  const tokenSaltoTutorialAnteriorRef = useRef(null)
  const esIntermareal = bote?.submareal == null ? false : bote?.submareal === false || bote?.submareal === 0 || bote?.submareal === '0'

  useEffect(() => {
    const alColapsarBotes = () => {
      establecerAbierta(false)
      establecerPestanaActiva('dens')
    }
    window.addEventListener('bitecma:tutorial:collapse-botes', alColapsarBotes)
    return () => window.removeEventListener('bitecma:tutorial:collapse-botes', alColapsarBotes)
  }, [])

  useEffect(() => {
    const tokenSalto = saltoLp?.token ?? null
    if (!tokenSalto || tokenSaltoLpAnteriorRef.current === tokenSalto) return

    const idOperacionSalto = String(saltoLp?.opId ?? '')
    if (!idOperacionSalto || String(operacion?.id ?? '') !== idOperacionSalto) return

    const idBoteSalto = saltoLp?.boteId != null && String(saltoLp.boteId) !== '' ? String(saltoLp.boteId) : null
    const coincidePorId = idBoteSalto ? String(bote?.id ?? '') === idBoteSalto : false
    const zonaBote = normalizarZonaMuestreo(bote?.zona)
    const zonaSalto = saltoLp?.zona == null ? '' : normalizarZonaMuestreo(saltoLp?.zona)
    const coincideZona =
      saltoLp?.zona == null
        ? true
        : !zonaSalto
          ? true
          : (() => {
              if (!zonaBote) return false
              const esNumeroBote = /^\d+$/.test(zonaBote)
              const esNumeroSalto = /^\d+$/.test(zonaSalto)
              if (esNumeroBote && esNumeroSalto) return parseInt(zonaBote, 10) === parseInt(zonaSalto, 10)
              return zonaBote.localeCompare(zonaSalto, 'es', { sensitivity: 'base' }) === 0
            })()
    const coincidePorNombre =
      !idBoteSalto &&
      normalizarClave(bote?.nombre) &&
      normalizarClave(bote?.nombre) === normalizarClave(saltoLp?.boteNombre) &&
      (!saltoLp?.buzo || normalizarClave(bote?.buzo) === normalizarClave(saltoLp?.buzo)) &&
      coincideZona

    if (!coincidePorId && !coincidePorNombre) return

    tokenSaltoLpAnteriorRef.current = tokenSalto
    setTimeout(() => {
      establecerAbierta(true)
      establecerPestanaActiva('lp')
      const objetivo = referenciaRaiz.current
      const contenedorScroll = objetivo?.closest?.('.main')
      if (objetivo && contenedorScroll) {
        const rectContenedor = contenedorScroll.getBoundingClientRect()
        const rectObjetivo = objetivo.getBoundingClientRect()
        const top = contenedorScroll.scrollTop + (rectObjetivo.top - rectContenedor.top) - 10
        if (typeof contenedorScroll.scrollTo === 'function') contenedorScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        else contenedorScroll.scrollTop = Math.max(0, top)
      } else {
        objetivo?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      }
    }, 0)
  }, [saltoLp?.token, saltoLp?.opId, saltoLp?.boteId, saltoLp?.boteNombre, saltoLp?.buzo, saltoLp?.zona, operacion?.id, bote?.id, bote?.nombre, bote?.buzo, bote?.zona])

  useEffect(() => {
    const tokenSalto = saltoTutorial?.token ?? null
    if (!tokenSalto || tokenSaltoTutorialAnteriorRef.current === tokenSalto) return

    const idOperacionSalto = String(saltoTutorial?.opId ?? '')
    if (!idOperacionSalto || String(operacion?.id ?? '') !== idOperacionSalto) return

    const idBoteSalto = saltoTutorial?.boteId != null && String(saltoTutorial.boteId) !== '' ? String(saltoTutorial.boteId) : null
    if (!idBoteSalto || String(bote?.id ?? '') !== idBoteSalto) return

    tokenSaltoTutorialAnteriorRef.current = tokenSalto
    setTimeout(() => {
      establecerAbierta(true)
      const siguientePestana = String(saltoTutorial?.tab || '')
      if (siguientePestana === 'lp' || siguientePestana === 'dens') establecerPestanaActiva(siguientePestana)
      const objetivo = referenciaRaiz.current
      const contenedorScroll = objetivo?.closest?.('.main')
      if (objetivo && contenedorScroll) {
        const rectContenedor = contenedorScroll.getBoundingClientRect()
        const rectObjetivo = objetivo.getBoundingClientRect()
        const top = contenedorScroll.scrollTop + (rectObjetivo.top - rectContenedor.top) - 10
        if (typeof contenedorScroll.scrollTo === 'function') contenedorScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        else contenedorScroll.scrollTop = Math.max(0, top)
      } else {
        objetivo?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      }
    }, 0)
  }, [saltoTutorial?.token, saltoTutorial?.opId, saltoTutorial?.boteId, saltoTutorial?.tab, operacion?.id, bote?.id])

  const especiesDensidad = useMemo(() => {
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
    <div
      className="bote-card"
      ref={referenciaRaiz}
      data-tutorial-role="bote-card"
      data-tutorial-boteid={String(bote?.id ?? '')}
    >
      <div
        className={`bote-hd${estaAbierta ? ' open-hd' : ''}`}
        onClick={() => establecerAbierta((v) => !v)}
        data-tutorial-role="bote-header"
        data-tutorial-advance="true"
        data-tutorial-boteid={String(bote?.id ?? '')}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <div className={`bote-icon${esIntermareal ? ' pie' : ''}${estaAbierta ? ' open-ic' : ''}`} />
          <div style={{ minWidth: 0 }}>
            <div className="bote-name">
              {(esIntermareal ? (bote?.buzo || '—') : (bote?.nombre || '—'))} · Zona {bote?.zona ?? '—'}
            </div>
            <div className="bote-meta">
              {(esIntermareal ? 'Intermareal' : (bote?.buzo || '—'))} · {bote?.densTipo === 'cuadrante' ? 'Cuadrantes' : 'Transectos'}
            </div>
            {especiesDensidad.length ? (
              <div className="bote-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {especiesDensidad.slice(0, 6).map((name, idx) => (
                  <span key={`${name}-${idx}`} className="pill p-blu" style={{ fontSize: 10 }}>
                    {name}
                  </span>
                ))}
                {especiesDensidad.length > 6 ? (
                  <span className="pill p-amb" style={{ fontSize: 10 }}>
                    +{especiesDensidad.length - 6}
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

      <div className={`bote-body${estaAbierta ? ' open' : ''}`}>
        <div className="btabs">
          <div
            className={`btab${pestanaActiva === 'dens' ? ' on' : ''}`}
            onClick={() => establecerPestanaActiva('dens')}
            data-tutorial-role="bote-tab-dens"
            data-tutorial-advance="true"
          >
            Densidad
          </div>
          <div
            className={`btab${pestanaActiva === 'lp' ? ' on' : ''}`}
            onClick={() => establecerPestanaActiva('lp')}
            data-tutorial-role="bote-tab-lp"
            data-tutorial-advance="true"
          >
            Peso-Longitud
          </div>
        </div>

        {pestanaActiva === 'dens' ? (
          <PestanaDensidad
            operacion={operacion}
            bote={bote}
            especies={especies}
            actualizarOperacion={actualizarOperacion}
            puedeEscribir={puedeEscribir}
            mostrarToast={mostrarToast}
            abrirModal={abrirModal}
            cerrarModal={cerrarModal}
          />
        ) : (
          <PestanaLp
            operacion={operacion}
            bote={bote}
            especies={especies}
            actualizarOperacion={actualizarOperacion}
            puedeEscribir={puedeEscribir}
            mostrarToast={mostrarToast}
            abrirModal={abrirModal}
            cerrarModal={cerrarModal}
            saltoLp={saltoLp}
          />
        )}
      </div>
    </div>
  )
}
