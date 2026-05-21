import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../../src/pages/dashboard.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Dashboard', () => {
  it('navega a ops al hacer click en la tarjeta Operaciones', async () => {
    renderWithProviders(<DashboardPage active />, {
      dbSeed: {
        operaciones: [{ id: 'OP-2026-001', fechaInicio: '2026-01-02', sector: 'HUAPE', botes: [] }],
        especies: [],
      },
    })

    expect(screen.getByTestId('page')).toHaveTextContent('dashboard')
    await userEvent.click(screen.getByText('Operaciones'))
    expect(await screen.findByTestId('page')).toHaveTextContent('ops')
  })

  it('navega a ops al hacer click en el botón "Ver todas"', async () => {
    renderWithProviders(<DashboardPage active />, {
      dbSeed: {
        operaciones: [{ id: 'OP-2026-001', fechaInicio: '2026-01-02', sector: 'HUAPE', botes: [] }],
        especies: [],
      },
    })

    expect(screen.getByTestId('page')).toHaveTextContent('dashboard')
    await userEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    expect(await screen.findByTestId('page')).toHaveTextContent('evadir')
  })
})
