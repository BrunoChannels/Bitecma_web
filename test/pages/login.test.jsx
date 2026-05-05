import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../../src/pages/login.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Login', () => {
  it('muestra toast cuando el usuario no existe (modo local)', async () => {
    renderWithProviders(<LoginScreen active />, { user: null, dbSeed: { perfiles: [] } })

    await userEvent.type(screen.getByPlaceholderText('bitecma@bitecma.cl'), 'noexiste@bitecma.cl')
    await userEvent.type(screen.getByPlaceholderText('12345678'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByTestId('toast')).toHaveTextContent('Usuario no encontrado')
  })

  it('dispara toast en "¿Olvidaste tu contraseña?"', async () => {
    renderWithProviders(<LoginScreen active />, { user: null, dbSeed: { perfiles: [] } })

    await userEvent.click(screen.getByText('¿Olvidaste tu contraseña?'))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Correo enviado')
  })
})
