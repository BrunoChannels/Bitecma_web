/** Bootstrap de la app: monta el HTML (login + layout) y define BD en memoria + funciones globales usadas por los onclick. */
(() => {
  const root = document.getElementById('root');
  if (root) root.innerHTML = tplLogin() + tplApp();

  const ESPECIES = [
    { id: 1, com: 'Loco', sci: 'Concholepas concholepas', lp: true, dens: true },
    { id: 2, com: 'Choro', sci: 'Choromytilus chorus', lp: true, dens: true },
    { id: 3, com: 'Chorito', sci: 'Mytilus chilensis', lp: false, dens: true },
    { id: 4, com: 'Cholga', sci: 'Aulacomya atra', lp: false, dens: true },
    { id: 5, com: 'Erizo rojo', sci: 'Loxechinus albus', lp: true, dens: true },
    { id: 6, com: 'Lapa bonete', sci: 'Fissurella costata', lp: false, dens: true },
    { id: 7, com: 'Lapa rosada', sci: 'Fissurella cumingi', lp: false, dens: true },
    { id: 8, com: 'Lapa negra', sci: 'Fissurella nigra', lp: true, dens: true },
    { id: 9, com: 'Lapa blanquilla', sci: 'Fissurella limbata', lp: false, dens: true },
    { id: 10, com: 'Lapa reina', sci: 'Fissurella maxima', lp: false, dens: true },
    { id: 11, com: 'Lapa negra (latimarginata)', sci: 'Fissurella latimarginata', lp: false, dens: true },
    { id: 12, com: 'Lapa picta', sci: 'Fissurella picta', lp: false, dens: true },
    { id: 13, com: 'Lapa spp.', sci: 'Fissurella spp.', lp: false, dens: true },
    { id: 14, com: 'Huiro negro', sci: 'Lessonia berteroana', lp: false, dens: true },
    { id: 15, com: 'Huiro palo', sci: 'Lessonia trabeculata', lp: false, dens: true },
    { id: 16, com: 'Cochayuyo', sci: 'Durvillaea antarctica', lp: false, dens: true },
    { id: 17, com: 'Huiro canutillo', sci: 'Macrocystis integrifolia', lp: false, dens: true },
    { id: 18, com: 'Huiro', sci: 'Macrocystis pyrifera', lp: false, dens: true },
    { id: 19, com: 'Piure', sci: 'Pyura chilensis', lp: false, dens: true },
    { id: 20, com: 'Almeja', sci: 'Retrotapes lenticularis', lp: false, dens: true },
    { id: 21, com: 'Tumbao', sci: 'Semele solida', lp: false, dens: true },
    { id: 22, com: 'Almeja venus', sci: 'Venus antiqua', lp: false, dens: true },
    { id: 23, com: 'Taca', sci: 'Protothaca thaca', lp: true, dens: true },
    { id: 24, com: 'Almeja rufa', sci: 'Retrotapes rufa', lp: false, dens: true },
    { id: 25, com: 'Culengue', sci: 'Gari solida', lp: false, dens: true },
    { id: 26, com: 'Macha', sci: 'Mesodesma donacium', lp: true, dens: true },
    { id: 27, com: 'Pepino de mar', sci: 'Athyonidium chilensis', lp: false, dens: true },
    { id: 28, com: 'Huepo', sci: 'Ensis macha', lp: false, dens: true },
    { id: 29, com: 'Navajuela', sci: 'Tagelus dombeii', lp: false, dens: true },
    { id: 30, com: 'Luga roja', sci: 'Gigartina skottsbergii', lp: false, dens: true },
    { id: 31, com: 'Luga negra', sci: 'Sarcothalia crispata', lp: false, dens: true },
    { id: 32, com: 'Luga cuchara', sci: 'Mazzaella laminarioides', lp: false, dens: true },
    { id: 33, com: 'Juliana', sci: 'Tawera gayi', lp: false, dens: true },
    { id: 34, com: 'Taquilla', sci: 'Mulinia edulis', lp: false, dens: true },
    { id: 35, com: 'Caracol picuyo', sci: 'Odontocymbiola magellanica', lp: false, dens: true },
    { id: 36, com: 'Caracol trophon', sci: 'Trophon geversianus', lp: false, dens: true }
  ];

  const SECTORES = ['ALEPUE', 'AMARGOS', 'BAHÍA POLOCUÉ SECTOR A', 'BAHÍA POLOCUÉ SECTOR B', 'BONIFACIO SECTOR A', 'CALETA BOCA DEL BARCO', 'CALETA HUEICOLLA', 'CALETA HUIDO', 'CASCAJAL SECTOR A', 'CHAIHUIN SECTOR A', 'CHAIHUIN SECTOR B', 'CHAN CHAN', 'CHIGUALOCO', 'CORRAL', 'EL QUISCO SECTOR A', 'HUAPE SECTOR A', 'HUAPE SECTOR B', 'ISLA DEL REY', 'LOS VILOS SECTOR A', 'LOS VILOS SECTOR B', 'MEHUIN SECTOR B', 'MISSISSIPI', 'PIEDRA BLANCA'];

  const ORGS = { AMARGOS: 'S.T.I. BUZOS, PESCADORES ARTESANALES DE AMARGO', 'HUAPE SECTOR B': 'S.T.I. PESCADORES, BUZOS... CALETA DE HUAPE', 'LOS VILOS SECTOR B': 'S.T.I. PESCADORES ARTESANALES LOS VILOS', 'EL QUISCO SECTOR A': 'S.T.I. NARCISO AGUIRRE DE PESCADORES ARTESANALES' };

  const DB = {
    operaciones: [
      {
        id: 'OP-2026-002', region: 14, sector: 'AMARGOS', tipoOrg: 'STI',
        org: 'S.T.I. BUZOS, PESCADORES ARTESANALES DE AMARGO',
        numSeg: 16, fechaInicio: '2026-02-05', fechaFin: '2026-02-05',
        botes: [
          {
            id: 'B1', nombre: 'BRUNO', buzo: 'ERWIN MONSALVE', zona: 1,
            lpMuestras: {
              1: [{ l: 104, p: 267 }, { l: 96, p: 236 }, { l: 108, p: 321 }, { l: 115, p: 340 }, { l: 101, p: 234 }],
              5: [{ l: 80, p: 190 }, { l: 96, p: 246 }, { l: 92, p: 274 }, { l: 86, p: 196 }, { l: 85, p: 218 }]
            },
            transectos: [
              { num: 1, tipo: 'transecto', area: 120, fecha: '2026-02-05', x: 629738.19, y: 5583972.56, lon: -73.48269, lat: -39.88439, sustrato: 'ROCA', cubierta: 'ALGAS', counts: { 1: 0, 5: 40 } },
              { num: 2, tipo: 'transecto', area: 120, fecha: '2026-02-05', x: 629744.56, y: 5584010.8, lon: -73.48262, lat: -39.88404, sustrato: 'ROCA', cubierta: 'PIURE', counts: { 1: 68, 5: 29 } },
              { num: 3, tipo: 'transecto', area: 120, fecha: '2026-02-05', x: 629849.72, y: 5584074.53, lon: -73.4814, lat: -39.88345, sustrato: 'ROCA', cubierta: 'PIURE', counts: { 1: 99, 5: 57 } }
            ]
          },
          {
            id: 'B2', nombre: 'DON TAQUITO', buzo: 'RODRIGO MUÑOZ', zona: 2,
            lpMuestras: {
              1: [{ l: 110, p: 312 }, { l: 95, p: 228 }, { l: 118, p: 355 }],
              5: [{ l: 77, p: 183 }, { l: 88, p: 215 }]
            },
            transectos: [
              { num: 4, tipo: 'transecto', area: 120, fecha: '2026-02-05', x: 629808.3, y: 5584080.91, lon: -73.48189, lat: -39.8834, sustrato: 'ROCA', cubierta: 'ALGAS', counts: { 1: 53, 5: 0 } },
              { num: 5, tipo: 'transecto', area: 120, fecha: '2026-02-05', x: 629868.84, y: 5584154.2, lon: -73.4812, lat: -39.88273, sustrato: 'ROCA', cubierta: 'ALGAS', counts: { 1: 49, 5: 0 } }
            ]
          },
          {
            id: 'B3', nombre: 'ESTRELLA', buzo: 'CARLOS MEZA', zona: 3,
            lpMuestras: { 3: [{ l: 44, p: 18 }, { l: 52, p: 22 }, { l: 38, p: 14 }, { l: 61, p: 31 }] },
            transectos: [
              { num: 1, tipo: 'cuadrante', area: 0.0625, fecha: '2026-02-05', x: 629900.1, y: 5584200.3, lon: -73.4805, lat: -39.8822, sustrato: 'ROCA', cubierta: 'ALGAS PARDAS', counts: { 3: 12, 4: 8 } },
              { num: 2, tipo: 'cuadrante', area: 0.0625, fecha: '2026-02-05', x: 629915.4, y: 5584218.6, lon: -73.48031, lat: -39.88204, sustrato: 'ROCA', cubierta: 'ALGAS PARDAS', counts: { 3: 18, 4: 5 } },
              { num: 3, tipo: 'cuadrante', area: 0.25, fecha: '2026-02-05', x: 629930.8, y: 5584235.9, lon: -73.48013, lat: -39.88187, sustrato: 'ROCA', cubierta: 'PIURE', counts: { 3: 9, 4: 11 } }
            ]
          }
        ]
      },
      {
        id: 'OP-2025-033', region: 14, sector: 'HUAPE SECTOR B', tipoOrg: 'STI',
        org: 'S.T.I. PESCADORES... CALETA DE HUAPE',
        numSeg: 16, fechaInicio: '2025-12-17', fechaFin: '2025-12-17',
        botes: [
          {
            id: 'B1', nombre: 'PELÍCANO', buzo: 'HUGO CARRILLO', zona: 1,
            lpMuestras: { 1: [{ l: 104, p: 267 }, { l: 96, p: 236 }, { l: 115, p: 340 }] },
            transectos: [
              { num: 1, tipo: 'transecto', area: 120, fecha: '2025-12-17', x: 629200.1, y: 5594100.2, lon: -73.50001, lat: -40.00012, sustrato: 'ROCA', cubierta: 'ALGAS', counts: { 1: 72, 8: 12 } },
              { num: 2, tipo: 'transecto', area: 120, fecha: '2025-12-17', x: 629218.4, y: 5594132.6, lon: -73.4998, lat: -39.99985, sustrato: 'ROCA', cubierta: 'PIURE', counts: { 1: 55, 8: 8 } },
              { num: 3, tipo: 'cuadrante', area: 0.25, fecha: '2025-12-17', x: 629240, y: 5594160, lon: -73.4996, lat: -39.9996, sustrato: 'ROCA', cubierta: 'ALGAS PARDAS', counts: { 31: 4, 30: 2 } }
            ]
          }
        ]
      }
    ]
  };

  let toastT;
  /** Muestra una notificación flotante (toast) con estilo por tipo (normal/green/red). */
  window.toast = function toast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.style.background = type === 'green' ? '#065f46' : type === 'red' ? '#7f1d1d' : 'var(--navy)';
    const tmsg = document.getElementById('tmsg');
    if (tmsg) tmsg.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  };

  /** Marca el rol seleccionado en el login (solo UI). */
  window.selRole = function selRole(el) {
    document.querySelectorAll('.role-opt').forEach((b) => b.classList.remove('sel'));
    el.classList.add('sel');
  };

  /** Vuelve al login, ocultando la app. */
  window.logout = function logout() {
    document.getElementById('scr-app')?.classList.remove('active');
    document.getElementById('scr-login')?.classList.add('active');
    toast('Sesión cerrada');
  };

  /** Entra al sistema: oculta login, muestra app y renderiza widgets iniciales. */
  window.enterApp = function enterApp() {
    document.getElementById('scr-login')?.classList.remove('active');
    document.getElementById('scr-app')?.classList.add('active');
    renderDashBars();
    renderEspTbl();
    renderContinuity();
    toast('Bienvenido');
  };

  /** Navegación interna: activa una página por id y actualiza breadcrumb + estado del sidebar. */
  window.goPage = function goPage(id) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav').forEach((n) => n.classList.remove('on'));
    const pg = document.getElementById('pg-' + id);
    const nav = document.getElementById('nav-' + id);
    if (!pg) return;
    pg.classList.add('active');
    if (nav) nav.classList.add('on');
    const labels = { dashboard: 'Dashboard', ops: 'Operaciones', evadir: 'EVADIR', historico: 'Histórico', informe: 'Informes', especies: 'Especies', sectores: 'Sectores', orgs: 'Organizaciones' };
    const secs = { dashboard: 'Principal', ops: 'Trabajo de Campo', evadir: 'Trabajo de Campo', historico: 'Análisis', informe: 'Análisis', especies: 'Maestros', sectores: 'Maestros', orgs: 'Maestros' };
    const topbc = document.getElementById('topbc');
    if (topbc) topbc.innerHTML = `<span>${secs[id] || ''}</span><span>/</span><span class="cur">${labels[id] || id}</span>`;
    if (id === 'ops') { initFiltros(); aplicarFiltros(); }
  };

  /** Abre el modal genérico con título, contenido HTML y tamaño opcional. */
  window.openMo = function openMo(title, body, size = '') {
    const titleEl = document.getElementById('mtitle');
    const bodyEl = document.getElementById('mbody');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = body;
    const box = document.getElementById('mb');
    if (box) box.className = 'mb-box' + (size ? ' ' + size : '');
    document.getElementById('mo')?.classList.add('open');
  };

  /** Cierra el modal genérico. */
  window.closeMo = function closeMo() { document.getElementById('mo')?.classList.remove('open'); };
  /** Cierra el modal al hacer click fuera del contenido. */
  window.closeMoOut = function closeMoOut(e) { if (e.target === document.getElementById('mo')) closeMo(); };

  /** Abre la ventana modal de notificaciones (mock). */
  window.openNotif = function openNotif() {
    openMo('Notificaciones', `<div style="display:flex;flex-direction:column;gap:9px">
  <div class="info-box amber">Advertencia <div><strong>2 outliers en EVADIR HUAPE B</strong><br>T-4 y T-10 — Revisar densidad</div></div>
  <div class="info-box teal">Operación completada <div><strong>OP-2026-002 — AMARGOS</strong><br>5 transectos · 2 botes · muestras L-P ingresadas</div></div>
</div>`);
  };

  /** Renderiza el gráfico simple de barras del dashboard (solo una vez). */
  function renderDashBars() {
    const el = document.getElementById('dash-bars');
    if (!el || el.childElementCount > 0) return;
    const d = [{ v: 1000, c: 'var(--teal)' }, { v: 201, c: 'var(--amber)' }, { v: 180, c: 'var(--teal)' }, { v: 85, c: 'var(--green)' }, { v: 720, c: 'var(--teal)' }, { v: 180, c: 'var(--amber)' }, { v: 32, c: 'var(--blue)' }, { v: 320, c: 'var(--teal)' }];
    const mx = Math.max(...d.map((x) => x.v));
    el.innerHTML = d.map((x) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
    <div style="width:100%;border-radius:3px 3px 0 0;background:${x.c};height:${x.v / mx * 88}px;cursor:pointer;transition:filter .15s" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter=''"></div>
  </div>`).join('');
  }

  /** Inicializa selects de filtros (sectores y meses) a partir de la BD en memoria. */
  window.initFiltros = function initFiltros() {
    const selSector = document.getElementById('flt-sector');
    const selMes = document.getElementById('flt-mes');
    if (!selSector || !selMes) return;
    const sectores = [...new Set(DB.operaciones.map((o) => o.sector))].sort();
    selSector.innerHTML = '<option value="">Todos los sectores</option>' + sectores.map((s) => `<option value="${s}">${s}</option>`).join('');
    const meses = [...new Set(DB.operaciones.flatMap((o) => {
      const fechas = [o.fechaInicio];
      if (o.fechaFin !== o.fechaInicio) fechas.push(o.fechaFin);
      return fechas.map((f) => {
        const d = new Date(f);
        return { val: f.slice(0, 7), lbl: d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) };
      });
    }).reduce((acc, cur) => { acc.set(cur.val, cur.lbl); return acc; }, new Map()).entries())].sort((a, b) => b[0].localeCompare(a[0]));
    selMes.innerHTML = '<option value="">Todas las fechas</option>' + meses.map(([val, lbl]) => `<option value="${val}">${lbl}</option>`).join('');
  };

  /** Devuelve el listado de operaciones filtradas por sector/mes/texto. */
  function getOpsFiltradas() {
    const sector = document.getElementById('flt-sector')?.value || '';
    const mes = document.getElementById('flt-mes')?.value || '';
    const texto = (document.getElementById('flt-texto')?.value || '').toLowerCase().trim();
    return DB.operaciones.filter((op) => {
      if (sector && op.sector !== sector) return false;
      if (mes && !op.fechaInicio.startsWith(mes) && !op.fechaFin.startsWith(mes)) return false;
      if (texto) {
        const haystack = [op.id, op.sector, op.org, op.tipoOrg, ...op.botes.map((b) => b.nombre + ' ' + b.buzo)].join(' ').toLowerCase();
        if (!haystack.includes(texto)) return false;
      }
      return true;
    });
  }

  /** Aplica filtros y renderiza la lista de operaciones, actualizando el contador. */
  window.aplicarFiltros = function aplicarFiltros() {
    const filtradas = getOpsFiltradas();
    renderOps(filtradas);
    const total = DB.operaciones.length;
    const n = filtradas.length;
    const res = document.getElementById('flt-resultado');
    if (res) {
      if (n === total) {
        res.textContent = `${total} operaciones`;
        res.style.color = 'var(--text3)';
      } else {
        res.textContent = `${n} de ${total} operaciones`;
        res.style.color = n === 0 ? 'var(--red)' : 'var(--teal)';
      }
    }
  };

  /** Limpia filtros y vuelve a renderizar la lista completa de operaciones. */
  window.limpiarFiltros = function limpiarFiltros() {
    const s = document.getElementById('flt-sector');
    const m = document.getElementById('flt-mes');
    const t = document.getElementById('flt-texto');
    const r = document.getElementById('flt-resultado');
    if (s) s.value = '';
    if (m) m.value = '';
    if (t) t.value = '';
    if (r) { r.textContent = `${DB.operaciones.length} operaciones`; r.style.color = 'var(--text3)'; }
    renderOps();
  };

  /** Renderiza el listado de operaciones en el contenedor de la página Operaciones. */
  function renderOps(lista) {
    const el = document.getElementById('ops-list');
    if (!el) return;
    const ops = lista || DB.operaciones;
    if (ops.length === 0) {
      el.innerHTML = `<div class="info-box amber"><span>i</span><div>No se encontraron operaciones con los filtros aplicados. Intenta con otros criterios o <button class="btn b-out b-xs" onclick="limpiarFiltros()" style="margin-left:4px">Limpiar</button></div></div>`;
      return;
    }
    el.innerHTML = ops.map((op) => buildOpCard(op)).join('');
  }

  /** Construye el HTML de la tarjeta de una operación (cabecera + lista de botes). */
  function buildOpCard(op) {
    const totalTx = op.botes.reduce((s, b) => s + b.transectos.length, 0);
    const totalLPMuestras = op.botes.reduce((s, b) => s + Object.values(b.lpMuestras).reduce((s2, m) => s2 + m.length, 0), 0);
    return `<div class="card mb">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">
      <div>
        <div style="font-family:var(--ff-d);font-size:15px;font-weight:700;color:var(--navy)">${op.id} — ${op.sector}</div>
        <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap">
          <span class="pill p-teal">Región ${op.region}</span>
          <span class="pill p-slt">${op.tipoOrg}</span>
          <span class="pill p-blu">SEG-${op.numSeg}</span>
          <span class="pill p-grn">Fecha ${op.fechaInicio}${op.fechaFin !== op.fechaInicio ? ' → ' + op.fechaFin : ''}</span>
          <span class="pill p-pur">${op.botes.length} botes · ${totalTx} unidades densidad</span>
          <span class="pill p-amb">${totalLPMuestras} muestras L-P</span>
        </div>
      </div>
      <div style="display:flex;gap:7px;flex-shrink:0">
        <button class="btn b-out b-sm" onclick="openNuevoBote('${op.id}')">Agregar bote</button>
        <button class="btn b-teal b-sm" onclick="openEvadirPreview('${op.id}')">Previsualizar EVADIR</button>
      </div>
    </div>
    <div id="botes-${op.id}">${op.botes.map((b) => buildBoteCard(op.id, b)).join('')}</div>
    <button class="btn b-out b-sm" style="margin-top:6px" onclick="openNuevoBote('${op.id}')">Agregar bote</button>
  </div>`;
  }

  /** Construye el HTML de un bote: header colapsable + tabs L-P y Densidad. */
  function buildBoteCard(opId, b) {
    const totalTx = b.transectos.length;
    const totalM = Object.values(b.lpMuestras).reduce((s, m) => s + m.length, 0);
    const espLP = Object.keys(b.lpMuestras).map((id) => ESPECIES.find((e) => e.id == id)?.com).join(', ');
    return `<div class="bote-card">
    <div class="bote-hd ${b._open ? 'open-hd' : ''}" id="bhd_${opId}_${b.id}" onclick="toggleBote('${opId}','${b.id}')">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="bote-icon ${b._open ? 'open-ic' : ''}">OF</div>
        <div>
          <div class="bote-name">${b.nombre} <span style="font-weight:400;font-size:12px;opacity:.7">· Zona ${b.zona} · ${b.buzo}</span></div>
          <div class="bote-meta">${totalTx} unidades densidad (${b.transectos.filter((t) => t.tipo !== 'cuadrante').length} transecto(s) · ${b.transectos.filter((t) => t.tipo === 'cuadrante').length} cuadrante(s)) · ${totalM} muestras L-P${espLP ? ' · ' + espLP : ''}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="pill p-teal">Zona ${b.zona}</span>
        ${b.transectos.some((t) => t.tipo === 'cuadrante') ? `<span class="pill p-pur">Cuadrantes</span>` : ''}
        ${b.transectos.some((t) => t.tipo !== 'cuadrante') ? `<span class="pill p-blu">Transectos</span>` : ''}
        <span style="font-size:16px;opacity:.5;transition:transform .2s" id="barr_${opId}_${b.id}">${b._open ? '▴' : '▾'}</span>
      </div>
    </div>
    <div class="bote-body ${b._open ? 'open' : ''}" id="bbody_${opId}_${b.id}">
      <div class="btabs">
        <div class="btab ${b._activeTab !== 'dens' ? 'on' : ''}" onclick="switchBoteTab('${opId}','${b.id}','lp')">Peso-Longitud <span style="background:rgba(255,255,255,.3);border-radius:10px;padding:1px 6px;font-size:10px">${totalM}</span></div>
        <div class="btab ${b._activeTab === 'dens' ? 'on' : ''}" onclick="switchBoteTab('${opId}','${b.id}','dens')">Densidad <span style="background:rgba(255,255,255,.3);border-radius:10px;padding:1px 6px;font-size:10px">${totalTx}</span></div>
      </div>
      <div id="tab_lp_${opId}_${b.id}" style="display:${b._activeTab !== 'dens' ? 'block' : 'none'}">
        ${buildLPTab(opId, b)}
      </div>
      <div id="tab_dens_${opId}_${b.id}" style="display:${b._activeTab === 'dens' ? 'block' : 'none'}">
        ${buildDensTab(opId, b)}
      </div>
    </div>
  </div>`;
  }

  /** Construye el HTML del tab Peso-Longitud (por bote) con tarjetas por especie y acceso a ingresar muestras. */
  function buildLPTab(opId, b) {
    const espIds = Object.keys(b.lpMuestras).map(Number);
    const espCards = espIds.map((eid) => {
      const sp = ESPECIES.find((e) => e.id == eid);
      const muestras = b.lpMuestras[eid] || [];
      return `<div style="border:1px solid var(--border);border-radius:9px;overflow:hidden;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;background:var(--bg);border-bottom:1px solid var(--border)">
        <div>
          <span style="font-weight:700;font-size:13px;color:var(--navy)">${sp?.com || '?'}</span>
          <span style="font-size:10px;color:var(--text3);font-style:italic;margin-left:6px">${sp?.sci || ''}</span>
          <span class="pill p-teal" style="margin-left:6px">${muestras.length} muestras</span>
        </div>
        <button class="btn b-teal b-xs" onclick="openIngresarMuestras('${opId}','${b.id}',${eid})">Ingresar muestras</button>
      </div>
      <div style="padding:9px 13px;overflow-x:auto">
        <table class="lp-tbl" style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr><th>#</th><th>Long. (mm)</th><th>Peso (g)</th><th></th></tr></thead>
          <tbody>${muestras.slice(0, 5).map((m, i) => `<tr>
            <td style="color:var(--text3)">${i + 1}</td>
            <td>${m.l} mm</td><td>${m.p} g</td>
            <td><button class="btn b-out b-xs" onclick="borrarLP('${opId}','${b.id}',${eid},${i})">Eliminar</button></td>
          </tr>`).join('')}
          ${muestras.length > 5 ? `<tr><td colspan="4" style="text-align:center;color:var(--text3);font-size:11px;padding:7px">... y ${muestras.length - 5} más · <button class="btn b-out b-xs" onclick="openIngresarMuestras('${opId}','${b.id}',${eid})">Ver</button></td></tr>` : ''}
          ${muestras.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:14px;font-size:12px">Sin muestras · <button class="btn b-teal b-xs" onclick="openIngresarMuestras('${opId}','${b.id}',${eid})">Ingresar</button></td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>`;
    }).join('');
    return `<div>
    <div class="info-box teal" style="margin-bottom:11px">
      <span>i</span>
      <div>Las muestras de <strong>Peso-Longitud se asocian al bote/zona</strong>, no al transecto individual. Agrega o selecciona las especies a muestrear para este bote.</div>
    </div>
    ${espCards}
    <button class="btn b-out b-sm" onclick="openSelEspeciesLP('${opId}','${b.id}')">Agregar especie</button>
  </div>`;
  }

  /** Construye el HTML del tab Densidad (por bote) listando unidades (transectos/cuadrantes) y acciones de agregar. */
  function buildDensTab(opId, b) {
    const txCards = b.transectos.map((t) => buildTxCard(opId, b.id, t)).join('');
    return `<div>
    <div class="info-box purple" style="margin-bottom:11px">
      <span>i</span>
      <div>Registra el conteo de individuos por especie. Puedes usar <strong>Transectos</strong> (área variable) o <strong>Cuadrantes</strong> (0.25 m², 0.0625 m², u otro tamaño).</div>
    </div>
    ${txCards}
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn b-out b-sm" onclick="openNuevoTransecto('${opId}','${b.id}','transecto')">Agregar transecto</button>
      <button class="btn b-out b-sm" style="border-color:var(--purple);color:var(--purple)" onclick="openNuevoTransecto('${opId}','${b.id}','cuadrante')">Agregar cuadrante</button>
    </div>
  </div>`;
  }

  /** Construye el HTML de una unidad de densidad (transecto/cuadrante), incluyendo edición de conteos y cubierta. */
  function buildTxCard(opId, boteId, t) {
    const esCuad = t.tipo === 'cuadrante';
    const tipoColor = esCuad ? 'p-pur' : 'p-blu';
    const numLabel = esCuad ? `C${t.num}` : `T${t.num}`;
    const areaTxt = esCuad ? `${t.area} m² (cuadrante)` : `${t.area} m²`;
    const espKeys = Object.keys(t.counts).map(Number).filter((id) => t.counts[id] > 0);
    const spRows = Object.keys(t.counts).map((id) => {
      const sp = ESPECIES.find((e) => e.id == id);
      const n = t.counts[id];
      const dens = (n / t.area).toFixed(4);
      return `<div class="sp-row">
      <div class="sp-row-name"><div>${sp?.com || '?'}</div><div class="sp-row-sci">${sp?.sci || ''}</div></div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" value="${n}" min="0" style="width:70px;padding:4px 7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-family:var(--ff-m);text-align:center;font-weight:700;background:var(--bg);outline:none"
            oninput="updateCount('${opId}','${boteId}',${t.num},${id},this.value)"
            onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--border)'">
          <span style="font-size:11px;color:var(--text3)">ind.</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--ff-m);font-size:11px;color:var(--teal);font-weight:700">${dens}</div>
        <div style="font-size:9px;color:var(--text3)">ind/m²</div>
      </div>
      <button class="btn b-out b-xs" onclick="removeSpFromTx('${opId}','${boteId}',${t.num},${id})">Quitar</button>
    </div>`;
    }).join('');
    return `<div class="tx-card" style="${esCuad ? 'border-color:var(--purple)' : ''}">
    <div class="tx-hd" onclick="toggleTx('${opId}','${boteId}',${t.num})" style="${esCuad ? 'background:var(--purple-lt)' : ''}">
      <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
        <span class="pill ${tipoColor}" style="font-size:11px;font-weight:700">${numLabel}</span>
        <span class="pill ${esCuad ? 'p-pur' : 'p-slt'}" style="font-size:10px">${esCuad ? 'Cuadrante' : 'Transecto'}</span>
        <span style="font-size:12px;color:var(--text2)">${t.fecha} · ${areaTxt} · ${t.sustrato} · ${t.cubierta}</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${espKeys.map((id) => { const sp = ESPECIES.find((e) => e.id == id); return `<span class="pill ${esCuad ? 'p-pur' : 'p-teal'}">${sp?.com || '?'}: ${t.counts[id]}</span>`; }).join('')}</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <button class="btn b-out b-xs" onclick="event.stopPropagation();openAddEspTx('${opId}','${boteId}',${t.num})">Agregar especie</button>
        <span style="color:var(--text3);font-size:14px">▾</span>
      </div>
    </div>
    <div class="tx-body" id="tx_${opId}_${boteId}_${t.num}">
      <div style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:${esCuad ? 'var(--purple-lt)' : 'var(--blue-lt)'};border-radius:8px;margin-bottom:11px;font-size:11px">
        <span style="color:${esCuad ? 'var(--purple)' : 'var(--blue)'};font-weight:700">${esCuad ? 'Cuadrante' : 'Transecto'} ${numLabel}</span>
        <span style="color:var(--text3)">·</span>
        <span style="font-family:var(--ff-m);color:${esCuad ? 'var(--purple)' : 'var(--blue)'}">Área: ${areaTxt}</span>
      </div>
      <div class="i3" style="margin-bottom:11px;font-size:11px">
        <div><div class="il">Fecha</div><div style="font-family:var(--ff-m)">${t.fecha}</div></div>
        <div><div class="il">X (UTM)</div><div style="font-family:var(--ff-m)">${t.x.toFixed(2)}</div></div>
        <div><div class="il">Y (UTM)</div><div style="font-family:var(--ff-m)">${t.y.toFixed(2)}</div></div>
        <div><div class="il">Longitud °</div><div style="font-family:var(--ff-m)">${t.lon}</div></div>
        <div><div class="il">Latitud °</div><div style="font-family:var(--ff-m)">${t.lat}</div></div>
        <div><div class="il">${esCuad ? 'Área cuadrante (m²)' : 'Área transecto (m²)'}</div><div style="font-family:var(--ff-m)">${t.area}</div></div>
        <div><div class="il">Sustrato</div><div style="font-family:var(--ff-m)">${t.sustrato}</div></div>
        <div style="grid-column:span 2"><div class="il">Cubierta biológica</div>
          <select style="width:100%;padding:5px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:11px;background:var(--bg);outline:none" onchange="updateCubierta('${opId}','${boteId}',${t.num},this.value)">
            ${['ALGAS PARDAS', 'ALGAS ROJAS', 'ALGAS', 'PIURE', 'SIN COBERTURA', 'MIXTA'].map((c) => `<option ${c === t.cubierta ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="font-family:var(--ff-m);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Conteo de especies</div>
      ${spRows}
      <button class="btn b-out b-sm" style="margin-top:6px" onclick="openAddEspTx('${opId}','${boteId}',${t.num})">Agregar especie</button>
    </div>
  </div>`;
  }

  /** Abre/cierra un bote dentro de una operación y re-renderiza la vista de operaciones. */
  window.toggleBote = function toggleBote(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    b._open = !b._open;
    if (!b._activeTab) b._activeTab = 'lp';
    aplicarFiltros();
    setTimeout(() => { document.getElementById('bhd_' + opId + '_' + boteId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
  };

  /** Cambia el tab activo del bote (lp o dens) y re-renderiza la vista. */
  window.switchBoteTab = function switchBoteTab(opId, boteId, tab) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    b._activeTab = tab;
    aplicarFiltros();
  };

  /** Abre/cierra el detalle de un transecto/cuadrante dentro del bote. */
  window.toggleTx = function toggleTx(opId, boteId, txNum) {
    const el = document.getElementById(`tx_${opId}_${boteId}_${txNum}`);
    if (el) el.classList.toggle('open');
  };

  /** Actualiza el conteo de una especie dentro de una unidad de densidad. */
  window.updateCount = function updateCount(opId, boteId, txNum, spId, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) t.counts[spId] = parseInt(val) || 0;
  };

  /** Actualiza la cubierta biológica de una unidad de densidad. */
  window.updateCubierta = function updateCubierta(opId, boteId, txNum, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) t.cubierta = val;
    toast(`Cubierta actualizada: ${val}`, 'green');
  };

  /** Abre modal para crear una operación (cabecera: región/sector/org/seg/fechas). */
  window.openNuevaOp = function openNuevaOp() {
    const opts = SECTORES.map((s) => `<option>${s}</option>`).join('');
    openMo('Nueva operación', `
    <div class="info-box teal" style="margin-bottom:14px"><span>i</span><div>Una operación agrupa todos los datos de campo de un día o rango de fechas en un sector. Dentro de ella se crearán los botes, y en cada bote se ingresarán las muestras L-P y los transectos de densidad.</div></div>
    <div class="i2">
      <div class="ig"><label class="il">Región</label>
        <select class="is" id="op-reg"><option value="14">XIV — Los Ríos</option><option value="5">V — Valparaíso</option><option value="4">IV — Coquimbo</option><option value="10">X — Los Lagos</option><option value="11">XI — Aysén</option></select>
      </div>
      <div class="ig"><label class="il">N° Seguimiento / ESBA</label><input class="ii" id="op-seg" value="16"></div>
    </div>
    <div class="ig"><label class="il">Sector AMERB</label>
      <select class="is" id="op-sec" onchange="autoOrg()">${opts}</select>
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Tipo organización</label>
        <select class="is" id="op-tipo"><option>STI</option><option>AINDG</option><option>SCOOP</option><option>ASOC</option></select>
      </div>
      <div class="ig"><label class="il">Nombre organización</label><input class="ii" id="op-org" placeholder="S.T.I. ..."></div>
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Fecha inicio</label><input class="ii" id="op-fi" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="ig"><label class="il">Fecha fin</label><input class="ii" id="op-ff" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="crearOp()">Crear operación</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'slim');
    const sec = document.getElementById('op-sec');
    if (sec) sec.value = 'AMARGOS';
    autoOrg();
  };

  /** Autocompleta el nombre de organización según el sector seleccionado (si existe en ORGS). */
  window.autoOrg = function autoOrg() {
    const s = document.getElementById('op-sec')?.value;
    const inp = document.getElementById('op-org');
    if (inp && s && ORGS[s]) inp.value = ORGS[s];
  };

  /** Crea la operación en la BD en memoria y refresca filtros/listado. */
  window.crearOp = function crearOp() {
    const id = 'OP-2026-' + String(DB.operaciones.length + 10).padStart(3, '0');
    DB.operaciones.unshift({
      id, region: parseInt(document.getElementById('op-reg')?.value),
      sector: document.getElementById('op-sec')?.value,
      tipoOrg: document.getElementById('op-tipo')?.value,
      org: document.getElementById('op-org')?.value,
      numSeg: parseInt(document.getElementById('op-seg')?.value) || 16,
      fechaInicio: document.getElementById('op-fi')?.value,
      fechaFin: document.getElementById('op-ff')?.value,
      botes: []
    });
    closeMo();
    toast(`Operación ${id} creada. Agrega botes.`, 'green');
    initFiltros();
    aplicarFiltros();
  };

  /** Abre modal para agregar un bote dentro de una operación. */
  window.openNuevoBote = function openNuevoBote(opId) {
    openMo(`Nuevo bote — ${opId}`, `
    <div class="info-box blue" style="margin-bottom:13px"><span>i</span><div>Cada bote opera en una zona de muestreo. Tendrá sus propias muestras de Peso-Longitud (por bote) y sus propios transectos de densidad.</div></div>
    <div class="i2">
      <div class="ig"><label class="il">Nombre del bote</label><input class="ii" id="bn" placeholder="BRUNO"></div>
      <div class="ig"><label class="il">Zona de muestreo</label><input class="ii" id="bz" type="number" value="1" min="1" max="10"></div>
    </div>
    <div class="ig"><label class="il">Nombre del buzo</label><input class="ii" id="bb" placeholder="NOMBRE APELLIDO BUZO"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="crearBote('${opId}')">Crear bote</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'slim');
  };

  /** Crea el bote en la operación y deja el bote expandido por defecto. */
  window.crearBote = function crearBote(opId) {
    const nombre = (document.getElementById('bn')?.value || '').toUpperCase();
    const zona = parseInt(document.getElementById('bz')?.value) || 1;
    const buzo = (document.getElementById('bb')?.value || '').toUpperCase();
    if (!nombre || !buzo) { toast('Completa nombre de bote y buzo', 'red'); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    if (op) op.botes.push({ id: 'B' + Date.now(), nombre, buzo, zona, lpMuestras: {}, transectos: [], _open: true, _activeTab: 'lp' });
    closeMo();
    toast(`Bote ${nombre} · Zona ${zona} agregado`, 'green');
    aplicarFiltros();
  };

  /** Abre selector de especies para muestreo L-P asociado a un bote. */
  window.openSelEspeciesLP = function openSelEspeciesLP(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const ya = Object.keys(b?.lpMuestras || {}).map(Number);
    openMo(`Especies a muestrear (L-P) — Bote ${b?.nombre}`, `
    <div class="info-box teal" style="margin-bottom:13px"><span>i</span><div>Selecciona las especies cuyos individuos el biólogo ha pedido extraer y medir. Las muestras se asocian a este bote/zona muestreo.</div></div>
    <div style="margin-bottom:11px"><input class="flt" style="width:100%" placeholder="Buscar especie..." oninput="filterSpGrid(this.value,'sp-grid-lp')"></div>
    <div class="sp-grid" id="sp-grid-lp">
      ${ESPECIES.map((sp) => `<div class="sp-chip ${ya.includes(sp.id) ? 'sel' : ''}" data-id="${sp.id}" onclick="toggleSpChip(this)">
        <div class="sp-chip-name">${sp.com}${sp.lp ? ' ★' : ''}</div>
        <div class="sp-chip-sci">${sp.sci}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:8px">★ = especie con registro L-P frecuente</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="confirmarEspeciesLP('${opId}','${boteId}')">Confirmar</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'wide');
  };

  /** Filtra la grilla de especies por texto (para selector L-P y densidad). */
  window.filterSpGrid = function filterSpGrid(q, gridId) {
    document.querySelectorAll(`#${gridId} .sp-chip`).forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  };

  /** Activa/desactiva visualmente un chip de especie en las grillas de selección. */
  window.toggleSpChip = function toggleSpChip(el) { el.classList.toggle('sel'); };

  /** Confirma especies seleccionadas para L-P y abre el ingreso de muestras para la primera especie. */
  window.confirmarEspeciesLP = function confirmarEspeciesLP(opId, boteId) {
    const sel = [...document.querySelectorAll('#sp-grid-lp .sp-chip.sel')].map((el) => parseInt(el.dataset.id));
    if (!sel.length) { toast('Selecciona al menos una especie', 'red'); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (b) sel.forEach((id) => { if (!b.lpMuestras[id]) b.lpMuestras[id] = []; });
    closeMo();
    toast(`${sel.length} especie(s) agregadas al bote ${b?.nombre}`, 'green');
    setTimeout(() => openIngresarMuestras(opId, boteId, sel[0]), 200);
  };

  /** Abre el modal de ingreso rápido de muestras L-P para una especie y bote. */
  window.openIngresarMuestras = function openIngresarMuestras(opId, boteId, spId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const sp = ESPECIES.find((e) => e.id == spId);
    if (!b || !sp) return;
    if (!b.lpMuestras[spId]) b.lpMuestras[spId] = [];
    const muestras = b.lpMuestras[spId];
    const espIds = Object.keys(b.lpMuestras).map(Number);
    const tabs = espIds.map((eid) => {
      const s = ESPECIES.find((e) => e.id == eid);
      return `<button class="btn ${eid == spId ? 'b-teal' : 'b-out'} b-sm" onclick="closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${eid}),100)">${s?.com || '?'} (${b.lpMuestras[eid]?.length || 0})</button>`;
    }).join('');
    const rows = muestras.map((m, i) => `<tr>
    <td style="font-family:var(--ff-m);font-size:10px;color:var(--text3)">${i + 1}</td>
    <td>${m.l} mm</td><td>${m.p ?? '—'} g</td>
    <td><button class="btn b-out b-xs" onclick="borrarLP('${opId}','${boteId}',${spId},${i});closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)">Eliminar</button></td>
  </tr>`).join('');
    openMo(`Muestras L-P — ${sp.com} · Bote ${b.nombre} · Zona ${b.zona}`, `
    <div style="margin-bottom:14px;display:flex;gap:6px;flex-wrap:wrap">${tabs}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <span style="font-size:13px;font-weight:700;color:var(--navy)">${sp.com}</span>
        <em style="font-size:11px;color:var(--text3);margin-left:6px">${sp.sci}</em>
        <div style="font-size:11px;color:var(--text3);font-family:var(--ff-m);margin-top:2px">${op?.sector} · ${b.buzo} · Zona ${b.zona} · SEG-${op?.numSeg}</div>
      </div>
      <span class="lp-counter" id="lp-cnt">${muestras.length} muestras</span>
    </div>
    <div class="lp-input-row">
      <div class="ig"><label class="il">Longitud (mm)</label>
        <input class="ii" id="inp-l" type="number" placeholder="ej. 104" min="1" max="999" autofocus
          style="font-size:17px;font-weight:700;text-align:center"
          onkeydown="if(event.key==='Enter'){document.getElementById('inp-p')?.focus();}">
      </div>
      <div class="ig"><label class="il">Peso (g)</label>
        <input class="ii" id="inp-p" type="number" placeholder="ej. 267" min="0" max="99999"
          style="font-size:17px;font-weight:700;text-align:center"
          onkeydown="if(event.key==='Enter')addLP('${opId}','${boteId}',${spId})">
      </div>
      <button class="btn b-teal" style="padding:10px 18px;font-size:15px;white-space:nowrap" onclick="addLP('${opId}','${boteId}',${spId})">Agregar</button>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Presiona Enter en Peso para agregar · Los campos se vacían automáticamente</div>
    <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">#</th>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">Long. (mm)</th>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">Peso (g)</th>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg)"></th>
        </tr></thead>
        <tbody id="lp-rows">${rows}</tbody>
      </table>
      ${muestras.length === 0 ? `<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">Sin muestras aún · Ingresa la primera arriba</div>` : ''}
    </div>
    <div style="display:flex;gap:7px;margin-top:14px;border-top:1px solid var(--border);padding-top:13px">
      <button class="btn b-green" style="flex:1" id="btn-fin-lp" onclick="finalizarLP('${opId}','${boteId}',${spId},${espIds.indexOf(spId)},${JSON.stringify(espIds)})">Finalizar ${sp.com}</button>
      <button class="btn b-out" onclick="closeMo();aplicarFiltros()">Cerrar y guardar</button>
    </div>
  `, 'wide');
  };

  /** Agrega una muestra L-P a la BD en memoria y actualiza la tabla del modal al vuelo. */
  window.addLP = function addLP(opId, boteId, spId) {
    const il = document.getElementById('inp-l');
    const ip = document.getElementById('inp-p');
    const l = parseFloat(il?.value);
    const p = parseFloat(ip?.value);
    if (isNaN(l) || l <= 0) { toast('Longitud inválida', 'red'); il?.focus(); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b?.lpMuestras[spId]) b.lpMuestras[spId] = [];
    const muestra = { l };
    if (!isNaN(p) && p >= 0) muestra.p = p;
    b.lpMuestras[spId].push(muestra);
    const n = b.lpMuestras[spId].length;
    const tbody = document.getElementById('lp-rows');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:6px 9px;border-bottom:1px solid var(--border);font-family:var(--ff-m);font-size:10px;color:var(--text3)">${n}</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)">${l} mm</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)">${muestra.p ?? '—'} g</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)"><button class="btn b-out b-xs" onclick="borrarLP('${opId}','${boteId}',${spId},${n - 1});closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)">Eliminar</button></td>`;
      tbody.appendChild(tr);
      tbody.parentElement.parentElement.scrollTop = 999;
    }
    const cnt = document.getElementById('lp-cnt');
    if (cnt) cnt.textContent = `${n} muestras`;
    const sp = ESPECIES.find((e) => e.id == spId);
    const btn = document.getElementById('btn-fin-lp');
    if (btn) btn.textContent = `Finalizar ${sp?.com} (${n})`;
    if (il) { il.value = ''; il.focus(); }
    if (ip) ip.value = '';
    toast(`Muestra ${n}: ${l}mm${muestra.p ? ' / ' + muestra.p + 'g' : ''}`, 'green');
  };

  /** Elimina una muestra L-P por índice desde la BD en memoria. */
  window.borrarLP = function borrarLP(opId, boteId, spId, idx) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (b?.lpMuestras[spId]) b.lpMuestras[spId].splice(idx, 1);
  };

  /** Finaliza una especie en el flujo L-P y avanza a la siguiente especie del bote (si existe). */
  window.finalizarLP = function finalizarLP(opId, boteId, spId, idx, espIds) {
    closeMo();
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const sp = ESPECIES.find((e) => e.id == spId);
    const n = b?.lpMuestras[spId]?.length || 0;
    const nextIdx = idx + 1;
    if (nextIdx < espIds.length) {
      const nextId = espIds[nextIdx];
      const nsp = ESPECIES.find((e) => e.id == nextId);
      toast(`${sp?.com} finalizado (${n} muestras). Continúa con ${nsp?.com}...`, 'green');
      setTimeout(() => openIngresarMuestras(opId, boteId, nextId), 200);
    } else {
      toast(`Todas las especies finalizadas para bote ${b?.nombre}`, 'green');
      aplicarFiltros();
    }
  };

  /** Abre modal para crear una unidad de densidad (transecto o cuadrante) dentro del bote. */
  window.openNuevoTransecto = function openNuevoTransecto(opId, boteId, tipoInicial = 'transecto') {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const nextNum = (b?.transectos.length || 0) + 1;
    const esCuad = tipoInicial === 'cuadrante';
    openMo(`${esCuad ? 'Nuevo cuadrante' : 'Nuevo transecto'} — ${b?.nombre} · Zona ${b?.zona}`, `
    <div class="info-box ${esCuad ? 'purple' : 'blue'}" style="margin-bottom:13px">
      <span>i</span>
      <div>${esCuad
        ? 'Los cuadrantes son unidades de muestreo pequeñas (ej. 0.0625 m², 0.25 m²). En el EVADIR generado las columnas se llamarán NUM CUADRANTE y AREA CUADRANTE.'
        : 'Los transectos son fajas rectangulares (ej. 120 m², 60 m², 20 m²). En el EVADIR generado las columnas se llamarán NUM TRANSECTO y AREA TRANSECTO.'}</div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:14px">
      <button id="btn-tipo-tx" class="btn ${esCuad ? 'b-out' : 'b-teal'} b-sm" style="flex:1" onclick="switchTipoUnidad('transecto')">Transecto</button>
      <button id="btn-tipo-cq" class="btn ${esCuad ? 'b-purple' : 'b-out'} b-sm" style="flex:1;${esCuad ? 'background:var(--purple);color:#fff' : ''}" onclick="switchTipoUnidad('cuadrante')">Cuadrante</button>
    </div>
    <input type="hidden" id="tx-tipo" value="${tipoInicial}">
    <div class="i3">
      <div class="ig"><label class="il" id="lbl-num">N° ${esCuad ? 'Cuadrante' : 'Transecto'}</label><input class="ii" id="tx-n" value="${nextNum}"></div>
      <div class="ig">
        <label class="il" id="lbl-area">Área ${esCuad ? 'cuadrante' : 'transecto'} (m²)</label>
        <div style="display:flex;gap:5px;align-items:center">
          <select class="is" id="tx-a-sel" style="flex:1" onchange="onAreaChange(this.value)">
            ${esCuad ? `
            <option value="0.25">0.25 m²</option>
            <option value="0.0625" selected>0.0625 m²</option>
            <option value="0.01">0.01 m²</option>
            <option value="custom">Ingresar manualmente...</option>
            ` : `
            <option value="120" selected>120 m² (30×4m)</option>
            <option value="60">60 m² (30×2m)</option>
            <option value="20">20 m² (10×2m)</option>
            <option value="30">30 m² (15×2m)</option>
            <option value="50">50 m² (25×2m)</option>
            <option value="custom">Ingresar manualmente...</option>
            `}
          </select>
        </div>
        <input class="ii" id="tx-a-manual" type="number" placeholder="Ingresar área..." step="0.0001" min="0.001" style="display:none;margin-top:6px" value="${esCuad ? '0.0625' : '120'}">
        <input type="hidden" id="tx-a" value="${esCuad ? '0.0625' : '120'}">
      </div>
      <div class="ig"><label class="il">Fecha</label><input class="ii" id="tx-f" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div class="i2">
      <div class="ig"><label class="il">X (UTM)</label><input class="ii" id="tx-x" type="number" placeholder="629738" step="0.01"></div>
      <div class="ig"><label class="il">Y (UTM)</label><input class="ii" id="tx-y" type="number" placeholder="5583972" step="0.01"></div>
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Longitud °</label><input class="ii" id="tx-lo" type="number" placeholder="-73.48269" step="0.00001"></div>
      <div class="ig"><label class="il">Latitud °</label><input class="ii" id="tx-la" type="number" placeholder="-39.88439" step="0.00001"></div>
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Tipo de sustrato</label>
        <select class="is" id="tx-s"><option>ROCA</option><option>ROCA/ARENA</option><option>BOLÓN</option><option>ARENA</option><option>MIXTO</option><option>TERTEL</option></select>
      </div>
      <div class="ig"><label class="il">Cubierta biológica</label>
        <select class="is" id="tx-c"><option>ALGAS PARDAS</option><option>ALGAS ROJAS</option><option>ALGAS</option><option>PIURE</option><option>SIN COBERTURA</option><option>MIXTA</option></select>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="crearTransecto('${opId}','${boteId}')">Crear y agregar especies</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `);
  };

  /** Cambia el tipo de unidad (transecto/cuadrante) dentro del modal y ajusta etiquetas + presets de área. */
  window.switchTipoUnidad = function switchTipoUnidad(tipo) {
    const hidden = document.getElementById('tx-tipo');
    if (hidden) hidden.value = tipo;
    const esCuad = tipo === 'cuadrante';
    const btnTx = document.getElementById('btn-tipo-tx');
    const btnCq = document.getElementById('btn-tipo-cq');
    if (btnTx) { btnTx.className = 'btn b-sm ' + (esCuad ? 'b-out' : 'b-teal'); btnTx.style = ''; }
    if (btnCq) { btnCq.className = 'btn b-sm ' + (esCuad ? 'b-purple' : 'b-out'); btnCq.style = esCuad ? 'background:var(--purple);color:#fff' : ''; }
    const lblNum = document.getElementById('lbl-num');
    const lblArea = document.getElementById('lbl-area');
    if (lblNum) lblNum.textContent = 'N° ' + (esCuad ? 'Cuadrante' : 'Transecto');
    if (lblArea) lblArea.textContent = 'Área ' + (esCuad ? 'cuadrante' : 'transecto') + ' (m²)';
    const sel = document.getElementById('tx-a-sel');
    if (sel) {
      if (esCuad) {
        sel.innerHTML = `<option value="0.25">0.25 m²</option><option value="0.0625" selected>0.0625 m²</option><option value="0.01">0.01 m²</option><option value="custom">Ingresar manualmente...</option>`;
        const txa = document.getElementById('tx-a');
        if (txa) txa.value = '0.0625';
      } else {
        sel.innerHTML = `<option value="120" selected>120 m² (30×4m)</option><option value="60">60 m² (30×2m)</option><option value="20">20 m² (10×2m)</option><option value="30">30 m² (15×2m)</option><option value="50">50 m² (25×2m)</option><option value="custom">Ingresar manualmente...</option>`;
        const txa = document.getElementById('tx-a');
        if (txa) txa.value = '120';
      }
      const manual = document.getElementById('tx-a-manual');
      if (manual) manual.style.display = 'none';
    }
  };

  /** Maneja el cambio del preset de área; si es “custom”, habilita el input manual. */
  window.onAreaChange = function onAreaChange(val) {
    const manual = document.getElementById('tx-a-manual');
    const hidden = document.getElementById('tx-a');
    if (val === 'custom') {
      if (manual) { manual.style.display = 'block'; manual.focus(); }
      manual?.addEventListener('input', () => { if (hidden) hidden.value = manual.value; }, { once: false });
      if (hidden) hidden.value = '';
    } else {
      if (manual) manual.style.display = 'none';
      if (hidden) hidden.value = val;
    }
  };

  /** Crea un transecto/cuadrante en la BD en memoria y abre selector de especies para conteo. */
  window.crearTransecto = function crearTransecto(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    const num = parseInt(document.getElementById('tx-n')?.value) || b.transectos.length + 1;
    const tipo = document.getElementById('tx-tipo')?.value || 'transecto';
    const areaHidden = parseFloat(document.getElementById('tx-a')?.value);
    const areaManual = parseFloat(document.getElementById('tx-a-manual')?.value);
    const areaSel = parseFloat(document.getElementById('tx-a-sel')?.value);
    const area = !isNaN(areaHidden) && areaHidden > 0 ? areaHidden :
      !isNaN(areaManual) && areaManual > 0 ? areaManual :
        !isNaN(areaSel) && areaSel > 0 && areaSel.toString() !== 'custom' ? areaSel :
          tipo === 'cuadrante' ? 0.0625 : 120;
    if (isNaN(area) || area <= 0) { toast('Ingresa un área válida', 'red'); return; }
    const fecha = document.getElementById('tx-f')?.value;
    const x = parseFloat(document.getElementById('tx-x')?.value) || 0;
    const y = parseFloat(document.getElementById('tx-y')?.value) || 0;
    const lon = parseFloat(document.getElementById('tx-lo')?.value) || 0;
    const lat = parseFloat(document.getElementById('tx-la')?.value) || 0;
    const sustrato = document.getElementById('tx-s')?.value;
    const cubierta = document.getElementById('tx-c')?.value;
    const esCuad = tipo === 'cuadrante';
    b.transectos.push({ num, tipo, area, fecha, x, y, lon, lat, sustrato, cubierta, counts: {} });
    closeMo();
    toast(`${esCuad ? 'Cuadrante' : 'Transecto'} ${num} creado (${area} m²). Agrega las especies contadas.`, 'green');
    setTimeout(() => openAddEspTx(opId, boteId, num), 200);
  };

  /** Abre modal para seleccionar especies contadas en una unidad de densidad. */
  window.openAddEspTx = function openAddEspTx(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    const ya = Object.keys(t?.counts || {}).map(Number);
    const esCuadLocal = t?.tipo === 'cuadrante';
    openMo(`${esCuadLocal ? 'Cuadrante' : 'Transecto'} — Agregar especies ${esCuadLocal ? 'C' : 'T'}${txNum} · ${b?.nombre}`, `
    <div class="info-box purple" style="margin-bottom:13px"><span>i</span><div>Selecciona las especies contadas en esta unidad. Podrás ingresar el número de individuos observados directamente.</div></div>
    <div style="margin-bottom:11px"><input class="flt" style="width:100%" placeholder="Buscar especie..." oninput="filterSpGrid(this.value,'sp-grid-tx')"></div>
    <div class="sp-grid" id="sp-grid-tx">
      ${ESPECIES.map((sp) => `<div class="sp-chip ${ya.includes(sp.id) ? 'sel' : ''}" data-id="${sp.id}" onclick="toggleSpChip(this)">
        <div class="sp-chip-name">${sp.com}</div>
        <div class="sp-chip-sci">${sp.sci}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="confirmarEspTx('${opId}','${boteId}',${txNum})">Confirmar especies</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'wide');
  };

  /** Confirma especies seleccionadas para densidad e inicializa sus conteos en 0. */
  window.confirmarEspTx = function confirmarEspTx(opId, boteId, txNum) {
    const sel = [...document.querySelectorAll('#sp-grid-tx .sp-chip.sel')].map((el) => parseInt(el.dataset.id));
    if (!sel.length) { toast('Selecciona al menos una especie', 'red'); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) sel.forEach((id) => { if (!(id in t.counts)) t.counts[id] = 0; });
    closeMo();
    toast(`${sel.length} especie(s) agregadas`, 'green');
    aplicarFiltros();
    setTimeout(() => { const body = document.getElementById(`tx_${opId}_${boteId}_${txNum}`); if (body) body.classList.add('open'); }, 100);
  };

  /** Quita una especie del conteo de un transecto/cuadrante. */
  window.removeSpFromTx = function removeSpFromTx(opId, boteId, txNum, spId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) delete t.counts[spId];
    const sp = ESPECIES.find((e) => e.id == spId);
    toast(`${sp?.com} eliminado`, 'green');
    aplicarFiltros();
  };

  /** Abre modal de “subida de Excel” (simulada) para L-P. */
  window.openUploadExcel = function openUploadExcel() {
    openMo('Subir tabla Peso-Longitud (Excel)', `
    <div class="info-box blue" style="margin-bottom:13px"><span>i</span>
      <div>El archivo debe tener columnas: <strong>REGION, NOMBRE SECTOR, TIPO DE ORGANIZACIÓN, NOMBRE ORGANIZACIÓN, FECHA, DIA, MES, AÑO, NUM SEG ESBA, ZONA MUESTREO, BOTE, BUZO, ESPECIE, LONGITUD MM, PESO G</strong></div>
    </div>
    <div style="border:2px dashed var(--border2);border-radius:11px;padding:28px;text-align:center;cursor:pointer;background:var(--bg);transition:all .2s"
      ondragover="this.style.borderColor='var(--teal)';event.preventDefault()"
      ondragleave="this.style.borderColor='var(--border2)'"
      ondrop="handleDrop(event)">
      <div style="font-size:36px;margin-bottom:10px">Archivo</div>
      <div style="font-weight:700;color:var(--navy);margin-bottom:5px">Arrastra aquí tu archivo Excel</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:14px">O haz clic para seleccionar</div>
      <input type="file" id="fi" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFile(event)">
      <button class="btn b-teal b-sm" onclick="document.getElementById('fi').click()">Seleccionar archivo</button>
    </div>
    <div id="file-prev" style="display:none;margin-top:12px"></div>
    <div style="margin-top:12px;font-size:11px;color:var(--text3)">
      Para los que prefieren Excel: <a href="#" onclick="toast('Descargando plantilla...');return false" style="color:var(--teal)">descarga la plantilla oficial</a>.
    </div>
  `);
  };

  /** Simula el drop de un archivo: muestra el preview de importación. */
  window.handleDrop = function handleDrop(e) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) simulateFile(f.name); };
  /** Simula la selección de archivo: muestra el preview de importación. */
  window.handleFile = function handleFile(e) { const f = e.target.files[0]; if (f) simulateFile(f.name); };

  /** Renderiza el estado “archivo detectado” y acción de importación (simulada). */
  function simulateFile(name) {
    const prev = document.getElementById('file-prev');
    if (!prev) return;
    prev.style.display = 'block';
    prev.innerHTML = `<div class="info-box teal">OK <div><strong>${name}</strong> detectado. Columnas validadas.<br>
      <button class="btn b-teal b-sm" style="margin-top:8px" onclick="closeMo();toast('Excel importado: ${name} · 1000 filas procesadas','green')">Importar datos</button>
    </div></div>`;
  }

  /** Abre el asistente de generación EVADIR: lista operaciones y permite seleccionar una. */
  window.openGenEvadir = function openGenEvadir() {
    const opsHTML = DB.operaciones.map((op) => {
      const totalTx = op.botes.reduce((s, b) => s + b.transectos.length, 0);
      const totalM = op.botes.reduce((s, b) => s + Object.values(b.lpMuestras).reduce((s2, m) => s2 + m.length, 0), 0);
      return `<div class="op-card" onclick="selOpEvadir(this,'${op.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">${op.id}</div>
        <span class="pill p-teal">SEG-${op.numSeg}</span>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <span class="pill p-blu">${op.sector}</span>
        <span class="pill p-grn">Fecha ${op.fechaInicio}${op.fechaFin !== op.fechaInicio ? ' → ' + op.fechaFin : ''}</span>
        <span class="pill p-pur">${totalTx} unidades densidad</span>
        <span class="pill p-amb">${totalM} muestras L-P</span>
      </div>
    </div>`;
    }).join('');
    openMo('Generar EVADIR — Seleccionar operación', `
    <div class="info-box blue" style="margin-bottom:13px"><span>i</span><div>El EVADIR se construye automáticamente desde la operación seleccionada, combinando los transectos de densidad y las muestras de Peso-Longitud.</div></div>
    <div class="i2" style="margin-bottom:13px">
      <div class="ig"><label class="il">Filtrar por sector</label><select class="is"><option>Todos</option>${SECTORES.map((s) => `<option>${s}</option>`).join('')}</select></div>
      <div class="ig"><label class="il">Filtrar por empresa</label><select class="is"><option>Todas</option><option>Bitecma Ltda.</option></select></div>
    </div>
    <div style="font-family:var(--ff-m);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Operaciones disponibles</div>
    <div>${opsHTML}</div>
    <button class="btn b-teal" style="width:100%;margin-top:12px" id="btn-gen-ev" disabled onclick="proceedGenEv()">Generar EVADIR</button>
  `, 'wide');
  };

  let selEvOp = null;
  /** Selecciona la operación desde la lista y habilita el botón para continuar. */
  window.selOpEvadir = function selOpEvadir(el, opId) {
    document.querySelectorAll('.op-card').forEach((c) => c.classList.remove('sel'));
    el.classList.add('sel');
    selEvOp = opId;
    const btn = document.getElementById('btn-gen-ev');
    if (btn) { btn.disabled = false; btn.textContent = `Generar EVADIR desde ${opId}`; }
  };

  /** Continúa a la previsualización EVADIR con la operación seleccionada. */
  window.proceedGenEv = function proceedGenEv() {
    if (!selEvOp) return;
    closeMo();
    setTimeout(() => openEvadirPreview(selEvOp), 200);
  };

  /** Alias para abrir la previsualización EVADIR desde tablas/listados. */
  window.openEvadirViewer = function openEvadirViewer(opId) { openEvadirPreview(opId); };

  /** Construye la previsualización EVADIR (Densidad + L-P) desde la operación seleccionada. */
  window.openEvadirPreview = function openEvadirPreview(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) { toast('Operación no encontrada', 'red'); return; }
    const densRowsTx = [];
    const densRowsCuad = [];
    op.botes.forEach((b) => {
      b.transectos.forEach((t) => {
        const esCuad = t.tipo === 'cuadrante';
        const espKeys = Object.keys(t.counts).map(Number);
        const row = {
          region: op.region, sector: op.sector, tipoOrg: op.tipoOrg, org: op.org,
          fecha: t.fecha, dia: t.fecha.slice(8, 10), mes: t.fecha.slice(5, 7), año: t.fecha.slice(0, 4),
          numSeg: op.numSeg, zona: b.zona, bote: b.nombre, buzo: b.buzo,
          numTx: t.num, area: t.area, sustrato: t.sustrato, cubierta: t.cubierta,
          x: t.x.toFixed(2), y: t.y.toFixed(2), lon: t.lon, lat: t.lat, datum: 'WGS 84',
          counts: t.counts, espKeys, tipo: t.tipo || 'transecto'
        };
        if (esCuad) densRowsCuad.push(row); else densRowsTx.push(row);
      });
    });
    const densRows = [...densRowsTx, ...densRowsCuad];
    const allSpIds = [...new Set(densRows.flatMap((r) => r.espKeys))];
    const allSp = allSpIds.map((id) => ESPECIES.find((e) => e.id == id)).filter(Boolean);
    const hasTxRows = densRowsTx.length > 0;
    const hasCuadRows = densRowsCuad.length > 0;

    const lpSections = [];
    op.botes.forEach((b) => {
      Object.entries(b.lpMuestras).forEach(([spId, muestras]) => {
        if (!muestras.length) return;
        const sp = ESPECIES.find((e) => e.id == spId);
        const rows = muestras.map((m, i) => `<tr style="${i % 2 === 0 ? '' : 'background:var(--bg)'}">
        <td>${op.region}</td><td>${op.sector}</td><td>${op.tipoOrg}</td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${op.org}</td>
        <td>${op.fechaInicio}</td>
        <td>${op.fechaInicio.slice(8, 10)}</td><td>${op.fechaInicio.slice(5, 7)}</td><td>${op.fechaInicio.slice(0, 4)}</td>
        <td>${op.numSeg}</td><td>${b.zona}</td><td>${b.nombre}</td><td>${b.buzo}</td>
        <td><em>${sp?.sci || '?'}</em></td>
        <td style="font-family:var(--ff-m);text-align:center;font-weight:700">${m.l}</td>
        <td style="font-family:var(--ff-m);text-align:center">${m.p ?? '—'}</td>
      </tr>`).join('');
        lpSections.push({ sp, bote: b.nombre, zona: b.zona, rows, n: muestras.length });
      });
    });

    const lpTabsHTML = lpSections.map((s, i) => `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div>
          <span style="font-weight:700;font-size:13px;color:var(--navy)">${s.sp?.com || '?'}</span>
          <em style="font-size:11px;color:var(--text3);margin-left:6px">${s.sp?.sci || ''}</em>
          <span class="pill p-teal" style="margin-left:6px">Bote ${s.bote} · Zona ${s.zona}</span>
          <span class="pill p-amb">${s.n} muestras</span>
        </div>
        <button class="btn b-out b-xs" onclick="openInTab('lp_${i}_${opId}')">Abrir</button>
      </div>
      <div style="overflow-x:auto;max-height:180px">
        <table class="ev-tbl">
          <thead><tr><th>REGION</th><th>SECTOR</th><th>TIPO ORG</th><th>ORGANIZACIÓN</th><th>FECHA</th><th>DIA</th><th>MES</th><th>AÑO</th><th>SEG</th><th>ZONA</th><th>BOTE</th><th>BUZO</th><th>ESPECIE</th><th>LONG. (mm)</th><th>PESO (g)</th></tr></thead>
          <tbody>${s.rows}</tbody>
        </table>
      </div>
    </div>
  `).join('');

    openMo(`EVADIR — ${opId} · ${op.sector}`, `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:16px">
      <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px"><div style="font-family:var(--ff-m);font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">Sector</div><div style="font-weight:700;font-size:12px;color:var(--navy);margin-top:3px">${op.sector}</div></div>
      <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px"><div style="font-family:var(--ff-m);font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">Seguimiento</div><div style="font-weight:700;font-size:12px;color:var(--navy);margin-top:3px">SEG-${op.numSeg}</div></div>
      <div style="text-align:center;padding:10px;background:var(--blue-lt);border-radius:8px"><div style="font-family:var(--ff-m);font-size:9px;color:var(--blue);text-transform:uppercase;letter-spacing:1px">Transectos</div><div style="font-weight:700;font-size:12px;color:var(--blue);margin-top:3px">${densRowsTx.length}</div></div>
      <div style="text-align:center;padding:10px;background:var(--purple-lt);border-radius:8px"><div style="font-family:var(--ff-m);font-size:9px;color:var(--purple);text-transform:uppercase;letter-spacing:1px">Cuadrantes</div><div style="font-weight:700;font-size:12px;color:var(--purple);margin-top:3px">${densRowsCuad.length}</div></div>
      <div style="text-align:center;padding:10px;background:var(--teal-lt);border-radius:8px"><div style="font-family:var(--ff-m);font-size:9px;color:var(--teal);text-transform:uppercase;letter-spacing:1px">Muestras L-P</div><div style="font-weight:700;font-size:12px;color:var(--teal);margin-top:3px">${lpSections.reduce((s, x) => s + x.n, 0)}</div></div>
    </div>
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">Tabla DENSIDAD</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${hasTxRows ? `<span class="pill p-blu" style="margin-right:4px">${densRowsTx.length} transecto(s)</span>` : ''}
            ${hasCuadRows ? `<span class="pill p-pur">${densRowsCuad.length} cuadrante(s)</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn b-out b-sm" onclick="openInTab('densidad_${opId}')">Abrir</button>
          <button class="btn b-teal b-sm" onclick="toast('Exportando DENSIDAD_${opId}.csv...')">CSV</button>
        </div>
      </div>
      ${densRows.length === 0 ? `<div class="info-box amber"><span>i</span><div>No hay registros de densidad en esta operación. Agrégalos desde <strong>Operaciones</strong>.</div></div>` : ''}
      ${densRows.length > 0 ? `
      <div style="overflow-x:auto;max-height:220px">
        <table class="ev-tbl">
          <thead>
            <tr style="background:#1a3a5c">
              ${hasTxRows && hasCuadRows ? `<th style="background:#7c3aed">TIPO</th>` : ''}
              <th>REGION</th><th>NOMBRE SECTOR</th><th>TIPO ORG</th><th>NOMBRE ORGANIZACIÓN</th>
              <th>FECHA</th><th>DIA</th><th>MES</th><th>AÑO</th><th>NUM SEG ESBA</th>
              <th>ZONA</th><th>BOTE</th><th>BUZO</th>
              <th style="background:${hasCuadRows && !hasTxRows ? '#7c3aed' : '#1d6fa4'}">${hasCuadRows && !hasTxRows ? 'NUM CUADRANTE' : 'NUM TRANSECTO'}</th>
              <th style="background:${hasCuadRows && !hasTxRows ? '#7c3aed' : '#1d6fa4'}">${hasCuadRows && !hasTxRows ? 'AREA CUADRANTE' : 'AREA TRANSECTO'}</th>
              ${allSp.map((s) => `<th>NUM ${s.com.toUpperCase()}</th>`).join('')}
              <th>SUSTRATO</th><th>CUBIERTA</th>
              ${allSp.map((s) => `<th>DENS ${s.com.toUpperCase()}</th>`).join('')}
              <th>X</th><th>Y</th><th>LONG</th><th>LAT</th><th>DATUM</th>
            </tr>
          </thead>
          <tbody>
            ${densRows.map((r, i) => {
              const esCuad = r.tipo === 'cuadrante';
              return `<tr style="${i % 2 === 0 ? '' : 'background:var(--bg)'}">
                ${hasTxRows && hasCuadRows ? `<td><span class="pill ${esCuad ? 'p-pur' : 'p-blu'}" style="font-size:9px">${esCuad ? 'Cuadr' : 'Trans'}</span></td>` : ''}
                <td>${r.region}</td><td>${r.sector}</td><td>${r.tipoOrg}</td>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${r.org}</td>
                <td>${r.fecha}</td><td>${r.dia}</td><td>${r.mes}</td><td>${r.año}</td><td>${r.numSeg}</td>
                <td>${r.zona}</td><td>${r.bote}</td><td>${r.buzo}</td>
                <td style="font-family:var(--ff-m);text-align:center;font-weight:700;color:${esCuad ? 'var(--purple)' : 'var(--blue)'}">${r.numTx}</td>
                <td style="font-family:var(--ff-m);text-align:center">${r.area}</td>
                ${allSpIds.map((id) => `<td style="font-family:var(--ff-m);text-align:center">${r.counts[id] ?? 0}</td>`).join('')}
                <td>${r.sustrato}</td><td>${r.cubierta}</td>
                ${allSpIds.map((id) => `<td style="font-family:var(--ff-m);font-weight:700;color:var(--teal);text-align:center">${((r.counts[id] ?? 0) / r.area).toFixed(4)}</td>`).join('')}
                <td style="font-size:10px">${r.x}</td><td style="font-size:10px">${r.y}</td>
                <td>${r.lon}</td><td>${r.lat}</td><td>WGS 84</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">Tablas PESO-LONGITUD — Por especie y bote</div>
        <button class="btn b-teal b-sm" onclick="toast('Exportando todas las tablas L-P...')">Exportar todas</button>
      </div>
      ${lpSections.length === 0 ? `<div class="info-box amber"><span>i</span><div>No hay muestras de Peso-Longitud en esta operación. Agrégalas desde la sección <strong>Operaciones</strong>.</div></div>` : lpTabsHTML}
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
      <button class="btn b-green" style="flex:1" onclick="closeMo();toast('EVADIR guardado — ${op.sector} SEG-${op.numSeg}','green');goPage('evadir')">Guardar EVADIR</button>
      <button class="btn b-out b-sm" onclick="openInTab('densidad_${opId}')">Densidad</button>
      <button class="btn b-out" onclick="closeMo()">Cerrar</button>
    </div>
  `, 'wide');
  };

  /** Abre una nueva pestaña para export/visualización (densidad, histórico o informe). */
  window.openInTab = function openInTab(type) {
    const win = window.open('', '_blank');
    if (!win) return;
    const style = `<style>body{font-family:DM Sans,sans-serif;padding:28px;background:#f4f6f9;font-size:12px}h2{font-family:serif;color:#1a3a5c;margin-bottom:8px}p{color:#475569;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#1a3a5c;color:#fff;padding:7px 10px;text-align:left;white-space:nowrap;font-size:10px}td{padding:7px 10px;border-bottom:1px solid #e0e5ef;white-space:nowrap}tr:nth-child(even) td{background:#f4f6f9}.sec{color:#0a8f7e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:18px 0 6px;border-bottom:1px dashed #e0e5ef;padding-bottom:4px}</style>`;
    if (type.startsWith('densidad_')) {
      const opId = type.replace('densidad_', '');
      const op = DB.operaciones.find((o) => o.id === opId);
      if (!op) { win.document.write('<html><body>No encontrado</body></html>'); return; }
      const allSpIds = [...new Set(op.botes.flatMap((b) => b.transectos.flatMap((t) => Object.keys(t.counts).map(Number))))];
      const allSp = allSpIds.map((id) => ESPECIES.find((e) => e.id == id)).filter(Boolean);
      const allTx = op.botes.flatMap((b) => b.transectos);
      const hasAnyTx = allTx.some((t) => t.tipo !== 'cuadrante');
      const hasAnyCuad = allTx.some((t) => t.tipo === 'cuadrante');
      const mixedTypes = hasAnyTx && hasAnyCuad;
      const numColName = hasAnyCuad && !hasAnyTx ? 'NUM CUADRANTE' : 'NUM TRANSECTO';
      const areaColName = hasAnyCuad && !hasAnyTx ? 'AREA CUADRANTE' : 'AREA TRANSECTO';
      const hdr = ['REGION', 'NOMBRE SECTOR', 'TIPO DE ORGANIZACIÓN', 'NOMBRE ORGANIZACIÓN', 'FECHA', 'DIA', 'MES', 'AÑO', 'NUM SEG ESBA', 'ZONA MUESTREO', 'BOTE', 'BUZO', numColName, areaColName, ...allSp.map((s) => `NUM ${s.com.toUpperCase()}`), 'TIPO SUSTRATO', 'CUBIERTA BIOLOGICA', ...allSp.map((s) => `DENS ${s.com.toUpperCase()} (N° IND/M2)`), 'X', 'Y', 'LONG', 'LAT', 'DATUM'];
      if (mixedTypes) hdr.splice(0, 0, 'TIPO UNIDAD');
      let rows = '';
      op.botes.forEach((b) => {
        b.transectos.forEach((t) => {
          const esCuad = t.tipo === 'cuadrante';
          const tipoCell = mixedTypes ? `<td style="background:${esCuad ? '#ede9fe' : '#dbeafe'};color:${esCuad ? '#7c3aed' : '#1d6fa4'};font-weight:700">${esCuad ? 'Cuadrante' : 'Transecto'}</td>` : '';
          rows += `<tr>${tipoCell}<td>${op.region}</td><td>${op.sector}</td><td>${op.tipoOrg}</td><td>${op.org}</td><td>${t.fecha}</td><td>${t.fecha.slice(8, 10)}</td><td>${t.fecha.slice(5, 7)}</td><td>${t.fecha.slice(0, 4)}</td><td>${op.numSeg}</td><td>${b.zona}</td><td>${b.nombre}</td><td>${b.buzo}</td><td style="font-weight:700;color:${esCuad ? '#7c3aed' : '#1d6fa4'}">${t.num}</td><td>${t.area}</td>
        ${allSpIds.map((id) => `<td style="text-align:center">${t.counts[id] ?? 0}</td>`).join('')}
        <td>${t.sustrato}</td><td>${t.cubierta}</td>
        ${allSpIds.map((id) => `<td style="text-align:center;font-weight:700;color:#0a8f7e">${((t.counts[id] ?? 0) / t.area).toFixed(4)}</td>`).join('')}
        <td>${t.x.toFixed(2)}</td><td>${t.y.toFixed(2)}</td><td>${t.lon}</td><td>${t.lat}</td><td>WGS 84</td></tr>`;
        });
      });
      const legend = mixedTypes ? `<div style="margin-bottom:12px;padding:10px;background:#f0f4ff;border-radius:8px;font-size:12px"><strong>Operación mixta:</strong> contiene transectos y cuadrantes. La columna TIPO UNIDAD indica el tipo real de cada fila.</div>` : '';
      win.document.write(`<html><head><title>DENSIDAD ${opId}</title>${style}</head><body><h2>Tabla DENSIDAD — ${opId} · ${op.sector} · SEG-${op.numSeg}</h2>${legend}<p>${hasAnyTx ? `Transectos: columnas NUM TRANSECTO / AREA TRANSECTO. ` : ''} ${hasAnyCuad ? `Cuadrantes: columnas NUM CUADRANTE / AREA CUADRANTE.` : ''}</p><table><thead><tr>${hdr.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    } else if (type.startsWith('lp_')) {
      win.document.write(`<html><head><title>L-P Export</title>${style}</head><body><h2>Tabla Peso-Longitud — Exportación</h2><p>Datos de muestras individuales de longitud y peso por especie.</p><p>Abrir en Operaciones para ver datos detallados.</p></body></html>`);
    } else if (type === 'historico') {
      const cont = [
        { zone: 'AMARGOS', segs: [2005, 2006, 2006, 2007, 2009, null, 2012, 2013, 2014, 2015, null, null, null, 2022, 2024, 2026] },
        { zone: 'HUAPE B', segs: [2003, 2005, 2007, 2009, 2011, 2012, 2013, 2014, 2015, 2016, 2018, 2019, 2021, 2022, 2023, 2025] },
        { zone: 'LOS VILOS B', segs: [2000, 2002, 2004, 2006, 2008, 2010, null, 2012, 2014, 2015, 2017, 2019, 2021, null, null, null] }
      ];
      const rows = cont.map((c) => `<tr><td style="font-weight:700">${c.zone}</td>${c.segs.map((s) => `<td style="text-align:center;background:${s ? '#d0f0ec' : '#f1f5f9'};color:${s ? '#065f46' : '#94a3b8'}">${s || '—'}</td>`).join('')}</tr>`).join('');
      win.document.write(`<html><head><title>Histórico AMERB</title>${style}</head><body><h2>Registro histórico seguimientos AMERB · Bitecma 1999–2026</h2><table><thead><tr><th>Zona</th>${Array.from({ length: 16 }, (_, i) => `<th>S${i + 1}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    } else if (type === 'informe') {
      win.document.write(`<html><head><title>Informe SEG-16</title>${style}</head><body>
    <p style="text-align:center;font-size:10px;letter-spacing:2px;color:#0a8f7e;text-transform:uppercase">SUBSECRETARÍA DE PESCA Y ACUICULTURA</p>
    <h2 style="text-align:center">INFORME DE SEGUIMIENTO N° 16</h2>
    <p style="text-align:center;font-weight:700;font-size:16px">ÁREA DE MANEJO HUAPE SECTOR B · CORRAL · Región de Los Ríos · Enero 2026</p>
    <div class="sec">Evaluación directa</div>
    <table><tr><td>Operación origen</td><td>OP-2025-033</td></tr><tr><td>Fecha EVADIR</td><td>17-12-2025</td></tr><tr><td>N° transectos</td><td>48</td></tr><tr><td>Den. Loco</td><td>0.598 ind/m²</td></tr><tr><td>Stock Loco</td><td>74.641 ind / 18.399 kg</td></tr><tr><td>CTP Loco 2026</td><td>33.775 ud / 8.410 kg</td></tr></table>
    <div class="sec">Evaluación económica</div>
    <table><tr><td>Ingresos</td><td>$118.258.200</td></tr><tr><td>Costos</td><td>$11.500.000</td></tr><tr><td>B/C</td><td style="color:#059669;font-weight:700">10.2</td></tr></table>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:22px">Generado por BITECMA Sistema AMERB · 20-03-2026</p>
    </body></html>`);
    }
  };

  /** Renderiza el maestro de especies (tabla) en su página, solo una vez. */
  function renderEspTbl() {
    const tbody = document.getElementById('esp-body');
    if (!tbody || tbody.childElementCount > 0) return;
    tbody.innerHTML = ESPECIES.map((sp) => `<tr>
    <td style="font-family:var(--ff-m);font-size:10px;color:var(--text3)">${sp.id}</td>
    <td><strong>${sp.com}</strong>${sp.lp ? ` <span class="pill p-teal" style="font-size:9px">L-P</span>` : ''}</td>
    <td><em style="color:var(--text2)">${sp.sci}</em></td>
    <td style="font-size:11px;color:var(--text3)">${['Gastropoda', 'Bivalvia', 'Phaeophyceae', 'Echinoidea', 'Ascidiacea', 'Holothuroidea', 'Florideophyceae'][sp.id % 7]}</td>
    <td>${sp.lp ? `<span class="pill p-teal">L-P frecuente</span>` : `<span class="pill p-slt">Densidad</span>`}</td>
  </tr>`).join('');
  }

  /** Renderiza la tabla de continuidad histórica (simulada) en la página Histórico, solo una vez. */
  function renderContinuity() {
    const head = document.getElementById('cont-head');
    const body = document.getElementById('cont-body');
    if (!head || head.childElementCount > 0) return;
    const cols = ['Zona', 'ESBA', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'];
    head.innerHTML = cols.map((h) => `<th>${h}</th>`).join('');
    const cont = [
      { zone: 'AMARGOS', segs: [2005, 2006, 2006, 2007, 2009, null, 2012, 2013, 2014, 2015, null, null, null, 2022, 2024, 2026] },
      { zone: 'HUAPE B', segs: [2003, 2005, 2007, 2009, 2011, 2012, 2013, 2014, 2015, 2016, 2018, 2019, 2021, 2022, 2023, 2025] },
      { zone: 'LOS VILOS B', segs: [2000, 2002, 2004, 2006, 2008, 2010, null, 2012, 2014, 2015, 2017, 2019, 2021, null, null, null] },
      { zone: 'EL QUISCO A', segs: [1999, 2001, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023, null, null, null] }
    ];
    body.innerHTML = cont.map((c) => `<tr>
    <td style="font-weight:700">${c.zone}</td>
    <td><span class="pill ${c.segs.some((s) => s) ? 'p-teal' : 'p-slt'}">${c.segs.some((s) => s) ? '✓' : '—'}</span></td>
    ${c.segs.map((s) => `<td style="text-align:center;font-family:var(--ff-m);font-size:10px;background:${s ? 'var(--teal-lt)' : 'transparent'};color:${s ? 'var(--teal)' : 'var(--text3)'}">${s || '—'}</td>`).join('')}
  </tr>`).join('');
  }

  /** Simula la generación del informe (cambia estado y abre una vista en pestaña). */
  window.runGenerate = function runGenerate() {
    const btn = document.querySelector('#pg-informe .b-teal');
    const st = document.getElementById('inf-status');
    if (btn) btn.disabled = true;
    const msgs = [{ t: 'Cargando BD...', c: 'p-slt' }, { t: 'Procesando...', c: 'p-amb' }, { t: 'Generando DOCX...', c: 'p-blu' }, { t: 'Listo', c: 'p-grn' }];
    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) { if (st) { st.textContent = msgs[i].t; st.className = 'pill ' + msgs[i].c; } i++; }
      else { clearInterval(iv); if (btn) btn.disabled = false; toast('Informe generado', 'green'); setTimeout(() => openInTab('informe'), 600); }
    }, 650);
  };

  window.__DB__ = DB;
  window.__ESPECIES__ = ESPECIES;
})();
