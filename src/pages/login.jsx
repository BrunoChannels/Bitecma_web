import logoUrl from '../img/logo.png'
import { useState } from 'react'
import { usarAplicacion } from '../context/appContext.jsx'

/**
 * Pantalla de inicio de sesión (overlay) para usuarios no autenticados.
 *
 * @param {object} props - Props del componente.
 * @param {boolean} props.active - Indica si la pantalla está activa (controla estilos/animación).
 * @returns {import('react').JSX.Element} UI de login con email/contraseña y acción de ingreso.
 *
 * Lógica:
 * 1) Mantiene estado local de credenciales (`email`, `pass`).
 * 2) En “Ingresar” o Enter en contraseña, llama `login(email, pass)`.
 *
 * Dependencias externas:
 * - `useApp` (`login`) para iniciar sesión.
 * - Asset `logoUrl`.
 *
 * Efectos secundarios:
 * - Al llamar `login`, puede disparar autenticación, requests y cambios de estado global.
 *
 * Manejo de errores:
 * - No gestiona errores aquí; se delega al flujo de `login` en el contexto.
 *
 * @example
 * <LoginScreen active={!isAuthed} />
 *
 * Notas de mantenimiento:
 * - Evitar loguear credenciales.
 */
export default function PantallaLogin({ activo }) {
  const { iniciarSesion } = usarAplicacion()
  const [correo, establecerCorreo] = useState('')
  const [contrasena, establecerContrasena] = useState('')

  return (
    <div id="scr-login" className={`screen${activo ? ' active' : ''}`}>
      <div className="lcard">
        <div className="lc-logo">
          <div className="lc-icon">
            <img src={logoUrl} alt="BITECMA" />
          </div>
          <div className="lc-brand">
            <h1>BITECMA</h1>
            <span>Sistema AMERB - V1.1.2</span>
          </div>
        </div>
        <div className="lc-title">Iniciar sesión</div>
        <div className="lc-sub">
          Sistema de gestión de operaciones bentónicas y generación de Documentos.
        </div>
        <div className="lf-g">
          <label className="lf-lbl">Correo electrónico</label>
          <input
            className="lf-inp"
            id="login-email"
            type="email"
            placeholder="bitecma@bitecma.cl"
            value={correo}
            onChange={(e) => establecerCorreo(e.target.value)}
          />
        </div>
        <div className="lf-g">
          <label className="lf-lbl">Contraseña</label>
          <input
            className="lf-inp"
            id="login-pass"
            type="password"
            placeholder="12345678"
            value={contrasena}
            onChange={(e) => establecerContrasena(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') iniciarSesion(correo, contrasena)
            }}
          />
        </div>
        <button className="btn-login" onClick={() => iniciarSesion(correo, contrasena)}>
          Ingresar
        </button>

        <div className="lc-foot">
          Bitecma Ltda. © 1995
        </div>
      </div>
    </div>
  )
}
