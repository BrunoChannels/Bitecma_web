import { useEffect, useMemo, useRef, useState } from 'react'
import { addSample, ensureKind, removeEspecie, removeKind, removeSample, updateSample } from '../../services/lpMuestrasService.js'
import SpeciesGrid from '../common/SpeciesGrid.jsx'

/**
 * Infere el tipo de muestreo a partir de un arreglo de muestras.
 *
 * @param {Array<{ l?: any, p?: any, d?: any }>} samples - Muestras (pueden venir parciales o con strings).
 * @returns {'LP'|'L'|'D'} Tipo inferido: `D` si hay diámetros, `LP` si hay peso, si no `L`.
 *
 * Lógica:
 * 1) Normaliza `samples` a arreglo.
 * 2) Detecta si existe alguna muestra con `d` (diámetro).
 * 3) Si no hay `d`, detecta si existe alguna muestra con `p` (peso).
 * 4) Retorna `D` > `LP` > `L` según prioridad.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica; usa checks defensivos.
 *
 * @example
 * typeForSamples([{ l: 120, p: 40 }]) // 'LP'
 *
 * Notas de mantenimiento:
 * - Si el esquema de muestras cambia (por ejemplo, nuevas medidas), ajustar la prioridad.
 */
function typeForSamples(samples) {
  const arr = Array.isArray(samples) ? samples : []
  const hasPeso = arr.some((x) => x && x.p !== undefined && x.p !== null && x.p !== '')
  const hasD = arr.some((x) => x && x.d !== undefined && x.d !== null && x.d !== '')
  if (hasD) return 'D'
  if (hasPeso) return 'LP'
  return 'L'
}

/**
 * Normaliza un "kind" de muestreo a una de las claves canónicas: `LP`, `L` o `D`.
 *
 * @param {unknown} kind - Identificador de tipo (ej.: "L-P", "lp", "D", etc.).
 * @returns {'LP'|'L'|'D'} Tipo canónico.
 *
 * Lógica:
 * 1) Convierte a string, trim y uppercase.
 * 2) Mapea "L-P" o "LP" -> `LP`, "D" -> `D`, y por defecto `L`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normKind('l-p') // 'LP'
 *
 * Notas de mantenimiento:
 * - Mantener sincronía con `lpMuestrasService` si aparecen nuevos aliases.
 */
function normKind(kind) {
  const k = String(kind || '').trim().toUpperCase()
  if (k === 'L-P' || k === 'LP') return 'LP'
  if (k === 'D') return 'D'
  return 'L'
}

/**
 * Normaliza la estructura de entrada de `lpMuestras` a un objeto { LP?, L?, D? }.
 *
 * El almacenamiento histórico soporta distintas formas:
 * - Arreglo plano de muestras (se infiere tipo por muestra).
 * - Objeto con `{ type, ms }`.
 * - Objeto con arreglos separados `{ LP, L, D }`.
 *
 * @param {unknown} entry - Entrada cruda proveniente de `bote.lpMuestras[especieId]`.
 * @returns {{ LP?: any[], L?: any[], D?: any[] }} Mapa por tipo con arreglos de muestras.
 *
 * Lógica:
 * 1) Si es arreglo, agrupa por tipo inferido por muestra.
 * 2) Si es objeto con `ms`, toma `type` (normalizado) y asigna `ms` a esa clave.
 * 3) Si es objeto, copia claves `LP/L/D` que sean arreglos.
 * 4) Si no coincide, retorna objeto vacío.
 *
 * Dependencias externas:
 * - `typeForSamples` y `normKind`.
 *
 * Efectos secundarios:
 * - Ninguno (retorna nueva estructura).
 *
 * Manejo de errores:
 * - Usa checks defensivos; no lanza.
 *
 * @example
 * normalizeEntry({ type: 'LP', ms: [{ l: 10, p: 2 }] }) // { LP: [...] }
 *
 * Notas de mantenimiento:
 * - Esta función es clave para compatibilidad retroactiva de datos.
 */
function normalizeEntry(entry) {
  if (Array.isArray(entry)) {
    const out = {}
    ;(entry || []).forEach((m) => {
      const k = typeForSamples([m])
      if (!out[k]) out[k] = []
      out[k].push(m)
    })
    return out
  }
  if (entry && typeof entry === 'object') {
    if (Array.isArray(entry.ms)) {
      const k = normKind(entry.type || 'LP')
      return { [k]: Array.isArray(entry.ms) ? entry.ms : [] }
    }
    const out = {}
    ;['LP', 'L', 'D'].forEach((k) => {
      if (Array.isArray(entry[k])) out[k] = entry[k]
    })
    return out
  }
  return {}
}

/**
 * Normaliza una clave de nombre (común/científico) para comparaciones con sets.
 *
 * @param {unknown} s - Texto a normalizar.
 * @returns {string} Texto normalizado: minúsculas, sin diacríticos y trim.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Lowercase + normalize NFD.
 * 3) Elimina diacríticos.
 * 4) Trim.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normKey('Lessonia berteroana') // 'lessonia berteroana'
 *
 * Notas de mantenimiento:
 * - Mantener consistente con otros normalizadores del proyecto.
 */
function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const ALGA_COM = new Set(
  [
    'Huiro negro',
    'Huiro palo',
    'Cochayuyo',
    'Huiro canutillo',
    'Huiro',
    'Luga roja',
    'Luga negra',
    'Luga cuchara',
  ].map(normKey),
)
const ALGA_SCI = new Set(
  [
    'Lessonia berteroana',
    'Lessonia trabeculata',
    'Durvillaea antarctica',
    'Macrocystis integrifolia',
    'Macrocystis pyrifera',
    'Gigartina skottsbergii',
    'Sarcothalia crispata',
    'Mazzaella laminarioides',
  ].map(normKey),
)

/**
 * Determina si una especie se considera "alga" para forzar el tipo de muestreo a diámetro (D).
 *
 * @param {object} sp - Especie (se espera que tenga `com` y/o `sci`).
 * @returns {boolean} `true` si el nombre común o científico coincide con listas de algas conocidas.
 *
 * Lógica:
 * 1) Normaliza `sp.com` y `sp.sci`.
 * 2) Busca en `ALGA_COM` y `ALGA_SCI`.
 *
 * Dependencias externas:
 * - `ALGA_COM`, `ALGA_SCI`, `normKey`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a `null/undefined`.
 *
 * @example
 * isAlgaSpecies({ com: 'Cochayuyo' }) // true
 *
 * Notas de mantenimiento:
 * - Ajustar listas si se agregan nuevas algas o alias.
 */
function isAlgaSpecies(sp) {
  return ALGA_COM.has(normKey(sp?.com)) || ALGA_SCI.has(normKey(sp?.sci))
}

/**
 * Pestaña de ingreso de muestras Peso-Longitud (y variantes L o D) para un bote.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.op - Operación actual (contiene `id`).
 * @param {object} props.bote - Bote actual (contiene `id`, `lpMuestras`, etc.).
 * @param {Array<object>} props.especies - Catálogo de especies para resolver labels.
 * @param {(opId: string, updater: (cur: any) => any) => void} props.updateOperacion - Actualiza la operación (inmutable).
 * @param {boolean} props.canWrite - Si `false`, bloquea modificaciones.
 * @param {(msg: string, color?: string) => void} props.toast - Notificaciones UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.openModal - Abre un modal.
 * @param {() => void} props.closeModal - Cierra el modal.
 * @param {object|null} [props.lpJump] - Señal opcional para abrir automáticamente una especie y hacer foco en una muestra.
 * @returns {import('react').JSX.Element} Elemento React de la pestaña.
 *
 * Lógica:
 * 1) Ordena especies y crea `byId` para lookup.
 * 2) Deriva especies habilitadas para muestreo desde `bote.lpMuestras`.
 * 3) Permite seleccionar especies (y tipo LP/L) mediante un modal.
 * 4) Permite ingresar/editar/eliminar muestras por especie y tipo (LP/L/D) en un modal.
 * 5) Consume `lpJump` para saltar a una especie/muestra específica (integración con previsualización EVADIR).
 *
 * Dependencias externas:
 * - [lpMuestrasService](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/lpMuestrasService.js): `addSample`, `updateSample`, `removeSample`, `ensureKind`, `removeKind`, `removeEspecie`.
 * - [SpeciesGrid](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/common/SpeciesGrid.jsx).
 * - React hooks: `useMemo`, `useState`, `useEffect`, `useRef`.
 *
 * Efectos secundarios:
 * - Abre modales (UI).
 * - Actualiza operación/bote (estado global).
 * - Despacha eventos CustomEvent para confirmar consumo de `lpJump`.
 *
 * Manejo de errores:
 * - Bloquea modificaciones si `canWrite` es false.
 * - Usa `try/catch` al despachar eventos (por seguridad en entornos restringidos).
 *
 * @example
 * <LpTab op={op} bote={b} especies={db.especies} updateOperacion={updateOperacion} canWrite={canWrite} toast={toast} openModal={openModal} closeModal={closeModal} />
 *
 * Notas de mantenimiento:
 * - Mantener compatibilidad de `lpMuestras` vía `normalizeEntry`.
 * - Mantener la detección de algas consistente con reglas de negocio.
 */
export default function LpTab({ op, bote, especies, updateOperacion, canWrite, toast, openModal, closeModal, lpJump }) {
  const especiesAll = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.slice().sort((a, b) => String(a?.com || '').localeCompare(String(b?.com || '')))
  }, [especies])

  const byId = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(especies) ? especies : []).forEach((e) => m.set(Number(e.id), e))
    return m
  }, [especies])

  const lpMap = bote?.lpMuestras && typeof bote.lpMuestras === 'object' ? bote.lpMuestras : {}
  const spIds = Object.keys(lpMap)
    .map(Number)
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b)

  /**
   * Abre un modal para seleccionar especies habilitadas para muestreo (y tipo LP/L).
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Si no hay permisos de escritura, muestra toast y sale.
   * 2) Renderiza un Body interno con `SpeciesGrid` y configuraciones por especie.
   * 3) Al confirmar:
   *    - Elimina especies removidas (con confirmación).
   *    - Asegura/quita kinds (LP/L o D para algas) usando helpers del servicio.
   *    - Actualiza `bote.lpMuestras` a través de `updateOperacion`.
   *
   * Dependencias externas:
   * - `openModal/closeModal` (UI).
   * - `ensureKind`, `removeKind`, `removeEspecie` (servicio).
   *
   * Efectos secundarios:
   * - Abre un modal y puede modificar datos del bote.
   *
   * Manejo de errores:
   * - No captura errores del store; asume que el update es sincrónico y estable.
   *
   * @example
   * <button onClick={openSeleccionarEspecies}>Seleccionar especies</button>
   *
   * Notas de mantenimiento:
   * - Si se agregan nuevos kinds, extender la UI de configuración.
   */
  const openSeleccionarEspecies = () => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    /**
     * Cuerpo del modal “Seleccionar especies” para configurar qué se muestrea en el bote.
     *
     * @returns {import('react').JSX.Element} UI del modal con selección de especies y configuración de kinds.
     *
     * Lógica:
     * 1) Inicializa selección con especies actuales (`spIds`) y construye una config `kindsBySpId`.
     * 2) Permite agregar/quitar especies con `SpeciesGrid`.
     * 3) Para no-algas, permite habilitar LP y/o L (deshabilita toggles si ya hay muestras).
     * 4) Al confirmar, aplica cambios a `bote.lpMuestras` (ensure/remove) y elimina especies removidas (con confirmación).
     *
     * Dependencias externas:
     * - `SpeciesGrid` (UI).
     * - Helpers de `lpMuestrasService`: `ensureKind`, `removeKind`, `removeEspecie`.
     *
     * Efectos secundarios:
     * - Actualiza estado global de la operación/bote vía `updateOperacion`.
     *
     * Manejo de errores:
     * - No captura errores del store; se asume actualización exitosa.
     *
     * @example
     * openModal('Especies a muestrear...', <Body />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener reglas de algas (forzar D) consistentes con `isAlgaSpecies`.
     */
    const Body = () => {
      const initial = spIds
      const [sel, setSel] = useState(() => initial.slice())
      const [kindsBySpId, setKindsBySpId] = useState(() => {
        const out = {}
        initial.forEach((id) => {
          const sp = byId.get(Number(id))
          const isAlga = isAlgaSpecies(sp)
          const entry = normalizeEntry(lpMap?.[id])
          if (isAlga) out[id] = { D: true }
          else {
            const hasLP = Object.prototype.hasOwnProperty.call(entry, 'LP')
            const hasL = Object.prototype.hasOwnProperty.call(entry, 'L')
            out[id] = { LP: hasLP || (!hasLP && !hasL), L: hasL }
          }
        })
        return out
      })

      const prevSet = new Set(initial.map(Number))
      const nextSet = new Set((Array.isArray(sel) ? sel : []).map(Number).filter((x) => Number.isFinite(x)))
      const removed = [...prevSet].filter((x) => !nextSet.has(x))

      const sortedSel = [...nextSet].sort((a, b) => a - b)

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box blue">
            <span>i</span>
            <div>
              Selecciona las especies a muestrear en este bote. Para algas, el ingreso será por <strong>diámetro del disco</strong>.
            </div>
          </div>

          <SpeciesGrid
            especies={especiesAll}
            selectedIds={sel}
            onChange={(ids) => {
              const next = (Array.isArray(ids) ? ids : []).map(Number).filter((x) => Number.isFinite(x))
              setSel(next)
              setKindsBySpId((prev) => {
                const out = {}
                next.forEach((id) => {
                  const prevCfg = prev?.[id]
                  if (prevCfg) {
                    out[id] = prevCfg
                    return
                  }
                  const sp = byId.get(Number(id))
                  const isAlga = isAlgaSpecies(sp)
                  const entry = normalizeEntry(lpMap?.[id])
                  if (isAlga) {
                    out[id] = { D: true }
                  } else {
                    const hasLP = Object.prototype.hasOwnProperty.call(entry, 'LP')
                    const hasL = Object.prototype.hasOwnProperty.call(entry, 'L')
                    out[id] = { LP: hasLP || (!hasLP && !hasL), L: hasL }
                  }
                })
                return out
              })
            }}
            multi
            columns={3}
            maxHeight={320}
          />

          {sortedSel.length ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
              <div style={{ fontFamily: 'var(--ff-d)', fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
                Tipos de muestreo por especie
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedSel.map((spId) => {
                  const sp = byId.get(Number(spId))
                  const isAlga = isAlgaSpecies(sp)
                  const entry = normalizeEntry(lpMap?.[spId])
                  const cntLP = Array.isArray(entry.LP) ? entry.LP.length : 0
                  const cntL = Array.isArray(entry.L) ? entry.L.length : 0
                  const cfg = kindsBySpId?.[spId] || (isAlga ? { D: true } : { LP: true, L: false })
                  return (
                    <div key={spId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong>{sp?.com || spId}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sp?.sci || ''}</div>
                      </div>
                      {isAlga ? (
                        <div style={{ whiteSpace: 'nowrap', color: 'var(--text2)' }}>D</div>
                      ) : (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!cfg.LP}
                              disabled={cntLP > 0}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setKindsBySpId((prev) => {
                                  const cur = prev?.[spId] || { LP: true, L: false }
                                  const nextCfg = { ...cur, LP: checked }
                                  if (!nextCfg.LP && !nextCfg.L) nextCfg.LP = true
                                  return { ...(prev || {}), [spId]: nextCfg }
                                })
                              }}
                            />
                            L-P{cntLP ? ` (${cntLP})` : ''}
                          </label>
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!cfg.L}
                              disabled={cntL > 0}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setKindsBySpId((prev) => {
                                  const cur = prev?.[spId] || { LP: true, L: false }
                                  const nextCfg = { ...cur, L: checked }
                                  if (!nextCfg.LP && !nextCfg.L) nextCfg.LP = true
                                  return { ...(prev || {}), [spId]: nextCfg }
                                })
                              }}
                            />
                            L{cntL ? ` (${cntL})` : ''}
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              onClick={() => {
                if (removed.length) {
                  const ok = confirm(
                    `Vas a quitar ${removed.length} especie(s) del muestreo. Se eliminarán sus muestras L-P/D asociadas. ¿Continuar?`,
                  )
                  if (!ok) return
                }
                updateOperacion(op.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    let map = x.lpMuestras || {}
                    removed.forEach((id) => {
                      map = removeEspecie(map, id)
                    })
                    ;[...nextSet].forEach((id) => {
                      const sp = byId.get(Number(id))
                      const isAlga = isAlgaSpecies(sp)
                      if (isAlga) {
                        map = ensureKind(map, id, 'D')
                        return
                      }
                      const cfg = kindsBySpId?.[id] || { LP: true, L: false }
                      if (cfg.LP) map = ensureKind(map, id, 'LP')
                      else map = removeKind(map, id, 'LP')
                      if (cfg.L) map = ensureKind(map, id, 'L')
                      else map = removeKind(map, id, 'L')
                    })
                    return { ...x, lpMuestras: map }
                  })
                  return { ...cur, botes: nextBotes }
                })
                closeModal()
                toast?.('Especies actualizadas', 'green')
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )
    }
    openModal(`Especies a muestrear (L-P) — Bote ${bote?.nombre || bote?.id}`, <Body />, 'wide')
  }

  /**
   * Abre un modal de ingreso/edición de muestras para una especie y tipo de muestreo.
   *
   * @param {string|number} especieId - ID de especie a editar.
   * @param {unknown} forcedType - Tipo deseado (LP/L/D o alias).
   * @param {object} [focus] - Datos opcionales para enfocar/resaltar una muestra específica (integración con `lpJump`).
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Valida permisos y resuelve especie desde `byId`.
   * 2) Normaliza el tipo (`kind0`).
   * 3) Renderiza un Body interno:
   *    - Carga muestras actuales (`normalizeEntry`).
   *    - Permite agregar o editar una fila (draft + editIdx).
   *    - Permite eliminar una fila.
   *    - (Opcional) resalta/scroll a muestra si `focus` coincide.
   * 4) Persiste cambios en `bote.lpMuestras` usando `updateOperacion` + helpers del servicio.
   *
   * Dependencias externas:
   * - `openModal`, `closeModal`, `toast`.
   * - `addSample`, `updateSample`, `removeSample`, `removeEspecie`.
   *
   * Efectos secundarios:
   * - Abre un modal.
   * - Modifica datos del bote (estado global).
   * - Puede ejecutar scroll dentro del modal al enfocar una muestra.
   *
   * Manejo de errores:
   * - En modo read-only, bloquea operación.
   *
   * @example
   * openIngreso(12, 'LP')
   *
   * Notas de mantenimiento:
   * - Mantener el matching de `focus` (tolerancia, índice) consistente con el emisor.
   */
  const openIngreso = (especieId, forcedType, focus) => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    const spId = Number(especieId)
    const sp = byId.get(spId)
    const kind0 = normKind(forcedType)

    /**
     * Cuerpo del modal de ingreso de muestras para una especie y tipo.
     *
     * @returns {import('react').JSX.Element} UI del modal (formulario de ingreso + tabla de muestras).
     *
     * Lógica:
     * 1) Carga y mantiene en estado local las muestras de la especie (`samplesNow`) para feedback inmediato.
     * 2) Permite agregar/editar mediante un “draft” y un índice de edición (`editIdx`).
     * 3) Al guardar, persiste en el store con `updateOperacion` y sincroniza `samplesNow`.
     * 4) Si llega `focus`, resalta y scrollea a una muestra (solo para LP).
     *
     * Dependencias externas:
     * - `updateOperacion` y helpers de `lpMuestrasService` (`addSample`, `updateSample`, `removeSample`).
     * - DOM: `document.querySelector` + `scrollIntoView` para resaltar.
     *
     * Efectos secundarios:
     * - Puede disparar scroll dentro del modal.
     * - Modifica estado global al guardar/eliminar.
     *
     * Manejo de errores:
     * - Valida token/tipo/valores numéricos antes de intentar resaltar.
     *
     * @example
     * openModal('Especie', <Body />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener tolerancia (`tol`) alineada con el emisor de `focus`.
     */
    const Body = () => {
      const entry = normalizeEntry((bote?.lpMuestras || {})[spId])
      const initialSamples = entry?.[kind0] || []
      const [samplesNow, setSamplesNow] = useState(() => (Array.isArray(initialSamples) ? initialSamples : []))
      const kind = kind0
      const [flashIdx, setFlashIdx] = useState(null)

      const [draft, setDraft] = useState(() => (kind === 'LP' ? { l: '', p: '' } : kind === 'D' ? { d: '' } : { l: '' }))
      const [editIdx, setEditIdx] = useState(null)
      const lRef = useRef(null)
      const pRef = useRef(null)
      const dRef = useRef(null)

      useEffect(() => {
        const token = focus?.token ?? null
        if (!token) return
        if (kind !== 'LP') return
        const tl = Number(focus?.l)
        const tp = Number(focus?.p)
        if (!Number.isFinite(tl) || !Number.isFinite(tp)) return
        const tol = 1e-9
        let targetIdx = Number.isFinite(Number(focus?.sampleIdx)) ? Number(focus.sampleIdx) : null
        if (targetIdx == null) {
          for (let i = 0; i < samplesNow.length; i++) {
            const m = samplesNow[i]
            const l = Number(m?.l)
            const p = Number(m?.p)
            if (!Number.isFinite(l) || !Number.isFinite(p)) continue
            if (Math.abs(l - tl) <= tol && Math.abs(p - tp) <= tol) {
              targetIdx = i
              break
            }
          }
        }
        if (targetIdx == null) return
        setFlashIdx(targetIdx)
        setTimeout(() => {
          const el = document.querySelector(`[data-lp-sample-idx="${targetIdx}"]`)
          el?.scrollIntoView?.({ block: 'center' })
        }, 0)
        const t = setTimeout(() => setFlashIdx(null), 2600)
        return () => clearTimeout(t)
      }, [focus?.token])

      /**
       * Agrega una nueva muestra o actualiza la muestra en edición según `editIdx`.
       *
       * @returns {void} No retorna valor.
       *
       * Lógica:
       * 1) Según `kind`, toma campos del draft: (LP -> {l,p}, D -> {d}, L -> {l}).
       * 2) Persiste en el store: `addSample` si no hay `editIdx`, o `updateSample` si hay edición.
       * 3) Sincroniza `samplesNow` para reflejar el cambio sin esperar re-render del padre.
       * 4) Resetea draft, limpia `editIdx` y devuelve foco al input principal.
       *
       * Dependencias externas:
       * - `updateOperacion` (store) y helpers `addSample/updateSample`.
       * - Refs `lRef/pRef/dRef` para control de foco.
       *
       * Efectos secundarios:
       * - Modifica estado global de operación/bote y estado local del modal.
       *
       * Manejo de errores:
       * - No valida rango/unidades; se asume validación aguas arriba o posterior.
       *
       * @example
       * <button onClick={addOrUpdate}>{editIdx == null ? 'Agregar' : 'Guardar'}</button>
       *
       * Notas de mantenimiento:
       * - Si se agrega validación (mínimos/máximos), incorporarla antes de persistir.
       */
      const addOrUpdate = () => {
        if (kind === 'LP') {
          const l = draft.l
          const p = draft.p
          updateOperacion(op.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const map = x.lpMuestras || {}
              const next = editIdx == null ? addSample(map, spId, kind, { l, p }) : updateSample(map, spId, kind, editIdx, { l, p })
              return { ...x, lpMuestras: next }
            })
            return { ...cur, botes: nextBotes }
          })
          setSamplesNow((prev) => {
            const next = prev.slice()
            if (editIdx == null) next.push({ l, p })
            else next[editIdx] = { l, p }
            return next
          })
        } else if (kind === 'D') {
          const d = draft.d
          updateOperacion(op.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const map = x.lpMuestras || {}
              const next = editIdx == null ? addSample(map, spId, kind, { d }) : updateSample(map, spId, kind, editIdx, { d })
              return { ...x, lpMuestras: next }
            })
            return { ...cur, botes: nextBotes }
          })
          setSamplesNow((prev) => {
            const next = prev.slice()
            if (editIdx == null) next.push({ d })
            else next[editIdx] = { d }
            return next
          })
        } else {
          const l = draft.l
          updateOperacion(op.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const map = x.lpMuestras || {}
              const next = editIdx == null ? addSample(map, spId, kind, { l }) : updateSample(map, spId, kind, editIdx, { l })
              return { ...x, lpMuestras: next }
            })
            return { ...cur, botes: nextBotes }
          })
          setSamplesNow((prev) => {
            const next = prev.slice()
            if (editIdx == null) next.push({ l })
            else next[editIdx] = { l }
            return next
          })
        }
        setDraft(kind === 'LP' ? { l: '', p: '' } : kind === 'D' ? { d: '' } : { l: '' })
        setEditIdx(null)
        setTimeout(() => {
          if (kind === 'LP') {
            lRef.current?.focus?.()
            lRef.current?.select?.()
          } else if (kind === 'D') {
            dRef.current?.focus?.()
            dRef.current?.select?.()
          } else {
            lRef.current?.focus?.()
            lRef.current?.select?.()
          }
        }, 0)
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box blue">
            <span>i</span>
            <div>
              <strong>{sp?.com || spId}</strong> · {kind === 'LP' ? 'Peso-Longitud' : kind === 'D' ? 'Diámetro disco' : 'Longitud'}
            </div>
          </div>

          <div className="lp-input-row">
            {kind === 'LP' ? (
              <>
                <div className="ig">
                  <label className="il">Longitud (mm)</label>
                  <input
                    className="ii lp-num-inp"
                    ref={lRef}
                    type="number"
                    step="any"
                    value={draft.l}
                    onChange={(e) => setDraft((s) => ({ ...s, l: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      pRef.current?.focus?.()
                      pRef.current?.select?.()
                    }}
                  />
                </div>
                <div className="ig">
                  <label className="il">Peso (g)</label>
                  <input
                    className="ii lp-num-inp"
                    ref={pRef}
                    type="number"
                    step="any"
                    value={draft.p}
                    onChange={(e) => setDraft((s) => ({ ...s, p: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      addOrUpdate()
                    }}
                  />
                </div>
              </>
            ) : kind === 'D' ? (
              <div className="ig">
                <label className="il">Diámetro disco (cm)</label>
                <input
                  className="ii lp-num-inp"
                  ref={dRef}
                  type="number"
                  step="any"
                  value={draft.d}
                  onChange={(e) => setDraft((s) => ({ ...s, d: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addOrUpdate()
                  }}
                />
              </div>
            ) : (
              <div className="ig">
                <label className="il">Longitud (mm)</label>
                <input
                  className="ii lp-num-inp"
                  ref={lRef}
                  type="number"
                  step="any"
                  value={draft.l}
                  onChange={(e) => setDraft((s) => ({ ...s, l: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    addOrUpdate()
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <div className="lp-counter">{samplesNow.length} muestra(s)</div>
              <button className="btn b-teal b-sm" onClick={addOrUpdate}>
                {editIdx == null ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 280, border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="tbl lp-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{kind === 'D' ? 'D (cm)' : 'L (mm)'}</th>
                  {kind === 'LP' ? <th>P (g)</th> : null}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {samplesNow.length ? (
                  samplesNow
                    .map((m, idx) => ({ m, idx }))
                    .reverse()
                    .map(({ m, idx }, displayIdx) => (
                    <tr key={idx} data-lp-sample-idx={idx} className={idx === flashIdx ? 'lp-flash' : ''}>
                      <td>{samplesNow.length - displayIdx}</td>
                      <td>{kind === 'D' ? m?.d ?? '' : m?.l ?? ''}</td>
                      {kind === 'LP' ? <td>{m?.p ?? ''}</td> : null}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn b-out b-sm"
                          onClick={() => {
                            setEditIdx(idx)
                            setDraft(kind === 'LP' ? { l: m?.l ?? '', p: m?.p ?? '' } : kind === 'D' ? { d: m?.d ?? '' } : { l: m?.l ?? '' })
                            setTimeout(() => {
                              if (kind === 'LP') {
                                lRef.current?.focus?.()
                                lRef.current?.select?.()
                              } else if (kind === 'D') {
                                dRef.current?.focus?.()
                                dRef.current?.select?.()
                              } else {
                                lRef.current?.focus?.()
                                lRef.current?.select?.()
                              }
                            }, 0)
                          }}
                        >
                          Editar
                        </button>{' '}
                        <button
                          className="btn b-out b-sm"
                          onClick={() => {
                            updateOperacion(op.id, (cur) => {
                              const nextBotes = (cur.botes || []).map((x) => {
                                if (x.id !== bote.id) return x
                                const map = x.lpMuestras || {}
                                const next = removeSample(map, spId, kind, idx)
                                return { ...x, lpMuestras: next }
                              })
                              return { ...cur, botes: nextBotes }
                            })
                            setSamplesNow((prev) => prev.filter((_, i) => i !== idx))
                            if (editIdx === idx) {
                              setEditIdx(null)
                              setDraft(kind === 'LP' ? { l: '', p: '' } : kind === 'D' ? { d: '' } : { l: '' })
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={kind === 'LP' ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text3)' }}>
                      Sin muestras
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cerrar
            </button>
            <button
              className="btn b-out"
              style={{ flex: 1, color: 'var(--red)' }}
              onClick={() => {
                if (!confirm(`Quitar especie ${sp?.com || spId}?`)) return
                updateOperacion(op.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const next = removeEspecie(x.lpMuestras, spId)
                    return { ...x, lpMuestras: next }
                  })
                  return { ...cur, botes: nextBotes }
                })
                closeModal()
                toast?.('Especie removida', 'green')
              }}
            >
              Quitar especie
            </button>
          </div>
        </div>
      )
    }

    openModal(`${sp?.com || spId}`, <Body />, 'wide')
  }

  useEffect(() => {
    const token = lpJump?.token ?? null
    if (!token) return
    const opId = String(lpJump?.opId ?? '')
    if (!opId || String(op?.id ?? '') !== opId) return
    const boteId = lpJump?.boteId != null && String(lpJump.boteId) !== '' ? String(lpJump.boteId) : null
    const matchBote = boteId ? String(bote?.id ?? '') === boteId : true
    if (!matchBote) return
    const spId = Number(lpJump?.especieId)
    const l = lpJump?.l
    const p = lpJump?.p
    if (!Number.isFinite(spId)) return
    if (l == null || p == null) return
    openIngreso(spId, 'LP', lpJump)
    try {
      window.dispatchEvent(new CustomEvent('bitecma:lp-jump-consumed', { detail: { token } }))
    } catch {
      return
    }
  }, [lpJump?.token])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Peso-Longitud</div>
        <button className="btn b-teal b-sm" onClick={openSeleccionarEspecies}>
          Seleccionar especies
        </button>
      </div>

      {spIds.length === 0 ? (
        <div className="info-box amber">
          <span>i</span>
          <div>Sin especies para muestreo. Agrega una especie para ingresar muestras.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Especie</th>
                <th>Muestras</th>
                <th>Tipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {spIds.flatMap((spId) => {
                const sp = byId.get(Number(spId))
                const entry = normalizeEntry(lpMap?.[spId])
                const isAlga = isAlgaSpecies(sp)
                const kinds = isAlga ? ['D'] : ['LP', 'L']
                const visibleKinds = kinds.filter((k) => Object.prototype.hasOwnProperty.call(entry, k))
                return visibleKinds.map((kind) => {
                  const samples = entry?.[kind] || []
                  const cnt = Array.isArray(samples) ? samples.length : 0
                  const cntLP = Array.isArray(entry?.LP) ? entry.LP.length : 0
                  const muestrasText =
                    kind === 'L' && cntLP > 0
                      ? cnt > 0
                        ? `${cnt} + ${cntLP}`
                        : String(cntLP)
                      : String(cnt)
                  return (
                    <tr key={`${spId}-${kind}`}>
                      <td style={{ textAlign: 'left' }}>
                        <strong>{sp?.com || spId}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sp?.sci || ''}</div>
                      </td>
                      <td>{muestrasText}</td>
                      <td style={{ minWidth: 120 }}>{kind === 'LP' ? 'L-P' : kind}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn b-teal b-sm" onClick={() => openIngreso(spId, kind)}>
                          Ingresar
                        </button>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
