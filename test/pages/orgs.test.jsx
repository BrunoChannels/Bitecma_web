import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrgsPage from '../../src/pages/orgs.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Organizaciones', () => {
  it('filtra organizaciones por búsqueda', async () => {
    renderWithProviders(<OrgsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
        opa: [
          { id: 1, region: 1, nombre: 'Organización A', nombrecorto: 'OPA-A', comuna: 'Iquique' },
          { id: 2, region: 1, nombre: 'Organización B', nombrecorto: 'OPA-B', comuna: 'Iquique' },
        ],
      },
    })

    await userEvent.type(await screen.findByPlaceholderText('Buscar organización...'), 'OPA-B')
    expect(await screen.findByText('Organización B')).toBeInTheDocument()
    expect(screen.queryByText('Organización A')).not.toBeInTheDocument()
  })
})

