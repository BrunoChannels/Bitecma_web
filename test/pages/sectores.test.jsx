import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SectoresPage from '../../src/pages/sectores.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Sectores', () => {
  it('filtra sectores por texto y cambia de región', async () => {
    renderWithProviders(<SectoresPage active />, {
      dbSeed: {
        regionesChile: [
          { id: 1, rom: 'I', nom: 'Tarapacá' },
          { id: 2, rom: 'II', nom: 'Antofagasta' },
        ],
        sectoresAmerb: [
          { id: 10, region: 1, nombreamerb: 'HUAPE SECTOR B', comuna: 'CORRAL' },
          { id: 11, region: 1, nombreamerb: 'AMARGOS', comuna: 'VALDIVIA' },
        ],
        caletasByRegionStatic: { 1: ['Huape'], 2: ['Antofagasta'] },
      },
    })

    await userEvent.type(await screen.findByPlaceholderText('Buscar sector AMERB...'), 'HUAPE')
    expect(await screen.findByText('HUAPE SECTOR B')).toBeInTheDocument()

    const matches = screen.getAllByText('II — Antofagasta')
    await userEvent.click(matches[matches.length - 1])
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
  })
})
