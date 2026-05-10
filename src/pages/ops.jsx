import { useEffect, useMemo, useState } from 'react'
import { useOperaciones } from '../hooks/useOperaciones.js'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'
import { useApp } from '../context/appContext.jsx'
import SvgIcon from '../components/svgIcon.jsx'
import BoteCard from '../components/ops/BoteCard.jsx'
import EvadirPreview from '../components/evadir/EvadirPreview.jsx'
import SearchableSelect from '../components/common/SearchableSelect.jsx'
import EvadirImporter from '../components/ops/EvadirImporter.jsx'


/**
 * Genera el próximo ID de operación con formato `OP-YYYY-NNN` basado en operaciones existentes.
 *
 * @param {Array<object>} ops - Operaciones existentes (se lee `o.id`).
 * @param {string|number} year - Año objetivo (YYYY).
 * @returns {string} Nuevo ID en el formato `OP-YYYY-NNN`.
 *
 * Lógica:
 * 1) Extrae IDs que calzan con `OP-YYYY-NNN` para el año solicitado.
 * 2) Obtiene el máximo correlativo `NNN`.
 * 3) Retorna `max + 1` con padding a 3 dígitos.
 *
 * Dependencias externas:
 * - RegExp.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Ignora IDs que no calzan el patrón.
 *
 * @example
 * nextOpId([{id:'OP-2026-001'}], '2026') // 'OP-2026-002'
 *
 * Notas de mantenimiento:
 * - Si cambia el esquema de IDs, actualizar el regex y la lógica de parseo.
 */
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

/**
 * Retorna la fecha actual en formato ISO (YYYY-MM-DD).
 *
 * @returns {string} Fecha ISO.
 *
 * Lógica:
 * 1) Usa `new Date()` local.
 * 2) Formatea año/mes/día con padding.
 *
 * Dependencias externas:
 * - `Date`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * todayISO() // '2026-05-07'
 *
 * Notas de mantenimiento:
 * - Si se requiere timezone específica, centralizar en un helper compartido.
 */
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Obtiene el año asociado a una operación (preferentemente desde `fechaInicio`, con fallback a `id`).
 *
 * @param {object} op - Operación.
 * @returns {string} Año (YYYY) o '' si no se puede determinar.
 *
 * Lógica:
 * 1) Si `fechaInicio` es ISO, toma sus 4 primeros caracteres.
 * 2) Si `fechaInicio` comienza con YYYY, toma esos 4.
 * 3) Si no, intenta extraer del `id` con patrón `OP-YYYY-...`.
 *
 * Dependencias externas:
 * - RegExp.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Retorna '' en casos no determinables.
 *
 * @example
 * getOperacionYear({ fechaInicio: '2026-02-05' }) // '2026'
 *
 * Notas de mantenimiento:
 * - Mantener consistencia con la forma en que el backend almacena fechas.
 */
function getOperacionYear(op) {
  const fi = String(op?.fechaInicio || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(fi)) return fi.slice(0, 4)
  if (/^\d{4}/.test(fi)) return fi.slice(0, 4)
  const id = String(op?.id || '')
  const m = id.match(/^OP-(\d{4})-/)
  return m ? m[1] : ''
}

/**
 * Formatea el número de seguimiento (ESBA) a etiqueta tipo `SEGNN`.
 *
 * @param {object} op - Operación que puede contener `numSeg`.
 * @returns {string} Etiqueta `SEGNN` o `SEG—` si no hay valor numérico.
 *
 * Lógica:
 * 1) Convierte `numSeg` a número.
 * 2) Si no es finito, retorna `SEG—`.
 * 3) Si es finito, trunca y padStart a 2 dígitos.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Retorna fallback si `numSeg` es inválido.
 *
 * @example
 * getOperacionSegLabel({ numSeg: 3 }) // 'SEG03'
 *
 * Notas de mantenimiento:
 * - Si el negocio cambia (por ejemplo, prefijo distinto), ajustar aquí.
 */
function getOperacionSegLabel(op) {
  const n = Number(op?.numSeg)
  if (!Number.isFinite(n)) return 'SEG—'
  return `SEG${String(Math.trunc(n)).padStart(2, '0')}`
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a `DD/MM/YYYY` para display.
 *
 * @param {unknown} iso - Fecha ISO.
 * @returns {string} Fecha formateada o el string original si no es ISO (fallback).
 *
 * Lógica:
 * 1) Si el string no es ISO, retorna el valor original (o '—').
 * 2) Si es ISO, reordena a `DD/MM/YYYY`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Retorna fallback para entradas inválidas.
 *
 * @example
 * fmtDMY('2026-02-05') // '05/02/2026'
 *
 * Notas de mantenimiento:
 * - No valida existencia real de la fecha; solo formato.
 */
function fmtDMY(iso) {
  const s = String(iso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—'
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
}

/**
 * Normaliza texto para comparaciones/búsquedas (minúsculas, sin acentos, alfanumérico).
 *
 * @param {unknown} v - Valor a normalizar.
 * @returns {string} Texto normalizado.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Lowercase + normalize NFD.
 * 3) Elimina diacríticos.
 * 4) Reemplaza separadores no alfanuméricos por espacios, colapsa y recorta.
 *
 * Dependencias externas:
 * - API estándar `String.prototype.normalize`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normKey('Lessonia (sp.)') // 'lessonia sp'
 *
 * Notas de mantenimiento:
 * - Usar solo para matching; no para presentación.
 */
function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Extrae especies presentes en una operación (nombres comunes/científicos) de forma única y ordenada.
 *
 * @param {object} op - Operación con `botes[]` y datos de densidad y/o LP.
 * @param {Map<number, any>} especiesById - Map de especieId -> especie (con `com`/`sci`).
 * @returns {string[]} Nombres únicos (orden alfabético) para mostrar como “pills”.
 *
 * Lógica:
 * 1) Recorre botes:
 *    - En densidad: lee `transectos[].counts` y `cuadrante.especieId`.
 *    - En LP: toma claves de `lpMuestras` por especie.
 * 2) Resuelve cada ID a nombre común/científico usando `especiesById`.
 * 3) Deduplica por clave normalizada (`normKey`) y ordena alfabéticamente.
 *
 * Dependencias externas:
 * - `normKey`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a datos incompletos.
 *
 * @example
 * const names = getOperacionEspeciesComunes(op, especiesById)
 *
 * Notas de mantenimiento:
 * - Mantener esta función liviana (se ejecuta por tarjeta); está optimizada con sets y map.
 */
function getOperacionEspeciesComunes(op, especiesById) {
  const botes = Array.isArray(op?.botes) ? op.botes : []
  const ids = new Set()

  botes.forEach((b) => {
    const transectos = Array.isArray(b?.transectos) ? b.transectos : []
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

    const lpMap = b?.lpMuestras && typeof b.lpMuestras === 'object' ? b.lpMuestras : {}
    Object.keys(lpMap)
      .map(Number)
      .filter((x) => Number.isFinite(x))
      .forEach((id) => ids.add(id))
  })

  const names = [...ids]
    .map((id) => {
      const sp = especiesById?.get?.(Number(id))
      return String(sp?.com || sp?.sci || '').trim()
    })
    .filter(Boolean)

  const seen = new Set()
  const uniq = []
  names
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach((n) => {
      const k = normKey(n)
      if (!k || seen.has(k)) return
      seen.add(k)
      uniq.push(n)
    })

  return uniq
}

/**
 * Convierte un entero positivo a número romano (I, II, III, ...).
 *
 * @param {number|string} n - Número a convertir.
 * @returns {string} Representación en romano, o '' si el número es <= 0.
 *
 * Lógica:
 * 1) Trunca `n` a entero.
 * 2) Itera tabla de valores romanos de mayor a menor.
 * 3) Resta y concatena símbolos mientras se pueda.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Retorna '' si no es convertible.
 *
 * @example
 * toRoman(4) // 'IV'
 *
 * Notas de mantenimiento:
 * - La tabla cubre hasta miles; ampliar si se requieren números mayores.
 */
function toRoman(n) {
  const num = Math.trunc(Number(n) || 0)
  if (num <= 0) return ''
  const map = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],  
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let x = num
  let out = ''
  map.forEach(([v, s]) => {
    while (x >= v) {
      out += s
      x -= v
    }
  })
  return out
}

/**
 * Página de Operaciones: crea/edita operaciones, administra botes y permite previsualizar/importar EVADIR.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (habilita carga de maestros/operaciones).
 * @returns {import('react').JSX.Element} UI completa de operaciones, agrupada por región y con filtros.
 *
 * Lógica (alto nivel):
 * 1) Carga catálogos y operaciones al activarse (regiones, operaciones, botes maestro, sectores AMERB, OPA).
 * 2) Presenta selector de región basado en operaciones existentes.
 * 3) En una región:
 *    - filtros por sector, mes y texto,
 *    - listado de operaciones (cards).
 * 4) En cada operación:
 *    - previsualiza EVADIR (modal),
 *    - edita datos de operación (modal),
 *    - muestra y permite editar botes/unidades (BoteCard, DensidadTab, LpTab).
 * 5) Integra “jump” desde la previsualización LP (EvadirPreview) usando `sessionStorage` + eventos.
 * 6) Ofrece importación EVADIR desde Excel mediante `EvadirImporter` (si hay permisos).
 *
 * Dependencias externas:
 * - Hooks/contextos: `useDb`, `useUi`, `useApp`, `useOperaciones`.
 * - Componentes: `BoteCard`, `EvadirPreview`, `SearchableSelect`, `EvadirImporter`, `SvgIcon`.
 * - APIs Web: `sessionStorage`, `window.addEventListener`, `document.querySelector`, `confirm`.
 *
 * Efectos secundarios:
 * - Carga datos globales al activarse.
 * - Abre/cierra modales.
 * - Persiste operaciones (create/update) y puede eliminar operaciones (Admin).
 * - Registra listeners globales para integración LP-jump (con cleanup).
 *
 * Manejo de errores:
 * - Muestra toasts en fallas de guardado/eliminado.
 * - Protege acceso de escritura con `canWrite`.
 *
 * @example
 * <OpsPage active={page === 'ops'} />
 *
 * Notas de mantenimiento:
 * - Este archivo concentra mucha lógica UI; si sigue creciendo, extraer editores/modales a componentes dedicados.
 * - Mantener el contrato del evento `bitecma:lp-jump` sincronizado con EvadirPreview/LpTab.
 */
export default function OpsPage({ active }) {
  const {
    db,
    ensureRegionesLoaded,
    ensureOperacionesLoaded,
    ensureBotesMaestroLoaded,
    ensureSectoresAmerbLoaded,
    ensureOpaLoaded,
    upsertOperacion,
    updateOperacion,
    deleteOperacion,
    saveOperacion,
    deleteOperacionApi,
    upsertBoteMaestro,
  } = useDb()
  const { toast, openModal, closeModal } = useUi()
  const { canWrite, isAdmin } = useApp()
  const { filtered, meses, sector, setSector, mes, setMes, texto, setTexto, operaciones } =
    useOperaciones()

  const [expanded, setExpanded] = useState('')
  const [regionSel, setRegionSel] = useState('')
  const [lpJump, setLpJump] = useState(null)

  useEffect(() => {
    /**
     * Aplica el “salto” hacia una operación/bote/muestra, típicamente disparado desde la previsualización EVADIR.
     *
     * @param {any} d - Payload del jump (se espera `{ opId, region, token, boteId?, boteNombre?, buzo?, zona?, ... }`).
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Valida que exista `opId`.
     * 2) Ajusta filtros para enfocarse en la región y limpia filtros (sector/mes/texto).
     * 3) Expande la operación (`expanded`) y setea `lpJump` para que los BoteCard/LpTab lo consuman.
     * 4) Hace scroll a la card de la operación (querySelector por `data-op-id`).
     *
     * Dependencias externas:
     * - `document.querySelector` y `scrollIntoView`.
     * - Setters de estado y setters del hook `useOperaciones`.
     *
     * Efectos secundarios:
     * - Cambia filtros, expande UI y dispara scroll.
     *
     * Manejo de errores:
     * - Ignora payloads incompletos.
     */
    const apply = (d) => {
      const opId = String(d?.opId ?? '')
      if (!opId) return
      const ts = Number(d?.ts)
      if (Number.isFinite(ts) && Math.abs(Date.now() - ts) > 30_000) {
        try {
          sessionStorage.removeItem('bitecma_lp_jump')
        } catch {
          return
        }
        return
      }
      try {
        sessionStorage.removeItem('bitecma_lp_jump')
      } catch (err) {
        void err
      }
      const region = d?.region ?? ''
      setRegionSel(String(region ?? ''))
      setSector('')
      setMes('')
      setTexto('')
      setExpanded(opId)
      setLpJump(d)
      setTimeout(() => {
        const safe = opId.replace(/"/g, '\\"')
        const el = document.querySelector(`[data-op-id="${safe}"]`)
        const scroller = el?.closest?.('.main')
        if (el && scroller) {
          const scRect = scroller.getBoundingClientRect()
          const tRect = el.getBoundingClientRect()
          const top = scroller.scrollTop + (tRect.top - scRect.top) - 10
          if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
          else scroller.scrollTop = Math.max(0, top)
        } else {
          el?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
        }
      }, 0)
    }
    /**
     * Handler del evento `bitecma:lp-jump` (CustomEvent) que delega a `apply`.
     *
     * @param {Event} ev - Evento del navegador (se espera `CustomEvent` con `detail`).
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Extrae `detail`.
     * 2) Si es objeto, aplica el jump.
     *
     * Dependencias externas:
     * - `window.addEventListener`.
     *
     * Efectos secundarios:
     * - Los mismos que `apply`.
     *
     * Manejo de errores:
     * - Ignora eventos sin `detail` válido.
     */
    const handler = (ev) => {
      const d = ev?.detail && typeof ev.detail === 'object' ? ev.detail : null
      if (!d) return
      apply(d)
    }
    try {
      const raw = sessionStorage.getItem('bitecma_lp_jump')
      if (raw) {
        sessionStorage.removeItem('bitecma_lp_jump')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') apply(parsed)
      }
    } catch (err) {
      void err
    }
    window.addEventListener('bitecma:lp-jump', handler)
    return () => {
      window.removeEventListener('bitecma:lp-jump', handler)
      try {
        sessionStorage.removeItem('bitecma_lp_jump')
      } catch {
        return
      }
    }
  }, [setMes, setSector, setTexto])

  useEffect(() => {
    const handler = (ev) => {
      const token = String(ev?.detail?.token ?? '')
      if (!token) return
      setLpJump((cur) => {
        if (!cur) return null
        return String(cur?.token ?? '') === token ? null : cur
      })
      try {
        sessionStorage.removeItem('bitecma_lp_jump')
      } catch (err) {
        void err
      }
    }
    window.addEventListener('bitecma:lp-jump-consumed', handler)
    return () => window.removeEventListener('bitecma:lp-jump-consumed', handler)
  }, [])

  useEffect(() => {
    if (!active) return
    ensureBotesMaestroLoaded?.()
    ensureRegionesLoaded?.()
    ensureOperacionesLoaded?.()
    ensureSectoresAmerbLoaded?.()
    ensureOpaLoaded?.()
  }, [
    active,
    ensureBotesMaestroLoaded,
    ensureRegionesLoaded,
    ensureOperacionesLoaded,
    ensureSectoresAmerbLoaded,
    ensureOpaLoaded,
  ])

  /**
   * Expande/colapsa una operación en la lista (UI accordion).
   *
   * @param {string|number} opId - ID de operación a alternar.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Normaliza `opId` a string.
   * 2) Si ya está expandida, colapsa (setea vacío).
   * 3) Si no, expande (setea ese id).
   *
   * Dependencias externas:
   * - `setExpanded` (estado local).
   *
   * Efectos secundarios:
   * - Cambia estado local.
   *
   * Manejo de errores:
   * - Si `opId` es vacío, colapsa.
   *
   * @example
   * <button onClick={() => toggleExpanded(op.id)}>Abrir</button>
   *
   * Notas de mantenimiento:
   * - Mantener `expanded` como string único para evitar múltiples operaciones abiertas simultáneamente.
   */
  const toggleExpanded = (opId) => {
    setExpanded((prev) => {
      const id = String(opId ?? '')
      if (!id) return ''
      return String(prev || '') === id ? '' : id
    })
  }

  const regiones = useMemo(() => db?.regionesChile || [], [db?.regionesChile])
  const sectorAmerb = db?.sectoresAmerb || []
  const caletasByRegion = db?.caletasByRegionStatic || {}
  const opa = useMemo(() => db?.opa || [], [db?.opa])
  const regionMetaById = useMemo(() => new Map(regiones.map((r) => [String(r?.id), r])), [regiones])
  const regionNameById = useMemo(
    () => new Map(regiones.map((r) => [String(r?.id), String(r?.nom || r?.rom || r?.id || '')])),
    [regiones],
  )
  const especiesById = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(db?.especies) ? db.especies : []).forEach((e) => m.set(Number(e?.id), e))
    return m
  }, [db?.especies])

  const regionButtons = useMemo(() => {
    const ops = Array.isArray(operaciones) ? operaciones : []
    const ids = ops
      .map((o) => (o?.region == null ? '' : String(o.region)))
      .filter((x) => x)
    const uniq = [...new Set(ids)]
    uniq.sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
    return uniq.map((id) => {
      const r = regionMetaById.get(String(id))
      const nom = String(r?.nom || '')
      const rom = String(r?.rom || '')
      const det = rom || toRoman(id)
      const label = nom ? `Región de ${nom}` : `Región ${id}`
      return { id: String(id), label, det }
    })
  }, [operaciones, regionMetaById])

  const filteredByRegion = useMemo(() => {
    const rid = String(regionSel || '')
    const arr = Array.isArray(filtered) ? filtered : []
    if (!rid) return []
    return arr.filter((o) => String(o?.region ?? '') === rid)
  }, [filtered, regionSel])

  const sectoresInRegion = useMemo(() => {
    const rid = String(regionSel || '')
    if (!rid) return []
    const set = new Set()
    ;(Array.isArray(operaciones) ? operaciones : []).forEach((o) => {
      if (String(o?.region ?? '') !== rid) return
      const s = String(o?.sector || '').trim()
      if (s) set.add(s)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [operaciones, regionSel])

  useEffect(() => {
    if (!regionSel) return
    if (!sector) return
    if (sectoresInRegion.includes(sector)) return
    setSector('')
  }, [regionSel, sector, sectoresInRegion, setSector])

  /**
   * Actualiza una operación en el store local, respetando modo solo lectura.
   *
   * @param {string} opId - ID de operación.
   * @param {(cur: any) => any} updater - Función que recibe la operación actual y retorna la nueva.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Si `canWrite` es false, no hace nada.
   * 2) Llama `updateOperacion(opId, updater)`.
   *
   * Dependencias externas:
   * - `canWrite` (permisos) y `updateOperacion` (contexto DB).
   *
   * Efectos secundarios:
   * - Modifica estado global de operaciones en memoria.
   *
   * Manejo de errores:
   * - No captura errores; se asume `updateOperacion` es síncrono y seguro.
   *
   * @example
   * safeUpdateOperacion(op.id, (cur) => ({ ...cur, sector: '...' }))
   *
   * Notas de mantenimiento:
   * - Mantener updates inmutables para evitar inconsistencias de render.
   */
  const safeUpdateOperacion = (opId, updater) => {
    if (!canWrite) return
    updateOperacion(opId, updater)
  }

  /**
   * Persiste una operación (crear o actualizar) y sincroniza el store con lo retornado por backend.
   *
   * @param {object} opData - Operación a guardar.
   * @param {'create'|'update'} mode - Modo de persistencia.
   * @returns {Promise<object|null>} Operación guardada/mergeada o `null` si falló.
   *
   * Lógica:
   * 1) Si `canWrite` es false, notifica y aborta.
   * 2) Upsert optimista en store (`upsertOperacion(opData)`).
   * 3) Llama `saveOperacion(opData, { mode })`.
   * 4) Si backend retorna datos, mergea y vuelve a upsert.
   * 5) En error, muestra toast y retorna null.
   *
   * Dependencias externas:
   * - `canWrite`, `toast`.
   * - `saveOperacion` (persistencia) y `upsertOperacion` (store).
   *
   * Efectos secundarios:
   * - Puede generar requests de red y modificar store.
   *
   * Manejo de errores:
   * - Captura excepciones y muestra toast rojo.
   *
   * @example
   * const saved = await safeUpsertOperacion(op, 'update')
   *
   * Notas de mantenimiento:
   * - Mantener el merge para preservar IDs/metadata retornados por backend.
   */
  const safeUpsertOperacion = async (opData, mode) => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return null
    }
    upsertOperacion(opData)
    try {
      const saved = await saveOperacion(opData, { mode })
      if (saved) {
        const merged = { ...(opData || {}), ...(saved || {}) }
        upsertOperacion(merged)
        return merged
      }
      return null
    } catch (err) {
      toast(String(err?.message || 'Error guardando operación'), 'red')
      return null
    }
  }

  /**
   * Elimina una operación vía API (solo Admin) y la remueve del store local.
   *
   * @param {string} opId - ID de la operación a eliminar.
   * @returns {Promise<boolean>} `true` si se eliminó correctamente; `false` si falló o no hay permisos.
   *
   * Lógica:
   * 1) Verifica `isAdmin`; si no, notifica y retorna false.
   * 2) Ejecuta `deleteOperacionApi(opId)`.
   * 3) En éxito, ejecuta `deleteOperacion(opId)` para limpiar el store.
   *
   * Dependencias externas:
   * - `isAdmin`, `toast`.
   * - `deleteOperacionApi` (API) y `deleteOperacion` (store).
   *
   * Efectos secundarios:
   * - Request de red y eliminación de datos locales.
   *
   * Manejo de errores:
   * - Captura error y muestra toast rojo.
   *
   * @example
   * const ok = await safeDeleteOperacion('OP-2026-001')
   *
   * Notas de mantenimiento:
   * - Mantener confirmaciones de UI fuera de esta función para facilitar tests.
   */
  const safeDeleteOperacion = async (opId) => {
    if (!isAdmin) {
      toast('Solo el administrador puede eliminar operaciones', 'blue')
      return false
    }
    try {
      await deleteOperacionApi(opId)
      deleteOperacion(opId)
      return true
    } catch (err) {
      toast(String(err?.message || 'Error eliminando operación'), 'red')
      return false
    }
  }

  /**
   * Abre un modal para agregar un bote al maestro y opcionalmente retornar el nombre creado.
   *
   * @param {(boatName: string) => void} [onBoatCreated] - Callback opcional con el nombre guardado.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Define región y caleta inicial.
   * 2) Renderiza un Body interno con formulario.
   * 3) Valida y guarda vía `upsertBoteMaestro`.
   * 4) En éxito, cierra modal y llama callback si existe.
   *
   * Dependencias externas:
   * - `openModal/closeModal`, `toast`.
   * - `upsertBoteMaestro` (persistencia de maestro).
   *
   * Efectos secundarios:
   * - Abre/cierra modal y puede persistir datos.
   *
   * Manejo de errores:
   * - Captura error de persistencia y muestra toast rojo.
   *
   * @example
   * openAddBoteModal((name) => setRows(...))
   *
   * Notas de mantenimiento:
   * - Mantener normalización (uppercase) para homogeneidad del maestro.
   */
  const openAddBoteModal = (onBoatCreated) => {
    const initialRegion = regiones[0]?.rom || 'I'
    const initialCaletas = caletasByRegion[initialRegion] || []

    /**
     * Cuerpo del modal “Agregar Nuevo Bote”.
     *
     * @returns {import('react').JSX.Element} Formulario de creación.
     *
     * Lógica:
     * 1) Mantiene estado `form` con región/nombre/rpa/matrícula/caleta.
     * 2) Al cambiar región, setea caleta por defecto según catálogo.
     * 3) Valida y persiste con `onSave`.
     *
     * Dependencias externas:
     * - `caletasByRegion`, `upsertBoteMaestro`.
     *
     * Efectos secundarios:
     * - Persistencia en `onSave`.
     *
     * Manejo de errores:
     * - `onSave` captura errores.
     *
     * @example
     * openModal('Agregar Nuevo Bote', <Body />, 'normal')
     *
     * Notas de mantenimiento:
     * - Evitar duplicar lógica con la página Botes; si se vuelve a repetir, extraer un componente común.
     */
    const Body = () => {
      const [form, setForm] = useState({
        region: initialRegion,
        nombre: '',
        nrpa: '',
        nmatricula: '',
        caleta: initialCaletas[0] || ''
      })

      const caletas = caletasByRegion[form.region] || []

      /**
       * Valida y guarda el bote en el maestro.
       *
       * @returns {Promise<void>} Promesa que resuelve al finalizar el guardado.
       *
       * Lógica:
       * 1) Valida `nombre` y `caleta`.
       * 2) Construye payload normalizado (uppercase/trim).
       * 3) Ejecuta `upsertBoteMaestro`.
       * 4) En éxito, notifica, cierra modal y llama `onBoatCreated`.
       *
       * Dependencias externas:
       * - `upsertBoteMaestro`, `toast`, `closeModal`.
       *
       * Efectos secundarios:
       * - Persistencia, toasts y cierre de modal.
       *
       * Manejo de errores:
       * - Captura excepción y muestra toast rojo.
       *
       * @example
       * <button onClick={onSave}>Guardar</button>
       *
       * Notas de mantenimiento:
       * - Unicidad/validación fuerte debe estar en backend.
       */
      const onSave = async () => {
        if (!form.nombre.trim()) {
          toast('Ingresa el nombre del bote', 'red')
          return
        }
        if (!form.caleta) {
          toast('Selecciona una caleta', 'red')
          return
        }

        const newBote = {
          region_rom: form.region,
          nombre: form.nombre.toUpperCase().trim(),
          nrpa: form.nrpa.trim(),
          nmatricula: form.nmatricula.trim(),
          caleta: form.caleta.toUpperCase().trim()
        }

        try {
          const saved = await upsertBoteMaestro(newBote)
          toast('Bote agregado correctamente', 'green')
          closeModal()
          if (typeof onBoatCreated === 'function') {
            onBoatCreated(String(saved?.nombre || newBote.nombre || '').trim())
          }
        } catch (err) {
          toast(String(err?.message || 'Error guardando bote'), 'red')
        }
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
                  const newRegion = e.target.value
                  const newCaletas = caletasByRegion[newRegion] || []
                  setForm((p) => ({ ...p, region: newRegion, caleta: newCaletas[0] || '' }))
                }}
              >
                {regiones.map((r) => (
                  <option key={r.id} value={r.rom}>{r.rom} — {r.nom}</option>
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
              <input
                className="ii"
                placeholder="Ej: 401"
                value={form.nrpa}
                onChange={(e) => setForm((p) => ({ ...p, nrpa: e.target.value }))}
              />
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
            <select
              className="is"
              value={form.caleta}
              onChange={(e) => setForm((p) => ({ ...p, caleta: e.target.value }))}
            >
              {caletas.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button className="btn b-teal" style={{ flex: 1 }} onClick={onSave}>
              Guardar
            </button>
          </div>
        </div>
      )
    }

    openModal('Agregar Nuevo Bote', <Body />, 'normal')
  }

  /**
   * Editor de botes de una operación (inline component usado dentro de modales).
   *
   * Permite configurar botes (zona, nombre, buzo y tipo de unidad de muestreo) y elegir botes desde el maestro
   * filtrando por caleta.
   *
   * @param {object} props - Props del componente.
   * @param {string} props.opId - ID de la operación a editar.
   * @param {object|null} props.opFallback - Operación fallback (por ejemplo, recién creada) si no está en store.
   * @param {() => void} [props.onCancel] - Callback opcional al cancelar.
   * @param {() => void} [props.onSaved] - Callback opcional al guardar.
   * @returns {import('react').JSX.Element} UI del editor de botes.
   *
   * Lógica (alto nivel):
   * 1) Determina operación base (store o fallback) y siembra filas desde `botes`.
   * 2) Permite agregar/eliminar filas y editar campos.
   * 3) Abre un panel de búsqueda para seleccionar bote desde maestro:
   *    - filtra por caleta de la operación,
   *    - filtra por nombre/RPA/matrícula.
   * 4) Al guardar:
   *    - valida que exista al menos un bote con nombre,
   *    - reconstruye `botes` con IDs `B1..Bn`,
   *    - preserva `lpMuestras` y (si corresponde) densidad existente.
   *
   * Dependencias externas:
   * - `db.botesMaestro`, `openAddBoteModal`, `safeUpdateOperacion`, `toast`.
   * - APIs Web: `confirm` para advertir cambios de tipo de unidad.
   *
   * Efectos secundarios:
   * - Modifica la operación en el store local mediante `safeUpdateOperacion`.
   *
   * Manejo de errores:
   * - Muestra toast rojo si el usuario intenta guardar sin botes válidos.
   *
   * @example
   * <BotesEditor opId={op.id} opFallback={op} onSaved={() => setTab('op')} />
   *
   * Notas de mantenimiento:
   * - La generación de IDs `B1..Bn` asume orden de filas; si se requiere persistencia estable, usar IDs del backend.
   * - La lógica de preservación de densidad depende de `densTipo`; mantener consistente con BoteCard/DensidadTab.
   */
  const BotesEditor = ({ opId, opFallback, onCancel, onSaved }) => {
    const opBase = (operaciones || []).find((o) => String(o?.id) === String(opId)) || null
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

    /**
     * Agrega una fila nueva de bote con zona incremental.
     *
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Lee la última zona existente.
     * 2) Inserta una nueva fila con `zona = last + 1` y campos vacíos.
     *
     * Dependencias externas:
     * - `setRows`.
     *
     * Efectos secundarios:
     * - Actualiza estado local del modal.
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * <button onClick={addRow}>Agregar fila</button>
     *
     * Notas de mantenimiento:
     * - Si se permite reordenar filas, revisar el cálculo de zona incremental.
     */
    const addRow = () => {
      setRows((prev) => [...prev, { sourceId: '', zona: (prev[prev.length - 1]?.zona || 0) + 1, nombre: '', buzo: '', densTipo: 'transecto' }])
    }

    /**
     * Elimina una fila por índice y cierra el panel si corresponde.
     *
     * @param {number} idx - Índice de la fila a eliminar.
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Filtra `rows` eliminando la fila `idx`.
     * 2) Si la fila eliminada era la seleccionada, cierra panel y limpia selección.
     *
     * Dependencias externas:
     * - `setRows`, `setShowPanel`, `setCurrentRowIdx`.
     *
     * Efectos secundarios:
     * - Actualiza estado local.
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * removeRow(0)
     *
     * Notas de mantenimiento:
     * - Si se agrega confirmación de borrado, implementarla aquí.
     */
    const removeRow = (idx) => {
      setRows((prev) => prev.filter((_, i) => i !== idx))
      if (currentRowIdx === idx) {
        setShowPanel(false)
        setCurrentRowIdx(null)
      }
    }

    /**
     * Abre el panel de búsqueda/selección para una fila específica.
     *
     * @param {number} idx - Índice de la fila sobre la cual se seleccionará un bote.
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Setea `currentRowIdx`.
     * 2) Muestra el panel.
     *
     * Dependencias externas:
     * - `setCurrentRowIdx`, `setShowPanel`.
     *
     * Efectos secundarios:
     * - Actualiza estado local.
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * openPanel(idx)
     *
     * Notas de mantenimiento:
     * - Mantener consistente con handlers `onClick/onFocus` del input de nombre.
     */
    const openPanel = (idx) => {
      setCurrentRowIdx(idx)
      setShowPanel(true)
    }

    /**
     * Cierra el panel de búsqueda y limpia estado asociado.
     *
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Oculta panel.
     * 2) Limpia índice actual y término de búsqueda.
     *
     * Dependencias externas:
     * - `setShowPanel`, `setCurrentRowIdx`, `setSearchTerm`.
     *
     * Efectos secundarios:
     * - Actualiza estado local.
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * closePanel()
     *
     * Notas de mantenimiento:
     * - Mantener este reset para evitar que una búsqueda anterior quede “pegada”.
     */
    const closePanel = () => {
      setShowPanel(false)
      setCurrentRowIdx(null)
      setSearchTerm('')
    }

    /**
     * Aplica la selección de un bote del maestro a la fila actual.
     *
     * @param {string} boatName - Nombre del bote seleccionado.
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Si hay fila seleccionada (`currentRowIdx`), setea su `nombre`.
     * 2) Cierra el panel.
     *
     * Dependencias externas:
     * - `setRows`, `currentRowIdx`, `closePanel`.
     *
     * Efectos secundarios:
     * - Actualiza estado local.
     *
     * Manejo de errores:
     * - Ignora si no hay fila seleccionada.
     *
     * @example
     * handleSelectBoat('CHIPANA')
     *
     * Notas de mantenimiento:
     * - Si se decide guardar `sourceId` del maestro, extender aquí para persistirlo.
     */
    const handleSelectBoat = (boatName) => {
      if (currentRowIdx !== null) {
        setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: boatName } : x)))
      }
      closePanel()
    }

    /**
     * Abre el flujo para agregar un bote nuevo al maestro y seleccionarlo en la fila actual.
     *
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Abre modal `openAddBoteModal`.
     * 2) Al crear el bote, setea el nombre en la fila actual (si existe).
     * 3) Cierra el panel.
     *
     * Dependencias externas:
     * - `openAddBoteModal`, `setRows`, `currentRowIdx`, `closePanel`.
     *
     * Efectos secundarios:
     * - Abre modal (maestro) y actualiza estado local.
     *
     * Manejo de errores:
     * - Delegado al modal de creación (muestra toast en fallas).
     *
     * @example
     * <button onClick={handleAddNewBoat}>Agregar nuevo</button>
     *
     * Notas de mantenimiento:
     * - Evitar duplicar lógica con otros editores; idealmente extraer un componente reutilizable.
     */
    const handleAddNewBoat = () => {
      openAddBoteModal((newBoatName) => {
        if (newBoatName && currentRowIdx !== null) {
          setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: newBoatName } : x)))
        }
        closePanel()
      })
    }

    /**
     * Valida y persiste los botes configurados en la operación (store local).
     *
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Normaliza filas:
     *    - parsea zona,
     *    - trim de nombre/buzo,
     *    - normaliza `densTipo`.
     * 2) Valida que exista al menos un bote con nombre.
     * 3) Ejecuta `safeUpdateOperacion` para reconstruir `cur.botes`:
     *    - asigna IDs `B1..Bn`,
     *    - preserva `lpMuestras`,
     *    - preserva densidad (`transectos`) solo si `densTipo` no cambió.
     * 4) Muestra toast y ejecuta `onSaved` si corresponde.
     *
     * Dependencias externas:
     * - `safeUpdateOperacion`, `toast`, `confirm`.
     *
     * Efectos secundarios:
     * - Modifica operación en el store local y muestra toasts.
     *
     * Manejo de errores:
     * - Si no hay botes válidos, muestra toast rojo y aborta.
     *
     * @example
     * <button onClick={onSaveBotes}>Guardar botes</button>
     *
     * Notas de mantenimiento:
     * - Esta función no persiste al backend; la persistencia se realiza en otros flujos (saveOperacion).
     */
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
      toast('Botes actualizados', 'green')
      if (typeof onSaved === 'function') onSaved()
    }

    const botesMaestro = db?.botesMaestro
    const masterBotesIndexed = useMemo(() => {
      const masterBotes = Array.isArray(botesMaestro) ? botesMaestro : []
      return masterBotes.map((b) => ({
        boat: b,
        caletaKey: normKey(b?.caleta),
        nombreKey: normKey(b?.nombre),
        nrpaKey: normKey(b?.nrpa),
        nmatriculaKey: normKey(b?.nmatricula),
      }))
    }, [botesMaestro])

    const filteredBotes = useMemo(() => {
      const term = normKey(searchTerm)
      return masterBotesIndexed
        .filter(
          (x) =>
            x.caletaKey === caletaKey &&
            (x.nombreKey.includes(term) || x.nrpaKey.includes(term) || x.nmatriculaKey.includes(term)),
        )
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
                          const ok = confirm('Al cambiar la unidad de muestreo, solo se perderán los datos de densidad (los datos de peso-longitud se mantendrán). ¿Continuar?')
                          if (!ok) return
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
                    onClick={() => handleSelectBoat(boat.nombre)}
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

  /**
   * Abre un modal para editar botes de una operación.
   *
   * Nota: este flujo existe por compatibilidad/uso histórico y hoy es funcionalmente similar a `BotesEditor`.
   *
   * @param {string} opId - ID de operación.
   * @param {object|null} opFallback - Operación fallback si no está en store.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Define `BodyBotes` (formulario).
   * 2) Abre el modal con tamaño amplio.
   *
   * Dependencias externas:
   * - `openModal`, `closeModal`, `toast`, `db.botesMaestro`.
   *
   * Efectos secundarios:
   * - Abre/cierra modal y puede modificar operación en el store (vía `safeUpdateOperacion`).
   *
   * Manejo de errores:
   * - Validaciones y toasts ocurren dentro de `BodyBotes`.
   *
   * @example
   * openBotesTable(op.id, op)
   *
   * Notas de mantenimiento:
   * - Considerar reemplazar este modal por `BotesEditor` para evitar duplicación de lógica.
   */
  const openBotesTable = (opId, opFallback) => {
    /**
     * Cuerpo del modal de edición de botes (versión “tabla”).
     *
     * @returns {import('react').JSX.Element} UI del modal.
     *
     * Lógica:
     * - Similar a `BotesEditor`: administra `rows`, panel de búsqueda y guardado.
     *
     * Dependencias externas:
     * - `db.botesMaestro`, `openAddBoteModal`, `safeUpdateOperacion`, `toast`, `closeModal`.
     *
     * Efectos secundarios:
     * - Actualiza store local y muestra toasts.
     *
     * Manejo de errores:
     * - Evita guardar sin botes válidos.
     *
     * @example
     * <BodyBotes />
     *
     * Notas de mantenimiento:
     * - Mantener este cuerpo alineado con `BotesEditor` si se decide conservar ambos.
     */
    const BodyBotes = () => {
      const opBase = (operaciones || []).find((o) => String(o?.id) === String(opId)) || opFallback || null
      const seed = Array.isArray(opBase?.botes) ? opBase.botes : []
      const opCaleta = String(opBase?.sector || opBase?.caleta || '').trim()
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

      /**
       * Agrega una fila nueva de bote con zona incremental.
       *
       * @returns {void} No retorna valor.
       *
       * Lógica:
       * - Inserta una fila vacía y setea `zona` como última zona + 1.
       *
       * Dependencias externas:
       * - `setRows`.
       *
       * Efectos secundarios:
       * - Actualiza estado local.
       *
       * Manejo de errores:
       * - No aplica.
       *
       * @example
       * addRow()
       *
       * Notas de mantenimiento:
       * - Mantener consistente con la versión `BotesEditor`.
       */
      const addRow = () => {
        setRows((prev) => [...prev, { sourceId: '', zona: (prev[prev.length - 1]?.zona || 0) + 1, nombre: '', buzo: '', densTipo: 'transecto' }])
      }

      /**
       * Elimina una fila por índice y cierra panel si era la fila activa.
       *
       * @param {number} idx - Índice de fila.
       * @returns {void} No retorna valor.
       *
       * Lógica:
       * - Filtra `rows` y resetea panel/selección si corresponde.
       *
       * Dependencias externas:
       * - `setRows`, `setShowPanel`, `setCurrentRowIdx`.
       *
       * Efectos secundarios:
       * - Actualiza estado local.
       *
       * Manejo de errores:
       * - No aplica.
       *
       * @example
       * removeRow(2)
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
      const removeRow = (idx) => {
        setRows((prev) => prev.filter((_, i) => i !== idx))
        if (currentRowIdx === idx) {
          setShowPanel(false)
          setCurrentRowIdx(null)
        }
      }

      /**
       * Abre panel de búsqueda para seleccionar bote para la fila `idx`.
       *
       * @param {number} idx - Índice de fila.
       * @returns {void} No retorna valor.
       *
       * Dependencias externas:
       * - `setCurrentRowIdx`, `setShowPanel`.
       *
       * Efectos secundarios:
       * - Actualiza estado local.
       *
       * Manejo de errores:
       * - No aplica.
       *
       * @example
       * openPanel(0)
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
      const openPanel = (idx) => {
        setCurrentRowIdx(idx)
        setShowPanel(true)
      }

      /**
       * Cierra panel de búsqueda y limpia selección/término.
       *
       * @returns {void} No retorna valor.
       *
       * Dependencias externas:
       * - `setShowPanel`, `setCurrentRowIdx`, `setSearchTerm`.
       *
       * Efectos secundarios:
       * - Actualiza estado local.
       *
       * Manejo de errores:
       * - No aplica.
       *
       * @example
       * closePanel()
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
      const closePanel = () => {
        setShowPanel(false)
        setCurrentRowIdx(null)
        setSearchTerm('')
      }

      /**
       * Selecciona un bote del maestro para la fila actualmente activa.
       *
       * @param {string} boatName - Nombre seleccionado.
       * @returns {void} No retorna valor.
       *
       * Lógica:
       * - Setea `rows[currentRowIdx].nombre` y cierra panel.
       *
       * Dependencias externas:
       * - `currentRowIdx`, `setRows`, `closePanel`.
       *
       * Efectos secundarios:
       * - Actualiza estado local.
       *
       * Manejo de errores:
       * - Ignora si no hay fila activa.
       *
       * @example
       * handleSelectBoat('CHIPANA')
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
      const handleSelectBoat = (boatName) => {
        if (currentRowIdx !== null) {
          setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: boatName } : x)))
        }
        closePanel()
      }

      /**
       * Abre flujo de creación de bote maestro y lo selecciona al finalizar.
       *
       * @returns {void} No retorna valor.
       *
       * Dependencias externas:
       * - `openAddBoteModal`, `currentRowIdx`, `setRows`, `closePanel`.
       *
       * Efectos secundarios:
       * - Abre modal y actualiza estado local.
       *
       * Manejo de errores:
       * - Delegado al modal de creación.
       *
       * @example
       * handleAddNewBoat()
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
      const handleAddNewBoat = () => {
        openAddBoteModal((newBoatName) => {
          if (newBoatName && currentRowIdx !== null) {
            setRows((prev) => prev.map((x, i) => (i === currentRowIdx ? { ...x, nombre: newBoatName } : x)))
          }
          closePanel()
        })
      }

      /**
       * Guarda los botes configurados en la operación (store local) y cierra el modal.
       *
       * @returns {void} No retorna valor.
       *
       * Lógica:
       * 1) Normaliza filas y valida que haya al menos un bote.
       * 2) Reconstruye `botes` y preserva `lpMuestras` (y densidad si no cambió `densTipo`).
       * 3) Cierra modal y muestra toast.
       *
       * Dependencias externas:
       * - `safeUpdateOperacion`, `closeModal`, `toast`.
       *
       * Efectos secundarios:
       * - Actualiza store local, cierra modal y muestra toast.
       *
       * Manejo de errores:
       * - Si no hay botes válidos, muestra toast rojo y aborta.
       *
       * @example
       * onSaveBotes()
       *
       * Notas de mantenimiento:
       * - Mantener consistente con `BotesEditor`.
       */
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
        closeModal()
        toast('Botes actualizados', 'green')
      }

      const botesMaestro = db?.botesMaestro
      const masterBotesIndexed = useMemo(() => {
        const masterBotes = Array.isArray(botesMaestro) ? botesMaestro : []
        return masterBotes.map((b) => ({
          boat: b,
          caletaKey: normKey(b?.caleta),
          nombreKey: normKey(b?.nombre),
          nrpaKey: normKey(b?.nrpa),
          nmatriculaKey: normKey(b?.nmatricula),
        }))
      }, [botesMaestro])

      const filteredBotes = useMemo(() => {
        const term = normKey(searchTerm)
        return masterBotesIndexed
          .filter(
            (x) =>
              x.caletaKey === caletaKey &&
              (x.nombreKey.includes(term) || x.nrpaKey.includes(term) || x.nmatriculaKey.includes(term)),
          )
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
                          boxShadow: currentRowIdx === idx ? '0 0 0 2px rgba(10,143,126,0.1)' : undefined
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
                            const ok = confirm('Al cambiar la unidad de muestreo, solo se perderán los datos de densidad (los datos de peso-longitud se mantendrán). ¿Continuar?')
                            if (!ok) return
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
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              backgroundColor: 'var(--bg)',
              boxShadow: 'var(--shadow)',
              marginTop: 4,
            }}>
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
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => handleSelectBoat(boat.nombre)}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>
                          {boat.nombre}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                          RPA {boat.nrpa} · Caleta {boat.caleta}
                        </div>
                      </div>
                      <div style={{
                        backgroundColor: 'var(--bg2)',
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text2)'
                      }}>
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
              <button className="btn b-out" onClick={closeModal}>
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

    openModal(`Botes — ${opId}`, <BodyBotes />, 'wide')
  }

  /**
   * Abre el modal de edición de una operación (datos generales y botes).
   *
   * @param {object} op - Operación a editar.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Valida permiso de escritura (`canWrite`).
   * 2) Construye `form` inicial con defaults.
   * 3) Define `Body` con tabs:
   *    - “Operación”: edita metadatos y persiste.
   *    - “Botes”: reutiliza `BotesEditor` para editar botes.
   * 4) Abre modal.
   *
   * Dependencias externas:
   * - `toast`, `openModal/closeModal`.
   * - `safeUpsertOperacion` y `safeDeleteOperacion`.
   *
   * Efectos secundarios:
   * - Abre modal y puede persistir o eliminar operación.
   *
   * Manejo de errores:
   * - Bloquea en solo lectura y valida campos requeridos.
   *
   * @example
   * openEditOp(op)
   *
   * Notas de mantenimiento:
   * - Mantener validaciones consistentes con backend (seguimiento, sector, etc.).
   */
  const openEditOp = (op) => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    const iso = todayISO()
    const form = {
      region: op?.region ?? (regiones[0]?.id || 1),
      sectorAmerbId: String(op?.sectorAmerbId || ''),
      sectorAmerb: String(op?.sectorAmerb || ''),
      sector: String(op?.sector || ''),
      tipoOrg: String(op?.tipoOrg || 'STI'),
      opaId: String(op?.opaId || ''),
      org: String(op?.org || ''),
      numSeg: op?.numSeg == null ? '' : String(op.numSeg),
      fechaInicio: String(op?.fechaInicio || iso),
      fechaFin: String(op?.fechaFin || iso),
    }

    /**
     * Cuerpo del modal de edición de operación.
     *
     * @returns {import('react').JSX.Element} UI del modal.
     *
     * Lógica:
     * 1) Administra estado del formulario (`s`) y la pestaña activa (`tab`).
     * 2) Deriva opciones para AMERB/Caletas/OPA según región.
     * 3) Provee acciones:
     *    - `onSave` para actualizar y persistir,
     *    - `onDelete` para eliminar (Admin).
     *
     * Dependencias externas:
     * - `SearchableSelect` para select con búsqueda.
     * - `safeUpdateOperacion`, `safeUpsertOperacion`, `safeDeleteOperacion`.
     *
     * Efectos secundarios:
     * - Puede modificar store local, persistir en backend y cerrar modal.
     *
     * Manejo de errores:
     * - Valida inputs y muestra toasts rojos.
     *
     * @example
     * openModal(`Editar operación — ${op.id}`, <Body />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener la lista de opciones recortada (`slice(0, 4000)`) para evitar UI lenta.
     */
    const Body = () => {
      const [s, setS] = useState(form)
      const [tab, setTab] = useState('op')

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

      /**
       * Valida el formulario y persiste la operación editada.
       *
       * @returns {Promise<void>} Promesa que resuelve al terminar el guardado.
       *
       * Lógica:
       * 1) Valida seguimiento (numérico o vacío) y campos requeridos (Sector AMERB y Caleta).
       * 2) Construye `nextOp` preservando datos existentes.
       * 3) Aplica update local inmediato y luego persiste con `safeUpsertOperacion('update')`.
       * 4) En éxito, cierra modal y notifica.
       *
       * Dependencias externas:
       * - `safeUpdateOperacion`, `safeUpsertOperacion`, `closeModal`, `toast`.
       *
       * Efectos secundarios:
       * - Modifica store local, persiste y cierra modal.
       *
       * Manejo de errores:
       * - Muestra toast rojo ante validación inválida o falla de persistencia.
       *
       * @example
       * <button onClick={onSave}>Guardar cambios</button>
       *
       * Notas de mantenimiento:
       * - Mantener campos del payload alineados con backend.
       */
      const onSave = async () => {
        const segRaw = String(s.numSeg || '').trim()
        const segNum = segRaw === '' ? null : parseInt(segRaw, 10)
        if (segRaw !== '' && !Number.isFinite(segNum)) {
          toast('Seguimiento inválido', 'red')
          return
        }
        if (!String(s.sectorAmerb || '').trim()) {
          toast('Selecciona Sector AMERB', 'red')
          return
        }
        if (!String(s.sector || '').trim()) {
          toast('Selecciona Caleta', 'red')
          return
        }

        const curOp = (Array.isArray(operaciones) ? operaciones : []).find((o) => String(o?.id) === String(op?.id)) || op
        const nextOp = {
          ...(curOp || {}),
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
        }

        safeUpdateOperacion(op.id, nextOp)
        const saved = await safeUpsertOperacion(nextOp, 'update')
        if (!saved) return
        closeModal()
        toast('Operación actualizada', 'green')
      }

      /**
       * Elimina la operación (solo Admin) con confirmaciones dobles.
       *
       * @returns {Promise<void>} Promesa que resuelve al terminar el flujo de eliminación.
       *
       * Lógica:
       * 1) Solicita confirmación inicial y confirmación final.
       * 2) Ejecuta `safeDeleteOperacion(op.id)`.
       * 3) Si se elimina, actualiza UI (colapsa/limpia) y cierra modal.
       *
       * Dependencias externas:
       * - `confirm` (browser), `safeDeleteOperacion`, `setExpanded`, `closeModal`, `toast`.
       *
       * Efectos secundarios:
       * - Puede eliminar datos via API y modificar store/UI.
       *
       * Manejo de errores:
       * - Si la API falla, `safeDeleteOperacion` muestra toast rojo.
       *
       * @example
       * <button onClick={onDelete}>ELIMINAR</button>
       *
       * Notas de mantenimiento:
       * - Mantener confirmaciones para evitar borrados accidentales.
       */
      const onDelete = async () => {
        const ok1 = confirm(
          `Vas a eliminar la operación ${op.id}. Se perderán todos los datos de transectos/cuadrantes, botes y muestras. ¿Continuar?`,
        )
        if (!ok1) return
        const ok2 = confirm(`Confirmación final: ¿Eliminar definitivamente ${op.id}?`)
        if (!ok2) return
        const ok = await safeDeleteOperacion(op.id)
        if (!ok) return
        setExpanded((prev) => {
          const next = new Set(prev)
          next.delete(op.id)
          return next
        })
        closeModal()
        toast('Operación eliminada', 'green')
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="btabs">
            <div className={`btab${tab === 'op' ? ' on' : ''}`} onClick={() => setTab('op')}>
              Operación
            </div>
            <div className={`btab${tab === 'botes' ? ' on' : ''}`} onClick={() => setTab('botes')}>
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

          {isAdmin ? (
            <button className="btn" style={{ border: '1.5px solid var(--red)', background: 'transparent', color: 'var(--red)' }} onClick={onDelete}>
              ELIMINAR OPERACION
            </button>
          ) : null}
            </>
          ) : (
            <BotesEditor opId={op.id} opFallback={{ ...op, sector: s.sector, caleta: s.sector }} onCancel={() => setTab('op')} />
          )}
        </div>
      )
    }

    openModal(`Editar operación — ${op.id}`, <Body />, 'wide')
  }

  /**
   * Abre el modal para crear una operación nueva.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Construye valores por defecto (fechas hoy, región base, etc.).
   * 2) Define `Body` con formulario.
   * 3) En guardar:
   *    - valida campos,
   *    - genera ID `OP-YYYY-NNN`,
   *    - persiste con `safeUpsertOperacion('create')`,
   *    - abre el modal de botes para completar la operación.
   *
   * Dependencias externas:
   * - `todayISO`, `nextOpId`, `safeUpsertOperacion`, `openBotesTable`.
   * - `toast`, `openModal/closeModal`.
   *
   * Efectos secundarios:
   * - Abre modales, persiste operación y puede disparar navegación/scroll indirectos.
   *
   * Manejo de errores:
   * - Valida inputs y muestra toasts rojos.
   *
   * @example
   * <button onClick={openNewOp}>Nueva operación</button>
   *
   * Notas de mantenimiento:
   * - Si se agrega persistencia de botes en el mismo flujo, ajustar el “handoff” a openBotesTable.
   */
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

    /**
     * Cuerpo del modal “Nueva operación”.
     *
     * @returns {import('react').JSX.Element} UI del formulario.
     *
     * Lógica:
     * 1) Administra estado del formulario (`s`).
     * 2) Deriva opciones (AMERB/Caletas/OPA) por región.
     * 3) Ejecuta `onSave` para persistir y continuar con botes.
     *
     * Dependencias externas:
     * - `SearchableSelect`, `toast`, `safeUpsertOperacion`, `closeModal`.
     *
     * Efectos secundarios:
     * - Puede persistir datos y abrir el editor de botes.
     *
     * Manejo de errores:
     * - Valida inputs y muestra toasts rojos.
     *
     * @example
     * openModal('Nueva operación', <Body />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener el recorte de opciones para performance en datasets grandes.
     */
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

      /**
       * Valida el formulario, crea y persiste la operación, y abre el modal de botes.
       *
       * @returns {Promise<void>} Promesa que resuelve al finalizar el flujo.
       *
       * Lógica:
       * 1) Valida seguimiento (numérico o vacío) y caleta/sector requerido.
       * 2) Genera `opId` con `nextOpId`.
       * 3) Persiste operación con `safeUpsertOperacion` en modo `create`.
       * 4) En éxito, cierra modal, notifica y abre `openBotesTable` para completar botes.
       *
       * Dependencias externas:
       * - `nextOpId`, `safeUpsertOperacion`, `openBotesTable`, `toast`, `closeModal`.
       *
       * Efectos secundarios:
       * - Persistencia, cierre de modal, toasts y apertura de nuevo modal.
       *
       * Manejo de errores:
       * - Muestra toast rojo ante validación inválida o falla de persistencia.
       *
       * @example
       * <button onClick={onSave}>Crear</button>
       *
       * Notas de mantenimiento:
       * - El `setTimeout(..., 50)` es una heurística para permitir que el modal cierre antes de abrir el siguiente; revisar si cambia el sistema de modales.
       */
      const onSave = async () => {
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
        const saved = await safeUpsertOperacion(
          {
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
        },
          'create',
        )
        if (!saved) return
        closeModal()
        toast('Operación creada', 'green')
        setTimeout(() => openBotesTable(opId, { id: opId, sector: s.sector, caleta: s.sector, sectorAmerb: s.sectorAmerb }), 50)
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <input
                className="ii"
                placeholder="Ej: 16"
                value={s.numSeg}
                onChange={(e) => setS((p) => ({ ...p, numSeg: e.target.value }))}
              />
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
          {canWrite ? (
            <EvadirImporter
              db={db}
              canWrite={canWrite}
              toast={toast}
              openModal={openModal}
              closeModal={closeModal}
              operaciones={operaciones}
              nextOpId={nextOpId}
              safeUpsertOperacion={safeUpsertOperacion}
            />
          ) : null}
          <button
            className="btn b-teal b-sm"
            disabled={!canWrite}
            onClick={() => {
              if (!canWrite) {
                toast('Modo solo lectura', 'blue')
                return
              }
              openNewOp()
            }}
          >
            Nueva operación
          </button>
        </div>
      </div>



      <div>
        {!regionSel ? (
          <div className="ops-region-grid">
            {regionButtons.map((r) => (
              <button
                key={r.id}
                className="card"
                onClick={() => setRegionSel(r.id)}
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
            ))}
            {!regionButtons.length ? (
              <div className="info-box amber">
                <span>i</span>
                <div>Sin operaciones registradas.</div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <button className="btn b-out b-sm" onClick={() => setRegionSel('')}>
                Volver a regiones
              </button>
              <div className="region-title">
                {regionButtons.find((x) => x.id === regionSel)?.label || `Región ${regionSel}`}
              </div>
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
                const year = getOperacionYear(op)
                const segLabel = getOperacionSegLabel(op)
                const regionLabel = regionNameById.get(String(op?.region ?? '')) || String(op?.region || '—')
                const caletaLabel = String(op?.sector || op?.caleta || '').trim() || '—'
                const sectorAmerbLabel = String(op?.sectorAmerb || '').trim() || caletaLabel || '—'
                const especiesComunes = getOperacionEspeciesComunes(op, especiesById)
                return (
                  <div
                    className={`op-card card${open ? ' op-open' : ''}`}
                    key={op.id}
                    data-op-id={op.id}
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
                    {especiesComunes.length > 6 ? (
                      <span className="pill p-amb">+{especiesComunes.length - 6}</span>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    className="btn b-out b-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(op.id)
                    }}
                  >
                    {open ? 'Ocultar' : 'Abrir'}
                  </button>
                  <button
                    className="btn b-teal b-sm"
                    onClick={(e) => {
                      e.stopPropagation()
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
                    Previsualizar EVADIR
                  </button>
                  {canWrite ? (
                    <button
                      className="tb-btn"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditOp(op)
                      }}
                    >
                      <SvgIcon name="edit" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              {open ? (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
                      Botes
                    </div>
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
                          updateOperacion={safeUpdateOperacion}
                          canWrite={canWrite}
                          toast={toast}
                          openModal={openModal}
                          closeModal={closeModal}
                          lpJump={lpJump}
                        />
                      ))
                  )}
                </div>
              ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
