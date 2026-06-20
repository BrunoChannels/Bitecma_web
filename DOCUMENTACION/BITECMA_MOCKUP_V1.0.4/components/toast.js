let toastT;
/**
 * Muestra un mensaje tipo toast (notificación breve) en la parte superior.
 * Se usa para feedback rápido de acciones sin interrumpir el flujo.
 */
window.toast = function(msg, type = ''){
  const t = document.getElementById('toast');
  if (!t) return;
  t.style.background = type === 'green' ? '#065f46' : type === 'red' ? '#7f1d1d' : 'var(--navy)';
  const tmsg = document.getElementById('tmsg');
  if (tmsg) tmsg.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
};
/**
 * Retorna el HTML base del contenedor del toast.
 * Se inyecta en el layout principal al montar la app.
 */
function tplToast(){
  return `<div class="toast" id="toast"><span id="tmsg">OK</span></div>`;
}
