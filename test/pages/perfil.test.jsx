import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PerfilPage from '../../src/pages/perfil.jsx'
import { useApp } from '../../src/context/appContext.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Perfil', () => {
  function SetPage({ page }) {
    const { navigate } = useApp()
    useEffect(() => {
      navigate(page)
    }, [navigate, page])
    return null
  }

  it('navega a dashboard al hacer click en Volver', async () => {
    renderWithProviders(
      <>
        <SetPage page="perfil" />
        <PerfilPage active />
      </>,
    )

    expect(screen.getByTestId('page')).toHaveTextContent('perfil')
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByTestId('page')).toHaveTextContent('dashboard')
  })

  it('guarda cambios del perfil y muestra toast', async () => {
    renderWithProviders(<PerfilPage active />)

    const nombre = screen.getByPlaceholderText('Nombre Apellido')
    await userEvent.clear(nombre)
    await userEvent.type(nombre, 'Nuevo Nombre')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Perfil actualizado')
  })

  it('valida largo mínimo al cambiar contraseña (modo local)', async () => {
    const { container } = renderWithProviders(<PerfilPage active />)

    await userEvent.click(screen.getByRole('button', { name: 'Modificar contraseña' }))

    const pwds = container.querySelectorAll('input[type="password"]')
    expect(pwds.length).toBe(3)

    await userEvent.type(pwds[0], '12345678')
    await userEvent.type(pwds[1], '123')
    await userEvent.type(pwds[2], '123')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('La nueva contraseña debe tener al menos 8 caracteres')
  })

  it('permite cancelar el cambio de contraseña', async () => {
    renderWithProviders(<PerfilPage active />)

    await userEvent.click(screen.getByRole('button', { name: 'Modificar contraseña' }))
    expect(screen.getByRole('button', { name: 'Guardar nueva contraseña' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Guardar nueva contraseña' })).not.toBeInTheDocument()
  })
})
