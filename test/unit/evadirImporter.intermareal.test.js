import { describe, expect, it } from 'vitest'
import { esNombreBoteIntermarealDirecto } from '../../src/components/ops/EvadirImporter.jsx'

describe('EvadirImporter - detección de botes intermareales', () => {
  it('reconoce A PIE como intermareal', () => {
    expect(esNombreBoteIntermarealDirecto('A PIE')).toBe(true)
  })

  it('mantiene EN TIERRA como intermareal', () => {
    expect(esNombreBoteIntermarealDirecto('EN TIERRA')).toBe(true)
  })

  it('no marca un bote normal como intermareal', () => {
    expect(esNombreBoteIntermarealDirecto('Barracuda II')).toBe(false)
  })
})
