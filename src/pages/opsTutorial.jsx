import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import BoteCard from '../components/ops/BoteCard.jsx'
import SearchableSelect from '../components/common/SearchableSelect.jsx'
import SvgIcon from '../components/svgIcon.jsx'
import { crearUnidades, setUnidadCount } from '../services/densidadService.js'
import { addSample, ensureKind } from '../services/lpMuestrasService.js'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDMY(iso) {
  const s = String(iso || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
}

function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nextOpId(ops, year) {
  const y = String(year)
  const nums = (Array.isArray(ops) ? ops : [])
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

function getOperacionYear(op) {
  const id = String(op?.id || '')
  const m = id.match(/^OP-(\d{4})-/)
  if (m) return m[1]
  const fi = String(op?.fechaInicio || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(fi)) return fi.slice(0, 4)
  return ''
}

function getOperacionSegLabel(op) {
  const n = op?.numSeg
  if (n == null || n === '') return 'SEG —'
  return `SEG ${n}`
}

function getOperacionEspeciesComunes(op, especiesById) {
  const counts = new Map()
  const botes = Array.isArray(op?.botes) ? op.botes : []
  botes.forEach((b) => {
    const units = Array.isArray(b?.transectos) ? b.transectos : []
    units.forEach((u) => {
      const c = u?.counts && typeof u.counts === 'object' ? u.counts : {}
      Object.keys(c)
        .map(Number)
        .filter((x) => Number.isFinite(x))
        .forEach((id) => counts.set(id, (counts.get(id) || 0) + 1))
      if (u?.tipo === 'cuadrante') {
        const spId = Number(u?.especieId)
        if (Number.isFinite(spId)) counts.set(spId, (counts.get(spId) || 0) + 1)
      }
    })
    const lp = b?.lpMuestras && typeof b.lpMuestras === 'object' ? b.lpMuestras : {}
    Object.keys(lp)
      .map(Number)
      .filter((x) => Number.isFinite(x))
      .forEach((id) => counts.set(id, (counts.get(id) || 0) + 1))
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => especiesById.get(Number(id)))
    .filter(Boolean)
    .map((sp) => String(sp?.com || sp?.sci || '').trim())
    .filter(Boolean)
}

export default function OpsTutorialPage({ active }) {
  const { db } = useDb()
  const { toast, openModal, closeModal, modalState } = useUi()

  const safeClone = (v) => {
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

  useEffect(() => {
    const onCloseAll = () => {
      closeModal()
    }
    window.addEventListener('bitecma:tutorial:closeall', onCloseAll)
    return () => window.removeEventListener('bitecma:tutorial:closeall', onCloseAll)
  }, [closeModal])

  const especies = (() => {
    const arr = Array.isArray(db?.especies) ? db.especies : []
    if (arr.length) return arr
    return [
      { id: 1, com: 'Huiro negro', sci: 'Lessonia berteroana' },
      { id: 2, com: 'Cochayuyo', sci: 'Durvillaea antarctica' },
      { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
      { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
    ]
  })()

  const regiones = useMemo(() => (Array.isArray(db?.regionesChile) ? db.regionesChile : []), [db?.regionesChile])
  const regionNameById = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(regiones) ? regiones : []).forEach((r) => m.set(String(r?.id ?? ''), String(r?.rom || r?.nom || r?.id || '').trim()))
    return m
  }, [regiones])
  const regionMetaById = useMemo(() => new Map((Array.isArray(regiones) ? regiones : []).map((r) => [String(r?.id), r])), [regiones])
  const especiesById = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(especies) ? especies : []).forEach((e) => m.set(Number(e?.id), e))
    return m
  }, [especies])
  const sectorAmerb = useMemo(() => (Array.isArray(db?.sectoresAmerb) ? db.sectoresAmerb : []), [db?.sectoresAmerb])
  const opa = useMemo(() => (Array.isArray(db?.opa) ? db.opa : []), [db?.opa])
  const caletasByRegion = useMemo(() => {
    const byId = db?.caletasByRegionId
    if (byId && typeof byId === 'object' && Object.keys(byId).length) return byId
    return db?.caletasByRegionStatic || {}
  }, [db?.caletasByRegionId, db?.caletasByRegionStatic])

  const [tutorialOps, setTutorialOps] = useState([])
  const [expanded, setExpanded] = useState('')
  const [localBotesMaestro, setLocalBotesMaestro] = useState([])
  const [regionSel, setRegionSel] = useState('')
  const [sector, setSector] = useState('')
  const [mes, setMes] = useState('')
  const [texto, setTexto] = useState('')
  const [tutorialBoteJump, setTutorialBoteJump] = useState(null)
  const [tutorialStepId, setTutorialStepId] = useState('')
  const [pendingStep, setPendingStep] = useState(null)
  const pendingStepTimerRef = useRef(0)

  const seedMeta = useMemo(() => {
    const y = String(new Date().getFullYear())
    const opId = `OP-${y}-001`
    const rid = (Array.isArray(regiones) ? regiones : []).some((r) => Number(r?.id) === 4) ? 4 : regiones?.[0]?.id || 1
    const rom = String(regionMetaById.get(String(rid))?.rom || 'IV').trim() || 'IV'
    return {
      opId,
      regionId: Number(rid) || 1,
      regionRom: rom,
      caleta: 'Las Conchas',
      sectorAmerb: 'Los Vilos Sector C',
      org: 'Sindicato de pescadores artesanales',
      bote1: 'Lobo Solitario',
      bote2: 'Elvira Yanet',
    }
  }, [regiones, regionMetaById])

  const snapshotRef = useRef({
    tutorialOps: [],
    expanded: '',
    localBotesMaestro: [],
    regionSel: '',
    sector: '',
    mes: '',
    texto: '',
  })

  useEffect(() => {
    snapshotRef.current = {
      tutorialOps,
      expanded,
      localBotesMaestro,
      regionSel,
      sector,
      mes,
      texto,
    }
  }, [tutorialOps, expanded, localBotesMaestro, regionSel, sector, mes, texto])

  useEffect(() => {
    const chapterRank = {
      'ops-ch1': 1,
      'ops-ch2': 2,
      'ops-ch3': 3,
      'ops-ch4': 4,
      'ops-ch5': 5,
      'ops-ch6': 6,
      'ops-ch7': 7,
      'ops-ch8': 8,
    }

    const findSpeciesId = (name) => {
      const key = normKey(name)
      const sp = (Array.isArray(especies) ? especies : []).find((e) => normKey(e?.com) === key) || null
      return sp ? Number(sp.id) : null
    }

    const ensureSeedState = (rank) => {
      if (rank < 2) return

      const iso = todayISO()
      const locoId = findSpeciesId('Loco')
      const lapaId = findSpeciesId('Lapa Negra')

      setLocalBotesMaestro((prev) => {
        const arr = Array.isArray(prev) ? prev : []
        const has1 = arr.some((b) => normKey(b?.nombre) === normKey(seedMeta.bote1))
        const has2 = arr.some((b) => normKey(b?.nombre) === normKey(seedMeta.bote2))
        const next = [...arr]
        if (!has1) {
          next.unshift({
            id: `TUT-BOAT-${seedMeta.bote1.replace(/\s+/g, '-')}`,
            region: seedMeta.regionRom,
            nombre: seedMeta.bote1,
            nrpa: '',
            nmatricula: '',
            caleta: seedMeta.caleta,
          })
        }
        if (!has2) {
          next.unshift({
            id: `TUT-BOAT-${seedMeta.bote2.replace(/\s+/g, '-')}`,
            region: seedMeta.regionRom,
            nombre: seedMeta.bote2,
            nrpa: '',
            nmatricula: '',
            caleta: seedMeta.caleta,
          })
        }
        return next
      })

      setTutorialOps((prev) => {
        const arr = Array.isArray(prev) ? prev : []
        const existing = arr.find((o) => String(o?.id || '') === seedMeta.opId) || null
        const baseOp = existing || {
          id: seedMeta.opId,
          region: seedMeta.regionId,
          sectorAmerbId: 'custom',
          sectorAmerb: seedMeta.sectorAmerb,
          sector: seedMeta.caleta,
          caleta: seedMeta.caleta,
          tipoOrg: 'STI',
          org: seedMeta.org,
          opaId: 'custom',
          numSeg: null,
          fechaInicio: iso,
          fechaFin: iso,
          botes: [],
        }

        const ensureBotes = rank >= 3
        const ensureTransectos = rank >= 4
        const ensureLp = rank >= 6
        const ensureCuadrantes = rank >= 7

        const prevBotes = Array.isArray(baseOp?.botes) ? baseOp.botes : []
        const byId = new Map(prevBotes.map((b) => [String(b?.id || ''), b]))

        const mkB1 = () => {
          const cur = byId.get('B1') || {}
          const transectosCur = Array.isArray(cur?.transectos) ? cur.transectos : []
          let transectos = transectosCur
          if (ensureTransectos && !transectosCur.length && Number.isFinite(locoId) && Number.isFinite(lapaId)) {
            transectos = crearUnidades({
              unidades: [],
              tipo: 'transecto',
              cantidad: 2,
              area: 120,
              fecha: iso,
              sustrato: 'Roca',
              cubierta: 'Algas',
              especieId: null,
              especiesIds: [locoId, lapaId],
            })
            transectos = setUnidadCount(transectos, 1, locoId, 12)
            transectos = setUnidadCount(transectos, 1, lapaId, 6)
            transectos = setUnidadCount(transectos, 2, locoId, 10)
            transectos = setUnidadCount(transectos, 2, lapaId, 4)
          }

          let lpMuestras = cur?.lpMuestras && typeof cur.lpMuestras === 'object' ? cur.lpMuestras : {}
          if (ensureLp && Number.isFinite(locoId)) {
            lpMuestras = ensureKind(lpMuestras, locoId, 'LP')
            lpMuestras = ensureKind(lpMuestras, locoId, 'L')
            if (((lpMuestras[locoId] || {})?.LP || []).length === 0) lpMuestras = addSample(lpMuestras, locoId, 'LP', { l: 95, p: 240 })
            if (((lpMuestras[locoId] || {})?.L || []).length === 0) lpMuestras = addSample(lpMuestras, locoId, 'L', { l: 102 })
          }
          if (ensureLp && Number.isFinite(lapaId)) {
            lpMuestras = ensureKind(lpMuestras, lapaId, 'LP')
            if (((lpMuestras[lapaId] || {})?.LP || []).length === 0) lpMuestras = addSample(lpMuestras, lapaId, 'LP', { l: 60, p: 120 })
          }

          return {
            id: 'B1',
            nombre: ensureBotes ? seedMeta.bote1 : String(cur?.nombre || ''),
            buzo: String(cur?.buzo || 'Buzo 1'),
            zona: Number(cur?.zona) || 1,
            densTipo: 'transecto',
            lpMuestras,
            transectos,
          }
        }

        const mkB2 = () => {
          const cur = byId.get('B2') || {}
          const transectosCur = Array.isArray(cur?.transectos) ? cur.transectos : []
          let transectos = transectosCur
          if (ensureCuadrantes && !transectosCur.length && Number.isFinite(lapaId)) {
            transectos = crearUnidades({
              unidades: [],
              tipo: 'cuadrante',
              cantidad: 3,
              area: 1,
              fecha: iso,
              sustrato: 'Roca',
              cubierta: '',
              especieId: lapaId,
              especiesIds: [],
            })
            transectos = setUnidadCount(transectos, 1, lapaId, 3)
            transectos = setUnidadCount(transectos, 2, lapaId, 2)
            transectos = setUnidadCount(transectos, 3, lapaId, 4)
          }

          return {
            id: 'B2',
            nombre: ensureBotes ? seedMeta.bote2 : String(cur?.nombre || ''),
            buzo: String(cur?.buzo || 'Buzo 2'),
            zona: Number(cur?.zona) || 2,
            densTipo: 'cuadrante',
            lpMuestras: cur?.lpMuestras && typeof cur.lpMuestras === 'object' ? cur.lpMuestras : {},
            transectos,
          }
        }

        const nextOp = ensureBotes ? { ...baseOp, botes: [mkB1(), mkB2()] } : baseOp
        const rest = arr.filter((o) => String(o?.id || '') !== seedMeta.opId)
        return [nextOp, ...rest]
      })
    }

    const onSeed = (e) => {
      if (!active) return
      const chapterId = String(e?.detail?.chapterId || '').trim()
      if (!chapterId) return
      const rank = chapterRank[chapterId] || 0
      ensureSeedState(rank)

      if (rank >= 4) {
        setRegionSel(String(seedMeta.regionId))
        setExpanded(seedMeta.opId)
        setSector('')
        setMes('')
        setTexto('')
      } else {
        setExpanded('')
        setRegionSel('')
        setSector('')
        setMes('')
        setTexto('')
      }

      if (rank >= 8) {
        setTutorialBoteJump({ token: `${Date.now()}-${Math.random().toString(16).slice(2)}`, opId: seedMeta.opId, boteId: 'B2', tab: 'dens' })
      } else if (rank >= 5) {
        setTutorialBoteJump({ token: `${Date.now()}-${Math.random().toString(16).slice(2)}`, opId: seedMeta.opId, boteId: 'B1', tab: 'lp' })
      } else {
        setTutorialBoteJump(null)
      }

      if (rank === 7) window.dispatchEvent(new CustomEvent('bitecma:tutorial:collapse-botes'))
    }

    window.addEventListener('bitecma:tutorial:seed', onSeed)
    return () => window.removeEventListener('bitecma:tutorial:seed', onSeed)
  }, [active, especies, seedMeta])

  const resolveStepNeeds = useCallback(
    (stepId) => {
      const isBotesModalStepId = (id) => {
        if (!id) return false
        if (id === 'ops-botes-panel') return true
        if (id === 'ops-botes-save') return true
        if (id === 'ops-bote-delete') return true
        if (id === 'ops-bote-addrow') return true
        if (id.startsWith('ops-bote-name-')) return true
        if (id.startsWith('ops-bote-picker-')) return true
        if (id.startsWith('ops-bote-buzo-')) return true
        if (id.startsWith('ops-bote-unidad-')) return true
        return false
      }

      const isEditModalStepId = (id) => {
        if (!id) return false
        if (id.startsWith('ops-editop-')) return true
        return false
      }

      const mapToChapter = (id) => {
        if (!id) return ''
        if (id === 'ops-region-panel') return 'ops-ch3'
        if (id === 'ops-op-card') return 'ops-ch3'
        if (isBotesModalStepId(id)) return 'ops-ch2'
        if (id === 'ops-bote-header' || id === 'ops-tab-dens' || id.startsWith('ops-dens-') || id === 'ops-dens-enter-nav') return 'ops-ch4'
        if (id === 'ops-tab-lp') return 'ops-ch5'
        if (id === 'ops-lp-panel' || id.startsWith('ops-lp-')) return 'ops-ch6'
        if (id === 'ops-bote2-open' || id === 'ops-cuad-dens' || id.startsWith('ops-cuad-')) return 'ops-ch7'
        if (id === 'ops-close-all-botes' || id.startsWith('ops-op-') || id.startsWith('ops-editop-')) return 'ops-ch8'
        return ''
      }

      const op = (Array.isArray(tutorialOps) ? tutorialOps : [])[0] || null
      if (!op && stepId !== 'ops-region-panel') {
        const chapterId = mapToChapter(stepId)
        if (chapterId) {
          window.dispatchEvent(new CustomEvent('bitecma:tutorial:seed', { detail: { chapterId } }))
        }
        return false
      }

      const opId = String(op?.id || '').trim()
      const opRegion = op?.region == null ? '' : String(op.region)
      const botesTitle = opId ? `Botes — ${opId}` : ''

      const shouldCloseModal = (id) => {
        if (!id) return false
        if (id === 'ops-region-panel') return true
        if (id === 'ops-op-card') return true
        if (id === 'ops-bote-header') return true
        if (id === 'ops-tab-dens') return true
        if (id === 'ops-tab-lp') return true
        if (id === 'ops-lp-panel') return true
        if (id === 'ops-bote2-open') return true
        if (id === 'ops-close-all-botes') return true
        if (id === 'ops-op-edit-btn') return false
        if (id.startsWith('ops-editop-')) return false
        if (id.startsWith('ops-op-')) return true
        return false
      }

      const ensureRegionGrid = () => {
        let ok = true
        if (regionSel !== '') {
          setRegionSel('')
          ok = false
        }
        if (expanded !== '') {
          setExpanded('')
          ok = false
        }
        if (tutorialBoteJump) {
          setTutorialBoteJump(null)
          ok = false
        }
        return ok
      }

      const ensureRegionList = () => {
        let ok = true
        if (opRegion && String(regionSel || '') !== opRegion) {
          setRegionSel(opRegion)
          ok = false
        }
        if (expanded !== '') {
          setExpanded('')
          ok = false
        }
        if (tutorialBoteJump) {
          setTutorialBoteJump(null)
          ok = false
        }
        if (sector !== '' || mes !== '' || texto !== '') {
          setSector('')
          setMes('')
          setTexto('')
          ok = false
        }
        return ok
      }

      const ensureOpOpen = () => {
        let ok = true
        if (opRegion && String(regionSel || '') !== opRegion) {
          setRegionSel(opRegion)
          ok = false
        }
        if (opId && String(expanded || '') !== opId) {
          setExpanded(opId)
          ok = false
        }
        if (sector !== '' || mes !== '' || texto !== '') {
          setSector('')
          setMes('')
          setTexto('')
          ok = false
        }
        return ok
      }

      const ensureBotesModalOpen = () => {
        if (!opId) return false
        if (modalState?.open && String(modalState?.title || '').trim() === botesTitle) return true
        if (modalState?.open) {
          closeModal()
          return false
        }
        openBotesModal(opId, op, { initialStepId: stepId })
        return false
      }

      const ensureEditModalOpen = (initialTab) => {
        if (!opId) return false
        const title = `Editar operación — ${opId}`
        const wantsTab = initialTab === 'botes' ? 'botes' : 'op'
        const isAlready = modalState?.open && String(modalState?.title || '').trim() === title
        if (isAlready) {
          if (wantsTab === 'botes') {
            window.dispatchEvent(new CustomEvent('bitecma:tutorial:editop-tab', { detail: { opId, tab: 'botes' } }))
            return false
          }
          window.dispatchEvent(new CustomEvent('bitecma:tutorial:editop-tab', { detail: { opId, tab: 'op' } }))
          return true
        }
        if (modalState?.open) {
          closeModal()
          return false
        }
        openEditOp(op, { initialTab: wantsTab })
        return false
      }

      const ensureJump = (boteId, tab) => {
        if (!opId) return false
        const cur = tutorialBoteJump && typeof tutorialBoteJump === 'object' ? tutorialBoteJump : null
        const same =
          cur &&
          String(cur.opId || '') === opId &&
          String(cur.boteId || '') === String(boteId || '') &&
          String(cur.tab || '') === String(tab || '')
        if (same) return true
        const t = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        setTutorialBoteJump({ token: t, opId, boteId: String(boteId || ''), tab: String(tab || '') })
        return false
      }

      if (isBotesModalStepId(stepId)) return ensureBotesModalOpen()
      if (modalState?.open && shouldCloseModal(stepId)) {
        closeModal()
        return false
      }
      if (stepId === 'ops-region-panel') return ensureRegionGrid()
      if (stepId === 'ops-op-card') return ensureRegionList()

      if (isEditModalStepId(stepId)) {
        const ok = ensureOpOpen()
        const needsBotesTab = stepId === 'ops-editop-botes-panel'
        const modalOk = ensureEditModalOpen(needsBotesTab ? 'botes' : 'op')
        return ok && modalOk
      }

      if (stepId === 'ops-bote-header') {
        const ok = ensureOpOpen()
        window.dispatchEvent(new CustomEvent('bitecma:tutorial:collapse-botes'))
        if (tutorialBoteJump) {
          setTutorialBoteJump(null)
          return false
        }
        return ok
      }

      if (
        stepId === 'ops-tab-dens' ||
        stepId.startsWith('ops-dens-') ||
        stepId === 'ops-dens-enter-nav'
      ) {
        const ok = ensureOpOpen()
        const jumpOk = ensureJump('B1', 'dens')
        return ok && jumpOk
      }

      if (stepId === 'ops-tab-lp') {
        const ok = ensureOpOpen()
        const jumpOk = ensureJump('B1', 'dens')
        return ok && jumpOk
      }

      if (stepId === 'ops-lp-panel' || stepId.startsWith('ops-lp-')) {
        const ok = ensureOpOpen()
        const jumpOk = ensureJump('B1', 'lp')
        return ok && jumpOk
      }

      if (stepId === 'ops-bote2-open' || stepId === 'ops-cuad-dens' || stepId.startsWith('ops-cuad-')) {
        const ok = ensureOpOpen()
        const jumpOk = ensureJump('B2', 'dens')
        return ok && jumpOk
      }

      if (stepId === 'ops-close-all-botes') {
        const ok = ensureOpOpen()
        const jumpOk = ensureJump('B2', 'dens')
        return ok && jumpOk
      }

      if (stepId.startsWith('ops-op-')) {
        return ensureOpOpen()
      }

      return true
    },
    [
      tutorialOps,
      modalState?.open,
      modalState?.title,
      closeModal,
      openBotesModal,
      regionSel,
      expanded,
      sector,
      mes,
      texto,
      tutorialBoteJump,
      seedMeta,
    ],
  )

  useEffect(() => {
    const onStep = (e) => {
      if (!active) return
      const tour = String(e?.detail?.tour || '')
      if (tour && tour !== 'ops') return
      const stepId = String(e?.detail?.stepId || '').trim()
      if (!stepId) return
      setTutorialStepId(stepId)
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setPendingStep({ token, stepId })
    }
    window.addEventListener('bitecma:tutorial:step', onStep)
    return () => window.removeEventListener('bitecma:tutorial:step', onStep)
  }, [active])

  useEffect(() => {
    clearTimeout(pendingStepTimerRef.current)
    if (!active) return
    if (!pendingStep || typeof pendingStep !== 'object') return
    const stepId = String(pendingStep.stepId || '').trim()
    const token = String(pendingStep.token || '').trim()
    if (!stepId || !token) return

    let tries = 0
    const tick = () => {
      if (!active) return
      const cur = pendingStep && typeof pendingStep === 'object' ? pendingStep : null
      if (!cur || String(cur.token || '') !== token) return
      const ok = resolveStepNeeds(stepId)
      if (ok) return
      tries++
      if (tries > 40) return
      pendingStepTimerRef.current = setTimeout(tick, 80)
    }

    tick()
    return () => clearTimeout(pendingStepTimerRef.current)
  }, [active, pendingStep, resolveStepNeeds])

  useEffect(() => {
    const onReq = (e) => {
      if (!active) return
      const tour = String(e?.detail?.tour || '')
      if (tour && tour !== 'ops') return
      const token = String(e?.detail?.token || '')
      if (!token) return
      const state = safeClone(snapshotRef.current)
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:snapshot:response', { detail: { token, state } }))
    }

    const onRestore = (e) => {
      if (!active) return
      const tour = String(e?.detail?.tour || '')
      if (tour && tour !== 'ops') return
      const s = e?.detail?.state
      if (!s || typeof s !== 'object') return
      closeModal()
      setTutorialOps(Array.isArray(s.tutorialOps) ? s.tutorialOps : [])
      setExpanded(String(s.expanded || ''))
      setLocalBotesMaestro(Array.isArray(s.localBotesMaestro) ? s.localBotesMaestro : [])
      setRegionSel(String(s.regionSel || ''))
      setSector(String(s.sector || ''))
      setMes(String(s.mes || ''))
      setTexto(String(s.texto || ''))
    }

    window.addEventListener('bitecma:tutorial:snapshot:request', onReq)
    window.addEventListener('bitecma:tutorial:snapshot:restore', onRestore)
    return () => {
      window.removeEventListener('bitecma:tutorial:snapshot:request', onReq)
      window.removeEventListener('bitecma:tutorial:snapshot:restore', onRestore)
    }
  }, [active, closeModal])

  const regionButtons = useMemo(() => {
    const ops = Array.isArray(tutorialOps) ? tutorialOps : []
    const ids = ops.map((o) => (o?.region == null ? '' : String(o.region))).filter((x) => x)
    const uniq = [...new Set(ids)]
    uniq.sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
    return uniq.map((id) => {
      const r = regionMetaById.get(String(id))
      const nom = String(r?.nom || '')
      const rom = String(r?.rom || '')
      const det = rom || ''
      const label = nom ? `Región de ${nom}` : `Región ${id}`
      return { id: String(id), label, det }
    })
  }, [tutorialOps, regionMetaById])

  const sectoresInRegion = useMemo(() => {
    const rid = String(regionSel || '')
    if (!rid) return []
    const set = new Set()
    ;(Array.isArray(tutorialOps) ? tutorialOps : []).forEach((o) => {
      if (String(o?.region ?? '') !== rid) return
      const s = String(o?.sector || '').trim()
      if (s) set.add(s)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tutorialOps, regionSel])

  const meses = useMemo(() => {
    const rid = String(regionSel || '')
    if (!rid) return []
    const set = new Set()
    ;(Array.isArray(tutorialOps) ? tutorialOps : []).forEach((o) => {
      if (String(o?.region ?? '') !== rid) return
      const fi = String(o?.fechaInicio || '')
      if (/^\d{4}-\d{2}-\d{2}$/.test(fi)) set.add(fi.slice(0, 7))
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [tutorialOps, regionSel])

  useEffect(() => {
    if (!regionSel) return
    if (!sector) return
    if (sectoresInRegion.includes(sector)) return
    setSector('')
  }, [regionSel, sector, sectoresInRegion])

  useEffect(() => {
    if (!regionSel) return
    if (!mes) return
    if (meses.includes(mes)) return
    setMes('')
  }, [regionSel, mes, meses])

  const filteredByRegion = useMemo(() => {
    const rid = String(regionSel || '')
    if (!rid) return []
    const arr = (Array.isArray(tutorialOps) ? tutorialOps : []).filter((o) => String(o?.region ?? '') === rid)
    const term = normKey(texto)
    return arr.filter((o) => {
      if (sector && String(o?.sector || '').trim() !== sector) return false
      if (mes) {
        const fi = String(o?.fechaInicio || '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fi)) return false
        if (fi.slice(0, 7) !== mes) return false
      }
      if (!term) return true
      const hay = [
        o?.id,
        o?.sectorAmerb,
        o?.sector,
        o?.caleta,
        o?.org,
        o?.opaId,
        o?.tipoOrg,
        getOperacionSegLabel(o),
      ]
        .map(normKey)
        .join(' ')
      return hay.includes(term)
    })
  }, [tutorialOps, regionSel, sector, mes, texto])

  const safeUpdateOperacion = (opId, updater) => {
    const id = String(opId || '')
    if (!id) return
    setTutorialOps((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      const idx = arr.findIndex((x) => String(x?.id) === id)
      if (idx < 0) return prev
      const cur = arr[idx]
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...(updater || {}) }
      if (!next || typeof next !== 'object') return prev
      return arr.map((x, i) => (i === idx ? next : x))
    })
  }

  const toggleExpanded = (opId) => {
    const id = String(opId ?? '')
    if (!id) return
    setExpanded((prev) => (String(prev || '') === id ? '' : id))
  }

  const allBotesMaestro = useMemo(() => {
    const base = Array.isArray(db?.botesMaestro) ? db.botesMaestro : []
    const local = Array.isArray(localBotesMaestro) ? localBotesMaestro : []
    return [...base, ...local]
  }, [db?.botesMaestro, localBotesMaestro])

  const openAddBoteModal = (onCreated, { regionId, caleta } = {}) => {
    const regionesSafe = Array.isArray(regiones) ? regiones : []
    const region0 = Number.isFinite(Number(regionId)) ? Number(regionId) : regionesSafe[0]?.id || 1
    const caletas = caletasByRegion?.[region0] || []

    const seedCaleta = String(caleta || '').trim() || caletas?.[0] || ''

    const form0 = {
      region: region0,
      nombre: '',
      nrpa: '',
      nmatricula: '',
      caleta: seedCaleta,
    }

    const Body = () => {
      const [form, setForm] = useState(form0)
      const caletasLocal = caletasByRegion?.[form.region] || []

      const onSave = () => {
        const nombre = String(form.nombre || '').trim()
        if (!nombre) {
          toast('Ingresa nombre de bote', 'red')
          return
        }
        const boat = {
          id: `TUT-BOAT-${Date.now()}`,
          region: String(regionesSafe.find((r) => Number(r?.id) === Number(form.region))?.rom || ''),
          nombre,
          nrpa: String(form.nrpa || '').trim(),
          nmatricula: String(form.nmatricula || '').trim(),
          caleta: String(form.caleta || '').trim(),
        }
        setLocalBotesMaestro((prev) => [boat, ...(Array.isArray(prev) ? prev : [])])
        closeModal()
        toast('Bote creado (tutorial)', 'green')
        if (typeof onCreated === 'function') onCreated(boat.nombre)
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Región</label>
              <select
                className="is"
                value={form.region}
                onChange={(e) => {
                  const newRegion = parseInt(e.target.value, 10)
                  const newCaletas = caletasByRegion?.[newRegion] || []
                  setForm((p) => ({ ...p, region: Number.isFinite(newRegion) ? newRegion : p.region, caleta: newCaletas[0] || '' }))
                }}
              >
                {regionesSafe.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rom} — {r.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="ig">
              <label className="il">Nombre de Bote</label>
              <input
                className="ii"
                placeholder="Ej: CHIPANA"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                autoFocus
              />
            </div>
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">RPA</label>
              <input className="ii" placeholder="Ej: 401" value={form.nrpa} onChange={(e) => setForm((p) => ({ ...p, nrpa: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Matrícula</label>
              <input
                className="ii"
                placeholder="Ej: 100"
                value={form.nmatricula}
                onChange={(e) => setForm((p) => ({ ...p, nmatricula: e.target.value }))}
              />
            </div>
          </div>
          <div className="ig">
            <label className="il">Caleta</label>
            <select className="is" value={form.caleta} onChange={(e) => setForm((p) => ({ ...p, caleta: e.target.value }))}>
              {(Array.isArray(caletasLocal) ? caletasLocal : []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button className="btn b-teal" style={{ flex: 1 }} data-tutorial-id="ops-bote-modal-save" onClick={onSave}>
              Guardar
            </button>
          </div>
        </div>
      )
    }

    openModal('Agregar Nuevo Bote', <Body />, 'normal')
  }

  function openBotesModal(opId, opFallback, { initialStepId } = {}) {
    const initStepId = String(initialStepId || '').trim()
    const BotesEditor = ({ opId, opFallback }) => {
      const opBase = (Array.isArray(tutorialOps) ? tutorialOps : []).find((o) => String(o?.id) === String(opId)) || null
      const base = opBase || opFallback || null
      const [localStepId, setLocalStepId] = useState(() => initStepId || String(tutorialStepId || ''))
      useEffect(() => {
        const onStep = (e) => {
          const tour = String(e?.detail?.tour || '')
          if (tour && tour !== 'ops') return
          const stepId = String(e?.detail?.stepId || '').trim()
          if (!stepId) return
          setLocalStepId(stepId)
        }
        window.addEventListener('bitecma:tutorial:step', onStep)
        return () => window.removeEventListener('bitecma:tutorial:step', onStep)
      }, [])
      const tutorialLock = String(localStepId || '') === 'ops-botes-panel'
      const seed = Array.isArray(base?.botes) ? base.botes : []
      const opCaleta = String(base?.sector || base?.caleta || '').trim()
      const caletaKey = normKey(opCaleta)

      const [rows, setRows] = useState(() => {
        if (seed.length) {
          return seed.slice(0, 2).map((b, i) => ({
            sourceId: String(b?.id || ''),
            zona: Number(b?.zona) || i + 1,
            nombre: String(b?.nombre || ''),
            buzo: String(b?.buzo || ''),
            densTipo: i === 0 ? 'transecto' : b?.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto',
          }))
        }
        return Array.from({ length: 2 }, (_, i) => ({
          sourceId: '',
          zona: i + 1,
          nombre: '',
          buzo: '',
          densTipo: i === 1 ? 'cuadrante' : 'transecto',
        }))
      })

      const [showPanel, setShowPanel] = useState(false)
      const [currentRowIdx, setCurrentRowIdx] = useState(null)
      const [searchTerm, setSearchTerm] = useState('')

      const hasDensidadUnitsForRow = (row) => {
        const id = String(row?.sourceId || '').trim()
        if (!id) return false
        const b = (Array.isArray(base?.botes) ? base.botes : []).find((x) => String(x?.id || '') === id) || null
        return !!(b && Array.isArray(b?.transectos) && b.transectos.length)
      }

      const addRow = () => {
        toast('El tutorial no permite agregar filas', 'blue')
        return
      }

      const removeRow = () => {
        toast('El tutorial no permite eliminar filas', 'blue')
        return
      }

      const openPanel = (idx) => {
        setCurrentRowIdx(idx)
        setShowPanel(true)
        window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: `ops-bote-panel-opened-${idx}` } }))
      }

      const closePanel = () => {
        setShowPanel(false)
        setCurrentRowIdx(null)
        setSearchTerm('')
      }

      const handleSelectBoat = (boatName) => {
        const rowIdx = currentRowIdx
        if (currentRowIdx !== null) {
          setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: boatName } : x)))
        }
        closePanel()
        if (rowIdx !== null) {
          window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: `ops-boat-selected-${rowIdx}` } }))
        }
      }

      const handleAddNewBoat = () => {
        const baseOp = base || {}
        const rowIdx = currentRowIdx
        openAddBoteModal(
          (newBoatName) => {
            if (newBoatName && currentRowIdx !== null) {
              setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: newBoatName } : x)))
            }
            closePanel()
            if (rowIdx !== null) {
              window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: `ops-boat-selected-${rowIdx}` } }))
            }
          },
          { regionId: baseOp?.region, caleta: baseOp?.sector || baseOp?.caleta || '' },
        )
      }

      const onSaveBotes = () => {
        const clean = rows
          .map((r) => ({
            sourceId: String(r.sourceId || ''),
            zona: parseInt(r.zona, 10) || 1,
            nombre: String(r.nombre || '').trim(),
            buzo: String(r.buzo || '').trim(),
            densTipo: r.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto',
          }))
          .slice(0, 2)

        if (!clean[0]?.nombre || !clean[1]?.nombre) {
          toast('Selecciona 2 botes', 'red')
          return
        }
        if (!clean[0]?.buzo || !clean[1]?.buzo) {
          toast('Ingresa el nombre del buzo en ambos botes', 'red')
          return
        }
        if (clean[0]?.densTipo !== 'transecto') {
          toast('El primer bote debe ser Transecto', 'red')
          return
        }
        if (clean[1]?.densTipo !== 'cuadrante') {
          toast('El segundo bote debe ser Cuadrante', 'red')
          return
        }

        safeUpdateOperacion(opId, (cur) => {
          const prevBotes = Array.isArray(cur?.botes) ? cur.botes : []
          const prevById = new Map(prevBotes.map((b) => [String(b?.id || ''), b]))
          const nextBotes = clean.map((r, i) => {
            const prev = prevById.get(r.sourceId)
            const prevDensTipo = prev?.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto'
            const keepDensidad = prev && prevDensTipo === r.densTipo
            return {
              id: `B${i + 1}`,
              nombre: r.nombre,
              buzo: r.buzo,
              zona: r.zona,
              densTipo: r.densTipo,
              lpMuestras: prev?.lpMuestras && typeof prev.lpMuestras === 'object' ? prev.lpMuestras : {},
              transectos: keepDensidad ? (Array.isArray(prev?.transectos) ? prev.transectos : []) : [],
            }
          })
          return { ...cur, botes: nextBotes }
        })

        closeModal()
        toast('Botes actualizados (tutorial)', 'green')
      }

      const masterBotesIndexed = (Array.isArray(allBotesMaestro) ? allBotesMaestro : []).map((b) => ({
        boat: b,
        caletaKey: normKey(b?.caleta),
        nombreKey: normKey(b?.nombre),
        nrpaKey: normKey(b?.nrpa),
        nmatriculaKey: normKey(b?.nmatricula),
      }))

      const filteredBotes = (() => {
        const term = normKey(searchTerm)
        return masterBotesIndexed
          .filter(
            (x) =>
              x.caletaKey === caletaKey &&
              (x.nombreKey.includes(term) || x.nrpaKey.includes(term) || x.nmatriculaKey.includes(term)),
          )
          .map((x) => x.boat)
      })()

      return (
        <div data-tutorial-id="ops-botes-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tutorialLock ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                background: 'transparent',
                pointerEvents: 'auto',
                borderRadius: 12,
              }}
            />
          ) : null}
          <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zona muestreo</th>
                  <th>Bote</th>
                  <th>Buzo</th>
                  <th>Unidad de muestreo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.sourceId || 'new'}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td style={{ minWidth: 120 }}>
                      <input
                        className="ii"
                        type="number"
                        value={r.zona}
                        disabled={tutorialLock}
                        onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, zona: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <input
                        className="ii"
                        placeholder="Nombre bote"
                        value={r.nombre}
                        data-tutorial-id={idx === 0 ? 'ops-bote-name-0' : idx === 1 ? 'ops-bote-name-1' : undefined}
                        disabled={tutorialLock}
                        onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, nombre: e.target.value } : x)))}
                        onClick={() => openPanel(idx)}
                        onFocus={() => openPanel(idx)}
                        style={{
                          borderColor: currentRowIdx === idx ? 'var(--teal)' : undefined,
                          boxShadow: currentRowIdx === idx ? '0 0 0 2px rgba(10,143,126,0.1)' : undefined,
                        }}
                      />
                    </td>
                    <td style={{ minWidth: 220 }}>
                      <input
                        className="ii"
                        placeholder="Nombre buzo"
                        value={r.buzo}
                        data-tutorial-id={idx === 0 ? 'ops-bote-buzo-0' : idx === 1 ? 'ops-bote-buzo-1' : undefined}
                        disabled={tutorialLock}
                        onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, buzo: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 190 }}>
                      <select
                        className="is"
                        value={r.densTipo}
                        data-tutorial-id={idx === 0 ? 'ops-bote-unidad-0' : idx === 1 ? 'ops-bote-unidad-1' : undefined}
                        disabled={tutorialLock || idx === 0}
                        onChange={(e) => {
                          const newDensTipo = e.target.value
                          if (idx === 0) return
                          if (r.densTipo !== newDensTipo) {
                            if (hasDensidadUnitsForRow(r)) {
                              const ok = confirm(
                                'Al cambiar la unidad de muestreo, solo se perderán los datos de densidad (los datos de peso-longitud se mantendrán). ¿Continuar?',
                              )
                              if (!ok) return
                            }
                          }
                          setRows((p) => p.map((x, i) => (i === idx ? { ...x, densTipo: newDensTipo } : x)))
                        }}
                      >
                        <option value="transecto">Transecto</option>
                        <option value="cuadrante" disabled={idx === 0}>
                          Cuadrante
                        </option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn b-out b-sm"
                        data-tutorial-id={idx === 0 ? 'ops-bote-delete-0' : idx === 1 ? 'ops-bote-delete-1' : undefined}
                        disabled
                        onClick={removeRow}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPanel && (
            <div data-tutorial-id="ops-bote-picker" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, backgroundColor: 'var(--bg)', boxShadow: 'var(--shadow)', marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input
                  className="ii"
                  placeholder="Buscar bote, RPA o matrícula..."
                  value={searchTerm}
                  disabled={tutorialLock}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flexGrow: 1, minWidth: 200 }}
                  autoFocus
                />
                <button className="btn b-out" data-tutorial-id="ops-bote-addnew" disabled={tutorialLock} onClick={handleAddNewBoat}>
                  Agregar nuevo
                </button>
                <button className="btn b-out" disabled={tutorialLock} onClick={closePanel}>
                  Cerrar
                </button>
              </div>

              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {filteredBotes.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text3)', textAlign: 'center' }}>
                    No se encontraron botes para "{searchTerm}" en la caleta {opCaleta || '(ninguna)'}.
                  </div>
                ) : (
                  filteredBotes.map((boat) => (
                    <div
                      key={boat.id}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => handleSelectBoat(boat.nombre)}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{boat.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                          RPA {boat.nrpa} · Caleta {boat.caleta}
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'var(--bg2)',
                          padding: '4px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text2)',
                        }}
                      >
                        {boat.region}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn b-out" data-tutorial-id="ops-bote-addrow" disabled onClick={addRow}>
              Agregar fila
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn b-out" disabled={tutorialLock} onClick={closeModal}>
                Cancelar
              </button>
              <button className="btn b-teal" data-tutorial-id="ops-botes-save" disabled={tutorialLock} onClick={onSaveBotes}>
                Guardar botes
              </button>
            </div>
          </div>
        </div>
      )
    }

    openModal(`Botes — ${opId}`, <BotesEditor opId={opId} opFallback={opFallback} />, 'wide')
  }

  useEffect(() => {
    const onEnsureBotes = (e) => {
      if (!active) return
      const op = (Array.isArray(tutorialOps) ? tutorialOps : [])[0] || null
      const opId = String(op?.id || '').trim()
      if (!opId) return
      const stepId = String(e?.detail?.stepId || '').trim()
      if (stepId) setTutorialStepId(stepId)
      openBotesModal(opId, op, { initialStepId: stepId })
    }
    window.addEventListener('bitecma:tutorial:ensure-botes-modal', onEnsureBotes)
    return () => window.removeEventListener('bitecma:tutorial:ensure-botes-modal', onEnsureBotes)
  }, [active, tutorialOps])

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
      const amerbOpts = sectorAmerb
        .filter((a) => a.region === s.region)
        .slice()
        .sort((a, b) => String(a.nombreamerb || '').localeCompare(String(b.nombreamerb || '')))
        .slice(0, 4000)
      const caletasOpts = (Array.isArray(caletasByRegion?.[s.region]) ? caletasByRegion[s.region] : [])
        .slice()
        .sort((a, b) => String(a).localeCompare(String(b)))
        .slice(0, 4000)
      const opaOpts = opa
        .filter((o) => o.region === s.region)
        .slice()
        .sort((a, b) => String(a.nombre || a.nombrecorto || '').localeCompare(String(b.nombre || b.nombrecorto || '')))
        .slice(0, 4000)

      const onSave = () => {
        const segRaw = String(s.numSeg || '').trim()
        const segNum = segRaw === '' ? null : parseInt(segRaw, 10)
        if (segRaw !== '' && !Number.isFinite(segNum)) {
          toast('SEG inválido', 'red')
          return
        }
        if (!String(s.opaId || '').trim()) {
          toast('Selecciona Organización (OPA)', 'red')
          return
        }
        if (!String(s.sector || '').trim()) {
          toast('Ingresa sector/caleta', 'red')
          return
        }

        const opId = nextOpId(tutorialOps, y)
        const op = {
          id: opId,
          region: s.region,
          sectorAmerbId: s.sectorAmerbId,
          sectorAmerb: s.sectorAmerb,
          sector: s.sector,
          caleta: s.sector,
          tipoOrg: s.tipoOrg,
          org: s.org,
          opaId: s.opaId,
          numSeg: segNum,
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
          botes: [],
        }

        setTutorialOps((prev) => [op, ...(Array.isArray(prev) ? prev : [])])
        setExpanded('')
        setRegionSel('')
        setSector('')
        setMes('')
        setTexto('')
        closeModal()
        toast('Operación creada (tutorial)', 'green')
        setTimeout(() => openBotesModal(opId, { id: opId, sector: s.sector, caleta: s.sector, sectorAmerb: s.sectorAmerb, region: s.region }), 50)
      }

      return (
        <div data-tutorial-id="ops-newop-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Región</label>
              <select
                className="is"
                value={s.region}
                onChange={(e) => {
                  const rid = parseInt(e.target.value, 10)
                  setS((p) => ({
                    ...p,
                    region: Number.isFinite(rid) ? rid : p.region,
                    sectorAmerbId: '',
                    sectorAmerb: '',
                    sector: '',
                    opaId: '',
                    org: '',
                  }))
                }}
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
              <input className="ii" placeholder="Ej: 16" value={s.numSeg} onChange={(e) => setS((p) => ({ ...p, numSeg: e.target.value }))} />
            </div>
          </div>
          <SearchableSelect
            label="Sector AMERB"
            value={s.sectorAmerbId}
            options={amerbOpts.map((a) => ({ value: String(a.id), label: a.nombreamerb }))}
            placeholder="Buscar sector AMERB..."
            onChange={(id) => {
              const f = amerbOpts.find((x) => String(x.id) === String(id))
              setS((p) => ({ ...p, sectorAmerbId: String(id || ''), sectorAmerb: f?.nombreamerb || '' }))
            }}
            onAdd={() => {
              const name = prompt('Nuevo Sector AMERB (no se guardará aún):')
              if (!name) return
              toast('Sector AMERB agregado solo para esta operación (pendiente BD)', 'blue')
              setS((p) => ({ ...p, sectorAmerbId: 'custom', sectorAmerb: String(name).trim() }))
            }}
            addLabel="Agregar Sector..."
          />
          <SearchableSelect
            label="Caleta"
            value={s.sector}
            options={caletasOpts.map((c) => ({ value: c, label: c }))}
            placeholder="Buscar caleta..."
            onChange={(v) => setS((p) => ({ ...p, sector: String(v || '') }))}
            onAdd={() => {
              const name = prompt('Nueva Caleta (no se guardará aún):')
              if (!name) return
              toast('Caleta agregada solo para esta operación (pendiente BD)', 'blue')
              setS((p) => ({ ...p, sector: String(name).trim() }))
            }}
            addLabel="Agregar Caleta..."
          />
          <div className="i2">
            <div className="ig">
              <label className="il">Tipo organización</label>
              <select className="is" value={s.tipoOrg} onChange={(e) => setS((p) => ({ ...p, tipoOrg: e.target.value }))}>
                <option value="STI">STI</option>
                <option value="ASOC">ASOC</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
            <SearchableSelect
              label="Organización (OPA)"
              value={s.opaId}
              options={opaOpts.map((o) => ({ value: String(o.id), label: o.nombre || o.nombrecorto }))}
              placeholder="Buscar organización..."
              dataTutorialId="ops-opa"
              onChange={(id) => {
                const f = opaOpts.find((x) => String(x.id) === String(id))
                const nextId = String(id || '')
                setS((p) => ({ ...p, opaId: nextId, org: f?.nombre || '' }))
                if (nextId) {
                  window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-opa-selected' } }))
                }
              }}
              onAdd={() => {
                const name = prompt('Nueva Organización (pendiente BD):')
                if (!name) return
                toast('Organización agregada solo para esta operación (pendiente BD)', 'blue')
                setS((p) => ({ ...p, opaId: 'custom', org: String(name).trim() }))
                window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-opa-selected' } }))
              }}
              addLabel="Agregar Organización..."
            />
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">Fecha inicio</label>
              <input className="ii" type="date" value={s.fechaInicio} onChange={(e) => setS((p) => ({ ...p, fechaInicio: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Fecha fin</label>
              <input className="ii" type="date" value={s.fechaFin} onChange={(e) => setS((p) => ({ ...p, fechaFin: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              data-tutorial-id="ops-newop-create"
              disabled={!String(s.opaId || '').trim()}
              onClick={onSave}
            >
              Crear
            </button>
          </div>
        </div>
      )
    }

    openModal('Nueva operación', <Body />, 'wide')
  }

  const BotesEditor = ({ opId, opFallback, onCancel, onSaved }) => {
    const opBase = (tutorialOps || []).find((o) => String(o?.id) === String(opId)) || null
    const base = opBase || opFallback || null
    const seed = Array.isArray(base?.botes) ? base.botes : []
    const opCaleta = String(base?.sector || base?.caleta || '').trim()
    const caletaKey = normKey(opCaleta)

    const [rows, setRows] = useState(() => {
      if (seed.length) {
        return seed.map((b, i) => ({
          sourceId: String(b?.id || ''),
          zona: Number(b?.zona) || i + 1,
          nombre: String(b?.nombre || ''),
          buzo: String(b?.buzo || ''),
          densTipo: b?.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto',
        }))
      }
      return Array.from({ length: 4 }, (_, i) => ({
        sourceId: '',
        zona: i + 1,
        nombre: '',
        buzo: '',
        densTipo: 'transecto',
      }))
    })

    const [showPanel, setShowPanel] = useState(false)
    const [currentRowIdx, setCurrentRowIdx] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    const hasDensidadUnitsForRow = (row) => {
      const id = String(row?.sourceId || '').trim()
      if (!id) return false
      const b = (Array.isArray(base?.botes) ? base.botes : []).find((x) => String(x?.id || '') === id) || null
      return !!(b && Array.isArray(b?.transectos) && b.transectos.length)
    }

    const addRow = () => {
      setRows((prev) => [...prev, { sourceId: '', zona: (prev[prev.length - 1]?.zona || 0) + 1, nombre: '', buzo: '', densTipo: 'transecto' }])
    }

    const removeRow = (idx) => {
      setRows((prev) => prev.filter((_, i) => i !== idx))
      if (currentRowIdx === idx) {
        setShowPanel(false)
        setCurrentRowIdx(null)
      }
    }

    const openPanel = (idx) => {
      setCurrentRowIdx(idx)
      setShowPanel(true)
    }

    const closePanel = () => {
      setShowPanel(false)
      setCurrentRowIdx(null)
      setSearchTerm('')
    }

    const handleSelectBoat = (boatName) => {
      if (currentRowIdx !== null) {
        setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: boatName } : x)))
      }
      closePanel()
    }

    const handleAddNewBoat = () => {
      openAddBoteModal(
        (newBoatName) => {
          if (newBoatName && currentRowIdx !== null) {
            setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: newBoatName } : x)))
          }
          closePanel()
        },
        { regionId: base?.region, caleta: opCaleta },
      )
    }

    const onSaveBotes = () => {
      const clean = rows
        .map((r) => ({
          sourceId: String(r.sourceId || ''),
          zona: parseInt(r.zona, 10) || 1,
          nombre: String(r.nombre || '').trim(),
          buzo: String(r.buzo || '').trim(),
          densTipo: r.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto',
        }))
        .filter((r) => r.nombre)
      if (!clean.length) {
        toast('Ingresa al menos un bote', 'red')
        return
      }
      safeUpdateOperacion(opId, (cur) => {
        const prevBotes = Array.isArray(cur?.botes) ? cur.botes : []
        const prevById = new Map(prevBotes.map((b) => [String(b?.id || ''), b]))
        const nextBotes = clean.map((r, i) => {
          const prev = prevById.get(r.sourceId)
          const prevDensTipo = prev?.densTipo === 'cuadrante' ? 'cuadrante' : 'transecto'
          const keepDensidad = prev && prevDensTipo === r.densTipo
          return {
            id: `B${i + 1}`,
            nombre: r.nombre,
            buzo: r.buzo,
            zona: r.zona,
            densTipo: r.densTipo,
            lpMuestras: prev?.lpMuestras && typeof prev.lpMuestras === 'object' ? prev.lpMuestras : {},
            transectos: keepDensidad ? (Array.isArray(prev?.transectos) ? prev.transectos : []) : [],
          }
        })
        return { ...cur, botes: nextBotes }
      })
      toast('Botes actualizados (tutorial)', 'green')
      if (typeof onSaved === 'function') onSaved()
    }

    const masterBotesIndexed = useMemo(() => {
      const masterBotes = Array.isArray(allBotesMaestro) ? allBotesMaestro : []
      return masterBotes.map((b) => ({
        boat: b,
        caletaKey: normKey(b?.caleta),
        nombreKey: normKey(b?.nombre),
        nrpaKey: normKey(b?.nrpa),
        nmatriculaKey: normKey(b?.nmatricula),
      }))
    }, [allBotesMaestro])

    const filteredBotes = useMemo(() => {
      const term = normKey(searchTerm)
      return masterBotesIndexed
        .filter((x) => x.caletaKey === caletaKey && (x.nombreKey.includes(term) || x.nrpaKey.includes(term) || x.nmatriculaKey.includes(term)))
        .map((x) => x.boat)
    }, [searchTerm, caletaKey, masterBotesIndexed])

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Zona muestreo</th>
                <th>Bote</th>
                <th>Buzo</th>
                <th>Unidad de muestreo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.sourceId || 'new'}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td style={{ minWidth: 120 }}>
                    <input className="ii" type="number" value={r.zona} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, zona: e.target.value } : x)))} />
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <input
                      className="ii"
                      placeholder="Nombre bote"
                      value={r.nombre}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, nombre: e.target.value } : x)))}
                      onClick={() => openPanel(idx)}
                      onFocus={() => openPanel(idx)}
                      style={{
                        borderColor: currentRowIdx === idx ? 'var(--teal)' : undefined,
                        boxShadow: currentRowIdx === idx ? '0 0 0 2px rgba(10,143,126,0.1)' : undefined,
                      }}
                    />
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <input className="ii" placeholder="Nombre buzo" value={r.buzo} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, buzo: e.target.value } : x)))} />
                  </td>
                  <td style={{ minWidth: 190 }}>
                    <select
                      className="is"
                      value={r.densTipo}
                      onChange={(e) => {
                        const newDensTipo = e.target.value
                        if (r.densTipo !== newDensTipo) {
                          if (hasDensidadUnitsForRow(r)) {
                            const ok = confirm('Al cambiar la unidad de muestreo, solo se perderán los datos de densidad (los datos de peso-longitud se mantendrán). ¿Continuar?')
                            if (!ok) return
                          }
                        }
                        setRows((p) => p.map((x, i) => (i === idx ? { ...x, densTipo: newDensTipo } : x)))
                      }}
                    >
                      <option value="transecto">Transecto</option>
                      <option value="cuadrante">Cuadrante</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn b-out b-sm" onClick={() => removeRow(idx)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showPanel && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, backgroundColor: 'var(--bg)', boxShadow: 'var(--shadow)', marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input
                className="ii"
                placeholder="Buscar bote, RPA o matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flexGrow: 1, minWidth: 200 }}
                autoFocus
              />
              <button className="btn b-out" onClick={handleAddNewBoat}>
                Agregar nuevo
              </button>
              <button className="btn b-out" onClick={closePanel}>
                Cerrar
              </button>
            </div>

            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              {filteredBotes.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text3)', textAlign: 'center' }}>
                  No se encontraron botes para "{searchTerm}" en la caleta {opCaleta || '(ninguna)'}.
                </div>
              ) : (
                filteredBotes.map((boat) => (
                  <div
                    key={boat.id}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => {
                      if (tutorialLock) return
                      handleSelectBoat(boat.nombre)
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{boat.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                        RPA {boat.nrpa} · Caleta {boat.caleta}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg2)', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                      {boat.region}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn b-out" onClick={addRow}>
            Agregar fila
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn b-out"
              onClick={() => {
                if (typeof onCancel === 'function') onCancel()
              }}
            >
              Cancelar
            </button>
            <button className="btn b-teal" onClick={onSaveBotes}>
              Guardar botes
            </button>
          </div>
        </div>
      </div>
    )
  }

  function openEditOp(op, { initialTab } = {}) {
    const opId = String(op?.id || '').trim()
    if (!opId) return

    const Body = () => {
      const [tab, setTab] = useState(() => (initialTab === 'botes' ? 'botes' : 'op'))
      useEffect(() => {
        const onTab = (e) => {
          const d = e?.detail || {}
          if (String(d?.opId || '') !== opId) return
          if (d?.tab === 'botes' || d?.tab === 'op') setTab(d.tab)
        }
        window.addEventListener('bitecma:tutorial:editop-tab', onTab)
        return () => window.removeEventListener('bitecma:tutorial:editop-tab', onTab)
      }, [])
      const [s, setS] = useState(() => ({
        region: Number(op?.region) || regiones[0]?.id || 1,
        sectorAmerbId: String(op?.sectorAmerbId || ''),
        sectorAmerb: String(op?.sectorAmerb || ''),
        sector: String(op?.sector || op?.caleta || ''),
        tipoOrg: String(op?.tipoOrg || 'STI'),
        opaId: String(op?.opaId || ''),
        org: String(op?.org || ''),
        numSeg: op?.numSeg == null ? '' : String(op.numSeg),
        fechaInicio: String(op?.fechaInicio || todayISO()),
        fechaFin: String(op?.fechaFin || todayISO()),
      }))

      const amerbOpts = sectorAmerb
        .filter((a) => a.region === s.region)
        .slice()
        .sort((a, b) => String(a.nombreamerb || '').localeCompare(String(b.nombreamerb || '')))
        .slice(0, 4000)
      const caletasOpts = (Array.isArray(caletasByRegion?.[s.region]) ? caletasByRegion[s.region] : [])
        .slice()
        .sort((a, b) => String(a).localeCompare(String(b)))
        .slice(0, 4000)
      const opaOpts = opa
        .filter((o) => o.region === s.region)
        .slice()
        .sort((a, b) => String(a.nombre || a.nombrecorto || '').localeCompare(String(b.nombre || b.nombrecorto || '')))
        .slice(0, 4000)

      const onSave = () => {
        const segRaw = String(s.numSeg || '').trim()
        const segNum = segRaw === '' ? null : parseInt(segRaw, 10)
        if (segRaw !== '' && !Number.isFinite(segNum)) {
          toast('SEG inválido', 'red')
          return
        }
        if (!String(s.opaId || '').trim()) {
          toast('Selecciona Organización (OPA)', 'red')
          return
        }
        if (!String(s.sector || '').trim()) {
          toast('Ingresa sector/caleta', 'red')
          return
        }

        safeUpdateOperacion(opId, (cur) => ({
          ...(cur || {}),
          region: s.region,
          sectorAmerbId: s.sectorAmerbId,
          sectorAmerb: s.sectorAmerb,
          sector: s.sector,
          caleta: s.sector,
          tipoOrg: s.tipoOrg,
          org: s.org,
          opaId: s.opaId,
          numSeg: segNum,
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
        }))
        closeModal()
        toast('Operación actualizada (tutorial)', 'green')
      }

      return (
        <div data-tutorial-id="ops-editop-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="btabs">
            <div
              className={`btab${tab === 'op' ? ' on' : ''}`}
              data-tutorial-id="ops-editop-tab-op"
              data-tutorial-advance="true"
              onClick={() => setTab('op')}
            >
              Operación
            </div>
            <div
              className={`btab${tab === 'botes' ? ' on' : ''}`}
              data-tutorial-id="ops-editop-tab-botes"
              data-tutorial-advance="true"
              onClick={() => setTab('botes')}
            >
              Botes
            </div>
          </div>

          {tab === 'op' ? (
            <>
              <div className="i2">
                <div className="ig">
                  <label className="il">Región</label>
                  <select
                    className="is"
                    value={s.region}
                    onChange={(e) => {
                      const rid = parseInt(e.target.value, 10)
                      setS((p) => ({
                        ...p,
                        region: Number.isFinite(rid) ? rid : p.region,
                        sectorAmerbId: '',
                        sectorAmerb: '',
                        sector: '',
                        opaId: '',
                        org: '',
                      }))
                    }}
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
                  <input className="ii" placeholder="Ej: 16" value={s.numSeg} onChange={(e) => setS((p) => ({ ...p, numSeg: e.target.value }))} />
                </div>
              </div>

              <SearchableSelect
                label="Sector AMERB"
                value={s.sectorAmerbId}
                options={amerbOpts.map((a) => ({ value: String(a.id), label: a.nombreamerb }))}
                placeholder="Buscar sector AMERB..."
                onChange={(id) => {
                  const f = amerbOpts.find((x) => String(x.id) === String(id))
                  setS((p) => ({ ...p, sectorAmerbId: String(id || ''), sectorAmerb: f?.nombreamerb || '' }))
                }}
                onAdd={() => {
                  const name = prompt('Nuevo Sector AMERB (no se guardará aún):')
                  if (!name) return
                  toast('Sector AMERB agregado solo para esta operación (pendiente BD)', 'blue')
                  setS((p) => ({ ...p, sectorAmerbId: 'custom', sectorAmerb: String(name).trim() }))
                }}
                addLabel="Agregar Sector..."
              />

              <SearchableSelect
                label="Caleta"
                value={s.sector}
                options={caletasOpts.map((c) => ({ value: c, label: c }))}
                placeholder="Buscar caleta..."
                onChange={(v) => setS((p) => ({ ...p, sector: String(v || '') }))}
                onAdd={() => {
                  const name = prompt('Nueva Caleta (no se guardará aún):')
                  if (!name) return
                  toast('Caleta agregada solo para esta operación (pendiente BD)', 'blue')
                  setS((p) => ({ ...p, sector: String(name).trim() }))
                }}
                addLabel="Agregar Caleta..."
              />

              <div className="i2">
                <div className="ig">
                  <label className="il">Tipo organización</label>
                  <select className="is" value={s.tipoOrg} onChange={(e) => setS((p) => ({ ...p, tipoOrg: e.target.value }))}>
                    <option value="STI">STI</option>
                    <option value="ASOC">ASOC</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
                <SearchableSelect
                  label="Organización (OPA)"
                  value={s.opaId}
                  options={opaOpts.map((o) => ({ value: String(o.id), label: o.nombre || o.nombrecorto }))}
                  placeholder="Buscar organización..."
                  onChange={(id) => {
                    const f = opaOpts.find((x) => String(x.id) === String(id))
                    setS((p) => ({ ...p, opaId: String(id || ''), org: f?.nombre || '' }))
                  }}
                  onAdd={() => {
                    const name = prompt('Nueva Organización (pendiente BD):')
                    if (!name) return
                    toast('Organización agregada solo para esta operación (pendiente BD)', 'blue')
                    setS((p) => ({ ...p, opaId: 'custom', org: String(name).trim() }))
                  }}
                  addLabel="Agregar Organización..."
                />
              </div>

              <div className="i2">
                <div className="ig">
                  <label className="il">Fecha inicio</label>
                  <input className="ii" type="date" value={s.fechaInicio} onChange={(e) => setS((p) => ({ ...p, fechaInicio: e.target.value }))} />
                </div>
                <div className="ig">
                  <label className="il">Fecha fin</label>
                  <input className="ii" type="date" value={s.fechaFin} onChange={(e) => setS((p) => ({ ...p, fechaFin: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
                  Cancelar
                </button>
                <button className="btn b-teal" style={{ flex: 1 }} onClick={onSave}>
                  Guardar cambios
                </button>
              </div>
            </>
          ) : (
            <div data-tutorial-id="ops-editop-botes-panel">
              <BotesEditor opId={opId} opFallback={{ ...op, sector: s.sector, caleta: s.sector }} onCancel={() => setTab('op')} />
            </div>
          )}
        </div>
      )
    }

    openModal(`Editar operación — ${opId}`, <Body />, 'wide')
  }

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-ops-tutorial">
      <div className="ph">
        <div>
          <h2>Operaciones (Tutorial)</h2>
          <p>Replica local: no se hacen peticiones a la API.</p>
        </div>
        <div className="ph-a">
          <button className="btn b-out b-sm" disabled>
            Subir EVADIR
          </button>
          <button className="btn b-teal b-sm" data-tutorial-id="ops-newop" onClick={openNewOp}>
            Nueva operación
          </button>
        </div>
      </div>

      {String(regionSel || '') === '' ? (
        <div className="ops-region-grid" data-tutorial-id="ops-region-panel">
          {regionButtons.map((r) => {
            const isPrimary = Number(tutorialOps?.[0]?.region) === Number(r.id)
            return (
              <button
                key={r.id}
                className="card"
                data-tutorial-id={isPrimary ? 'ops-region-btn' : undefined}
                onClick={() => {
                  setExpanded('')
                  setSector('')
                  setMes('')
                  setTexto('')
                  setRegionSel(r.id)
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '18px 18px',
                  borderRadius: 18,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span>{r.label}</span>
                  {r.det ? (
                    <span style={{ fontFamily: 'var(--ff-m)', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      — {r.det}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
          {!regionButtons.length ? (
            <div className="info-box amber">
              <span>i</span>
              <div>Sin operaciones registradas.</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <button
              className="btn b-out b-sm"
              onClick={() => {
                setExpanded('')
                setRegionSel('')
                setSector('')
                setMes('')
                setTexto('')
              }}
            >
              Volver a regiones
            </button>
            <div className="region-title">{regionButtons.find((x) => x.id === String(regionSel))?.label || `Región ${regionSel}`}</div>
          </div>

          {regionSel ? (
            <div className="filters">
              <select className="flt" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Todos los sectores</option>
                {sectoresInRegion.map((s) => (
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
                {filteredByRegion.length} operaciones
              </span>
            </div>
          ) : null}

          {filteredByRegion.length === 0 ? (
            <div className="info-box amber">
              <span>i</span>
              <div>Sin operaciones para esta región con los filtros actuales.</div>
            </div>
          ) : null}

          <div className="ops-grid">
            {filteredByRegion.map((op) => {
                const open = String(expanded || '') === String(op?.id ?? '')
                const isPrimary = String(op?.id ?? '') === String(tutorialOps?.[0]?.id ?? '')
                const year = getOperacionYear(op)
                const segLabel = getOperacionSegLabel(op)
                const regionLabel = regionNameById.get(String(op?.region ?? '')) || String(op?.region || '—')
                const caletaLabel = String(op?.sector || op?.caleta || '').trim() || '—'
                const sectorAmerbLabel = String(op?.sectorAmerb || '').trim() || caletaLabel || '—'
                const especiesComunes = getOperacionEspeciesComunes(op, especiesById)

                return (
                  <div
                    key={op.id}
                    className={`op-card card${open ? ' op-open' : ''}`}
                    data-tutorial-id="ops-op-card"
                    data-tutorial-advance="true"
                    style={{ padding: 12, cursor: open ? 'default' : 'pointer' }}
                    onClick={() => {
                      if (open) return
                      toggleExpanded(op.id)
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                          {year || '—'}, {segLabel}, {sectorAmerbLabel}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="pill p-teal">Región {regionLabel}</span>
                          <span className="pill p-blu">{caletaLabel}</span>
                          <span className="pill p-grn">{fmtDMY(op.fechaInicio)}</span>
                          {especiesComunes.slice(0, 6).map((name, idx) => (
                            <span key={`${name}-${idx}`} className="pill p-pur">
                              {name}
                            </span>
                          ))}
                          {especiesComunes.length > 6 ? <span className="pill p-amb">+{especiesComunes.length - 6}</span> : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          className="btn b-out b-sm"
                          data-tutorial-id={isPrimary && open ? 'ops-op-close' : undefined}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(op.id)
                          }}
                        >
                          {open ? 'Ocultar' : 'Abrir'}
                        </button>
                        <button className="btn b-teal b-sm" disabled onClick={(e) => e.stopPropagation()}>
                          PREVISUALIZAR EVADIR
                        </button>
                        <button
                          className="tb-btn"
                          title="Editar"
                          data-tutorial-id={isPrimary ? 'ops-op-edit-btn' : undefined}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditOp(op)
                          }}
                        >
                          <SvgIcon name="edit" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {open ? (
                      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Botes</div>
                        </div>
                        {(op.botes || []).map((b) => (
                          <BoteCard
                            key={b.id}
                            op={op}
                            bote={b}
                            especies={especies}
                            updateOperacion={safeUpdateOperacion}
                            canWrite={true}
                            toast={toast}
                            openModal={openModal}
                            closeModal={closeModal}
                            lpJump={null}
                            tutorialJump={tutorialBoteJump}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
