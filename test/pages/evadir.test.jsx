import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
vi.mock('../../src/utils/evadirExport.js', () => ({ exportEvadirXlsx: vi.fn() }))
import { exportEvadirXlsx } from '../../src/utils/evadirExport.js'
import EvadirPage from '../../src/pages/evadir.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página EVADIR', () => {
  it('abre la previsualización desde la tabla de EVADIR registrados', async () => {
    renderWithProviders(<EvadirPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
        operaciones: [
          {
            id: 'OP-2026-001',
            region: 1,
            sector: 'HUAPE',
            numSeg: 16,
            fechaInicio: '2026-01-02',
            botes: [
              {
                nombre: 'CHIPANA',
                transectos: [{ tipo: 'lineal', area: 1, counts: { 1: 2 } }],
                lpMuestras: {},
              },
            ],
          },
        ],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Previsualización EVADIR')
  })

  it('cierra el modal desde el botón Cerrar', async () => {
    renderWithProviders(<EvadirPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
        operaciones: [
          {
            id: 'OP-2026-001',
            region: 1,
            sector: 'HUAPE',
            numSeg: 16,
            fechaInicio: '2026-01-02',
            botes: [{ nombre: 'CHIPANA', transectos: [], lpMuestras: {} }],
          },
        ],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }))
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Previsualización EVADIR')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('ejecuta exportación al hacer click en EXCEL', async () => {
    renderWithProviders(<EvadirPage active />, {
      dbSeed: {
        regionesChile: [{ id: 1, rom: 'I', nom: 'Tarapacá' }],
        operaciones: [
          {
            id: 'OP-2026-001',
            region: 1,
            sector: 'HUAPE',
            numSeg: 16,
            fechaInicio: '2026-01-02',
            botes: [{ nombre: 'CHIPANA', transectos: [], lpMuestras: {} }],
          },
        ],
      },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'EXCEL' }))
    expect(exportEvadirXlsx).toHaveBeenCalled()
  })
})
