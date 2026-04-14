/** Página Histórico: retorna el HTML de continuidad de seguimientos y la acción para abrir la vista completa en pestaña. */
function historicoInner() {
  return `<div class="ph"><div><h2>Registro Histórico</h2><p>36.127 transectos · 1999–2026</p></div>
    <div class="ph-a"><button class="btn b-teal b-sm" onclick="openInTab('historico')">Vista completa</button></div>
  </div>
  <div class="g3 mb">
    <div class="sc sc-tl" style="cursor:default"><div class="sc-lbl">Total registros</div><div class="sc-val">36.127</div></div>
    <div class="sc sc-bl" style="cursor:default"><div class="sc-lbl">Sectores únicos</div><div class="sc-val">58</div></div>
    <div class="sc sc-gr" style="cursor:default"><div class="sc-lbl">Rango temporal</div><div class="sc-val" style="font-size:18px">1999–2026</div></div>
  </div>
  <div class="card mb">
    <div class="ct">Continuidad de seguimientos<button class="btn b-out b-sm" onclick="openInTab('historico')">Abrir</button></div>
    <div style="overflow-x:auto"><table class="tbl" id="cont-tbl"><thead><tr id="cont-head"></tr></thead><tbody id="cont-body"></tbody></table></div>
  </div>`
}

export default function HistoricoPage() {
  return (
    <div
      className="page"
      id="pg-historico"
      dangerouslySetInnerHTML={{ __html: historicoInner() }}
    />
  )
}
