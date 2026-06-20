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
    </div>`;
}
