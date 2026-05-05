import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InformePage from '../../src/pages/informe.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Informe', () => {
  it('muestra toast al enviar a SUBPESCA', async () => {
    renderWithProviders(<InformePage active />)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar SUBPESCA' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Enviado a SUBPESCA')
  })

  it('ejecuta acciones de botones principales y muestra toasts', async () => {
    renderWithProviders(<InformePage active />)

    await userEvent.click(screen.getByRole('button', { name: 'Generar DOCX' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Generación DOCX (pendiente)')

    await userEvent.click(screen.getByRole('button', { name: 'Generar informe DOCX' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Generación DOCX (pendiente)')

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Abrir (pendiente)')

    await userEvent.click(screen.getByRole('button', { name: 'Descargar .DOCX' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Descarga DOCX (pendiente)')
  })
})
