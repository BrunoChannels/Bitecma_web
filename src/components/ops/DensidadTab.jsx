import { useMemo, useRef, useState } from 'react'
import {
  agregarEspecieAUnidad,
  calcularDensidad,
  crearUnidades,
  eliminarUnidad,
  siguienteNumeroUnidad,
  quitarEspecieDeUnidad,
  establecerEspecieCuadrante,
  establecerCoordenadaUnidad,
  establecerConteoUnidad,
  actualizarUnidad,
} from '../../services/densidadService.js'
import GrillaEspecies from '../common/SpeciesGrid.jsx'
import { asegurarTipo } from '../../services/lpMuestrasService.js'

function normalizarClave(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const algasComunes = new Set(
  [
    'Huiro negro',
    'Huiro palo',
    'Cochayuyo',
    'Huiro canutillo',
    'Huiro',
    'Luga roja',
    'Luga negra',
    'Luga cuchara',
  ].map(normalizarClave),
)
const algasCientificas = new Set(
  [
    'Lessonia berteroana',
    'Lessonia trabeculata',
    'Durvillaea antarctica',
    'Macrocystis integrifolia',
    'Macrocystis pyrifera',
    'Gigartina skottsbergii',
    'Sarcothalia crispata',
    'Mazzaella laminarioides',
  ].map(normalizarClave),
)

function esEspecieAlga(especie) {
  return algasComunes.has(normalizarClave(especie?.com)) || algasCientificas.has(normalizarClave(especie?.sci))
}

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
 * onKeyDown={(e) => e.key==='Enter' && enfocarSiguienteInput(e.currentTarget, referenciaRaiz.current)}
 *
 * Notas de mantenimiento:
 * - Mantener atributos `data-nav` consistentes en los inputs que participan de esta navegación.
 */
function enfocarSiguienteInput(from, root) {
  const contenedor = root || document
  const inputs = Array.from(contenedor.querySelectorAll('input[data-nav="dens"]'))
  const idx = inputs.indexOf(from)
  if (idx < 0) return
  const siguiente = inputs[idx + 1]
  if (!siguiente) return
  siguiente.focus()
  siguiente.select?.()
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
 * enfocarSiguienteInputEspeciesTransecto(e.currentTarget, referenciaRaiz.current)
 *
 * Notas de mantenimiento:
 * - Usar este modo solo en inputs del grid de especies por transecto.
 */
function enfocarSiguienteInputEspeciesTransecto(from, root) {
  const contenedor = root || document
  const inputs = Array.from(contenedor.querySelectorAll('input[data-nav="dens-transecto"]'))
  const idx = inputs.indexOf(from)
  if (idx < 0) return
  const siguiente = inputs[idx + 1]
  if (!siguiente) return
  siguiente.focus()
  siguiente.select?.()
}

/**
 * Pestaña de densidad para un bote: administra transectos/cuadrantes, especies y conteos.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.operacion - Operación actual (contiene `id`, `fechaInicio`, etc.).
 * @param {object} props.bote - Bote actual (contiene `id`, `transectos`, `densTipo`, etc.).
 * @param {Array<object>} props.especies - Catálogo de especies.
 * @param {(opId: string, updater: (cur: any) => any) => void} props.actualizarOperacion - Actualiza operación (inmutable).
 * @param {boolean} props.puedeEscribir - Permiso de escritura.
 * @param {(msg: string, color?: string) => void} props.mostrarToast - Notificador UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.abrirModal - Abre modal.
 * @param {() => void} props.cerrarModal - Cierra modal.
 * @returns {import('react').JSX.Element} UI para gestionar densidad.
 *
 * Lógica (alto nivel):
 * 1) Ordena unidades (transectos/cuadrantes) por número.
 * 2) Permite expandir/cerrar detalles por unidad (`unidadesAbiertas`).
 * 3) Provee modales para:
 *    - Crear transectos masivamente (con selección de especies por transecto).
 *    - Crear cuadrantes (con especie asociada y parámetros).
 *    - Editar especies de una unidad, conteos, coordenadas y metadatos.
 * 4) Calcula densidad por especie usando `calcularDensidad`.
 * 5) Opcionalmente ofrece transferir especies agregadas a la pestaña Peso-Longitud (LP) mediante `asegurarTipo`.
 *
 * Dependencias externas:
 * - [densidadService](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/densidadService.js): creación/edición de unidades y conteos.
 * - [SpeciesGrid](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/common/SpeciesGrid.jsx).
 * - [asegurarTipo](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/lpMuestrasService.js) para habilitar especies en LP.
 *
 * Efectos secundarios:
 * - Actualiza operación/bote mediante `actualizarOperacion`.
 * - Abre modales y puede disparar `confirm()` del navegador.
 * - Cambia foco de inputs en navegación por Enter.
 *
 * Manejo de errores:
 * - Bloquea acciones de escritura si `puedeEscribir` es false.
 * - Usa `confirm()` para operaciones destructivas (eliminar unidades, quitar especies).
 *
 * @example
 * <PestanaDensidad operacion={operacion} bote={b} especies={db.especies} actualizarOperacion={actualizarOperacion} puedeEscribir={puedeEscribir} mostrarToast={mostrarToast} abrirModal={abrirModal} cerrarModal={cerrarModal} />
 *
 * Notas de mantenimiento:
 * - Este archivo contiene mucha lógica UI; si crece, considerar extraer subcomponentes (modales/cards) para legibilidad.
 * - Mantener consistencia de `densTipo` y estructura `transectos` con servicios.
 */
export default function PestanaDensidad({ operacion, bote, especies, actualizarOperacion, puedeEscribir, mostrarToast, abrirModal, cerrarModal }) {
  const referenciaRaiz = useRef(null)
  const [unidadesAbiertas, establecerUnidadesAbiertas] = useState(() => new Set())

  const unidades = useMemo(() => {
    const arr = Array.isArray(bote?.transectos) ? bote.transectos : []
    return [...arr].sort((a, b) => (Number(a?.num) || 0) - (Number(b?.num) || 0))
  }, [bote?.transectos])

  const primerNumeroTransecto = useMemo(() => {
    const u = (Array.isArray(unidades) ? unidades : []).find((x) => String(x?.tipo || 'transecto') === 'transecto')
    const n = Number(u?.num)
    return Number.isFinite(n) ? n : null
  }, [unidades])

  const primerNumeroCuadrante = useMemo(() => {
    const u = (Array.isArray(unidades) ? unidades : []).find((x) => String(x?.tipo || '') === 'cuadrante')
    const n = Number(u?.num)
    return Number.isFinite(n) ? n : null
  }, [unidades])

  const especiesOrdenadas = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.slice().sort((a, b) => String(a?.com || '').localeCompare(String(b?.com || '')))
  }, [especies])

  const especiePorId = useMemo(() => {
    const m = new Map()
    especiesOrdenadas.forEach((e) => m.set(Number(e.id), e))
    return m
  }, [especiesOrdenadas])

  /**
   * Alterna la expansión (detalles) de una unidad por su número.
   *
   * @param {number} num - Número de unidad (transecto/cuadrante).
   * @returns {void} No retorna valor.
   *
   * Lógica:
  * 1) Clona el Set previo (`unidadesAbiertas`).
   * 2) Si existe `num`, lo elimina; si no, lo agrega.
   * 3) Devuelve el nuevo Set para re-render.
   *
   * Dependencias externas:
  * - `establecerUnidadesAbiertas` (estado local).
   *
   * Efectos secundarios:
   * - Cambia estado local (UI).
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
  * onClick={() => alternarUnidad(3)}
   *
   * Notas de mantenimiento:
   * - Mantener `num` como number consistente (se usa como clave en UI).
   */
  const alternarUnidad = (num) => {
    establecerUnidadesAbiertas((prev) => {
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
  * 1) Valida `puedeEscribir`; en modo lectura muestra toast y aborta.
   * 2) Define un Cuerpo interno con una grilla de transectos (área, sustrato, cubierta, especies).
   * 3) Permite replicar configuración del primer transecto y agregar/eliminar filas.
   * 4) Al guardar, reconstruye la lista de transectos del bote preservando unidades no-transecto y conteos existentes cuando aplica.
  * 5) Ofrece (opcional) transferir especies nuevas a Peso-Longitud vía `asegurarTipo`.
   *
   * Dependencias externas:
  * - `abrirModal/cerrarModal`, `mostrarToast`, `actualizarOperacion`.
  * - `siguienteNumeroUnidad` y utilidades de servicio.
  * - `GrillaEspecies` para selección de especies por transecto.
  * - `asegurarTipo` para habilitar especies en LP.
   *
   * Efectos secundarios:
   * - Abre un modal y puede modificar el bote (transectos y/o lpMuestras).
   *
   * Manejo de errores:
  * - Valida `puedeEscribir` y `puedeGuardar` antes de persistir.
   *
   * @example
  * <button onClick={abrirCrearTransectos}>Agregar Transecto</button>
   *
   * Notas de mantenimiento:
   * - Mantener la preservación de conteos/coordenadas para no perder datos al guardar en bloque.
   */
  const abrirCrearTransectos = () => {
    if (!puedeEscribir) {
      mostrarToast('Modo solo lectura', 'blue')
      return
    }
    /**
     * Cuerpo del modal de creación masiva de transectos.
     *
     * @returns {import('react').JSX.Element} UI del modal.
     *
     * Lógica:
     * 1) Inicializa filas desde transectos existentes (seed) o crea un set por defecto.
     * 2) Permite seleccionar especies por transecto usando `GrillaEspecies` (modo pick).
     * 3) Permite replicar fila 1 y agregar/eliminar transectos.
     * 4) Valida `puedeGuardar` (al menos una especie seleccionada en algún transecto).
     *
     * Dependencias externas:
     * - `GrillaEspecies`, `siguienteNumeroUnidad`.
     *
     * Efectos secundarios:
     * - Actualiza estado local del modal (rows/pick).
     *
     * Manejo de errores:
     * - No aplica.
     *
     * @example
     * abrirModal('Agregar transectos', <Cuerpo />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener la representación `rows` alineada con el esquema de `transectos` del bote.
     */
    const Cuerpo = () => {
      const numeroInicial = siguienteNumeroUnidad(bote?.transectos)
      const transectosSemilla = (Array.isArray(bote?.transectos) ? bote.transectos : [])
        .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
        .slice()
        .sort((a, b) => (Number(a?.num) || 0) - (Number(b?.num) || 0))
      const [filas, establecerFilas] = useState(() =>
        transectosSemilla.length
          ? transectosSemilla.map((u) => ({
              num: Number(u?.num) || 0,
              area: Number(u?.area) || 120,
              sustrato: String(u?.sustrato || ''),
              cubierta: String(u?.cubierta || ''),
              especiesIds: Object.keys(u?.counts && typeof u.counts === 'object' ? u.counts : {})
                .map(Number)
                .filter((x) => Number.isFinite(x)),
            }))
          : Array.from({ length: 6 }, (_, i) => ({
              num: numeroInicial + i,
              area: 120,
              sustrato: '',
              cubierta: '',
              especiesIds: [],
            })),
      )
      const [seleccionEspecies, establecerSeleccionEspecies] = useState(null)

      const replicar = () => {
        establecerFilas((prev) => {
          const primeraFila = prev[0]
          if (!primeraFila) return prev
          return prev.map((r, idx) =>
            idx === 0
              ? r
              : {
                  ...r,
                  area: primeraFila.area,
                  sustrato: primeraFila.sustrato,
                  cubierta: primeraFila.cubierta,
                  especiesIds: (primeraFila.especiesIds || []).slice(),
                },
          )
        })
      }

      const puedeGuardar = filas.some((r) => Array.isArray(r.especiesIds) && r.especiesIds.length)

      if (seleccionEspecies) {
        return (
          <div data-tutorial-id="ops-dens-species-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
              Especies — Transecto {seleccionEspecies.num}
            </div>
            <div data-tutorial-id="ops-dens-species-grid">
              <GrillaEspecies
                especies={especiesOrdenadas}
                selectedIds={seleccionEspecies.sel}
                onChange={(ids) => {
                  const nextIds = Array.isArray(ids) ? ids : []
                  establecerSeleccionEspecies((p) => ({ ...p, sel: nextIds }))
                  if (nextIds.length > 0) {
                    window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-species-selected' } }))
                  } else {
                    window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-species-cleared' } }))
                  }
                }}
                multi
                columns={3}
                maxHeight={420}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn b-out" style={{ flex: 1 }} disabled onClick={() => establecerSeleccionEspecies(null)}>
                Volver
              </button>
              <button
                className="btn b-teal"
                style={{ flex: 1 }}
                data-tutorial-id="ops-dens-species-apply"
                onClick={() => {
                  establecerFilas((prev) => prev.map((x) => (x.num === seleccionEspecies.num ? { ...x, especiesIds: seleccionEspecies.sel } : x)))
                  establecerSeleccionEspecies(null)
                }}
              >
                Aplicar a Transecto {seleccionEspecies.num}
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
            <button className="btn b-out b-sm" data-tutorial-id="ops-dens-replicar" onClick={replicar}>
              Replicar fila 1
            </button>
            <button
              className="btn b-out b-sm"
              onClick={() =>
                establecerFilas((prev) => [
                  ...prev,
                  {
                    num: (prev[prev.length - 1]?.num || numeroInicial - 1) + 1,
                    area: prev[0]?.area ?? 120,
                    sustrato: '',
                    cubierta: '',
                    especiesIds: [],
                  },
                ])
              }
            >
              Agregar transecto
            </button>
          </div>

          <div
            data-tutorial-id="ops-dens-tx-table"
            style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, maxHeight: '55vh' }}
          >
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
                {filas.map((r, idx) => (
                  <tr key={r.num} data-tutorial-id={idx === 0 ? 'ops-dens-tx-row1' : undefined}>
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
                          establecerFilas((prev) => prev.map((x) => (x.num === r.num ? { ...x, area: v } : x)))
                        }}
                      />
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input
                        className="ii"
                        value={r.sustrato}
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-sustrato' : undefined}
                        onChange={(e) => establecerFilas((prev) => prev.map((x) => (x.num === r.num ? { ...x, sustrato: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input
                        className="ii"
                        value={r.cubierta}
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-cubierta' : undefined}
                        onChange={(e) => establecerFilas((prev) => prev.map((x) => (x.num === r.num ? { ...x, cubierta: e.target.value } : x)))}
                      />
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <button
                        className="btn b-out b-sm"
                        data-tutorial-id={idx === 0 ? 'ops-dens-tx-especies' : undefined}
                        onClick={() => establecerSeleccionEspecies({ num: r.num, sel: (r.especiesIds || []).slice() })}
                      >
                        {Array.isArray(r.especiesIds) && r.especiesIds.length ? `${r.especiesIds.length} especies` : 'Seleccionar especies'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn b-out b-sm" onClick={() => establecerFilas((prev) => prev.filter((x) => x.num !== r.num))}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={cerrarModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={!puedeGuardar}
              data-tutorial-id="ops-dens-tx-save"
              onClick={() => {
                if (!puedeGuardar) return
                actualizarOperacion(operacion.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const unidadesPrevias = Array.isArray(x.transectos) ? x.transectos : []
                    const transectoPrevioPorNumero = new Map(
                      unidadesPrevias
                        .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
                        .map((u) => [Number(u?.num) || 0, u]),
                    )
                    const unidadesNoTransectoPreservadas = unidadesPrevias.filter((u) => String(u?.tipo || 'transecto') !== 'transecto')
                    const filasOrdenadas = filas
                      .slice()
                      .sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0))
                    const transectosSiguientes = filasOrdenadas.map((fila) => {
                      const num = Number(fila?.num) || 0
                      const transectoPrevio = transectoPrevioPorNumero.get(num)
                      const conteosPrevios =
                        transectoPrevio?.counts && typeof transectoPrevio.counts === 'object' ? transectoPrevio.counts : {}
                      const idsEspeciesSeleccionadas = Array.isArray(fila?.especiesIds)
                        ? fila.especiesIds.map(Number).filter((v) => Number.isFinite(v))
                        : []
                      const conteosPorEspecie = Object.fromEntries(
                        idsEspeciesSeleccionadas.map((id) => [id, Number(conteosPrevios[id] ?? 0)]),
                      )
                      return {
                        num,
                        tipo: 'transecto',
                        area: Number(fila?.area) || 120,
                        fecha: String(transectoPrevio?.fecha || operacion?.fechaInicio || ''),
                        sustrato: String(fila?.sustrato || ''),
                        cubierta: String(fila?.cubierta || ''),
                        coordX: transectoPrevio?.coordX ?? null,
                        coordY: transectoPrevio?.coordY ?? null,
                        coordLong: transectoPrevio?.coordLong ?? null,
                        coordLat: transectoPrevio?.coordLat ?? null,
                        counts: conteosPorEspecie,
                      }
                    })
                    return { ...x, transectos: [...unidadesNoTransectoPreservadas, ...transectosSiguientes] }
                  })
                  return { ...cur, botes: nextBotes }
                })
                cerrarModal()
                mostrarToast?.('Transectos actualizados', 'green')

                // Detectar si hay especies nuevas añadidas en este guardado masivo
                const idsEspeciesExistentes = new Set(
                  (Array.isArray(bote?.transectos) ? bote.transectos : [])
                    .filter((u) => String(u?.tipo || 'transecto') === 'transecto')
                    .flatMap((u) => Object.keys(u?.counts && typeof u.counts === 'object' ? u.counts : {}).map(Number)),
                )
                const idsEspeciesNuevas = new Set(filas.flatMap((r) => (Array.isArray(r.especiesIds) ? r.especiesIds.map(Number) : [])))
                const idsEspeciesRecienAgregadas = [...idsEspeciesNuevas].filter((id) => !idsEspeciesExistentes.has(id))

                if (idsEspeciesRecienAgregadas.length > 0) {
                  setTimeout(() => {
                    const CuerpoTransferencia = () => {
                      const nombresEspecies = idsEspeciesRecienAgregadas
                        .map((id) => especiePorId.get(Number(id))?.com)
                        .filter(Boolean)
                        .slice(0, 8)
                      const cantidadExtra = idsEspeciesRecienAgregadas.length - nombresEspecies.length

                      return (
                        <div data-tutorial-id="ops-dens-transfer-modal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                            ¿Deseas agregar también estas especies a la pestaña Peso-Longitud de este bote?
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {nombresEspecies.map((nombreEspecie) => (
                              <span key={nombreEspecie} className="pill p-blu">
                                {nombreEspecie}
                              </span>
                            ))}
                            {cantidadExtra > 0 ? <span className="pill p-out">+{cantidadExtra}</span> : null}
                          </div>
                          <div data-tutorial-id="ops-dens-transfer-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              className="btn b-out"
                              style={{ flex: 1 }}
                              data-tutorial-id="ops-dens-transfer-no"
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-dens-transfer-done' } }))
                                cerrarModal()
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
                                actualizarOperacion(operacion.id, (cur) => {
                                  const nextBotes = (cur.botes || []).map((x) => {
                                    if (x.id !== bote.id) return x
                                    let mapaLpMuestras = x.lpMuestras || {}
                                    idsEspeciesRecienAgregadas.forEach((id) => {
                                      const especie = especiePorId.get(Number(id))
                                      mapaLpMuestras = asegurarTipo(mapaLpMuestras, id, esEspecieAlga(especie) ? 'D' : 'LP')
                                    })
                                    return { ...x, lpMuestras: mapaLpMuestras }
                                  })
                                  return { ...cur, botes: nextBotes }
                                })
                                cerrarModal()
                                mostrarToast?.('Especies agregadas a Peso-Longitud', 'blue')
                              }}
                            >
                              Sí, agregar
                            </button>
                          </div>
                        </div>
                      )
                    }

                    abrirModal('Transferir especies', <CuerpoTransferencia />, 'normal')
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

    abrirModal(`Agregar transectos — ${bote?.nombre || bote?.id}`, <Cuerpo />, 'wide')
  }

  const abrirCrearCuadrantes = () => {
    if (!puedeEscribir) {
      mostrarToast('Modo solo lectura', 'blue')
      return
    }
    const Cuerpo = () => {
      const [formulario, establecerFormulario] = useState(() => ({
        cantidad: 30,
        area: 0.25,
        sustrato: '',
        especieId: '',
      }))
      const [mostrarSelectorEspecie, establecerMostrarSelectorEspecie] = useState(false)

      const puedeGuardar = String(formulario.especieId || '').trim() !== '' && Number(formulario.cantidad) > 0
      const especieSeleccionada = especiePorId.get(Number(formulario.especieId))

      if (mostrarSelectorEspecie) {
        return (
          <div data-tutorial-id="ops-cuad-especie-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>Especie del cuadrante</div>
            <div data-tutorial-id="ops-cuad-especie-grid">
              <GrillaEspecies
                especies={especiesOrdenadas}
                selectedIds={formulario.especieId ? [Number(formulario.especieId)] : []}
                onChange={(idsSeleccionados) => {
                  const idSeleccionado = idsSeleccionados?.[0]
                  establecerFormulario((estadoPrevio) => ({ ...estadoPrevio, especieId: idSeleccionado ? String(idSeleccionado) : '' }))
                  establecerMostrarSelectorEspecie(false)
                  if (idSeleccionado) {
                    window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-cuad-especie-picked' } }))
                  }
                }}
                multi={false}
                columns={3}
                maxHeight={420}
              />
            </div>
            <button className="btn b-out" onClick={() => establecerMostrarSelectorEspecie(false)}>
              Volver
            </button>
          </div>
        )
      }

      return (
        <div data-tutorial-id="ops-cuad-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="i2">
            <div className="ig">
              <label className="il">Cantidad</label>
              <input
                className="ii"
                type="number"
                data-tutorial-id="ops-cuad-cantidad"
                value={formulario.cantidad}
                onChange={(e) => establecerFormulario((estadoPrevio) => ({ ...estadoPrevio, cantidad: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="ig">
              <label className="il">Área cuadrante</label>
              <select
                className="is"
                data-tutorial-id="ops-cuad-area"
                value={String(formulario.area)}
                onChange={(e) => establecerFormulario((estadoPrevio) => ({ ...estadoPrevio, area: Number(e.target.value) }))}
              >
                <option value="1">1 m²</option>
                <option value="0.25">0.25 m²</option>
                <option value="0.0625">0.0625 m²</option>
              </select>
            </div>
          </div>
          <div className="i2">
            <div className="ig">
              <label className="il">Tipo sustrato</label>
              <input
                className="ii"
                data-tutorial-id="ops-cuad-sustrato"
                value={formulario.sustrato}
                onChange={(e) => establecerFormulario((estadoPrevio) => ({ ...estadoPrevio, sustrato: e.target.value }))}
              />
            </div>
            <div className="ig">
              <label className="il">Especie</label>
              <button
                className="btn b-out"
                data-tutorial-id="ops-cuad-especie-btn"
                data-tutorial-advance="true"
                onClick={() => establecerMostrarSelectorEspecie(true)}
              >
                {especieSeleccionada ? `${especieSeleccionada.com} — ${especieSeleccionada.sci}` : 'Seleccionar especie'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} onClick={cerrarModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              disabled={!puedeGuardar}
              data-tutorial-id="ops-cuad-crear"
              data-tutorial-advance="true"
              onClick={() => {
                if (!puedeGuardar) return
                actualizarOperacion(operacion.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const unidadesSiguientes = crearUnidades({
                      unidades: x.transectos,
                      tipo: 'cuadrante',
                      cantidad: formulario.cantidad,
                      area: formulario.area,
                      fecha: String(operacion?.fechaInicio || ''),
                      sustrato: formulario.sustrato,
                      cubierta: '',
                      especieId: formulario.especieId,
                    })
                    return { ...x, transectos: unidadesSiguientes }
                  })
                  return { ...cur, botes: nextBotes }
                })
                cerrarModal()
                mostrarToast?.('Cuadrantes creados', 'green')
              }}
            >
              Crear
            </button>
          </div>
        </div>
      )
    }

    abrirModal(`Agregar cuadrantes — ${bote?.nombre || bote?.id}`, <Cuerpo />, 'wide')
  }

  const abrirCrearUnidades = () => {
    if (bote?.densTipo === 'cuadrante') abrirCrearCuadrantes()
    else abrirCrearTransectos()
  }

  return (
    <div ref={referenciaRaiz} data-tutorial-id={bote?.densTipo === 'cuadrante' ? 'ops-cuad-dens-panel' : undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
          {bote?.densTipo === 'cuadrante' ? 'Cuadrantes' : 'Transectos'}
        </div>
        <button className="btn b-teal b-sm" data-tutorial-id="ops-dens-add-transecto" onClick={abrirCrearUnidades}>
          {bote?.densTipo === 'cuadrante' ? 'Agregar Cuadrante' : 'Agregar Transecto'}
        </button>
      </div>

      {unidades.length === 0 ? (
        <div className="info-box amber">
          <span>i</span>
          <div>Sin unidades de densidad. Crea transectos/cuadrantes para comenzar.</div>
        </div>
      ) : (
        unidades.map((unidad) => {
          const numeroUnidad = Number(unidad?.num) || 0
          const esCuadrante = unidad?.tipo === 'cuadrante'
          const conteosPorEspecie = unidad?.counts && typeof unidad.counts === 'object' ? unidad.counts : {}
          const idsEspecies = Object.keys(conteosPorEspecie)
            .map(Number)
            .filter((x) => Number.isFinite(x))
            .sort((a, b) => a - b)
          const areaUnidad = Number(unidad.area) || 0
          const coordenadaX = unidad?.coordX ?? ''
          const coordenadaY = unidad?.coordY ?? ''
          const coordenadaLong = unidad?.coordLong ?? ''
          const coordenadaLat = unidad?.coordLat ?? ''
          const etiquetasEspecies = idsEspecies
            .map((id) => especiePorId.get(Number(id))?.com)
            .filter(Boolean)
            .slice(0, 12)

          if (esCuadrante) {
            const idEspecie = Number(unidad.especieId ?? idsEspecies[0] ?? null)
            const especie = especiePorId.get(idEspecie)
            const conteoIndividuos = Number(conteosPorEspecie?.[idEspecie] ?? 0)
            const densidad = calcularDensidad(conteoIndividuos, areaUnidad)
            const estaAbierta = unidadesAbiertas.has(numeroUnidad)
            const resumen = `Área ${areaUnidad || '—'} m² · Sustrato ${unidad?.sustrato ? unidad.sustrato : '—'}`

            return (
              <div key={`${bote.id}-${numeroUnidad}`} className="tx-card cuad">
                <div
                  className="tx-hd"
                  onClick={() => alternarUnidad(numeroUnidad)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                >
                  <span className="pill p-pur" style={{ fontSize: 10 }}>
                    Cuadrante {numeroUnidad}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{especie?.com || '—'}</span>

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
                        data-tutorial-id={
                          primerNumeroCuadrante != null && numeroUnidad === primerNumeroCuadrante ? 'ops-cuad-count' : undefined
                        }
                        value={String(conteoIndividuos)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          enfocarSiguienteInput(e.currentTarget, referenciaRaiz.current)
                        }}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: establecerConteoUnidad(x.transectos, numeroUnidad, idEspecie, v) }
                            })
                            return { ...cur, botes: nextBotes }
                          })
                        }}
                      />
                      <span style={{ fontFamily: 'var(--ff-m)', fontSize: 12, fontWeight: 800, color: 'var(--teal)' }}>
                        {densidad.toFixed(4)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>ind/m²</span>
                    </div>

                    <div style={{ width: 1, height: 26, background: 'var(--border2)' }} />

                    <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{resumen}</div>

                    <button
                      className="btn b-out b-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!confirm(`Eliminar Cuadrante ${numeroUnidad}?`)) return
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: eliminarUnidad(x.transectos, numeroUnidad) }
                          })
                          return { ...cur, botes: nextBotes }
                        })
                        mostrarToast?.('Cuadrante eliminado', 'green')
                      }}
                    >
                      Eliminar
                    </button>

                    <button
                      className="btn b-out b-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        alternarUnidad(numeroUnidad)
                      }}
                    >
                      {estaAbierta ? '▴' : '▾'}
                    </button>
                  </div>
                </div>

                <div className={`tx-body${estaAbierta ? ' open' : ''}`}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <button
                      className="btn b-out b-sm"
                      onClick={() => {
                        const Cuerpo = () => {
                          const [idsSeleccionados, establecerIdsSeleccionados] = useState(() => (idEspecie ? [idEspecie] : []))
                          const especieActual = idsSeleccionados?.[0] ? especiePorId.get(Number(idsSeleccionados[0])) : null
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                                Especie del cuadrante — Cuadrante {numeroUnidad}
                              </div>
                              <GrillaEspecies
                                especies={especiesOrdenadas}
                                selectedIds={idsSeleccionados}
                                onChange={establecerIdsSeleccionados}
                                multi={false}
                                columns={3}
                                maxHeight={420}
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn b-out" style={{ flex: 1 }} onClick={cerrarModal}>
                                  Cancelar
                                </button>
                                <button
                                  className="btn b-teal"
                                  style={{ flex: 1 }}
                                  disabled={!especieActual}
                                  onClick={() => {
                                    if (!especieActual) return
                                    actualizarOperacion(operacion.id, (cur) => {
                                      const nextBotes = (cur.botes || []).map((x) => {
                                        if (x.id !== bote.id) return x
                                        return { ...x, transectos: establecerEspecieCuadrante(x.transectos, numeroUnidad, especieActual.id) }
                                      })
                                      return { ...cur, botes: nextBotes }
                                    })
                                    cerrarModal()
                                    mostrarToast?.('Especie actualizada', 'green')
                                  }}
                                >
                                  Confirmar
                                </button>
                              </div>
                            </div>
                          )
                        }
                        if (!puedeEscribir) {
                          mostrarToast('Modo solo lectura', 'blue')
                          return
                        }
                        abrirModal(`Seleccionar especie — Cuadrante ${numeroUnidad}`, <Cuerpo />, 'wide')
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
                        value={unidad.area ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { area: v }) }
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
                        value={unidad?.sustrato || ''}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { sustrato: v }) }
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
                        value={coordenadaX}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'x', v) }
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
                        value={coordenadaY}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'y', v) }
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
                        value={coordenadaLong}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'lon', v) }
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
                        value={coordenadaLat}
                        onChange={(e) => {
                          const v = e.target.value
                          actualizarOperacion(operacion.id, (cur) => {
                            const nextBotes = (cur.botes || []).map((x) => {
                              if (x.id !== bote.id) return x
                              return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'lat', v) }
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

          const estaAbierta = unidadesAbiertas.has(numeroUnidad)

          return (
            <div
              key={`${bote.id}-${numeroUnidad}`}
              className="tx-card"
              data-tutorial-id={
                primerNumeroTransecto != null && numeroUnidad === primerNumeroTransecto ? 'ops-dens-transecto-card' : undefined
              }
            >
              <div className="tx-hd">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{`Transecto ${numeroUnidad}`}</div>
                  {etiquetasEspecies.length ? (
                    etiquetasEspecies.map((nombreEspecie) => (
                      <span key={nombreEspecie} className="pill p-teal" style={{ fontSize: 10 }}>
                        {nombreEspecie}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sin especies</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Área {areaUnidad || '—'} · {unidad?.sustrato ? `Sustrato ${unidad.sustrato}` : 'Sustrato —'} ·{' '}
                    {unidad?.cubierta ? `Cubierta ${unidad.cubierta}` : 'Cubierta —'}
                  </span>
                  <button className="btn b-out b-sm" onClick={() => alternarUnidad(numeroUnidad)}>
                    {estaAbierta ? 'Detalles ▴' : 'Detalles ▾'}
                  </button>
                  <button
                    className="btn b-out b-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirm(`Eliminar Transecto ${numeroUnidad}?`)) return
                      actualizarOperacion(operacion.id, (cur) => {
                        const nextBotes = (cur.botes || []).map((x) => {
                          if (x.id !== bote.id) return x
                          return { ...x, transectos: eliminarUnidad(x.transectos, numeroUnidad) }
                        })
                        return { ...cur, botes: nextBotes }
                      })
                      mostrarToast?.('Transecto eliminado', 'green')
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className={`tx-body${estaAbierta ? ' open' : ''}`}>
                <div className="i2">
                  <div className="ig">
                    <label className="il">Área</label>
                    <input
                      className="ii"
                      type="number"
                      step="any"
                      value={unidad.area ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { area: v }) }
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
                      value={String(unidad.fecha || '')}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { fecha: v }) }
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
                      value={unidad.sustrato || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { sustrato: v }) }
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
                      value={unidad.cubierta || ''}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: actualizarUnidad(x.transectos, numeroUnidad, { cubierta: v }) }
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
                      value={coordenadaX}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'x', v) }
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
                      value={coordenadaY}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'y', v) }
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
                      value={coordenadaLong}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'lon', v) }
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
                      value={coordenadaLat}
                      onChange={(e) => {
                        const v = e.target.value
                        actualizarOperacion(operacion.id, (cur) => {
                          const nextBotes = (cur.botes || []).map((x) => {
                            if (x.id !== bote.id) return x
                            return { ...x, transectos: establecerCoordenadaUnidad(x.transectos, numeroUnidad, 'lat', v) }
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
                    const Cuerpo = () => {
                      const [idsSeleccionados, establecerIdsSeleccionados] = useState(() => idsEspecies.slice())
                      const conjuntoPrevio = new Set(idsEspecies.map(Number))
                      const conjuntoSiguiente = new Set(
                        (Array.isArray(idsSeleccionados) ? idsSeleccionados : [])
                          .map(Number)
                          .filter((x) => Number.isFinite(x)),
                      )
                      const idsQuitados = [...conjuntoPrevio].filter((x) => !conjuntoSiguiente.has(x))
                      const idsAgregados = [...conjuntoSiguiente].filter((x) => !conjuntoPrevio.has(x))
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontFamily: 'var(--ff-d)', fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                            Especies del transecto — Transecto {numeroUnidad}
                          </div>
                          <GrillaEspecies
                            especies={especiesOrdenadas}
                            selectedIds={idsSeleccionados}
                            onChange={establecerIdsSeleccionados}
                            multi
                            columns={3}
                            maxHeight={420}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn b-out" style={{ flex: 1 }} onClick={cerrarModal}>
                              Cancelar
                            </button>
                            <button
                              className="btn b-teal"
                              style={{ flex: 1 }}
                              onClick={() => {
                                actualizarOperacion(operacion.id, (cur) => {
                                  const nextBotes = (cur.botes || []).map((x) => {
                                    if (x.id !== bote.id) return x
                                    let unidadesDensidad = x.transectos
                                    idsAgregados.forEach((id) => {
                                      unidadesDensidad = agregarEspecieAUnidad(unidadesDensidad, numeroUnidad, id)
                                    })
                                    idsQuitados.forEach((id) => {
                                      unidadesDensidad = quitarEspecieDeUnidad(unidadesDensidad, numeroUnidad, id)
                                    })
                                    return { ...x, transectos: unidadesDensidad }
                                  })
                                  return { ...cur, botes: nextBotes }
                                })

                                cerrarModal()
                                mostrarToast?.('Especies actualizadas', 'green')

                                // Preguntar si desea pasar las agregadas a Peso-Longitud
                                if (idsAgregados.length > 0) {
                                  setTimeout(() => {
                                    const transferir = window.confirm(
                                      '¿Deseas agregar también estas especies a la pestaña Peso-Longitud de este bote?'
                                    )
                                    if (transferir) {
                                      actualizarOperacion(operacion.id, (cur) => {
                                        const nextBotes = (cur.botes || []).map((x) => {
                                          if (x.id !== bote.id) return x
                                          let mapaLpMuestras = x.lpMuestras || {}
                                          idsAgregados.forEach((id) => {
                                            const especie = especiePorId.get(Number(id))
                                            mapaLpMuestras = asegurarTipo(mapaLpMuestras, id, esEspecieAlga(especie) ? 'D' : 'LP')
                                          })
                                          return { ...x, lpMuestras: mapaLpMuestras }
                                        })
                                        return { ...cur, botes: nextBotes }
                                      })
                                      mostrarToast?.('Especies agregadas a Peso-Longitud', 'blue')
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
                    if (!puedeEscribir) {
                      mostrarToast('Modo solo lectura', 'blue')
                      return
                    }
                    abrirModal(`Seleccionar especies — Transecto ${numeroUnidad}`, <Cuerpo />, 'wide')
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
                    {idsEspecies.length ? (
                      idsEspecies.map((idEspecie) => {
                        const especie = especiePorId.get(Number(idEspecie))
                        const conteoIndividuos = Number(conteosPorEspecie?.[idEspecie] ?? 0)
                        const densidad = calcularDensidad(conteoIndividuos, areaUnidad)
                        const esPrimerConteo =
                          primerNumeroTransecto != null &&
                          numeroUnidad === primerNumeroTransecto &&
                          idsEspecies.length &&
                          Number(idsEspecies[0]) === Number(idEspecie)
                        return (
                          <tr key={`${numeroUnidad}-${idEspecie}`}>
                            <td style={{ textAlign: 'left' }}>{especie?.com || idEspecie}</td>
                            <td>
                              <input
                                className="ii lp-num-inp"
                                style={{ width: 90, textAlign: 'center' }}
                                type="number"
                                step="1"
                                min="0"
                                data-nav="dens-transecto"
                                data-tutorial-id={esPrimerConteo ? 'ops-dens-transecto-count' : undefined}
                                value={String(conteoIndividuos)}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return
                                  e.preventDefault()
                                  enfocarSiguienteInputEspeciesTransecto(e.currentTarget, referenciaRaiz.current)
                                }}
                                onChange={(e) => {
                                  const v = e.target.value
                                  actualizarOperacion(operacion.id, (cur) => {
                                    const nextBotes = (cur.botes || []).map((x) => {
                                      if (x.id !== bote.id) return x
                                      return { ...x, transectos: establecerConteoUnidad(x.transectos, numeroUnidad, idEspecie, v) }
                                    })
                                    return { ...cur, botes: nextBotes }
                                  })
                                }}
                              />
                            </td>
                            <td>{densidad.toFixed(4)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn b-out b-sm"
                                onClick={() => {
                                  actualizarOperacion(operacion.id, (cur) => {
                                    const nextBotes = (cur.botes || []).map((x) => {
                                      if (x.id !== bote.id) return x
                                      return { ...x, transectos: quitarEspecieDeUnidad(x.transectos, numeroUnidad, idEspecie) }
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
