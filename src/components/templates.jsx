/** Layout principal (HTML): toast + modal + topbar + sidebar + contenedor de páginas. */
/**
 * Retorna el layout completo de la app (todas las piezas de UI base).
 * Se inyecta en #root en el bootstrap de app.js.
 */
function tplApp(){
  return `${tplToast()}
${tplModal()}
<div id="scr-app" class="screen">
  ${tplTopbar()}
  <div class="app-body">
    ${tplSidebar()}
    ${tplPageContainer()}
  </div>
</div>`;
}
