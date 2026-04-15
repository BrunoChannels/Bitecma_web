/**
 * Abre el modal genérico con título, contenido HTML y tamaño opcional.
 * Se usa como contenedor para formularios, confirmaciones y vistas rápidas.
 */
window.openMo = function(title, body, size = ''){
  const titleEl = document.getElementById('mtitle');
  const bodyEl = document.getElementById('mbody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = body;
  const box = document.getElementById('mb');
  if (box) box.className = 'mb-box' + (size ? ' ' + size : '');
  document.getElementById('mo')?.classList.add('open');
};
/**
 * Cierra el modal genérico.
 * Se invoca desde el botón de cerrar y desde la detección de click afuera.
 */
window.closeMo = function(){ document.getElementById('mo')?.classList.remove('open'); };
/**
 * Handler para cerrar el modal al hacer click en el backdrop (fuera del cuadro).
 */
window.closeMoOut = function(e){
  if (e.target !== document.getElementById('mo')) return;
  const box = document.getElementById('mb');
  if (box && box.classList.contains('lock')) return;
  closeMo();
};
/**
 * Abre un modal pre-armado de notificaciones (demo UI) con información resumida.
 */
window.openNotif = function(){
  openMo('Notificaciones', `<div style="display:flex;flex-direction:column;gap:9px">
  <div class="info-box amber">Advertencia <div><strong>2 outliers en EVADIR HUAPE B</strong><br>T-4 y T-10 — Revisar densidad</div></div>
  <div class="info-box teal">Operación completada <div><strong>OP-2026-002 — AMARGOS</strong><br>5 transectos · 2 botes · muestras L-P ingresadas</div></div>
</div>`);
};
/**
 * Retorna el HTML base del modal (overlay + caja + header + body).
 * Se inyecta en el layout principal al montar la app.
 */
function tplModal(){
  return `<div class="mo" id="mo" onclick="closeMoOut(event)">
  <div class="mb-box" id="mb">
    <div class="mh"><h3 id="mtitle">—</h3><button class="mc" onclick="closeMo()">×</button></div>
    <div id="mbody"></div>
  </div>
</div>`;
}
