import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPage from '../../src/pages/admin.jsx'
import { useApp } from '../../src/context/appContext.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Admin', () => {
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
        <SetPage page="admin" />
        <AdminPage />
      </>,
      {
        user: { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', contraseña: '12345678' },
        dbSeed: { perfiles: [{ id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', activo: true }] },
      },
    )

    expect(screen.getByTestId('page')).toHaveTextContent('admin')
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByTestId('page')).toHaveTextContent('dashboard')
  })

  it('abre el modal de creación de usuario', async () => {
    renderWithProviders(<AdminPage />, {
      user: { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', contraseña: '12345678' },
      dbSeed: { perfiles: [{ id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', activo: true }] },
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo usuario' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Nuevo usuario')
  })

  it('abre el modal de edición desde el botón Editar', async () => {
    renderWithProviders(<AdminPage />, {
      user: { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', contraseña: '12345678' },
      dbSeed: {
        perfiles: [
          { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', activo: true },
          { id: 2, correo: 'user@bitecma.cl', nombre: 'Usuario', rol: 'Usuario', activo: true },
        ],
      },
    })

    const editButtons = await screen.findAllByRole('button', { name: 'Editar' })
    await userEvent.click(editButtons[0])
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Editar usuario')
  })

  it('permite cancelar desde el editor de usuario', async () => {
    renderWithProviders(<AdminPage />, {
      user: { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', contraseña: '12345678' },
      dbSeed: { perfiles: [{ id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', activo: true }] },
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo usuario' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Nuevo usuario')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('muestra toast al intentar Guardar si la API no está configurada', async () => {
    const { container } = renderWithProviders(<AdminPage />, {
      user: { id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', contraseña: '12345678' },
      dbSeed: { perfiles: [{ id: 1, correo: 'admin@bitecma.cl', nombre: 'Admin', rol: 'Admin', activo: true }] },
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo usuario' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Nuevo usuario')

    await userEvent.type(screen.getByPlaceholderText('Nombre y apellido'), 'Nuevo Usuario')
    await userEvent.type(screen.getByPlaceholderText('correo@dominio.cl'), 'nuevo@bitecma.cl')

    const pwds = container.querySelectorAll('input[type="password"]')
    await userEvent.type(pwds[0], '12345678')
    await userEvent.type(pwds[1], '12345678')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('API no configurada (VITE_API_URL)')
  })
})
