import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OpsPage from '../../src/pages/ops.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Operaciones', () => {
  it('abre modal de nueva operación y valida campos requeridos', async () => {
    renderWithProviders(<OpsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 14, rom: 'XIV', nom: 'Los Ríos' }],
        sectoresAmerb: [],
        opa: [],
        operaciones: [],
      },
    })

    expect(await screen.findByText('Sin operaciones registradas.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Nueva operación' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Nueva operación')

    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Ingresa sector/caleta')
  })

  it('cierra el modal de nueva operación al hacer click en Cancelar', async () => {
    renderWithProviders(<OpsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 14, rom: 'XIV', nom: 'Los Ríos' }],
        sectoresAmerb: [],
        opa: [],
        operaciones: [],
      },
    })

    await userEvent.click(screen.getByRole('button', { name: 'Nueva operación' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Nueva operación')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('dispara el click del input al hacer click en "Subir EVADIR"', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

    renderWithProviders(<OpsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 14, rom: 'XIV', nom: 'Los Ríos' }],
        sectoresAmerb: [],
        opa: [],
        operaciones: [],
      },
    })

    await userEvent.click(screen.getByRole('button', { name: 'Subir EVADIR' }))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('navega por regiones, limpia filtros, previsualiza EVADIR y cierra modal', async () => {
    renderWithProviders(<OpsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 14, rom: 'XIV', nom: 'Los Ríos' }],
        sectoresAmerb: [],
        opa: [],
        operaciones: [
          {
            id: 'OP-2026-001',
            region: 14,
            sector: 'HUAPE',
            sectorAmerb: 'HUAPE SECTOR B',
            numSeg: 16,
            fechaInicio: '2026-01-02',
            botes: [],
          },
        ],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Región de Los Ríos — XIV' }))
    expect(await screen.findByRole('button', { name: 'Volver a regiones' })).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Buscar operación, buzo, org...'), 'OP-2026')
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(screen.getByPlaceholderText('Buscar operación, buzo, org...')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Previsualizar EVADIR' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Previsualización EVADIR')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Volver a regiones' }))
    expect(await screen.findByText('Región de Los Ríos')).toBeInTheDocument()
  })

  it('abre edición de operación y cubre botones de edición', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockImplementation(() => false)

    renderWithProviders(<OpsPage active />, {
      dbSeed: {
        regionesChile: [{ id: 14, rom: 'XIV', nom: 'Los Ríos' }],
        sectoresAmerb: [],
        opa: [],
        operaciones: [
          {
            id: 'OP-2026-001',
            region: 14,
            sector: '',
            sectorAmerb: '',
            numSeg: 16,
            fechaInicio: '2026-01-02',
            botes: [],
          },
        ],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Región de Los Ríos — XIV' }))

    await userEvent.click(screen.getByTitle('Editar'))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Editar operación — OP-2026-001')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByTestId('toast')).toHaveTextContent('Selecciona Sector AMERB')

    await userEvent.click(screen.getByRole('button', { name: 'ELIMINAR OPERACION' }))
    expect(confirmSpy).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()

    confirmSpy.mockRestore()
  })
})
