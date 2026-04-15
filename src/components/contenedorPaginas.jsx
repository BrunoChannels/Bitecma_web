/**
 * Retorna el contenedor principal de páginas.
 * Monta todas las páginas (HTML) en el DOM; la navegación solo alterna clases.
 */
function tplPageContainer(){
  return `<div class="main">
      ${pageDashboard()}
      ${pageOps()}
      ${pageEvadir()}
      ${pageHistorico()}
      ${pageInforme()}
      ${pageEspecies()}
      ${pageSectores()}
      ${pageOrgs()}
      ${pageBotes()}
      ${pagePerfil()}
      ${pageAdmin()}
    </div>`;
}
