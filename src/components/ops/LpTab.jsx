import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actualizarMuestra, agregarMuestra, asegurarTipo, eliminarEspecie, eliminarMuestra, eliminarTipo } from '../../services/lpMuestrasService.js'
import GrillaEspecies from '../common/SpeciesGrid.jsx'

/**
 * Infere el tipo de muestreo a partir de un arreglo de muestras.
 *
 * @param {Array<{ l?: any, p?: any, d?: any }>} muestras - Muestras (pueden venir parciales o con strings).
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
 * tipoParaMuestras([{ l: 120, p: 40 }]) // 'LP'
 *
 * Notas de mantenimiento:
 * - Si el esquema de muestras cambia (por ejemplo, nuevas medidas), ajustar la prioridad.
 */
function tipoParaMuestras(muestras) {
  const arregloMuestras = Array.isArray(muestras) ? muestras : []
  const tienePeso = arregloMuestras.some((x) => x && x.p !== undefined && x.p !== null && x.p !== '')
  const tieneDiametro = arregloMuestras.some((x) => x && x.d !== undefined && x.d !== null && x.d !== '')
  if (tieneDiametro) return 'D'
  if (tienePeso) return 'LP'
  return 'L'
}

/**
 * Normaliza un tipo de muestreo a una de las claves canónicas: `LP`, `L` o `D`.
 *
 * @param {unknown} tipoCrudo - Identificador de tipo (ej.: "L-P", "lp", "D", etc.).
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
 * normalizarTipo('l-p') // 'LP'
 *
 * Notas de mantenimiento:
 * - Mantener sincronía con `lpMuestrasService` si aparecen nuevos aliases.
 */
function normalizarTipo(tipoCrudo) {
  const tipo = String(tipoCrudo || '').trim().toUpperCase()
  if (tipo === 'L-P' || tipo === 'LP') return 'LP'
  if (tipo === 'D') return 'D'
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
 * - `tipoParaMuestras` y `normalizarTipo`.
 *
 * Efectos secundarios:
 * - Ninguno (retorna nueva estructura).
 *
 * Manejo de errores:
 * - Usa checks defensivos; no lanza.
 *
 * @example
 * normalizarEntrada({ type: 'LP', ms: [{ l: 10, p: 2 }] }) // { LP: [...] }
 *
 * Notas de mantenimiento:
 * - Esta función es clave para compatibilidad retroactiva de datos.
 */
function normalizarEntrada(entrada) {
  if (Array.isArray(entrada)) {
    const salida = {}
    ;(entrada || []).forEach((muestra) => {
      const tipo = tipoParaMuestras([muestra])
      if (!salida[tipo]) salida[tipo] = []
      salida[tipo].push(muestra)
    })
    return salida
  }
  if (entrada && typeof entrada === 'object') {
    if (Array.isArray(entrada.ms)) {
      const tipo = normalizarTipo(entrada.type || 'LP')
      return { [tipo]: Array.isArray(entrada.ms) ? entrada.ms : [] }
    }
    const salida = {}
    ;['LP', 'L', 'D'].forEach((tipo) => {
      if (Array.isArray(entrada[tipo])) salida[tipo] = entrada[tipo]
    })
    return salida
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
 * normalizarClave('Lessonia berteroana') // 'lessonia berteroana'
 *
 * Notas de mantenimiento:
 * - Mantener consistente con otros normalizadores del proyecto.
 */
function normalizarClave(texto) {
  return String(texto || '')
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

/**
 * Determina si una especie se considera "alga" para forzar el tipo de muestreo a diámetro (D).
 *
 * @param {object} especie - Especie (se espera que tenga `com` y/o `sci`).
 * @returns {boolean} `true` si el nombre común o científico coincide con listas de algas conocidas.
 *
 * Lógica:
 * 1) Normaliza `especie.com` y `especie.sci`.
 * 2) Busca en `algasComunes` y `algasCientificas`.
 *
 * Dependencias externas:
 * - `algasComunes`, `algasCientificas`, `normalizarClave`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a `null/undefined`.
 *
 * @example
 * esEspecieAlga({ com: 'Cochayuyo' }) // true
 *
 * Notas de mantenimiento:
 * - Ajustar listas si se agregan nuevas algas o alias.
 */
function esEspecieAlga(especie) {
  return algasComunes.has(normalizarClave(especie?.com)) || algasCientificas.has(normalizarClave(especie?.sci))
}

/**
 * Pestaña de ingreso de muestras Peso-Longitud (y variantes L o D) para un bote.
 *
 * @param {object} props - Props del componente.
 * @param {object} props.operacion - Operación actual (contiene `id`).
 * @param {object} props.bote - Bote actual (contiene `id`, `lpMuestras`, etc.).
 * @param {Array<object>} props.especies - Catálogo de especies para resolver labels.
 * @param {(opId: string, updater: (cur: any) => any) => void} props.actualizarOperacion - Actualiza la operación (inmutable).
 * @param {boolean} props.puedeEscribir - Si `false`, bloquea modificaciones.
 * @param {(msg: string, color?: string) => void} props.mostrarToast - Notificaciones UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.abrirModal - Abre un modal.
 * @param {() => void} props.cerrarModal - Cierra el modal.
 * @param {object|null} [props.saltoLp] - Señal opcional para abrir automáticamente una especie y hacer foco en una muestra.
 * @returns {import('react').JSX.Element} Elemento React de la pestaña.
 *
 * Lógica:
 * 1) Ordena especies y crea `especiePorId` para lookup.
 * 2) Deriva especies habilitadas para muestreo desde `bote.lpMuestras`.
 * 3) Permite seleccionar especies (y tipo LP/L) mediante un modal.
 * 4) Permite ingresar/editar/eliminar muestras por especie y tipo (LP/L/D) en un modal.
 * 5) Consume `saltoLp` para saltar a una especie/muestra específica (integración con previsualización EVADIR).
 *
 * Dependencias externas:
 * - [lpMuestrasService](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/lpMuestrasService.js): `addSample`, `updateSample`, `removeSample`, `ensureKind`, `removeKind`, `removeEspecie`.
 * - [GrillaEspecies](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/common/SpeciesGrid.jsx).
 * - React hooks: `useMemo`, `useState`, `useEffect`, `useRef`.
 *
 * Efectos secundarios:
 * - Abre modales (UI).
 * - Actualiza operación/bote (estado global).
 * - Despacha eventos CustomEvent para confirmar consumo de `saltoLp`.
 *
 * Manejo de errores:
 * - Bloquea modificaciones si `puedeEscribir` es false.
 * - Usa `try/catch` al despachar eventos (por seguridad en entornos restringidos).
 *
 * @example
 * <PestanaLp operacion={operacion} bote={b} especies={db.especies} actualizarOperacion={actualizarOperacion} puedeEscribir={puedeEscribir} mostrarToast={mostrarToast} abrirModal={abrirModal} cerrarModal={cerrarModal} saltoLp={saltoLp} />
 *
 * Notas de mantenimiento:
 * - Mantener compatibilidad de `lpMuestras` vía `normalizarEntrada`.
 * - Mantener la detección de algas consistente con reglas de negocio.
 */
export default function PestanaLp({ operacion, bote, especies, actualizarOperacion, puedeEscribir, mostrarToast, abrirModal, cerrarModal, saltoLp }) {
  const especiesOrdenadas = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.slice().sort((a, b) => String(a?.com || '').localeCompare(String(b?.com || '')))
  }, [especies])

  const especiePorId = useMemo(() => {
    const m = new Map()
    ;(Array.isArray(especies) ? especies : []).forEach((e) => m.set(Number(e.id), e))
    return m
  }, [especies])

  const mapaLpMuestras = bote?.lpMuestras && typeof bote.lpMuestras === 'object' ? bote.lpMuestras : {}
  const idsEspecies = Object.keys(mapaLpMuestras)
    .map(Number)
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b)
  const primerIdNoAlga = idsEspecies.find((id) => {
    const especie = especiePorId.get(Number(id))
    return !esEspecieAlga(especie)
  })

  /**
   * Abre un modal para seleccionar especies habilitadas para muestreo (y tipo LP/L).
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Si no hay permisos de escritura, muestra toast y sale.
   * 2) Renderiza un Cuerpo interno con `GrillaEspecies` y configuraciones por especie.
   * 3) Al confirmar:
   *    - Elimina especies removidas (con confirmación).
   *    - Asegura/quita kinds (LP/L o D para algas) usando helpers del servicio.
   *    - Actualiza `bote.lpMuestras` a través de `actualizarOperacion`.
   *
   * Dependencias externas:
   * - `abrirModal/cerrarModal` (UI).
   * - `ensureKind`, `removeKind`, `removeEspecie` (servicio).
   *
   * Efectos secundarios:
   * - Abre un modal y puede modificar datos del bote.
   *
   * Manejo de errores:
   * - No captura errores del store; asume que el update es sincrónico y estable.
   *
   * @example
   * <button onClick={abrirSeleccionarEspecies}>Seleccionar especies</button>
   *
   * Notas de mantenimiento:
   * - Si se agregan nuevos kinds, extender la UI de configuración.
   */
  const abrirSeleccionarEspecies = () => {
    if (!puedeEscribir) {
      mostrarToast('Modo solo lectura', 'blue')
      return
    }
    /**
     * Cuerpo del modal “Seleccionar especies” para configurar qué se muestrea en el bote.
     *
     * @returns {import('react').JSX.Element} UI del modal con selección de especies y configuración de kinds.
     *
     * Lógica:
     * 1) Inicializa selección con especies actuales (`idsEspecies`) y construye una config `tiposPorIdEspecie`.
     * 2) Permite agregar/quitar especies con `GrillaEspecies`.
     * 3) Para no-algas, permite habilitar LP y/o L (deshabilita toggles si ya hay muestras).
     * 4) Al confirmar, aplica cambios a `bote.lpMuestras` (ensure/remove) y elimina especies removidas (con confirmación).
     *
     * Dependencias externas:
     * - `GrillaEspecies` (UI).
     * - Helpers de `lpMuestrasService`: `ensureKind`, `removeKind`, `removeEspecie`.
     *
     * Efectos secundarios:
     * - Actualiza estado global de la operación/bote vía `actualizarOperacion`.
     *
     * Manejo de errores:
     * - No captura errores del store; se asume actualización exitosa.
     *
     * @example
     * abrirModal('Especies a muestrear...', <Cuerpo />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener reglas de algas (forzar D) consistentes con `esEspecieAlga`.
     */
    const Cuerpo = () => {
      const idsIniciales = idsEspecies
      const [idsSeleccionados, establecerIdsSeleccionados] = useState(() => idsIniciales.slice())
      const [tiposPorIdEspecie, establecerTiposPorIdEspecie] = useState(() => {
        const salida = {}
        idsIniciales.forEach((id) => {
          const especie = especiePorId.get(Number(id))
          const esAlga = esEspecieAlga(especie)
          const entrada = normalizarEntrada(mapaLpMuestras?.[id])
          if (esAlga) salida[id] = { D: true }
          else {
            const tieneLP = Object.prototype.hasOwnProperty.call(entrada, 'LP')
            const tieneL = Object.prototype.hasOwnProperty.call(entrada, 'L')
            salida[id] = { LP: tieneLP || (!tieneLP && !tieneL), L: tieneL }
          }
        })
        return salida
      })

      const conjuntoPrevio = new Set(idsIniciales.map(Number))
      const conjuntoSiguiente = new Set((Array.isArray(idsSeleccionados) ? idsSeleccionados : []).map(Number).filter((x) => Number.isFinite(x)))
      const idsQuitados = [...conjuntoPrevio].filter((x) => !conjuntoSiguiente.has(x))

      const idsSeleccionadosOrdenados = [...conjuntoSiguiente].sort((a, b) => a - b)
      const primerIdNoAlga = idsSeleccionadosOrdenados.find((id) => {
        const especie = especiePorId.get(Number(id))
        return !esEspecieAlga(especie)
      })

      return (
        <div data-tutorial-id="ops-lp-select-modal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box blue">
            <span>i</span>
            <div>
              Selecciona las especies a muestrear en este bote. Para algas, el ingreso será por <strong>diámetro del disco</strong>.
            </div>
          </div>

          <div data-tutorial-id="ops-lp-species-grid">
            <GrillaEspecies
              especies={especiesOrdenadas}
              selectedIds={idsSeleccionados}
              onChange={(ids) => {
              const siguientes = (Array.isArray(ids) ? ids : []).map(Number).filter((x) => Number.isFinite(x))
              establecerIdsSeleccionados(siguientes)
              establecerTiposPorIdEspecie((prev) => {
                const salida = {}
                siguientes.forEach((id) => {
                  const configuracionPrevia = prev?.[id]
                  if (configuracionPrevia) {
                    salida[id] = configuracionPrevia
                    return
                  }
                  const especie = especiePorId.get(Number(id))
                  const esAlga = esEspecieAlga(especie)
                  const entrada = normalizarEntrada(mapaLpMuestras?.[id])
                  if (esAlga) {
                    salida[id] = { D: true }
                  } else {
                    const tieneLP = Object.prototype.hasOwnProperty.call(entrada, 'LP')
                    const tieneL = Object.prototype.hasOwnProperty.call(entrada, 'L')
                    salida[id] = { LP: tieneLP || (!tieneLP && !tieneL), L: tieneL }
                  }
                })
                return salida
              })
              }}
              multi
              columns={3}
              maxHeight={320}
            />
          </div>

          {idsSeleccionadosOrdenados.length ? (
            <div data-tutorial-id="ops-lp-kinds" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
              <div
                data-tutorial-id="ops-lp-kinds-title"
                style={{ fontFamily: 'var(--ff-d)', fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}
              >
                Tipos de muestreo por especie
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {idsSeleccionadosOrdenados.map((idEspecie) => {
                  const especie = especiePorId.get(Number(idEspecie))
                  const esAlga = esEspecieAlga(especie)
                  const entrada = normalizarEntrada(mapaLpMuestras?.[idEspecie])
                  const cantidadLP = Array.isArray(entrada.LP) ? entrada.LP.length : 0
                  const cantidadL = Array.isArray(entrada.L) ? entrada.L.length : 0
                  const configuracion = tiposPorIdEspecie?.[idEspecie] || (esAlga ? { D: true } : { LP: true, L: false })
                  return (
                    <div key={idEspecie} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong>{especie?.com || idEspecie}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{especie?.sci || ''}</div>
                      </div>
                      {esAlga ? (
                        <div style={{ whiteSpace: 'nowrap', color: 'var(--text2)' }}>D</div>
                      ) : (
                        <div
                          data-tutorial-id={Number(idEspecie) === Number(primerIdNoAlga) ? 'ops-lp-kind-checkboxes' : undefined}
                          style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
                        >
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!configuracion.LP}
                              disabled={cantidadLP > 0}
                              onChange={(e) => {
                                const estaMarcado = e.target.checked
                                establecerTiposPorIdEspecie((prev) => {
                                  const configuracionActual = prev?.[idEspecie] || { LP: true, L: false }
                                  const configuracionSiguiente = { ...configuracionActual, LP: estaMarcado }
                                  if (!configuracionSiguiente.LP && !configuracionSiguiente.L) configuracionSiguiente.LP = true
                                  return { ...(prev || {}), [idEspecie]: configuracionSiguiente }
                                })
                              }}
                            />
                            L-P{cantidadLP ? ` (${cantidadLP})` : ''}
                          </label>
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!configuracion.L}
                              disabled={cantidadL > 0}
                              data-tutorial-id={Number(idEspecie) === Number(primerIdNoAlga) ? 'ops-lp-kind-L' : undefined}
                              data-tutorial-advance={Number(idEspecie) === Number(primerIdNoAlga) ? 'true' : undefined}
                              onChange={(e) => {
                                const estaMarcado = e.target.checked
                                if (Number(idEspecie) === Number(primerIdNoAlga) && estaMarcado) {
                                  window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-lp-kind-L-checked' } }))
                                }
                                establecerTiposPorIdEspecie((prev) => {
                                  const configuracionActual = prev?.[idEspecie] || { LP: true, L: false }
                                  const configuracionSiguiente = { ...configuracionActual, L: estaMarcado }
                                  if (!configuracionSiguiente.LP && !configuracionSiguiente.L) configuracionSiguiente.LP = true
                                  return { ...(prev || {}), [idEspecie]: configuracionSiguiente }
                                })
                              }}
                            />
                            L{cantidadL ? ` (${cantidadL})` : ''}
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
            <button className="btn b-out" style={{ flex: 1 }} onClick={cerrarModal}>
              Cancelar
            </button>
            <button
              className="btn b-teal"
              style={{ flex: 1 }}
              data-tutorial-id="ops-lp-confirm"
              onClick={() => {
                if (idsQuitados.length) {
                  const ok = confirm(
                    `Vas a quitar ${idsQuitados.length} especie(s) del muestreo. Se eliminarán sus muestras L-P/D asociadas. ¿Continuar?`,
                  )
                  if (!ok) return
                }
                actualizarOperacion(operacion.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    let mapaLpMuestras = x.lpMuestras || {}
                    idsQuitados.forEach((id) => {
                      mapaLpMuestras = eliminarEspecie(mapaLpMuestras, id)
                    })
                    ;[...conjuntoSiguiente].forEach((id) => {
                      const especie = especiePorId.get(Number(id))
                      const esAlga = esEspecieAlga(especie)
                      if (esAlga) {
                        mapaLpMuestras = asegurarTipo(mapaLpMuestras, id, 'D')
                        return
                      }
                      const configuracion = tiposPorIdEspecie?.[id] || { LP: true, L: false }
                      if (configuracion.LP) mapaLpMuestras = asegurarTipo(mapaLpMuestras, id, 'LP')
                      else mapaLpMuestras = eliminarTipo(mapaLpMuestras, id, 'LP')
                      if (configuracion.L) mapaLpMuestras = asegurarTipo(mapaLpMuestras, id, 'L')
                      else mapaLpMuestras = eliminarTipo(mapaLpMuestras, id, 'L')
                    })
                    return { ...x, lpMuestras: mapaLpMuestras }
                  })
                  return { ...cur, botes: nextBotes }
                })
                cerrarModal()
                mostrarToast?.('Especies actualizadas', 'green')
                window.dispatchEvent(new CustomEvent('bitecma:tutorial:trigger', { detail: { id: 'ops-lp-confirmed' } }))
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )
    }
    abrirModal(`Especies a muestrear (L-P) — Bote ${bote?.nombre || bote?.id}`, <Cuerpo />, 'wide')
  }

  /**
   * Abre un modal de ingreso/edición de muestras para una especie y tipo de muestreo.
   *
   * @param {string|number} especieId - ID de especie a editar.
   * @param {unknown} tipoForzado - Tipo deseado (LP/L/D o alias).
   * @param {object} [enfoque] - Datos opcionales para enfocar/resaltar una muestra específica (integración con `saltoLp`).
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Valida permisos y resuelve especie desde `especiePorId`.
   * 2) Normaliza el tipo (`tipoMuestreo`).
   * 3) Renderiza un Cuerpo interno:
   *    - Carga muestras actuales (`normalizarEntrada`).
   *    - Permite agregar o editar una fila (draft + editIdx).
   *    - Permite eliminar una fila.
   *    - (Opcional) resalta/scroll a muestra si `focus` coincide.
   * 4) Persiste cambios en `bote.lpMuestras` usando `actualizarOperacion` + helpers del servicio.
   *
   * Dependencias externas:
   * - `abrirModal`, `cerrarModal`, `mostrarToast`.
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
   * abrirIngreso(12, 'LP')
   *
   * Notas de mantenimiento:
   * - Mantener el matching de `focus` (tolerancia, índice) consistente con el emisor.
   */
  const abrirIngreso = useCallback((especieId, tipoForzado, enfoque) => {
    if (!puedeEscribir) {
      mostrarToast('Modo solo lectura', 'blue')
      return
    }
    const idEspecie = Number(especieId)
    const especie = especiePorId.get(idEspecie)
    const tipoMuestreo = normalizarTipo(tipoForzado)

    /**
     * Cuerpo del modal de ingreso de muestras para una especie y tipo.
     *
     * @returns {import('react').JSX.Element} UI del modal (formulario de ingreso + tabla de muestras).
     *
     * Lógica:
     * 1) Carga y mantiene en estado local las muestras de la especie (`samplesNow`) para feedback inmediato.
     * 2) Permite agregar/editar mediante un “draft” y un índice de edición (`editIdx`).
     * 3) Al guardar, persiste en el store con `actualizarOperacion` y sincroniza `muestrasActuales`.
     * 4) Si llega `focus`, resalta y scrollea a una muestra (solo para LP).
     *
     * Dependencias externas:
     * - `actualizarOperacion` y helpers de `lpMuestrasService` (`agregarMuestra`, `actualizarMuestra`, `eliminarMuestra`).
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
     * abrirModal('Especie', <Cuerpo />, 'wide')
     *
     * Notas de mantenimiento:
     * - Mantener tolerancia (`tol`) alineada con el emisor de `focus`.
     */
    const Cuerpo = () => {
      const entrada = normalizarEntrada((bote?.lpMuestras || {})[idEspecie])
      const muestrasIniciales = entrada?.[tipoMuestreo] || []
      const [muestrasActuales, establecerMuestrasActuales] = useState(() => (Array.isArray(muestrasIniciales) ? muestrasIniciales : []))
      const tipo = tipoMuestreo
      const [indiceDestello, establecerIndiceDestello] = useState(null)

      const [borrador, establecerBorrador] = useState(() =>
        tipo === 'LP' ? { l: '', p: '' } : tipo === 'D' ? { d: '' } : { l: '' },
      )
      const [indiceEdicion, establecerIndiceEdicion] = useState(null)
      const referenciaLongitud = useRef(null)
      const referenciaPeso = useRef(null)
      const referenciaDiametro = useRef(null)
      const enfoqueRef = useRef(enfoque)

      useEffect(() => {
        const f = enfoqueRef.current
        const token = f?.token ?? null
        if (!token) return
        if (tipo !== 'LP') return
        const tl = Number(f?.l)
        const tp = Number(f?.p)
        if (!Number.isFinite(tl) || !Number.isFinite(tp)) return
        const tol = 1e-9
        let targetIdx = Number.isFinite(Number(f?.sampleIdx)) ? Number(f.sampleIdx) : null
        if (targetIdx == null) {
          for (let i = 0; i < muestrasActuales.length; i++) {
            const m = muestrasActuales[i]
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
        establecerIndiceDestello(targetIdx)
        setTimeout(() => {
          const el = document.querySelector(`[data-lp-sample-idx="${targetIdx}"]`)
          if (!el) return
          let scroller = el.parentElement
          while (scroller && scroller !== document.body && scroller !== document.documentElement) {
            const cs = window.getComputedStyle(scroller)
            const canY = /(auto|scroll)/.test(cs.overflowY)
            if (canY && scroller.scrollHeight > scroller.clientHeight + 2) break
            scroller = scroller.parentElement
          }
          if (scroller && scroller !== document.body && scroller !== document.documentElement) {
            const scRect = scroller.getBoundingClientRect()
            const tRect = el.getBoundingClientRect()
            const centerOffset = scRect.height / 2 - tRect.height / 2
            const top = scroller.scrollTop + (tRect.top - scRect.top) - centerOffset
            if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
            else scroller.scrollTop = Math.max(0, top)
          } else {
            el.scrollIntoView?.({ block: 'center' })
          }
        }, 0)
        const t = setTimeout(() => establecerIndiceDestello(null), 2600)
        return () => clearTimeout(t)
      }, [tipo, muestrasActuales])

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
       * - `actualizarOperacion` (store) y helpers `agregarMuestra/actualizarMuestra`.
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
      const agregarOActualizar = () => {
        if (tipo === 'LP') {
          const l = borrador.l
          const p = borrador.p
          actualizarOperacion(operacion.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const mapaLpMuestras = x.lpMuestras || {}
              const siguiente =
                indiceEdicion == null
                  ? agregarMuestra(mapaLpMuestras, idEspecie, tipo, { l, p })
                  : actualizarMuestra(mapaLpMuestras, idEspecie, tipo, indiceEdicion, { l, p })
              return { ...x, lpMuestras: siguiente }
            })
            return { ...cur, botes: nextBotes }
          })
          establecerMuestrasActuales((prev) => {
            const siguiente = prev.slice()
            if (indiceEdicion == null) siguiente.push({ l, p })
            else siguiente[indiceEdicion] = { l, p }
            return siguiente
          })
        } else if (tipo === 'D') {
          const d = borrador.d
          actualizarOperacion(operacion.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const mapaLpMuestras = x.lpMuestras || {}
              const siguiente =
                indiceEdicion == null
                  ? agregarMuestra(mapaLpMuestras, idEspecie, tipo, { d })
                  : actualizarMuestra(mapaLpMuestras, idEspecie, tipo, indiceEdicion, { d })
              return { ...x, lpMuestras: siguiente }
            })
            return { ...cur, botes: nextBotes }
          })
          establecerMuestrasActuales((prev) => {
            const siguiente = prev.slice()
            if (indiceEdicion == null) siguiente.push({ d })
            else siguiente[indiceEdicion] = { d }
            return siguiente
          })
        } else {
          const l = borrador.l
          actualizarOperacion(operacion.id, (cur) => {
            const nextBotes = (cur.botes || []).map((x) => {
              if (x.id !== bote.id) return x
              const mapaLpMuestras = x.lpMuestras || {}
              const siguiente =
                indiceEdicion == null
                  ? agregarMuestra(mapaLpMuestras, idEspecie, tipo, { l })
                  : actualizarMuestra(mapaLpMuestras, idEspecie, tipo, indiceEdicion, { l })
              return { ...x, lpMuestras: siguiente }
            })
            return { ...cur, botes: nextBotes }
          })
          establecerMuestrasActuales((prev) => {
            const siguiente = prev.slice()
            if (indiceEdicion == null) siguiente.push({ l })
            else siguiente[indiceEdicion] = { l }
            return siguiente
          })
        }
        establecerBorrador(tipo === 'LP' ? { l: '', p: '' } : tipo === 'D' ? { d: '' } : { l: '' })
        establecerIndiceEdicion(null)
        setTimeout(() => {
          if (tipo === 'LP') {
            referenciaLongitud.current?.focus?.()
            referenciaLongitud.current?.select?.()
          } else if (tipo === 'D') {
            referenciaDiametro.current?.focus?.()
            referenciaDiametro.current?.select?.()
          } else {
            referenciaLongitud.current?.focus?.()
            referenciaLongitud.current?.select?.()
          }
        }, 0)
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box blue">
            <span>i</span>
            <div>
              <strong>{especie?.com || idEspecie}</strong> ·{' '}
              {tipo === 'LP' ? 'Peso-Longitud' : tipo === 'D' ? 'Diámetro disco' : 'Longitud'}
            </div>
          </div>

          <div className="lp-input-row" data-tutorial-id="ops-lp-input-row">
            {tipo === 'LP' ? (
              <>
                <div className="ig">
                  <label className="il">Longitud (mm)</label>
                  <input
                    className="ii lp-num-inp"
                    ref={referenciaLongitud}
                    type="number"
                    step="any"
                    value={borrador.l}
                    data-tutorial-id="ops-lp-inp-l"
                    onChange={(e) => establecerBorrador((s) => ({ ...s, l: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      referenciaPeso.current?.focus?.()
                      referenciaPeso.current?.select?.()
                    }}
                  />
                </div>
                <div className="ig">
                  <label className="il">Peso (g)</label>
                  <input
                    className="ii lp-num-inp"
                    ref={referenciaPeso}
                    type="number"
                    step="any"
                    value={borrador.p}
                    data-tutorial-id="ops-lp-inp-p"
                    onChange={(e) => establecerBorrador((s) => ({ ...s, p: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      agregarOActualizar()
                    }}
                  />
                </div>
              </>
            ) : tipo === 'D' ? (
              <div className="ig">
                <label className="il">Diámetro disco (cm)</label>
                <input
                  className="ii lp-num-inp"
                  ref={referenciaDiametro}
                  type="number"
                  step="any"
                  value={borrador.d}
                  onChange={(e) => establecerBorrador((s) => ({ ...s, d: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    agregarOActualizar()
                  }}
                />
              </div>
            ) : (
              <div className="ig">
                <label className="il">Longitud (mm)</label>
                <input
                  className="ii lp-num-inp"
                  ref={referenciaLongitud}
                  type="number"
                  step="any"
                  value={borrador.l}
                  data-tutorial-id="ops-lp-inp-l-only"
                  onChange={(e) => establecerBorrador((s) => ({ ...s, l: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    agregarOActualizar()
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <div className="lp-counter">{muestrasActuales.length} muestra(s)</div>
              <button
                className="btn b-teal b-sm"
                data-tutorial-id="ops-lp-sample-save"
                data-tutorial-advance="true"
                onClick={agregarOActualizar}
              >
                {indiceEdicion == null ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 280, border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="tbl lp-tbl tbl-static-mobile">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{tipo === 'D' ? 'D (cm)' : 'L (mm)'}</th>
                  {tipo === 'LP' ? <th>P (g)</th> : null}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {muestrasActuales.length ? (
                  muestrasActuales
                    .map((m, idx) => ({ m, idx }))
                    .reverse()
                    .map(({ m, idx }, displayIdx) => (
                    <tr
                      key={idx}
                      data-lp-sample-idx={idx}
                      data-tutorial-id={displayIdx === 0 ? 'ops-lp-sample-row' : undefined}
                      className={idx === indiceDestello ? 'lp-flash' : ''}
                    >
                      <td>{muestrasActuales.length - displayIdx}</td>
                      <td>{tipo === 'D' ? m?.d ?? '' : m?.l ?? ''}</td>
                      {tipo === 'LP' ? <td>{m?.p ?? ''}</td> : null}
                      <td style={{ textAlign: 'right' }}>
                        <div className="lp-samples-actions">
                          <button
                            className="btn b-out b-sm"
                            onClick={() => {
                              establecerIndiceEdicion(idx)
                              establecerBorrador(
                                tipo === 'LP' ? { l: m?.l ?? '', p: m?.p ?? '' } : tipo === 'D' ? { d: m?.d ?? '' } : { l: m?.l ?? '' },
                              )
                              setTimeout(() => {
                                if (tipo === 'LP') {
                                  referenciaLongitud.current?.focus?.()
                                  referenciaLongitud.current?.select?.()
                                } else if (tipo === 'D') {
                                  referenciaDiametro.current?.focus?.()
                                  referenciaDiametro.current?.select?.()
                                } else {
                                  referenciaLongitud.current?.focus?.()
                                  referenciaLongitud.current?.select?.()
                                }
                              }, 0)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn b-out b-sm"
                            onClick={() => {
                              const label =
                                tipo === 'LP'
                                  ? `L=${String(m?.l ?? '—')} mm, P=${String(m?.p ?? '—')} g`
                                  : tipo === 'D'
                                    ? `D=${String(m?.d ?? '—')} cm`
                                    : `L=${String(m?.l ?? '—')} mm`
                              if (!confirm(`¿Eliminar esta muestra (${label})?`)) return
                              actualizarOperacion(operacion.id, (cur) => {
                                const nextBotes = (cur.botes || []).map((x) => {
                                  if (x.id !== bote.id) return x
                                  const mapaLpMuestras = x.lpMuestras || {}
                                  const siguiente = eliminarMuestra(mapaLpMuestras, idEspecie, tipo, idx)
                                  return { ...x, lpMuestras: siguiente }
                                })
                                return { ...cur, botes: nextBotes }
                              })
                              establecerMuestrasActuales((prev) => prev.filter((_, i) => i !== idx))
                              if (indiceEdicion === idx) {
                                establecerIndiceEdicion(null)
                                establecerBorrador(tipo === 'LP' ? { l: '', p: '' } : tipo === 'D' ? { d: '' } : { l: '' })
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={tipo === 'LP' ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text3)' }}>
                      Sin muestras
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn b-out" style={{ flex: 1 }} data-tutorial-id="ops-lp-sample-close" onClick={cerrarModal}>
              Cerrar
            </button>
            <button
              className="btn b-out"
              style={{ flex: 1, color: 'var(--red)' }}
              onClick={() => {
                if (!confirm(`Quitar especie ${especie?.com || idEspecie}?`)) return
                actualizarOperacion(operacion.id, (cur) => {
                  const nextBotes = (cur.botes || []).map((x) => {
                    if (x.id !== bote.id) return x
                    const siguiente = eliminarEspecie(x.lpMuestras, idEspecie)
                    return { ...x, lpMuestras: siguiente }
                  })
                  return { ...cur, botes: nextBotes }
                })
                cerrarModal()
                mostrarToast?.('Especie removida', 'green')
              }}
            >
              Quitar especie
            </button>
          </div>
        </div>
      )
    }

    abrirModal(`${especie?.com || idEspecie}`, <Cuerpo />, 'wide')
  }, [actualizarOperacion, abrirModal, bote, cerrarModal, especiePorId, mostrarToast, operacion?.id, puedeEscribir])

  useEffect(() => {
    const token = saltoLp?.token ?? null
    if (!token) return
    const idOperacion = String(saltoLp?.opId ?? '')
    if (!idOperacion || String(operacion?.id ?? '') !== idOperacion) return
    const idBote = saltoLp?.boteId != null && String(saltoLp.boteId) !== '' ? String(saltoLp.boteId) : null
    const coincideBote = idBote ? String(bote?.id ?? '') === idBote : true
    if (!coincideBote) return
    const idEspecie = Number(saltoLp?.especieId)
    const l = saltoLp?.l
    const p = saltoLp?.p
    if (!Number.isFinite(idEspecie)) return
    if (l == null || p == null) return
    abrirIngreso(idEspecie, 'LP', saltoLp)
    try {
      window.dispatchEvent(new CustomEvent('bitecma:lp-jump-consumed', { detail: { token } }))
    } catch {
      return
    }
  }, [saltoLp, operacion?.id, bote?.id, abrirIngreso])

  return (
    <div data-tutorial-id="ops-lp-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--ff-d)', fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Peso-Longitud</div>
        <button className="btn b-teal b-sm" data-tutorial-id="ops-lp-select-btn" onClick={abrirSeleccionarEspecies}>
          Seleccionar especies
        </button>
      </div>

      {idsEspecies.length === 0 ? (
        <div className="info-box amber">
          <span>i</span>
          <div>Sin especies para muestreo. Agrega una especie para ingresar muestras.</div>
        </div>
      ) : (
        <div className="lp-species-wrap" data-tutorial-id="ops-lp-species-table">
          <table className="tbl tbl-static-mobile lp-species-tbl">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Especie</th>
                <th>Muestras</th>
                <th>Tipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {idsEspecies.flatMap((idEspecie) => {
                const especie = especiePorId.get(Number(idEspecie))
                const entrada = normalizarEntrada(mapaLpMuestras?.[idEspecie])
                const esAlga = esEspecieAlga(especie)
                const tiposMuestreo = esAlga ? ['D'] : ['LP', 'L']
                const tiposVisibles = tiposMuestreo.filter((tipo) => Object.prototype.hasOwnProperty.call(entrada, tipo))
                return tiposVisibles.map((tipo) => {
                  const muestras = entrada?.[tipo] || []
                  const cantidad = Array.isArray(muestras) ? muestras.length : 0
                  const cantidadLP = Array.isArray(entrada?.LP) ? entrada.LP.length : 0
                  const textoMuestras =
                    tipo === 'L' && cantidadLP > 0 ? (cantidad > 0 ? `${cantidad} + ${cantidadLP}` : String(cantidadLP)) : String(cantidad)
                  return (
                    <tr
                      key={`${idEspecie}-${tipo}`}
                      data-tutorial-id={Number(idEspecie) === Number(primerIdNoAlga) && tipo === 'L' ? 'ops-lp-row-L' : undefined}
                    >
                      <td style={{ textAlign: 'left' }}>
                        <strong>{especie?.com || idEspecie}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{especie?.sci || ''}</div>
                      </td>
                      <td>{textoMuestras}</td>
                      <td>{tipo === 'LP' ? 'L-P' : tipo}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="lp-species-action">
                          <button
                            className="btn b-teal b-sm"
                            data-tutorial-id={
                              Number(idEspecie) === Number(primerIdNoAlga) && tipo === 'LP'
                                ? 'ops-lp-ingresar'
                                : Number(idEspecie) === Number(primerIdNoAlga) && tipo === 'L'
                                  ? 'ops-lp-ingresar-L'
                                  : undefined
                            }
                            data-tutorial-advance={
                              Number(idEspecie) === Number(primerIdNoAlga) && tipo === 'LP'
                                ? 'true'
                                : Number(idEspecie) === Number(primerIdNoAlga) && tipo === 'L'
                                  ? 'true'
                                  : undefined
                            }
                            onClick={() => abrirIngreso(idEspecie, tipo)}
                          >
                            Ingresar
                          </button>
                        </div>
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
