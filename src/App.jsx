import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import PantallaLogin from './pages/login.jsx'

const PaginaAdmin = lazy(() => import('./pages/admin.jsx'))
const PaginaBotes = lazy(() => import('./pages/botes.jsx'))
const PaginaDashboard = lazy(() => import('./pages/dashboard.jsx'))
const PaginaEspecies = lazy(() => import('./pages/especies.jsx'))
const PaginaEvadir = lazy(() => import('./pages/evadir.jsx'))
const PaginaHistorico = lazy(() => import('./pages/historico.jsx'))
const PaginaInforme = lazy(() => import('./pages/informe.jsx'))
const PaginaOps = lazy(() => import('./pages/ops.jsx'))
const PaginaOpsTutorial = lazy(() => import('./pages/opsTutorial.jsx'))
const PaginaOrgs = lazy(() => import('./pages/orgs.jsx'))
const PaginaPerfil = lazy(() => import('./pages/perfil.jsx'))
const PaginaSectores = lazy(() => import('./pages/sectores.jsx'))
import BarraSuperior from './components/topbar.jsx'
import BarraLateral from './components/sidebar.jsx'
import Tutorial from './components/tutorial.jsx'
import { ProveedorAplicacion, usarAplicacion } from './context/appContext.jsx'
import { ProveedorBaseDatos } from './context/dbContext.jsx'
import { ProveedorInterfaz, usarInterfaz } from './context/uiContext.jsx'

class LimiteErroresPagina extends Component {
  constructor(props) {
    super(props)
    this.state = { tieneError: false, mensajeError: '' }
  }

  static getDerivedStateFromError(error) {
    const mensaje = String(error?.message || 'Error inesperado')
    return { tieneError: true, mensajeError: mensaje }
  }

  componentDidCatch() {
    return
  }

  render() {
    if (!this.state.tieneError) return this.props.children
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, color: 'var(--navy)', marginBottom: 6 }}>Se produjo un error y esta pantalla no pudo cargarse.</div>
        <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>{this.state.mensajeError}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn b-teal" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

function ContenedorToast() {
  const { estadoToast } = usarInterfaz()
  const colorFondo =
    estadoToast.type === 'green'
      ? '#065f46'
      : estadoToast.type === 'red'
        ? '#7f1d1d'
        : estadoToast.type === 'blue'
          ? 'var(--blue)'
          : estadoToast.type === 'amber'
            ? 'var(--amber)'
            : estadoToast.type === 'teal'
              ? 'var(--teal)'
              : estadoToast.type === 'purple'
                ? 'var(--purple)'
        : 'var(--navy)'
  return (
    <div className={`toast${estadoToast.show ? ' show' : ''}`} style={{ background: colorFondo }}>
      <span>{estadoToast.msg}</span>
    </div>
  )
}

function ContenedorModal() {
  const { estadoModal, cerrarModal } = usarInterfaz()
  const [mostrarEquis, establecerMostrarEquis] = useState(true)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      if (!estadoModal.open) {
        establecerMostrarEquis(true)
        return
      }
      const root = document.querySelector('.mb-body')
      if (!root) return establecerMostrarEquis(true)
      const explicit = root.querySelector('[data-modal-close="true"]')
      if (explicit) return establecerMostrarEquis(false)
      const buttons = Array.from(root.querySelectorAll('button,[role="button"]')).filter((x) => x && x.nodeType === 1)
      const hasAlt = buttons.some((b) => {
        const lbl = String(b.getAttribute?.('aria-label') || '').trim().toLowerCase()
        const txt = String(b.textContent || '').trim().toLowerCase()
        const v = lbl || txt
        return v === 'cerrar' || v === 'cancelar' || v === 'volver' || v === 'salir' || v === 'no, gracias'
      })
      establecerMostrarEquis(!hasAlt)
    }, 0)
    return () => clearTimeout(temporizador)
  }, [estadoModal.open, estadoModal.body])

  return (
    <div className={`mo${estadoModal.open ? ' open' : ''}`}>
      <div className={`mb-box${estadoModal.size ? ' ' + estadoModal.size : ''}`}>
        <div className="mh">
          <h3>{estadoModal.title}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {estadoModal.encabezadoDerecha}
            {mostrarEquis ? (
              <button type="button" className="mc" onClick={cerrarModal} aria-label="Cerrar">
                ×
              </button>
            ) : null}
          </div>
        </div>
        <div className="mb-body">{estadoModal.body}</div>
      </div>
    </div>
  )
}

function EstructuraAplicacion() {
  const { pagina, estaAutenticado } = usarAplicacion()
  const { barraLateralAbierta } = usarInterfaz()
  const [claveBarraSuperior, establecerClaveBarraSuperior] = useState(0)
  const vigilanciaBarraSuperiorRef = useRef({ ultimaRevisionEn: 0, conteoFallos: 0, ultimaRecargaEn: 0 })

  const paginaAComponente = useMemo(
    () => ({
      dashboard: PaginaDashboard,
      ops: PaginaOps,
      'ops-tutorial': PaginaOpsTutorial,
      evadir: PaginaEvadir,
      historico: PaginaHistorico,
      informe: PaginaInforme,
      especies: PaginaEspecies,
      sectores: PaginaSectores,
      orgs: PaginaOrgs,
      botes: PaginaBotes,
      perfil: PaginaPerfil,
      admin: PaginaAdmin,
    }),
    [],
  )
  const PaginaActiva = paginaAComponente[pagina] || PaginaDashboard

  useEffect(() => {
    if (!estaAutenticado) return
    let idAnimacion = 0
    const intervaloRevisionMs = 100
    const intervaloMinimoRecargaMs = 1200

    const revisar = (ahora) => {
      const estadoVigilancia = vigilanciaBarraSuperiorRef.current
      if (document.hidden) return true
      if (ahora - estadoVigilancia.ultimaRevisionEn < intervaloRevisionMs) return false
      estadoVigilancia.ultimaRevisionEn = ahora

      const elemento = document.querySelector('.topbar')
      if (!elemento || !elemento.isConnected) {
        estadoVigilancia.conteoFallos++
      } else {
        const estilos = window.getComputedStyle(elemento)
        const rectangulo = elemento.getBoundingClientRect()
        const visualizacionOk = estilos.display !== 'none'
        const visibilidadOk = estilos.visibility !== 'hidden'
        const opacidadOk = Number.isFinite(Number(estilos.opacity)) ? Number(estilos.opacity) > 0.02 : true
        const altoOk = rectangulo.height >= 20
        const anchoOk = rectangulo.width >= 120
        const enPantallaOk = rectangulo.bottom > 0 && rectangulo.top < 80
        const ok = visualizacionOk && visibilidadOk && opacidadOk && altoOk && anchoOk && enPantallaOk
        estadoVigilancia.conteoFallos = ok ? 0 : estadoVigilancia.conteoFallos + 1
      }

      if (estadoVigilancia.conteoFallos >= 2 && ahora - estadoVigilancia.ultimaRecargaEn >= intervaloMinimoRecargaMs) {
        estadoVigilancia.ultimaRecargaEn = ahora
        estadoVigilancia.conteoFallos = 0
        establecerClaveBarraSuperior((k) => k + 1)
        return true
      }

      return false
    }

    const ciclo = (t) => {
      const ahora = typeof t === 'number' ? t : performance.now()
      const seRecargo = revisar(ahora)
      idAnimacion = requestAnimationFrame(ciclo)
      if (seRecargo) return
    }

    idAnimacion = requestAnimationFrame(ciclo)
    return () => cancelAnimationFrame(idAnimacion)
  }, [estaAutenticado])

  return (
    <>
      <ContenedorToast />
      <ContenedorModal />
      <Tutorial />

      <PantallaLogin activo={!estaAutenticado} />

      <div id="scr-app" className={`screen${estaAutenticado ? ' active' : ''}`}>
        <BarraSuperior key={claveBarraSuperior} />
        <div className="app-body">
          <div className={`sb-wrap${barraLateralAbierta ? ' open' : ''}`}>
            <BarraLateral />
          </div>
          <div className={`sb-backdrop${barraLateralAbierta ? ' open' : ''}`} />
          <div className={`main${pagina === 'dashboard' ? ' main-dashboard' : ''}`}>
            <LimiteErroresPagina key={pagina}>
              <Suspense fallback={<div style={{ padding: 14, color: 'var(--text3)' }}>Cargando…</div>}>
                <PaginaActiva activo />
              </Suspense>
            </LimiteErroresPagina>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Aplicacion() {
  return (
    <ProveedorBaseDatos>
      <ProveedorInterfaz>
        <ProveedorAplicacion>
          <EstructuraAplicacion />
        </ProveedorAplicacion>
      </ProveedorInterfaz>
    </ProveedorBaseDatos>
  )
}
