/** Página Sectores: retorna el HTML del listado de sectores y accesos rápidos a operaciones. */
function sectoresInner() {
  return `<div class="ph"><div><h2>Sectores</h2><p>Sectores AMERB y caletas por región</p></div></div>
  <div class="admin-layout" style="grid-template-columns: 240px 1fr 1fr;">
    <div class="card admin-menu" id="ms-regions"></div>
    <div class="card admin-content" id="ms-sectores-content"></div>
    <div class="card admin-content" id="ms-caletas-content"></div>
  </div>`
}

export default function SectoresPage() {
  return (
    <div
      className="page"
      id="pg-sectores"
      dangerouslySetInnerHTML={{ __html: sectoresInner() }}
    />
  )
}
