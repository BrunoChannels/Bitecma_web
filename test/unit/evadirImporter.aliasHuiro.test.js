import { describe, expect, it } from 'vitest'
import { inferirEspecieHuiroDesdeNombreHoja } from '../../src/components/ops/EvadirImporter.jsx'

describe('EvadirImporter - alias de hojas para huiros', () => {
  const especies = [
    { id: 1, com: 'Huiro negro', sci: 'Lessonia berteroana' },
    { id: 2, com: 'Huiro palo', sci: 'Lessonia trabeculata' },
  ]

  it('reconoce LONG-H PALO como Huiro palo', () => {
    expect(inferirEspecieHuiroDesdeNombreHoja('LONG-H PALO', especies)).toBe(2)
  })

  it('reconoce LONG- H NEGRO como Huiro negro', () => {
    expect(inferirEspecieHuiroDesdeNombreHoja('LONG- H NEGRO', especies)).toBe(1)
  })

  it('tolera nombres científicos históricos para Huiro negro', () => {
    const especiesConAlias = [{ id: 8, com: 'Alga negra', sci: 'Lessonia nigrescens' }]

    expect(inferirEspecieHuiroDesdeNombreHoja('LONG- H NEGRO', especiesConAlias)).toBe(8)
  })

  it('retorna null cuando la hoja no corresponde a alias de huiro', () => {
    expect(inferirEspecieHuiroDesdeNombreHoja('LP LOCO', especies)).toBeNull()
  })
})
