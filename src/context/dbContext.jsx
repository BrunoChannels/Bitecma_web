import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CALETAS_BY_REGION_STATIC } from '../data/sectores.js'

const DbContext = createContext(null)

const TOKEN_KEY = 'bitecma_token'

function initialDb() {
  return {
    especies: [],
    operaciones: [],
    regionesChile: [],
    caletasByRegionStatic: CALETAS_BY_REGION_STATIC,
    sectoresAmerb: [],
    opa: [],
    botesMaestro: [],
    perfiles: [],
  }
}

export function DbProvider({ children }) {
  const [db, setDb] = useState(() => initialDb())
  const apiUrl = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  const apiEnabled = !!apiUrl

  const botesLoadRef = useRef({ done: false, promise: null })
  const sectoresAmerbLoadRef = useRef({ done: false, promise: null })
  const opaLoadRef = useRef({ done: false, promise: null })
  const especiesLoadRef = useRef({ done: false, promise: null })
  const regionesLoadRef = useRef({ done: false, promise: null })
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
        setDb((prev) => ({ ...prev, sectoresAmerb: Array.isArray(arr) ? arr : [] }))
        sectoresAmerbLoadRef.current.done = true
      })
      .finally(() => {
        sectoresAmerbLoadRef.current.promise = null
      })

    return sectoresAmerbLoadRef.current.promise
  }, [apiEnabled, apiFetch])

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
    ensureEspeciesLoaded?.()
    ensureOpaLoaded?.()
    ensureSectoresAmerbLoaded?.()
    ensureBotesMaestroLoaded?.()
    ensureOperacionesLoaded?.()
  }, [
    apiEnabled,
    ensureRegionesLoaded,
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
      upsertOperacion,
      deleteOperacion,
      saveOperacion,
      deleteOperacionApi,
      updateOperacion,
      upsertBoteMaestro,
      deleteBoteMaestro,
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
      upsertOperacion,
      deleteOperacion,
      saveOperacion,
      deleteOperacionApi,
      updateOperacion,
      upsertBoteMaestro,
      deleteBoteMaestro,
    ],
  )

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>
}

export function useDb() {
  const ctx = useContext(DbContext)
  if (!ctx) throw new Error('DbProvider missing')
  return ctx
}
