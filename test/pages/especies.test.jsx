import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import EspeciesPage from '../../src/pages/especies.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Especies', () => {
  it('renderiza el maestro de especies', async () => {
    renderWithProviders(<EspeciesPage active />, {
      dbSeed: { especies: [{ id: 1, com: 'Loco', sci: 'Concholepas concholepas' }] },
    })

    expect(await screen.findByText('Loco')).toBeInTheDocument()
    expect(screen.getByText('Concholepas concholepas')).toBeInTheDocument()
  })
})

