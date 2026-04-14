/** Página Botes: retorna el HTML del listado de botes por región. */
function botesInner() {
  return `<div class="ph"><div><h2>Botes</h2><p>Listado de botes y embarcaciones por región</p></div></div>
  <div class="admin-layout" id="mb-layout">
    <div class="card admin-menu" id="mb-regions"></div>
    <div id="mb-right" style="display:flex;flex-direction:column;gap:14px;min-height:0">
      <div class="card admin-content" id="mb-botes-content" style="flex:1;min-height:0"></div>
      <div class="card admin-content" id="mb-botes-global" style="flex:0 0 240px;min-height:0"></div>
    </div>
  </div>`
}

export default function BotesPage() {
  return (
    <div
      className="page"
      id="pg-botes"
      dangerouslySetInnerHTML={{ __html: botesInner() }}
    />
  )
}
