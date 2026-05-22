import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CALETAS_BY_REGION_STATIC } from '../data/sectores.js'

const DbContext = createContext(null)

const TOKEN_KEY = 'bitecma_token'

/**
 * Retorna el estado inicial de la DB en memoria.
 *
 * @returns {{
 *  especies: Array<object>,
 *  operaciones: Array<object>,
 *  regionesChile: Array<object>,
 *  caletasByRegionStatic: Record<string, Array<string>>,
 *  sectoresAmerb: Array<object>,
 *  opa: Array<object>,
 *  botesMaestro: Array<object>,
 *  perfiles: Array<object>,
 * }} Estructura base.
 *
 * Notas de mantenimiento:
 * - Mantener las claves estables: la UI y servicios asumen estos nombres.
 * - `caletasByRegionStatic` proviene de un catálogo estático para modo offline/auxiliar.
 */
function initialDb() {
  return {
    especies: [],
    operaciones: [],
    regionesChile: [],
    caletas: [],
    caletasByRegionId: {},
    caletasByRegionRom: {},
    caletasByRegionStatic: CALETAS_BY_REGION_STATIC,
    sectoresAmerb: [],
    opa: [],
    botesMaestro: [],
    perfiles: [],
  }
}

/**
 * Provider del contexto de datos (DB en memoria + persistencia vía API).
 *
 * Este contexto expone:
 * - `db`: snapshot de datos en memoria (especies, operaciones, maestros).
 * - `ensure*Loaded`: cargadores idempotentes (cacheados con refs) para poblar `db`.
 * - Mutadores de operaciones y maestros (`upsert*`, `delete*`, `saveOperacion`, etc.).
 *
 * @param {{ children: import('react').ReactNode }} props - Props del provider.
 * @returns {import('react').JSX.Element} Provider.
 *
 * Lógica (alto nivel):
 * 1) Resuelve modo API (`VITE_API_URL`) y crea `apiFetch`.
 * 2) Mantiene “refs” de carga para evitar doble fetch por recurso.
 * 3) Ejecuta cargas base al montar si API está habilitada.
 * 4) Expone un `value` memoizado con API pública del contexto.
 *
 * Dependencias externas:
 * - `fetch` y `localStorage` (para token bearer).
 * - `CALETAS_BY_REGION_STATIC` (catálogo local).
 *
 * Efectos secundarios:
 * - Puede hacer requests HTTP para cargar y persistir datos.
 * - Lee token desde localStorage para autenticar llamadas a API.
 *
 * Notas de mantenimiento:
 * - El contrato de `apiFetch` debe mantenerse consistente con el backend (`{ ok, data, error }`).
 * - Si se agregan nuevos maestros/endpoints, seguir el patrón `ensureXLoaded` con ref `{done,promise}`.
 */
export function DbProvider({ children }) {
  const [db, setDb] = useState(() => initialDb())
  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl

  const botesLoadRef = useRef({ done: false, promise: null })
  const sectoresAmerbLoadRef = useRef({ done: false, promise: null })
  const opaLoadRef = useRef({ done: false, promise: null })
  const especiesLoadRef = useRef({ done: false, promise: null })
  const regionesLoadRef = useRef({ done: false, promise: null })
  const caletasLoadRef = useRef({ done: false, promise: null })
  const operacionesLoadRef = useRef({ done: false, promise: null })
  const perfilesLoadRef = useRef({ done: false, promise: null })
  const opAutosaveRef = useRef({ timers: new Map() })

  const apiFetch = useCallback(
    async (path, opts) => {
      const url = `${apiUrl}/${String(path || '').replace(/^\/+/, '')}`
      const token = (() => {
        try {
          return localStorage.getItem(TOKEN_KEY)
        } catch {
          return null
        }
      })()
      const headers = { ...(opts?.headers || {}) }
      if (!headers['Content-Type'] && opts?.body) headers['Content-Type'] = 'application/json'
      if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`
      const res = await fetch(url, { ...(opts || {}), headers })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = String(json?.error || res.statusText || 'Error')
        throw new Error(msg)
      }
      return json
    },
    [apiUrl],
  )

  const normalizeSectorAmerb = useCallback((s) => {
    const raw = s && typeof s === 'object' ? s : {}
    const id = raw?.id != null ? Number(raw.id) : null
    const regionNum = raw?.region != null ? Number(raw.region) : raw?.region_id != null ? Number(raw.region_id) : null
    const name = String(raw?.nombreamerb ?? raw?.nombre ?? '').trim()
    const comuna = String(raw?.comuna ?? '').trim()

    return {
      ...raw,
      id: Number.isFinite(id) ? id : raw?.id,
      region: Number.isFinite(regionNum) ? regionNum : raw?.region,
      region_id: Number.isFinite(regionNum) ? regionNum : raw?.region_id,
      nombreamerb: name || raw?.nombreamerb || raw?.nombre || '',
      nombre: name || raw?.nombre || raw?.nombreamerb || '',
      comuna,
    }
  }, [])

  const ensureRegionesLoaded = useCallback(async () => {
    if (regionesLoadRef.current.done) return
    if (regionesLoadRef.current.promise) return regionesLoadRef.current.promise
    if (!apiEnabled) {
      regionesLoadRef.current.done = true
      return
    }

    regionesLoadRef.current.promise = apiFetch('/regiones')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, regionesChile: Array.isArray(arr) ? arr : [] }))
        regionesLoadRef.current.done = true
      })
      .finally(() => {
        regionesLoadRef.current.promise = null
      })

    return regionesLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  const ensureEspeciesLoaded = useCallback(async () => {
    if (especiesLoadRef.current.done) return
    if (especiesLoadRef.current.promise) return especiesLoadRef.current.promise

    if (!apiEnabled) {
      especiesLoadRef.current.done = true
      return
    }

    especiesLoadRef.current.promise = apiFetch('/especies')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, especies: Array.isArray(arr) ? arr : [] }))
        especiesLoadRef.current.done = true
      })
      .finally(() => {
        especiesLoadRef.current.promise = null
      })

    return especiesLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  const ensureCaletasLoaded = useCallback(async () => {
    if (caletasLoadRef.current.done) return
    if (caletasLoadRef.current.promise) return caletasLoadRef.current.promise
    if (!apiEnabled) {
      caletasLoadRef.current.done = true
      return
    }

    caletasLoadRef.current.promise = Promise.resolve()
      .then(() => ensureRegionesLoaded?.())
      .then(() => apiFetch('/caletas'))
      .then((json) => {
        const arr = json?.data
        const list = Array.isArray(arr) ? arr : []

        const byId = {}
        list.forEach((c) => {
          const rid = c?.region_id != null ? Number(c.region_id) : c?.regionId != null ? Number(c.regionId) : null
          const nombre = String(c?.nombre ?? '').trim()
          if (!Number.isFinite(rid) || !nombre) return
          const key = String(rid)
          if (!Array.isArray(byId[key])) byId[key] = []
          byId[key].push(nombre)
        })
        Object.keys(byId).forEach((k) => byId[k].sort((a, b) => String(a).localeCompare(String(b))))

        setDb((prev) => {
          const regiones = Array.isArray(prev?.regionesChile) ? prev.regionesChile : []
          const romById = new Map(regiones.map((r) => [Number(r?.id), String(r?.rom || '')]))
          const byRom = {}
          Object.entries(byId).forEach(([ridStr, names]) => {
            const rom = romById.get(Number(ridStr))
            if (!rom) return
            byRom[String(rom)] = names
          })
          return {
            ...prev,
            caletas: list,
            caletasByRegionId: byId,
            caletasByRegionRom: byRom,
          }
        })

        caletasLoadRef.current.done = true
      })
      .finally(() => {
        caletasLoadRef.current.promise = null
      })

    return caletasLoadRef.current.promise
  }, [apiEnabled, apiFetch, ensureRegionesLoaded])

  const ensureBotesMaestroLoaded = useCallback(async () => {
    if (botesLoadRef.current.done) return
    if (botesLoadRef.current.promise) return botesLoadRef.current.promise
    if (!apiEnabled) {
      botesLoadRef.current.done = true
      return
    }

    botesLoadRef.current.promise = apiFetch('/botes')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, botesMaestro: Array.isArray(arr) ? arr : [] }))
        botesLoadRef.current.done = true
      })
      .finally(() => {
        botesLoadRef.current.promise = null
      })

    return botesLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  const ensureSectoresAmerbLoaded = useCallback(async () => {
    if (sectoresAmerbLoadRef.current.done) return
    if (sectoresAmerbLoadRef.current.promise) return sectoresAmerbLoadRef.current.promise
    if (!apiEnabled) {
      sectoresAmerbLoadRef.current.done = true
      return
    }

    sectoresAmerbLoadRef.current.promise = apiFetch('/sectores')
      .then((json) => {
        const arr = json?.data
        const next = Array.isArray(arr) ? arr.map(normalizeSectorAmerb) : []
        setDb((prev) => ({ ...prev, sectoresAmerb: next }))
        sectoresAmerbLoadRef.current.done = true
      })
      .finally(() => {
        sectoresAmerbLoadRef.current.promise = null
      })

    return sectoresAmerbLoadRef.current.promise
  }, [apiEnabled, apiFetch, normalizeSectorAmerb])

  const ensureOpaLoaded = useCallback(async () => {
    if (opaLoadRef.current.done) return
    if (opaLoadRef.current.promise) return opaLoadRef.current.promise

    if (!apiEnabled) {
      opaLoadRef.current.done = true
      return
    }

    opaLoadRef.current.promise = apiFetch('/organizaciones')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, opa: Array.isArray(arr) ? arr : [] }))
        opaLoadRef.current.done = true
      })
      .finally(() => {
        opaLoadRef.current.promise = null
      })

    return opaLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  const ensureOperacionesLoaded = useCallback(async () => {
    if (operacionesLoadRef.current.done) return
    if (operacionesLoadRef.current.promise) return operacionesLoadRef.current.promise
    if (!apiEnabled) {
      operacionesLoadRef.current.done = true
      return
    }

    operacionesLoadRef.current.promise = apiFetch('/operaciones')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, operaciones: Array.isArray(arr) ? arr : [] }))
        operacionesLoadRef.current.done = true
      })
      .finally(() => {
        operacionesLoadRef.current.promise = null
      })

    return operacionesLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  const ensurePerfilesLoaded = useCallback(async () => {
    if (perfilesLoadRef.current.done) return
    if (perfilesLoadRef.current.promise) return perfilesLoadRef.current.promise
    if (!apiEnabled) {
      perfilesLoadRef.current.done = true
      return
    }

    perfilesLoadRef.current.promise = apiFetch('/usuarios')
      .then((json) => {
        const arr = json?.data
        setDb((prev) => ({ ...prev, perfiles: Array.isArray(arr) ? arr : [] }))
        perfilesLoadRef.current.done = true
      })
      .catch(() => {
        perfilesLoadRef.current.done = true
      })
      .finally(() => {
        perfilesLoadRef.current.promise = null
      })

    return perfilesLoadRef.current.promise
  }, [apiEnabled, apiFetch])

  useEffect(() => {
    if (!apiEnabled) return
    ensureRegionesLoaded?.()
    ensureCaletasLoaded?.()
    ensureEspeciesLoaded?.()
    ensureOpaLoaded?.()
    ensureSectoresAmerbLoaded?.()
    ensureBotesMaestroLoaded?.()
    ensureOperacionesLoaded?.()
  }, [
    apiEnabled,
    ensureRegionesLoaded,
    ensureCaletasLoaded,
    ensureEspeciesLoaded,
    ensureOpaLoaded,
    ensureSectoresAmerbLoaded,
    ensureBotesMaestroLoaded,
    ensureOperacionesLoaded,
  ])

  const upsertOperacion = useCallback((op) => {
    setDb((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      const idx = ops.findIndex((x) => x.id === op.id)
      const nextOps = idx >= 0 ? ops.map((x, i) => (i === idx ? op : x)) : [op, ...ops]
      return { ...prev, operaciones: nextOps }
    })
  }, [])

  const deleteOperacion = useCallback((opId) => {
    setDb((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      return { ...prev, operaciones: ops.filter((x) => x.id !== opId) }
    })
  }, [])

  const saveOperacion = useCallback(
    async (op, { mode } = {}) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const opId = String(op?.id || '').trim()
      if (!opId) throw new Error('id requerido')
      const m = String(mode || '').toLowerCase()
      const isCreate = m === 'create'
      const method = isCreate ? 'POST' : 'PUT'
      const path = isCreate ? '/operaciones' : `/operaciones/${opId}`
      const json = await apiFetch(path, { method, body: JSON.stringify(op || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
          const idx = ops.findIndex((x) => String(x?.id) === String(saved?.id))
          const nextOps = idx >= 0 ? ops.map((x, i) => (i === idx ? saved : x)) : [saved, ...ops]
          return { ...prev, operaciones: nextOps }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const deleteOperacionApi = useCallback(
    async (opId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(opId || '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/operaciones/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
        return { ...prev, operaciones: ops.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const updateOperacion = useCallback((opId, updater) => {
    setDb((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      const idx = ops.findIndex((x) => x.id === opId)
      if (idx < 0) return prev
      const cur = ops[idx]
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...(updater || {}) }
      if (apiEnabled) {
        const id = String(next?.id || '')
        if (id) {
          const timers = opAutosaveRef.current.timers
          const existing = timers.get(id)
          if (existing) clearTimeout(existing)
          const t = setTimeout(() => {
            apiFetch(`/operaciones/${id}`, { method: 'PUT', body: JSON.stringify(next || {}) }).catch(() => null)
          }, 1200)
          timers.set(id, t)
        }
      }
      return { ...prev, operaciones: ops.map((x, i) => (i === idx ? next : x)) }
    })
  }, [apiEnabled, apiFetch])

  const upsertBoteMaestro = useCallback(
    async (bote) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = bote?.id != null && String(bote.id).trim() !== '' ? String(bote.id).trim() : null
      const method = id ? 'PUT' : 'POST'
      const path = id ? `/botes/${id}` : '/botes'
      const json = await apiFetch(path, { method, body: JSON.stringify(bote || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
          const idx = botes.findIndex((x) => String(x?.id) === String(saved?.id))
          const nextBotes = idx >= 0 ? botes.map((x, i) => (i === idx ? saved : x)) : [saved, ...botes]
          return { ...prev, botesMaestro: nextBotes }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const deleteBoteMaestro = useCallback(
    async (boteId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(boteId || '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/botes/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
        return { ...prev, botesMaestro: botes.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const createEspecie = useCallback(
    async (especie) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const json = await apiFetch('/especies', { method: 'POST', body: JSON.stringify(especie || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const especies = Array.isArray(prev.especies) ? prev.especies : []
          const idx = especies.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextEspecies = idx >= 0 ? especies.map((x, i) => (i === idx ? saved : x)) : [saved, ...especies]
          return { ...prev, especies: nextEspecies }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const updateEspecie = useCallback(
    async (especieId, patch) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(especieId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await apiFetch(`/especies/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const especies = Array.isArray(prev.especies) ? prev.especies : []
          const idx = especies.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextEspecies = idx >= 0 ? especies.map((x, i) => (i === idx ? saved : x)) : [saved, ...especies]
          return { ...prev, especies: nextEspecies }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const deleteEspecie = useCallback(
    async (especieId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(especieId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/especies/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const especies = Array.isArray(prev.especies) ? prev.especies : []
        return { ...prev, especies: especies.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const createSectorAmerb = useCallback(
    async (sector) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const json = await apiFetch('/sectores', { method: 'POST', body: JSON.stringify(sector || {}) })
      const saved = normalizeSectorAmerb(json?.data)
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, sectoresAmerb: next }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch, normalizeSectorAmerb],
  )

  const updateSectorAmerb = useCallback(
    async (sectorId, patch) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(sectorId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await apiFetch(`/sectores/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = normalizeSectorAmerb(json?.data)
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, sectoresAmerb: next }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch, normalizeSectorAmerb],
  )

  const deleteSectorAmerb = useCallback(
    async (sectorId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(sectorId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/sectores/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
        return { ...prev, sectoresAmerb: list.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const createCaleta = useCallback(
    async (caleta) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const json = await apiFetch('/caletas', { method: 'POST', body: JSON.stringify(caleta || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.caletas) ? prev.caletas : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextList = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]

          const byId = {}
          nextList.forEach((c) => {
            const rid = c?.region_id != null ? Number(c.region_id) : c?.regionId != null ? Number(c.regionId) : null
            const nombre = String(c?.nombre ?? '').trim()
            if (!Number.isFinite(rid) || !nombre) return
            const key = String(rid)
            if (!Array.isArray(byId[key])) byId[key] = []
            byId[key].push(nombre)
          })
          Object.keys(byId).forEach((k) => byId[k].sort((a, b) => String(a).localeCompare(String(b))))

          const regiones = Array.isArray(prev?.regionesChile) ? prev.regionesChile : []
          const romById = new Map(regiones.map((r) => [Number(r?.id), String(r?.rom || '')]))
          const byRom = {}
          Object.entries(byId).forEach(([ridStr, names]) => {
            const rom = romById.get(Number(ridStr))
            if (!rom) return
            byRom[String(rom)] = names
          })

          return { ...prev, caletas: nextList, caletasByRegionId: byId, caletasByRegionRom: byRom }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const updateCaleta = useCallback(
    async (caletaId, patch) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(caletaId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await apiFetch(`/caletas/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.caletas) ? prev.caletas : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextList = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]

          const byId = {}
          nextList.forEach((c) => {
            const rid = c?.region_id != null ? Number(c.region_id) : c?.regionId != null ? Number(c.regionId) : null
            const nombre = String(c?.nombre ?? '').trim()
            if (!Number.isFinite(rid) || !nombre) return
            const key = String(rid)
            if (!Array.isArray(byId[key])) byId[key] = []
            byId[key].push(nombre)
          })
          Object.keys(byId).forEach((k) => byId[k].sort((a, b) => String(a).localeCompare(String(b))))

          const regiones = Array.isArray(prev?.regionesChile) ? prev.regionesChile : []
          const romById = new Map(regiones.map((r) => [Number(r?.id), String(r?.rom || '')]))
          const byRom = {}
          Object.entries(byId).forEach(([ridStr, names]) => {
            const rom = romById.get(Number(ridStr))
            if (!rom) return
            byRom[String(rom)] = names
          })

          return { ...prev, caletas: nextList, caletasByRegionId: byId, caletasByRegionRom: byRom }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const deleteCaleta = useCallback(
    async (caletaId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(caletaId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/caletas/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const list = Array.isArray(prev.caletas) ? prev.caletas : []
        const nextList = list.filter((x) => String(x?.id) !== id)

        const byId = {}
        nextList.forEach((c) => {
          const rid = c?.region_id != null ? Number(c.region_id) : c?.regionId != null ? Number(c.regionId) : null
          const nombre = String(c?.nombre ?? '').trim()
          if (!Number.isFinite(rid) || !nombre) return
          const key = String(rid)
          if (!Array.isArray(byId[key])) byId[key] = []
          byId[key].push(nombre)
        })
        Object.keys(byId).forEach((k) => byId[k].sort((a, b) => String(a).localeCompare(String(b))))

        const regiones = Array.isArray(prev?.regionesChile) ? prev.regionesChile : []
        const romById = new Map(regiones.map((r) => [Number(r?.id), String(r?.rom || '')]))
        const byRom = {}
        Object.entries(byId).forEach(([ridStr, names]) => {
          const rom = romById.get(Number(ridStr))
          if (!rom) return
          byRom[String(rom)] = names
        })

        return { ...prev, caletas: nextList, caletasByRegionId: byId, caletasByRegionRom: byRom }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const createOpa = useCallback(
    async (org) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const json = await apiFetch('/organizaciones', { method: 'POST', body: JSON.stringify(org || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.opa) ? prev.opa : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, opa: next }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const updateOpa = useCallback(
    async (orgId, patch) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(orgId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await apiFetch(`/organizaciones/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        setDb((prev) => {
          const list = Array.isArray(prev.opa) ? prev.opa : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, opa: next }
        })
      }
      return saved
    },
    [apiEnabled, apiFetch],
  )

  const deleteOpa = useCallback(
    async (orgId) => {
      if (!apiEnabled) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(orgId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await apiFetch(`/organizaciones/${id}`, { method: 'DELETE' })
      setDb((prev) => {
        const list = Array.isArray(prev.opa) ? prev.opa : []
        return { ...prev, opa: list.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiEnabled, apiFetch],
  )

  const value = useMemo(
    () => ({
      db,
      setDb,
      apiEnabled,
      ensureBotesMaestroLoaded,
      ensureSectoresAmerbLoaded,
      ensureOpaLoaded,
      ensureEspeciesLoaded,
      ensureRegionesLoaded,
      ensureOperacionesLoaded,
      ensurePerfilesLoaded,
      ensureCaletasLoaded,
      upsertOperacion,
      deleteOperacion,
      saveOperacion,
      deleteOperacionApi,
      updateOperacion,
      upsertBoteMaestro,
      deleteBoteMaestro,
      createEspecie,
      updateEspecie,
      deleteEspecie,
      createSectorAmerb,
      updateSectorAmerb,
      deleteSectorAmerb,
      createCaleta,
      updateCaleta,
      deleteCaleta,
      createOpa,
      updateOpa,
      deleteOpa,
    }),
    [
      db,
      apiEnabled,
      ensureBotesMaestroLoaded,
      ensureSectoresAmerbLoaded,
      ensureOpaLoaded,
      ensureEspeciesLoaded,
      ensureRegionesLoaded,
      ensureOperacionesLoaded,
      ensurePerfilesLoaded,
      ensureCaletasLoaded,
      upsertOperacion,
      deleteOperacion,
      saveOperacion,
      deleteOperacionApi,
      updateOperacion,
      upsertBoteMaestro,
      deleteBoteMaestro,
      createEspecie,
      updateEspecie,
      deleteEspecie,
      createSectorAmerb,
      updateSectorAmerb,
      deleteSectorAmerb,
      createCaleta,
      updateCaleta,
      deleteCaleta,
      createOpa,
      updateOpa,
      deleteOpa,
    ],
  )

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>
}

/**
 * Hook para consumir el contexto DB.
 *
 * @returns {{
 *  db: any,
 *  setDb: (updater: any) => void,
 *  apiEnabled: boolean,
 *  ensureBotesMaestroLoaded: () => Promise<void>|void,
 *  ensureSectoresAmerbLoaded: () => Promise<void>|void,
 *  ensureOpaLoaded: () => Promise<void>|void,
 *  ensureEspeciesLoaded: () => Promise<void>|void,
 *  ensureRegionesLoaded: () => Promise<void>|void,
 *  ensureOperacionesLoaded: () => Promise<void>|void,
 *  ensurePerfilesLoaded: () => Promise<void>|void,
 *  upsertOperacion: (op: any) => Promise<any>,
 *  deleteOperacion: (id: any) => void,
 *  saveOperacion: (id: any) => Promise<any>,
 *  deleteOperacionApi: (id: any) => Promise<any>,
 *  updateOperacion: (opId: any, updater: (cur: any) => any) => void,
 *  upsertBoteMaestro: (bote: any) => Promise<any>,
 *  deleteBoteMaestro: (id: any) => Promise<any>,
 * }} API de datos para UI.
 *
 * Manejo de errores:
 * - Lanza si se usa fuera de `DbProvider`.
 */
export function useDb() {
  const ctx = useContext(DbContext)
  if (!ctx) throw new Error('DbProvider missing')
  return ctx
}
