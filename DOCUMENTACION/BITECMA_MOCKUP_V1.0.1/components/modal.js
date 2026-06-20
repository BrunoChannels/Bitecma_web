window.openMo = function(title, body, size = ''){
  const titleEl = document.getElementById('mtitle');
  const bodyEl = document.getElementById('mbody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = body;
  const box = document.getElementById('mb');
  if (box) box.className = 'mb-box' + (size ? ' ' + size : '');
  document.getElementById('mo')?.classList.add('open');
};
window.closeMo = function(){ document.getElementById('mo')?.classList.remove('open'); };
window.closeMoOut = function(e){ if (e.target === document.getElementById('mo')) closeMo(); };
window.openNotif = function(){
  openMo('Notificaciones', `<div style="display:flex;flex-direction:column;gap:9px">
  <div class="info-box amber">Advertencia <div><strong>2 outliers en EVADIR HUAPE B</strong><br>T-4 y T-10 — Revisar densidad</div></div>
  <div class="info-box teal">Operación completada <div><strong>OP-2026-002 — AMARGOS</strong><br>5 transectos · 2 botes · muestras L-P ingresadas</div></div>
</div>`);
};
function tplModal(){
  return `<div class="mo" id="mo" onclick="closeMoOut(event)">
  <div class="mb-box" id="mb">
    <div class="mh"><h3 id="mtitle">—</h3><button class="mc" onclick="closeMo()">×</button></div>
    <div id="mbody"></div>
  </div>
</div>`;
}
