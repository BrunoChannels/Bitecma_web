/** Página Informe: retorna el HTML del formulario y la vista previa; la generación se simula con `runGenerate()`. */
function informeInner() {
  return `<div class="ph"><div><h2>Generar Informe</h2><p>Plantilla DOCX autorrellenable · Formato SUBPESCA</p></div>
    <div class="ph-a"><button class="btn b-teal b-sm" onclick="runGenerate()">Generar DOCX</button></div>
  </div>
  <div style="display:grid;grid-template-columns:310px 1fr;gap:14px">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card">
        <div class="isec">Operación de referencia</div>
        <div class="ig"><label class="il">Sector AMERB</label><select class="is"><option>HUAPE SECTOR B — CORRAL</option><option>AMARGOS</option></select></div>
        <div class="ig"><label class="il">EVADIR vinculado</label><select class="is"><option>OP-2025-033 · Huape B · 17-12-2025</option><option>OP-2026-002 · Amargos · 05-02-2026</option></select></div>
        <div class="i2">
          <div class="ig"><label class="il">N° Seguimiento</label><input class="ii" value="16"></div>
          <div class="ig"><label class="il">Período</label><input class="ii" value="Enero 2026"></div>
        </div>
        <div class="ig"><label class="il">Jefe de proyecto</label><select class="is"><option>Armando Rosson Villalobos</option><option>Lorena Olmos Palacios</option></select></div>
        <div class="i2">
          <div class="ig"><label class="il">Ingresos ($)</label><input class="ii" value="118.258.200"></div>
          <div class="ig"><label class="il">Costos ($)</label><input class="ii" value="11.500.000"></div>
        </div>
        <button class="btn b-teal" style="width:100%;margin-top:4px" onclick="runGenerate()">Generar informe DOCX</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
      <div style="background:var(--bg);padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-family:var(--ff-d);font-weight:700;color:var(--navy)">Vista previa</span>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="pill p-amb" id="inf-status">Borrador</span>
          <button class="btn b-out b-sm" onclick="openInTab('informe')">Abrir</button>
        </div>
      </div>
      <div style="padding:16px;overflow-y:auto;flex:1">
        <div style="background:var(--bg);border-radius:9px;padding:20px;border:1px solid var(--border);font-size:12px;line-height:1.75">
          <div style="text-align:center;margin-bottom:14px">
            <div style="font-family:var(--ff-m);font-size:9px;color:var(--teal);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">SUBSECRETARÍA DE PESCA Y ACUICULTURA</div>
            <div style="font-family:var(--ff-d);font-size:15px;font-weight:900;color:var(--navy)">INFORME DE SEGUIMIENTO N° 16</div>
            <div style="font-size:13px;font-weight:700;margin:5px 0">ÁREA DE MANEJO HUAPE SECTOR B</div>
            <div style="font-size:11px;color:var(--text3)">Región de Los Ríos · Enero 2026</div>
          </div>
          <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
          <div style="font-family:var(--ff-m);font-size:9px;color:var(--teal);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px">Evaluación directa</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bg2);font-size:11px"><span style="color:var(--text3)">Operación origen</span><span>OP-2025-033</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bg2);font-size:11px"><span style="color:var(--text3)">Stock Loco</span><span style="font-weight:700">74.641 ind / 18.399 kg</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span style="color:var(--text3)">B/C</span><span style="font-weight:700;color:var(--green)">10.2</span></div>
        </div>
        <div style="display:flex;gap:7px;margin-top:12px">
          <button class="btn b-teal" style="flex:1" onclick="runGenerate()">Descargar .DOCX</button>
          <button class="btn b-out" style="flex:1" onclick="toast('Enviado a SUBPESCA','green')">Enviar SUBPESCA</button>
        </div>
      </div>
    </div>
  </div>`
}

export default function InformePage() {
  return (
    <div
      className="page"
      id="pg-informe"
      dangerouslySetInnerHTML={{ __html: informeInner() }}
    />
  )
}
