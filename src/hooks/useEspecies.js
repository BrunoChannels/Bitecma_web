import { useMemo } from 'react'
import { useDb } from '../context/dbContext.jsx'

/**
 * Hook selector para el catálogo de especies.
 *
 * @returns {{ especies: Array<object> }} Catálogo en memoria normalizado a arreglo.
 *
 * Lógica:
 * 1) Lee `db.especies` del contexto DB.
 * 2) Normaliza a arreglo para evitar checks repetidos en UI.
 *
 * Dependencias externas:
 * - [useDb](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/dbContext.jsx)
 *
 * Efectos secundarios:
 * - Ninguno.
 */
export function useEspecies() {
  const { db } = useDb()
  const especies = useMemo(() => {
    const arr = db?.especies
    return Array.isArray(arr) ? arr : []
  }, [db?.especies])
  return { especies }
}
