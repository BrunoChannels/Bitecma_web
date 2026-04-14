import logoUrl from '../img/logo.png'

function loginInner() {
  return `<div class="lcard">
    <div class="lc-logo"><div class="lc-icon"><img src="${logoUrl}" alt="BITECMA"></div><div class="lc-brand"><h1>BITECMA</h1><span>Sistema AMERB - V1.0.4</span></div></div>
    <div class="lc-title">Iniciar sesión</div>
    <div class="lc-sub">Sistema de gestión de operaciones bentónicas y generación de Documentos.</div>
    <div class="lf-g"><label class="lf-lbl">Correo electrónico</label><input class="lf-inp" id="login-email" type="email" placeholder="bitecma@bitecma.cl"></div>
    <div class="lf-g"><label class="lf-lbl">Contraseña</label><input class="lf-inp" id="login-pass" type="password" placeholder="12345678"></div>
    <button class="btn-login" onclick="login()">Ingresar</button>
    <div class="lc-foot"><a onclick="toast('Correo enviado')">¿Olvidaste tu contraseña?</a> · Bitecma Ltda. © 1995</div>
  </div>`
}

export default function LoginScreen() {
  return (
    <div
      id="scr-login"
      className="screen active"
      dangerouslySetInnerHTML={{ __html: loginInner() }}
    />
  )
}
