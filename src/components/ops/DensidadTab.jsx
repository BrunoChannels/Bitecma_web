import { useMemo, useRef, useState } from 'react'
import {
  addEspecieToUnidad,
  calcDensidad,
  crearUnidades,
  eliminarUnidad,
  nextUnidadNum,
  removeEspecieFromUnidad,
  setCuadranteEspecie,
  setUnidadCoord,
  setUnidadCount,
  updateUnidad,
} from '../../services/densidadService.js'
import SpeciesGrid from '../common/SpeciesGrid.jsx'
import { ensureKind } from '../../services/lpMuestrasService.js'

/**
 * Mueve el foco al siguiente input de densidad (navegación por Enter) dentro de un contenedor.
 *
 * @param {HTMLInputElement} from - Input origen (actual).
 * @param {HTMLElement|Document|null} root - Contenedor donde buscar inputs; si es falsy usa `document`.
 * @returns {void} No retorna valor.
 *
 * Lógica:
 * 1) Encuentra todos los inputs con `data-nav="dens"`.
 * 2) Ubica el índice del input actual (`from`).
 * 3) Enfoca y selecciona el siguiente input si existe.
 *
 * Dependencias externas:
 * - DOM: `querySelectorAll`, `focus`, `select`.
 *
 * Efectos secundarios:
 * - Cambia el foco del documento.
 *
 * Manejo de errores:
 * - Si no encuentra el input o no hay siguiente, no hace nada.
 *
 * @example
 * onKeyDown={(e) => e.key==='Enter' && focusNextInput(e.currentTarget, rootRef.current)}
 *
 * Notas de mantenimiento:
 * - Mantener atributos `data-nav` consistentes en los inputs que participan de esta navegación.
 */
function focusNextInput(from, root) {
  const container = root || document
  const inputs = Array.from(container.querySelectorAll('input[data-nav="dens"]'))
  const idx = inputs.indexOf(from)
  if (idx < 0) return
  const next = inputs[idx + 1]
  if (!next) return
  next.focus()
  next.select?.()
}

/**
 * Mueve el foco al siguiente input de conteo por especie en transectos.
 *
 * @param {HTMLInputElement} from - Input origen.
 * @param {HTMLElement|Document|null} root - Contenedor donde buscar inputs; si es falsy usa `document`.
 * @returns {void} No retorna valor.
 *
 * Lógica:
 * 1) Encuentra inputs con `data-nav="dens-transecto"`.
 * 2) Ubica el siguiente input respecto al actual y lo enfoca.
 *
 * Dependencias externas:
 * - DOM.
 *
 * Efectos secundarios:
 * - Cambia foco.
 *
 * Manejo de errores:
 * - Si no hay siguiente input, no hace nada.
 *
 * @example
 * focusNextTransectSpeciesInput(e.currentTarget, rootRef.current)
 *
 * Notas de mantenimiento:
 * - Usar este modo solo en inputs del grid de especies por transecto.
 */
function focusNextTransectSpeciesInput(from, root) {
  const container = root || document
  const inputs = Array.from(container.querySelectorAll('input[data-nav="dens-transecto"]'))
  const idx = inputs.indexOf(from)
  if (idx < 0) return
  const next = inputs[idx + 1]
  if (!next) return
  next.focus()
  next.select?.()
}

/**
 * Pestaña de densidad para un bote: administra transectos/cuadrantes, especies y conteos.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.op - Operación actual (contiene `id`, `fechaInicio`, etc.).
 * @param {object} props.bote - Bote actual (contiene `id`, `transectos`, `densTipo`, etc.).
 * @param {Array<object>} props.especies - Catálogo de especies.
 * @param {(opId: string, updater: (cur: any) => any) => void} props.updateOperacion - Actualiza operación (inmutable).
 * @param {boolean} props.canWrite - Permiso de escritura.
 * @param {(msg: string, color?: string) => void} props.toast - Notificador UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.openModal - Abre modal.
 * @param {() => void} props.closeModal - Cierra modal.
 * @returns {import('react').JSX.Element} UI para gestionar densidad.
 *
 * Lógica (alto nivel):
 * 1) Ordena unidades (transectos/cuadrantes) por número.
 * 2) Permite expandir/cerrar detalles por unidad (`openUnits`).
 * 3) Provee modales para:
 *    - Crear transectos masivamente (con selección de especies por transecto).
 *    - Crear cuadrantes (con especie asociada y parámetros).
 *    - Editar especies de una unidad, conteos, coordenadas y metadatos.
 * 4) Calcula densidad por especie usando `calcDensidad`.
 * 5) Opcionalmente ofrece transferir especies agregadas a la pestaña Peso-Longitud (LP) mediante `ensureKind`.
 *
 * Dependencias externas:
 * - [densidadService](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/densidadService.js): creación/edición de unidades y conteos.
 * - [SpeciesGrid](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/common/SpeciesGrid.jsx).
 * - [ensureKind](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/lpMuestrasService.js) para habilitar especies en LP.
 *
 * Efectos secundarios:
 * - Actualiza operación/bote mediante `updateOperacion`.
 * - Abre modales y puede disparar `confirm()` del navegador.
 * - Cambia foco de inputs en navegación por Enter.
 *
 * Manejo de errores:
 * - Bloquea acciones de escritura si `canWrite` es false.
 * - Usa `confirm()` para operaciones destructivas (eliminar unidades, quitar especies).
 *
 * @example
 * <DensidadTab op={op} bote={b} especies={db.especies} updateOperacion={updateOperacion} canWrite={canWrite} toast={toast} openModal={openModal} closeModal={closeModal} />
 *
 * Notas de mantenimiento:
 * - Este archivo contiene mucha lógica UI; si crece, considerar extraer subcomponentes (modales/cards) para legibilidad.
 * - Mantener consistencia de `densTipo` y estructura `transectos` con servicios.
 */
export default function DensidadTab({ op, bote, especies, updateOperacion, canWrite, toast, openModal, closeModal }) {
  const rootRef = useRef(null)
  const [openUnits, setOpenUnits] = useState(() => new Set())

  const unidades = useMemo(() => {
    const arr = Array.isArray(bote?.transectos) ? bote.transectos : []
    return [...arr].sort((a, b) => (Number(a?.num) || 0) - (Number(b?.num) || 0))
  }, [bote?.transectos])

  const especiesAll = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.slice().sort((a, b) => String(a?.com || '').localeCompare(String(b?.com || '')))
  }, [especies])

  const byId = useMemo(() => {
    const m = new Map()
    especiesAll.forEach((e) => m.set(Number(e.id), e))
    return m
  }, [especiesAll])

  /**
   * Alterna la expansión (detalles) de una unidad por su número.
   *
   * @param {number} num - Número de unidad (transecto/cuadrante).
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Clona el Set previo (`openUnits`).
   * 2) Si existe `num`, lo elimina; si no, lo agrega.
   * 3) Devuelve el nuevo Set para re-render.
   *
   * Dependencias externas:
   * - `setOpenUnits` (estado local).
   *
   * Efectos secundarios:
   * - Cambia estado local (UI).
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
   * onClick={() => toggleUnit(3)}
   *
   * Notas de mantenimiento:
   * - Mantener `num` como number consistente (se usa como clave en UI).
   */
  const toggleUnit = (num) => {
    setOpenUnits((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  /**
   * Abre un modal para crear/editar transectos de forma masiva.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Valida `canWrite`; en modo lectura muestra toast y aborta.
   * 2) Define un Body interno con una grilla de transectos (área, sustrato, cubierta, especies).
   * 3) Permite replicar configuración del primer transecto y agregar/eliminar filas.
   * 4) Al guardar, reconstruye la lista de transectos del bote preservando unidades no-transecto y conteos existentes cuando aplica.
   * 5) Ofrece (opcional) transferir especies nuevas a Peso-Longitud vía `ensureKind`.
   *
   * Dependencias externas:
   * - `openModal/closeModal`, `toast`, `updateOperacion`.
   * - `nextUnidadNum` y utilidades de servicio.
   * - `SpeciesGrid` para selección de especies por transecto.
   * - `ensureKind` para habilitar especies en LP.
   *
   * Efectos secundarios:
   * - Abre un modal y puede modificar el bote (transectos y/o lpMuestras).
   *
   * Manejo de errores:
   * - Valida `canWrite` y `canSave` antes de persistir.
   *
   * @example
   * <button onClick={openCrearTransectos}>Agregar Transecto</button>
   *
   * Notas de mantenimiento:
   * - Mantener la preservación de conteos/coordenadas para no perder datos al guardar en bloque.
   */
  const openCrearTransectos = () => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    /**
     * Cuerpo del modal de creación masiva de transectos.
     *
     * @returns {import('react').JSX.Element} UI del modal.
     *
     * Lógica:
     * 1) Inicializa filas desde transectos existentes (seed) o crea un set por defecto.
     * 2) Permite seleccionar especies por transecto usando `SpeciesGrid` (modo pick).
     * 3) Permite replicar fila 1 y agregar/eliminar transectos.
     * 4) Valida `canSave` (al menos una especie seleccionada en algún transecto).
     *
     * Dependencias externas:
     * - `SpeciesGrid`, `nextUnidadNum`.
     *
     * Efectos secundarios:
     * - Actualiza estado local del modal (rows/pick).
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * openModal('Agregar transectos', <Body />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener la representación `rows` alineada con el esquema de `transectos` del bote.
     */
    const Body = () => {
      const startNum = nextUnidadNum(bote?.transectos)
      const seeded = (Array.isArray(bote?.transectos) ? bote.transectos : [])
        .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
        .slice()
        .sort((a, b) => (Number(a?.num) || 0) - (Number(b?.num) || 0))
      const [rows, setRows] = useState(() =>
        seeded.length
          ? seeded.map((u) => ({
              num: Number(u?.num) || 0,
              area: Number(u?.area) || 120,
              sustrato: String(u?.sustrato || ''),
              cubierta: String(u?.cubierta || ''),
              especiesIds: Object.keys(u?.counts && typeof u.counts === 'object' ? u.counts : {})
                .map(Number)
                .filter((x) => Number.isFinite(x)),
            }))
          : Array.from({ length: 6 }, (_, i) => ({
              num: startNum + i,
              area: 120,
              sustrato: '',
              cubierta: '',
              especiesIds: [],
            })),
      )
      const [pick, setPick] = useState(null)

      const replicate = () => {
        setRows((prev) => {
          const first = prev[0]
          if (!first) return prev
          return prev.map((r, idx) =>
            idx === 0 ? r : { ...r, area: first.area, sustrato: first.sustrato, cubierta: first.cubierta, especiesIds: (first.especiesIds || []).slice() },
          )
        })
      }

      const canSave = rows.some((r) => Array.isArray(r.especiesIds) && r.especiesIds.length)

      if (pick) {
        return (
          <div data-tutorial-id="ops-dens-species-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
              Especies — Transecto {pick.num}
            </div>
            <div data-tutorial-id="ops-dens-species-grid">
              <SpeciesGrid
                especies={especiesAll}
                selectedIds={pick.sel}
                onChange={(ids) => setPick((p) => ({ ...p, sel: ids }))}
                multi
                columns={3}
                maxHeight={420}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn b-out" style={{ flex: 1 }} onClick={() => setPick(null)}>
                Volver
              </button>
              <button
                className="btn b-teal"
                style={{ flex: 1 }}
                data-tutorial-id="ops-dens-species-apply"
                onClick={() => {
                  setRows((prev) => prev.map((x) => (x.num === pick.num ? { ...x, especiesIds: pick.sel } : x)))
                  setPick(null)
                }}
              >
                Aplicar a Transecto {pick.num}
              </button>
            </div>
          </div>
        )
      }

      return (
        <div data-tutorial-id="ops-dens-transectos-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box blue">
            <span>i</span>
            <div>Completa el primer transecto y usa “Replicar” para copiar la configuración al resto.</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn b-out b-sm" data-tutorial-id="ops-dens-replicar" onClick={replicate}>
              Replicar fila 1
            </button>
            <button
              className="btn b-out b-sm"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { num: (prev[prev.length - 1]?.num || startNum - 1) + 1, area: prev[0]?.area ?? 120, sustrato: '', cubierta: '', especiesIds: [] },
                ])
              }
            >
              Agregar transecto
            </button>
          </div>

          <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, maxHeight: '55vh' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>N°</th>
                  <th>Área (m²)</th>
                  <th>Tipo de sustrato</th>
                  <th>Cubierta biológica</th>
                  <th>Especies</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.num}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>Transecto {r.num}</strong>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        value={r.area}
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-area' : undefined}
                        onChange={(e) => {
                          const v = e.target.value
                          setRows((prev) => prev.map((x) => (x.num === r.num ? { ...x, area: v } : x)))
                        }}
                      />
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input
                        className="ii"
                        value={r.sustrato}
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-sustrato' : undefined}
                        onChange={(e) => setRows((prev) => prev.map((x) => (x.num === r.num ? { ...x, sustrato: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input
                        className="ii"
                        value={r.cubierta}
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-cubierta' : undefined}
                        onChange={(e) => setRows((prev) => prev.map((x) => (x.num === r.num ? { ...x, cubierta: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <button
                        className="btn b-out b-sm"
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-especies' : undefined}
                        onClick={() => setPick({ num: r.num, sel: (r.especiesIds || []).slice() })}
                      >
                        {Array.isArray(r.especiesIds) && r.especiesIds.length ? `${r.especiesIds.length} especies` : 'Seleccionar especies'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn b-out b-sm" onClick={() => setRows((prev) => prev.filter((x) => x.num !== r.num))}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={!canSave}
              data-tutorial-id="ops-dens-tx-save"
              onClick={() => {
                if (!canSave) return
                updateOperacion(op.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const prevUnits = Array.isArray(x.transectos) ? x.transectos : []
                    const prevTranByNum = new Map(
                      prevUnits
                        .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
                        .map((u) => [Number(u?.num) || 0, u]),
                    )
                    const preservedNonTran = prevUnits.filter((u) => String(u?.tipo || 'transecto') !== 'transecto')
                    const sorted = rows
                      .slice()
                      .sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0))
                    const nextTran = sorted.map((row) => {
                      const num = Number(row?.num) || 0
                      const prev = prevTranByNum.get(num)
                      const prevCounts = prev?.counts && typeof prev.counts === 'object' ? prev.counts : {}
                      const selected = Array.isArray(row?.especiesIds) ? row.especiesIds.map(Number).filter((v) => Number.isFinite(v)) : []
                      const counts = Object.fromEntries(selected.map((id) => [id, Number(prevCounts[id] ?? 0)]))
                      return {
                        num,
                        tipo: 'transecto',
                        area: Number(row?.area) || 120,
                        fecha: String(prev?.fecha || op?.fechaInicio || ''),
                        sustrato: String(row?.sustrato || ''),
                        cubierta: String(row?.cubierta || ''),
                        coordX: prev?.coordX ?? null,
                        coordY: prev?.coordY ?? null,
                        coordLong: prev?.coordLong ?? null,
                        coordLat: prev?.coordLat ?? null,
                        counts,
                      }
                    })
                    return { ...x, transectos: [...preservedNonTran, ...nextTran] }
                  })
                  return { ...cur, botes: nextBotes }
                })
                closeModal()
                toast?.('Transectos actualizados', 'green')

                // Detectar si hay especies nuevas añadidas en este guardado masivo
                const existingSpIds = new Set(
                  (Array.isArray(bote?.transectos) ? bote.transectos : [])
                    .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
                    .flatMap(u => Object.keys(u?.counts && typeof u.counts === 'object' ? u.counts : {}).map(Number))
                )
                const newSpIds = new Set(
                  rows.flatMap(r => Array.isArray(r.especiesIds) ? r.especiesIds.map(Number) : [])
                )
                const newlyAdded = [...newSpIds].filter(id => !existingSpIds.has(id))

                if (newlyAdded.length > 0) {
                  setTimeout(() => {
                    const BodyTransfer = () => {
                      const names = newlyAdded
                        .map((id) => byId.get(Number(id))?.com)
                        .filter(Boolean)
                        .slice(0, 8)
                      const extra = newlyAdded.length - names.length

                      return (
                        <div data-tutorial-id="ops-dens-transfer-modal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                            ¿Deseas agregar también estas especies a la pestaña Peso-Longitud de este bote?
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {names.map((n) => (
                              <span key={n} className="pill p-blu">
                                {n}
                              </span>
                            ))}
                            {extra > 0 ? <span className="pill p-out">+{extra}</span> : null}
                          </div>
                          <div data-tutorial-id="ops-dens-transfer-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              className="btn b-out"
                              style={{ flex: 1 }}
                              data-tutorial-id="ops-dens-transfer-no"
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-transfer-done' } }))
                                closeModal()
                              }}
                            >
                              No, gracias
                            </button>
                            <button
                              className="btn b-teal"
                              style={{ flex: 1 }}
                              data-tutorial-id="ops-dens-transfer-yes"
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-transfer-done' } }))
                                updateOperacion(op.id, (cur) => {
                                  const nextBotes = (cur.botes || []).map((x) => {
                                    if (x.id !== bote.id) return x
                                    let map = x.lpMuestras || {}
                                    newlyAdded.forEach((id) => {
                                      map = ensureKind(map, id, 'LP')
                                    })
                                    return { ...x, lpMuestras: map }
                                  })
                                  return { ...cur, botes: nextBotes }
                                })
                                closeModal()
                                toast?.('Especies agregadas a Peso-Longitud', 'blue')
                              }}
                            >
                              Sí, agregar
                            </button>
                          </div>
                        </div>
                      )
                    }

                    openModal('Transferir especies', <BodyTransfer />, 'normal')
                    window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-transfer-open' } }))
                  }, 150)
                }
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      )
    }

    openModal(`Agregar transectos — ${bote?.nombre || bote?.id}`, <Body />, 'wide')
  }

  const openCrearCuadrantes = () => {
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    const Body = () => {
      const [form, setForm] = useState(() => ({
        cantidad: 30,
        area: 0.25,
        sustrato: '',
        especieId: '',
      }))
      const [showPick, setShowPick] = useState(false)

      const canSave = String(form.especieId || '').trim() !== '' && Number(form.cantidad) > 0
      const selectedSp = byId.get(Number(form.especieId))

      if (showPick) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>Especie del cuadrante</div>
            <SpeciesGrid
              especies={especiesAll}
              selectedIds={form.especieId ? [Number(form.especieId)] : []}
              onChange={(ids) => {
                const id = ids?.[0]
                setForm((s) => ({ ...s, especieId: id ? String(id) : '' }))
                setShowPick(false)
              }}
              multi={false}
              columns={3}
              maxHeight={420}
            />
            <button className="btn b-out" onClick={() => setShowPick(false)}>
              Volver
            </button>
          </div>
        )
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Cantidad</label>
              <input className="ii" type="number" value={form.cantidad} onChange={(e) => setForm((s) => ({ ...s, cantidad: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <div className="ig">
              <label className="il">Área cuadrante</label>
              <select className="is" value={String(form.area)} onChange={(e) => setForm((s) => ({ ...s, area: Number(e.target.value) }))}>
                <option value="1">1 m²</option>
                <option value="0.25">0.25 m²</option>
                <option value="0.0625">0.0625 m²</option>
              </select>
            </div>
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">Tipo sustrato</label>
              <input className="ii" value={form.sustrato} onChange={(e) => setForm((s) => ({ ...s, sustrato: e.target.value }))} />
            </div>
            <div className="ig">
              <label className="il">Especie</label>
              <button className="btn b-out" onClick={() => setShowPick(true)}>
                {selectedSp ? `${selectedSp.com} — ${selectedSp.sci}` : 'Seleccionar especie'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return
                updateOperacion(op.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const nextUnits = crearUnidades({
                      unidades: x.transectos,
                      tipo: 'cuadrante',
                      cantidad: form.cantidad,
                      area: form.area,
                      fecha: String(op?.fechaInicio || ''),
                      sustrato: form.sustrato,
                      cubierta: '',
                      especieId: form.especieId,
                    })
                    return { ...x, transectos: nextUnits }
                  })
                  return { ...cur, botes: nextBotes }
                })
                closeModal()
                toast?.('Cuadrantes creados', 'green')
              }}
            >
              Crear
            </button>
          </div>
        </div>
      )
    }

    openModal(`Agregar cuadrantes — ${bote?.nombre || bote?.id}`, <Body />, 'wide')
  }

  const openCrearUnidades = () => {
    if (bote?.densTipo === 'cuadrante') openCrearCuadrantes()
    else openCrearTransectos()
  }

  return (
    <div ref={rootRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
          {bote?.densTipo === 'cuadrante' ? 'Cuadrantes' : 'Transectos'}
        </div>
        <button className="btn b-teal b-sm" data-tutorial-id="ops-dens-add-transecto" onClick={openCrearUnidades}>
          {bote?.densTipo === 'cuadrante' ? '+ Crear' : 'Agregar Transecto'}
        </button>
      </div>

      {unidades.length === 0 ? (
        <div className="info-box amber">
          <span>i</span>
          <div>Sin unidades de densidad. Crea transectos/cuadrantes para comenzar.</div>
        </div>
      ) : (
        unidades.map((t) => {
          const num = Number(t?.num) || 0
          const isCuad = t?.tipo === 'cuadrante'
          const counts = t?.counts && typeof t.counts === 'object' ? t.counts : {}
          const spIds = Object.keys(counts)
            .map(Number)
            .filter((x) => Number.isFinite(x))
            .sort((a, b) => a - b)
          const area = Number(t.area) || 0
          const coordX = t?.coordX ?? ''
          const coordY = t?.coordY ?? ''
          const coordLong = t?.coordLong ?? ''
          const coordLat = t?.coordLat ?? ''
          const speciesChips = spIds
            .map((id) => byId.get(Number(id))?.com)
            .filter(Boolean)
            .slice(0, 12)

          if (isCuad) {
            const spId = Number(t.especieId ?? spIds[0] ?? null)
            const sp = byId.get(spId)
            const cnt = Number(counts?.[spId] ?? 0)
            const dens = calcDensidad(cnt, area)
            const open = openUnits.has(num)
            const summary = `Área ${area || '—'} m² · Sustrato ${t?.sustrato ? t.sustrato : '—'}`

            return (
              <div key={`${bote.id}-${num}`} className="tx-card cuad">
                <div
                  className="tx-hd"
                  onClick={() => toggleUnit(num)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                >
                  <span className="pill p-pur" style={{ fontSize: 10 }}>
                    Cuadrante {num}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{sp?.com || '—'}</span>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Cantidad:</span>
                      <input
                        className="ii lp-num-inp"
                        style={{ width: 96, textAlign: 'center' }}
                        type="number"
                        step="1"
                        min="0"
                        data-nav="dens"
                        value={String(cnt)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          focusNextInput(e.currentTarget, rootRef.current)
                        }}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: setUnidadCount(x.transectos, num, spId, v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                      <span style={{ fontFamily: 'var(--ff-m)', fontSize: 12, fontWeight: 800, color: 'var(--teal)' }}>
                        {dens.toFixed(4)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>ind/m²</span>
                    </div>

                    <div style={{ width: 1, height: 26, background: 'var(--border2)' }} />

                    <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{summary}</div>

                    <button
                      className="btn b-out b-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirm(`Eliminar Cuadrante ${num}?`)) return
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: eliminarUnidad(x.transectos, num) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                        toast?.('Cuadrante eliminado', 'green')
                      }}
                    >
                      Eliminar
                    </button>

                    <button className="btn b-out b-sm" onClick={(e) => { e.stopPropagation(); toggleUnit(num) }}>
                      {open ? '▴' : '▾'}
                    </button>
                  </div>
                </div>

                <div className={`tx-body${open ? ' open' : ''}`}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <button
                      className="btn b-out b-sm"
                      onClick={() => {
                        const Body = () => {
                          const [sel, setSel] = useState(() => (spId ? [spId] : []))
                          const current = sel?.[0] ? byId.get(Number(sel[0])) : null
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                                Especie del cuadrante — Cuadrante {num}
                              </div>
                              <SpeciesGrid especies={especiesAll} selectedIds={sel} onChange={setSel} multi={false} columns={3} maxHeight={420} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
                                  Cancelar
                                </button>
                                <button
                                  className="btn b-teal"
                                  style={{ flex: 1 }}
                                  disabled={!current}
                                  onClick={() => {
                                    if (!current) return
                                    updateOperacion(op.id, (cur) => {
                                      const nextBotes = (cur.botes || []).map((x) => {
                                        if (x.id !== bote.id) return x
                                        return { ...x, transectos: setCuadranteEspecie(x.transectos, num, current.id) }
                                      })
                                      return { ...cur, botes: nextBotes }
                                    })
                                    closeModal()
                                    toast?.('Especie actualizada', 'green')
                                  }}
                                >
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          )
                        }
                        if (!canWrite) {
                          toast('Modo solo lectura', 'blue')
                          return
                        }
                        openModal(`Seleccionar especie — Cuadrante ${num}`, <Body />, 'wide')
                      }}
                    >
                      Cambiar especie
                    </button>
                  </div>
                  <div className="i2">
                    <div className="ig">
                      <label className="il">Área (m²)</label>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        value={t.area ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: updateUnidad(x.transectos, num, { area: v }) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                    <div className="ig">
                      <label className="il">Sustrato</label>
                      <input
                        className="ii"
                        value={t?.sustrato || ''}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: updateUnidad(x.transectos, num, { sustrato: v }) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                  </div>

                  <div className="i2">
                    <div className="ig">
                      <label className="il">X</label>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={coordX}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: setUnidadCoord(x.transectos, num, 'x', v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                    <div className="ig">
                      <label className="il">Y</label>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={coordY}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: setUnidadCoord(x.transectos, num, 'y', v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                  </div>

                  <div className="i2">
                    <div className="ig">
                      <label className="il">LONG</label>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={coordLong}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lon', v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                    <div className="ig">
                      <label className="il">LAT</label>
                      <input
                        className="ii"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={coordLat}
                        onChange={(e) => {
                          const v = e.target.value
                          updateOperacion(op.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lat', v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          const open = openUnits.has(num)

          return (
            <div key={`${bote.id}-${num}`} className="tx-card">
              <div className="tx-hd">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{`Transecto ${num}`}</div>
                  {speciesChips.length ? (
                    speciesChips.map((name) => (
                      <span key={name} className="pill p-teal" style={{ fontSize: 10 }}>
                        {name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sin especies</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Área {area || '—'} · {t?.sustrato ? `Sustrato ${t.sustrato}` : 'Sustrato —'} ·{' '}
                    {t?.cubierta ? `Cubierta ${t.cubierta}` : 'Cubierta —'}
                  </span>
                  <button className="btn b-out b-sm" onClick={() => toggleUnit(num)}>
                    {open ? 'Detalles ▴' : 'Detalles ▾'}
                  </button>
                  <button
                    className="btn b-out b-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Eliminar Transecto ${num}?`)) return
                      updateOperacion(op.id, (cur) => {
                        const nextBotes = (cur.botes || []).map((x) => {
                          if (x.id !== bote.id) return x
                          return { ...x, transectos: eliminarUnidad(x.transectos, num) }
                        })
                        return { ...cur, botes: nextBotes }
                      })
                      toast?.('Transecto eliminado', 'green')
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className={`tx-body${open ? ' open' : ''}`}>
                <div className="i2">
                  <div className="ig">
                    <label className="il">Área</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      value={t.area ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { area: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Fecha</label>
                    <input
                      className="ii"
                      type="date"
                      value={String(t.fecha || '')}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { fecha: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">Sustrato</label>
                    <input
                      className="ii"
                      value={t.sustrato || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { sustrato: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Cubierta biológica</label>
                    <input
                      className="ii"
                      value={t.cubierta || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: updateUnidad(x.transectos, num, { cubierta: v }) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">X</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordX}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'x', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">Y</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordY}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'y', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="i2">
                  <div className="ig">
                    <label className="il">LONG</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordLong}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lon', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                  <div className="ig">
                    <label className="il">LAT</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={coordLat}
                      onChange={(e) => {
                        const v = e.target.value
                        updateOperacion(op.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: setUnidadCoord(x.transectos, num, 'lat', v) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
                <button
                  className="btn b-out b-sm"
                  onClick={() => {
                    const Body = () => {
                      const [sel, setSel] = useState(() => spIds.slice())
                      const prevSet = new Set(spIds.map(Number))
                      const nextSet = new Set((Array.isArray(sel) ? sel : []).map(Number).filter((x) => Number.isFinite(x)))
                      const removed = [...prevSet].filter((x) => !nextSet.has(x))
                      const added = [...nextSet].filter((x) => !prevSet.has(x))
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                            Especies del transecto — Transecto {num}
                          </div>
                          <SpeciesGrid especies={especiesAll} selectedIds={sel} onChange={setSel} multi columns={3} maxHeight={420} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn b-out" style={{ flex: 1 }} onClick={closeModal}>
                              Cancelar
                            </button>
                            <button
                              className="btn b-teal"
                              style={{ flex: 1 }}
                              onClick={() => {
                                updateOperacion(op.id, (cur) => {
                                  const nextBotes = (cur.botes || []).map((x) => {
                                    if (x.id !== bote.id) return x
                                    let u = x.transectos
                                    added.forEach((id) => {
                                      u = addEspecieToUnidad(u, num, id)
                                    })
                                    removed.forEach((id) => {
                                      u = removeEspecieFromUnidad(u, num, id)
                                    })
                                    return { ...x, transectos: u }
                                  })
                                  return { ...cur, botes: nextBotes }
                                })

                                closeModal()
                                toast?.('Especies actualizadas', 'green')

                                // Preguntar si desea pasar las agregadas a Peso-Longitud
                                if (added.length > 0) {
                                  setTimeout(() => {
                                    const transferir = window.confirm(
                                      '¿Deseas agregar también estas especies a la pestaña Peso-Longitud de este bote?'
                                    )
                                    if (transferir) {
                                      updateOperacion(op.id, (cur) => {
                                        const nextBotes = (cur.botes || []).map((x) => {
                                          if (x.id !== bote.id) return x
                                          let map = x.lpMuestras || {}
                                          added.forEach((id) => {
                                            map = ensureKind(map, id, 'LP')
                                          })
                                          return { ...x, lpMuestras: map }
                                        })
                                        return { ...cur, botes: nextBotes }
                                      })
                                      toast?.('Especies agregadas a Peso-Longitud', 'blue')
                                    }
                                  }, 150)
                                }
                              }}
                            >
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )
                    }
                    if (!canWrite) {
                      toast('Modo solo lectura', 'blue')
                      return
                    }
                    openModal(`Seleccionar especies — Transecto ${num}`, <Body />, 'wide')
                  }}
                >
                  Seleccionar especies
                </button>
              </div>

              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table className="tbl lp-tbl">
                  <thead>
                    <tr>
                      <th>Especie</th>
                      <th>N° IND</th>
                      <th>Dens</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {spIds.length ? (
                      spIds.map((spId) => {
                        const sp = byId.get(Number(spId))
                        const cnt = Number(counts?.[spId] ?? 0)
                        const dens = calcDensidad(cnt, area)
                        return (
                          <tr key={`${num}-${spId}`}>
                            <td style={{ textAlign: 'left' }}>{sp?.com || spId}</td>
                            <td>
                              <input
                                className="ii lp-num-inp"
                                style={{ width: 90, textAlign: 'center' }}
                                type="number"
                                step="1"
                                min="0"
                                data-nav="dens-transecto"
                                value={String(cnt)}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return
                                  e.preventDefault()
                                  focusNextTransectSpeciesInput(e.currentTarget, rootRef.current)
                                }}
                                onChange={(e) => {
                                  const v = e.target.value
                                  updateOperacion(op.id, (cur) => {
                                    const nextBotes = (cur.botes || []).map((x) => {
                                      if (x.id !== bote.id) return x
                                      return { ...x, transectos: setUnidadCount(x.transectos, num, spId, v) }
                                    })
                                    return { ...cur, botes: nextBotes }
                                  })
                                }}
                              />
                            </td>
                            <td>{dens.toFixed(4)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn b-out b-sm"
                                onClick={() => {
                                  updateOperacion(op.id, (cur) => {
                                    const nextBotes = (cur.botes || []).map((x) => {
                                      if (x.id !== bote.id) return x
                                      return { ...x, transectos: removeEspecieFromUnidad(x.transectos, num, spId) }
                                    })
                                    return { ...cur, botes: nextBotes }
                                  })
                                }}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)' }}>
                          Agrega especies para contar
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
