import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ContextoBaseDatos = createContext(null)

const claveToken = 'bitecma_token'

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
 * - `caletasByRegionStatic` se mantiene por compatibilidad con UI antigua (fallback vacío).
 */
function crearBaseDatosInicial() {
  return {
    especies: [],
    operaciones: [],
    regionesChile: [],
    caletas: [],
    caletasByRegionId: {},
    caletasByRegionRom: {},
    caletasByRegionStatic: {},
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
 *
 * Efectos secundarios:
 * - Puede hacer requests HTTP para cargar y persistir datos.
 * - Lee token desde localStorage para autenticar llamadas a API.
 *
 * Notas de mantenimiento:
 * - El contrato de `apiFetch` debe mantenerse consistente con el backend (`{ ok, data, error }`).
 * - Si se agregan nuevos maestros/endpoints, seguir el patrón `ensureXLoaded` con ref `{done,promise}`.
 */
export function ProveedorBaseDatos({ children }) {
  const [baseDatos, establecerBaseDatos] = useState(() => crearBaseDatosInicial())
  const urlApi = String(import.meta.env?.VITE_API_URL || '')
    .trim()
    .replace(/\/+$/, '')
  const apiHabilitada = !!urlApi

  const cargaBotesRef = useRef({ done: false, promise: null })
  const cargaSectoresAmerbRef = useRef({ done: false, promise: null })
  const cargaOpaRef = useRef({ done: false, promise: null })
  const cargaEspeciesRef = useRef({ done: false, promise: null })
  const cargaRegionesRef = useRef({ done: false, promise: null })
  const cargaCaletasRef = useRef({ done: false, promise: null })
  const cargaOperacionesRef = useRef({ done: false, promise: null })
  const cargaPerfilesRef = useRef({ done: false, promise: null })
  const autoGuardadoOperacionesRef = useRef({ timers: new Map() })

  const solicitarApi = useCallback(
    async (ruta, opciones) => {
      const url = `${urlApi}/${String(ruta || '').replace(/^\/+/, '')}`
      const token = (() => {
        try {
          return localStorage.getItem(claveToken)
        } catch {
          return null
        }
      })()
      const encabezados = { ...(opciones?.headers || {}) }
      if (!encabezados['Content-Type'] && opciones?.body) encabezados['Content-Type'] = 'application/json'
      if (token && !encabezados.Authorization) encabezados.Authorization = `Bearer ${token}`
      const respuesta = await fetch(url, { ...(opciones || {}), headers: encabezados })
      const json = await respuesta.json().catch(() => null)
      if (!respuesta.ok) {
        const mensaje = String(json?.error || respuesta.statusText || 'Error')
        throw new Error(mensaje)
      }
      return json
    },
    [urlApi],
  )

  const normalizarSectorAmerb = useCallback((s) => {
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

  const asegurarRegionesCargadas = useCallback(async () => {
    if (cargaRegionesRef.current.done) return
    if (cargaRegionesRef.current.promise) return cargaRegionesRef.current.promise
    if (!apiHabilitada) {
      cargaRegionesRef.current.done = true
      return
    }

    cargaRegionesRef.current.promise = solicitarApi('/regiones')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, regionesChile: Array.isArray(arr) ? arr : [] }))
        cargaRegionesRef.current.done = true
      })
      .finally(() => {
        cargaRegionesRef.current.promise = null
      })

    return cargaRegionesRef.current.promise
  }, [apiHabilitada, solicitarApi])

  const asegurarEspeciesCargadas = useCallback(async () => {
    if (cargaEspeciesRef.current.done) return
    if (cargaEspeciesRef.current.promise) return cargaEspeciesRef.current.promise

    if (!apiHabilitada) {
      cargaEspeciesRef.current.done = true
      return
    }

    cargaEspeciesRef.current.promise = solicitarApi('/especies')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, especies: Array.isArray(arr) ? arr : [] }))
        cargaEspeciesRef.current.done = true
      })
      .finally(() => {
        cargaEspeciesRef.current.promise = null
      })

    return cargaEspeciesRef.current.promise
  }, [apiHabilitada, solicitarApi])

  const asegurarCaletasCargadas = useCallback(async () => {
    if (cargaCaletasRef.current.done) return
    if (cargaCaletasRef.current.promise) return cargaCaletasRef.current.promise
    if (!apiHabilitada) {
      cargaCaletasRef.current.done = true
      return
    }

    cargaCaletasRef.current.promise = Promise.resolve()
      .then(() => asegurarRegionesCargadas?.())
      .then(() => solicitarApi('/caletas'))
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

        establecerBaseDatos((prev) => {
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

        cargaCaletasRef.current.done = true
      })
      .finally(() => {
        cargaCaletasRef.current.promise = null
      })

    return cargaCaletasRef.current.promise
  }, [apiHabilitada, solicitarApi, asegurarRegionesCargadas])

  const asegurarBotesMaestroCargados = useCallback(async () => {
    if (cargaBotesRef.current.done) return
    if (cargaBotesRef.current.promise) return cargaBotesRef.current.promise
    if (!apiHabilitada) {
      cargaBotesRef.current.done = true
      return
    }

    cargaBotesRef.current.promise = solicitarApi('/botes')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, botesMaestro: Array.isArray(arr) ? arr : [] }))
        cargaBotesRef.current.done = true
      })
      .finally(() => {
        cargaBotesRef.current.promise = null
      })

    return cargaBotesRef.current.promise
  }, [apiHabilitada, solicitarApi])

  const asegurarSectoresAmerbCargados = useCallback(async () => {
    if (cargaSectoresAmerbRef.current.done) return
    if (cargaSectoresAmerbRef.current.promise) return cargaSectoresAmerbRef.current.promise
    if (!apiHabilitada) {
      cargaSectoresAmerbRef.current.done = true
      return
    }

    cargaSectoresAmerbRef.current.promise = solicitarApi('/sectores')
      .then((json) => {
        const arr = json?.data
        const next = Array.isArray(arr) ? arr.map(normalizarSectorAmerb) : []
        establecerBaseDatos((prev) => ({ ...prev, sectoresAmerb: next }))
        cargaSectoresAmerbRef.current.done = true
      })
      .finally(() => {
        cargaSectoresAmerbRef.current.promise = null
      })

    return cargaSectoresAmerbRef.current.promise
  }, [apiHabilitada, solicitarApi, normalizarSectorAmerb])

  const asegurarOpaCargada = useCallback(async () => {
    if (cargaOpaRef.current.done) return
    if (cargaOpaRef.current.promise) return cargaOpaRef.current.promise

    if (!apiHabilitada) {
      cargaOpaRef.current.done = true
      return
    }

    cargaOpaRef.current.promise = solicitarApi('/organizaciones')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, opa: Array.isArray(arr) ? arr : [] }))
        cargaOpaRef.current.done = true
      })
      .finally(() => {
        cargaOpaRef.current.promise = null
      })

    return cargaOpaRef.current.promise
  }, [apiHabilitada, solicitarApi])

  const normalizarSubmareal = useCallback((v) => {
    if (v == null) return true
    if (v === true) return true
    if (v === false) return false
    if (v === 1 || v === '1') return true
    if (v === 0 || v === '0') return false
    return Boolean(v)
  }, [])

  const normalizarOperacion = useCallback(
    (op) => {
      const raw = op && typeof op === 'object' ? op : {}
      const botes = Array.isArray(raw?.botes) ? raw.botes : []
      const botesNormalizados = botes.map((b) => ({
        ...(b && typeof b === 'object' ? b : {}),
        submareal: normalizarSubmareal(b?.submareal),
      }))
      return { ...raw, botes: botesNormalizados }
    },
    [normalizarSubmareal],
  )

  const serializarOperacion = useCallback(
    (op) => {
      const raw = op && typeof op === 'object' ? op : {}
      const botes = Array.isArray(raw?.botes) ? raw.botes : null
      if (!botes) return raw

      const botesSerializados = botes.map((b) => {
        const bote = b && typeof b === 'object' ? b : {}
        const submareal = normalizarSubmareal(bote?.submareal)
        return { ...bote, submareal: submareal ? 1 : 0 }
      })

      return { ...raw, botes: botesSerializados }
    },
    [normalizarSubmareal],
  )

  const asegurarOperacionesCargadas = useCallback(async () => {
    if (cargaOperacionesRef.current.done) return
    if (cargaOperacionesRef.current.promise) return cargaOperacionesRef.current.promise
    if (!apiHabilitada) {
      cargaOperacionesRef.current.done = true
      return
    }

    cargaOperacionesRef.current.promise = solicitarApi('/operaciones')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, operaciones: Array.isArray(arr) ? arr.map(normalizarOperacion) : [] }))
        cargaOperacionesRef.current.done = true
      })
      .finally(() => {
        cargaOperacionesRef.current.promise = null
      })

    return cargaOperacionesRef.current.promise
  }, [apiHabilitada, solicitarApi, normalizarOperacion])

  const asegurarPerfilesCargados = useCallback(async () => {
    if (cargaPerfilesRef.current.done) return
    if (cargaPerfilesRef.current.promise) return cargaPerfilesRef.current.promise
    if (!apiHabilitada) {
      cargaPerfilesRef.current.done = true
      return
    }

    cargaPerfilesRef.current.promise = solicitarApi('/usuarios')
      .then((json) => {
        const arr = json?.data
        establecerBaseDatos((prev) => ({ ...prev, perfiles: Array.isArray(arr) ? arr : [] }))
        cargaPerfilesRef.current.done = true
      })
      .catch(() => {
        cargaPerfilesRef.current.done = true
      })
      .finally(() => {
        cargaPerfilesRef.current.promise = null
      })

    return cargaPerfilesRef.current.promise
  }, [apiHabilitada, solicitarApi])

  useEffect(() => {
    if (!apiHabilitada) return
    asegurarRegionesCargadas?.()
    asegurarCaletasCargadas?.()
    asegurarEspeciesCargadas?.()
    asegurarOpaCargada?.()
    asegurarSectoresAmerbCargados?.()
    asegurarBotesMaestroCargados?.()
    asegurarOperacionesCargadas?.()
  }, [
    apiHabilitada,
    asegurarRegionesCargadas,
    asegurarCaletasCargadas,
    asegurarEspeciesCargadas,
    asegurarOpaCargada,
    asegurarSectoresAmerbCargados,
    asegurarBotesMaestroCargados,
    asegurarOperacionesCargadas,
  ])

  const insertarOActualizarOperacion = useCallback((op) => {
    establecerBaseDatos((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      const idx = ops.findIndex((x) => x.id === op.id)
      const nextOps = idx >= 0 ? ops.map((x, i) => (i === idx ? op : x)) : [op, ...ops]
      return { ...prev, operaciones: nextOps }
    })
  }, [])

  const eliminarOperacion = useCallback((opId) => {
    establecerBaseDatos((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      return { ...prev, operaciones: ops.filter((x) => x.id !== opId) }
    })
  }, [])

  const guardarOperacion = useCallback(
    async (op, { mode } = {}) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const opId = String(op?.id || '').trim()
      if (!opId) throw new Error('id requerido')
      const m = String(mode || '').toLowerCase()
      const isCreate = m === 'create'
      const method = isCreate ? 'POST' : 'PUT'
      const path = isCreate ? '/operaciones' : `/operaciones/${opId}`
      const json = await solicitarApi(path, { method, body: JSON.stringify(serializarOperacion(op || {})) })
      const saved = json?.data ? normalizarOperacion(json.data) : null
      if (saved) {
        establecerBaseDatos((prev) => {
          const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
          const idx = ops.findIndex((x) => String(x?.id) === String(saved?.id))
          const nextOps = idx >= 0 ? ops.map((x, i) => (i === idx ? saved : x)) : [saved, ...ops]
          return { ...prev, operaciones: nextOps }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi, normalizarOperacion, serializarOperacion],
  )

  const eliminarOperacionApi = useCallback(
    async (opId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(opId || '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/operaciones/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
        const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
        return { ...prev, operaciones: ops.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiHabilitada, solicitarApi],
  )

  const actualizarOperacion = useCallback((opId, updater, opciones) => {
    establecerBaseDatos((prev) => {
      const ops = Array.isArray(prev.operaciones) ? prev.operaciones : []
      const idx = ops.findIndex((x) => x.id === opId)
      if (idx < 0) return prev
      const cur = ops[idx]
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...(updater || {}) }
      const omitirAutoGuardado = !!(opciones && typeof opciones === 'object' && opciones.omitirAutoGuardado)
      if (apiHabilitada && !omitirAutoGuardado) {
        const id = String(next?.id || '')
        if (id) {
          const timers = autoGuardadoOperacionesRef.current.timers
          const existing = timers.get(id)
          if (existing) clearTimeout(existing)
          const t = setTimeout(() => {
            solicitarApi(`/operaciones/${id}`, { method: 'PUT', body: JSON.stringify(serializarOperacion(next || {})) }).catch(() => null)
          }, 1200)
          timers.set(id, t)
        }
      }
      return { ...prev, operaciones: ops.map((x, i) => (i === idx ? next : x)) }
    })
  }, [apiHabilitada, solicitarApi, serializarOperacion])

  const insertarOActualizarBoteMaestro = useCallback(
    async (bote) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = bote?.id != null && String(bote.id).trim() !== '' ? String(bote.id).trim() : null
      const method = id ? 'PUT' : 'POST'
      const path = id ? `/botes/${id}` : '/botes'
      const json = await solicitarApi(path, { method, body: JSON.stringify(bote || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
          const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
          const idx = botes.findIndex((x) => String(x?.id) === String(saved?.id))
          const nextBotes = idx >= 0 ? botes.map((x, i) => (i === idx ? saved : x)) : [saved, ...botes]
          return { ...prev, botesMaestro: nextBotes }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi],
  )

  const eliminarBoteMaestro = useCallback(
    async (boteId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(boteId || '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/botes/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
        const botes = Array.isArray(prev.botesMaestro) ? prev.botesMaestro : []
        return { ...prev, botesMaestro: botes.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiHabilitada, solicitarApi],
  )

  const crearEspecie = useCallback(
    async (especie) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const json = await solicitarApi('/especies', { method: 'POST', body: JSON.stringify(especie || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
          const especies = Array.isArray(prev.especies) ? prev.especies : []
          const idx = especies.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextEspecies = idx >= 0 ? especies.map((x, i) => (i === idx ? saved : x)) : [saved, ...especies]
          return { ...prev, especies: nextEspecies }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi],
  )

  const actualizarEspecie = useCallback(
    async (especieId, patch) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(especieId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await solicitarApi(`/especies/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
          const especies = Array.isArray(prev.especies) ? prev.especies : []
          const idx = especies.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const nextEspecies = idx >= 0 ? especies.map((x, i) => (i === idx ? saved : x)) : [saved, ...especies]
          return { ...prev, especies: nextEspecies }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi],
  )

  const eliminarEspecie = useCallback(
    async (especieId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(especieId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/especies/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
        const especies = Array.isArray(prev.especies) ? prev.especies : []
        return { ...prev, especies: especies.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiHabilitada, solicitarApi],
  )

  const crearSectorAmerb = useCallback(
    async (sector) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const json = await solicitarApi('/sectores', { method: 'POST', body: JSON.stringify(sector || {}) })
      const saved = normalizarSectorAmerb(json?.data)
      if (saved) {
        establecerBaseDatos((prev) => {
          const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, sectoresAmerb: next }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi, normalizarSectorAmerb],
  )

  const actualizarSectorAmerb = useCallback(
    async (sectorId, patch) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(sectorId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await solicitarApi(`/sectores/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = normalizarSectorAmerb(json?.data)
      if (saved) {
        establecerBaseDatos((prev) => {
          const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, sectoresAmerb: next }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi, normalizarSectorAmerb],
  )

  const eliminarSectorAmerb = useCallback(
    async (sectorId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(sectorId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/sectores/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
        const list = Array.isArray(prev.sectoresAmerb) ? prev.sectoresAmerb : []
        return { ...prev, sectoresAmerb: list.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiHabilitada, solicitarApi],
  )

  const crearCaleta = useCallback(
    async (caleta) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const json = await solicitarApi('/caletas', { method: 'POST', body: JSON.stringify(caleta || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
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
    [apiHabilitada, solicitarApi],
  )

  const actualizarCaleta = useCallback(
    async (caletaId, patch) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(caletaId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await solicitarApi(`/caletas/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
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
    [apiHabilitada, solicitarApi],
  )

  const eliminarCaleta = useCallback(
    async (caletaId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(caletaId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/caletas/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
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
    [apiHabilitada, solicitarApi],
  )

  const crearOpa = useCallback(
    async (org) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const json = await solicitarApi('/organizaciones', { method: 'POST', body: JSON.stringify(org || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
          const list = Array.isArray(prev.opa) ? prev.opa : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, opa: next }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi],
  )

  const actualizarOpa = useCallback(
    async (orgId, patch) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(orgId ?? '').trim()
      if (!id) throw new Error('id requerido')
      const json = await solicitarApi(`/organizaciones/${id}`, { method: 'PUT', body: JSON.stringify(patch || {}) })
      const saved = json?.data
      if (saved) {
        establecerBaseDatos((prev) => {
          const list = Array.isArray(prev.opa) ? prev.opa : []
          const idx = list.findIndex((x) => Number(x?.id) === Number(saved?.id))
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list]
          return { ...prev, opa: next }
        })
      }
      return saved
    },
    [apiHabilitada, solicitarApi],
  )

  const eliminarOpa = useCallback(
    async (orgId) => {
      if (!apiHabilitada) throw new Error('API no configurada (VITE_API_URL)')
      const id = String(orgId ?? '').trim()
      if (!id) throw new Error('id requerido')
      await solicitarApi(`/organizaciones/${id}`, { method: 'DELETE' })
      establecerBaseDatos((prev) => {
        const list = Array.isArray(prev.opa) ? prev.opa : []
        return { ...prev, opa: list.filter((x) => String(x?.id) !== id) }
      })
      return true
    },
    [apiHabilitada, solicitarApi],
  )

  const valorContexto = useMemo(
    () => ({
      baseDatos,
      establecerBaseDatos,
      apiHabilitada,
      asegurarBotesMaestroCargados,
      asegurarSectoresAmerbCargados,
      asegurarOpaCargada,
      asegurarEspeciesCargadas,
      asegurarRegionesCargadas,
      asegurarOperacionesCargadas,
      asegurarPerfilesCargados,
      asegurarCaletasCargadas,
      insertarOActualizarOperacion,
      eliminarOperacion,
      guardarOperacion,
      eliminarOperacionApi,
      actualizarOperacion,
      insertarOActualizarBoteMaestro,
      eliminarBoteMaestro,
      crearEspecie,
      actualizarEspecie,
      eliminarEspecie,
      crearSectorAmerb,
      actualizarSectorAmerb,
      eliminarSectorAmerb,
      crearCaleta,
      actualizarCaleta,
      eliminarCaleta,
      crearOpa,
      actualizarOpa,
      eliminarOpa,
    }),
    [
      baseDatos,
      apiHabilitada,
      asegurarBotesMaestroCargados,
      asegurarSectoresAmerbCargados,
      asegurarOpaCargada,
      asegurarEspeciesCargadas,
      asegurarRegionesCargadas,
      asegurarOperacionesCargadas,
      asegurarPerfilesCargados,
      asegurarCaletasCargadas,
      insertarOActualizarOperacion,
      eliminarOperacion,
      guardarOperacion,
      eliminarOperacionApi,
      actualizarOperacion,
      insertarOActualizarBoteMaestro,
      eliminarBoteMaestro,
      crearEspecie,
      actualizarEspecie,
      eliminarEspecie,
      crearSectorAmerb,
      actualizarSectorAmerb,
      eliminarSectorAmerb,
      crearCaleta,
      actualizarCaleta,
      eliminarCaleta,
      crearOpa,
      actualizarOpa,
      eliminarOpa,
    ],
  )

  return <ContextoBaseDatos.Provider value={valorContexto}>{children}</ContextoBaseDatos.Provider>
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
export function usarBaseDatos() {
  const contexto = useContext(ContextoBaseDatos)
  if (!contexto) throw new Error('DbProvider missing')
  return contexto
}
