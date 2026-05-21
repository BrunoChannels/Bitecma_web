import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/appContext.jsx'
import { useUi } from '../context/uiContext.jsx'

const DASH_SEEN_KEY = 'bitecma_tutorial_dashboard_seen_v1'

function readSeen(key) {
  try {
    return localStorage.getItem(String(key || '')) === '1'
  } catch {
    return false
  }
}

function writeSeen(key, v) {
  try {
    const k = String(key || '')
    if (!k) return
    if (!v) localStorage.removeItem(k)
    else localStorage.setItem(k, '1')
  } catch {
    return
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

export default function Tutorial() {
  const { isAuthed, page, navigate } = useApp()
  const { toast } = useUi()

  const curPage = String(page || '')
  const isDashboard = isAuthed && curPage === 'dashboard'
  const isOpsTutorial = isAuthed && curPage === 'ops-tutorial'

  const isFormLikeTarget = (node) => {
    const el = node && node.nodeType === 1 ? node : null
    if (!el) return false
    return !!el.closest?.('input, textarea, select, option, [contenteditable="true"]')
  }

  const isAdvanceTarget = (el) => {
    if (!el) return false
    const tag = String(el.tagName || '').toUpperCase()
    if (tag === 'BUTTON' || tag === 'A') return true
    return String(el.getAttribute?.('data-tutorial-advance') || '') === 'true'
  }

  const dashboardSteps = useMemo(
    () => [
      {
        id: 'dash-ops',
        selector: '[data-tutorial-id="dash-ops"]',
        title: 'Operaciones',
        text: 'Aquí ves cuántas operaciones hay registradas. Sirve como acceso rápido al módulo de Operaciones.',
        advanceOnTargetClick: true,
      },
      {
        id: 'dash-lp',
        selector: '[data-tutorial-id="dash-lp"]',
        title: 'Muestras L-P',
        text: 'Este indicador resume el total de muestras L-P registradas (subconjunto) asociadas a tus operaciones.',
        advanceOnTargetClick: true,
      },
      {
        id: 'dash-dens',
        selector: '[data-tutorial-id="dash-dens"]',
        title: 'Unidades densidad',
        text: 'Cuenta las unidades de densidad ingresadas (transectos y cuadrantes) dentro de las operaciones.',
        advanceOnTargetClick: true,
      },
      {
        id: 'dash-recent',
        selector: '[data-tutorial-id="dash-recent"]',
        title: 'Operaciones recientes',
        text: 'Listado de las operaciones más recientes. Te ayuda a ubicar rápidamente lo último cargado.',
        advanceOnTargetClick: true,
      },
      {
        id: 'dash-chart',
        selector: '[data-tutorial-id="dash-chart"]',
        title: 'Composición por especie',
        text: 'Gráfico que resume cuántas muestras se han registrado por especie (top), para tener una vista rápida de la distribución.',
        advanceOnTargetClick: true,
      },
    ],
    [],
  )

  const opsSteps = useMemo(
    () => [
      {
        id: 'ops-newop',
        selector: '[data-tutorial-id="ops-newop"]',
        title: 'Nueva operación',
        text: 'Haz click aquí para iniciar la creación de una operación (simulado localmente, sin API).',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 60,
      },
      {
        id: 'ops-newop-panel',
        selector: '[data-tutorial-id="ops-newop-panel"]',
        title: 'Panel Nueva operación',
        text: 'Aquí se completan los datos base de la operación. Para continuar rellena los campos.',
        waitForTrigger: 'ops-opa-selected',
      },
      {
        id: 'ops-newop-create',
        selector: '[data-tutorial-id="ops-newop-create"]',
        title: 'Crear',
        text: 'Crea la operación de ejemplo con los datos seleccionados. Luego pasas al editor de botes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 90,
      },
      {
        id: 'ops-botes-panel',
        selector: '[data-tutorial-id="ops-botes-panel"]',
        title: 'Panel de botes',
        text: 'Aquí agregas los botes, buzo, zona y el tipo de unidad de muestreo (transecto/cuadrante).',
        lockSelector: '[data-tutorial-id="ops-botes-panel"]',
      },
      {
        id: 'ops-bote-name-0',
        selector: '[data-tutorial-id="ops-bote-name-0"]',
        title: 'Nombre del bote',
        text: 'Haz click en el nombre para abrir el panel de búsqueda/selección de botes.',
        waitForTrigger: 'ops-bote-panel-opened-0',
      },
      {
        id: 'ops-bote-picker-0',
        selector: '[data-tutorial-id="ops-bote-picker"]',
        title: 'Panel de botes',
        text: 'Desde aquí puedes seleccionar un bote existente o crear uno nuevo.',
        waitForTrigger: 'ops-boat-selected-0',
      },
      {
        id: 'ops-bote-buzo-0',
        selector: '[data-tutorial-id="ops-bote-buzo-0"]',
        title: 'Nombre buzo',
        text: 'Aquí ingresas el nombre del buzo asociado al bote.',
        waitForNonEmptySelector: '[data-tutorial-id="ops-bote-buzo-0"]',
      },
      {
        id: 'ops-bote-unidad-0',
        selector: '[data-tutorial-id="ops-bote-unidad-0"]',
        title: 'Unidad de muestreo',
        text: 'Selecciona el tipo de unidad de muestreo: transecto o cuadrante.',
        waitForValue: { selector: '[data-tutorial-id="ops-bote-unidad-0"]', equals: 'transecto' },
      },
      {
        id: 'ops-bote-name-1',
        selector: '[data-tutorial-id="ops-bote-name-1"]',
        title: 'Segundo bote',
        text: 'Selecciona un segundo bote. Este será el bote que trabajará con cuadrantes.',
        waitForTrigger: 'ops-bote-panel-opened-1',
      },
      {
        id: 'ops-bote-picker-1',
        selector: '[data-tutorial-id="ops-bote-picker"]',
        title: 'Panel de botes',
        text: 'Selecciona un bote para la segunda fila.',
        waitForTrigger: 'ops-boat-selected-1',
      },
      {
        id: 'ops-bote-buzo-1',
        selector: '[data-tutorial-id="ops-bote-buzo-1"]',
        title: 'Nombre buzo',
        text: 'Ingresa el nombre del buzo asociado al segundo bote.',
        waitForNonEmptySelector: '[data-tutorial-id="ops-bote-buzo-1"]',
      },
      {
        id: 'ops-bote-unidad-1',
        selector: '[data-tutorial-id="ops-bote-unidad-1"]',
        title: 'Unidad de muestreo',
        text: 'Para el segundo bote, selecciona cuadrante como unidad de muestreo.',
        waitForValue: { selector: '[data-tutorial-id="ops-bote-unidad-1"]', equals: 'cuadrante' },
      },
      {
        id: 'ops-bote-delete',
        selector: '[data-tutorial-id="ops-bote-delete-0"]',
        title: 'Eliminar fila',
        text: 'Este botón elimina una fila del panel de botes.',
      },
      {
        id: 'ops-bote-addrow',
        selector: '[data-tutorial-id="ops-bote-addrow"]',
        title: 'Agregar fila',
        text: 'Este botón agrega una nueva fila de bote.',
      },
      {
        id: 'ops-botes-save',
        selector: '[data-tutorial-id="ops-botes-save"]',
        title: 'Guardar botes',
        text: 'Guarda los botes en la operación (en este tutorial se guardan 2 botes).',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 200,
      },
      {
        id: 'ops-region-btn',
        selector: '[data-tutorial-id="ops-region-btn"]',
        title: 'Regiones',
        text: 'Las operaciones se agrupan por región. Haz click en la región para ver sus operaciones.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
      {
        id: 'ops-op-card',
        selector: '[data-tutorial-id="ops-op-card"]',
        title: 'Operación',
        text: 'Haz click en la operación para ver el bote guardado.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
      {
        id: 'ops-bote-header',
        selector: '[data-tutorial-role="bote-header"]',
        title: 'Bote',
        text: 'Haz click en el bote para abrirlo.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
      {
        id: 'ops-tab-dens',
        selector: '[data-tutorial-role="bote-tab-dens"]',
        title: 'Densidad',
        text: 'En esta pestaña registras transectos/cuadrantes y conteos por especie.',
      },
      {
        id: 'ops-dens-add-transecto',
        selector: '[data-tutorial-id="ops-dens-add-transecto"]',
        title: 'Agregar transecto',
        text: 'Haz click aquí para agregar transectos y abrir el panel de transectos.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
      },
      {
        id: 'ops-dens-panel',
        selector: '[data-tutorial-id="ops-dens-transectos-panel"]',
        title: 'Panel de transectos',
        text: 'Este panel permite crear/editar transectos en bloque. Vamos campo por campo.',
        lockSelector: '[data-tutorial-id="ops-dens-transectos-panel"]',
      },
      {
        id: 'ops-dens-area',
        selector: '[data-tutorial-id="ops-dens-tx-area"]',
        title: 'Área (m²)',
        text: 'Ingresa el área del transecto (m²). Se usa para calcular densidad (ind/m²).',
      },
      {
        id: 'ops-dens-sustrato',
        selector: '[data-tutorial-id="ops-dens-tx-sustrato"]',
        title: 'Tipo de sustrato',
        text: 'Describe el sustrato del transecto (por ejemplo: roca, arena, bolones).',
        waitForNonEmptySelector: '[data-tutorial-id="ops-dens-tx-sustrato"]',
      },
      {
        id: 'ops-dens-cubierta',
        selector: '[data-tutorial-id="ops-dens-tx-cubierta"]',
        title: 'Cubierta biológica',
        text: 'Registra la cubierta biológica observada en el transecto (si corresponde).',
        waitForNonEmptySelector: '[data-tutorial-id="ops-dens-tx-cubierta"]',
      },
      {
        id: 'ops-dens-especies-btn',
        selector: '[data-tutorial-id="ops-dens-tx-especies"]',
        title: 'Especies',
        text: 'Presiona este botón para seleccionar especies (multiselección) para el transecto.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 150,
      },
      {
        id: 'ops-dens-especies-panel',
        selector: '[data-tutorial-id="ops-dens-species-grid"]',
        title: 'Panel de especies',
        text: 'Selecciona una o varias especies. Puedes hacer multiselección y luego aplicar al transecto.',
      },
      {
        id: 'ops-dens-especies-apply',
        selector: '[data-tutorial-id="ops-dens-species-apply"]',
        title: 'Aplicar a Transecto 1',
        text: 'Este botón aplica la selección de especies al Transecto 1.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 160,
      },
      {
        id: 'ops-dens-replicar',
        selector: '[data-tutorial-id="ops-dens-replicar"]',
        title: 'Replicar fila 1',
        text: 'Este botón copia la configuración del primer transecto (área, sustrato, cubierta y especies) al resto.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
      {
        id: 'ops-dens-guardar',
        selector: '[data-tutorial-id="ops-dens-tx-save"]',
        title: 'Guardar',
        text: 'Presiona Guardar para aplicar los transectos al bote.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
      },
      {
        id: 'ops-dens-transfer-wait',
        selector: '[data-tutorial-id="ops-dens-tx-save"]',
        title: 'Transferencia a Peso-Longitud',
        text: 'Si agregaste especies nuevas en Densidad, aparecerá un panel para ofrecer transferirlas a Peso-Longitud.',
        waitForTrigger: 'ops-dens-transfer-open',
      },
      {
        id: 'ops-dens-transfer-panel',
        selector: '[data-tutorial-id="ops-dens-transfer-modal"]',
        title: 'Transferir especies',
        text: 'Este panel te permite agregar las especies nuevas también a Peso-Longitud para habilitarlas en esa pestaña.',
        waitForTrigger: 'ops-dens-transfer-done',
      },
      {
        id: 'ops-tab-lp',
        selector: '[data-tutorial-role="bote-tab-lp"]',
        title: 'Peso-Longitud',
        text: 'En esta pestaña registras muestras Peso-Longitud.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
    ],
    [],
  )

  const [tour, setTour] = useState('dashboard')
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const returnPageRef = useRef('dashboard')
  const focusRetryRef = useRef({ t: 0, token: '' })
  const advanceRef = useRef({ t: 0 })
  const lockRef = useRef({ els: [] })
  const gateRef = useRef({ t: 0 })

  const tipRef = useRef(null)
  const focusedElRef = useRef(null)
  const [tipPos, setTipPos] = useState({ top: 0, left: 0, show: false })

  const clearFocus = useCallback(() => {
    const prev = focusedElRef.current
    if (prev) prev.removeAttribute('data-tutorial-focus')
    focusedElRef.current = null
  }, [])

  const applyFocus = useCallback((el) => {
    if (focusedElRef.current && focusedElRef.current !== el) {
      focusedElRef.current.removeAttribute('data-tutorial-focus')
    }
    focusedElRef.current = el || null
    if (el) el.setAttribute('data-tutorial-focus', 'true')
  }, [])

  const recomputeTipPos = useCallback(() => {
    const tip = tipRef.current
    const el = focusedElRef.current
    if (!tip) return

    const tipRect = tip.getBoundingClientRect()
    const margin = 12

    if (!el || !el.isConnected) {
      const left = clamp((window.innerWidth - tipRect.width) / 2, margin, window.innerWidth - tipRect.width - margin)
      const top = clamp(90, margin, window.innerHeight - tipRect.height - margin)
      setTipPos({ top, left, show: true })
      return
    }

    const r = el.getBoundingClientRect()
    let top = r.bottom + 12
    let left = r.left + r.width / 2 - tipRect.width / 2

    if (top + tipRect.height > window.innerHeight - margin) {
      top = r.top - 12 - tipRect.height
    }

    left = clamp(left, margin, window.innerWidth - tipRect.width - margin)
    top = clamp(top, margin, window.innerHeight - tipRect.height - margin)

    setTipPos({ top, left, show: true })
  }, [])

  const steps = tour === 'ops' ? opsSteps : dashboardSteps
  const canRender = (tour === 'ops' && isOpsTutorial) || (tour !== 'ops' && isDashboard)
  const curStep = running && canRender ? steps[idx] : null
  const stepLabel = `${idx + 1} / ${steps.length}`
  const [gateOk, setGateOk] = useState(true)
  const hasGate = !!curStep?.waitForNonEmptySelector || !!curStep?.waitForValue
  const nextLocked = !!curStep?.requiresClick || !!curStep?.waitForTrigger || (hasGate && !gateOk)

  const close = useCallback(() => {
    clearFocus()
    lockRef.current.els.forEach((el) => el.removeAttribute('data-tutorial-lock'))
    lockRef.current.els = []
    requestAnimationFrame(() => setTipPos((p) => ({ ...p, show: false })))
    setRunning(false)
    setIdx(0)
    const backTo = String(returnPageRef.current || '')
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:closeall'))
    if (tour === 'ops' && curPage === 'ops-tutorial') navigate(backTo || 'ops')
  }, [clearFocus, tour, curPage, navigate])

  const startDashboard = useCallback(() => {
    returnPageRef.current = 'dashboard'
    setTour('dashboard')
    writeSeen(DASH_SEEN_KEY, true)
    setIdx(0)
    setRunning(true)
  }, [])

  const startOps = useCallback(() => {
    returnPageRef.current = curPage || 'ops'
    setTour('ops')
    setIdx(0)
    setRunning(true)
    navigate('ops-tutorial')
  }, [curPage, navigate])

  const skipDashboard = useCallback(() => {
    writeSeen(DASH_SEEN_KEY, true)
    setRunning(false)
    setIdx(0)
    toast('Puedes visitar el tutorial desde configuracion cuando gustes!')
  }, [toast])

  const next = useCallback(() => {
    if (nextLocked) return
    setIdx((cur) => {
      const last = steps.length - 1
      if (cur >= last) {
        close()
        return 0
      }
      return cur + 1
    })
  }, [close, nextLocked, steps.length])

  useEffect(() => {
    const onTutorialEvent = (e) => {
      const action = String(e?.detail?.action || '')
      const nextTour = String(e?.detail?.tour || '')
      if (!isAuthed) return
      if (action === 'start' && nextTour === 'ops') {
        startOps()
        return
      }
      if (action === 'start') {
        startDashboard()
        return
      }
      if (action === 'reset') {
        writeSeen(DASH_SEEN_KEY, false)
        setTour('dashboard')
        setRunning(false)
        setIdx(0)
      }
    }
    window.addEventListener('bitecma:tutorial', onTutorialEvent)
    return () => window.removeEventListener('bitecma:tutorial', onTutorialEvent)
  }, [isAuthed, startOps, startDashboard])

  useEffect(() => {
    if (!(running && canRender)) return
    const onTrig = (e) => {
      const id = String(e?.detail?.id || '')
      if (!id) return
      const step = steps[idx]
      if (!step?.waitForTrigger) return
      if (String(step.waitForTrigger) !== id) return
      if (step?.finishOnTrigger) {
        setTimeout(() => close(), 60)
        return
      }
      setTimeout(() => {
        setIdx((cur) => {
          const last = steps.length - 1
          if (cur >= last) {
            close()
            return 0
          }
          return cur + 1
        })
      }, 60)
    }
    window.addEventListener('bitecma:tutorial:trigger', onTrig)
    return () => window.removeEventListener('bitecma:tutorial:trigger', onTrig)
  }, [running, canRender, steps, idx, close])

  useEffect(() => {
    if (!(running && canRender)) {
      clearFocus()
      return
    }

    const retry = focusRetryRef.current
    const step = steps[idx]
    const token = `${tour}:${curPage}:${idx}:${String(step?.id || '')}`
    retry.token = token

    const tryFocus = (startedAt) => {
      if (retry.token !== token) return
      const el = step ? document.querySelector(step.selector) : null
      if (el) {
        applyFocus(el)
        requestAnimationFrame(() => recomputeTipPos())
        return
      }
      const elapsed = Date.now() - startedAt
      if (elapsed >= 2500) {
        applyFocus(null)
        requestAnimationFrame(() => recomputeTipPos())
        return
      }
      clearTimeout(retry.t)
      retry.t = setTimeout(() => tryFocus(startedAt), 60)
    }

    tryFocus(Date.now())
    return () => clearTimeout(retry.t)
  }, [running, canRender, steps, idx, tour, curPage, applyFocus, clearFocus, recomputeTipPos])

  useEffect(() => {
    const lockState = lockRef.current
    lockState.els.forEach((el) => el.removeAttribute('data-tutorial-lock'))
    lockState.els = []

    if (!(running && canRender)) return

    const step = steps[idx]
    const sel = String(step?.lockSelector || '')
    if (!sel) return

    const els = Array.from(document.querySelectorAll(sel)).filter((x) => x && x.nodeType === 1)
    els.forEach((el) => el.setAttribute('data-tutorial-lock', 'true'))
    lockState.els = els

    return () => {
      els.forEach((el) => el.removeAttribute('data-tutorial-lock'))
      if (lockState.els === els) lockState.els = []
    }
  }, [running, canRender, steps, idx])

  useEffect(() => {
    const gateState = gateRef.current
    clearInterval(gateState.t)

    if (!(running && canRender)) {
      setTimeout(() => setGateOk(true), 0)
      return
    }

    const step = steps[idx]
    const nonEmptySel = String(step?.waitForNonEmptySelector || '')
    const waitVal = step?.waitForValue && typeof step.waitForValue === 'object' ? step.waitForValue : null
    const waitValSel = String(waitVal?.selector || '')
    const waitValEq = String(waitVal?.equals ?? '')

    if (!nonEmptySel && !waitValSel) {
      setTimeout(() => setGateOk(true), 0)
      return
    }

    const check = () => {
      let ok = true

      if (nonEmptySel) {
        const el = document.querySelector(nonEmptySel)
        if (!el) ok = false
        else {
          const v = typeof el.value === 'string' ? el.value : String(el.getAttribute?.('value') || '')
          if (!String(v || '').trim()) ok = false
        }
      }

      if (ok && waitValSel) {
        const el = document.querySelector(waitValSel)
        if (!el) ok = false
        else {
          const v = typeof el.value === 'string' ? el.value : String(el.getAttribute?.('value') || '')
          if (String(v || '') !== waitValEq) ok = false
        }
      }

      setGateOk(ok)
    }

    const onAny = () => check()
    document.addEventListener('input', onAny, true)
    document.addEventListener('change', onAny, true)
    setTimeout(check, 0)
    gateState.t = setInterval(check, 180)
    return () => {
      document.removeEventListener('input', onAny, true)
      document.removeEventListener('change', onAny, true)
      clearInterval(gateState.t)
    }
  }, [running, canRender, steps, idx])

  useEffect(() => {
    if (!(running && canRender)) return
    const on = () => recomputeTipPos()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [running, canRender, idx, recomputeTipPos])

  useEffect(() => {
    if (!(running && canRender)) return

    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (isFormLikeTarget(e.target)) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (nextLocked) return
        next()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, canRender, close, next, nextLocked])

  useEffect(() => {
    if (!(running && canRender)) return

    const onClickCapture = (e) => {
      const tip = tipRef.current
      if (tip && tip.contains(e.target)) return

      const el = focusedElRef.current
      if (el && el.contains(e.target)) {
        const step = steps[idx] || null
        const delay = Number(step?.advanceDelayMs) || 0

        if (step?.passThrough) {
          if (!isAdvanceTarget(el)) return
          if (typeof el?.disabled === 'boolean' && el.disabled) {
            toast('Completa el paso requerido para continuar', 'blue')
            return
          }
          clearTimeout(advanceRef.current.t)
          advanceRef.current.t = setTimeout(() => {
            setIdx((cur) => {
              const last = steps.length - 1
              if (cur >= last) {
                close()
                return 0
              }
              return cur + 1
            })
          }, delay)
          return
        }

        if (step?.waitForTrigger) return
        if (step?.requiresClick) return
        if (!step?.advanceOnTargetClick) return
        next()
        return
      }
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [running, canRender, steps, idx, close, next, toast])

  const showPrompt = isDashboard && !readSeen(DASH_SEEN_KEY) && !running
  const open = showPrompt || (running && canRender)

  if (!open) return null

  return (
    <div
      className={`tut-ov${open ? ' open' : ''}${showPrompt ? ' prompt' : ''}${running ? ' running' : ''}`}
    >
      {showPrompt ? (
        <div className="tut-card" role="dialog" aria-modal="true">
          <h3 className="tut-title">¿Deseas iniciar el tutorial?</h3>
          <p className="tut-text">Te guiará por las secciones principales del Dashboard.</p>
          <div className="tut-actions">
            <button type="button" className="btn b-out" onClick={skipDashboard}>
              Saltar el tutorial
            </button>
            <button type="button" className="btn b-teal" onClick={startDashboard}>
              Iniciar el tutorial
            </button>
          </div>
        </div>
      ) : null}

      {running && canRender && curStep ? (
        <div
          className="tut-tip"
          ref={tipRef}
          style={{
            top: tipPos.top,
            left: tipPos.left,
            opacity: tipPos.show ? 1 : 0,
            pointerEvents: 'auto',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="tut-step">{stepLabel}</div>
          <h3 className="tut-title">{curStep.title}</h3>
          <p className="tut-text">{curStep.text}</p>
          <div className="tut-actions">
            <button type="button" className="btn b-out b-sm" onClick={close}>
              Salir
            </button>
            <button type="button" className="btn b-teal b-sm" onClick={next} disabled={nextLocked}>
              {idx === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
