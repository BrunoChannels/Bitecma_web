import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Select con búsqueda (typeahead) y dropdown controlado por estado local.
 *
 * Permite filtrar un set de opciones por texto, seleccionar un valor y (opcionalmente) ejecutar una acción "Agregar...".
 *
 * @param {object} props - Props del componente.
 * @param {string} [props.label] - Etiqueta visible sobre el input.
 * @param {string} [props.placeholder] - Texto placeholder cuando no hay selección.
 * @param {string|number|null} [props.value] - Valor actualmente seleccionado (controlado por el padre).
 * @param {Array<{ value: string|number, label: string }>} [props.options] - Opciones disponibles.
 * @param {(value: string|number, option: {value: string|number, label: string}) => void} [props.onChange] - Callback cuando se selecciona una opción.
 * @param {() => void} [props.onAdd] - Callback opcional para crear/agregar una opción nueva.
 * @param {string} [props.addLabel] - Texto del botón/ítem "Agregar...".
 * @param {boolean} [props.disabled] - Deshabilita interacción (focus, apertura y selección).
 * @returns {import('react').JSX.Element} Elemento React del select con búsqueda.
 *
 * Lógica:
 * 1) Normaliza `options` a un arreglo seguro y calcula `selected` según `value`.
 * 2) Mantiene `open` (dropdown abierto/cerrado) y `q` (texto de búsqueda).
 * 3) Deriva `filtered` según `q` (hasta 400 ítems para evitar listas enormes).
 * 4) Cierra el dropdown al hacer click fuera del contenedor (`wrapRef`).
 * 5) Al seleccionar un ítem: llama `onChange(value, option)`, cierra y limpia búsqueda.
 *
 * Dependencias externas:
 * - Hooks de React: `useState`, `useMemo`, `useEffect`, `useRef`.
 * - DOM: `document.addEventListener('mousedown', ...)` para detectar click fuera.
 *
 * Efectos secundarios:
 * - Agrega/remueve un listener global de `mousedown` mientras el componente está montado.
 *
 * Manejo de errores:
 * - No lanza; usa defensas (arrays seguros, optional chaining) para evitar fallos con props incompletas.
 *
 * @example
 * <SearchableSelect
 *   label="Región"
 *   value={regionId}
 *   options={regiones.map(r => ({ value: r.id, label: r.nom }))}
 *   onChange={(id) => setRegionId(id)}
 * />
 *
 * Notas de mantenimiento:
 * - Si el dataset crece, considerar virtualización; hoy se limita a 400 resultados.
 * - Mantener `onMouseDown(e.preventDefault())` en ítems para evitar pérdida de foco antes del click.
 */
export default function SeleccionBuscable({
  etiqueta,
  textoPlaceholder,
  valor,
  opciones,
  alCambiar,
  alAgregar,
  etiquetaAgregar,
  deshabilitado,
  idTutorial,
  avanzarTutorial,
}) {
  const [desplegableAbierto, establecerDesplegableAbierto] = useState(false)
  const [textoBusqueda, establecerTextoBusqueda] = useState('')
  const contenedorRef = useRef(null)

  const opcionesNormalizadas = useMemo(() => (Array.isArray(opciones) ? opciones : []), [opciones])
  const opcionSeleccionada = useMemo(
    () => opcionesNormalizadas.find((o) => String(o.value) === String(valor)) || null,
    [opcionesNormalizadas, valor],
  )

  /**
   * Abre el dropdown y resetea el texto de búsqueda al enfocar el input.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Si el componente está deshabilitado, no realiza acción.
   * 2) Abre el dropdown (`open = true`) y limpia la query (`q = ''`).
   *
   * Dependencias externas:
   * - `disabled`, `setOpen`, `setQ` (estado local).
   *
   * Efectos secundarios:
   * - Cambia estado local.
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
   * <input onFocus={handleFocus} />
   *
   * Notas de mantenimiento:
   * - Mantener el componente controlado para que el input muestre `selected.label` cuando está cerrado.
   */
  const alEnfocar = () => {
    if (deshabilitado) return
    establecerDesplegableAbierto(true)
    establecerTextoBusqueda('')
  }

  /**
   * Actualiza el texto de búsqueda y asegura el dropdown abierto mientras se escribe.
   *
   * @param {import('react').ChangeEvent<HTMLInputElement>} e - Evento de cambio del input.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Abre el dropdown.
   * 2) Setea `q` con el valor actual.
   *
   * Dependencias externas:
   * - `setOpen`, `setQ`.
   *
   * Efectos secundarios:
   * - Cambia estado local.
   *
   * @example
   * <input onChange={handleInputChange} />
   *
   * Notas de mantenimiento:
   * - Si se agrega debounce, hacerlo aquí para no recalcular `filtered` en cada tecla.
   */
  const alCambiarInput = (e) => {
    establecerDesplegableAbierto(true)
    establecerTextoBusqueda(e.target.value)
  }

  /**
   * Alterna la visibilidad del dropdown desde el botón ▾.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Si está deshabilitado, no hace nada.
   * 2) Invierte el estado `open`.
   * 3) Limpia `q` para mostrar opciones completas al abrir.
   *
   * Dependencias externas:
   * - `disabled`, `setOpen`, `setQ`.
   *
   * Efectos secundarios:
   * - Cambia estado local.
   *
   * @example
   * <button onClick={handleToggleOpen}>▾</button>
   *
   * Notas de mantenimiento:
   * - Mantener el botón `type="button"` para evitar submits no deseados dentro de forms.
   */
  const alternarDesplegable = () => {
    if (deshabilitado) return
    establecerDesplegableAbierto((v) => !v)
    establecerTextoBusqueda('')
  }

  /**
   * Ejecuta la acción opcional de “Agregar...” y cierra el dropdown.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Cierra dropdown y limpia query.
   * 2) Llama `onAdd()` si existe.
   *
   * Dependencias externas:
   * - `onAdd`.
   *
   * Efectos secundarios:
   * - Puede abrir un modal u otro flujo (dependiendo del padre).
   *
   * Manejo de errores:
   * - No captura errores del callback; se asume que el padre maneja fallos.
   *
   * @example
   * <div onClick={handleAdd}>Agregar...</div>
   *
   * Notas de mantenimiento:
   * - Mantener `onMouseDown(e.preventDefault())` en el elemento clickeable para evitar blur prematuro.
   */
  const ejecutarAgregar = () => {
    establecerDesplegableAbierto(false)
    establecerTextoBusqueda('')
    alAgregar()
  }

  /**
   * Selecciona una opción, notifica al padre y cierra el dropdown.
   *
   * @param {{ value: string|number, label: string }} o - Opción elegida.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Llama `onChange(value, option)` si existe.
   * 2) Cierra dropdown y limpia búsqueda.
   *
   * Dependencias externas:
   * - `onChange` (prop).
   *
   * Efectos secundarios:
   * - Cambia estado local y puede cambiar estado del padre (valor seleccionado).
   *
   * @example
   * handlePickOption({ value: 3, label: 'Región III' })
   *
   * Notas de mantenimiento:
   * - Se comparan valores como string para tolerar `number|string` en `value`.
   */
  const seleccionarOpcion = (o) => {
    alCambiar?.(o.value, o)
    establecerDesplegableAbierto(false)
    establecerTextoBusqueda('')
  }

  const opcionesFiltradas = useMemo(() => {
    const consulta = String(textoBusqueda || '').toLowerCase().trim()
    if (!consulta) return opcionesNormalizadas.slice(0, 400)
    return opcionesNormalizadas
      .filter((o) => String(o.label || '').toLowerCase().includes(consulta))
      .slice(0, 400)
  }, [opcionesNormalizadas, textoBusqueda])

  useEffect(() => {
    /**
     * Cierra el dropdown si el usuario hace click fuera del contenedor del componente.
     *
     * @param {MouseEvent} e - Evento global de mouse.
     * @returns {void} No retorna valor.
     *
     * Lógica:
     * 1) Si no hay referencia (`wrapRef.current`), no hace nada.
     * 2) Si el click ocurrió dentro del contenedor, no hace nada.
     * 3) Si ocurrió fuera, cierra el dropdown.
     *
     * Dependencias externas:
     * - `wrapRef` (ref al root).
     * - `setOpen` (estado local).
     *
     * Efectos secundarios:
     * - Modifica estado local.
     *
     * Manejo de errores:
     * - No aplica; validaciones defensivas evitan `null` deref.
     *
     * @example
     * document.addEventListener('mousedown', onDoc)
     *
     * Notas de mantenimiento:
     * - Mantener el listener en `mousedown` para cerrar antes del `click` y evitar estados intermedios.
     */
    const alMouseDownDocumento = (e) => {
      if (!contenedorRef.current) return
      if (contenedorRef.current.contains(e.target)) return
      establecerDesplegableAbierto(false)
    }
    document.addEventListener('mousedown', alMouseDownDocumento)
    return () => document.removeEventListener('mousedown', alMouseDownDocumento)
  }, [])

  return (
    <div
      className="ig"
      ref={contenedorRef}
      style={{ position: 'relative' }}
      data-tutorial-id={idTutorial}
      data-tutorial-advance={avanzarTutorial}
    >
      {etiqueta ? <label className="il">{etiqueta}</label> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="ii"
          disabled={!!deshabilitado}
          value={desplegableAbierto ? textoBusqueda : opcionSeleccionada?.label || ''}
          placeholder={textoPlaceholder || 'Selecciona...'}
          onFocus={alEnfocar}
          onChange={alCambiarInput}
        />
        <button
          type="button"
          className="btn b-out b-sm"
          disabled={!!deshabilitado}
          onClick={alternarDesplegable}
        >
          ▾
        </button>
      </div>

      {desplegableAbierto ? (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            top: etiqueta ? 54 : 40,
            left: 0,
            right: 0,
            background: 'var(--white)',
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow)',
            maxHeight: 280,
            overflow: 'auto',
          }}
        >
          {alAgregar ? (
            <div
              role="button"
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={ejecutarAgregar}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                color: 'var(--teal)',
                fontWeight: 800,
              }}
            >
              {etiquetaAgregar || 'Agregar...'}
            </div>
          ) : null}

          {opcionesFiltradas.length ? (
            opcionesFiltradas.map((o) => (
              <div
                key={String(o.value)}
                role="button"
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionarOpcion(o)}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  background: String(o.value) === String(valor) ? 'var(--teal-lt)' : 'transparent',
                }}
              >
                {o.label}
              </div>
            ))
          ) : (
            <div style={{ padding: '10px 12px', color: 'var(--text3)' }}>Sin resultados</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
