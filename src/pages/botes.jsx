import { useEffect, useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { useUi } from '../context/uiContext.jsx'

/**
 * Página de administración de botes/embarcaciones (maestro) agrupados por región.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la página está activa (habilita carga inicial).
 * @returns {import('react').JSX.Element} Elemento React de la página Botes.
 *
 * Lógica (alto nivel):
 * 1) Al activarse, solicita la carga de regiones y del maestro de botes desde el contexto DB.
 * 2) Mantiene filtros locales:
 *    - región seleccionada (romano),
 *    - texto de búsqueda.
 * 3) Deriva `botesFiltrados` por región + query y limita el tamaño para performance.
 * 4) Permite agregar un bote nuevo mediante un modal con formulario y persistencia en DB/API.
 *
 * Dependencias externas:
 * - `useDb`: `db`, `ensureRegionesLoaded`, `ensureBotesMaestroLoaded`, `upsertBoteMaestro`.
 * - `useUi`: `openModal`, `closeModal`, `toast`.
 *
 * Efectos secundarios:
 * - Dispara cargas (regiones y maestro de botes) al activarse.
 * - Puede persistir un bote nuevo (según implementación de `upsertBoteMaestro`).
 * - Abre/cierra modales.
 *
 * Manejo de errores:
 * - En guardado de bote, captura excepciones y muestra toast rojo.
 *
 * @example
 * <BotesPage active={page === 'botes'} />
 *
 * Notas de mantenimiento:
 * - Mantener consistentes los campos del payload (`region_rom`, `nrpa`, etc.) con el backend.
 * - Si crece el maestro, considerar paginación/virtualización (hoy se limita a 2000 filas).
 */
export default function BotesPage({ active }) {
  const { db, ensureRegionesLoaded, ensureBotesMaestroLoaded, upsertBoteMaestro } = useDb()
  const { openModal, closeModal, toast } = useUi()

  useEffect(() => {
    if (!active) return
    ensureRegionesLoaded?.()
    ensureBotesMaestroLoaded?.()
  }, [active, ensureRegionesLoaded, ensureBotesMaestroLoaded])
  const regiones = useMemo(() => {
    const arr = db?.regionesChile
    return Array.isArray(arr) ? arr : []
  }, [db?.regionesChile])
  const botes = useMemo(() => {
    const arr = db?.botesMaestro
    return Array.isArray(arr) ? arr : []
  }, [db?.botesMaestro])
  const caletasByRegion = useMemo(() => db?.caletasByRegionStatic || {}, [db?.caletasByRegionStatic])

  const [regionRom, setRegionRom] = useState(regiones[0]?.rom || 'I')
  const [q, setQ] = useState('')
  const botesFiltrados = useMemo(() => {
    const query = String(q || '').toLowerCase().trim()
    return botes
      .filter((b) => String(b.region || '') === String(regionRom || ''))
      .filter((b) =>
        !query
          ? true
          : String(b.nombre || '').toLowerCase().includes(query) ||
            String(b.caleta || '').toLowerCase().includes(query) ||
            String(b.nrpa || '').toLowerCase().includes(query) ||
            String(b.nmatricula || '').toLowerCase().includes(query),
      )
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
      .slice(0, 2000)
  }, [botes, regionRom, q])

  /**
   * Abre un modal para crear un bote nuevo en el maestro.
   *
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Determina región y caletas iniciales según selección actual.
   * 2) Define un Body interno con estado de formulario.
   * 3) Valida nombre y caleta.
   * 4) Construye payload normalizado (uppercase en nombre/caleta) y llama `upsertBoteMaestro`.
   * 5) Notifica por toast y cierra el modal en éxito.
   *
   * Dependencias externas:
   * - `openModal/closeModal`, `toast`.
   * - `upsertBoteMaestro` (persistencia).
   * - `caletasByRegion` (catálogo estático).
   *
   * Efectos secundarios:
   * - Abre/cierra modal.
   * - Puede persistir datos.
   *
   * Manejo de errores:
   * - Captura error de persistencia y muestra toast rojo.
   *
   * @example
   * <button onClick={openAddBoteModal}>Agregar</button>
   *
   * Notas de mantenimiento:
   * - Si cambian caletas/regiones, asegurar que `caletasByRegionStatic` siga cubriendo casos.
   */
  const openAddBoteModal = () => {
    const regionSel = regiones.find((r) => r.rom === regionRom)
    const initialRegion = regionSel?.rom || regiones[0]?.rom || 'I'
    const initialCaletas = caletasByRegion[initialRegion] || []

    /**
     * Cuerpo del modal “Agregar Nuevo Bote”.
     *
     * @returns {import('react').JSX.Element} Formulario de creación de bote.
     *
     * Lógica:
     * 1) Mantiene estado `form` (región, nombre, RPA, matrícula, caleta).
     * 2) Ajusta caletas disponibles al cambiar región (y setea una caleta por defecto).
     * 3) Valida campos obligatorios y ejecuta `onSave`.
     *
     * Dependencias externas:
     * - `upsertBoteMaestro`, `toast`, `closeModal`, `caletasByRegion`.
     *
     * Efectos secundarios:
     * - Persistencia (al guardar) y cierre de modal.
     *
     * Manejo de errores:
     * - `onSave` captura error de persistencia.
     *
     * @example
     * openModal('Agregar Nuevo Bote', <Body />, 'normal')
     *
     * Notas de mantenimiento:
     * - Mantener normalización (uppercase/trim) para homogeneidad del maestro.
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
       * Valida el formulario y persiste el bote en el maestro.
       *
       * @returns {Promise<void>} Promesa que resuelve al finalizar el guardado.
       *
       * Lógica:
       * 1) Valida `nombre` y `caleta`.
       * 2) Construye payload normalizado:
       *    - `nombre` y `caleta` en mayúsculas,
       *    - `nrpa` y `nmatricula` con trim.
       * 3) Ejecuta `upsertBoteMaestro(newBote)`.
       * 4) Notifica y cierra modal en éxito.
       *
       * Dependencias externas:
       * - `upsertBoteMaestro`, `toast`, `closeModal`.
       *
       * Efectos secundarios:
       * - Persistencia y UI (toasts/cierre).
       *
       * Manejo de errores:
       * - Captura excepción y muestra toast rojo.
       *
       * @example
       * <button onClick={onSave}>Guardar</button>
       *
       * Notas de mantenimiento:
       * - Validación fuerte y unicidad deben ser responsabilidad del backend.
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
          caleta: form.caleta.toUpperCase().trim(),
        }

        try {
          await upsertBoteMaestro(newBote)
          toast('Bote agregado correctamente', 'green')
          closeModal()
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

  return (
    <div className={`page${active ? ' active' : ''}`} id="pg-botes">
      <div className="ph">
        <div>
          <h2>Botes</h2>
          <p>Listado de botes y embarcaciones por región</p>
        </div>
      </div>
      <div className="admin-layout masters-layout" id="mb-layout">
        <div className="card region-combo">
          <div className="ig" style={{ marginBottom: 0 }}>
            <label className="il">Región</label>
            <select className="is" value={regionRom} onChange={(e) => setRegionRom(e.target.value)}>
              {regiones.map((r) => (
                <option key={r.id} value={r.rom}>
                  {r.rom} — {r.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card admin-menu region-menu" style={{ minHeight: 0, overflowY: 'auto' }}>
          {regiones.map((r) => (
            <div
              key={r.id}
              className={`admin-item ${regionRom === r.rom ? 'on' : ''}`}
              onClick={() => setRegionRom(r.rom)}
            >
              {r.rom} — {r.nom}
            </div>
          ))}
        </div>
        <div id="mb-right" style={{ minHeight: 0, display: 'flex' }}>
          <div className="card admin-content" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="masters-actions">
              <input className="flt" placeholder="Buscar bote..." value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn b-teal" onClick={openAddBoteModal}>
                Agregar
              </button>
            </div>
            <div className="masters-table">
              <table className="tbl tbl-static-mobile tbl-botes tbl-compact">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Caleta</th>
                    <th>NRPA</th>
                    <th>Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {botesFiltrados.length ? (
                    botesFiltrados.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span
                            className="bote-name"
                            role="button"
                            tabIndex={0}
                            onClick={() => toast(String(b.nombre || ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') toast(String(b.nombre || ''))
                            }}
                          >
                            <strong>{b.nombre}</strong>
                          </span>
                        </td>
                        <td>{b.caleta || '—'}</td>
                        <td>{b.nrpa || '—'}</td>
                        <td>{b.nmatricula || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 14 }}>Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
