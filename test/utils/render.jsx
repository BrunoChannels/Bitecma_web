import { useEffect } from 'react'
import { render } from '@testing-library/react'
import { UiProvider, useUi } from '../../src/context/uiContext.jsx'
import { DbProvider, useDb } from '../../src/context/dbContext.jsx'
import { AppProvider, useApp } from '../../src/context/appContext.jsx'

export const defaultUser = {
  id: 1,
  correo: 'test@bitecma.cl',
  nombre: 'Test User',
  rol: 'Usuario',
  contraseña: '12345678',
}

function DbSeed({ seed, children }) {
  const { setDb } = useDb()
  useEffect(() => {
    if (!seed) return
    setDb((prev) => ({ ...prev, ...(seed || {}) }))
  }, [seed, setDb])
  return children
}

function ToastObserver() {
  const { toastState } = useUi()
  return toastState?.show ? <div data-testid="toast">{toastState.msg}</div> : null
}

function ModalObserver() {
  const { modalState } = useUi()
  if (!modalState?.open) return null
  return (
    <div data-testid="modal">
      <div data-testid="modal-title">{modalState.title}</div>
      <div data-testid="modal-body">{modalState.body}</div>
    </div>
  )
}

function PageObserver() {
  const { page } = useApp()
  return <div data-testid="page">{page}</div>
}

export function renderWithProviders(ui, { user = defaultUser, dbSeed } = {}) {
  try {
    localStorage.clear()
  } catch {
    void 0
  }

  if (user) {
    localStorage.setItem('bitecma_active_profile', String(user.id))
  }

  const seed = {
    perfiles: user ? [user] : [],
    ...(dbSeed || {}),
  }

  function Providers({ children }) {
    return (
      <DbProvider>
        <UiProvider>
          <AppProvider>
            <DbSeed seed={seed}>
              <ToastObserver />
              <ModalObserver />
              <PageObserver />
              {children}
            </DbSeed>
          </AppProvider>
        </UiProvider>
      </DbProvider>
    )
  }

  return render(ui, { wrapper: Providers })
}
