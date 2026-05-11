/**
 * Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/YYYY para EVADIR/tabla.
 *
 * @param {string} iso - Fecha ISO.
 * @returns {string} Fecha en formato DMY o string vacío si es inválida.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - Esta función retorna '' (no '—') porque suele usarse en export/tabla.
 */
export function fmtDMY(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4)
}

/**
 * Construye un resumen de una operación con métricas requeridas por EVADIR.
 *
 * @param {object} op - Operación.
 * @returns {{ totalBotes:number, totalTx:number, totalCq:number, denLoco:string, denErizo:string }}
 * Resumen con conteos y densidades formateadas.
 *
 * Lógica:
 * 1) Cuenta botes.
 * 2) Cuenta transectos (excluye cuadrantes) y cuadrantes (tipo === 'cuadrante').
 * 3) Calcula densidad de “loco” y “erizo” a partir de ids de especie fijos (1 y 5).
 * 4) Formatea densidades a 3 decimales.
 *
 * Dependencias externas:
 * - Ninguna (usa estructura `op.botes[].transectos[]`).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a estructuras incompletas.
 *
 * Notas de mantenimiento:
 * - Los ids 1 (loco) y 5 (erizo) son una convención del catálogo; si cambia, parametrizar.
 * - `denLoco/denErizo` son strings por requerimientos de export/tabla (toFixed).
 */
export function getEvadirResumenOperacion(op) {
  const botes = Array.isArray(op?.botes) ? op.botes : []
  const totalBotes = botes.length
  const totalTx = botes.reduce(
    (s, b) => s + ((b?.transectos || []).filter((t) => t?.tipo !== 'cuadrante').length || 0),
    0,
  )
  const totalCq = botes.reduce(
    (s, b) => s + ((b?.transectos || []).filter((t) => t?.tipo === 'cuadrante').length || 0),
    0,
  )

  let sumAreaLoco = 0
  let sumNLoco = 0
  let sumAreaErizo = 0
  let sumNErizo = 0
  botes.forEach((b) => {
    ;(b?.transectos || []).forEach((t) => {
      if (t?.counts?.[1] != null) {
        sumAreaLoco += t.area || 0
        sumNLoco += t.counts[1] || 0
      }
      if (t?.counts?.[5] != null) {
        sumAreaErizo += t.area || 0
        sumNErizo += t.counts[5] || 0
      }
    })
  })
  const denLoco = sumAreaLoco > 0 ? (sumNLoco / sumAreaLoco).toFixed(3) : '0.000'
  const denErizo = sumAreaErizo > 0 ? (sumNErizo / sumAreaErizo).toFixed(3) : '0.000'

  return {
    totalBotes,
    totalTx,
    totalCq,
    denLoco,
    denErizo,
  }
}

/**
 * Transforma operaciones a filas “registrados” para tabla/listado EVADIR.
 *
 * @param {Array<object>} operaciones - Operaciones origen.
 * @returns {Array<object>} Filas normalizadas para UI de EVADIR registrados.
 *
 * Lógica:
 * 1) Normaliza `operaciones` como arreglo.
 * 2) Para cada operación, calcula resumen con `getEvadirResumenOperacion`.
 * 3) Retorna un objeto fila con campos esperados por la tabla (incluye `estado` fijo).
 *
 * Dependencias externas:
 * - `getEvadirResumenOperacion` (este módulo).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Notas de mantenimiento:
 * - `estado` está hardcodeado como 'Borrador' porque no existe workflow persistente aún.
 */
export function getEvadirRegistradosRows(operaciones) {
  const ops = Array.isArray(operaciones) ? operaciones : []
  return ops.map((op) => {
    const { totalBotes, totalTx, totalCq, denLoco, denErizo } = getEvadirResumenOperacion(op)
    return {
      id: op?.id,
      region: op?.region ?? null,
      sector: op?.sector,
      numSeg: op?.numSeg,
      fechaInicio: op?.fechaInicio,
      totalBotes,
      totalTx,
      totalCq,
      denLoco,
      denErizo,
      estado: 'Borrador',
    }
  })
}
