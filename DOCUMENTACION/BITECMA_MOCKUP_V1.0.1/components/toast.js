let toastT;
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
function tplToast(){
  return `<div class="toast" id="toast"><span id="tmsg">OK</span></div>`;
}
