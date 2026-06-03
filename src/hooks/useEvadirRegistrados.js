import { useMemo } from 'react'
import { obtenerFilasEvadirRegistrados } from '../services/evadirService.js'
import { usarBaseDatos } from '../context/dbContext.jsx'

/**
 * Hook selector para la tabla de “EVADIR registrados”.
 *
 * @returns {{ rows: Array<object> }} Filas derivadas para UI.
 *
 * Lógica:
 * 1) Lee `db.operaciones` del contexto DB.
 * 2) Construye filas usando `getEvadirRegistradosRows`.
 *
 * Dependencias externas:
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx)
 * - [getEvadirRegistradosRows](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/evadirService.js)
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function useEvadirRegistrados() {
  const { baseDatos: db } = usarBaseDatos()
  const rows = useMemo(
    () => obtenerFilasEvadirRegistrados(db?.operaciones || []),
    [db?.operaciones],
  )
  return { rows }
}
