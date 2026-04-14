function adminInner() {
  return `<div class="ph">
      <div>
        <h2>Panel Admin</h2>
        <p>Gestión de usuarios, roles y auditoría</p>
      </div>
      <div class="ph-a">
        <button class="btn b-out" onclick="goPage('dashboard')">Volver</button>
      </div>
    </div>
    <div class="admin-layout">
      <div class="admin-menu card">
        <div class="admin-item on" id="adm-usuarios" onclick="adminNav('usuarios')">Usuarios</div>
        <div class="admin-item" id="adm-roles" onclick="adminNav('roles')">Roles y Accesos</div>
        <div class="admin-item" id="adm-auditoria" onclick="adminNav('auditoria')">Auditoría</div>
      </div>
      <div class="admin-content card" id="admin-content"></div>
    </div>`
}

export default function AdminPage() {
  return (
    <div
      className="page"
      id="pg-admin"
      dangerouslySetInnerHTML={{ __html: adminInner() }}
    />
  )
}

function getPerfiles(){
  const arr = window.DB?.perfiles;
  return Array.isArray(arr) ? arr : [];
}

function rolePillClass(rol){
  const r = String(rol || '').toLowerCase();
  if (r === 'admin') return 'p-red';
  if (r === 'biólogo' || r === 'biologo') return 'p-grn';
  return 'p-slt';
}

function adminSectionUsuarios(){
  const perfiles = getPerfiles();
  const rows = perfiles.map((u) => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.nombre || '—'}</strong></td>
      <td>${u.correo || '—'}</td>
      <td><span class="pill ${rolePillClass(u.rol)}">${u.rol || '—'}</span></td>
      <td><span class="pill ${u.activo === false ? 'p-amb' : 'p-grn'}">${u.activo === false ? 'Inactivo' : 'Activo'}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn b-out b-xs" onclick="toast('Editar usuario (backend)')">Editar</button>
        <button class="btn b-out b-xs" onclick="toast('Reset contraseña (backend)')">Reset</button>
      </td>
    </tr>
  `).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-family:var(--ff-d);font-size:16px;font-weight:800;color:var(--navy)">Usuarios</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Crear, editar, desactivar y asignar roles</div>
      </div>
      <button class="btn b-teal" onclick="toast('Crear usuario (backend)')">+ Nuevo usuario</button>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:14px">Sin usuarios</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function adminSectionRoles(){
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-family:var(--ff-d);font-size:16px;font-weight:800;color:var(--navy)">Roles y Accesos</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Matriz de permisos por rol</div>
      </div>
      <button class="btn b-out" onclick="toast('Editar matriz (backend)')">Editar</button>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>Acción / Módulo</th>
            <th>Admin</th>
            <th>Biólogo</th>
            <th>Analista</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Operaciones</strong> (crear/editar)</td><td>✔</td><td>✔</td><td>—</td></tr>
          <tr><td><strong>EVADIR</strong> (generar/exportar)</td><td>✔</td><td>✔</td><td>Ver</td></tr>
          <tr><td><strong>Maestros</strong> (especies/sectores)</td><td>✔</td><td>✔</td><td>Ver</td></tr>
          <tr><td><strong>Usuarios</strong> (gestión)</td><td>✔</td><td>—</td><td>—</td></tr>
          <tr><td><strong>Auditoría</strong> (visualización)</td><td>✔</td><td>—</td><td>—</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function adminSectionAuditoria(){
  const perfiles = getPerfiles();
  const entries = window.getAuditEntries?.() || [];
  const rows = entries.map((r) => {
    const p = perfiles.find((x) => String(x.id) === String(r.userId));
    const rol = p?.rol || r.rol || '—';
    const user = p?.nombre || r.userName || `U-${String(r.userId || '')}`;
    return `
    <tr>
      <td style="white-space:nowrap">${r.ts || '—'}</td>
      <td>${user}</td>
      <td><span class="pill ${rolePillClass(rol)}">${rol}</span></td>
      <td><strong>${r.action || '—'}</strong></td>
      <td style="color:var(--text2)">${r.detail || '—'}</td>
    </tr>
  `;
  }).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-family:var(--ff-d);font-size:16px;font-weight:800;color:var(--navy)">Auditoría</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Historial de acciones de usuarios</div>
      </div>
      <button class="btn b-out" onclick="toast('Exportar auditoría (backend)')">Exportar</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <select class="flt" onchange="toast('Filtrar por usuario (backend)')"><option>Todos los usuarios</option><option>U-001</option><option>U-002</option><option>U-003</option></select>
      <select class="flt" onchange="toast('Filtrar por acción (backend)')"><option>Todas las acciones</option><option>Editó operación</option><option>Generó EVADIR</option><option>Cambió rol</option></select>
      <input class="flt" placeholder="Buscar..." oninput="toast('Buscar (backend)')" />
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">Sin auditoría registrada</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

window.adminNav = function adminNav(tab) {
  document.querySelectorAll('.admin-item').forEach((el) => el.classList.remove('on'));
  document.getElementById('adm-' + tab)?.classList.add('on');
  const host = document.getElementById('admin-content');
  if (!host) return;
  if (tab === 'usuarios') host.innerHTML = adminSectionUsuarios();
  else if (tab === 'roles') host.innerHTML = adminSectionRoles();
  else if (tab === 'auditoria') host.innerHTML = adminSectionAuditoria();
  else host.innerHTML = adminSectionUsuarios();
};
