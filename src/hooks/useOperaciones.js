import { useMemo, useState } from 'react'
import { useDb } from '../context/dbContext.jsx'
import { filterOperaciones } from '../services/operacionesService.js'

/**
 * Hook de estado/selector para el listado de operaciones.
 *
 * Expone operaciones desde el contexto DB y un set de filtros (sector/mes/texto),
 * junto con colecciones derivadas para poblar combos en UI.
 *
 * @returns {{
 *  operaciones: Array<object>,
 *  filtered: Array<object>,
 *  sector: string,
 *  setSector: (v: string) => void,
 *  mes: string,
 *  setMes: (v: string) => void,
 *  texto: string,
 *  setTexto: (v: string) => void,
 *  sectores: Array<string>,
 *  meses: Array<string>,
 * }} Estado y selectores del módulo Operaciones.
 *
 * Lógica:
 * 1) Lee `db.operaciones` desde contexto y lo normaliza a arreglo.
 * 2) Mantiene filtros locales (state).
 * 3) Deriva `sectores` únicos y `meses` (YYYY-MM) desde `fechaInicio`.
 * 4) Deriva `filtered` usando `filterOperaciones`.
 *
 * Dependencias externas:
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx)
 * - [filterOperaciones](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/operacionesService.js)
 *
 * Efectos secundarios:
 * - Ninguno (solo estados locales).
 *
 * Notas de mantenimiento:
 * - Este hook no pagina ni ordena; la UI decide orden/segmentación por región.
 */
export function useOperaciones() {
  const { db } = useDb()
  const ops = useMemo(() => (Array.isArray(db?.operaciones) ? db.operaciones : []), [db])

  const [sector, setSector] = useState('')
  const [mes, setMes] = useState('')
  const [texto, setTexto] = useState('')

  const sectores = useMemo(() => {
    const set = new Set()
    ops.forEach((o) => {
      if (o?.sector) set.add(o.sector)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [ops])

  const meses = useMemo(() => {
    const set = new Set()
    ops.forEach((o) => {
      const fi = String(o?.fechaInicio || '')
      if (/^\d{4}-\d{2}-\d{2}$/.test(fi)) set.add(fi.slice(0, 7))
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [ops])

  const filtered = useMemo(
    () => filterOperaciones(ops, { sector, mes, texto }),
    [ops, sector, mes, texto],
  )

  return {
    operaciones: ops,
    filtered,
    sector,
    setSector,
    mes,
    setMes,
    texto,
    setTexto,
    sectores,
    meses,
  }
}
