import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ESPECIES } from '../data/especies.js'
import { OPERACIONES } from '../data/operaciones.js'
import { REGIONES_CHILE, CALETAS_BY_REGION_STATIC } from '../data/sectores.js'
import { PERFILES } from '../data/perfiles.js'

const DbContext = createContext(null)

function initialDb() {
  return {
    especies: ESPECIES,
    operaciones: OPERACIONES,
    regionesChile: REGIONES_CHILE,
    caletasByRegionStatic: CALETAS_BY_REGION_STATIC,
    sectoresAmerb: [],
    opa: [],
    botesMaestro: [],
    perfiles: PERFILES,
  }
}

export function DbProvider({ children }) {
  const [db, setDb] = useState(() => initialDb())
  const botesLoadRef = useRef({ done: false, promise: null })
  const sectoresAmerbLoadRef = useRef({ done: false, promise: null })
  const opaLoadRef = useRef({ done: false, promise: null })

  const ensureBotesMaestroLoaded = useCallback(async () => {
    if (botesLoadRef.current.done) return
    if (botesLoadRef.current.promise) return botesLoadRef.current.promise

    botesLoadRef.current.promise = import('../data/botes.js')
      .then((mod) => {
        const staticBotes = mod?.BOTES || mod?.default || []
        setDb((prev) => {
          const existing = Array.isArray(prev?.botesMaestro) ? prev.botesMaestro : []
          const existingById = new Map(existing.map((b) => [String(b?.id ?? ''), b]))

          const mergedFromStatic = Array.isArray(staticBotes)
            ? staticBotes.map((b) => {
                const id = String(b?.id ?? '')
                if (!id) return b
                const override = existingById.get(id)
                if (override) existingById.delete(id)
                return override || b
              })
            : []

          const extras = [...existingById.values()].filter((b) => b && String(b?.id ?? ''))
          return { ...prev, botesMaestro: [...extras, ...mergedFromStatic] }
        })
        botesLoadRef.current.done = true
      })
      .finally(() => {
        botesLoadRef.current.promise = null
      })

    return botesLoadRef.current.promise
  }, [])

  const ensureSectoresAmerbLoaded = useCallback(async () => {
    if (sectoresAmerbLoadRef.current.done) return
    if (sectoresAmerbLoadRef.current.promise) return sectoresAmerbLoadRef.current.promise

    sectoresAmerbLoadRef.current.promise = import('../data/sectores_amerb.js')
      .then((mod) => {
        const arr = mod?.SECTORES_AMERB || mod?.default || []
        setDb((prev) => {
          const existing = Array.isArray(prev?.sectoresAmerb) ? prev.sectoresAmerb : []
          if (existing.length) return prev
          return { ...prev, sectoresAmerb: Array.isArray(arr) ? arr : [] }
        })
        sectoresAmerbLoadRef.current.done = true
      })
      .finally(() => {
        sectoresAmerbLoadRef.current.promise = null
      })

    return sectoresAmerbLoadRef.current.promise
  }, [])

  const ensureOpaLoaded = useCallback(async () => {
    if (opaLoadRef.current.done) return
    if (opaLoadRef.current.promise) return opaLoadRef.current.promise

    opaLoadRef.current.promise = import('../data/opa.js')
      .then((mod) => {
        const arr = mod?.OPA || mod?.default || []
        setDb((prev) => {
          const existing = Array.isArray(prev?.opa) ? prev.opa : []
          if (existing.length) return prev
          return { ...prev, opa: Array.isArray(arr) ? arr : [] }
        })
        opaLoadRef.current.done = true
      })
      .finally(() => {
        opaLoadRef.current.promise = null
      })

    return opaLoadRef.current.promise
  }, [])

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

  const updateOperacion = useCallback((opId, updater) => {
    setDb((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      const idx = ops.findIndex((x) => x.id === opId)
      if (idx < 0) return prev
      const cur = ops[idx]
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...(updater || {}) }
      return { ...prev, operaciones: ops.map((x, i) => (i === idx ? next : x)) }
    })
  }, [])

  const upsertBoteMaestro = useCallback((bote) => {
    setDb((prev) => {
      const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
      const idx = botes.findIndex((x) => x.id === bote.id)
      const nextBotes = idx >= 0 ? botes.map((x, i) => (i === idx ? bote : x)) : [bote, ...botes]
      return { ...prev, botesMaestro: nextBotes }
    })
  }, [])

  const deleteBoteMaestro = useCallback((boteId) => {
    setDb((prev) => {
      const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
      return { ...prev, botesMaestro: botes.filter((x) => x.id !== boteId) }
    })
  }, [])

  const value = useMemo(
    () => ({
      db,
      setDb,
      ensureBotesMaestroLoaded,
      ensureSectoresAmerbLoaded,
      ensureOpaLoaded,
      upsertOperacion,
      deleteOperacion,
      updateOperacion,
      upsertBoteMaestro,
      deleteBoteMaestro,
    }),
    [
      db,
      ensureBotesMaestroLoaded,
      ensureSectoresAmerbLoaded,
      ensureOpaLoaded,
      upsertOperacion,
      deleteOperacion,
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
