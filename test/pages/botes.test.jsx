import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BotesPage from '../../src/pages/botes.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Botes', () => {
  it('abre el modal "Agregar Nuevo Bote"', async () => {
    renderWithProviders(<BotesPage active />, {
      dbSeed: {
        regionesChile: [
          { id: 1, rom: 'I', nom: 'Tarapacá' },
          { id: 2, rom: 'II', nom: 'Antofagasta' },
        ],
        botesMaestro: [{ id: 1, region: 'I', nombre: 'CHIPANA', caleta: 'Chipana', nrpa: '401', nmatricula: '100' }],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Agregar Nuevo Bote')
  })

  it('cierra el modal al hacer click en Cancelar', async () => {
    renderWithProviders(<BotesPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Agregar Nuevo Bote')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('muestra error al intentar guardar sin nombre', async () => {
    renderWithProviders(<BotesPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Ingresa el nombre del bote')
  })

  it('muestra error al intentar guardar con nombre cuando API no está configurada', async () => {
    renderWithProviders(<BotesPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
        caletasByRegionStatic: { I: ['Chipana'] },
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar' }))
    await userEvent.type(screen.getByPlaceholderText('Ej: CHIPANA'), 'CHIPANA')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('API no configurada (VITE_API_URL)')
  })
})
