function perfilInner() {
  return `<div class="ph">
      <div>
        <h2>Perfil</h2>
        <p>Actualiza tus datos de contacto</p>
      </div>
      <div class="ph-a">
        <button class="btn b-out" onclick="goPage('dashboard')">Volver</button>
      </div>
    </div>

    <div class="profile-card card">
      <div class="profile-grid">
        <div>
          <input id="pf-avatar-file" type="file" accept="image/*" style="display:none" onchange="onProfileAvatarChange(event)">
          <div class="pf-avatar" id="pf-avatar" onclick="document.getElementById('pf-avatar-file')?.click()">
            <div class="pf-initials" id="pf-initials">US</div>
            <div class="pf-avatar-hint">Cambiar</div>
          </div>
        </div>

        <div>
          <div class="ig">
            <label class="il">Nombre completo</label>
            <input class="ii" id="pf-nombre" placeholder="Nombre Apellido" oninput="profileMarkDirty()">
          </div>
          <div class="ig">
            <label class="il">Correo electrónico</label>
            <input class="ii" id="pf-correo" type="email" placeholder="correo@dominio.cl" oninput="profileMarkDirty()">
          </div>
          <div class="ig">
            <label class="il">Número de teléfono</label>
            <input class="ii" id="pf-telefono" placeholder="+56 9 ..." oninput="profileMarkDirty()">
          </div>

          <div class="pf-actions">
            <button class="btn b-out" onclick="openChangePassword()">Modificar contraseña</button>
            <button class="btn b-teal" id="pf-save" onclick="saveProfile()" disabled>Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>`
}

export default function PerfilPage() {
  return (
    <div
      className="page"
      id="pg-perfil"
      dangerouslySetInnerHTML={{ __html: perfilInner() }}
    />
  )
}
