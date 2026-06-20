function tplLogin(){
  return `<div id="scr-login" class="screen active">
  <div class="lcard">
    <div class="lc-logo"><div class="lc-icon"><img src="./img/logo.png" alt="BITECMA"></div><div class="lc-brand"><h1>BITECMA</h1><span>Sistema AMERB - V1.0.1</span></div></div>
    <div class="lc-title">Iniciar sesión</div>
    <div class="lc-sub">Sistema de gestión de operaciones bentónicas y generación de EVADIR.</div>
    <div class="lf-g"><label class="lf-lbl">Correo electrónico</label><input class="lf-inp" value="arosson@bitecma.cl"></div>
    <div class="lf-g"><label class="lf-lbl">Contraseña</label><input class="lf-inp" type="password" value="••••••••"></div>
    <div class="lf-g"><label class="lf-lbl">Rol</label>
      <div class="role-row">
        <button class="role-opt sel" onclick="selRole(this)">Admin</button>
        <button class="role-opt" onclick="selRole(this)">Biólogo</button>
        <button class="role-opt" onclick="selRole(this)">Técnico</button>
        <button class="role-opt" onclick="selRole(this)">Analista</button>
      </div>
    </div>
    <button class="btn-login" onclick="enterApp()">Ingresar</button>
    <div class="lc-foot"><a onclick="toast('Correo enviado')">¿Olvidaste tu contraseña?</a> · Bitecma Ltda. © 2026</div>
  </div>
</div>`;
}
