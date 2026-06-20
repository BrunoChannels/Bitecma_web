/** Layout principal (HTML): toast + modal + topbar + sidebar + contenedor de páginas. */
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
