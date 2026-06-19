import { useEffect, useRef, useState } from 'react'
import EvadirPreview from '../evadir/EvadirPreview.jsx'
import ManualColumnMapper from '../evadir/ManualColumnMapper.jsx'
import { agregarMuestra } from '../../services/lpMuestrasService.js'
import { usarAplicacion } from '../../context/appContext.jsx'
import { ErrorImportacionEvadir, mensajeAmigableImportacion, validarArchivoExcelBasico } from '../../services/evadirImportValidation.js'
import { compararZonaMuestreo, normalizarZonaMuestreo } from '../../services/operacionesService.js'

/**
 * Normaliza texto para matching flexible (minúsculas, sin acentos, solo alfanuméricos/espacios).
 *
 * @param {unknown} v - Valor de entrada.
 * @returns {string} Texto normalizado para comparación.
 *
 * Lógica:
 * 1) Convierte a string.
 * 2) Lowercase + unicode normalize.
 * 3) Elimina diacríticos.
 * 4) Reemplaza cualquier separador no alfanumérico por espacios y recorta.
 *
 * Dependencias externas:
 * - APIs estándar de string.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normText('Lessonia (sp.)') // 'lessonia sp'
 *
 * Notas de mantenimiento:
 * - Usar para matching “tolerante”; para comparaciones exactas considerar normalización más estricta.
 */
function normText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Normaliza encabezados (headers) colapsando espacios.
 *
 * @param {unknown} v - Encabezado crudo.
 * @returns {string} Encabezado normalizado (tokens separados por un solo espacio).
 *
 * Lógica:
 * 1) Aplica `normText`.
 * 2) Colapsa espacios múltiples.
 *
 * Dependencias externas:
 * - `normText`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * normHeader('  Tipo   unidad ') // 'tipo unidad'
 *
 * Notas de mantenimiento:
 * - Mantener consistente con lógica de detección de columnas.
 */
function normHeader(v) {
  return normText(v).replace(/\s+/g, ' ').trim()
}

function buscarIdEspeciePorNombres(especies, nombresComunes = [], nombresCientificos = []) {
  const comunes = nombresComunes.map(normHeader).filter(Boolean)
  const cientificos = nombresCientificos.map(normHeader).filter(Boolean)

  for (const especie of Array.isArray(especies) ? especies : []) {
    const id = Number(especie?.id)
    if (!Number.isFinite(id)) continue

    const nombreComun = normHeader(especie?.com)
    const nombreCientifico = normHeader(especie?.sci)

    if (comunes.includes(nombreComun)) return id
    if (cientificos.includes(nombreCientifico)) return id
  }

  return null
}

export function inferirEspecieHuiroDesdeNombreHoja(nombreHoja, especies) {
  const nombreNormalizado = normHeader(nombreHoja)
  if (!nombreNormalizado) return null

  const esHuiroPalo = /(^|\s)h\s+palo(\s|$)/.test(nombreNormalizado)
  if (esHuiroPalo) {
    return buscarIdEspeciePorNombres(especies, ['Huiro palo'], ['Lessonia trabeculata'])
  }

  const esHuiroNegro = /(^|\s)h\s+negro(\s|$)/.test(nombreNormalizado)
  if (esHuiroNegro) {
    return buscarIdEspeciePorNombres(especies, ['Huiro negro'], ['Lessonia berteroana', 'Lessonia nigrescens', 'Lessonia spicata'])
  }

  return null
}

export function esNombreBoteIntermarealDirecto(nombre) {
  const clave = normText(nombre)
  const claveCompacta = clave.replace(/\s+/g, '')
  const clavesIntermareales = new Set(['en tierra', 'a pie'])
  const clavesIntermarealesCompactas = new Set(['entierra', 'apie'])
  return (clave && clavesIntermareales.has(clave)) || (claveCompacta && clavesIntermarealesCompactas.has(claveCompacta))
}

export function resolverOCrearBoteSubmarealFaltante(botesActuales, zonaRaw, nombreBoteRaw, buzoNombre = '') {
  const zona = normalizarZonaMuestreo(zonaRaw) || '1'
  const nombreBote = String(nombreBoteRaw || '').trim()
  const nombreNormalizado = normalizarNombreBoteParaMatch(nombreBote)
  if (!nombreNormalizado) return { bote: null, creado: false }

  const existente =
    (Array.isArray(botesActuales) ? botesActuales : []).find(
      (b) =>
        (b?.submareal == null ? true : b?.submareal === true || b?.submareal === 1 || b?.submareal === '1') &&
        normalizarZonaMuestreo(b?.zona) === zona &&
        normalizarNombreBoteParaMatch(b?.nombre) === nombreNormalizado,
    ) || null

  if (existente) {
    const buzo = String(buzoNombre || '').trim()
    if (!existente.buzo && buzo) existente.buzo = buzo
    return { bote: existente, creado: false }
  }

  return {
    bote: {
      id: `B${(Array.isArray(botesActuales) ? botesActuales.length : 0) + 1}`,
      zona,
      submareal: true,
      nombre: nombreBote,
      buzo: String(buzoNombre || '').trim(),
      densTipo: 'transecto',
      lpMuestras: {},
      transectos: [],
    },
    creado: true,
  }
}

export function normalizarNombreBoteParaMatch(nombreBote) {
  const nombreCrudo = String(nombreBote ?? '').trim()
  if (/^[-\u2010-\u2015\u2212]+$/.test(nombreCrudo)) return '-'
  const tokens = normHeader(nombreBote).split(' ').filter(Boolean)
  while (tokens.length && ['el', 'la', 'los', 'las', 'bote'].includes(tokens[0])) tokens.shift()
  return tokens.join(' ')
}

export function normalizarZonaParaClave(zonaRaw) {
  const zonaNorm = normalizarZonaMuestreo(zonaRaw)
  if (!zonaNorm) return { zona: '1', zonaValida: false, zonaNorm }
  if (/^\d+$/.test(zonaNorm)) {
    const zonaNum = Number(zonaNorm)
    if (Number.isFinite(zonaNum) && zonaNum > 0) return { zona: String(zonaNum), zonaValida: true, zonaNorm }
  }
  return { zona: zonaNorm, zonaValida: true, zonaNorm }
}

function compararZonaTexto(a, b) {
  const aTexto = String(a ?? '').trim()
  const bTexto = String(b ?? '').trim()
  const aEsNumero = /^\d+$/.test(aTexto)
  const bEsNumero = /^\d+$/.test(bTexto)
  if (aEsNumero && bEsNumero) return Number(aTexto) - Number(bTexto)
  if (aEsNumero) return -1
  if (bEsNumero) return 1
  return aTexto.localeCompare(bTexto, 'es', { sensitivity: 'base' })
}

export function analizarBotesMultiZonaDesdePares(paresBoteZona) {
  const zonasPorBote = new Map()
  const filasZonaInvalida = []
  const botesSinNombre = []

  ;(Array.isArray(paresBoteZona) ? paresBoteZona : []).forEach((par, idx) => {
    const nombreBoteRaw = String(par?.nombreBote ?? '').trim()
    const zonaRaw = par?.zonaRaw ?? null
    if (!nombreBoteRaw) {
      botesSinNombre.push({ fila: idx, zonaRaw })
      return
    }

    const nombreBoteNorm = normalizarNombreBoteParaMatch(nombreBoteRaw) || normHeader(nombreBoteRaw) || nombreBoteRaw
    const { zona, zonaValida, zonaNorm } = normalizarZonaParaClave(zonaRaw)

    if (!zonaValida) filasZonaInvalida.push({ fila: idx, nombreBote: nombreBoteRaw, zonaRaw, zonaNorm, zonaUsada: zona })

    if (!zonaValida) return
    if (!zonasPorBote.has(nombreBoteNorm)) zonasPorBote.set(nombreBoteNorm, new Set())
    zonasPorBote.get(nombreBoteNorm).add(zona)
  })

  const botesConMultiplesZonas = []
  for (const [nombreBoteNorm, setZonas] of zonasPorBote.entries()) {
    const zonas = Array.from(setZonas).sort(compararZonaTexto)
    if (zonas.length > 1) botesConMultiplesZonas.push({ nombreBoteNorm, zonas })
  }

  botesConMultiplesZonas.sort((a, b) => a.nombreBoteNorm.localeCompare(b.nombreBoteNorm))

  return { botesConMultiplesZonas, filasZonaInvalida, botesSinNombre }
}

function esperarSiguienteTick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Obtiene el primer valor no vacío de una columna dentro de un set de filas.
 *
 * @param {Array<any[]>} rows - Filas (arrays) provenientes del AOA del Excel.
 * @param {number} idx - Índice de columna a inspeccionar.
 * @returns {string} Primer string no vacío; '' si no existe.
 *
 * Lógica:
 * 1) Itera filas en orden.
 * 2) Lee la celda en `idx`, la convierte a string y recorta.
 * 3) Retorna el primer valor no vacío.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Tolerante a filas incompletas.
 *
 * @example
 * firstNonEmpty(rows, 3)
 *
 * Notas de mantenimiento:
 * - Útil para metadatos que se repiten o aparecen solo en algunas filas.
 */
function firstNonEmpty(rows, idx) {
  for (const r of rows) {
    const v = r?.[idx]
    const s = String(v ?? '').trim()
    if (s !== '') return s
  }
  return ''
}

/**
 * Parsea un entero de forma segura (devuelve `null` si no es válido).
 *
 * @param {unknown} v - Valor crudo (number o string).
 * @returns {number|null} Entero truncado o `null`.
 *
 * Lógica:
 * 1) Trata `null/undefined/''` como ausencia.
 * 2) Si es number finito, trunca.
 * 3) Si es string, aplica `parseInt`.
 * 4) Si no es finito, retorna `null`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; retorna `null`.
 *
 * @example
 * parseIntSafe('12') // 12
 *
 * Notas de mantenimiento:
 * - Mantener coherencia con parseos usados en servicios EVADIR/preview.
 */
function parseIntSafe(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Parsea un número decimal de forma segura (soporta coma decimal).
 *
 * @param {unknown} v - Valor crudo (number o string).
 * @returns {number|null} Número finito o `null`.
 *
 * Lógica:
 * 1) Trata `null/undefined/''` como ausencia.
 * 2) Si es number finito, lo retorna.
 * 3) Si es string, recorta, reemplaza coma por punto y aplica `Number(...)`.
 * 4) Si no es finito, retorna `null`.
 *
 * Dependencias externas:
 * - Ninguna.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; retorna `null`.
 *
 * @example
 * parseNumSafe('0,25') // 0.25
 *
 * Notas de mantenimiento:
 * - Si se requiere soporte de separadores de miles, ajustar aquí.
 */
function parseNumSafe(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Normaliza una fecha a formato ISO (YYYY-MM-DD) soportando distintos formatos Excel.
 *
 * @param {unknown} val - Valor crudo de fecha (Date, serial Excel, o string).
 * @param {any} XLSX - Módulo XLSX (se usa `XLSX.SSF.parse_date_code` si existe).
 * @returns {string} Fecha ISO o '' si no se puede parsear.
 *
 * Lógica:
 * 1) Si es Date válida, formatea a ISO.
 * 2) Si es número y existe parser de serial Excel, intenta convertir.
 * 3) Si es string:
 *    - Acepta ISO directo.
 *    - Acepta DD-MM-YYYY / DD/MM/YYYY y convierte.
 *    - Acepta YYYY-MM-DD / YYYY/MM/DD.
 * 4) Si no calza, retorna ''.
 *
 * Dependencias externas:
 * - `XLSX.SSF.parse_date_code` (si disponible).
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No lanza; retorna '' si falla.
 *
 * @example
 * parseDateISO('31/12/2026', XLSX) // '2026-12-31'
 *
 * Notas de mantenimiento:
 * - Mantener esta función tolerante, porque los Excel reales suelen variar en formatos.
 */
function parseDateISO(val, XLSX) {
  if (val == null || val === '') return ''
  if (val instanceof Date && !isNaN(val)) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number' && Number.isFinite(val) && XLSX?.SSF?.parse_date_code) {
    const dc = XLSX.SSF.parse_date_code(val)
    if (dc && dc.y && dc.m && dc.d) {
      const y = String(dc.y).padStart(4, '0')
      const m = String(dc.m).padStart(2, '0')
      const d = String(dc.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m1 = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
  const m2 = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return ''
}

/**
 * Intenta identificar la fila de encabezados dentro de un AOA (array-of-arrays) exportado desde Excel.
 *
 * @param {unknown} aoa - AOA de la hoja (`XLSX.utils.sheet_to_json(..., {header:1})`).
 * @returns {number} Índice de fila que parece encabezado; 0 si no se detecta.
 *
 * Lógica:
 * 1) Escanea hasta 12 filas.
 * 2) Normaliza cada fila a “keys”.
 * 3) Detecta heurísticamente presencia de columnas típicas (BOTE, ZONA, NUM...) o (REGION, FECHA...).
 *
 * Dependencias externas:
 * - `normHeader`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - Si no hay match, retorna 0.
 *
 * @example
 * const hdr = guessHeaderRow(aoa)
 *
 * Notas de mantenimiento:
 * - Si aparecen nuevos layouts, ajustar heurísticas para reducir falsos positivos.
 */
function guessHeaderRow(aoa) {
  const maxScan = Math.min(Array.isArray(aoa) ? aoa.length : 0, 12)
  for (let r = 0; r < maxScan; r++) {
    const row = Array.isArray(aoa[r]) ? aoa[r] : []
    const keys = row.map(normHeader).filter(Boolean)
    const hasBote = keys.some((k) => k === 'bote')
    const hasZona = keys.some((k) => k.includes('zona'))
    const hasNum = keys.some((k) => k.includes('num') && (k.includes('transec') || k.includes('cuadr')))
    if (hasBote && (hasZona || hasNum)) return r
    const hasRegion = keys.some((k) => k === 'region')
    const hasFecha = keys.some((k) => k === 'fecha')
    if (hasRegion && hasBote && hasFecha) return r
  }
  return 0
}

/**
 * Retorna la fecha actual en formato ISO (YYYY-MM-DD).
 *
 * @returns {string} Fecha ISO.
 *
 * Lógica:
 * 1) Usa `new Date()` local.
 * 2) Formatea año/mes/día con padding.
 *
 * Dependencias externas:
 * - `Date`.
 *
 * Efectos secundarios:
 * - Ninguno.
 *
 * Manejo de errores:
 * - No aplica.
 *
 * @example
 * const today = todayISO()
 *
 * Notas de mantenimiento:
 * - Si se requiere zona horaria específica, ajustar a una librería/estrategia central.
 */
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Importador de Excel EVADIR (.xlsx/.xls) para crear o actualizar una operación en el sistema.
 *
 * Parse:
 * - Hoja EVADIR (densidad/estructuras).
 * - Hojas adicionales LP/L/D para muestras (si existen).
 *
 * @param {object} props - Props del componente.
 * @param {object} props.db - Base de datos en memoria (especies, regionesChile, opa, etc.).
 * @param {boolean} props.canWrite - Permiso de escritura (si false, bloquea importación).
 * @param {(msg: string, color?: string) => void} props.toast - Notificador UI.
 * @param {(title: string, body: import('react').JSX.Element, size?: string) => void} props.openModal - Abre un modal.
 * @param {() => void} props.closeModal - Cierra el modal.
 * @param {Array<object>} props.operaciones - Operaciones existentes (para detectar colisión de ID).
 * @param {(ops: Array<object>, year: string) => string} props.nextOpId - Genera el próximo ID de operación para un año.
 * @param {(payload: object, mode: 'create'|'update') => Promise<boolean>} props.safeUpsertOperacion - Persiste en backend/API o storage seguro.
 * @returns {import('react').JSX.Element} Botón “Subir EVADIR” y un input file oculto.
 *
 * Lógica:
 * 1) Bloquea importación si `canWrite` es false o si hay una importación en curso.
 * 2) Carga `xlsx-js-style` dinámicamente para leer el Excel en cliente.
 * 3) Ubica la hoja EVADIR y detecta la fila de encabezados.
 * 4) Mapea columnas relevantes (bote, zona, num, tipo, counts/dens, coordenadas, etc.).
 * 5) Construye un borrador de operación (botes + transectos/cuadrantes + muestreos LP/L/D).
 * 6) Si hay especies no resolubles en hojas LP, solicita resolución manual vía modal con `SpeciesGrid`.
 * 7) Muestra una previsualización (modal) y, al confirmar, ejecuta `safeUpsertOperacion`.
 *
 * Dependencias externas:
 * - Import dinámico: `xlsx-js-style`.
 * - [EvadirPreview](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/evadir/EvadirPreview.jsx) para previsualización.
 * - [SpeciesGrid](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/components/common/SpeciesGrid.jsx) para resolución manual.
 * - [addSample](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/services/lpMuestrasService.js) para cargar muestras.
 * - [useApp](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/Proyecto%20Vite%20React%20Bootstrap/bitecma-web-amerb/src/context/appContext.jsx) para obtener el usuario actual.
 *
 * Efectos secundarios:
 * - Abre modales (resolución y previsualización).
 * - Lee archivos locales desde input file.
 * - Puede ejecutar requests de persistencia según implementación de `safeUpsertOperacion`.
 *
 * Manejo de errores:
 * - Muestra toasts rojos ante errores de lectura/parseo/hojas faltantes.
 * - Atrapa excepciones generales del proceso de importación.
 *
 * @example
 * <EvadirImporter db={db} canWrite={canWrite} toast={toast} openModal={openModal} closeModal={closeModal} operaciones={db.operaciones} nextOpId={nextOpId} safeUpsertOperacion={safeUpsertOperacion} />
 *
 * Notas de mantenimiento:
 * - La heurística de mapeo de columnas es tolerante; mantenerla alineada con plantillas Excel reales.
 * - Evitar romper compatibilidad con alias científicos/comunes (ver `sciAliases` y `comAliasToId`).
 */
export default function EvadirImporter({ db, canWrite, toast, openModal, closeModal, operaciones, nextOpId, safeUpsertOperacion }) {
  const xlsxPromiseRef = useRef(null)
  const evadirInputRef = useRef(null)
  const cancelImportRef = useRef(false)
  const [isImportingEvadir, setIsImportingEvadir] = useState(false)
  const { usuario: user } = usarAplicacion()
  const dbActualRef = useRef(db)

  useEffect(() => {
    dbActualRef.current = db
  }, [db])

  /**
   * Importa y procesa un archivo Excel EVADIR.
   *
   * @param {File} file - Archivo Excel seleccionado por el usuario.
   * @returns {Promise<void>} Promesa que resuelve al finalizar el flujo (puede abortar por validación/usuario).
   *
   * Lógica (alto nivel):
   * 1) Validaciones iniciales: archivo, permisos, reentrancia.
   * 2) Carga XLSX, lee workbook y ubica hoja EVADIR.
   * 3) Prepara estructuras de resolución:
   *    - maps de especies (por com/sci y aliases),
   *    - regions/OPA,
   *    - heurísticas por nombre de hoja.
   * 4) Parsea filas EVADIR a una estructura de botes/unidades con counts/coordenadas.
   * 5) Parsea hojas LP/L/D y agrega muestras con `addSample`.
   * 6) Si quedan especies no resueltas, abre un modal para resolver manualmente.
   * 7) Abre previsualización; al confirmar, persiste con `safeUpsertOperacion`.
   *
   * Dependencias externas:
   * - `xlsx-js-style` y sus helpers (`XLSX.read`, `XLSX.utils.sheet_to_json`).
   * - `openModal/closeModal`, `toast`.
   * - `safeUpsertOperacion`, `nextOpId`.
   *
   * Efectos secundarios:
   * - Abre modales, actualiza UI de carga y puede persistir datos.
   *
   * Manejo de errores:
   * - Captura errores y muestra mensaje legible por `toast`.
   *
   * @example
   * importEvadirFromXlsx(file)
   *
   * Notas de mantenimiento:
   * - Mantener el import dinámico para no inflar el bundle inicial.
   */
  const importEvadirFromXlsx = async (file) => {
    if (!file) return
    if (!canWrite) {
      toast('Modo solo lectura', 'blue')
      return
    }
    if (isImportingEvadir) return
    setIsImportingEvadir(true)
    cancelImportRef.current = false
    let pasoActual = 'iniciando'
    try {
      const checkCancel = () => {
        if (cancelImportRef.current) throw new ErrorImportacionEvadir('CANCELADO', 'Importación cancelada por el usuario.')
      }

      const openProcesando = async (mensaje) => {
        pasoActual = String(mensaje || '').trim() || pasoActual
        openModal(
          'Procesando importación EVADIR',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="info-box teal" style={{ marginBottom: 0 }}>
              <span>i</span>
              <div style={{ minWidth: 0 }}>{pasoActual}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn b-out"
                onClick={() => {
                  cancelImportRef.current = true
                  toast('Cancelando importación…', 'blue')
                }}
              >
                Cancelar importación
              </button>
            </div>
          </div>,
          'wide',
        )
        await esperarSiguienteTick()
        checkCancel()
      }

      const yieldCada = async (idx, cada) => {
        const n = Number(cada) || 0
        if (n > 0 && idx % n === 0) await esperarSiguienteTick()
        checkCancel()
      }

      await openProcesando('Leyendo archivo y validando estructura…')
      validarArchivoExcelBasico(file, { maxBytes: 15 * 1024 * 1024 })
      if (!xlsxPromiseRef.current) xlsxPromiseRef.current = import('xlsx-js-style').then((m) => m?.default || m)
      const XLSX = await xlsxPromiseRef.current
      checkCancel()
      const buf = await file.arrayBuffer()
      let wb = null
      try {
        wb = XLSX.read(buf, { type: 'array' })
      } catch (err) {
        throw new ErrorImportacionEvadir(
          'XLSX_LECTURA_FALLIDA',
          'No se pudo leer el Excel. El archivo podría estar corrupto o no ser un .xlsx/.xls válido.',
          { original: String(err?.message || err) },
        )
      }
      const sheetNames = Array.isArray(wb?.SheetNames) ? wb.SheetNames : []
      const evadirSheetName = sheetNames.find((n) => normHeader(n).includes('evadir'))
      if (!evadirSheetName) {
        throw new ErrorImportacionEvadir('HOJA_EVADIR_NO_ENCONTRADA', 'No se encontró la hoja EVADIR dentro del archivo.', { sheetNames })
      }

      const especies = Array.isArray(db?.especies) ? db.especies : []
      const regionesChile = Array.isArray(db?.regionesChile) ? db.regionesChile : []
      const opaArr = Array.isArray(db?.opa) ? db.opa : []

      /**
       * Construye un índice de especies por clave normalizada (nombre común y científico).
       *
       * @returns {Map<string, number>} Map `key -> especieId`.
       *
       * Lógica:
       * 1) Recorre `especies`.
       * 2) Para cada especie, genera claves normalizadas de `com` y `sci` con `normHeader`.
       * 3) Indexa ambas claves apuntando al `id`.
       *
       * Dependencias externas:
       * - `especies` (catálogo en memoria).
       * - `normHeader` (helper local).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Este map se usa como base de resolución rápida durante el parseo de columnas EVADIR.
       */
      const speciesIdByKey = (() => {
        const m = new Map()
        for (const sp of especies) {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) continue
          const k1 = normHeader(sp?.com)
          const k2 = normHeader(sp?.sci)
          if (k1) m.set(k1, id)
          if (k2) m.set(k2, id)
        }
        return m
      })()

      /**
       * Construye un set de ids de especies que se consideran “algas”.
       *
       * Se usa para forzar tipo de muestreo a diámetro (D) al interpretar hojas LP/L/D.
       *
       * @returns {Set<number>} Set de ids de especies clasificadas como algas.
       *
       * Lógica:
       * - Aplica heurísticas por nombre común/científico (tokens como lessonia/huiro/cochayuyo/luga).
       *
       * Dependencias externas:
       * - `especies`, `normHeader`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Si el catálogo define taxonomía/categoría explícita, reemplazar heurística por campo oficial.
       */
      const algaIdSet = (() => {
        const m = new Set()
        for (const sp of especies) {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) continue
          const sci = normHeader(sp?.sci)
          const com = normHeader(sp?.com)
          const isAlga =
            sci.includes('lessonia') ||
            sci.includes('durvillaea') ||
            sci.includes('macrocystis') ||
            sci.includes('gigartina') ||
            sci.includes('sarcothalia') ||
            sci.includes('mazzaella') ||
            com.includes('huiro') ||
            com.includes('cochayuyo') ||
            com.includes('luga')
          if (isAlga) m.add(id)
        }
        return m
      })()

      /**
       * Construye un índice tolerante para nombres científicos abreviados tipo “L berteroana”.
       *
       * @returns {Map<string, number>} Map de claves abreviadas a id de especie.
       *
       * Lógica:
       * 1) Normaliza `sp.sci`.
       * 2) Toma primera letra del género + epíteto (ej: "l berteroana").
       * 3) Indexa variantes con/ sin espacio (ej: "l berteroana" y "lberteroana").
       *
       * Dependencias externas:
       * - `especies`, `normHeader`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Útil para planillas que usan abreviaturas en headers/nombres de hoja.
       */
      const genusInitialEpithetToId = (() => {
        const m = new Map()
        for (const sp of especies) {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) continue
          const ks = normHeader(sp?.sci)
          const parts = ks.split(' ').filter(Boolean)
          if (parts.length < 2) continue
          const gi = parts[0]?.[0]
          const ep = parts[1]
          if (!gi || !ep) continue
          m.set(`${gi} ${ep}`, id)
          m.set(`${gi}${ep}`, id)
        }
        return m
      })()

      /**
       * Tabla de alias científicos (strings) para compatibilidad con variantes históricas/typos.
       *
       * @returns {Map<string, string>} Map `aliasSci -> sciCanon`.
       *
       * Lógica:
       * - Normaliza ambos extremos con `normHeader` y guarda el mapping.
       *
       * Dependencias externas:
       * - `normHeader`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Este map se usa por `resolveSpeciesId` antes de resolver a un id final.
       */
      const sciAliases = (() => {
        const m = new Map()
        const add = (from, to) => {
          const f = normHeader(from)
          const t = normHeader(to)
          if (f && t) m.set(f, t)
        }
        add('Lessonia nigrescens', 'Lessonia berteroana')
        add('Lessonia nigrenscens', 'Lessonia berteroana')
        add('Lessonia spicata', 'Lessonia berteroana')
        add('L nigrescens', 'Lessonia berteroana')
        add('L nigrenscens', 'Lessonia berteroana')
        add('LNIGRENSCENS', 'Lessonia berteroana')
        add('LNIGRESCENS', 'Lessonia berteroana')
        return m
      })()

      /**
       * Construye un índice de alias de nombre común a id de especie.
       *
       * @returns {Map<string, number>} Map `aliasCommon -> especieId`.
       *
       * Lógica:
       * 1) Agrega el nombre común completo normalizado.
       * 2) Agrega variantes sin espacios (para matches compactos).
       * 3) Agrega abreviatura “InicialDelPrimero + último” evitando stop-words.
       *
       * Dependencias externas:
       * - `especies`, `normHeader`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Se utiliza para inferir especie desde nombres de hoja (LP/L/D) cuando no viene explícita.
       */
      const comAliasToId = (() => {
        const m = new Map()
        const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'spp', 'sp'])
        const add = (alias, id) => {
          const k = normHeader(alias)
          if (!k) return
          if (k.length < 3) return
          m.set(k, id)
          m.set(k.replace(/\s+/g, ''), id)
        }
        for (const sp of especies) {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) continue
          const com = String(sp?.com || '').trim()
          const k = normHeader(com)
          if (!k) continue
          add(k, id)
          const parts = k.split(' ').filter((w) => w && !stop.has(w))
          if (!parts.length) continue
          if (parts.length >= 2) {
            const first = parts[0]
            const last = parts[parts.length - 1]
            add(`${first[0]} ${last}`, id)
            add(`${first[0]}${last}`, id)
          }
        }
        return m
      })()

      const CUSTOM_SPECIES_MAPPING_KEY = 'bitecma_custom_mappings_v1'
      const manualSpeciesIdByKey = new Map()
      const manualMappedColumnNames = new Set()

      const getUserMappingKey = () => {
        const k =
          user?.id ??
          user?.userId ??
          user?.usuarioId ??
          user?.usuario_id ??
          user?.correo ??
          user?.email ??
          user?.username ??
          null
        return String(k || 'anon').trim().toLowerCase() || 'anon'
      }

      const readCustomSpeciesMappings = () => {
        try {
          const raw = localStorage.getItem(CUSTOM_SPECIES_MAPPING_KEY)
          if (!raw) return { version: 1, users: {} }
          const parsed = JSON.parse(raw)
          if (!parsed || typeof parsed !== 'object') return { version: 1, users: {} }
          const users = parsed.users && typeof parsed.users === 'object' ? parsed.users : {}
          return { version: 1, users }
        } catch {
          return { version: 1, users: {} }
        }
      }

      const writeCustomSpeciesMappings = (store) => {
        try {
          localStorage.setItem(CUSTOM_SPECIES_MAPPING_KEY, JSON.stringify(store || { version: 1, users: {} }))
        } catch {
          return
        }
      }

      const normalizeSpeciesFieldId = (fieldId) => {
        const raw = String(fieldId || '').trim()
        const m = raw.match(/^(NUM|DENS)\s*:\s*(\d+)$/i)
        if (!m) return null
        const kind = m[1].toUpperCase()
        const spId = Number(m[2])
        if (!Number.isFinite(spId)) return null
        return { kind, spId }
      }

      const baseSpeciesKeyFromHeader = (rawHeader) => {
        const baseRaw = String(rawHeader || '').replace(/\(.*?\)/g, '').trim()
        const base = baseRaw.replace(/^(num|dens)\s+/i, '').trim()
        return normHeader(base)
      }

      /**
       * Intenta inferir la especie asociada a una hoja LP/L/D a partir de su nombre.
       *
       * @param {string} sheetName - Nombre de la hoja en el Excel.
       * @returns {number|null} ID de especie inferido o `null` si no se puede inferir.
       *
       * Lógica:
       * 1) Normaliza el nombre de la hoja.
       * 2) Excluye tokens genéricos (evadir, lp, l, d, etc.).
       * 3) Busca el alias común más largo que esté contenido en el nombre de hoja.
       * 4) Retorna el ID asociado al mejor match.
       *
       * Dependencias externas:
       * - `normHeader`.
       * - `comAliasToId` (map de alias comunes a ID).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna `null` si no hay match.
       *
       * @example
       * guessSpeciesFromSheetName('LP Loco') // -> id de Loco (si existe alias)
       *
       * Notas de mantenimiento:
       * - Mantener el set `stop` alineado con convenciones reales de nombres de hojas.
       */
      const guessSpeciesFromSheetName = (sheetName) => {
        const s = normHeader(sheetName)
        if (!s) return null
        const huiroAliasId = inferirEspecieHuiroDesdeNombreHoja(sheetName, especies)
        if (huiroAliasId != null) return huiroAliasId
        const stop = new Set(['evadir', 'long', 'longo', 'largo', 'peso', 'lp', 'l', 'd','L','LP','D', 'diam', 'diametro','DIAMETRO', 'disco'])
        let best = null
        for (const [alias, id] of comAliasToId.entries()) {
          if (!alias || stop.has(alias)) continue
          if (alias.length < 3) continue
          const hit = s.includes(alias) || s.includes(alias.replace(/\s+/g, ''))
          if (!hit) continue
          const score = alias.length
          if (!best || score > best.score) best = { id, score }
        }
        return best?.id ?? null
      }

      /**
       * Resuelve un ID de especie a partir de un nombre crudo de columna/celda (común o científico).
       *
       * @param {unknown} rawName - Nombre crudo (ej.: encabezado "NUM Loco", "DENS Lessonia berteroana", etc.).
       * @returns {number|null} ID de especie, o `null` si no se puede determinar.
       *
       * Lógica (alto nivel):
       * 1) Limpia prefijos ("num"/"dens") y paréntesis.
       * 2) Aplica aliases científicos (`sciAliases`).
       * 3) Intenta match por inicial de género + epíteto (ej.: "L nigrescens").
       * 4) Intenta match directo por nombre común/científico normalizado.
       * 5) Como fallback, usa matching por tokens contenidos en com/sci y elige el mejor score.
       *
       * Dependencias externas:
       * - Maps: `speciesIdByKey`, `genusInitialEpithetToId`, `sciAliases`.
       * - Datos: `especies` (catálogo).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna `null` en entradas vacías o sin match.
       *
       * @example
       * resolveSpeciesId('NUM Lessonia nigrescens') // id de Lessonia berteroana (por alias)
       *
       * Notas de mantenimiento:
       * - Esta función concentra reglas de negocio de alias/matching; mantenerla cubierta por casos reales.
       */
      const resolveSpeciesId = (rawName) => {
        const baseRaw = String(rawName || '').replace(/\(.*?\)/g, '').trim()
        const base = baseRaw.replace(/^(num|dens)\s+/i, '').trim()
        const k = normHeader(base)
        if (!k) return null

        const manualId = manualSpeciesIdByKey.get(k)
        if (manualId != null) return manualId

        const aliasTo = sciAliases.get(k)
        if (aliasTo) {
          const idAlias = speciesIdByKey.get(aliasTo)
          if (idAlias != null) return idAlias
        }

        const compact = k.replace(/\s+/g, '')
        const m0 = compact.match(/^([a-z])([a-z]{3,})$/)
        if (m0) {
          const gi = m0[1]
          const ep = m0[2]
          const hit = genusInitialEpithetToId.get(`${gi} ${ep}`) ?? genusInitialEpithetToId.get(`${gi}${ep}`)
          if (hit != null) return hit
          const aliasKey = sciAliases.get(`${gi} ${ep}`) || sciAliases.get(`${gi}${ep}`)
          if (aliasKey) {
            const id2 = speciesIdByKey.get(aliasKey)
            if (id2 != null) return id2
          }
          if (gi === 'l') {
            const aliasKey2 = sciAliases.get(`lessonia ${ep}`)
            if (aliasKey2) {
              const id3 = speciesIdByKey.get(aliasKey2)
              if (id3 != null) return id3
            }
          }
        }

        const sciLike = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.-]+\s+[A-Za-zÁÉÍÓÚÑáéíóúñ.-]+/.test(baseRaw)
        if (sciLike) {
          const directSci = speciesIdByKey.get(k)
          if (directSci != null) return directSci
        }

        const direct = speciesIdByKey.get(k)
        if (direct != null) return direct

        const toks0 = k.split(' ').filter(Boolean)
        if (toks0.length >= 2 && toks0[0].length === 1) {
          const g0 = toks0[0]
          const epithet = toks0[1]
          const hit = genusInitialEpithetToId.get(`${g0} ${epithet}`) ?? genusInitialEpithetToId.get(`${g0}${epithet}`)
          if (hit != null) return hit
          const aliasKey = sciAliases.get(`${g0} ${epithet}`) || sciAliases.get(`${g0}${epithet}`) || sciAliases.get(`lessonia ${epithet}`)
          if (aliasKey) {
            const id2 = speciesIdByKey.get(aliasKey)
            if (id2 != null) return id2
          }
        }

        const tokens = k.split(' ').filter(Boolean)
        if (!tokens.length) return null
        let best = null
        for (const sp of especies) {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) continue
          const kc = normHeader(sp?.com)
          const ks = normHeader(sp?.sci)
          const ok = (kc && tokens.every((t) => kc.includes(t))) || (ks && tokens.every((t) => ks.includes(t)))
          if (!ok) continue
          const score = Math.min((kc || '').length || 9999, (ks || '').length || 9999)
          if (!best || score < best.score) best = { id, score }
        }
        return best?.id ?? null
      }

      /**
       * Índice de regiones por claves normalizadas (nombre, romano e id).
       *
       * @returns {Map<string, number>} Map `key -> regionId`.
       *
       * Lógica:
       * 1) Recorre `regionesChile`.
       * 2) Indexa `nom`, `rom` y el propio `id` como texto.
       *
       * Dependencias externas:
       * - `regionesChile` (catálogo en memoria).
       * - `normHeader` (helper local).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Se usa por `resolveRegionId` para tolerar entradas variadas del Excel.
       */
      const regionsByKey = (() => {
        const m = new Map()
        for (const r of regionesChile) {
          const id = String(r?.id ?? '')
          if (!id) continue
          const nom = normHeader(r?.nom)
          const rom = normHeader(r?.rom)
          if (nom) m.set(nom, r.id)
          if (rom) m.set(rom, r.id)
          m.set(normHeader(String(r?.id ?? '')), r.id)
        }
        return m
      })()

      /**
       * Resuelve el ID de región desde un valor crudo del Excel (número, romano o nombre).
       *
       * @param {unknown} raw - Valor crudo de región.
       * @returns {number} ID de región (fallback a la primera región si no se puede resolver).
       *
       * Lógica:
       * 1) Si `raw` es numérico, lo retorna.
       * 2) Normaliza el texto y busca match exacto en `regionsByKey`.
       * 3) Como fallback, busca inclusión parcial en `regionesChile`.
       * 4) Si no hay match, retorna la primera región o 1.
       *
       * Dependencias externas:
       * - `parseIntSafe`, `normHeader`.
       * - `regionsByKey`, `regionesChile`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna un default seguro.
       *
       * @example
       * resolveRegionId('III') // id de la Región III (si existe en DB)
       *
       * Notas de mantenimiento:
       * - Mantener `regionsByKey` construido con nom/rom/id para máxima tolerancia.
       */
      const resolveRegionId = (raw) => {
        const s = String(raw ?? '').trim()
        const n = parseIntSafe(s)
        if (n != null) return n
        const k = normHeader(s)
        if (!k) return regionesChile[0]?.id || 1
        const hit = regionsByKey.get(k)
        if (hit != null) return hit
        const hit2 = regionesChile.find((r) => normHeader(r?.nom).includes(k) || k.includes(normHeader(r?.nom)))
        return hit2?.id ?? (regionesChile[0]?.id || 1)
      }

      /**
       * Resuelve OPA (organización) desde un nombre crudo.
       *
       * @param {unknown} rawOrg - Nombre crudo de organización.
       * @returns {{ opaId: string, org: string }} ID OPA (si se encuentra) y nombre normalizado.
       *
       * Lógica:
       * 1) Normaliza `rawOrg`.
       * 2) Busca match exacto por nombre corto o nombre completo en `opaArr`.
       * 3) Si no hay exacto, busca inclusión parcial.
       * 4) Si no hay match, retorna opaId vacío y el texto original recortado.
       *
       * Dependencias externas:
       * - `normHeader`.
       * - `opaArr` (catálogo).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna valores seguros.
       *
       * @example
       * resolveOpa('Sindicato X') // { opaId: '...', org: '...' }
       *
       * Notas de mantenimiento:
       * - Si OPA se normaliza en backend, simplificar heurísticas.
       */
      const resolveOpa = (rawOrg) => {
        const k = normHeader(rawOrg)
        if (!k) return { opaId: '', org: String(rawOrg || '').trim() }
        const hit = opaArr.find((o) => normHeader(o?.nombrecorto) === k || normHeader(o?.nombre) === k)
        if (hit) return { opaId: String(hit.id), org: String(hit.nombre || hit.nombrecorto || rawOrg || '').trim() }
        const hit2 = opaArr.find(
          (o) =>
            (normHeader(o?.nombrecorto) && k.includes(normHeader(o?.nombrecorto))) ||
            (normHeader(o?.nombre) && k.includes(normHeader(o?.nombre))),
        )
        if (hit2) return { opaId: String(hit2.id), org: String(hit2.nombre || hit2.nombrecorto || rawOrg || '').trim() }
        return { opaId: '', org: String(rawOrg || '').trim() }
      }

      const aoaE = XLSX.utils.sheet_to_json(wb.Sheets[evadirSheetName], { header: 1, raw: true, defval: '' })
      const hdrRowIdx = guessHeaderRow(aoaE)
      const headerRow = Array.isArray(aoaE?.[hdrRowIdx]) ? aoaE[hdrRowIdx] : []
      if (!headerRow.length) {
        throw new ErrorImportacionEvadir('PLANTILLA_INVALIDA', 'No se pudo detectar la fila de encabezados en la hoja EVADIR. Revisa el formato de la planilla.')
      }
      const keys = headerRow.map(normHeader)
      const dataRows = (Array.isArray(aoaE) ? aoaE : [])
        .slice(hdrRowIdx + 1)
        .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))

      /**
       * Resuelve el índice de una columna en base a una lista de tests contra headers normalizados.
       *
       * @param {Array<string|RegExp>} tests - Tests (match exacto o regex) en `keys`.
       * @returns {number} Índice de columna encontrado o -1 si no hay match.
       *
       * Lógica:
       * 1) Recorre `keys` (headers ya normalizados con `normHeader`).
       * 2) Para cada key no vacía, intenta:
       *    - match exacto con strings,
       *    - match con `RegExp.test`.
       * 3) Retorna el primer índice que calza.
       *
       * Dependencias externas:
       * - `keys` (del scope de importación).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Tolerante a keys vacías.
       *
       * Notas de mantenimiento:
       * - Este helper concentra heurísticas de matching de columnas; ajustar tests si cambian plantillas.
       */
      const idxBy = (tests) => {
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i]
          if (!k) continue
          for (const t of tests) {
            if (typeof t === 'string' && k === t) return i
            if (t instanceof RegExp && t.test(k)) return i
          }
        }
        return -1
      }

      const iTipoUnidad = idxBy([/^tipo( de)? unidad$/, /^tipo unidad$/])
      const iRegion = idxBy(['region'])
      const iCaleta = idxBy([/caleta/, /sector\/caleta/])
      const iSector = iCaleta >= 0 ? iCaleta : idxBy([/nombre sector/, /^sector$/])
      const iTipoOrg = idxBy([/tipo de organizacion/, /tipo organizacion/, /^tipo org$/, /de organiza/])
      const iOrgNombre = idxBy([/^nombre organizacion$/, /nombre.*organizacion/, /^nombre org$/, /nombre.*org/])
      const iOrgGenerico = idxBy([/^organizacion$/, /organizacion/])

      /**
       * Resuelve el índice “más probable” de la columna Organización.
       *
       * @returns {number} Índice de columna para organización o -1.
       *
       * Lógica:
       * 1) Prioriza `iOrgNombre` si existe.
       * 2) Si solo existe una columna genérica `organizacion`, evita confundirla con `tipo organizacion`.
       * 3) Si está confundida, busca otra columna que contenga 'organizacion' pero no 'tipo'.
       *
       * Dependencias externas:
       * - `keys`, `iOrgNombre`, `iOrgGenerico`, `iTipoOrg`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Esta heurística existe por plantillas con headers similares; ajustar si cambian columnas reales.
       */
      const iOrg = (() => {
        if (iOrgNombre >= 0) return iOrgNombre
        if (iOrgGenerico < 0) return -1
        const k = keys[iOrgGenerico] || ''
        const isTipoCol = (iTipoOrg >= 0 && iOrgGenerico === iTipoOrg) || (k.includes('tipo') && k.includes('organiz'))
        if (!isTipoCol) return iOrgGenerico
        for (let i = 0; i < keys.length; i++) {
          const kk = keys[i] || ''
          if (!kk.includes('organizacion')) continue
          if (kk.includes('tipo')) continue
          return i
        }
        return -1
      })()
      const iFecha = idxBy(['fecha'])
      const iSeg = idxBy([/seg/, /esba/, /seguimiento/])
      const iZona = idxBy([/zona muestreo/, /^zona$/, /zona muestre/])
      const iBote = idxBy(['bote'])
      const iBuzo = idxBy(['buzo'])
      const iNumCuad = idxBy([/num.*cuadr/])
      const iNumTran = idxBy([/num.*transec/, /num.*transe/])
      const iNum = iNumCuad >= 0 ? iNumCuad : iNumTran >= 0 ? iNumTran : idxBy([/^num$/])
      const iAreaCuad = idxBy([/area.*cuadr/])
      const iAreaTran = idxBy([/area.*transec/, /area.*transe/])
      const iArea = iAreaCuad >= 0 ? iAreaCuad : iAreaTran >= 0 ? iAreaTran : idxBy([/^area$/])
      const iSustrato = idxBy([/tipo sustrato/, /tipo de sustrato/, /sustrato/])
      const iCubierta = idxBy([/cubierta biologica/, /cubierta/])
      const iX = idxBy(['x'])
      const iY = idxBy(['y'])

      /**
       * Resuelve el índice de una columna comparando el header crudo en UPPERCASE (sin normalización).
       *
       * Esto es útil para columnas que en plantillas EVADIR aparecen como siglas exactas (ej: 'LONG', 'LAT').
       *
       * @param {string} rawUpper - Header esperado en UPPERCASE (match exacto).
       * @returns {number} Índice de columna encontrado o -1 si no existe.
       *
       * Lógica:
       * 1) Itera `headerRow` (celdas originales).
       * 2) Convierte a string, trim y uppercase.
       * 3) Compara con `rawUpper`.
       *
       * Dependencias externas:
       * - `headerRow` (del scope de importación).
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Mantener este helper separado de `idxBy` para no introducir falsos positivos por normalización.
       */
      const idxByRawUpper = (rawUpper) => {
        for (let i = 0; i < headerRow.length; i++) {
          const h = String(headerRow[i] ?? '').trim().toUpperCase()
          if (h === rawUpper) return i
        }
        return -1
      }
      const iLong = (() => {
        const exact = idxByRawUpper('LONG')
        if (exact >= 0) return exact
        return idxBy(['long'])
      })()
      const iLat = (() => {
        const exact = idxByRawUpper('LAT')
        if (exact >= 0) return exact
        return idxBy(['lat'])
      })()
      const iDatum = idxBy(['datum'])

      const columnasObligatoriasFaltantes = []
      if (iBote < 0) columnasObligatoriasFaltantes.push('BOTE')
      if (iZona < 0) columnasObligatoriasFaltantes.push('ZONA MUESTREO')
      if (iNum < 0) columnasObligatoriasFaltantes.push('NUM TRANSECTO / NUM CUADRANTE')
      if (columnasObligatoriasFaltantes.length) {
        throw new ErrorImportacionEvadir(
          'PLANTILLA_INVALIDA',
          `La plantilla EVADIR no tiene columnas obligatorias: ${columnasObligatoriasFaltantes.join(', ')}.`,
          { columnasObligatoriasFaltantes },
        )
      }

      const numCols = []
      for (let c = 0; c < headerRow.length; c++) {
        const rawH = String(headerRow[c] ?? '').trim()
        const k = normHeader(rawH)
        if (!k) continue
        if (k.startsWith('dens')) continue
        const isMetaNumCol =
          (iSeg >= 0 && c === iSeg) ||
          (iZona >= 0 && c === iZona) ||
          (iNum >= 0 && c === iNum) ||
          (iNumTran >= 0 && c === iNumTran) ||
          (iNumCuad >= 0 && c === iNumCuad) ||
          (iArea >= 0 && c === iArea) ||
          (iX >= 0 && c === iX) ||
          (iY >= 0 && c === iY) ||
          (iLong >= 0 && c === iLong) ||
          (iLat >= 0 && c === iLat)

        if (k.startsWith('num ')) {
          if (!isMetaNumCol) numCols.push({ c, name: rawH })
        }
      }

      const importMetaSpeciesColumns = {}

      const savedMappingStore = readCustomSpeciesMappings()
      const userMappingKey = getUserMappingKey()
      const savedUserMappings =
        savedMappingStore?.users && typeof savedMappingStore.users === 'object'
          ? savedMappingStore.users[userMappingKey]?.mappings
          : null
      const savedByHeaderKey = savedUserMappings && typeof savedUserMappings === 'object' ? savedUserMappings : {}

      const applySavedMappingForHeader = (rawHeader) => {
        const hdr = String(rawHeader || '').trim()
        if (!hdr) return
        const key = normHeader(hdr)
        if (!key) return
        const rawField = savedByHeaderKey[key]
        const parsed = normalizeSpeciesFieldId(rawField)
        if (!parsed) return
        const baseKey = baseSpeciesKeyFromHeader(hdr)
        if (!baseKey) return
        manualSpeciesIdByKey.set(baseKey, parsed.spId)
        manualMappedColumnNames.add(hdr)
      }

      numCols.forEach((col) => applySavedMappingForHeader(col?.name))

      const buildSpeciesFields = (especiesArr) => {
        const out = []
        ;(Array.isArray(especiesArr) ? especiesArr : []).forEach((sp) => {
          const id = Number(sp?.id)
          if (!Number.isFinite(id)) return
          const com = String(sp?.com || '').trim()
          const sci = String(sp?.sci || '').trim()
          const labelBase = com || sci || `Especie ${id}`
          const extra = com && sci && com !== sci ? ` (${sci})` : ''
          out.push({ id: `NUM:${id}`, label: `NUM ${labelBase}${extra}`, required: false })
        })
        return out
      }

      const hasAnyNumericValue = (rows, colIdx) => {
        const maxScan = Math.min(Array.isArray(rows) ? rows.length : 0, 220)
        for (let i = 0; i < maxScan; i++) {
          const v = rows?.[i]?.[colIdx]
          const n = parseNumSafe(v)
          if (n != null && n > 0) return true
        }
        return false
      }

      const sampleDataForColumn = (rows, colIdx) => {
        const maxScan = Math.min(Array.isArray(rows) ? rows.length : 0, 220)
        const out = []
        const seen = new Set()
        for (let i = 0; i < maxScan; i++) {
          const v = rows?.[i]?.[colIdx]
          const s = String(v ?? '').trim()
          if (!s) continue
          if (seen.has(s)) continue
          seen.add(s)
          out.push(s)
          if (out.length >= 5) break
        }
        return out
      }

      const resolvePendingEvadirSpeciesColumns = async () => {
        const candidates = [...numCols]
        const pending = []
        candidates.forEach((col) => {
          const colName = String(col?.name || '').trim()
          if (!colName) return
          const spId = resolveSpeciesId(colName)
          if (spId != null) return
          if (!hasAnyNumericValue(dataRows, col.c)) return
          pending.push({ name: colName, sampleData: sampleDataForColumn(dataRows, col.c) })
        })

        if (!pending.length) return true

        const camposSistema = buildSpeciesFields(especies)
        const initialMappingByColumn = {}
        pending.forEach((c) => {
          const key = normHeader(c.name)
          if (!key) return
          const rawField = savedByHeaderKey[key]
          if (!rawField) return
          const parsed = normalizeSpeciesFieldId(rawField)
          if (!parsed) return
          initialMappingByColumn[c.name] = String(rawField)
        })

        const result = await new Promise((resolve) => {
          const onConfirm = (payload) => {
            if (!payload) closeModal()
            resolve(payload)
          }
          openModal(
            'Mapeo manual: columnas de especies',
            <ManualColumnMapper
              unmappedColumns={pending}
              systemSpeciesFields={camposSistema}
              initialMappingByColumn={initialMappingByColumn}
              onConfirm={onConfirm}
            />,
            'wide',
          )
        })

        if (!result || !result.mappingByColumn) return false

        const mappingByColumn = result.mappingByColumn && typeof result.mappingByColumn === 'object' ? result.mappingByColumn : {}
        Object.entries(mappingByColumn).forEach(([rawHeader, fieldId]) => {
          const hdr = String(rawHeader || '').trim()
          const v = String(fieldId || '').trim()
          if (!hdr) return
          if (!v || v === '__ignore__') return
          const parsed = normalizeSpeciesFieldId(v)
          if (!parsed) return
          const baseKey = baseSpeciesKeyFromHeader(hdr)
          if (!baseKey) return
          manualSpeciesIdByKey.set(baseKey, parsed.spId)
          manualMappedColumnNames.add(hdr)
        })

        try {
          const logKey = 'bitecma_manual_species_mappings_log_v1'
          const rawLog = localStorage.getItem(logKey)
          const prev = rawLog ? JSON.parse(rawLog) : []
          const arr = Array.isArray(prev) ? prev : []
          const mappings = Object.entries(mappingByColumn)
            .map(([excelColumnName, fieldId]) => ({ excelColumnName: String(excelColumnName || '').trim(), fieldId: String(fieldId || '').trim() }))
            .filter((x) => x.excelColumnName && x.fieldId && x.fieldId !== '__ignore__' && normalizeSpeciesFieldId(x.fieldId))
          if (mappings.length) {
            const entry = {
              ts: Date.now(),
              user: userMappingKey,
              fileName: String(file?.name || '').trim(),
              mappings,
            }
            const next = [...arr, entry].slice(-500)
            localStorage.setItem(logKey, JSON.stringify(next))
          }
        } catch {
          null
        }

        if (result.guardarPreferencias) {
          const merged = { ...savedByHeaderKey }
          Object.entries(mappingByColumn).forEach(([rawHeader, fieldId]) => {
            const hdr = String(rawHeader || '').trim()
            const v = String(fieldId || '').trim()
            if (!hdr) return
            const key = normHeader(hdr)
            if (!key) return
            if (!v || v === '__ignore__') {
              delete merged[key]
              return
            }
            if (!normalizeSpeciesFieldId(v)) return
            merged[key] = v
          })
          const nextStore = { ...(savedMappingStore || { version: 1, users: {} }) }
          const users = nextStore.users && typeof nextStore.users === 'object' ? nextStore.users : {}
          nextStore.users = users
          nextStore.users[userMappingKey] = { ...(users[userMappingKey] || {}), mappings: merged }
          writeCustomSpeciesMappings(nextStore)
        }

        return true
      }

      const pendingEvadirOk = await resolvePendingEvadirSpeciesColumns()
      if (!pendingEvadirOk) return
      await esperarSiguienteTick()
      checkCancel()

      await openProcesando('Analizando filas EVADIR y preparando borrador de operación…')

      const clavesBoteAmbiguas = new Set(['n a', 'na', 'intermareal', 'intermarea'])
      const submarealPorClaveBoteAmbigua = new Map()

      const esNombreBoteAmbiguo = (nombre) => {
        const k = normText(nombre)
        return k && clavesBoteAmbiguas.has(k)
      }

      const preguntarTipoMuestreoParaNombreBoteAmbiguo = async (nombreBoteRaw) => {
        const clave = normText(nombreBoteRaw)
        if (!clave || !clavesBoteAmbiguas.has(clave)) return null
        if (submarealPorClaveBoteAmbigua.has(clave)) return submarealPorClaveBoteAmbigua.get(clave)

        const result = await new Promise((resolve) => {
          const onPick = (tipo) => {
            closeModal()
            resolve(tipo)
          }
          openModal(
            'Tipo de muestreo detectado',
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="info-box amber" style={{ marginBottom: 0 }}>
                <span>i</span>
                <div style={{ minWidth: 0 }}>
                  Se detectó un valor de bote ambiguo: <strong>{String(nombreBoteRaw || '—')}</strong>.
                  <div style={{ marginTop: 6, color: 'var(--text2)' }}>
                    Esto puede significar que el bote no tiene nombre (Submareal) o que no hay bote porque fue Intermareal (a pie).
                  </div>
                  <div style={{ marginTop: 6, color: 'var(--text2)' }}>
                    ¿De qué tipo es?
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" className="btn b-out" onClick={() => onPick(true)}>
                  Submareal
                </button>
                <button type="button" className="btn b-teal" onClick={() => onPick(false)}>
                  Intermareal
                </button>
                <button type="button" className="btn b-out" onClick={() => onPick(null)}>
                  Cancelar importación
                </button>
              </div>
            </div>,
            'slim',
          )
        })

        if (result == null) throw new ErrorImportacionEvadir('CANCELADO', 'Importación cancelada por el usuario.')
        submarealPorClaveBoteAmbigua.set(clave, result)
        await openProcesando(pasoActual)
        return result
      }

      const recordSpeciesColumnMeta = (kind, colName, spId) => {
        const k = String(kind || '').toLowerCase()
        if (k !== 'num') return
        const id = Number(spId)
        if (!Number.isFinite(id)) return
        const raw = String(colName || '').trim()
        if (!raw) return
        const source = manualMappedColumnNames.has(raw) ? 'manual' : 'auto'
        if (!importMetaSpeciesColumns[id]) importMetaSpeciesColumns[id] = {}
        if (!importMetaSpeciesColumns[id][k]) importMetaSpeciesColumns[id][k] = { source, excelColumnName: raw }
      }

      numCols.forEach((col) => {
        const spId = resolveSpeciesId(col?.name)
        if (spId == null) return
        recordSpeciesColumnMeta('num', col?.name, spId)
      })

      const paresBoteZona = dataRows.map((row) => ({
        nombreBote: String(iBote >= 0 ? row?.[iBote] ?? '' : '').trim(),
        zonaRaw: iZona >= 0 ? row?.[iZona] ?? null : null,
      }))
      const { botesConMultiplesZonas, filasZonaInvalida } = analizarBotesMultiZonaDesdePares(paresBoteZona)
      if (filasZonaInvalida.length) {
        const total = filasZonaInvalida.length
        const ejemplo = filasZonaInvalida
          .slice(0, 4)
          .map((x) => `${String(x?.nombreBote || '—').slice(0, 24)} → zona "${String(x?.zonaRaw ?? '').slice(0, 18) || '—'}"`)
          .join(', ')
        toast(`EVADIR: ${total} fila(s) con zona inválida/vacía (se usó zona 1). Ej: ${ejemplo}`, 'blue')
      }
      if (botesConMultiplesZonas.length) {
        const ejemplos = botesConMultiplesZonas
          .slice(0, 5)
          .map((x) => `${x.nombreBoteNorm} (${x.zonas.join(', ')})`)
          .join(' · ')
        toast(`EVADIR: se detectaron botes con múltiples zonas. Se separarán automáticamente. Ej: ${ejemplos}`, 'blue')
      }

      const metaRows = []
      const boatMap = new Map()
      const unmatchedEvadirColsUsed = new Map()
      const allDates = []

      for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
        await yieldCada(rowIdx, 900)
        const row = dataRows[rowIdx]
        const rawBote = iBote >= 0 ? row[iBote] : ''
        const bote = String(rawBote ?? '').trim()
        const { zona } = normalizarZonaParaClave(iZona >= 0 ? row[iZona] : null)
        if (!bote) continue

        const buzo = String(iBuzo >= 0 ? row[iBuzo] ?? '' : '').trim()
        const num = parseIntSafe(iNum >= 0 ? row[iNum] : null)
        if (num == null) continue

        const submareal = esNombreBoteIntermarealDirecto(bote)
          ? false
          : esNombreBoteAmbiguo(bote)
            ? await preguntarTipoMuestreoParaNombreBoteAmbiguo(bote)
            : true
        const nombreBoteFinal = !submareal ? '' : esNombreBoteAmbiguo(bote) ? 'N/A' : bote

        const tipoFromHdr = iNumCuad >= 0 ? 'cuadrante' : 'transecto'
        const tipoFromRow = (() => {
          if (iTipoUnidad < 0) return null
          const v = String(row[iTipoUnidad] ?? '').toLowerCase()
          if (v.includes('cuadr')) return 'cuadrante'
          if (v.includes('tran')) return 'transecto'
          return null
        })()
        const tipo = tipoFromRow || tipoFromHdr

        const area = parseNumSafe(iArea >= 0 ? row[iArea] : null) ?? 0
        const fecha = parseDateISO(iFecha >= 0 ? row[iFecha] : null, XLSX) || ''
        if (fecha) allDates.push(fecha)

        const sustrato = String(iSustrato >= 0 ? row[iSustrato] ?? '' : '').trim()
        const cubierta = String(iCubierta >= 0 ? row[iCubierta] ?? '' : '').trim()
        const coordX = parseNumSafe(iX >= 0 ? row[iX] : null)
        const coordY = parseNumSafe(iY >= 0 ? row[iY] : null)
        const coordLong = parseNumSafe(iLong >= 0 ? row[iLong] : null)
        const coordLat = parseNumSafe(iLat >= 0 ? row[iLat] : null)
        const datum = String(iDatum >= 0 ? row[iDatum] ?? '' : '').trim()

        const counts = {}
        if (numCols.length) {
          for (const col of numCols) {
            const spId = resolveSpeciesId(col.name)
            const rawV = row[col.c]
            const n = parseIntSafe(rawV)
            if (spId == null) {
              if (n != null && n > 0) {
                const keyUn = String(col.name || '').trim()
                if (keyUn) unmatchedEvadirColsUsed.set(keyUn, (unmatchedEvadirColsUsed.get(keyUn) || 0) + 1)
              }
              continue
            }
            if (n == null) continue
            counts[spId] = Math.max(0, n)
          }
        }

        let especieId = null
        if (tipo === 'cuadrante') {
          const entries = Object.entries(counts)
          const pos = entries.find(([, v]) => Number(v) > 0)
          especieId = pos ? Number(pos[0]) : entries.length ? Number(entries[0][0]) : null
        }

        const boteKeyBase = !submareal
          ? `intermareal::${normHeader(buzo) || '__sin_buzo__'}`
          : normalizarNombreBoteParaMatch(nombreBoteFinal) || normHeader(nombreBoteFinal) || nombreBoteFinal
        const key = `${zona}::${boteKeyBase}`
        if (!boatMap.has(key)) {
          boatMap.set(key, {
            zona,
            submareal,
            nombre: nombreBoteFinal,
            buzo: buzo || '',
            transectosByKey: new Map(),
            lpMuestras: {},
          })
        }
        const b = boatMap.get(key)
        if (!b.buzo && buzo) b.buzo = buzo
        if (submareal) {
          if (String(b.nombre || '').trim().length < String(nombreBoteFinal || '').trim().length) b.nombre = nombreBoteFinal
        }

        const uKey = `${tipo}:${num}`
        if (!b.transectosByKey.has(uKey)) {
          b.transectosByKey.set(uKey, {
            num,
            tipo,
            area,
            fecha: fecha || '',
            sustrato,
            cubierta,
            counts: {},
            ...(tipo === 'cuadrante' && especieId != null ? { especieId } : {}),
            ...(coordX != null ? { coordX } : {}),
            ...(coordY != null ? { coordY } : {}),
            ...(coordLong != null ? { coordLong } : {}),
            ...(coordLat != null ? { coordLat } : {}),
            ...(datum ? { datum } : {}),
          })
        }
        const u = b.transectosByKey.get(uKey)
        if (area) u.area = area
        if (fecha) u.fecha = fecha
        if (sustrato) u.sustrato = sustrato
        if (cubierta) u.cubierta = cubierta
        if (coordX != null) u.coordX = coordX
        if (coordY != null) u.coordY = coordY
        if (coordLong != null) u.coordLong = coordLong
        if (coordLat != null) u.coordLat = coordLat
        if (datum) u.datum = datum
        Object.entries(counts).forEach(([k, v]) => {
          u.counts[k] = v
        })

        metaRows.push(row)
      }

      if (!boatMap.size) {
        throw new ErrorImportacionEvadir(
          'SIN_FILAS_VALIDAS',
          'La hoja EVADIR no contiene filas válidas. Revisa que existan datos bajo los encabezados y que BOTE/ZONA/NUM estén completos.',
        )
      }

      const mergedBoats = (() => {
        /**
         * Normaliza una entrada de `lpMuestras` a formato `{ LP?, L?, D? }`.
         *
         * @param {unknown} entry - Entrada cruda por especie (formatos heredados o actuales).
         * @returns {{ LP?: any[], L?: any[], D?: any[] }} Mapa por tipo.
         *
         * Lógica:
         * - Si es array, infiere tipo por shape (d/p/l) y agrupa.
         * - Si es objeto con `{ ms }`, usa `type` como selector.
         * - Si es objeto con claves `LP/L/D`, conserva arreglos válidos.
         *
         * Dependencias externas:
         * - Ninguna (helpers embebidos para mantener el importador autocontenido).
         *
         * Efectos secundarios:
         * - Ninguno.
         *
         * Notas de mantenimiento:
         * - Mantener alineado con `lpMuestrasService.normalizeEntry` si se unifica lógica en un solo lugar.
         */
        const normalizeEntry = (entry) => {
          if (Array.isArray(entry)) {
            const out = {}
            entry.forEach((m) => {
              const s = m && typeof m === 'object' ? m : {}
              const k = Object.prototype.hasOwnProperty.call(s, 'd') ? 'D' : Object.prototype.hasOwnProperty.call(s, 'p') ? 'LP' : 'L'
              if (!out[k]) out[k] = []
              out[k].push(m)
            })
            return out
          }
          if (entry && typeof entry === 'object') {
            if (Array.isArray(entry.ms)) {
              const k0 = String(entry.type || 'LP').trim().toUpperCase()
              const k = k0 === 'L-P' || k0 === 'LP' ? 'LP' : k0 === 'D' ? 'D' : 'L'
              return { [k]: Array.isArray(entry.ms) ? entry.ms : [] }
            }
            const out = {}
            ;['LP', 'L', 'D'].forEach((k) => {
              if (Array.isArray(entry[k])) out[k] = entry[k]
            })
            return out
          }
          return {}
        }

        /**
         * Fusiona dos mapas `lpMuestras`, concatenando muestras por especie y tipo.
         *
         * @param {unknown} a - Mapa base (puede ser null/formatos mixtos).
         * @param {unknown} b - Mapa entrante (puede ser null/formatos mixtos).
         * @returns {object} Nuevo mapa fusionado.
         *
         * Lógica:
         * 1) Clona `a` como base.
         * 2) Para cada especie en `b`:
         *    - si no existe, asigna directo,
         *    - si existe, normaliza ambos entries y concatena arrays por tipo.
         *
         * Dependencias externas:
         * - `normalizeEntry` (helper local del merge).
         *
         * Efectos secundarios:
         * - Ninguno.
         *
         * Notas de mantenimiento:
         * - No deduplica muestras; asume que entradas vienen de fuentes distintas (EVADIR vs LP).
         */
        const mergeLpMuestras = (a, b) => {
          const ma = a && typeof a === 'object' ? a : {}
          const mb = b && typeof b === 'object' ? b : {}
          const out = { ...ma }
          for (const [spId, entryB] of Object.entries(mb)) {
            if (!Object.prototype.hasOwnProperty.call(out, spId)) {
              out[spId] = entryB
              continue
            }
            const entryA = out[spId]
            const na = normalizeEntry(entryA)
            const nb = normalizeEntry(entryB)
            const next = { ...na }
            ;['LP', 'L', 'D'].forEach((k) => {
              const aa = Array.isArray(na[k]) ? na[k] : []
              const bb = Array.isArray(nb[k]) ? nb[k] : []
              if (aa.length || bb.length) next[k] = [...aa, ...bb]
            })
            out[spId] = next
          }
          return out
        }

        /**
         * Fusiona dos unidades (transecto/cuadrante) preservando el “mejor” dato disponible.
         *
         * @param {unknown} a - Unidad base.
         * @param {unknown} b - Unidad entrante.
         * @returns {object} Unidad fusionada.
         *
         * Lógica:
         * 1) Preserva datos existentes de `a` y completa desde `b` solo cuando faltan.
         * 2) Para `counts`, combina claves y toma el máximo por especie.
         *
         * Dependencias externas:
         * - Ninguna.
         *
         * Efectos secundarios:
         * - Ninguno.
         *
         * Notas de mantenimiento:
         * - Se usa para deduplicar cuando una misma unidad aparece en múltiples filas/hojas.
         */
        const mergeUnidad = (a, b) => {
          const out = { ...(a && typeof a === 'object' ? a : {}) }
          const src = b && typeof b === 'object' ? b : {}
          if ((Number(out.area) || 0) <= 0 && (Number(src.area) || 0) > 0) out.area = src.area
          if (!out.fecha && src.fecha) out.fecha = src.fecha
          if (!out.sustrato && src.sustrato) out.sustrato = src.sustrato
          if (!out.cubierta && src.cubierta) out.cubierta = src.cubierta
          if (out.coordX == null && src.coordX != null) out.coordX = src.coordX
          if (out.coordY == null && src.coordY != null) out.coordY = src.coordY
          if (out.coordLong == null && src.coordLong != null) out.coordLong = src.coordLong
          if (out.coordLat == null && src.coordLat != null) out.coordLat = src.coordLat
          if (!out.datum && src.datum) out.datum = src.datum
          if (out.especieId == null && src.especieId != null) out.especieId = src.especieId
          const ca = out.counts && typeof out.counts === 'object' ? out.counts : {}
          const cb = src.counts && typeof src.counts === 'object' ? src.counts : {}
          const counts = { ...ca }
          Object.entries(cb).forEach(([k, v]) => {
            if (counts[k] == null) counts[k] = v
            else counts[k] = Math.max(Number(counts[k]) || 0, Number(v) || 0)
          })
          out.counts = counts
          return out
        }

        const out = new Map()
        for (const b of boatMap.values()) {
          const submareal = b?.submareal == null ? true : !!b.submareal
          const nameKey = normalizarNombreBoteParaMatch(b?.nombre) || normHeader(b?.nombre) || String(b?.nombre || '').trim()
          const buzoKey = normHeader(b?.buzo) || '__sin_buzo__'
          const mergeKey = `${normalizarZonaParaClave(b?.zona).zona}::${submareal ? 'submareal' : 'intermareal'}::${submareal ? nameKey : buzoKey}`
          if (!out.has(mergeKey)) {
            out.set(mergeKey, {
              zona: b.zona,
              submareal,
              nombre: submareal ? b.nombre : '',
              buzo: b.buzo,
              transectosByKey: new Map(b.transectosByKey),
              lpMuestras: b.lpMuestras || {},
            })
            continue
          }
          const cur = out.get(mergeKey)
          if (submareal) {
            if (String(cur.nombre || '').trim().length < String(b.nombre || '').trim().length) cur.nombre = b.nombre
          }
          if (!cur.buzo && b.buzo) cur.buzo = b.buzo
          for (const [uKey, u] of b.transectosByKey.entries()) {
            if (!cur.transectosByKey.has(uKey)) cur.transectosByKey.set(uKey, u)
            else cur.transectosByKey.set(uKey, mergeUnidad(cur.transectosByKey.get(uKey), u))
          }
          cur.lpMuestras = mergeLpMuestras(cur.lpMuestras, b.lpMuestras)
        }
        return Array.from(out.values())
      })()

      const regionRaw = iRegion >= 0 ? firstNonEmpty(metaRows, iRegion) : ''
      const sectorRaw = iSector >= 0 ? firstNonEmpty(metaRows, iSector) : ''
      const tipoOrgRaw = iTipoOrg >= 0 ? firstNonEmpty(metaRows, iTipoOrg) : ''
      const orgRaw = iOrg >= 0 ? firstNonEmpty(metaRows, iOrg) : ''
      const segRaw = iSeg >= 0 ? firstNonEmpty(metaRows, iSeg) : ''

      const regionId = resolveRegionId(regionRaw)
      const { opaId, org } = resolveOpa(orgRaw)
      const tipoOrg = String(tipoOrgRaw || 'STI').trim() || 'STI'
      const sector = String(sectorRaw || '').trim()
      if (!sector) {
        toast('No se detectó Caleta/Sector en la hoja EVADIR', 'red')
        return
      }
      const segNum = parseIntSafe(segRaw)

      const fechas = allDates.filter(Boolean).sort()
      const fechaInicio = fechas[0] || todayISO()
      const fechaFin = fechas.length ? fechas[fechas.length - 1] : fechaInicio
      const year = fechaInicio.slice(0, 4)

      const opId = nextOpId(Array.isArray(operaciones) ? operaciones : [], year)

      const botesOut = Array.from(mergedBoats)
        .sort((a, b) => {
          const zonaCmp = compararZonaMuestreo(a?.zona, b?.zona)
          if (zonaCmp) return zonaCmp
          return String(a?.nombre || '').localeCompare(String(b?.nombre || ''))
        })
        .map((b, i) => {
          const transectos = Array.from(b.transectosByKey.values()).sort((x, y) => (x.num || 0) - (y.num || 0))
          const hasTx = transectos.some((t) => t?.tipo !== 'cuadrante')
          const hasCuad = transectos.some((t) => t?.tipo === 'cuadrante')
          const densTipo = hasCuad && !hasTx ? 'cuadrante' : 'transecto'
          return { id: `B${i + 1}`, zona: b.zona, submareal: b?.submareal == null ? true : !!b.submareal, nombre: b.nombre, buzo: b.buzo, densTipo, lpMuestras: b.lpMuestras || {}, transectos }
        })

      /**
       * Parsea una hoja candidata a LP/L/D a una estructura mínima para iteración.
       *
       * @param {any} ws - Worksheet de XLSX (wb.Sheets[sheetName]).
       * @returns {{ rows:any[], iz:number, ib:number, ibu:number, ie:number, il:number, ip:number, id:number, kind:'LP'|'L'|'D' }|null}
       * Estructura parseada, o `null` si la hoja no parece una hoja de muestreos.
       *
       * Lógica:
       * 1) Convierte worksheet a AOA (`header: 1`).
       * 2) Detecta fila de encabezados con `guessHeaderRow`.
       * 3) Ubica índices de columnas relevantes (zona, bote, buzo, especie, longitud, peso, diámetro).
       * 4) Determina `kind`:
       *    - Si hay diámetro -> D,
       *    - si hay peso -> LP,
       *    - si hay longitud -> L.
       * 5) Retorna estructura o `null` si no hay columnas suficientes.
       *
       * Dependencias externas:
       * - `guessHeaderRow`, `normHeader`.
       * - `XLSX.utils.sheet_to_json`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna `null` si faltan columnas clave.
       *
       * @example
       * const parsed = parseLpSheet(wb.Sheets['LP Loco'])
       *
       * Notas de mantenimiento:
       * - Ajustar patrones de `idx` si cambian nombres de columnas en plantillas.
       */
      const parseLpSheet = (ws) => {
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
        const hr = guessHeaderRow(aoa)
        const hdr = Array.isArray(aoa?.[hr]) ? aoa[hr] : []
        const ks = hdr.map(normHeader)
        const rows = (Array.isArray(aoa) ? aoa : []).slice(hr + 1).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))
        const idx = (tests) => {
          for (let i = 0; i < ks.length; i++) {
            const k = ks[i]
            if (!k) continue
            for (const t of tests) {
              if (typeof t === 'string' && k === t) return i
              if (t instanceof RegExp && t.test(k)) return i
            }
          }
          return -1
        }
        const iz = idx([/zona/])
        const ib = idx(['bote'])
        const ibu = idx(['buzo'])
        const ie = idx([/especie/])
        const il = idx([/longitud/])
        const ip = idx([/peso/])
        const id = idx([/diam/, /disco/])
        if (ib < 0) return null
        const kind = id >= 0 ? 'D' : ip >= 0 ? 'LP' : il >= 0 ? 'L' : null
        if (!kind) return null
        return { rows, iz, ib, ibu, ie, il, ip, id, kind }
      }

      const boatCandidates = botesOut.map((b) => ({
        b,
        zona: normalizarZonaMuestreo(b?.zona),
        raw: String(b?.nombre || '').trim(),
        norm: normalizarNombreBoteParaMatch(b?.nombre),
      }))

      /**
       * Índice de botes por `zona::nombreNormalizado` (match exacto con desambiguación por zona).
       *
       * @returns {Map<string, object>} Map `zona::norm -> bote`.
       *
       * Dependencias externas:
       * - `boatCandidates`.
       *
       * Efectos secundarios:
       * - Ninguno.
       */
      const boatByZonaNorm = (() => {
        const m = new Map()
        boatCandidates.forEach((x) => {
          if (!x.norm) return
          m.set(`${x.zona}::${x.norm}`, x.b)
        })
        return m
      })()

      /**
       * Índice de botes por `nombreNormalizado` (match exacto sin zona).
       *
       * @returns {Map<string, object>} Map `norm -> bote` (primera ocurrencia).
       *
       * Dependencias externas:
       * - `boatCandidates`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Notas de mantenimiento:
       * - Mantiene la primera ocurrencia para evitar reemplazos inestables; usar `boatByZonaNorm` cuando sea posible.
       */
      const boatByNorm = (() => {
        const m = new Map()
        boatCandidates.forEach((x) => {
          if (!x.norm) return
          if (!m.has(x.norm)) m.set(x.norm, x.b)
        })
        return m
      })()

      const registrarBoteEnIndices = (bote) => {
        const candidato = {
          b: bote,
          zona: normalizarZonaMuestreo(bote?.zona),
          raw: String(bote?.nombre || '').trim(),
          norm: normalizarNombreBoteParaMatch(bote?.nombre),
        }
        boatCandidates.push(candidato)
        if (candidato.norm) {
          boatByZonaNorm.set(`${candidato.zona}::${candidato.norm}`, bote)
          if (!boatByNorm.has(candidato.norm)) boatByNorm.set(candidato.norm, bote)
        }
      }

      const intermarealByZonaBuzo = (() => {
        const m = new Map()
        botesOut.forEach((b) => {
          const submareal = b?.submareal == null ? true : b?.submareal === true || b?.submareal === 1 || b?.submareal === '1'
          if (submareal) return
          const zona = normalizarZonaMuestreo(b?.zona) || '1'
          const buzoKey = normHeader(b?.buzo) || '__sin_buzo__'
          m.set(`${zona}::${buzoKey}`, b)
        })
        return m
      })()

      const ensureSubmarealBoteNa = (zonaRaw) => {
        const zona = normalizarZonaMuestreo(zonaRaw) || '1'
        const targetNorm = normalizarNombreBoteParaMatch('N/A')
        const existing =
          botesOut.find(
            (b) =>
              (b?.submareal == null ? true : b?.submareal === true || b?.submareal === 1 || b?.submareal === '1') &&
              normalizarZonaMuestreo(b?.zona) === zona &&
              normalizarNombreBoteParaMatch(b?.nombre) === targetNorm,
          ) || null
        if (existing) return existing
        const nuevo = {
          id: `B${botesOut.length + 1}`,
          zona,
          submareal: true,
          nombre: 'N/A',
          buzo: '',
          densTipo: 'transecto',
          lpMuestras: {},
          transectos: [],
        }
        botesOut.push(nuevo)
        registrarBoteEnIndices(nuevo)
        return nuevo
      }

      const ensureIntermarealBote = (zonaRaw, buzoNombre) => {
        const zona = normalizarZonaMuestreo(zonaRaw) || '1'
        const buzoKey = normHeader(buzoNombre) || '__sin_buzo__'
        const key = `${zona}::${buzoKey}`
        if (intermarealByZonaBuzo.has(key)) return intermarealByZonaBuzo.get(key)
        const nuevo = {
          id: `B${botesOut.length + 1}`,
          zona,
          submareal: false,
          nombre: '',
          buzo: String(buzoNombre || '').trim(),
          densTipo: 'transecto',
          lpMuestras: {},
          transectos: [],
        }
        botesOut.push(nuevo)
        intermarealByZonaBuzo.set(key, nuevo)
        return nuevo
      }

      const ensureSubmarealBoteDesdeBiometria = (zonaRaw, nombreBoteRaw, buzoNombre) => {
        const { bote, creado } = resolverOCrearBoteSubmarealFaltante(botesOut, zonaRaw, nombreBoteRaw, buzoNombre)
        if (!bote) return null
        if (!creado) return bote
        botesOut.push(bote)
        registrarBoteEnIndices(bote)
        return bote
      }

      /**
       * Resuelve el bote correspondiente a una fila de muestreos LP/L/D.
       *
       * @param {unknown} boteRaw - Celda de bote (o nombre alternativo).
       * @param {unknown} zonaRaw - Celda de zona (puede ayudar a desambiguar).
       * @returns {object|null} Objeto bote del borrador, o `null` si no se puede resolver.
       *
       * Lógica:
       * 1) Normaliza nombre y zona.
       * 2) Busca match exacto por `zona::normName`.
       * 3) Si falla, busca match por `normName` sin zona.
       * 4) Como fallback, aplica matching por inclusión sobre candidatos.
       *
       * Dependencias externas:
       * - `parseIntSafe`, `normBoat`.
       * - Maps: `boatByZonaNorm`, `boatByNorm`, `boatCandidates`.
       *
       * Efectos secundarios:
       * - Ninguno.
       *
       * Manejo de errores:
       * - Retorna `null` si no hay match.
       *
       * @example
       * const b = resolveBoatFromLp('Bote 1', 2)
       *
       * Notas de mantenimiento:
       * - Mantener `normBoat` alineado con cómo se generan nombres en EVADIR.
       */
      const resolveBoatFromLp = (boteRaw, zonaRaw) => {
        const name = String(boteRaw || '').trim()
        if (!name) return null
        const zona = normalizarZonaMuestreo(zonaRaw)
        const n = normalizarNombreBoteParaMatch(name)
        if (!n) return null
        if (zona) {
          const exactZ = boatByZonaNorm.get(`${zona}::${n}`)
          if (exactZ) return exactZ
        }
        const exact = boatByNorm.get(n)
        if (exact) return exact
        const pool = boatCandidates.filter((x) => (zona > 0 ? x.zona === zona : true))
        let best = null
        for (const x of pool) {
          if (!x.norm) continue
          const ok = x.norm.includes(n) || n.includes(x.norm)
          if (!ok) continue
          const score = x.norm.length
          if (!best || score > best.score) best = { b: x.b, score }
        }
        return best?.b ?? null
      }

      const unresolvedGroups = []
      const unresolvedByKey = new Map()
      const ensureGroup = (especieRaw) => {
        const especieKey = normHeader(especieRaw) || '__sin_especie__'
        if (unresolvedByKey.has(especieKey)) return unresolvedByKey.get(especieKey)
        const g = {
          key: especieKey,
          especieRaw: String(especieRaw || '').trim(),
          sampleData: [],
          sampleSet: new Set(),
          items: [],
          resolvedSpeciesId: null,
        }
        unresolvedByKey.set(especieKey, g)
        unresolvedGroups.push(g)
        return g
      }

      for (let sheetIdx = 0; sheetIdx < sheetNames.length; sheetIdx++) {
        await yieldCada(sheetIdx, 12)
        const sn = sheetNames[sheetIdx]
        if (sn === evadirSheetName) continue
        const ws = wb.Sheets?.[sn]
        if (!ws) continue
        const parsed = parseLpSheet(ws)
        if (!parsed) continue
        const spHintId = guessSpeciesFromSheetName(sn)
        for (let rIdx = 0; rIdx < parsed.rows.length; rIdx++) {
          await yieldCada(rIdx, 700)
          const r = parsed.rows[rIdx]
          const zona = parsed.iz >= 0 ? r[parsed.iz] : null
          const zonaNum = parseIntSafe(zona) ?? 0

          const boteCell = String(r[parsed.ib] ?? '').trim()
          const buzoCell = String(parsed.ibu >= 0 ? r[parsed.ibu] ?? '' : '').trim()
          const useAltAsBoat = !boteCell && !!buzoCell

          const boatNameForLookup = boteCell || buzoCell

          let b = null
          if (boatNameForLookup) {
            if (esNombreBoteIntermarealDirecto(boatNameForLookup)) {
              b = ensureIntermarealBote(zonaNum, buzoCell)
            } else if (esNombreBoteAmbiguo(boatNameForLookup)) {
              const submareal = await preguntarTipoMuestreoParaNombreBoteAmbiguo(boatNameForLookup)
              b = submareal ? ensureSubmarealBoteNa(zonaNum) : ensureIntermarealBote(zonaNum, buzoCell)
            } else {
              b = resolveBoatFromLp(boatNameForLookup, zonaNum)
              if (!b && boteCell) b = ensureSubmarealBoteDesdeBiometria(zonaNum, boteCell, useAltAsBoat ? '' : buzoCell)
            }
          }
          if (!b) {
            if (zonaNum > 0) {
              const pool = boatCandidates.filter((x) => x.zona === zonaNum)
              if (pool.length) b = pool[0].b
            }
            if (!b && boatCandidates.length === 1) b = boatCandidates[0].b
          }
          if (!b) continue

          const espRaw = parsed.ie >= 0 ? String(r[parsed.ie] ?? '').trim() : ''
          const spIdAuto = resolveSpeciesId(espRaw) ?? spHintId
          if (spIdAuto == null) {
            const g = ensureGroup(espRaw || sn)
            const l0 = parsed.il >= 0 ? String(r[parsed.il] ?? '').trim() : ''
            const p0 = parsed.ip >= 0 ? String(r[parsed.ip] ?? '').trim() : ''
            const d0 = parsed.id >= 0 ? String(r[parsed.id] ?? '').trim() : ''
            const sample =
              parsed.kind === 'LP'
                ? `${sn} (LP): ${l0 || '—'} · ${p0 || '—'}`
                : parsed.kind === 'D'
                  ? `${sn} (D): ${d0 || '—'}`
                  : `${sn} (L): ${l0 || '—'}`
            if (sample && !g.sampleSet.has(sample)) {
              g.sampleSet.add(sample)
              g.sampleData.push(sample)
              if (g.sampleData.length > 5) g.sampleData = g.sampleData.slice(0, 5)
            }
            g.items.push({
              b,
              kind: parsed.kind,
              l: l0,
              p: p0,
              d: d0,
            })
            continue
          }
          const spId = spIdAuto

          let map = b.lpMuestras && typeof b.lpMuestras === 'object' ? b.lpMuestras : {}

          const isAlga = algaIdSet.has(Number(spId))
          const forceD = parsed.kind === 'L' && isAlga

          if (parsed.kind === 'D') {
            const d = String(r[parsed.id] ?? '').trim()
            if (!d) continue
            map = agregarMuestra(map, spId, 'D', { d })
            b.lpMuestras = map
          } else if (parsed.kind === 'LP') {
            const l = String(r[parsed.il] ?? '').trim()
            const p = String(r[parsed.ip] ?? '').trim()
            map = agregarMuestra(map, spId, 'LP', { l, p })
            b.lpMuestras = map
          } else {
            const l = String(r[parsed.il] ?? '').trim()
            if (!l) continue
            if (forceD) map = agregarMuestra(map, spId, 'D', { d: l })
            else map = agregarMuestra(map, spId, 'L', { l })
            b.lpMuestras = map
          }
          if (!useAltAsBoat) {
            if (!b.buzo && buzoCell) b.buzo = buzoCell
          }
        }
      }

      /**
       * Resuelve especies no identificadas en hojas LP/L/D mediante interacción del usuario.
       *
       * @returns {Promise<boolean>} `true` si el usuario resolvió todas las especies; `false` si canceló.
       *
       * Lógica:
       * 1) Si no hay grupos pendientes, retorna `true`.
       * 2) Si hay, abre un modal con un wizard (BodyResolve) para seleccionar la especie por grupo.
       * 3) Resuelve la promesa al finalizar o cancelar.
       *
       * Dependencias externas:
       * - `openModal/closeModal` y `toast`.
       * - UI interna con combobox para seleccionar especie.
       *
       * Efectos secundarios:
       * - Abre/cierra modales.
       *
       * Manejo de errores:
       * - Si se desmonta el modal sin completar, resuelve `false` como cancelación.
       *
       * @example
       * const ok = await resolvePendingSpecies()
       *
       * Notas de mantenimiento:
       * - Mantener el límite de filas de preview (`g.rows.length < 120`) para evitar UI pesada.
       */
      const resolvePendingSpecies = async () => {
        if (!unresolvedGroups.length) return true

        const pending = unresolvedGroups.map((g) => ({
          name: String(g?.especieRaw || '').trim() || '—',
          sampleData: Array.isArray(g?.sampleData) ? g.sampleData : [],
        }))
        const camposSistema = buildSpeciesFields(especies)

        const result = await new Promise((resolve) => {
          const onConfirm = (payload) => {
            if (!payload) closeModal()
            resolve(payload)
          }
          openModal(
            'Resolver especies no identificadas',
            <ManualColumnMapper
              unmappedColumns={pending}
              systemSpeciesFields={camposSistema}
              initialMappingByColumn={{}}
              onConfirm={onConfirm}
              allowIgnore={false}
              allowDuplicateFields={true}
              showGuardarPreferencias={false}
              headerTitle="Resolver especies no identificadas"
              headerText="1) Revisa las especies no reconocidas. 2) Asigna cada una a una especie del sistema. 3) Continúa a la previsualización."
              leftTitle="Especies no reconocidas"
              rightTitle="Asignaciones"
              confirmLabel="Aceptar y continuar"
            />,
            'wide',
          )
        })

        if (!result || !result.mappingByColumn) return false

        const mappingByColumn = result.mappingByColumn && typeof result.mappingByColumn === 'object' ? result.mappingByColumn : {}
        const groupByKey = new Map(unresolvedGroups.map((g) => [String(g?.key || '').trim(), g]))

        Object.entries(mappingByColumn).forEach(([rawName, fieldId]) => {
          const nombre = String(rawName || '').trim()
          if (!nombre) return
          const parsed = normalizeSpeciesFieldId(String(fieldId || '').trim())
          if (!parsed) return
          const key = normHeader(nombre) || '__sin_especie__'
          const g = groupByKey.get(key)
          if (!g) return
          g.resolvedSpeciesId = parsed.spId
        })

        const faltan = unresolvedGroups.filter((g) => !Number.isFinite(Number(g?.resolvedSpeciesId)))
        if (faltan.length) {
          toast('Faltan especies por asignar. Revisa el mapeo e inténtalo nuevamente.', 'red')
          return false
        }

        return true
      }

      const pendingOk = await resolvePendingSpecies()
      if (!pendingOk) return

      await esperarSiguienteTick()
      checkCancel()

      await openProcesando('Aplicando especies resueltas y preparando previsualización…')

      for (const g of unresolvedGroups) {
        const spId = Number(g.resolvedSpeciesId)
        if (!Number.isFinite(spId)) continue
        for (const it of g.items) {
          const b = it.b
          let map = b.lpMuestras && typeof b.lpMuestras === 'object' ? b.lpMuestras : {}
          const isAlga = algaIdSet.has(Number(spId))
          const forceD = it.kind === 'L' && isAlga
          if (it.kind === 'D') {
            if (!it.d) continue
            map = agregarMuestra(map, spId, 'D', { d: it.d })
            b.lpMuestras = map
          } else if (it.kind === 'LP') {
            map = agregarMuestra(map, spId, 'LP', { l: it.l || '', p: it.p || '' })
            b.lpMuestras = map
          } else {
            if (!it.l) continue
            if (forceD) map = agregarMuestra(map, spId, 'D', { d: it.l })
            else map = agregarMuestra(map, spId, 'L', { l: it.l })
            b.lpMuestras = map
          }
        }
      }

      const opDraft = {
        id: opId,
        region: regionId,
        sectorAmerbId: '',
        sectorAmerb: '',
        sector: sector,
        tipoOrg,
        opaId,
        org,
        numSeg: segNum == null ? null : segNum,
        fechaInicio,
        fechaFin,
        botes: botesOut,
        importMeta: { speciesColumns: importMetaSpeciesColumns, botesConMultiplesZonas, filasZonaInvalida },
      }

      const okUploaded = await new Promise((resolve) => {
        /**
         * Cuerpo del modal de previsualización y confirmación de importación.
         *
         * @returns {import('react').JSX.Element} UI con `EvadirPreview`, errores y botones de acción.
         *
         * Lógica:
         * 1) Muestra la previsualización (tabs/hojas) de `opDraft`.
         * 2) Permite cancelar o confirmar subida.
         * 3) Controla estado de carga `isUploading` y muestra error si falla el guardado.
         *
         * Dependencias externas:
         * - `EvadirPreview`, `safeUpsertOperacion`, `toast`, `closeModal`.
         *
         * Efectos secundarios:
         * - Puede persistir la operación al confirmar.
         *
         * Manejo de errores:
         * - Si `safeUpsertOperacion` falla, muestra mensaje y re-habilita botones.
         *
         * @example
         * openModal('Previsualización...', <BodyPreview />, 'full')
         *
         * Notas de mantenimiento:
         * - Mantener la lógica de creador/importador compatible con esquemas existentes.
         */
        const BodyPreview = () => {
          const doneRef = useRef(false)
          const [isUploading, setIsUploading] = useState(false)
          const [errMsg, setErrMsg] = useState('')

          useEffect(() => {
            return () => {
              if (doneRef.current) return
              resolve(false)
            }
          }, [])

          /**
           * Confirma la importación: crea o actualiza la operación en el backend/storage.
           *
           * @returns {Promise<void>} Promesa que resuelve al terminar la persistencia o abortar por error.
           *
           * Lógica:
           * 1) Previene doble submit con `isUploading`.
           * 2) Detecta si la operación ya existe por `opId`.
           * 3) Construye payload:
           *    - Setea `importedBy*` con usuario actual.
           *    - Preserva `createdBy*` existente si está presente; si no, lo setea al usuario actual.
           * 4) Ejecuta `safeUpsertOperacion` en modo create/update.
           * 5) Notifica por toast (incluye columnas EVADIR no mapeadas si existen).
           * 6) Cierra modal y resuelve promesa `true`.
           *
           * Dependencias externas:
           * - `safeUpsertOperacion`, `toast`, `closeModal`.
           * - `operaciones` (para detectar existencia).
           * - `user` (contexto app).
           *
           * Efectos secundarios:
           * - Persiste datos y modifica UI (loading/error).
           *
           * Manejo de errores:
           * - Si falla el guardado, setea `errMsg` y re-habilita UI.
           *
           * @example
           * <button onClick={onConfirm}>Aceptar y subir operación</button>
           *
           * Notas de mantenimiento:
           * - Mantener la preservación de creador para evitar sobreescrituras de auditoría.
           */
          const onConfirm = async () => {
            if (isUploading) return
            setIsUploading(true)
            setErrMsg('')

            const opsArr = Array.isArray(operaciones) ? operaciones : []
            const existing = opsArr.find((o) => String(o?.id) === String(opId)) || null
            const exists = !!existing

            const currentUserId = user?.id ?? user?.userId ?? user?.usuarioId ?? user?.usuario_id ?? null
            const currentUserName = String(user?.nombre || user?.name || user?.correo || user?.email || '').trim()

            const existingCreatorId =
              existing?.createdById ??
              existing?.created_by_id ??
              existing?.createdBy ??
              existing?.created_by ??
              existing?.creadorId ??
              existing?.creador_id ??
              null

            const existingCreatorName =
              existing?.createdByName ??
              existing?.created_by_name ??
              existing?.creadorNombre ??
              existing?.creador_nombre ??
              existing?.creadorName ??
              null

            const shouldSetCreatorToCurrent = !existingCreatorId && !existingCreatorName

            const payload = {
              ...opDraft,
              importedById: currentUserId,
              importedByName: currentUserName,
              ...(shouldSetCreatorToCurrent ? { createdById: currentUserId, createdByName: currentUserName } : {}),
              ...(!shouldSetCreatorToCurrent && existingCreatorId != null ? { createdById: existingCreatorId } : {}),
              ...(!shouldSetCreatorToCurrent && existingCreatorName ? { createdByName: String(existingCreatorName).trim() } : {}),
            }

            const saved = await safeUpsertOperacion(payload, exists ? 'update' : 'create')
            if (!saved) {
              setErrMsg('No se pudo guardar la operación. Revisa conexión/API e inténtalo nuevamente.')
              setIsUploading(false)
              return
            }

            if (unmatchedEvadirColsUsed.size) {
              const list = Array.from(unmatchedEvadirColsUsed.entries())
                .map(([k]) => k)
                .slice(0, 3)
                .join(', ')
              toast(`Operación importada (${opId}). Columnas EVADIR no mapeadas: ${list}`, 'blue')
            } else {
              toast(`Operación importada (${opId}) correctamente`, 'green')
            }

            doneRef.current = true
            closeModal()
            resolve(true)
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <EvadirPreview db={dbActualRef.current || db} op={opDraft} />
              {errMsg ? (
                <div className="info-box amber" style={{ marginBottom: 0 }}>
                  <span>i</span>
                  <div>{errMsg}</div>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn b-out"
                  disabled={isUploading}
                  onClick={() => {
                    doneRef.current = true
                    closeModal()
                    resolve(false)
                  }}
                >
                  Cancelar
                </button>
                <button className="btn b-teal" disabled={isUploading} onClick={onConfirm}>
                  {isUploading ? 'Subiendo…' : 'Aceptar y subir operación'}
                </button>
              </div>
            </div>
          )
        }
        openModal('Previsualización importación EVADIR', <BodyPreview />, 'full')
      })
      if (!okUploaded) return
    } catch (err) {
      if (err instanceof ErrorImportacionEvadir && String(err?.codigo || '') === 'CANCELADO') {
        closeModal()
        toast('Importación cancelada', 'blue')
        return
      }

      const msg = err instanceof ErrorImportacionEvadir ? mensajeAmigableImportacion(err) : String(err?.message || 'No se pudo importar el Excel')
      openModal(
        'No se pudo importar EVADIR',
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="info-box amber" style={{ marginBottom: 0 }}>
            <span>i</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>{msg}</div>
              <div style={{ color: 'var(--text3)' }}>Paso: {pasoActual}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn b-out" onClick={closeModal}>
              Cerrar
            </button>
          </div>
        </div>,
        'wide',
      )
      toast(msg, 'red')
    } finally {
      setIsImportingEvadir(false)
    }
  }

  const _downloadEvadirTemplate = async () => {
    try {
      const xlsxMod = await import('xlsx-js-style')
      const XLSX = xlsxMod?.default || xlsxMod

      const evadirHeaders = [
        'REGION',
        'NOMBRE SECTOR',
        'TIPO DE ORGANIZACIÓN',
        'NOMBRE ORGANIZACIÓN',
        'FECHA',
        'DIA',
        'MES',
        'AÑO',
        'NUM SEG ESBA',
        'ZONA MUESTREO',
        'BOTE',
        'BUZO',
        'NUM TRANSECTO',
        'AREA TRANSECTO',
        'NUM CONCHOLEPAS',
        'NUM FISSURELLA SPP',
        'NUM LOXECHINUS',
        'TIPO SUSTRATO',
        'CUBIERTA BIOLOGICA',
        'DENS LOCO (N° IND/M2)',
        'X',
        'Y',
        'ºLONG',
        'LONG',
        '"LONG',
        'LATº',
        'LAT',
        '"LAT',
        'DATUM',
      ]

      const commonLpMeta = [
        'REGION',
        'NOMBRE SECTOR',
        'TIPO DE ORGANIZACIÓN',
        'NOMBRE ORGANIZACIÓN',
        'FECHA',
        'DIA',
        'MES',
        'AÑO',
        'NUM SEG ESBA',
        'ZONA MUESTREO',
        'BOTE',
        'BUZO',
      ]
      const lpHeaders = [...commonLpMeta, 'ESPECIE', 'LONGITUD MM', 'PESO G']
      const lHeaders = [...commonLpMeta, 'ESPECIE', 'LONGITUD MM']
      const dHeaders = [...commonLpMeta, 'ESPECIE', 'DIAM DISCO CM']

      const headerStyle = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FF16365C' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      }
      const bodyStyle = {
        font: { name: 'Calibri', sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
      }

      const getDisplayVal = (v) => {
        if (v === null || v === undefined) return ''
        if (typeof v === 'object') return v.v ?? ''
        return v
      }

      const applySheetStyles = (ws, aoa) => {
        const ref = ws['!ref']
        if (!ref) return
        const range = XLSX.utils.decode_range(ref)
        const headerRow = Array.isArray(aoa?.[0]) ? aoa[0] : []
        const headerTextAt = (c) => String(headerRow?.[c] ?? '').trim()
        const isCoordHeader = (h) => h === 'X' || h === 'Y' || h === 'LONG' || h === 'LAT'
        const isDensHeader = (h) => /^DENS /i.test(h)
        const isAreaHeader = (h) => /^AREA(\s|$)/i.test(h)
        const intFmt = '0'
        const densFmt = '0.0000'
        const coordFmt = '0.########'
        const areaFmt = '0.####'

        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c })
            const cell = ws[addr]
            if (!cell) continue
            const h = headerTextAt(c)
            if (r === 0) {
              cell.s = headerStyle
              continue
            }
            cell.s = bodyStyle
            if (cell.t === 'n' || cell.f) {
              if (isDensHeader(h)) cell.z = densFmt
              else if (isCoordHeader(h)) cell.z = coordFmt
              else if (isAreaHeader(h)) {
                const v = typeof cell.v === 'number' ? cell.v : Number(cell.v)
                cell.z = Number.isFinite(v) && v < 1 ? areaFmt : intFmt
              } else {
                cell.z = intFmt
              }
            }
          }
        }

        const colCount = Array.isArray(aoa?.[0]) ? aoa[0].length : 0
        const cols = Array.from({ length: colCount }, () => ({ wch: 10 }))
        for (let c = 0; c < colCount; c++) {
          let maxLen = 0
          const rowsToScan = Math.min(aoa.length, 500)
          for (let r = 0; r < rowsToScan; r++) {
            const v = getDisplayVal(aoa[r]?.[c])
            const s = v === '' ? '' : String(v)
            if (s.length > maxLen) maxLen = s.length
          }
          let wch = Math.min(Math.max(maxLen + 2, 8), 45)
          const header = headerTextAt(c)
          if (/^DENS /i.test(header)) wch = Math.max(wch, 18)
          cols[c] = { wch }
        }
        ws['!cols'] = cols
        ws['!rows'] = [{ hpt: 18 }]
      }

      const wb = XLSX.utils.book_new()
      const mkSheet = (headers) => {
        const blankRows = 200
        const aoa = [headers, ...Array.from({ length: blankRows }, () => Array.from({ length: headers.length }, () => ''))]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        applySheetStyles(ws, aoa)
        return ws
      }

      XLSX.utils.book_append_sheet(wb, mkSheet(evadirHeaders), 'EVADIR')
      XLSX.utils.book_append_sheet(wb, mkSheet(lpHeaders), 'LP')
      XLSX.utils.book_append_sheet(wb, mkSheet(lHeaders), 'L')
      XLSX.utils.book_append_sheet(wb, mkSheet(dHeaders), 'D')

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Planilla-EVADIR.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1200)
      toast('Planilla EVADIR descargada', 'green')
    } catch {
      toast('No se pudo descargar la planilla EVADIR', 'red')
    }
  }

  return (
    <>
      <button
        className="btn b-out b-sm"
        disabled={!canWrite || isImportingEvadir}
        onClick={() => {
          evadirInputRef.current?.click?.()
        }}
      >
        Subir EVADIR
      </button>
      <input
        ref={evadirInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          closeModal()
          setTimeout(() => importEvadirFromXlsx(f), 0)
        }}
      />
    </>
  )
}
