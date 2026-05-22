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

function safeClone(v) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(v)
  } catch {
    //
  }
  try {
    return JSON.parse(JSON.stringify(v))
  } catch {
    return null
  }
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
        chapterId: 'ops-ch1',
        chapterTitle: 'Capítulo 1 — Crear operación',
        checkpoint: true,
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
        focusClosestSelector: '.mb-box',
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
        chapterId: 'ops-ch2',
        chapterTitle: 'Capítulo 2 — Configurar botes',
        checkpoint: true,
        ensureEvent: 'bitecma:tutorial:ensure-botes-modal',
        selector: '[data-tutorial-id="ops-botes-panel"]',
        title: 'Panel de botes',
        text: 'Aquí agregas los botes, buzo, zona y el tipo de unidad de muestreo (transecto/cuadrante) para la operación creada.',
        focusClosestSelector: '.mb-box',
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
        text: 'Aquí ingresas el nombre del buzo asociado al bote, para continuar rellena el campo.',
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
        id: 'ops-region-panel',
        chapterId: 'ops-ch3',
        chapterTitle: 'Capítulo 3 — Ver operaciones',
        checkpoint: true,
        selector: '[data-tutorial-id="ops-region-panel"]',
        title: 'Regiones',
        text: 'Al crear la operación, se habilita su región aquí. Haz click en la región (botón grande) para entrar y ver sus operaciones.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea',
        lockAllowSelector: '#pg-ops-tutorial .ops-region-grid button.card',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-op-card',
        selector: '[data-tutorial-id="ops-op-card"]',
        title: 'Operación',
        text: 'Haz click en la operación para ver los botes guardados.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
      },
      {
        id: 'ops-bote-header',
        chapterId: 'ops-ch4',
        chapterTitle: 'Capítulo 4 — Bote 1 (transectos)',
        checkpoint: true,
        selector: '[data-tutorial-role="bote-header"][data-tutorial-boteid="B1"]',
        title: 'Bote',
        text: 'Esta es la carta de bote creada. Registra su nombre, zona correspondiente, buzo y unidad de medida. Haz click en el bote para abrirlo.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
        lockSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"][data-tutorial-boteid="B1"]',
      },
      {
        id: 'ops-tab-dens',
        selector: '[data-tutorial-role="bote-tab-dens"]',
        title: 'Densidad',
        text: 'En esta pestaña registras transectos/cuadrantes y conteos por especie.',
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea, #pg-ops-tutorial .btab, #pg-ops-tutorial .tx-hd, #pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-dens-add-transecto',
        selector: '[data-tutorial-id="ops-dens-add-transecto"]',
        title: 'Agregar transecto',
        text: 'Haz click aquí para agregar transectos y abrir el panel de transectos.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea, #pg-ops-tutorial .btab, #pg-ops-tutorial .tx-hd',
        lockAllowSelector: '[data-tutorial-id="ops-dens-add-transecto"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-dens-panel',
        selector: '[data-tutorial-id="ops-dens-transectos-panel"]',
        title: 'Panel de transectos',
        text: 'Este panel permite crear/editar transectos en bloque. Vamos campo por campo.',
        focusClosestSelector: '.mb-box',
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
        selector: '[data-tutorial-id="ops-dens-species-panel"]',
        title: 'Panel de especies',
        text: 'Selecciona una o varias especies. Puedes utilizar la barra de búsqueda para encontrar rápidamente a una especie.',
        lockSelector:
          '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowWithin: '.tut-ov, [data-tutorial-id="ops-dens-species-grid"]',
        gateTrigger: 'ops-dens-species-selected',
        gateTriggerClear: 'ops-dens-species-cleared',
      },
      {
        id: 'ops-dens-especies-apply',
        selector: '[data-tutorial-id="ops-dens-species-apply"]',
        title: 'Aplicar a Transecto 1',
        text: 'Este botón aplica la selección de especies al Transecto 1.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 160,
        lockSelector:
          '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-dens-species-apply"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-dens-row1-summary',
        selector: '[data-tutorial-id="ops-dens-tx-row1"]',
        title: 'Transecto 1',
        text: 'Esta es la primera fila (Transecto 1) con la configuración que elegiste: área, sustrato, cubierta y especies.',
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
        id: 'ops-dens-replicado',
        selector: '[data-tutorial-id="ops-dens-tx-table"]',
        title: 'Replicado',
        text: 'Ahora todos los transectos tienen la misma configuración del Transecto 1.',
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
        id: 'ops-dens-transfer-panel',
        selector: '[data-tutorial-id="ops-dens-transfer-modal"]',
        title: 'Transferir especies',
        text: 'Este panel te permite agregar las especies nuevas también a Peso-Longitud para habilitarlas en esa pestaña.',
        focusClosestSelector: '.mb-box',
        waitForTrigger: 'ops-dens-transfer-done',
      },
      {
        id: 'ops-dens-after-transfer',
        selector: '[data-tutorial-id="ops-dens-transecto-card"]',
        title: 'Transectos agregados',
        text: 'Aquí ves los transectos creados. Completa conteos por especie para calcular densidad.',
      },
      {
        id: 'ops-dens-enter-nav',
        selector: '[data-tutorial-id="ops-dens-transecto-count"]',
        title: 'Ingreso rápido',
        text: 'Tip: presiona Enter para moverte entre casillas al ingresar N° IND por especie.',
        tipPlacement: 'right-center',
        followFocus: true,
        followFocusSelector: 'input[data-nav="dens-transecto"]',
      },
      {
        id: 'ops-tab-lp',
        chapterId: 'ops-ch5',
        chapterTitle: 'Capítulo 5 — Peso-Longitud',
        checkpoint: true,
        selector: '[data-tutorial-role="bote-tab-lp"]',
        title: 'Peso-Longitud',
        text: 'Ahora haz click en Peso-Longitud.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea, #pg-ops-tutorial .btab, #pg-ops-tutorial .tx-hd',
        lockAllowSelector: '[data-tutorial-role="bote-tab-lp"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-panel',
        selector: '[data-tutorial-id="ops-lp-panel"]',
        title: 'Peso-Longitud',
        text: 'Esta pestaña permite registrar muestras Peso - Longitud y Diametro de disco. Si transferiste especies desde Densidad, aparecerán aquí.',
      },
      {
        id: 'ops-lp-select-btn',
        chapterId: 'ops-ch6',
        chapterTitle: 'Capítulo 6 — Ingreso de muestras',
        checkpoint: true,
        selector: '[data-tutorial-id="ops-lp-select-btn"]',
        title: 'Seleccionar especies',
        text: 'Haz click aquí para configurar las especies a muestrear en este bote.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 160,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-select-btn"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-kinds',
        selector: '[data-tutorial-id="ops-lp-kinds"]',
        title: 'Tipos de muestreo por especie',
        text: 'Aquí defines qué tipo de muestreo usarás por especie (L-P y/o L).',
      },
      {
        id: 'ops-lp-checkboxes',
        selector: '[data-tutorial-id="ops-lp-kind-checkboxes"]',
        title: 'Checkboxes',
        text: 'Estos checkboxes habilitan los tipos de muestreo para la especie seleccionada.',
      },
      {
        id: 'ops-lp-checkbox-L',
        selector: '[data-tutorial-id="ops-lp-kind-L"]',
        title: 'Habilitar L',
        text: 'Activa L para habilitar ingreso de Longitud (sin peso) para esta especie.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 120,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-kind-L"]',
        lockAllowWithin: '.tut-ov, [data-tutorial-id="ops-lp-select-modal"]',
      },
      {
        id: 'ops-lp-confirm',
        selector: '[data-tutorial-id="ops-lp-confirm"]',
        title: 'Confirmar',
        text: 'Presiona Confirmar para guardar la configuración de especies y tipos de muestreo.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 200,
        scrollIntoView: 'center',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-confirm"]',
        lockAllowWithin: '.tut-ov, [data-tutorial-id="ops-lp-select-modal"]',
      },
      {
        id: 'ops-lp-species-added',
        selector: '[data-tutorial-id="ops-lp-species-table"]',
        title: 'Especies agregadas',
        text: 'Aquí aparecen las especies habilitadas para Peso-Longitud en este bote.',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-longitud-row',
        selector: '[data-tutorial-id="ops-lp-row-L"]',
        title: 'Muestreo Longitud (L)',
        text: 'Como habilitaste L, esta especie también tiene ingreso solo de Longitud (sin peso).',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-ingresar',
        selector: '[data-tutorial-id="ops-lp-ingresar"]',
        title: 'Ingresar',
        text: 'Haz click en Ingresar para abrir el panel de ingreso de muestras.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 200,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-ingresar"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-inp-l',
        selector: '[data-tutorial-id="ops-lp-inp-l"]',
        title: 'Longitud (mm)',
        text: 'Ingresa la longitud. Para continuar, escribe un valor.',
        waitForNonEmptySelector: '[data-tutorial-id="ops-lp-inp-l"]',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-inp-l"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-inp-p',
        selector: '[data-tutorial-id="ops-lp-inp-p"]',
        title: 'Peso (g)',
        text: 'Ingresa el peso. Para continuar, escribe un valor.',
        waitForNonEmptySelector: '[data-tutorial-id="ops-lp-inp-p"]',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-inp-p"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-sample-save',
        selector: '[data-tutorial-id="ops-lp-sample-save"]',
        title: 'Agregar',
        text: 'Presiona Agregar para guardar la muestra.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-sample-save"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-saved',
        selector: '[data-tutorial-id="ops-lp-sample-row"]',
        title: 'Muestra guardada',
        text: 'La muestra quedó registrada en la tabla.',
      },
      {
        id: 'ops-lp-sample-close',
        selector: '[data-tutorial-id="ops-lp-sample-close"]',
        title: 'Cerrar',
        text: 'Cierra este panel para volver al bote.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-sample-close"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-ingresar-L',
        selector: '[data-tutorial-id="ops-lp-ingresar-L"]',
        title: 'Ingresar (L)',
        text: 'Ahora ingresa un ejemplo solo de Longitud (L) para la misma especie.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 200,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-ingresar-L"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-L-inp-l',
        selector: '[data-tutorial-id="ops-lp-inp-l-only"]',
        title: 'Longitud (mm)',
        text: 'Ingresa la longitud (sin peso). Para continuar, escribe un valor.',
        waitForNonEmptySelector: '[data-tutorial-id="ops-lp-inp-l-only"]',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-inp-l-only"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-L-save',
        selector: '[data-tutorial-id="ops-lp-sample-save"]',
        title: 'Agregar',
        text: 'Presiona Agregar para guardar la muestra de Longitud (L).',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-sample-save"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-lp-L-saved',
        selector: '[data-tutorial-id="ops-lp-sample-row"]',
        title: 'Muestra guardada',
        text: 'La muestra de Longitud quedó registrada.',
      },
      {
        id: 'ops-lp-L-close',
        selector: '[data-tutorial-id="ops-lp-sample-close"]',
        title: 'Cerrar',
        text: 'Cierra este panel para volver al bote.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd, #root [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-lp-sample-close"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-bote1-close',
        selector: '[data-tutorial-role="bote-header"][data-tutorial-boteid="B1"]',
        title: 'Cerrar bote',
        text: 'Haz clic en el bote actual para cerrarlo y continuar con el bote de cuadrantes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"][data-tutorial-boteid="B1"]',
      },
      {
        id: 'ops-bote2-open',
        chapterId: 'ops-ch7',
        chapterTitle: 'Capítulo 7 — Bote 2 (cuadrantes)',
        checkpoint: true,
        selector: '[data-tutorial-role="bote-header"][data-tutorial-boteid="B2"]',
        title: 'Bote (cuadrantes)',
        text: 'Ahora abre el segundo bote (unidad de muestreo: cuadrante).',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"][data-tutorial-boteid="B2"]',
      },
      {
        id: 'ops-cuad-dens',
        selector: '[data-tutorial-id="ops-cuad-dens-panel"]',
        title: 'Densidad (cuadrantes)',
        text: 'En esta pestaña crearás cuadrantes y registrarás conteos.',
      },
      {
        id: 'ops-cuad-crear',
        selector: '[data-tutorial-id="ops-dens-add-transecto"]',
        title: 'Crear cuadrantes',
        text: 'Haz click aquí para crear cuadrantes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 220,
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea, #pg-ops-tutorial .btab, #pg-ops-tutorial .tx-hd, #pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-dens-add-transecto"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-cuad-panel',
        selector: '[data-tutorial-id="ops-cuad-panel"]',
        title: 'Panel de cuadrantes',
        text: 'Configura cuántos cuadrantes crearás y sus parámetros base.',
        focusClosestSelector: '.mb-box',
      },
      {
        id: 'ops-cuad-cantidad',
        selector: '[data-tutorial-id="ops-cuad-cantidad"]',
        title: 'Cantidad',
        text: 'Cantidad de cuadrantes a crear.',
      },
      {
        id: 'ops-cuad-area',
        selector: '[data-tutorial-id="ops-cuad-area"]',
        title: 'Área',
        text: 'Selecciona el área del cuadrante.',
      },
      {
        id: 'ops-cuad-sustrato',
        selector: '[data-tutorial-id="ops-cuad-sustrato"]',
        title: 'Sustrato',
        text: 'Ingresa el tipo de sustrato del cuadrante.',
      },
      {
        id: 'ops-cuad-especie',
        selector: '[data-tutorial-id="ops-cuad-especie-btn"]',
        title: 'Especie',
        text: 'Selecciona la especie asociada al cuadrante.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 160,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea',
        lockAllowSelector: '[data-tutorial-id="ops-cuad-especie-btn"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-cuad-especie-pick',
        selector: '[data-tutorial-id="ops-cuad-especie-grid"]',
        title: 'Elegir especie',
        text: 'Selecciona una especie para continuar.',
        waitForTrigger: 'ops-cuad-especie-picked',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea',
        lockAllowWithin: '.tut-ov, [data-tutorial-id="ops-cuad-especie-panel"]',
      },
      {
        id: 'ops-cuad-crear-btn',
        selector: '[data-tutorial-id="ops-cuad-crear"]',
        title: 'Crear',
        text: 'Presiona Crear para generar los cuadrantes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 220,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea',
        lockAllowSelector: '[data-tutorial-id="ops-cuad-crear"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-cuad-count',
        selector: '[data-tutorial-id="ops-cuad-count"]',
        title: 'Ingresar conteo',
        text: 'Ingresa la cantidad observada. Tip: Enter te ayuda a moverte entre casillas.',
      },
      {
        id: 'ops-close-all-botes',
        chapterId: 'ops-ch8',
        chapterTitle: 'Capítulo 8 — Cierre y edición',
        checkpoint: true,
        selector: '[data-tutorial-role="bote-header"][data-tutorial-boteid="B2"]',
        title: 'Cerrar todos los botes',
        text: 'Cierra el bote actual para dejar todos los botes colapsados.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        lockSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '#pg-ops-tutorial [data-tutorial-role="bote-header"][data-tutorial-boteid="B2"]',
      },
      {
        id: 'ops-close-op',
        selector: '[data-tutorial-id="ops-op-close"]',
        title: 'Cerrar operación',
        text: 'Presiona Ocultar para cerrar la operación y volver a la lista.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        scrollIntoView: 'center',
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea, #pg-ops-tutorial .btab, #pg-ops-tutorial .tx-hd, #pg-ops-tutorial [data-tutorial-role="bote-header"]',
        lockAllowSelector: '[data-tutorial-id="ops-op-close"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-op-edit-btn',
        selector: '[data-tutorial-id="ops-op-edit-btn"]',
        title: 'Editar (lápiz)',
        text: 'Haz click en el botón de lápiz para editar la operación.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 200,
        scrollIntoView: 'center',
        lockSelector:
          '#pg-ops-tutorial button, #pg-ops-tutorial a, #pg-ops-tutorial input, #pg-ops-tutorial select, #pg-ops-tutorial textarea',
        lockAllowSelector: '[data-tutorial-id="ops-op-edit-btn"]',
        lockAllowWithin: '.tut-ov',
      },
      {
        id: 'ops-editop-panel',
        selector: '[data-tutorial-id="ops-editop-panel"]',
        title: 'Panel editar operación',
        text: 'Aquí puedes modificar los datos base de la operación.',
        focusClosestSelector: '.mb-box',
      },
      {
        id: 'ops-editop-tab-botes',
        selector: '[data-tutorial-id="ops-editop-tab-botes"]',
        title: 'Editar botes',
        text: 'Cambia a la pestaña Botes para acceder al editor de botes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 180,
        scrollIntoView: 'center',
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd',
        lockAllowSelector: '[data-tutorial-id="ops-editop-tab-botes"]',
        lockAllowWithin: '.tut-ov, .mb-box',
      },
      {
        id: 'ops-editop-botes-panel',
        selector: '[data-tutorial-id="ops-editop-botes-panel"]',
        title: 'Panel editar botes',
        text: 'Desde aquí puedes abrir el panel para editar los botes de la operación.',
        focusClosestSelector: '.mb-box',
      },
      {
        id: 'ops-editop-open-botes-editor',
        selector: '[data-tutorial-id="ops-editop-open-botes-editor"]',
        title: 'Abrir editor de botes',
        text: 'Haz click para abrir el panel de edición de botes.',
        requiresClick: true,
        passThrough: true,
        advanceDelayMs: 220,
        lockSelector: '#root button, #root a, #root input, #root select, #root textarea, #root .btab, #root .tx-hd',
        lockAllowSelector: '[data-tutorial-id="ops-editop-open-botes-editor"]',
        lockAllowWithin: '.tut-ov, .mb-box',
      },
      {
        id: 'ops-edit-botes-panel',
        selector: '[data-tutorial-id="ops-botes-panel"]',
        title: 'Editor de botes',
        text: 'Este panel permite editar los botes de la operación.',
        focusClosestSelector: '.mb-box',
      },
      {
        id: 'ops-farewell',
        selector: '[data-tutorial-id="ops-botes-panel"]',
        title: 'Mensaje de despedida',
        text: 'Tutorial completado. Ya conoces el flujo de creación y edición de una operación, botes y registro de datos.',
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
  const snapsRef = useRef({ byKey: {}, pending: {} })

  const tipRef = useRef(null)
  const focusedElRef = useRef(null)
  const curStepRef = useRef(null)
  const [tipPos, setTipPos] = useState({ top: 0, left: 0, show: false })
  const [spot, setSpot] = useState(null)

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

    const step = curStepRef.current
    const tipRect = tip.getBoundingClientRect()
    const margin = 12

    if (!el || !el.isConnected) {
      const left = clamp((window.innerWidth - tipRect.width) / 2, margin, window.innerWidth - tipRect.width - margin)
      const top = clamp(90, margin, window.innerHeight - tipRect.height - margin)
      setTipPos({ top, left, show: true })
      setSpot(null)
      return
    }

    const r = el.getBoundingClientRect()
    const gap = 12
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (String(step?.tipPlacement || '') === 'right-center') {
      const left = clamp(vw * 0.62, margin, vw - tipRect.width - margin)
      const top = clamp(vh / 2 - tipRect.height / 2, margin, vh - tipRect.height - margin)
      setTipPos({ top, left, show: true })
    } else {
      const clampPos = (pos) => ({
        top: clamp(pos.top, margin, vh - tipRect.height - margin),
        left: clamp(pos.left, margin, vw - tipRect.width - margin),
      })

      const overlapArea = (a, b) => {
        const x1 = Math.max(a.left, b.left)
        const y1 = Math.max(a.top, b.top)
        const x2 = Math.min(a.left + a.width, b.left + b.width)
        const y2 = Math.min(a.top + a.height, b.top + b.height)
        const w = x2 - x1
        const h = y2 - y1
        if (w <= 0 || h <= 0) return 0
        return w * h
      }

      const tipPositions = [
        { name: 'below', top: r.bottom + gap, left: r.left + r.width / 2 - tipRect.width / 2 },
        { name: 'above', top: r.top - gap - tipRect.height, left: r.left + r.width / 2 - tipRect.width / 2 },
        { name: 'right', top: r.top + r.height / 2 - tipRect.height / 2, left: r.right + gap },
        { name: 'left', top: r.top + r.height / 2 - tipRect.height / 2, left: r.left - gap - tipRect.width },
        { name: 'bottom', top: vh - margin - tipRect.height, left: (vw - tipRect.width) / 2 },
      ]

      const targetRect = { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 }
      let best = null
      tipPositions.forEach((p) => {
        const clamped = clampPos(p)
        const tRect = { top: clamped.top, left: clamped.left, width: tipRect.width, height: tipRect.height }
        const ov = overlapArea(tRect, targetRect)
        const clampDelta = Math.abs(clamped.top - p.top) + Math.abs(clamped.left - p.left)
        const cx = tRect.left + tRect.width / 2
        const cy = tRect.top + tRect.height / 2
        const tx = r.left + r.width / 2
        const ty = r.top + r.height / 2
        const dist = Math.hypot(cx - tx, cy - ty)
        const score = ov * 1000 + clampDelta * 2 + dist
        if (!best || score < best.score) best = { top: clamped.top, left: clamped.left, score }
      })

      setTipPos({ top: best?.top ?? margin, left: best?.left ?? margin, show: true })
    }

    const pad = 14
    const sTop = clamp(r.top - pad, 0, window.innerHeight)
    const sLeft = clamp(r.left - pad, 0, window.innerWidth)
    const sRight = clamp(r.right + pad, 0, window.innerWidth)
    const sBottom = clamp(r.bottom + pad, 0, window.innerHeight)
    const sW = Math.max(0, sRight - sLeft)
    const sH = Math.max(0, sBottom - sTop)
    const br = (() => {
      try {
        const v = window.getComputedStyle(el).borderRadius
        const n = parseFloat(String(v || '').split(' ')[0])
        if (Number.isFinite(n) && n > 0) return n
      } catch {
        //
      }
      return 14
    })()
    const radius = clamp(br + 6, 12, 28)
    setSpot({ top: sTop, left: sLeft, width: sW, height: sH, radius })
  }, [])

  const steps = tour === 'ops' ? opsSteps : dashboardSteps
  const canRender = (tour === 'ops' && isOpsTutorial) || (tour !== 'ops' && isDashboard)
  const curStep = running && canRender ? steps[idx] : null
  curStepRef.current = curStep
  const getChapter = useCallback(
    (at) => {
      const i0 = Number(at)
      if (!Number.isFinite(i0) || i0 < 0) return null
      for (let i = Math.min(i0, steps.length - 1); i >= 0; i--) {
        const s = steps[i]
        const title = String(s?.chapterTitle || '').trim()
        const id = String(s?.chapterId || '').trim()
        if (title) return { id: id || title, title, checkpointIdx: i }
      }
      return null
    },
    [steps],
  )

  const chapter = running && canRender ? getChapter(idx) : null
  const stepLabel = chapter?.title || `${idx + 1} / ${steps.length}`
  const [gateOk, setGateOk] = useState(true)
  const hasGate = !!curStep?.waitForNonEmptySelector || !!curStep?.waitForValue || !!curStep?.gateTrigger
  const nextLocked = !!curStep?.requiresClick || !!curStep?.waitForTrigger || (hasGate && !gateOk)

  const resetSnapshots = useCallback(() => {
    const s = snapsRef.current
    Object.keys(s.pending).forEach((k) => clearTimeout(s.pending[k]?.t))
    snapsRef.current = { byKey: {}, pending: {} }
  }, [])

  const close = useCallback(() => {
    clearFocus()
    lockRef.current.els.forEach((el) => el.removeAttribute('data-tutorial-lock'))
    lockRef.current.els = []
    requestAnimationFrame(() => setTipPos((p) => ({ ...p, show: false })))
    resetSnapshots()
    setRunning(false)
    setIdx(0)
    const backTo = String(returnPageRef.current || '')
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:closeall'))
    if (tour === 'ops' && curPage === 'ops-tutorial') navigate(backTo || 'ops')
  }, [clearFocus, resetSnapshots, tour, curPage, navigate])

  const startDashboard = useCallback(() => {
    returnPageRef.current = 'dashboard'
    setTour('dashboard')
    writeSeen(DASH_SEEN_KEY, true)
    resetSnapshots()
    setIdx(0)
    setRunning(true)
  }, [resetSnapshots])

  const startOps = useCallback(() => {
    returnPageRef.current = curPage || 'ops'
    setTour('ops')
    resetSnapshots()
    setIdx(0)
    setRunning(true)
    navigate('ops-tutorial')
  }, [curPage, navigate, resetSnapshots])

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

  const requestSnapshot = useCallback((tour0, idx0) => {
    const key = `${tour0}:${idx0}`
    const cur = snapsRef.current.byKey[key]
    if (cur !== undefined) return
    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    snapsRef.current.byKey[key] = '__pending__'
    const t = setTimeout(() => {
      const p = snapsRef.current.pending[token]
      if (!p) return
      delete snapsRef.current.pending[token]
      if (snapsRef.current.byKey[key] === '__pending__') snapsRef.current.byKey[key] = null
    }, 650)
    snapsRef.current.pending[token] = { key, t }
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:snapshot:request', { detail: { token, tour: tour0 } }))
  }, [])

  const restoreSnapshot = useCallback((tour0, idx0) => {
    const key = `${tour0}:${idx0}`
    const snap = snapsRef.current.byKey[key]
    if (!snap || snap === '__pending__') return false
    const state = safeClone(snap)
    if (!state) return false
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:closeall'))
    if (tour0 === 'ops') window.dispatchEvent(new CustomEvent('bitecma:tutorial:collapse-botes'))
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:snapshot:restore', { detail: { tour: tour0, state } }))
    return true
  }, [])

  const back = useCallback(() => {
    if (!(running && canRender)) return
    if (idx <= 0) return

    if (tour !== 'ops') {
      const target = idx - 1
      restoreSnapshot(tour, target)
      setIdx(target)
      return
    }

    window.dispatchEvent(new CustomEvent('bitecma:tutorial:closeall'))
    window.dispatchEvent(new CustomEvent('bitecma:tutorial:collapse-botes'))

    const isCheckpoint = !!steps[idx]?.checkpoint
    let target = -1
    if (!isCheckpoint) {
      for (let i = idx; i >= 0; i--) {
        if (steps[i]?.checkpoint) {
          target = i
          break
        }
      }
    } else {
      for (let i = idx - 1; i >= 0; i--) {
        if (steps[i]?.checkpoint) {
          target = i
          break
        }
      }
    }

    if (target < 0) return
    restoreSnapshot(tour, target)
    setIdx(target)
  }, [running, canRender, idx, tour, restoreSnapshot, steps])

  useEffect(() => {
    const step = running && canRender ? steps[idx] : null
    const evt = String(step?.ensureEvent || '').trim()
    if (!step || !evt) return
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent(evt, { detail: { tour, stepId: String(step?.id || '') } }))
    }, 60)
    return () => clearTimeout(t)
  }, [running, canRender, steps, idx, tour])

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
        resetSnapshots()
        setRunning(false)
        setIdx(0)
      }
    }
    window.addEventListener('bitecma:tutorial', onTutorialEvent)
    return () => window.removeEventListener('bitecma:tutorial', onTutorialEvent)
  }, [isAuthed, startOps, startDashboard, resetSnapshots])

  useEffect(() => {
    const onSnapshotResp = (e) => {
      const token = String(e?.detail?.token || '')
      if (!token) return
      const pend = snapsRef.current.pending[token]
      if (!pend) return
      clearTimeout(pend.t)
      delete snapsRef.current.pending[token]
      const nextState = safeClone(e?.detail?.state)
      snapsRef.current.byKey[pend.key] = nextState || null
    }
    window.addEventListener('bitecma:tutorial:snapshot:response', onSnapshotResp)
    return () => window.removeEventListener('bitecma:tutorial:snapshot:response', onSnapshotResp)
  }, [])

  useEffect(() => {
    if (!(running && canRender)) return
    const step = steps[idx]
    if (tour === 'ops' && !step?.checkpoint) return
    requestSnapshot(tour, idx)
  }, [running, canRender, tour, idx, requestSnapshot, steps])

  useEffect(() => {
    if (!(running && canRender)) return
    const step = steps[idx]
    if (!step?.followFocus) return
    const focusSel = String(step?.followFocusSelector || '').trim()

    const onFocusIn = (e) => {
      const t0 = e?.target && e.target.nodeType === 1 ? e.target : null
      if (!t0) return
      const t = focusSel ? (t0.matches?.(focusSel) ? t0 : t0.closest?.(focusSel)) : t0
      if (!t) return
      applyFocus(t)
      requestAnimationFrame(() => recomputeTipPos())
    }

    document.addEventListener('focusin', onFocusIn, true)
    return () => document.removeEventListener('focusin', onFocusIn, true)
  }, [running, canRender, steps, idx, applyFocus, recomputeTipPos])

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
        const focusClosestSel = String(step?.focusClosestSelector || '')
        const focusEl = focusClosestSel ? el.closest?.(focusClosestSel) || el : el
        applyFocus(focusEl)
        const scrollBlock = step?.scrollIntoView
        if (scrollBlock) {
          try {
            focusEl.scrollIntoView({ behavior: 'smooth', block: String(scrollBlock), inline: 'nearest' })
          } catch {
            try {
              focusEl.scrollIntoView()
            } catch {
              //
            }
          }
        }
        const started = performance.now()
        const tick = () => {
          if (retry.token !== token) return
          recomputeTipPos()
          if (performance.now() - started < 450) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        setTimeout(() => {
          if (retry.token !== token) return
          recomputeTipPos()
        }, 80)
        setTimeout(() => {
          if (retry.token !== token) return
          recomputeTipPos()
        }, 180)
        if (scrollBlock) setTimeout(() => recomputeTipPos(), 260)
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
    const allowSel = String(step?.lockAllowSelector || '')
    const allowWithin = String(step?.lockAllowWithin || '')
    if (!sel) return

    const allowExact = allowSel ? new Set(Array.from(document.querySelectorAll(allowSel)).filter((x) => x && x.nodeType === 1)) : null
    const els = Array.from(document.querySelectorAll(sel))
      .filter((x) => x && x.nodeType === 1)
      .filter((el) => {
        if (allowExact && allowExact.has(el)) return false
        if (allowWithin && el.closest?.(allowWithin)) return false
        return true
      })
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
    const gateTrigger = String(step?.gateTrigger || '')
    const gateTriggerClear = String(step?.gateTriggerClear || '')

    if (!nonEmptySel && !waitValSel && !gateTrigger) {
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

      if (gateTrigger) return
      setGateOk(ok)
    }

    const onTrig = (e) => {
      const id = String(e?.detail?.id || '')
      if (!id) return
      if (gateTriggerClear && id === gateTriggerClear) setGateOk(false)
      if (gateTrigger && id === gateTrigger) setGateOk(true)
    }

    const onAny = () => check()
    document.addEventListener('input', onAny, true)
    document.addEventListener('change', onAny, true)
    window.addEventListener('bitecma:tutorial:trigger', onTrig)
    if (gateTrigger) setTimeout(() => setGateOk(false), 0)
    else setTimeout(check, 0)
    gateState.t = setInterval(check, 180)
    return () => {
      document.removeEventListener('input', onAny, true)
      document.removeEventListener('change', onAny, true)
      window.removeEventListener('bitecma:tutorial:trigger', onTrig)
      clearInterval(gateState.t)
    }
  }, [running, canRender, steps, idx])

  useEffect(() => {
    if (!(running && canRender)) return
    const on = () => recomputeTipPos()
    window.addEventListener('resize', on)
    document.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      document.removeEventListener('scroll', on, true)
    }
  }, [running, canRender, idx, recomputeTipPos])

  useEffect(() => {
    if (!(running && canRender)) return
    const tip = tipRef.current
    const el = focusedElRef.current
    if (!tip || !el) return
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => recomputeTipPos())
    ro.observe(tip)
    ro.observe(el)
    return () => ro.disconnect()
  }, [running, canRender, idx, recomputeTipPos])

  useEffect(() => {
    if (!(running && canRender)) return

    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (isFormLikeTarget(e.target)) return
      if (e.key === 'ArrowLeft') back()
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (nextLocked) return
        next()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, canRender, close, next, nextLocked, back])

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
          const tgt = e?.target?.closest ? e.target.closest('button, a, [data-tutorial-advance="true"]') : null
          if (!tgt || !el.contains(tgt)) return
          if (!isAdvanceTarget(tgt)) return
          if (typeof tgt?.disabled === 'boolean' && tgt.disabled) {
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
      {running && canRender && tour === 'ops' && chapter?.title ? (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 99999,
            padding: '6px 10px',
            borderRadius: 10,
            background: 'rgba(20,20,20,.72)',
            color: 'white',
            fontFamily: 'var(--ff-d)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.2,
            pointerEvents: 'none',
          }}
        >
          {chapter.title}
        </div>
      ) : null}
      {running && canRender && curStep && spot ? (
        <>
          <svg className="tut-dim-svg" aria-hidden="true" width={window.innerWidth} height={window.innerHeight}>
            <defs>
              <mask id="tut-hole" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                <rect x="0" y="0" width={window.innerWidth} height={window.innerHeight} fill="white" />
                <rect
                  x={spot.left}
                  y={spot.top}
                  width={spot.width}
                  height={spot.height}
                  rx={spot.radius || 18}
                  ry={spot.radius || 18}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width={window.innerWidth}
              height={window.innerHeight}
              fill="rgba(0,0,0,.62)"
              mask="url(#tut-hole)"
            />
          </svg>
        </>
      ) : null}

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
            <button type="button" className="btn b-out b-sm" onClick={back} disabled={idx <= 0}>
              Atrás
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
