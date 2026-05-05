import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HistoricoPage from '../../src/pages/historico.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Histórico', () => {
  it('muestra toast al hacer click en "Vista completa"', async () => {
    renderWithProviders(<HistoricoPage active />)
    await userEvent.click(screen.getByRole('button', { name: 'Vista completa' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Vista completa (pendiente)')
  })

  it('muestra toast al hacer click en "Abrir"', async () => {
    renderWithProviders(<HistoricoPage active />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Abrir (pendiente)')
  })
})
