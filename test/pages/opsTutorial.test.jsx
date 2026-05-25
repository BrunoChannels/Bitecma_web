import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import OpsTutorialPage from '../../src/pages/opsTutorial.jsx'
import { renderWithProviders } from '../utils/render.jsx'

describe('Página Operaciones (Tutorial)', () => {
  it('renderiza sin quedar en blanco', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    expect(await screen.findByText('Operaciones (Tutorial)')).toBeInTheDocument()
    expect(await screen.findByText('Replica local: no se hacen peticiones a la API.')).toBeInTheDocument()
  })

  it('no abre el modal de botes en pasos de bote (ops-bote-header)', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    expect(await screen.findByText('Operaciones (Tutorial)')).toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-bote-header', idx: 0 } }))
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('abre el modal de botes en pasos del editor de botes (ops-botes-panel)', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    expect(await screen.findByText('Operaciones (Tutorial)')).toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-botes-panel', idx: 0 } }))
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(await screen.findByTestId('modal')).toBeInTheDocument()
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Botes —')
  })

  it('bloquea inputs/selects del panel de botes solo en el step ops-botes-panel', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-botes-panel', idx: 0 } }))
      await new Promise((r) => setTimeout(r, 200))
    })

    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Botes —')
    const boteName0 = document.querySelector('[data-tutorial-id="ops-bote-name-0"]')
    const buzo0 = document.querySelector('[data-tutorial-id="ops-bote-buzo-0"]')
    const unidad0 = document.querySelector('[data-tutorial-id="ops-bote-unidad-0"]')
    expect(boteName0?.disabled).toBe(true)
    expect(buzo0?.disabled).toBe(true)
    expect(unidad0?.disabled).toBe(true)

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-bote-name-0', idx: 1 } }))
      await new Promise((r) => setTimeout(r, 200))
    })
    expect(boteName0?.disabled).toBe(false)
    expect(buzo0?.disabled).toBe(false)
    expect(unidad0?.disabled).toBe(true)
  })

  it('abre el modal de edición en pasos de edición (ops-editop-panel)', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-editop-panel', idx: 0 } }))
      await new Promise((r) => setTimeout(r, 250))
    })
    expect(await screen.findByTestId('modal')).toBeInTheDocument()
    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Editar operación —')
  })

  it('muestra el editor de botes dentro del modal de edición (ops-editop-botes-panel)', async () => {
    renderWithProviders(<OpsTutorialPage active />, {
      dbSeed: {
        regionesChile: [{ id: 4, rom: 'IV', nom: 'Coquimbo' }],
        sectoresAmerb: [],
        opa: [],
        especies: [
          { id: 3, com: 'Loco', sci: 'Concholepas concholepas' },
          { id: 4, com: 'Lapa Negra', sci: 'Cellana nigrolineata' },
        ],
        botesMaestro: [],
        caletasByRegionStatic: { 4: ['Las Conchas'] },
      },
    })

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bitecma:tutorial:step', { detail: { tour: 'ops', stepId: 'ops-editop-botes-panel', idx: 0 } }))
      await new Promise((r) => setTimeout(r, 350))
    })

    expect(await screen.findByTestId('modal-title')).toHaveTextContent('Editar operación —')
    const table = document.querySelector('[data-tutorial-id="ops-editop-botes-panel"] table.tbl')
    expect(table).toBeTruthy()

    const tabBotes = document.querySelector('[data-tutorial-id="ops-editop-tab-botes"]')
    expect(tabBotes?.getAttribute('data-tutorial-advance')).toBe('true')
  })
})
