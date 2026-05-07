import { useMemo, useState } from 'react'

/**
 * Normaliza texto para comparación/búsqueda (minúsculas, sin acentos, trim).
 *
 * @param {unknown} v - Valor de entrada a normalizar (se convierte a string).
 * @returns {string} Texto normalizado, apto para comparaciones `includes`.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Pasa a minúsculas.
 * 3) Normaliza unicode y elimina diacríticos.
 * 4) Elimina espacios laterales.
 *
 * Dependencias externas:
 * - APIs estándar de string (`normalize`).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica; siempre retorna string.
 *
 * @example
 * const k = normText('Ácido'); // "acido"
 *
 * Notas de mantenimiento:
 * - Mantener consistente con otras normalizaciones del proyecto si se unifica en un helper común.
 */
function normText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Grid de selección de especies con filtro por texto y soporte multi/mono selección.
 *
 * @param {object} props - Props del componente.
 * @param {Array<{ id: string|number, com?: string, sci?: string }>} [props.especies] - Lista de especies.
 * @param {Array<string|number>} [props.selectedIds] - IDs seleccionados (controlado por el padre).
 * @param {(ids: number[]) => void} [props.onChange] - Callback cuando cambia la selección.
 * @param {boolean} [props.multi=true] - Si `true`, permite selección múltiple; si `false`, reemplaza por el último click.
 * @param {number} [props.columns=3] - Número objetivo de columnas (se traduce en un minWidth por tarjeta).
 * @param {number} [props.maxHeight=380] - Alto máximo del contenedor scrollable.
 * @returns {import('react').JSX.Element} Elemento React del grid.
 *
 * Lógica:
 * 1) Ordena especies alfabéticamente por nombre común.
 * 2) Filtra por `q` comparando con nombre común/científico normalizados.
 * 3) Construye un `Set` numérico de IDs seleccionados para lookup O(1).
 * 4) Permite alternar selección por click/teclado (Enter/Espacio).
 *
 * Dependencias externas:
 * - React hooks: `useState`, `useMemo`.
 *
 * Efectos secundarios:
 * - Ninguno, salvo llamar `onChange` (estado en el padre).
 *
 * Manejo de errores:
 * - Ignora IDs no numéricos/no finitos.
 *
 * @example
 * <SpeciesGrid especies={db.especies} selectedIds={[1,2]} onChange={setIds} multi columns={3} />
 *
 * Notas de mantenimiento:
 * - Mantener accesibilidad: `role="button"`, `tabIndex` y manejo de teclado.
 * - Ajustar límites/estilos si crece el tamaño de tarjetas o el grid.
 */
export default function SpeciesGrid({ especies, selectedIds, onChange, multi = true, columns = 3, maxHeight = 380 }) {
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const arr = Array.isArray(especies) ? especies : []
    return arr.slice().sort((a, b) => String(a?.com || '').localeCompare(String(b?.com || '')))
  }, [especies])

  const filtered = useMemo(() => {
    const qq = normText(q)
    if (!qq) return list
    return list.filter((e) => normText(e?.com).includes(qq) || normText(e?.sci).includes(qq))
  }, [list, q])

  const selectedSet = useMemo(() => {
    const arr = Array.isArray(selectedIds) ? selectedIds : []
    return new Set(arr.map(Number).filter((x) => Number.isFinite(x)))
  }, [selectedIds])

  /**
   * Alterna la selección de una especie por ID (modo multi o mono).
   *
   * @param {string|number} id - ID de especie a alternar.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Convierte `id` a número y valida.
   * 2) Si `multi` es `false`, selecciona únicamente ese ID.
   * 3) Si `multi` es `true`, alterna (agrega/quita) en un `Set` y emite el nuevo arreglo.
   *
   * Dependencias externas:
   * - `selectedSet` (memo) para estado actual.
   * - `onChange` (prop) para notificar al padre.
   *
   * Efectos secundarios:
   * - Llama `onChange` y por ende puede actualizar estado del padre.
   *
   * Manejo de errores:
   * - Si el ID no es numérico/finito, no hace nada.
   *
   * @example
   * toggle(12)
   *
   * Notas de mantenimiento:
   * - Mantener la salida como `number[]` para consistencia con el backend/servicios.
   */
  const toggle = (id) => {
    const n = Number(id)
    if (!Number.isFinite(n)) return
    if (!multi) {
      onChange?.([n])
      return
    }
    const next = new Set(selectedSet)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    onChange?.([...next])
  }

  /**
   * Maneja la interacción por teclado para activar la selección desde una tarjeta.
   *
   * @param {import('react').KeyboardEvent} ev - Evento de teclado del elemento focuseable.
   * @param {string|number} id - ID de la especie asociada a la tarjeta.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Solo responde a `Enter` o `Space`.
   * 2) Previene el comportamiento por defecto para evitar scroll/acciones no deseadas.
   * 3) Llama a `toggle(id)`.
   *
   * Dependencias externas:
   * - `toggle` (helper local).
   *
   * Efectos secundarios:
   * - Puede cambiar selección (vía `onChange`).
   *
   * Manejo de errores:
   * - Ignora teclas distintas.
   *
   * @example
   * onKeyDown={(ev) => handleCardKeyDown(ev, e.id)}
   *
   * Notas de mantenimiento:
   * - Mantener accesibilidad para usuarios de teclado.
   */
  const handleCardKeyDown = (ev, id) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    ev.preventDefault()
    toggle(id)
  }

  /**
   * Actualiza el texto de búsqueda (filtro) del grid.
   *
   * @param {import('react').ChangeEvent<HTMLInputElement>} e - Evento de cambio del input.
   * @returns {void} No retorna valor.
   *
   * Lógica:
   * 1) Lee `e.target.value`.
   * 2) Actualiza el estado `q`, lo que recalcula `filtered`.
   *
   * Dependencias externas:
   * - `setQ` (estado local).
   *
   * Efectos secundarios:
   * - Cambia estado local.
   *
   * Manejo de errores:
   * - No aplica.
   *
   * @example
   * <input value={q} onChange={handleSearchChange} />
   *
   * Notas de mantenimiento:
   * - Si se agrega debounce, implementarlo aquí.
   */
  const handleSearchChange = (e) => setQ(e.target.value)

  return (
    <div style={{ overflow: 'auto', maxHeight, border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
      <input
        className="ii"
        placeholder="Buscar especie..."
        value={q}
        onChange={handleSearchChange}
        style={{ marginBottom: 10 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(140, Math.round(480 / Math.max(1, Number(columns) || 3)))}px, 1fr))`, gap: 10 }}>
        {filtered.map((e) => {
          const id = Number(e?.id)
          const active = selectedSet.has(id)
          return (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(e.id)}
              onKeyDown={(ev) => handleCardKeyDown(ev, e.id)}
              style={{
                border: `1px solid ${active ? 'rgba(10,143,126,.45)' : 'var(--border)'}`,
                background: active ? 'var(--teal-lt)' : 'var(--bg)',
                borderRadius: 10,
                padding: '10px 12px',
                minHeight: 62,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
              title={`${e?.com || ''}${e?.sci ? ` (${e.sci})` : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800, color: active ? 'var(--teal)' : 'var(--text)', lineHeight: 1.1 }}>
                  {e?.com || '—'}
                </div>
                {active ? (
                  <div style={{ fontFamily: 'var(--ff-m)', fontSize: 11, color: 'var(--teal)', whiteSpace: 'nowrap' }}>✓</div>
                ) : null}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 3, lineHeight: 1.1 }}>
                {e?.sci || '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
