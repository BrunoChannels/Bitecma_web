/** Bootstrap de la app: monta el HTML (login + layout) y define BD en memoria + funciones globales usadas por los onclick. */
(() => {
  const THEME_KEY = 'bitecma_theme';
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || ''; } catch { return ''; }
  }
  window.setTheme = function setTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    const cb = document.getElementById('cfg-theme-switch');
    if (cb) cb.checked = t === 'dark';
  };
  const initTheme = getTheme();
  if (initTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  function isAdminRole(rol) {
    const r = String(rol || '').trim().toLowerCase();
    return r === 'admin';
  }

  window.openConfig = function openConfig() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const canAdmin = isAdminRole(getProfile()?.rol);
    openMo('Configuración', `
      <div class="cfg-row">
        <div>
          <div class="cfg-title">Tema oscuro</div>
          <div class="cfg-sub">Activa para usar fondo oscuro en la interfaz</div>
        </div>
        <label class="sw">
          <input id="cfg-theme-switch" type="checkbox" ${isDark ? 'checked' : ''} onchange="setTheme(this.checked ? 'dark' : 'light')">
          <span class="sw-track"></span>
          <span class="sw-thumb"></span>
        </label>
      </div>
      ${canAdmin ? `
      <div class="cfg-row" style="margin-top:10px">
        <div>
          <div class="cfg-title">Operaciones</div>
          <div class="cfg-sub">Exporta o importa operaciones para moverlas a otro PC</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn b-out b-sm" onclick="exportOperaciones('json')">Exportar JSON</button>
          <button class="btn b-out b-sm" onclick="exportOperaciones('js')">Exportar JS</button>
          <button class="btn b-teal b-sm" onclick="importOperaciones()">Importar</button>
        </div>
      </div>
      ` : ''}
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-out" style="flex:1" onclick="closeMo()">Cerrar</button>
        ${canAdmin ? `<button class="btn b-teal" style="flex:1" onclick="closeMo();goPage('admin');adminNav('usuarios')">Panel Admin</button>` : ''}
      </div>
    `, 'slim');
  };

  const PROFILE_KEY = 'bitecma_profile_active';
  const PROFILE_DATA_KEY = 'bitecma_profile_data';
  function getActiveProfileId() {
    try {
      const v = parseInt(localStorage.getItem(PROFILE_KEY) || '');
      return Number.isFinite(v) ? v : 1;
    } catch {
      return 1;
    }
  }
  function setActiveProfileId(id) {
    const v0 = parseInt(id);
    const v = Number.isFinite(v0) ? v0 : 1;
    try { localStorage.setItem(PROFILE_KEY, String(v)); } catch {}
  }
  function loadProfileData() {
    try {
      const raw = localStorage.getItem(PROFILE_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function saveProfileData(map) {
    try { localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(map)); } catch {}
  }
  function getProfile() {
    const id = getActiveProfileId();
    const base = (window.DB?.perfiles || []).find((p) => parseInt(p?.id) === id) || (window.DB?.perfiles || [])[0] || { id, logo: '', nombre: '', correo: '', numero: '', contraseña: '', rol: '' };
    const map = loadProfileData();
    const saved = map && typeof map === 'object' ? map[String(base.id)] : null;
    return saved && typeof saved === 'object' ? { ...base, ...saved } : base;
  }
  function setProfile(next) {
    if (!next || next.id == null) return;
    const id = String(next.id);
    const map = loadProfileData() || {};
    map[id] = { logo: next.logo || '', nombre: next.nombre || '', correo: next.correo || '', numero: next.numero || '', contraseña: next.contraseña || '', rol: next.rol || '' };
    saveProfileData(map);
    const arr = window.DB?.perfiles;
    if (Array.isArray(arr)) {
      const i = arr.findIndex((p) => String(p?.id) === id);
      if (i >= 0) arr[i] = { ...arr[i], ...map[id] };
    }
  }
  function initialsFromName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const a = (parts[0] || '').slice(0, 1).toUpperCase();
    const b = (parts.length > 1 ? parts[parts.length - 1].slice(0, 1) : '').toUpperCase();
    return (a + b) || 'US';
  }
  window.renderUserChip = function renderUserChip() {
    const p = getProfile();
    const av = document.getElementById('tb-user-av');
    const nm = document.getElementById('tb-user-name');
    const rl = document.getElementById('tb-user-role');
    if (nm) nm.textContent = p.nombre ? String(p.nombre) : 'Usuario';
    if (rl) {
      const r = String(p.rol || '').trim();
      const norm = r.toLowerCase();
      rl.textContent = norm === 'admin' ? 'Admin' : (norm === 'biologo' ? 'Biólogo' : (norm === 'analista' ? 'Analista' : (r || '—')));
    }
    if (av) {
      const hasLogo = !!p.logo;
      av.textContent = hasLogo ? '' : initialsFromName(p.nombre);
      av.style.backgroundImage = hasLogo ? `url('${p.logo}')` : '';
      av.style.backgroundSize = hasLogo ? 'cover' : '';
      av.style.backgroundPosition = hasLogo ? 'center' : '';
      av.style.color = hasLogo ? 'transparent' : '';
    }
  };

  const AUDIT_KEY = 'bitecma_audit_log';
  function nowTs() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function readAudit() {
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function writeAudit(arr) {
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(arr)); } catch {}
  }
  window.audit = function audit(action, detail) {
    const p = getProfile();
    const entry = { ts: nowTs(), userId: p?.id, action: String(action || ''), detail: String(detail || '') };
    const arr = readAudit();
    arr.unshift(entry);
    if (arr.length > 250) arr.length = 250;
    writeAudit(arr);
  };
  window.getAuditEntries = function getAuditEntries() {
    return readAudit();
  };

  window.login = function login() {
    const email = String(document.getElementById('login-email')?.value || '').trim().toLowerCase();
    const pass = String(document.getElementById('login-pass')?.value || '');
    if (!email || !pass) { toast('Ingresa correo y contraseña', 'red'); return; }
    const perfilesBase = Array.isArray(window.DB?.perfiles) ? window.DB.perfiles : [];
    const savedMap = loadProfileData();
    const perfiles = perfilesBase.map((p) => {
      const saved = savedMap && typeof savedMap === 'object' ? savedMap[String(p?.id)] : null;
      return saved && typeof saved === 'object' ? { ...p, ...saved } : p;
    });
    const u = perfiles.find((p) => String(p?.correo || '').trim().toLowerCase() === email);
    if (!u) { toast('Usuario no encontrado', 'red'); return; }
    if (u.activo === false) { toast('Usuario inactivo', 'red'); return; }
    if (String(u.contraseña || '') !== pass) { toast('Contraseña incorrecta', 'red'); return; }
    setActiveProfileId(u.id);
    window.audit?.('LOGIN', `Inicio de sesión: ${u.correo}`);
    enterApp();
  };
  window.openUserProfile = function openUserProfile() {
    goPage('perfil');
    window.loadProfileForm?.();
  };
  window.loadProfileForm = function loadProfileForm() {
    const p = getProfile();
    const n = document.getElementById('pf-nombre');
    const c = document.getElementById('pf-correo');
    const t = document.getElementById('pf-telefono');
    const av = document.getElementById('pf-avatar');
    const ini = document.getElementById('pf-initials');
    const saveBtn = document.getElementById('pf-save');
    if (n) n.value = p.nombre || '';
    if (c) c.value = p.correo || '';
    if (t) t.value = p.numero || '';
    if (av) {
      av.style.backgroundImage = p.logo ? `url('${p.logo}')` : '';
      av.style.backgroundSize = p.logo ? 'cover' : '';
      av.style.backgroundPosition = p.logo ? 'center' : '';
    }
    if (ini) {
      ini.textContent = initialsFromName(p.nombre);
      ini.style.opacity = p.logo ? '0' : '1';
    }
    window.__PROFILE_INITIAL__ = { id: p.id, logo: p.logo || '', nombre: p.nombre || '', correo: p.correo || '', numero: p.numero || '', contraseña: p.contraseña || '', rol: p.rol || '' };
    window.__PROFILE_DRAFT_LOGO__ = p.logo || '';
    if (saveBtn) saveBtn.disabled = true;
    renderUserChip();
  };
  window.profileMarkDirty = function profileMarkDirty() {
    const init = window.__PROFILE_INITIAL__;
    const saveBtn = document.getElementById('pf-save');
    if (!init || !saveBtn) return;
    const n = String(document.getElementById('pf-nombre')?.value || '');
    const c = String(document.getElementById('pf-correo')?.value || '');
    const t = String(document.getElementById('pf-telefono')?.value || '');
    const logo = String(window.__PROFILE_DRAFT_LOGO__ || '');
    const dirty = n !== String(init.nombre || '') || c !== String(init.correo || '') || t !== String(init.numero || '') || logo !== String(init.logo || '');
    saveBtn.disabled = !dirty;
  };
  window.onProfileAvatarChange = function onProfileAvatarChange(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const url = String(fr.result || '');
      window.__PROFILE_DRAFT_LOGO__ = url;
      const av = document.getElementById('pf-avatar');
      const ini = document.getElementById('pf-initials');
      if (av) {
        av.style.backgroundImage = `url('${url}')`;
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
      }
      if (ini) ini.style.opacity = '0';
      window.profileMarkDirty?.();
    };
    fr.readAsDataURL(file);
  };
  window.saveProfile = function saveProfile() {
    const init = window.__PROFILE_INITIAL__;
    if (!init) return;
    const nombre = String(document.getElementById('pf-nombre')?.value || '').trim();
    const correo = String(document.getElementById('pf-correo')?.value || '').trim();
    const numero = String(document.getElementById('pf-telefono')?.value || '').trim();
    if (!nombre) { toast('Ingresa nombre completo', 'red'); return; }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { toast('Correo inválido', 'red'); return; }
    const logo = String(window.__PROFILE_DRAFT_LOGO__ || '');
    const next = { ...getProfile(), id: init.id, nombre, correo, numero, logo };
    setProfile(next);
    window.__PROFILE_INITIAL__ = { ...window.__PROFILE_INITIAL__, nombre, correo, numero, logo };
    const saveBtn = document.getElementById('pf-save');
    if (saveBtn) saveBtn.disabled = true;
    renderUserChip();
    window.audit?.('PROFILE_UPDATE', 'Actualizó datos de perfil');
    toast('Perfil actualizado', 'green');
  };
  window.openChangePassword = function openChangePassword() {
    const p = getProfile();
    openMo('Modificar contraseña', `
      <div class="ig"><label class="il">Contraseña actual</label><input class="ii" id="pw-old" type="password"></div>
      <div class="ig"><label class="il">Nueva contraseña</label><input class="ii" id="pw-new" type="password"></div>
      <div class="ig"><label class="il">Confirmar nueva contraseña</label><input class="ii" id="pw-new2" type="password"></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
        <button class="btn b-teal" style="flex:1" onclick="savePassword()">Guardar</button>
      </div>
    `, 'slim');
  };
  window.savePassword = function savePassword() {
    const cur = getProfile();
    const oldV = String(document.getElementById('pw-old')?.value || '');
    const n1 = String(document.getElementById('pw-new')?.value || '');
    const n2 = String(document.getElementById('pw-new2')?.value || '');
    if (!oldV || !n1 || !n2) { toast('Completa todos los campos', 'red'); return; }
    if (oldV !== String(cur.contraseña || '')) { toast('Contraseña actual incorrecta', 'red'); return; }
    if (n1.length < 6) { toast('Nueva contraseña muy corta', 'red'); return; }
    if (n1 !== n2) { toast('Las contraseñas no coinciden', 'red'); return; }
    const next = { ...cur, contraseña: n1 };
    setProfile(next);
    if (window.__PROFILE_INITIAL__?.id === next.id) window.__PROFILE_INITIAL__.contraseña = n1;
    closeMo();
    window.audit?.('PASSWORD_UPDATE', 'Actualizó contraseña');
    toast('Contraseña actualizada', 'green');
  };

  const ESPECIES = Array.isArray(window.DB?.especies) ? window.DB.especies : [];
  const ALGA_IDS = new Set([14, 15, 16, 17, 18, 30, 31, 32]);
  /**
   * Indica si una especie (por id) corresponde a alga/huiro.
   * Se usa para adaptar inputs/reglas (p.ej. L-P vs diámetro de disco) en la app.
   */
  function isAlgaId(spId) { return ALGA_IDS.has(parseInt(spId)); }

  const SECTORES = ['ALEPUE', 'AMARGOS', 'BAHÍA POLOCUÉ SECTOR A', 'BAHÍA POLOCUÉ SECTOR B', 'BONIFACIO SECTOR A', 'CALETA BOCA DEL BARCO', 'CALETA HUEICOLLA', 'CALETA HUIDO', 'CASCAJAL SECTOR A', 'CHAIHUIN SECTOR A', 'CHAIHUIN SECTOR B', 'CHAN CHAN', 'CHIGUALOCO', 'CORRAL', 'EL QUISCO SECTOR A', 'HUAPE SECTOR A', 'HUAPE SECTOR B', 'ISLA DEL REY', 'LOS VILOS SECTOR A', 'LOS VILOS SECTOR B', 'MEHUIN SECTOR B', 'MISSISSIPI', 'PIEDRA BLANCA'];

  const ORGS = { AMARGOS: 'S.T.I. BUZOS, PESCADORES ARTESANALES DE AMARGO', 'HUAPE SECTOR B': 'S.T.I. PESCADORES, BUZOS... CALETA DE HUAPE', 'LOS VILOS SECTOR B': 'S.T.I. PESCADORES ARTESANALES LOS VILOS', 'EL QUISCO SECTOR A': 'S.T.I. NARCISO AGUIRRE DE PESCADORES ARTESANALES' };

  const REGIONES_CHILE = Array.isArray(window.DB?.regionesChile) ? window.DB.regionesChile : [];

  const REGION_ROM = REGIONES_CHILE.reduce((acc, r) => { acc[r.id] = r.rom; return acc; }, {});

  /**
   * Formatea una fecha ISO YYYY-MM-DD a DD/MM/YYYY para la UI.
   */
  function fmtDMY(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  }

  /**
   * Normaliza el nombre de una organización (quita prefijos STI y espacios extra).
   * Se usa al autocompletar/mostrar organizaciones asociadas a un sector.
   */
  function cleanOrgName(s) {
    const v = String(s || '').trim();
    if (!v) return '';
    return v
      .replace(/^\s*S\.?\s*T\.?\s*I\.?\s*/i, '')
      .replace(/^\s*STI\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const CALETAS_CACHE_KEY = 'caletasByRegion_v2';
  const CALETAS_CUSTOM_KEY = 'customCaletasByRegion_v2';
  const ADD_SECTOR_VALUE = '__ADD_SECTOR__';
  const ADD_OPA_VALUE = '__ADD_OPA__';
  const ADD_AMERB_VALUE = '__ADD_AMERB__';
  const OPA_CUSTOM_KEY = 'customOpaByRegion_v1';
  const AMERB_CUSTOM_KEY = 'customAmerbByRegion_v1';
  const CALETAS_BY_REGION_STATIC = {};
  let caletasByRegion = null;
  let caletasLoadPromise = null;

  /**
   * Escapa texto para interpolarlo de forma segura dentro de HTML (atributos y texto).
   */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Lee un valor JSON desde localStorage, con fallback si no existe o falla el parseo.
   * Se usa para cachear caletas y para persistir caletas personalizadas.
   */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Guarda un valor como JSON en localStorage, ignorando errores de cuota/permiso.
   */
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  /**
   * Limpia wikitext/markup típico (refs, plantillas, enlaces) para obtener texto plano.
   * Se usa al parsear la fuente de caletas desde Wikipedia (modo raw).
   */
  function cleanWikitext(s) {
    return String(s || '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
      .replace(/<ref[^\/]*\/>/gi, '')
      .replace(/\{\{[\s\S]*?\}\}/g, '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/''+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parsea el wikitext raw de “Caletas pesqueras de Chile” y construye un mapa por región (nombre textual).
   */
  function parseCaletasByCurrentRegion(raw) {
    const lines = String(raw || '').split(/\r?\n/);
    const map = {};
    let cur = null;
    let expectName = false;
    for (const line0 of lines) {
      const line = line0.trim();
      const m = line.match(/^={2,4}\s*(Región[^=]+?)\s*={2,4}\s*$/);
      if (m) {
        cur = m[1].trim();
        if (!map[cur]) map[cur] = [];
        expectName = false;
        continue;
      }
      if (!cur) continue;
      if (/^\|\s*\d+\s*$/.test(line)) { expectName = true; continue; }
      if (expectName && line.startsWith('|')) {
        expectName = false;
        const name = cleanWikitext(line.slice(1).trim());
        if (!name) continue;
        if (!map[cur].includes(name)) map[cur].push(name);
      }
    }
    return map;
  }

  /**
   * Convierte un mapa de caletas por nombre de región (texto) a un mapa por id de región (número).
   * Esta función permite que la UI trabaje con los ids internos definidos en REGIONES_CHILE.
   */
  function buildCaletasByRegionNumber(byCurrent) {
    const pick = (k) => byCurrent?.[k] || [];
    const uniq = (arr) => [...new Set(arr)];
    const byReg = {
      15: uniq([...pick('Región de Arica y Parinacota')]),
      1: uniq([...pick('Región de Tarapacá')]),
      2: uniq([...pick('Región de Antofagasta')]),
      3: uniq([...pick('Región de Atacama')]),
      4: uniq([...pick('Región de Coquimbo')]),
      5: uniq([...pick('Región de Valparaíso')]),
      6: uniq([...pick("Región del Libertador General Bernardo O'Higgins")]),
      7: uniq([...pick('Región del Maule')]),
      16: uniq([...pick('Región del Ñuble')]),
      8: uniq([...pick('Región del Biobío')]),
      9: uniq([...pick('Región de La Araucanía')]),
      14: uniq([...pick('Región de Los Ríos')]),
      10: uniq([...pick('Región de Los Lagos')]),
      11: uniq([...pick('Región de Aysén del General Carlos Ibáñez del Campo')]),
      12: uniq([...pick('Región de Magallanes y de la Antártica Chilena')]),
      13: []
    };
    Object.keys(byReg).forEach((k) => byReg[k].sort((a, b) => a.localeCompare(b, 'es')));
    return byReg;
  }

  /**
   * Obtiene caletas agregadas manualmente por el usuario (persistidas en localStorage).
   */
  function getCustomCaletasByRegion() {
    const custom = readJSON(CALETAS_CUSTOM_KEY, {});
    return custom && typeof custom === 'object' ? custom : {};
  }

  /**
   * Agrega una caleta personalizada a una región y la persiste en localStorage.
   * Retorna el nombre normalizado o null si no se puede agregar.
   */
  function addCustomCaleta(regionId, name) {
    const id = String(regionId);
    const clean = String(name || '').trim();
    if (!clean) return null;
    const custom = getCustomCaletasByRegion();
    if (!Array.isArray(custom[id])) custom[id] = [];
    const exists = custom[id].some((x) => String(x).toLowerCase() === clean.toLowerCase());
    if (!exists) custom[id].push(clean);
    writeJSON(CALETAS_CUSTOM_KEY, custom);
    return clean;
  }

  function getCustomListByRegion(key) {
    const custom = readJSON(key, {});
    return custom && typeof custom === 'object' ? custom : {};
  }

  function addCustomListItem(key, regionId, name) {
    const id = String(regionId);
    const clean = String(name || '').trim();
    if (!clean) return null;
    const custom = getCustomListByRegion(key);
    if (!Array.isArray(custom[id])) custom[id] = [];
    const exists = custom[id].some((x) => String(x).toLowerCase() === clean.toLowerCase());
    if (!exists) custom[id].push(clean);
    writeJSON(key, custom);
    return clean;
  }

  async function ensureCaletasByRegion() {
    if (caletasByRegion) return caletasByRegion;
    if (caletasLoadPromise) return caletasLoadPromise;
    caletasLoadPromise = (async () => {
      const base = (window.DB && typeof window.DB.caletasByRegionStatic === 'object' && window.DB.caletasByRegionStatic)
        ? window.DB.caletasByRegionStatic
        : null;
      if (base) {
        writeJSON(CALETAS_CACHE_KEY, base);
        return base;
      }
      const cached = readJSON(CALETAS_CACHE_KEY, null);
      if (cached && typeof cached === 'object') return cached;
      writeJSON(CALETAS_CACHE_KEY, CALETAS_BY_REGION_STATIC);
      return CALETAS_BY_REGION_STATIC;
    })().catch(() => ({})).then((m) => { caletasByRegion = m; return m; });
    return caletasLoadPromise;
  }

  /**
   * Retorna la lista de caletas para una región, mezclando base (cache) y caletas personalizadas.
   */
  function getCaletasForRegion(regionId, byReg) {
    const id = String(regionId);
    const base = Array.isArray(byReg?.[id]) ? byReg[id] : [];
    const custom = getCustomCaletasByRegion();
    const extra = Array.isArray(custom?.[id]) ? custom[id] : [];
    const merged = [...new Set([...base, ...extra])];
    merged.sort((a, b) => a.localeCompare(b, 'es'));
    return merged;
  }

  /**
   * Handler: al cambiar la región en el formulario de operación, re-renderiza el select de caletas.
   */
  window.onOpRegionChange = function onOpRegionChange() {
    window.renderOpCaletas?.();
    window.renderOpOpa?.();
    window.renderOpAmerb?.();
  };

  /**
   * Handler: al cambiar el “Sector/Caleta” permite abrir el input de “Agregar Sector...”
   * y sincroniza la organización cuando aplica.
   */
  window.onOpSectorChange = function onOpSectorChange() {
    const secEl = document.getElementById('op-sec');
    const wrap = document.getElementById('op-add-sec-wrap');
    const inp = document.getElementById('op-caleta-new');
    if (!secEl || !wrap || !inp) return;
    const isAdd = secEl.value === ADD_SECTOR_VALUE;
    wrap.style.display = isAdd ? '' : 'none';
    if (!isAdd) inp.value = '';
    autoOrg();
  };

  /**
   * Renderiza el select de caletas en el formulario de operación según la región seleccionada.
   * También integra caletas personalizadas y mantiene (cuando es posible) la selección anterior.
   */
  window.renderOpCaletas = async function renderOpCaletas(prefer) {
    const regEl = document.getElementById('op-reg');
    const secEl = document.getElementById('op-sec');
    if (!regEl || !secEl) return;
    const q = String(document.getElementById('op-sec-q')?.value || '').trim().toLowerCase();
    const regionId = parseInt(regEl.value) || 14;
    const prev = prefer || secEl.value;
    secEl.innerHTML = '<option>Cargando caletas...</option>';
    const byReg = await ensureCaletasByRegion();
    const caletasAll = getCaletasForRegion(regionId, byReg);
    const caletas = q ? caletasAll.filter((s) => String(s || '').toLowerCase().includes(q)) : caletasAll;
    if (!caletasAll.length) {
      secEl.innerHTML = `<option value="${ADD_SECTOR_VALUE}">Agregar caleta...</option><option value="" selected disabled>Sin caletas registradas</option>`;
      secEl.value = '';
      window.onOpSectorChange?.();
      return;
    }
    if (!caletas.length) {
      secEl.innerHTML = `<option value="${ADD_SECTOR_VALUE}">Agregar caleta...</option><option value="" selected disabled>Sin resultados</option>`;
      secEl.value = '';
      window.onOpSectorChange?.();
      return;
    }
    const opts = caletas.map((s) => {
      const label = /^caleta\\s/i.test(s) ? s : `Caleta ${s}`;
      return `<option value="${esc(s)}">${esc(label)}</option>`;
    }).join('');
    secEl.innerHTML = `<option value="${ADD_SECTOR_VALUE}">Agregar caleta...</option>` + opts;
    if (prev === ADD_SECTOR_VALUE) secEl.value = ADD_SECTOR_VALUE;
    else {
      const hasPrev = caletas.some((s) => String(s) === String(prev));
      secEl.value = hasPrev ? prev : (caletas[0] || '');
    }
    window.onOpSectorChange?.();
  };

  window.onOpOpaChange = function onOpOpaChange() {
    const sel = document.getElementById('op-opa');
    const wrap = document.getElementById('op-add-opa-wrap');
    const inp = document.getElementById('op-opa-new');
    if (!sel || !wrap || !inp) return;
    const isAdd = sel.value === ADD_OPA_VALUE;
    wrap.style.display = isAdd ? '' : 'none';
    if (!isAdd) inp.value = '';
  };

  window.renderOpOpa = function renderOpOpa(prefer) {
    const regEl = document.getElementById('op-reg');
    const sel = document.getElementById('op-opa');
    if (!regEl || !sel) return;
    const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = norm(document.getElementById('op-opa-q')?.value || '');
    const regionId = parseInt(regEl.value) || 14;
    const prev = prefer || sel.value;
    const base = Array.isArray(window.DB?.opa) ? window.DB.opa : [];
    const custom = getCustomListByRegion(OPA_CUSTOM_KEY);
    const extra = Array.isArray(custom?.[String(regionId)]) ? custom[String(regionId)] : [];
    const amerbSel = document.getElementById('op-amerb');
    const amerbId = String(amerbSel?.value || '');
    const amerbComuna = (!amerbId || amerbId === ADD_AMERB_VALUE || /^custom:/i.test(amerbId))
      ? ''
      : (Array.isArray(window.DB?.sectores_amerb)
        ? String((window.DB.sectores_amerb.find((x) => String(x?.id) === String(amerbId))?.comuna) || '').trim()
        : '');
    const comunaKey = amerbComuna ? norm(amerbComuna) : '';
    const items = base.filter((o) => parseInt(o?.region) === regionId).map((o) => ({
      value: String(o.id),
      label: String(o.nombre || '').trim(),
      name: String(o.nombre || '').trim(),
      comuna: String(o.comuna || '').trim()
    }));
    extra.forEach((name) => {
      items.push({ value: `custom:${name}`, label: String(name), name: String(name) });
    });
    const dedup = [];
    const seen = new Set();
    items.forEach((it) => {
      const k = norm(it.label);
      if (!k || seen.has(k)) return;
      seen.add(k);
      dedup.push(it);
    });
    const filtered = dedup.filter((it) => {
      if (comunaKey && it.comuna) {
        if (norm(it.comuna) !== comunaKey) return false;
      }
      if (!q) return true;
      return norm(it.label).includes(q) || norm(it.name).includes(q) || norm(it.comuna).includes(q);
    });
    filtered.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    const opts = filtered.map((it) => `<option value="${esc(it.value)}">${esc(it.label)}</option>`).join('');
    sel.innerHTML = `<option value="${ADD_OPA_VALUE}">Agregar organización...</option>` + (opts || `<option value="" selected disabled>Sin organizaciones registradas</option>`);
    if (prev === ADD_OPA_VALUE) sel.value = ADD_OPA_VALUE;
    else sel.value = filtered.some((it) => String(it.value) === String(prev)) ? prev : (filtered[0]?.value || '');
    window.onOpOpaChange?.();
  };

  window.onOpAmerbChange = function onOpAmerbChange() {
    const sel = document.getElementById('op-amerb');
    const wrap = document.getElementById('op-add-amerb-wrap');
    const inp = document.getElementById('op-amerb-new');
    if (!sel || !wrap || !inp) return;
    const isAdd = sel.value === ADD_AMERB_VALUE;
    wrap.style.display = isAdd ? '' : 'none';
    if (!isAdd) inp.value = '';
    window.renderOpOpa?.();
  };

  window.renderOpAmerb = function renderOpAmerb(prefer) {
    const regEl = document.getElementById('op-reg');
    const sel = document.getElementById('op-amerb');
    if (!regEl || !sel) return;
    const q = String(document.getElementById('op-amerb-q')?.value || '').trim().toLowerCase();
    const regionId = parseInt(regEl.value) || 14;
    const prev = prefer || sel.value;
    const base = Array.isArray(window.DB?.sectores_amerb) ? window.DB.sectores_amerb : [];
    const custom = getCustomListByRegion(AMERB_CUSTOM_KEY);
    const extra = Array.isArray(custom?.[String(regionId)]) ? custom[String(regionId)] : [];
    const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const items = base.filter((o) => parseInt(o?.region) === regionId).map((o) => ({
      value: String(o.id),
      label: String(o.nombreamerb || '').trim()
    }));
    extra.forEach((name) => items.push({ value: `custom:${name}`, label: String(name) }));
    const dedup = [];
    const seen = new Set();
    items.forEach((it) => {
      const k = norm(it.label);
      if (!k || seen.has(k)) return;
      seen.add(k);
      dedup.push(it);
    });
    const qn = norm(q);
    const filtered = qn ? dedup.filter((it) => norm(it.label).includes(qn)) : dedup;
    filtered.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    const opts = filtered.map((it) => `<option value="${esc(it.value)}">${esc(it.label)}</option>`).join('');
    sel.innerHTML = `<option value="${ADD_AMERB_VALUE}">Agregar sector AMERB...</option>` + (opts || `<option value="" selected disabled>Sin sectores AMERB</option>`);
    if (prev === ADD_AMERB_VALUE) sel.value = ADD_AMERB_VALUE;
    else sel.value = filtered.some((it) => String(it.value) === String(prev)) ? prev : (filtered[0]?.value || '');
    window.onOpAmerbChange?.();
  };

  const DB = (window.DB && typeof window.DB === 'object')
    ? window.DB
    : ((window.DB_DATA && typeof window.DB_DATA === 'object') ? window.DB_DATA : { operaciones: [] });

  if (!Array.isArray(DB.operaciones)) DB.operaciones = [];

  function refreshOperacionesUI() {
    try { initFiltros?.(); } catch {}
    try { aplicarFiltros?.(); } catch {}
    try { renderEvadirList?.(); } catch {}
  }

  function extractJSONBlockAfter(haystack, anchor) {
    const i = haystack.toLowerCase().indexOf(anchor.toLowerCase());
    if (i < 0) return null;
    const from = haystack.indexOf('{', i);
    const fromArr = haystack.indexOf('[', i);
    const start = (fromArr >= 0 && (from < 0 || fromArr < from)) ? fromArr : from;
    if (start < 0) return null;
    const open = haystack[start];
    const close = open === '[' ? ']' : '}';
    let depth = 0;
    for (let k = start; k < haystack.length; k++) {
      const ch = haystack[k];
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return haystack.slice(start, k + 1);
      }
    }
    return null;
  }

  window.exportOperaciones = function exportOperaciones(fmt) {
    const ops = Array.isArray(DB.operaciones) ? DB.operaciones : [];
    const json = JSON.stringify(ops, null, 2);
    const isJS = String(fmt || '').toLowerCase() === 'js';
    const content = isJS
      ? `window.DB = window.DB || {};\nwindow.DB.operaciones = ${json};\n`
      : json + '\n';
    const type = isJS ? 'text/javascript' : 'application/json';
    const ext = isJS ? 'js' : 'json';
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operaciones.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast(`Exportado operaciones.${ext}`, 'green');
    window.audit?.('EXPORT_OPERACIONES', `Exportó operaciones.${ext}`);
  };

  window.importOperaciones = function importOperaciones() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.js,application/json,text/javascript';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const txt = await file.text();
      const raw = txt.replace(/^\uFEFF/, '');
      let ops = null;
      try {
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(raw);
          ops = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.operaciones) ? parsed.operaciones : null);
        } else {
          const block = extractJSONBlockAfter(raw, 'operaciones');
          if (block) {
            const parsed = JSON.parse(block);
            ops = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.operaciones) ? parsed.operaciones : null);
          }
        }
      } catch {
        ops = null;
      }
      if (!ops) { toast('Archivo inválido', 'red'); return; }
      DB.operaciones = ops;
      refreshOperacionesUI();
      toast('Operaciones importadas', 'green');
      window.audit?.('IMPORT_OPERACIONES', `Importó ${ops.length} operación(es)`);
    };
    input.click();
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
    window.audit?.('LOGOUT', 'Cerró sesión');
    toast('Sesión cerrada');
  };

  /** Entra al sistema: oculta login, muestra app y renderiza widgets iniciales. */
  window.enterApp = function enterApp() {
    document.getElementById('scr-login')?.classList.remove('active');
    document.getElementById('scr-app')?.classList.add('active');
    renderDashBars();
    renderEspTbl();
    renderContinuity();
    window.renderUserChip?.();
    toast('Bienvenido');
  };

  /** Navegación interna: activa una página por id y actualiza breadcrumb + estado del sidebar. */
  window.goPage = function goPage(id) {
    const prev = window.__LAST_PAGE__;
    window.__LAST_PAGE__ = id;
    if (id === 'admin' && !isAdminRole(getProfile()?.rol)) {
      toast('Acceso restringido', 'red');
      id = 'dashboard';
    }
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav').forEach((n) => n.classList.remove('on'));
    const pg = document.getElementById('pg-' + id);
    const nav = document.getElementById('nav-' + id);
    if (!pg) return;
    pg.classList.add('active');
    if (nav) nav.classList.add('on');
    const labels = { dashboard: 'Dashboard', ops: 'Operaciones', evadir: 'EVADIR', historico: 'Histórico', informe: 'Informes', especies: 'Especies', sectores: 'Sectores', orgs: 'Organizaciones', botes: 'Botes', perfil: 'Perfil', admin: 'Panel Admin' };
    const secs = { dashboard: 'Principal', ops: 'Trabajo de Campo', evadir: 'Trabajo de Campo', historico: 'Análisis', informe: 'Análisis', especies: 'Maestros', sectores: 'Maestros', orgs: 'Maestros', botes: 'Maestros', perfil: 'Cuenta', admin: 'Admin' };
    const topbc = document.getElementById('topbc');
    if (topbc) topbc.innerHTML = `<span>${secs[id] || ''}</span><span>/</span><span class="cur">${labels[id] || id}</span>`;
    if (prev !== id) window.audit?.('NAV', `Navegó a: ${id}`);
    if (id === 'ops') { initFiltros(); aplicarFiltros(); }
    if (id === 'evadir') { renderEvadirList(); }
    if (id === 'sectores') { window.renderMaestrosSectores?.(); }
    if (id === 'orgs') { window.renderMaestrosOrgs?.(); }
    if (id === 'botes') { window.renderMaestrosBotes?.(); }
    if (id === 'admin') { window.adminNav?.('usuarios'); }
    if (id === 'perfil') { window.loadProfileForm?.(); }
  };

  function normText(s) {
    return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const LUGA_IDS = new Set([29, 30, 31]);
  function isLugaId(spId) {
    const id = parseInt(spId);
    if (LUGA_IDS.has(id)) return true;
    const sp = ESPECIES.find((e) => parseInt(e?.id) === id);
    return !!sp && normText(sp?.com).includes('luga');
  }

  function regLabel(regionId) {
    const r = (REGIONES_CHILE || []).find((x) => parseInt(x?.id) === parseInt(regionId));
    return r ? `${r.rom} — ${r.nom}` : `Región ${regionId}`;
  }

  window.renderMaestrosSectores = function renderMaestrosSectores() {
    const menu = document.getElementById('ms-regions');
    const content = document.getElementById('ms-sectores-content');
    const caletasContent = document.getElementById('ms-caletas-content');
    if (!menu || !content || !caletasContent) return;
    const amerb = Array.isArray(window.DB?.sectores_amerb) ? window.DB.sectores_amerb : [];
    const regions = (REGIONES_CHILE || []).map((r) => parseInt(r.id)).filter((x) => !isNaN(x));
    const counts = regions.reduce((acc, id) => {
      acc[id] = amerb.filter((s) => parseInt(s?.region) === id).length;
      return acc;
    }, {});
    const sel = Number.isFinite(parseInt(window.__MS_REGION__)) ? parseInt(window.__MS_REGION__) : (regions[0] || 14);
    menu.innerHTML = regions.map((id) => {
      const on = id === sel ? ' on' : '';
      const badge = counts[id] ? `<span class="nav-badge">${counts[id]}</span>` : '';
      return `<div class="admin-item${on}" onclick="msSelectRegion(${id})">Región ${esc(regLabel(id))}${badge}</div>`;
    }).join('');
    window.msSelectRegion?.(sel);
  };

  window.msSelectRegion = function msSelectRegion(regionId) {
    const id = parseInt(regionId);
    window.__MS_REGION__ = id;
    document.querySelectorAll('#ms-regions .admin-item').forEach((el) => el.classList.remove('on'));
    const idx = (REGIONES_CHILE || []).findIndex((r) => parseInt(r.id) === id);
    const items = document.querySelectorAll('#ms-regions .admin-item');
    if (items[idx]) items[idx].classList.add('on');
    
    // Render Sectores AMERB
    const content = document.getElementById('ms-sectores-content');
    if (content) {
      const amerbAll = Array.isArray(window.DB?.sectores_amerb) ? window.DB.sectores_amerb : [];
      const list = amerbAll.filter((s) => parseInt(s?.region) === id);
      list.sort((a, b) => String(a?.nombreamerb || '').localeCompare(String(b?.nombreamerb || ''), 'es', { sensitivity: 'base' }));
      content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
          <div>
            <div style="font-family:var(--ff-d);font-weight:800;color:var(--navy);font-size:15px">Sectores AMERB</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">${esc(regLabel(id))}</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <input class="flt" id="ms-amerb-q" style="width:100%" placeholder="Buscar sector AMERB..." oninput="msFilterAmerb()">
        </div>
        <div id="ms-amerb-list" style="max-height:480px;overflow:auto;border:1px solid var(--border);border-radius:10px">
          ${list.map((s) => `
            <div class="tx-card" data-q="${esc(normText(String(s?.nombreamerb || '')))}" style="padding:12px;margin:0;border:none;border-bottom:1px solid var(--border);border-radius:0">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div>
                  <div style="font-weight:900;color:var(--navy)">${esc(String(s?.nombreamerb || '—'))}</div>
                  <div style="font-size:12px;color:var(--text3);margin-top:2px">Comuna: ${esc(String(s?.comuna || '—'))}</div>
                </div>
              </div>
            </div>
          `).join('') || `<div style="text-align:center;color:var(--text3);padding:18px">Sin sectores AMERB para esta región</div>`}
        </div>
      `;
    }

    // Render Caletas
    const caletasContent = document.getElementById('ms-caletas-content');
    if (caletasContent) {
      const caletas = (window.DB?.caletasByRegionStatic && window.DB.caletasByRegionStatic[id]) ? window.DB.caletasByRegionStatic[id] : [];
      caletasContent.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
          <div>
            <div style="font-family:var(--ff-d);font-weight:800;color:var(--navy);font-size:15px">Caletas</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">${esc(regLabel(id))}</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <input class="flt" id="ms-caletas-q" style="width:100%" placeholder="Buscar caleta..." oninput="msFilterCaletasList()">
        </div>
        <div id="ms-caletas-list" style="max-height:480px;overflow:auto;border:1px solid var(--border);border-radius:10px">
          ${caletas.map((c) => {
            const clean = String(c || '').trim();
            const label = /^caleta\s/i.test(clean) ? clean : `Caleta ${clean}`;
            return `<div class="sp-row" data-q="${esc(normText(clean))}" style="margin:0;border-radius:0;border:none;border-bottom:1px solid var(--border);padding:12px">${esc(label)}</div>`;
          }).join('') || `<div style="text-align:center;color:var(--text3);padding:18px">Sin caletas para esta región</div>`}
        </div>
      `;
    }
  };

  window.msFilterAmerb = function msFilterAmerb() {
    const q = normText(document.getElementById('ms-amerb-q')?.value || '');
    const list = document.getElementById('ms-amerb-list');
    if (!list) return;
    [...list.children].forEach((card) => {
      if (card.hasAttribute('data-q')) {
        const t = card.getAttribute('data-q') || '';
        card.style.display = !q || t.includes(q) ? '' : 'none';
      }
    });
  };

  window.msFilterCaletasList = function msFilterCaletasList() {
    const q = normText(document.getElementById('ms-caletas-q')?.value || '');
    const list = document.getElementById('ms-caletas-list');
    if (!list) return;
    [...list.children].forEach((row) => {
      if (row.hasAttribute('data-q')) {
        const k = row.getAttribute('data-q') || '';
        row.style.display = !q || k.includes(q) ? '' : 'none';
      }
    });
  };

  window.renderMaestrosOrgs = function renderMaestrosOrgs() {
    const menu = document.getElementById('mo-regions');
    const content = document.getElementById('mo-orgs-content');
    if (!menu || !content) return;
    const opa = Array.isArray(window.DB?.opa) ? window.DB.opa : [];
    const regions = (REGIONES_CHILE || []).map((r) => parseInt(r.id)).filter((x) => !isNaN(x));
    const counts = regions.reduce((acc, id) => {
      acc[id] = opa.filter((o) => parseInt(o?.region) === id).length;
      return acc;
    }, {});
    const sel = Number.isFinite(parseInt(window.__MO_REGION__)) ? parseInt(window.__MO_REGION__) : (regions[0] || 14);
    menu.innerHTML = regions.map((id) => {
      const on = id === sel ? ' on' : '';
      const badge = counts[id] ? `<span class="nav-badge">${counts[id]}</span>` : '';
      return `<div class="admin-item${on}" onclick="moSelectRegion(${id})">Región ${esc(regLabel(id))}${badge}</div>`;
    }).join('');
    window.moSelectRegion?.(sel);
  };

  window.moSelectRegion = function moSelectRegion(regionId) {
    const id = parseInt(regionId);
    window.__MO_REGION__ = id;
    document.querySelectorAll('#mo-regions .admin-item').forEach((el) => el.classList.remove('on'));
    const idx = (REGIONES_CHILE || []).findIndex((r) => parseInt(r.id) === id);
    const items = document.querySelectorAll('#mo-regions .admin-item');
    if (items[idx]) items[idx].classList.add('on');
    const content = document.getElementById('mo-orgs-content');
    if (!content) return;
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
        <div style="font-family:var(--ff-d);font-weight:800;color:var(--navy);font-size:15px">Organizaciones (OPA) — ${esc(regLabel(id))}</div>
        <input class="flt" id="mo-opa-q" placeholder="Buscar organización..." oninput="moRenderList()">
      </div>
      <div style="max-height:520px;overflow:auto;border:1px solid var(--border);border-radius:10px">
        <table class="tbl" style="margin:0">
          <thead><tr><th>Comuna</th><th>Organización</th></tr></thead>
          <tbody id="mo-opa-rows"></tbody>
        </table>
      </div>
    `;
    window.moRenderList?.();
  };

  window.moRenderList = function moRenderList() {
    const regionId = parseInt(window.__MO_REGION__);
    const tbody = document.getElementById('mo-opa-rows');
    if (!tbody) return;
    const q = normText(document.getElementById('mo-opa-q')?.value || '');
    const opa = Array.isArray(window.DB?.opa) ? window.DB.opa : [];
    let list = opa.filter((o) => parseInt(o?.region) === regionId);
    if (q) list = list.filter((o) => normText(o?.nombre).includes(q) || normText(o?.comuna).includes(q));
    list.sort((a, b) => {
      const ca = String(a?.comuna || '');
      const cb = String(b?.comuna || '');
      if (ca !== cb) return ca.localeCompare(cb, 'es', { sensitivity: 'base' });
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' });
    });
    tbody.innerHTML = list.map((o) => `
      <tr>
        <td style="white-space:nowrap">${esc(String(o?.comuna || '—'))}</td>
        <td>${esc(String(o?.nombre || '—'))}</td>
      </tr>
    `).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text3);padding:14px">Sin organizaciones</td></tr>`;
  };

  window.renderMaestrosBotes = function renderMaestrosBotes() {
    const menu = document.getElementById('mb-regions');
    const content = document.getElementById('mb-botes-content');
    const global = document.getElementById('mb-botes-global');
    if (!menu || !content || !global) return;
    const botesAll = Array.isArray(window.DB?.botes) ? window.DB.botes : [];
    const regions = (REGIONES_CHILE || []).map((r) => parseInt(r.id)).filter((x) => !isNaN(x));
    const counts = regions.reduce((acc, id) => {
      const rom = REGION_ROM[id];
      acc[id] = botesAll.filter((b) => b?.region === rom).length;
      return acc;
    }, {});
    const sel = Number.isFinite(parseInt(window.__MB_REGION__)) ? parseInt(window.__MB_REGION__) : (regions[0] || 14);
    menu.innerHTML = regions.map((id) => {
      const on = id === sel ? ' on' : '';
      const badge = counts[id] ? `<span class="nav-badge">${counts[id]}</span>` : '';
      return `<div class="admin-item${on}" onclick="mbSelectRegion(${id})">Región ${esc(regLabel(id))}${badge}</div>`;
    }).join('');
    if (global.dataset.inited !== '1') {
      global.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-family:var(--ff-d);font-weight:800;color:var(--navy);font-size:14px">Buscador general</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">Busca en todas las regiones por matrícula, RPA, caleta o nombre de bote. Presiona ENTER para mostrar resultados.</div>
          </div>
          <button class="btn b-out b-sm" onclick="mbGlobalClear()">Limpiar</button>
        </div>
        <input class="flt" id="mb-global-q" placeholder="Ej: 401, 100, CAVANCHA, CHIPANA..." style="width:100%"
          onkeydown="if(event.key==='Enter'){event.preventDefault();mbGlobalSearch();}">
        <div style="margin-top:10px;height:calc(100% - 78px);overflow:auto;border:1px solid var(--border);border-radius:10px">
          <table class="tbl" style="margin:0">
            <thead style="position:sticky;top:0;z-index:1;background:var(--bg)"><tr><th>Región</th><th>RPA</th><th>Matrícula</th><th>Nombre</th><th>Caleta</th></tr></thead>
            <tbody id="mb-global-rows"></tbody>
          </table>
        </div>
      `;
      global.dataset.inited = '1';
      window.mbGlobalClear?.();
    }
    window.mbSelectRegion?.(sel);
    setTimeout(() => window.mbSyncBotesHeight?.(), 0);
  };

  window.mbSelectRegion = function mbSelectRegion(regionId) {
    const id = parseInt(regionId);
    window.__MB_REGION__ = id;
    document.querySelectorAll('#mb-regions .admin-item').forEach((el) => el.classList.remove('on'));
    const idx = (REGIONES_CHILE || []).findIndex((r) => parseInt(r.id) === id);
    const items = document.querySelectorAll('#mb-regions .admin-item');
    if (items[idx]) items[idx].classList.add('on');
    const content = document.getElementById('mb-botes-content');
    if (!content) return;
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;min-height:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
          <div style="font-family:var(--ff-d);font-weight:800;color:var(--navy);font-size:15px">Botes — ${esc(regLabel(id))}</div>
          <input class="flt" id="mb-bote-q" placeholder="Buscar bote, RPA o caleta..." oninput="mbRenderList()" style="width:250px">
        </div>
        <div style="flex:1;min-height:0;overflow:auto;border:1px solid var(--border);border-radius:10px">
          <table class="tbl" style="margin:0">
            <thead style="position:sticky;top:0;z-index:1;background:var(--bg)"><tr><th>RPA</th><th>Matrícula</th><th>Nombre</th><th>Caleta</th></tr></thead>
            <tbody id="mb-botes-rows"></tbody>
          </table>
        </div>
      </div>
    `;
    window.mbRenderList?.();
    window.mbSyncBotesHeight?.();
  };

  window.mbSyncBotesHeight = function mbSyncBotesHeight() {
    const menu = document.getElementById('mb-regions');
    const right = document.getElementById('mb-right');
    const menuCard = menu?.closest?.('.card');
    if (!menuCard || !right) return;
    const h = menuCard.offsetHeight;
    if (!h) return;
    right.style.height = h + 'px';
    right.style.maxHeight = h + 'px';
  };

  window.mbGlobalClear = function mbGlobalClear() {
    const q = document.getElementById('mb-global-q');
    const rows = document.getElementById('mb-global-rows');
    if (q) q.value = '';
    if (rows) rows.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">Ingresa un término y presiona ENTER</td></tr>`;
  };

  window.mbGlobalSearch = function mbGlobalSearch() {
    const qRaw = document.getElementById('mb-global-q')?.value || '';
    const q = normText(qRaw);
    const tbody = document.getElementById('mb-global-rows');
    if (!tbody) return;
    if (!q) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">Ingresa un término y presiona ENTER</td></tr>`;
      return;
    }
    const botesAll = Array.isArray(window.DB?.botes) ? window.DB.botes : [];
    const results = botesAll.filter((b) => {
      return normText(b?.nombre).includes(q) || normText(b?.nrpa).includes(q) || normText(b?.nmatricula).includes(q) || normText(b?.caleta).includes(q);
    }).slice(0, 150);
    results.sort((a, b) => {
      const ra = String(a?.region || '');
      const rb = String(b?.region || '');
      if (ra !== rb) return ra.localeCompare(rb, 'es', { sensitivity: 'base' });
      const ca = String(a?.caleta || '');
      const cb = String(b?.caleta || '');
      if (ca !== cb) return ca.localeCompare(cb, 'es', { sensitivity: 'base' });
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' });
    });
    const regByRom = (rom) => (REGIONES_CHILE || []).find((r) => String(r?.rom) === String(rom));
    tbody.innerHTML = results.map((b) => {
      const r = regByRom(b?.region);
      const rLbl = r ? `${r.rom} — ${r.nom}` : (b?.region ? `Región ${String(b.region)}` : '—');
      return `<tr>
        <td style="white-space:nowrap">${esc(rLbl)}</td>
        <td style="white-space:nowrap;font-family:var(--ff-m);color:var(--teal);font-weight:600">${esc(String(b?.nrpa || '—'))}</td>
        <td style="white-space:nowrap;font-family:var(--ff-m);color:var(--text3)">${esc(String(b?.nmatricula || '—'))}</td>
        <td style="font-weight:700">${esc(String(b?.nombre || '—'))}</td>
        <td>${esc(String(b?.caleta || '—'))}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">Sin resultados</td></tr>`;
  };

  window.mbRenderList = function mbRenderList() {
    const regionId = parseInt(window.__MB_REGION__);
    const tbody = document.getElementById('mb-botes-rows');
    if (!tbody) return;
    const q = normText(document.getElementById('mb-bote-q')?.value || '');
    const botesAll = Array.isArray(window.DB?.botes) ? window.DB.botes : [];
    const rom = REGION_ROM[regionId];
    let list = botesAll.filter((b) => b?.region === rom);
    if (q) {
      list = list.filter((b) => 
        normText(b?.nombre).includes(q) || 
        normText(b?.nrpa).includes(q) || 
        normText(b?.nmatricula).includes(q) || 
        normText(b?.caleta).includes(q)
      );
    }
    // Limitamos a 100 resultados
    const limit = 100;
    const displayList = list.slice(0, limit);
    
    tbody.innerHTML = displayList.map((b) => `
      <tr>
        <td style="white-space:nowrap;font-family:var(--ff-m);color:var(--teal);font-weight:600">${esc(String(b?.nrpa || '—'))}</td>
        <td style="white-space:nowrap;font-family:var(--ff-m);color:var(--text3)">${esc(String(b?.nmatricula || '—'))}</td>
        <td style="font-weight:700">${esc(String(b?.nombre || '—'))}</td>
        <td>${esc(String(b?.caleta || '—'))}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:14px">Sin botes</td></tr>`;
    
    if (list.length > limit) {
      tbody.innerHTML += `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:14px;font-size:11px;font-style:italic">Mostrando ${limit} de ${list.length} resultados. Usa el buscador.</td></tr>`;
    }
  };

  /**
   * Renderiza la tabla de EVADIR (resumen por operación) en la página EVADIR.
   * Calcula totales (botes/tx/cuadrantes) y densidades por especie a partir de la BD en memoria.
   */
  function renderEvadirList() {
    const tbody = document.getElementById('evadir-rows');
    if (!tbody) return;
    const rows = DB.operaciones.map((op) => {
      const totalBotes = op.botes.length;
      const totalTx = op.botes.reduce((s, b) => s + (b.transectos || []).filter((t) => t.tipo !== 'cuadrante').length, 0);
      const totalCq = op.botes.reduce((s, b) => s + (b.transectos || []).filter((t) => t.tipo === 'cuadrante').length, 0);
      let sumAreaLoco = 0, sumNLoco = 0;
      let sumAreaErizo = 0, sumNErizo = 0;
      op.botes.forEach((b) => {
        (b.transectos || []).forEach((t) => {
          if (t?.counts?.[1] != null) { sumAreaLoco += t.area || 0; sumNLoco += t.counts[1] || 0; }
          if (t?.counts?.[5] != null) { sumAreaErizo += t.area || 0; sumNErizo += t.counts[5] || 0; }
        });
      });
      const denLoco = sumAreaLoco > 0 ? (sumNLoco / sumAreaLoco).toFixed(3) : '0.000';
      const denErizo = sumAreaErizo > 0 ? (sumNErizo / sumAreaErizo).toFixed(3) : '0.000';
      const txCqUI = totalTx > 0 || totalCq > 0
        ? `${totalTx ? `<span class="pill p-blu" style="font-size:10px">T ${totalTx}</span>` : ''} ${totalCq ? `<span class="pill p-pur" style="font-size:10px">C ${totalCq}</span>` : ''}`.trim()
        : '—';
      return `<tr>
        <td>${op.sector}</td>
        <td>SEG-${op.numSeg}</td>
        <td>${op.id}</td>
        <td>${fmtDMY(op.fechaInicio)}</td>
        <td>${txCqUI}</td>
        <td>${totalBotes}</td>
        <td>${denLoco}</td>
        <td>${denErizo}</td>
        <td><span class="pill p-amb">Borrador</span></td>
        <td>
          <button class="btn b-out b-xs" onclick="openEvadirViewer('${op.id}')">Ver</button>
          <button class="btn b-teal b-xs" onclick="exportEvadirXlsx('${op.id}')">CSV</button>
        </td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || `<tr><td colspan="10" style="text-align:center;color:var(--text3);padding:14px">Sin EVADIR registrados</td></tr>`;
  }

 

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
    const regRom = REGION_ROM[op.region] || String(op.region || '');
    const orgFull = String(op.org || '').trim();
    const orgName = cleanOrgName(orgFull) || orgFull;
    const year = (/^\d{4}-\d{2}-\d{2}$/.test(String(op.fechaInicio || '')) ? String(op.fechaInicio).slice(0, 4) : (String(op.id || '').match(/\b(19|20)\d{2}\b/)?.[0] || ''));
    const seg = `SEG${String(parseInt(op.numSeg) || 0).padStart(2, '0')}`;
    const amerb = String(op.sectorAmerb || '').trim();
    const titulo = [year, seg, amerb || op.id].filter(Boolean).join(', ');
    const f1 = fmtDMY(op.fechaInicio);
    const f2 = fmtDMY(op.fechaFin);
    const fecha = f1 && f2 && op.fechaFin !== op.fechaInicio ? `${f1} → ${f2}` : (f1 || '');
    const botesOrdenados = [...(op.botes || [])].sort((a, b) => {
      const za = parseInt(a?.zona) || 0;
      const zb = parseInt(b?.zona) || 0;
      if (za !== zb) return za - zb;
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' });
    });
    return `<div class="card mb">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">
      <div>
        <div class="op-title">${titulo}</div>
        <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap">
          <span class="pill p-teal">Región ${regRom}</span>
          ${orgName ? `<span class="pill p-blu" title="${esc(orgFull || orgName)}" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(orgName)}</span>` : ''}
          ${fecha ? `<span class="pill p-grn">${fecha}</span>` : ''}
          <span class="pill p-pur">${op.botes.length} botes · ${totalTx} unidades densidad</span>
          <span class="pill p-amb">${totalLPMuestras} muestras L-P</span>
        </div>
      </div>
      <div style="display:flex;gap:7px;flex-shrink:0">
        <button class="btn b-out b-sm" onclick="openEditOp('${op.id}')" title="Editar operación">✎</button>
        <button class="btn b-out b-sm" onclick="openInitBotes('${op.id}')">Agregar botes</button>
        <button class="btn b-teal b-sm" onclick="openEvadirPreview('${op.id}')">Previsualizar EVADIR</button>
      </div>
    </div>
    <div id="botes-${op.id}">${botesOrdenados.map((b) => buildBoteCard(op.id, b)).join('')}</div>
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
        <div class="bote-icon ${b._open ? 'open-ic' : ''}"></div>
        <div>
          <div class="bote-name">${b.nombre} <span style="font-weight:400;font-size:12px;opacity:.7">· ${b.buzo} · Zona ${b.zona}</span></div>
          <div class="bote-meta">${totalTx} unidades densidad (${b.transectos.filter((t) => t.tipo !== 'cuadrante').length} transecto(s) · ${b.transectos.filter((t) => t.tipo === 'cuadrante').length} cuadrante(s)) · ${totalM} muestras L-P${espLP ? ' · ' + espLP : ''}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="pill p-teal">Zona ${b.zona}</span>
        ${b.densTipo ? `<span class="pill ${b.densTipo==='cuadrante'?'p-pur':'p-blu'}">${b.densTipo==='cuadrante'?'Cuadrantes':'Transectos'}</span>` : ''}
        <button class="btn b-out b-xs" onclick="event.stopPropagation();openEditBote('${opId}','${b.id}')">✎</button>
        <span style="font-size:16px;opacity:.5;transition:transform .2s" id="barr_${opId}_${b.id}">${b._open ? '▴' : '▾'}</span>
      </div>
    </div>
    <div class="bote-body ${b._open ? 'open' : ''}" id="bbody_${opId}_${b.id}">
      <div class="btabs">
        <div class="btab ${b._activeTab === 'dens' ? 'on' : ''}" onclick="switchBoteTab('${opId}','${b.id}','dens')">Densidad <span style="background:rgba(255,255,255,.3);border-radius:10px;padding:1px 6px;font-size:10px">${totalTx}</span></div>
        <div class="btab ${b._activeTab !== 'dens' ? 'on' : ''}" onclick="switchBoteTab('${opId}','${b.id}','lp')">Peso-Longitud <span style="background:rgba(255,255,255,.3);border-radius:10px;padding:1px 6px;font-size:10px">${totalM}</span></div>
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
      const esAlga = isAlgaId(eid);
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
          <thead><tr>${esAlga ? '<th>#</th><th>Diám. disco (cm)</th><th></th>' : '<th>#</th><th>Long. (mm)</th><th>Peso (g)</th><th></th>'}</tr></thead>
          <tbody>${muestras.slice(0, 5).map((m, i) => `<tr>
            <td style="color:var(--text3)">${i + 1}</td>
            ${esAlga ? `<td>${(m.d ?? m.l) ?? '—'} cm</td>` : `<td>${m.l} mm</td><td>${m.p ?? '—'} g</td>`}
            <td style="white-space:nowrap">
              <button class="btn b-out b-xs" onclick="openEditLP('${opId}','${b.id}',${eid},${i},0)">✎</button>
              <button class="btn b-out b-xs" onclick="borrarLP('${opId}','${b.id}',${eid},${i});aplicarFiltros()">Eliminar</button>
            </td>
          </tr>`).join('')}
          ${muestras.length > 5 ? `<tr><td colspan="${esAlga ? 3 : 4}" style="text-align:center;color:var(--text3);font-size:11px;padding:7px">... y ${muestras.length - 5} más · <button class="btn b-out b-xs" onclick="openIngresarMuestras('${opId}','${b.id}',${eid})">Ver</button></td></tr>` : ''}
          ${muestras.length === 0 ? `<tr><td colspan="${esAlga ? 3 : 4}" style="text-align:center;color:var(--text3);padding:14px;font-size:12px">Sin muestras · <button class="btn b-teal b-xs" onclick="openIngresarMuestras('${opId}','${b.id}',${eid})">Ingresar</button></td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>`;
    }).join('');
    return `<div>
    ${espCards}
    <button class="btn b-out b-sm" onclick="openSelEspeciesLP('${opId}','${b.id}')">Agregar especie</button>
  </div>`;
  }

  /** Construye el HTML del tab Densidad (por bote) listando unidades (transectos/cuadrantes) y acciones de agregar. */
  function buildDensTab(opId, b) {
    const tipCuad = b.densTipo === 'cuadrante'
      ? `<div class="info-box purple" style="margin-bottom:13px"><span>i:</span><div>Presiona ENTER para desplazarte entre cuadrantes.</div></div>`
      : '';
    const txCards = b.transectos.filter((t) => !b.densTipo || t.tipo === b.densTipo).map((t) => buildTxCard(opId, b.id, t)).join('');
    return `<div>
    ${tipCuad}
    ${txCards}
    <div style="display:flex;gap:8px;margin-top:6px">
      ${(!b.densTipo || b.densTipo==='transecto') ? `<button class="btn b-out b-sm" onclick="openNuevoTransecto('${opId}','${b.id}','transecto')">Agregar transecto</button>` : ''}
      ${(b.densTipo==='cuadrante') ? `<button class="btn b-out b-sm" style="border-color:var(--purple);color:var(--purple)" onclick="openNuevoTransecto('${opId}','${b.id}','cuadrante')">Agregar cuadrante</button>` : ''}
    </div>
  </div>`;
  }

  /** Construye el HTML de una unidad de densidad (transecto/cuadrante), incluyendo edición de conteos y cubierta. */
  function buildTxCard(opId, boteId, t) {
    const esCuad = t.tipo === 'cuadrante';
    const tipoColor = esCuad ? 'p-pur' : 'p-blu';
    const numLabel = esCuad ? `C${t.num}` : `T${t.num}`;
    const areaTxt = `${t.area} m²`;
    const cuadSpId = esCuad ? (t.especieId ?? (Object.keys(t.counts || {})[0] ? parseInt(Object.keys(t.counts)[0]) : null)) : null;
    if (esCuad && t?.counts && Object.keys(t.counts).length > 1) {
      const keepId = cuadSpId ? parseInt(cuadSpId) : parseInt(Object.keys(t.counts)[0]);
      t.especieId = keepId;
      t.counts = { [keepId]: t.counts?.[keepId] ?? 0 };
    }
    const espKeys = Object.keys(t.counts).map(Number).filter((id) => t.counts[id] > 0);
    const espKeysUI = esCuad ? (cuadSpId ? [parseInt(cuadSpId)] : []) : espKeys;
    const spIdsUI = esCuad ? espKeysUI : Object.keys(t.counts);
    const spRows = spIdsUI.map((id) => {
      const sp = ESPECIES.find((e) => e.id == id);
      const n = t.counts[id] ?? 0;
      const dens = (n / t.area).toFixed(4);
      return `<div class="sp-row">
      <div class="sp-row-name"><div>${sp?.com || '?'}</div><div class="sp-row-sci">${sp?.sci || ''}</div></div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" class="sp-count-inp" id="sp_inp_${opId}_${boteId}_${t.num}_${id}" value="${n > 0 ? n : ''}" min="0" style="width:70px;padding:4px 7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-family:var(--ff-m);text-align:center;font-weight:700;background:var(--bg);color:var(--text);outline:none"
            oninput="updateCount('${opId}','${boteId}',${t.num},${id},this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();updateCount('${opId}','${boteId}',${t.num},${id},this.value);focusNextSpCountInput('${opId}','${boteId}',${t.num},${id});}"
            onfocus="this.style.borderColor='var(--teal)'" onblur="this.style.borderColor='var(--border)'">
          <span style="font-size:11px;color:var(--text3)">ind.</span>
        </div>
      </div>
      <div style="text-align:right">
        <div id="den_${opId}_${boteId}_${t.num}_${id}" style="font-family:var(--ff-m);font-size:11px;color:var(--teal);font-weight:700">${dens}</div>
        <div style="font-size:9px;color:var(--text3)">ind/m²</div>
      </div>
      ${esCuad ? '' : `<button class="btn b-out b-xs" onclick="removeSpFromTx('${opId}','${boteId}',${t.num},${id})">Quitar</button>`}
    </div>`;
    }).join('');
    const spActionLabel = esCuad ? 'Cambiar especie' : 'Agregar especie';
    if (esCuad) {
      const sp = cuadSpId ? ESPECIES.find((e) => e.id == cuadSpId) : null;
      const n = cuadSpId ? (t.counts[cuadSpId] ?? 0) : 0;
      const isLuga = !!cuadSpId && isLugaId(cuadSpId);
      return `<div class="tx-card" style="border-color:var(--purple)">
        <div class="tx-hd" style="background:var(--purple-lt)">
          <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:space-between;width:100%">
            <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
              <span class="pill p-pur" style="font-size:11px;font-weight:700">${numLabel}</span>
              <span class="pill p-pur" style="font-size:10px">Cuadrante</span>
              <span style="font-size:12px;color:var(--text2)">${sp?.com || 'Especie'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;color:var(--text3)">${isLuga ? 'Biomasa:' : 'Cantidad:'}</span>
                <input type="number" class="cq-count-inp" id="cq_inp_${opId}_${boteId}_${t.num}" value="${n > 0 ? n : ''}" min="0" ${isLuga ? 'step="0.01"' : ''} ${cuadSpId ? '' : 'disabled'} style="width:80px;padding:4px 7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-family:var(--ff-m);text-align:center;font-weight:700;background:var(--bg);color:var(--text);outline:none"
                  ${cuadSpId ? `oninput="updateCount('${opId}','${boteId}',${t.num},${cuadSpId},this.value)"` : ''}
                  ${cuadSpId ? `onkeydown="if(event.key==='Enter'){updateCount('${opId}','${boteId}',${t.num},${cuadSpId},this.value);focusNextCuadranteInput('${opId}','${boteId}',${t.num});}"` : ''}>
                <div style="text-align:right">
                  <div id="den_${opId}_${boteId}_${t.num}_${cuadSpId || 'none'}" style="font-family:var(--ff-m);font-size:11px;color:var(--teal);font-weight:700">${cuadSpId ? (isLuga ? (Number(n || 0)).toFixed(4) : ((n || 0) / t.area).toFixed(4)) : '—'}</div>
                  <div style="font-size:9px;color:var(--text3)">${isLuga ? 'kg/m²' : 'ind/m²'}</div>
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <span style="font-size:11px;color:var(--text3)">Área</span>
                <select class="is" id="cq_area_${opId}_${boteId}_${t.num}" style="width:120px" onchange="onCuadAreaChange('${opId}','${boteId}',${t.num},this.value)">
                  <option value="0.25" ${t.area==0.25?'selected':''}>0.25 m²</option>
                  <option value="0.0625" ${t.area==0.0625?'selected':''}>0.0625 m²</option>
                  <option value="0.01" ${t.area==0.01?'selected':''}>0.01 m²</option>
                  <option value="custom">Otro...</option>
                </select>
                <input class="ii" id="cq_area_manual_${opId}_${boteId}_${t.num}" type="number" step="0.0001" min="0.0001" placeholder="m²" style="display:none;width:110px"
                  oninput="updateCuadArea('${opId}','${boteId}',${t.num},this.value)">
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <span style="font-size:11px;color:var(--text3)">Sustrato</span>
                <select class="is" style="width:160px" onchange="updateSustrato('${opId}','${boteId}',${t.num},this.value)">
                  ${['', 'ROCA', 'ROCA/ARENA', 'BOLÓN', 'ARENA', 'MIXTO', 'TERTEL'].map((c) => `<option value="${c}" ${c === (t.sustrato || '') ? 'selected' : ''}>${c || '(sin valor)'}</option>`).join('')}
                </select>
              </div>
              <button class="btn b-out b-xs" onclick="openDeleteUnidad('${opId}','${boteId}',${t.num})" style="border-color:var(--red);color:var(--red)">Eliminar</button>
            </div>
          </div>
        </div>
      </div>`;
    }
    return `<div class="tx-card">
    <div class="tx-hd" onclick="toggleTx('${opId}','${boteId}',${t.num})">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;width:100%">
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
          <span class="pill ${tipoColor}" style="font-size:11px;font-weight:700">${numLabel}</span>
          <span class="pill p-slt" style="font-size:10px">Transecto</span>
          <span style="font-size:12px;color:var(--text2)">${t.fecha}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:11px;color:var(--text3)">Área transecto (m²)</span>
            <select class="is" id="tx_area_${opId}_${boteId}_${t.num}" style="width:140px" onclick="event.stopPropagation()" onchange="onTxAreaChange('${opId}','${boteId}',${t.num},this.value)">
              <option value="120" ${t.area==120?'selected':''}>120</option>
              <option value="60" ${t.area==60?'selected':''}>60</option>
              <option value="50" ${t.area==50?'selected':''}>50</option>
              <option value="30" ${t.area==30?'selected':''}>30</option>
              <option value="20" ${t.area==20?'selected':''}>20</option>
              <option value="custom" ${[120,60,50,30,20].includes(Number(t.area))?'':'selected'}>Otro...</option>
            </select>
            <input class="ii" id="tx_area_manual_${opId}_${boteId}_${t.num}" type="number" step="0.0001" min="0.0001" placeholder="m²" value="${[120,60,50,30,20].includes(Number(t.area)) ? '' : t.area}" style="width:110px;${[120,60,50,30,20].includes(Number(t.area)) ? 'display:none' : ''}" onclick="event.stopPropagation()" oninput="updateTxArea('${opId}','${boteId}',${t.num},this.value)">
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:11px;color:var(--text3)">Sustrato</span>
            <select class="is" style="width:160px" onclick="event.stopPropagation()" onchange="updateSustrato('${opId}','${boteId}',${t.num},this.value)">
              ${['', 'ROCA', 'ROCA/ARENA', 'BOLÓN', 'ARENA', 'MIXTO', 'TERTEL'].map((c) => `<option value="${c}" ${c === (t.sustrato || '') ? 'selected' : ''}>${c || '(sin valor)'}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:11px;color:var(--text3)">Cubierta biológica</span>
            <select class="is" style="width:180px" onclick="event.stopPropagation()" onchange="updateCubierta('${opId}','${boteId}',${t.num},this.value)">
              ${['', 'ALGAS PARDAS', 'ALGAS ROJAS', 'ALGAS', 'PIURE', 'SIN COBERTURA', 'MIXTA'].map((c) => `<option value="${c}" ${c === (t.cubierta || '') ? 'selected' : ''}>${c || '(sin valor)'}</option>`).join('')}
            </select>
          </div>
          <button class="btn b-out b-xs" onclick="event.stopPropagation();openDeleteUnidad('${opId}','${boteId}',${t.num})" style="border-color:var(--red);color:var(--red)">Eliminar</button>
          <span style="color:var(--text3);font-size:14px">▾</span>
        </div>
      </div>
    </div>
    <div class="tx-body" id="tx_${opId}_${boteId}_${t.num}">
      <div style="margin-bottom:10px;padding:9px;border:1px solid var(--border);border-radius:10px;background:var(--bg2)">
        <div style="font-family:var(--ff-m);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Coordenadas del transecto</div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:8px">
          <input class="ii" type="number" step="any" inputmode="decimal" placeholder="X" value="${esc(String(t.coordX ?? ''))}" oninput="updateTxCoord('${opId}','${boteId}',${t.num},'coordX',this.value)">
          <input class="ii" type="number" step="any" inputmode="decimal" placeholder="Y" value="${esc(String(t.coordY ?? ''))}" oninput="updateTxCoord('${opId}','${boteId}',${t.num},'coordY',this.value)">
          <input class="ii" type="number" step="any" inputmode="decimal" placeholder="LONG" value="${esc(String(t.coordLong ?? ''))}" oninput="updateTxCoord('${opId}','${boteId}',${t.num},'coordLong',this.value)">
          <input class="ii" type="number" step="any" inputmode="decimal" placeholder="LAT" value="${esc(String(t.coordLat ?? ''))}" oninput="updateTxCoord('${opId}','${boteId}',${t.num},'coordLat',this.value)">
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
    if (!b._activeTab) b._activeTab = 'dens';
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
    if (!t) return;
    if (t.tipo === 'cuadrante') {
      if (t.especieId == null) {
        t.especieId = spId;
        t.counts = { [spId]: 0 };
      }
      if (parseInt(t.especieId) !== parseInt(spId)) return;
      const raw = String(val ?? '').replace(',', '.');
      const v = isLugaId(spId) ? parseFloat(raw) : parseInt(raw);
      t.counts[spId] = Number.isFinite(v) ? v : 0;
      const el = document.getElementById(`den_${opId}_${boteId}_${txNum}_${spId}`);
      if (el) el.textContent = (isLugaId(spId) ? (t.counts[spId] || 0) : ((t.counts[spId] || 0) / t.area)).toFixed(4);
      return;
    }
    t.counts[spId] = parseInt(val) || 0;
    const el = document.getElementById(`den_${opId}_${boteId}_${txNum}_${spId}`);
    if (el) el.textContent = (t.counts[spId] / t.area).toFixed(4);
  };

  /** Actualiza la cubierta biológica de una unidad de densidad. */
  window.updateCubierta = function updateCubierta(opId, boteId, txNum, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) t.cubierta = val;
    toast(`Cubierta actualizada: ${val}`, 'green');
  };
  /**
   * Actualiza el sustrato de una unidad (transecto/cuadrante) y notifica al usuario.
   */
  window.updateSustrato = function updateSustrato(opId, boteId, txNum, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t) t.sustrato = val;
    toast(`Sustrato actualizado: ${val || '(sin valor)'}`, 'green');
  };

  /**
   * Handler del combo de área en cuadrantes: muestra input manual si se elige "Otro...",
   * o aplica el valor seleccionado si es un tamaño predefinido.
   */
  window.onCuadAreaChange = function onCuadAreaChange(opId, boteId, txNum, val) {
    const manual = document.getElementById(`cq_area_manual_${opId}_${boteId}_${txNum}`);
    if (!manual) return;
    if (val === 'custom') {
      manual.style.display = '';
      manual.focus();
    } else {
      manual.style.display = 'none';
      manual.value = '';
      updateCuadArea(opId, boteId, txNum, val);
    }
  };
  /**
   * Actualiza el área del cuadrante y recalcula densidad visible (n/área) cuando aplica.
   */
  window.updateCuadArea = function updateCuadArea(opId, boteId, txNum, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    const area = parseFloat(val);
    if (!t || isNaN(area) || area <= 0) { toast('Área inválida', 'red'); return; }
    t.area = area;
    const spId = t.tipo === 'cuadrante' ? (t.especieId ?? (Object.keys(t.counts || {})[0] ? parseInt(Object.keys(t.counts)[0]) : null)) : null;
    if (spId) {
      const densElId = `den_${opId}_${boteId}_${txNum}_${spId}`;
      const densEl = document.getElementById(densElId);
      const n = t.counts[spId] ?? 0;
      if (densEl) densEl.textContent = (isLugaId(spId) ? (Number(n || 0)) : (Number(n || 0) / area)).toFixed(4);
    }
    toast('Área actualizada', 'green');
  };
  /**
   * Handler del combo de área en transectos: muestra input manual si se elige "Otro...",
   * o aplica el valor seleccionado si es un tamaño predefinido.
   */
  window.onTxAreaChange = function onTxAreaChange(opId, boteId, txNum, val) {
    const manual = document.getElementById(`tx_area_manual_${opId}_${boteId}_${txNum}`);
    if (!manual) return;
    if (val === 'custom') {
      manual.style.display = '';
      manual.focus();
    } else {
      manual.style.display = 'none';
      manual.value = '';
      updateTxArea(opId, boteId, txNum, val);
    }
  };
  /**
   * Actualiza el área del transecto y recalcula densidades visibles de todas sus especies.
   */
  window.updateTxArea = function updateTxArea(opId, boteId, txNum, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    const area = parseFloat(val);
    if (!t || isNaN(area) || area <= 0) { toast('Área inválida', 'red'); return; }
    t.area = area;
    Object.keys(t.counts || {}).forEach((k) => {
      const spId = parseInt(k);
      const el = document.getElementById(`den_${opId}_${boteId}_${txNum}_${spId}`);
      if (el) el.textContent = ((t.counts?.[spId] ?? 0) / area).toFixed(4);
    });
    toast('Área actualizada', 'green');
  };

  /** Actualiza coordenadas libres (X, Y, LONG, LAT) de un transecto. */
  window.updateTxCoord = function updateTxCoord(opId, boteId, txNum, key, val) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((x) => x.id === boteId);
    const t = b?.transectos.find((x) => x.num === txNum);
    if (!t) return;
    const allowed = ['coordX', 'coordY', 'coordLong', 'coordLat'];
    if (!allowed.includes(key)) return;
    const raw = String(val ?? '').trim().replace(',', '.');
    if (raw === '') {
      t[key] = null;
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    t[key] = num;
  };
  /**
   * En ingreso rápido de cuadrantes: mueve el foco al siguiente cuadrante (según orden numérico).
   * Se usa en el evento ENTER del input de “Cantidad”.
   */
  window.focusNextCuadranteInput = function focusNextCuadranteInput(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    const list = (b.transectos || []).filter((t) => t.tipo === 'cuadrante').map((t) => t.num).sort((a, z) => a - z);
    const idx = list.indexOf(txNum);
    const nextNum = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;
    if (nextNum == null) return;
    const inp = document.getElementById(`cq_inp_${opId}_${boteId}_${nextNum}`);
    if (inp) inp.focus();
  };

  window.focusNextSpCountInput = function focusNextSpCountInput(opId, boteId, txNum, spId) {
    const host = document.getElementById(`tx_${opId}_${boteId}_${txNum}`);
    if (!host) return;
    const list = [...host.querySelectorAll('input.sp-count-inp')];
    const curId = `sp_inp_${opId}_${boteId}_${txNum}_${spId}`;
    const idx = list.findIndex((el) => el.id === curId);
    const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;
    if (next) next.focus();
  };

  /** Abre modal para crear una operación (cabecera: región/sector/org/seg/fechas). */
  window.openNuevaOp = function openNuevaOp() {
    const regOpts = REGIONES_CHILE.map((r) => `<option value="${r.id}">${r.rom} — ${r.nom}</option>`).join('');
    openMo('Nueva operación', `
    <div class="i2">
      <div class="ig"><label class="il">Región</label>
        <select class="is" id="op-reg" onchange="onOpRegionChange()">${regOpts}</select>
      </div>
      <div class="ig"><label class="il">N° Seguimiento / ESBA</label><input class="ii" id="op-seg"></div>
    </div>
    <div class="ig"><label class="il">Sector AMERB</label>
      <input class="ii" id="op-amerb-q" placeholder="Buscar sector AMERB..." oninput="renderOpAmerb()">
      <select class="is" id="op-amerb" onchange="onOpAmerbChange()"><option>Cargando sectores AMERB...</option></select>
    </div>
    <div class="ig" id="op-add-amerb-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar sector AMERB</label>
      <input class="ii" id="op-amerb-new" placeholder="Ej: Sector ...">
    </div>
    <div class="ig"><label class="il">Sector / Caleta</label>
      <input class="ii" id="op-sec-q" placeholder="Buscar caleta..." oninput="renderOpCaletas()">
      <select class="is" id="op-sec" onchange="onOpSectorChange()"><option>Cargando caletas...</option></select>
    </div>
    <div class="ig" id="op-add-sec-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar caleta</label>
      <input class="ii" id="op-caleta-new" placeholder="Ej: Caleta ...">
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Tipo organización</label>
        <select class="is" id="op-tipo" onchange="onOpTipoOrgChange()"><option>STI</option><option>AINDG</option><option>SCOOP</option><option>ASOC</option><option value="OTRA">Otra</option></select>
      </div>
      <div class="ig"><label class="il">Organización (OPA)</label>
        <input class="ii" id="op-opa-q" placeholder="Buscar organización..." oninput="renderOpOpa()">
        <select class="is" id="op-opa" onchange="onOpOpaChange()"><option>Cargando organizaciones...</option></select>
      </div>
    </div>
    <div class="ig" id="op-add-opa-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar organización</label>
      <input class="ii" id="op-opa-new" placeholder="Nombre organización">
    </div>
    <div class="ig" id="op-tipo-otra-wrap" style="display:none">
      <label class="il">Tipo organización (personalizado)</label>
      <input class="ii" id="op-tipo-otra" placeholder="Ej: Cooperativa ...">
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Fecha inicio</label><input class="ii" id="op-fi" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="ig"><label class="il">Fecha fin</label><input class="ii" id="op-ff" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="crearOp()">Crear operación</button>
    </div>
  `, 'slim lock');
    const reg = document.getElementById('op-reg');
    if (reg) reg.value = '14';
    window.renderOpCaletas?.();
    window.renderOpOpa?.();
    window.renderOpAmerb?.();
    window.onOpTipoOrgChange?.();
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
    const regId = parseInt(document.getElementById('op-reg')?.value) || 14;
    const amerbEl = document.getElementById('op-amerb');
    const amerbAddInp = document.getElementById('op-amerb-new');
    let sectorAmerb = '';
    let sectorAmerbId = String(amerbEl?.value || '');
    if (!sectorAmerbId) { toast('Selecciona un sector AMERB', 'red'); return; }
    if (sectorAmerbId === ADD_AMERB_VALUE) {
      const name = String(amerbAddInp?.value || '').trim();
      if (!name) { toast('Ingresa un sector AMERB para continuar', 'red'); return; }
      addCustomListItem(AMERB_CUSTOM_KEY, regId, name);
      sectorAmerb = name;
      sectorAmerbId = `custom:${name}`;
    } else if (/^custom:/i.test(sectorAmerbId)) {
      sectorAmerb = sectorAmerbId.slice(7);
    } else {
      const base = Array.isArray(window.DB?.sectores_amerb) ? window.DB.sectores_amerb : [];
      const found = base.find((x) => String(x?.id) === String(sectorAmerbId));
      sectorAmerb = String(found?.nombreamerb || '').trim();
      if (!sectorAmerb) { toast('Sector AMERB inválido', 'red'); return; }
    }
    const secEl = document.getElementById('op-sec');
    const addInp = document.getElementById('op-caleta-new');
    let sector = secEl?.value;
    if (!sector) { toast('Selecciona un sector', 'red'); return; }
    if (sector === ADD_SECTOR_VALUE) {
      const name = String(addInp?.value || '').trim();
      if (!name) { toast('Ingresa un sector para continuar', 'red'); return; }
      addCustomCaleta(regId, name);
      sector = name;
    }
    let tipoOrg = document.getElementById('op-tipo')?.value;
    if (tipoOrg === 'OTRA') {
      const custom = String(document.getElementById('op-tipo-otra')?.value || '').trim();
      if (!custom) { toast('Ingresa un tipo de organización', 'red'); return; }
      tipoOrg = custom;
    }
    const opaEl = document.getElementById('op-opa');
    const opaAddInp = document.getElementById('op-opa-new');
    let org = '';
    let opaId = String(opaEl?.value || '');
    if (!opaId) { toast('Selecciona una organización', 'red'); return; }
    if (opaId === ADD_OPA_VALUE) {
      const name = String(opaAddInp?.value || '').trim();
      if (!name) { toast('Ingresa una organización para continuar', 'red'); return; }
      addCustomListItem(OPA_CUSTOM_KEY, regId, name);
      org = name;
      opaId = `custom:${name}`;
    } else if (/^custom:/i.test(opaId)) {
      org = opaId.slice(7);
    } else {
      const base = Array.isArray(window.DB?.opa) ? window.DB.opa : [];
      const found = base.find((x) => String(x?.id) === String(opaId));
      org = String(found?.nombre || '').trim();
      if (!org) { toast('Organización inválida', 'red'); return; }
    }
    const segRaw = String(document.getElementById('op-seg')?.value || '').trim();
    let segNum = null;
    if (segRaw !== '') {
      const parsed = parseInt(segRaw);
      if (!Number.isFinite(parsed)) { toast('Ingresa un N° de seguimiento válido', 'red'); return; }
      segNum = parsed;
    }
    DB.operaciones.unshift({
      id, region: regId,
      sectorAmerb,
      sectorAmerbId,
      sector,
      tipoOrg,
      org,
      opaId,
      numSeg: segNum,
      fechaInicio: document.getElementById('op-fi')?.value,
      fechaFin: document.getElementById('op-ff')?.value,
      botes: []
    });
    closeMo();
    toast(`Operación ${id} creada. Agrega botes.`, 'green');
    initFiltros();
    aplicarFiltros();
    setTimeout(() => openInitBotes(id), 150);
  };

  /**
   * Abre el modal “Crear botes” para una operación.
   * Permite ingresar múltiples botes en tabla (zona, nombre, buzo y tipo densidad).
   */
  window.openInitBotes = function openInitBotes(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    const row = (zona) => `<tr class="ib-row">
      <td style="color:var(--text3);font-family:var(--ff-m);font-size:10px">—</td>
      <td><input class="ii ib-zona" type="number" min="1" max="10" value="${zona}" style="width:70px"></td>
      <td><input class="ii ib-nom" placeholder="Nombre bote" style="width:140px" readonly onclick="openBotePicker('${opId}', this)"></td>
      <td><input class="ii ib-buzo" placeholder="Nombre buzo" style="width:180px"></td>
      <td>
        <select class="is ib-dens" style="width:140px">
          <option value="transecto" selected>Transecto</option>
          <option value="cuadrante">Cuadrante</option>
        </select>
      </td>
      <td style="text-align:right"><button class="btn b-out b-xs" onclick="removeInitBoteRow(this)">Eliminar</button></td>
    </tr>`;
    openMo(`Crear botes — ${opId}`, `
    <div style="max-height:420px;overflow:auto;border:1px solid var(--border);border-radius:10px">
      <table class="tbl" style="margin:0">
        <thead><tr><th>#</th><th>Zona Muestreo</th><th>Bote</th><th>Buzo</th><th>Unidad de Muestreo</th><th></th></tr></thead>
        <tbody id="init-botes-rows">
          ${row(1)}${row(2)}${row(3)}${row(4)}
        </tbody>
      </table>
    </div>
    <div id="bote-picker" style="display:none;margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg)">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input class="flt" id="bote-q" placeholder="Buscar bote o RPA..." oninput="renderBotePicker()">
        <button class="btn b-out b-sm" onclick="botePickerAddNew()">Agregar nuevo</button>
        <button class="btn b-out b-sm" onclick="closeBotePicker()">Cerrar</button>
      </div>
      <div id="bote-list" style="max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:var(--white)"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn b-out b-sm" onclick="addInitBoteRow()">Agregar fila</button>
      <div style="flex:1"></div>
      <button class="btn b-teal" onclick="crearBotesIniciales('${opId}')">Crear botes</button>
      <button class="btn b-out" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'wide');
    window.__INIT_BOTES_OPID__ = opId;
    updateInitBoteRowNumbers();
  };

  /**
   * Agrega una fila en la tabla del modal de “Crear botes”.
   */
  window.addInitBoteRow = function addInitBoteRow() {
    const tbody = document.getElementById('init-botes-rows');
    if (!tbody) return;
    const zona = tbody.querySelectorAll('tr.ib-row').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'ib-row';
    tr.innerHTML = `<td style="color:var(--text3);font-family:var(--ff-m);font-size:10px">—</td>
      <td><input class="ii ib-zona" type="number" min="1" max="10" value="${Math.min(10, zona)}" style="width:70px"></td>
      <td><input class="ii ib-nom" placeholder="Nombre bote" style="width:140px" readonly onclick="openBotePicker(window.__INIT_BOTES_OPID__, this)"></td>
      <td><input class="ii ib-buzo" placeholder="Nombre buzo" style="width:180px"></td>
      <td>
        <select class="is ib-dens" style="width:140px">
          <option value="transecto" selected>Transecto</option>
          <option value="cuadrante">Cuadrante</option>
        </select>
      </td>
      <td style="text-align:right"><button class="btn b-out b-xs" onclick="removeInitBoteRow(this)">Eliminar</button></td>`;
    tbody.appendChild(tr);
    updateInitBoteRowNumbers();
  };

  /**
   * Recalcula el número correlativo (#) de cada fila en el modal de “Crear botes”.
   */
  function updateInitBoteRowNumbers() {
    document.querySelectorAll('#init-botes-rows tr.ib-row').forEach((tr, idx) => {
      const td = tr.querySelector('td');
      if (td) td.textContent = String(idx + 1);
    });
  }

  window.openBotePicker = function openBotePicker(opId, inputEl) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op || !inputEl) return;
    window.__BOTE_PICK_TARGET__ = inputEl;
    const box = document.getElementById('bote-picker');
    const q = document.getElementById('bote-q');
    if (box) box.style.display = '';
    if (q) q.value = '';
    renderBotePicker();
  };

  window.closeBotePicker = function closeBotePicker() {
    const box = document.getElementById('bote-picker');
    if (box) box.style.display = 'none';
    window.__BOTE_PICK_TARGET__ = null;
  };

  window.botePickerAddNew = function botePickerAddNew() {
    const el = window.__BOTE_PICK_TARGET__;
    if (el) {
      el.readOnly = false;
      el.focus();
    }
    closeBotePicker();
  };

  window.pickBote = function pickBote(nombre) {
    const el = window.__BOTE_PICK_TARGET__;
    if (el) {
      el.value = String(nombre || '').toUpperCase();
      el.readOnly = true;
    }
    closeBotePicker();
  };

  window.renderBotePicker = function renderBotePicker() {
    const opId = window.__INIT_BOTES_OPID__;
    const op = DB.operaciones.find((o) => o.id === opId);
    const listEl = document.getElementById('bote-list');
    if (!op || !listEl) return;
    const regionRom = REGION_ROM[parseInt(op.region)] || '';
    const q = String(document.getElementById('bote-q')?.value || '').trim().toLowerCase();
    const base = Array.isArray(window.DB?.botes) ? window.DB.botes : [];
    const norm = (s) => String(s || '').trim().toLowerCase().replace(/^caleta\s+/i, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const opCaleta = norm(op.sector);
    let items = base
      .filter((b) => String(b?.region || '').trim() === String(regionRom).trim())
      .filter((b) => !opCaleta || norm(b?.caleta) === opCaleta);
    if (q) {
      items = items.filter((b) =>
        String(b?.nombre || '').toLowerCase().includes(q) ||
        String(b?.nrpa || '').toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      const ca = String(a?.caleta || '');
      const cb = String(b?.caleta || '');
      if (ca !== cb) return ca.localeCompare(cb, 'es', { sensitivity: 'base' });
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' });
    });
    const rows = items.slice(0, 120).map((b) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-bottom:1px solid var(--border);cursor:pointer" onclick="pickBote('${esc(String(b?.nombre || ''))}')">
        <div>
          <div style="font-weight:800;color:var(--navy)">${esc(String(b?.nombre || ''))}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">RPA ${esc(String(b?.nrpa || '—'))} · Caleta ${esc(String(b?.caleta || '—'))}</div>
        </div>
        <span class="pill p-slt">${esc(String(b?.region || ''))}</span>
      </div>
    `).join('');
    listEl.innerHTML = rows || `<div style="padding:12px;color:var(--text3);text-align:center">Sin botes para esta región</div>`;
  };

  /**
   * Elimina una fila del modal de “Crear botes” y actualiza numeración.
   */
  window.removeInitBoteRow = function removeInitBoteRow(btn) {
    const tr = btn?.closest('tr');
    const tbody = tr?.parentElement;
    if (tr && tbody) {
      tbody.removeChild(tr);
      updateInitBoteRowNumbers();
    }
  };

  /**
   * Crea los botes definidos en el modal (validando filas) y los agrega a la operación.
   * Luego cierra el modal y refresca el listado de operaciones/botes.
   */
  window.crearBotesIniciales = function crearBotesIniciales(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    const rows = [...document.querySelectorAll('#init-botes-rows tr.ib-row')];
    if (!rows.length) { toast('Agrega al menos un bote', 'red'); return; }
    const toCreate = [];
    let invalid = false;
    rows.forEach((tr) => {
      const zona = parseInt(tr.querySelector('.ib-zona')?.value) || 1;
      const nombre = String(tr.querySelector('.ib-nom')?.value || '').trim().toUpperCase();
      const buzo = String(tr.querySelector('.ib-buzo')?.value || '').trim().toUpperCase();
      const densTipo = tr.querySelector('.ib-dens')?.value || 'transecto';
      const empty = !nombre && !buzo;
      if (empty) return;
      if (!nombre || !buzo) invalid = true;
      toCreate.push({ zona, nombre, buzo, densTipo });
    });
    if (invalid) { toast('Completa nombre de bote y buzo en cada fila usada', 'red'); return; }
    if (!toCreate.length) { toast('Completa al menos un bote para crear', 'red'); return; }
    const base = Date.now();
    toCreate.forEach((x, i) => {
      op.botes.push({
        id: 'B' + (base + i),
        nombre: x.nombre,
        buzo: x.buzo,
        zona: x.zona,
        lpMuestras: {},
        transectos: [],
        densTipo: x.densTipo,
        _open: i === 0,
        _activeTab: 'dens'
      });
    });
    closeMo();
    toast(`${toCreate.length} bote(s) creados`, 'green');
    aplicarFiltros();
  };

  /** Abre modal para agregar un bote dentro de una operación. */
  window.openNuevoBote = function openNuevoBote(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const nextN = (op?.botes.length || 0) + 1;
    openMo(`Nuevo bote — ${opId}`, `
    <div class="i2">
      <div class="ig"><label class="il">Nombre del bote</label><input class="ii" id="bn" value="BOTE ${nextN}" placeholder="BRUNO"></div>
      <div class="ig"><label class="il">Zona de muestreo</label><input class="ii" id="bz" type="number" value="${Math.min(10, nextN)}" min="1" max="10"></div>
    </div>
    <div class="ig"><label class="il">Medición de densidad de tipo</label>
      <select class="is" id="bdt"><option value="transecto" selected>Transectos</option><option value="cuadrante">Cuadrantes</option></select>
    </div>
    <div class="ig"><label class="il">Nombre del buzo</label><input class="ii" id="bb" placeholder="NOMBRE APELLIDO BUZO"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="crearBote('${opId}')">Crear bote</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'slim');
  };

  /**
   * Handler: muestra/oculta el input “tipo organización (personalizado)” si se elige OTRA.
   */
  window.onOpTipoOrgChange = function onOpTipoOrgChange() {
    const sel = document.getElementById('op-tipo');
    const wrap = document.getElementById('op-tipo-otra-wrap');
    const inp = document.getElementById('op-tipo-otra');
    if (!sel || !wrap || !inp) return;
    const isOther = sel.value === 'OTRA';
    wrap.style.display = isOther ? '' : 'none';
    if (!isOther) inp.value = '';
  };

  /**
   * Abre el modal para editar los datos base de una operación existente.
   */
  window.openEditOp = function openEditOp(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    const regOpts = REGIONES_CHILE.map((r) => `<option value="${r.id}">${r.rom} — ${r.nom}</option>`).join('');
    const baseTipos = ['STI', 'AINDG', 'SCOOP', 'ASOC'];
    const tipoEsBase = baseTipos.includes(String(op.tipoOrg || '').toUpperCase());
    const tipoSel = tipoEsBase ? String(op.tipoOrg || '').toUpperCase() : 'OTRA';
    const tipoOtra = tipoEsBase ? '' : String(op.tipoOrg || '');
    openMo(`Editar operación — ${opId}`, `
    <div class="i2">
      <div class="ig"><label class="il">Región</label>
        <select class="is" id="op-reg" onchange="onOpRegionChange()">${regOpts}</select>
      </div>
      <div class="ig"><label class="il">N° Seguimiento / ESBA</label><input class="ii" id="op-seg" value="${esc(String(op.numSeg ?? ''))}"></div>
    </div>
    <div class="ig"><label class="il">Sector AMERB</label>
      <input class="ii" id="op-amerb-q" placeholder="Buscar sector AMERB..." oninput="renderOpAmerb()">
      <select class="is" id="op-amerb" onchange="onOpAmerbChange()"><option>Cargando sectores AMERB...</option></select>
    </div>
    <div class="ig" id="op-add-amerb-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar sector AMERB</label>
      <input class="ii" id="op-amerb-new" placeholder="Ej: Sector ..." value="">
    </div>
    <div class="ig"><label class="il">Sector / Caleta</label>
      <input class="ii" id="op-sec-q" placeholder="Buscar caleta..." oninput="renderOpCaletas()">
      <select class="is" id="op-sec" onchange="onOpSectorChange()"><option>Cargando caletas...</option></select>
    </div>
    <div class="ig" id="op-add-sec-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar caleta</label>
      <input class="ii" id="op-caleta-new" placeholder="Ej: Caleta ..." value="">
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Tipo organización</label>
        <select class="is" id="op-tipo" onchange="onOpTipoOrgChange()">
          <option ${tipoSel === 'STI' ? 'selected' : ''}>STI</option>
          <option ${tipoSel === 'AINDG' ? 'selected' : ''}>AINDG</option>
          <option ${tipoSel === 'SCOOP' ? 'selected' : ''}>SCOOP</option>
          <option ${tipoSel === 'ASOC' ? 'selected' : ''}>ASOC</option>
          <option value="OTRA" ${tipoSel === 'OTRA' ? 'selected' : ''}>Otra</option>
        </select>
      </div>
      <div class="ig"><label class="il">Organización (OPA)</label>
        <input class="ii" id="op-opa-q" placeholder="Buscar organización..." oninput="renderOpOpa()">
        <select class="is" id="op-opa" onchange="onOpOpaChange()"><option>Cargando organizaciones...</option></select>
      </div>
    </div>
    <div class="ig" id="op-add-opa-wrap" style="display:none;margin-top:8px">
      <label class="il">Agregar organización</label>
      <input class="ii" id="op-opa-new" placeholder="Nombre organización" value="">
    </div>
    <div class="ig" id="op-tipo-otra-wrap" style="display:${tipoSel === 'OTRA' ? '' : 'none'}">
      <label class="il">Tipo organización (personalizado)</label>
      <input class="ii" id="op-tipo-otra" value="${esc(tipoOtra)}" placeholder="Ej: Cooperativa ...">
    </div>
    <div class="i2">
      <div class="ig"><label class="il">Fecha inicio</label><input class="ii" value="${op.fechaInicio}" disabled></div>
      <div class="ig"><label class="il">Fecha fin</label><input class="ii" value="${op.fechaFin}" disabled></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-red" style="flex:1" onclick="openDeleteOp('${opId}')">Eliminar operación</button>
      <button class="btn b-teal" style="flex:1" onclick="saveEditOp('${opId}')">Guardar</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'slim');
    const reg = document.getElementById('op-reg');
    if (reg) reg.value = String(op.region || 14);
    addCustomCaleta(parseInt(op.region) || 14, op.sector);
    window.renderOpCaletas?.(op.sector);
    const regId = parseInt(op.region) || 14;
    const amerbId = String(op.sectorAmerbId || '');
    const opaId = String(op.opaId || '');
    if ((/^custom:/i.test(amerbId) || !amerbId) && op.sectorAmerb) addCustomListItem(AMERB_CUSTOM_KEY, regId, op.sectorAmerb);
    if ((/^custom:/i.test(opaId) || !opaId) && op.org) addCustomListItem(OPA_CUSTOM_KEY, regId, op.org);
    window.renderOpAmerb?.(String(op.sectorAmerbId || ''));
    window.renderOpOpa?.(String(op.opaId || ''));
    window.onOpTipoOrgChange?.();
  };

  /**
   * Guarda los cambios del modal de edición de operación en la BD en memoria.
   * Valida sector/tipo org y refresca filtros + listado.
   */
  window.saveEditOp = function saveEditOp(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    const regId = parseInt(document.getElementById('op-reg')?.value) || op.region;
    const amerbEl = document.getElementById('op-amerb');
    const amerbAddInp = document.getElementById('op-amerb-new');
    let sectorAmerb = '';
    let sectorAmerbId = String(amerbEl?.value || '');
    if (!sectorAmerbId) { toast('Selecciona un sector AMERB', 'red'); return; }
    if (sectorAmerbId === ADD_AMERB_VALUE) {
      const name = String(amerbAddInp?.value || '').trim();
      if (!name) { toast('Ingresa un sector AMERB para continuar', 'red'); return; }
      addCustomListItem(AMERB_CUSTOM_KEY, regId, name);
      sectorAmerb = name;
      sectorAmerbId = `custom:${name}`;
    } else if (/^custom:/i.test(sectorAmerbId)) {
      sectorAmerb = sectorAmerbId.slice(7);
    } else {
      const base = Array.isArray(window.DB?.sectores_amerb) ? window.DB.sectores_amerb : [];
      const found = base.find((x) => String(x?.id) === String(sectorAmerbId));
      sectorAmerb = String(found?.nombreamerb || '').trim();
      if (!sectorAmerb) { toast('Sector AMERB inválido', 'red'); return; }
    }
    const secEl = document.getElementById('op-sec');
    const addInp = document.getElementById('op-caleta-new');
    let sector = secEl?.value;
    if (!sector) { toast('Selecciona un sector', 'red'); return; }
    if (sector === ADD_SECTOR_VALUE) {
      const name = String(addInp?.value || '').trim();
      if (!name) { toast('Ingresa un sector para continuar', 'red'); return; }
      addCustomCaleta(regId, name);
      sector = name;
    }
    let tipoOrg = document.getElementById('op-tipo')?.value;
    if (tipoOrg === 'OTRA') {
      const custom = String(document.getElementById('op-tipo-otra')?.value || '').trim();
      if (!custom) { toast('Ingresa un tipo de organización', 'red'); return; }
      tipoOrg = custom;
    }
    const opaEl = document.getElementById('op-opa');
    const opaAddInp = document.getElementById('op-opa-new');
    let org = '';
    let opaId = String(opaEl?.value || '');
    if (!opaId) { toast('Selecciona una organización', 'red'); return; }
    if (opaId === ADD_OPA_VALUE) {
      const name = String(opaAddInp?.value || '').trim();
      if (!name) { toast('Ingresa una organización para continuar', 'red'); return; }
      addCustomListItem(OPA_CUSTOM_KEY, regId, name);
      org = name;
      opaId = `custom:${name}`;
    } else if (/^custom:/i.test(opaId)) {
      org = opaId.slice(7);
    } else {
      const base = Array.isArray(window.DB?.opa) ? window.DB.opa : [];
      const found = base.find((x) => String(x?.id) === String(opaId));
      org = String(found?.nombre || '').trim();
      if (!org) { toast('Organización inválida', 'red'); return; }
    }
    op.region = regId;
    op.sectorAmerb = sectorAmerb;
    op.sectorAmerbId = sectorAmerbId;
    op.sector = sector;
    op.tipoOrg = tipoOrg;
    op.org = org;
    op.opaId = opaId;
    closeMo();
    toast(`Operación ${opId} actualizada`, 'green');
    initFiltros();
    aplicarFiltros();
  };

  /**
   * Abre el flujo de eliminación de operación (confirmación 1/2).
   */
  window.openDeleteOp = function openDeleteOp(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    openMo('Eliminar operación', `
    <div class="info-box amber"><span>i</span><div>Vas a eliminar <strong>${opId}</strong>. Esta acción no se puede deshacer.</div></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-red" style="flex:1" onclick="confirmDeleteOp1('${opId}')">Eliminar</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'slim');
  };

  /**
   * Segunda pantalla de confirmación para eliminar operación (2/2).
   */
  window.confirmDeleteOp1 = function confirmDeleteOp1(opId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    if (!op) return;
    openMo('Confirmación final', `
    <div class="info-box amber"><span>i</span><div>Confirmación 2/2: se eliminarán todos los botes, muestras y unidades de densidad de <strong>${opId}</strong>. Los datos no se podrán recuperar.</div></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-red" style="flex:1" onclick="confirmDeleteOp2('${opId}')">Sí, eliminar definitivamente</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'slim');
  };

  /**
   * Elimina definitivamente una operación desde la BD en memoria y refresca la UI.
   */
  window.confirmDeleteOp2 = function confirmDeleteOp2(opId) {
    const idx = DB.operaciones.findIndex((o) => o.id === opId);
    if (idx < 0) return;
    DB.operaciones.splice(idx, 1);
    closeMo();
    toast(`Operación ${opId} eliminada`, 'amber');
    initFiltros();
    aplicarFiltros();
  };

  /** Crea el bote en la operación y deja el bote expandido por defecto. */
  window.crearBote = function crearBote(opId) {
    const nombre = (document.getElementById('bn')?.value || '').toUpperCase();
    const zona = parseInt(document.getElementById('bz')?.value) || 1;
    const buzo = (document.getElementById('bb')?.value || '').toUpperCase();
    const densTipo = document.getElementById('bdt')?.value || 'transecto';
    if (!nombre || !buzo) { toast('Completa nombre de bote y buzo', 'red'); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    if (op) op.botes.push({ id: 'B' + Date.now(), nombre, buzo, zona, lpMuestras: {}, transectos: [], densTipo, _open: true, _activeTab: 'dens' });
    closeMo();
    toast(`Bote ${nombre} · Zona ${zona} agregado`, 'green');
    aplicarFiltros();
  };
  /**
   * Abre el modal de edición de un bote (tipo densidad, zona, nombre y buzo).
   */
  window.openEditBote = function openEditBote(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    if (!b) return;
    openMo(`Editar bote — ${b.nombre}`, `
    <div class="ig"><label class="il">Medición de densidad de tipo</label>
      <select class="is" id="ebdt"><option value="transecto" ${b.densTipo==='transecto'?'selected':''}>Transectos</option><option value="cuadrante" ${b.densTipo==='cuadrante'?'selected':''}>Cuadrantes</option></select>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:6px">Si cambias el tipo, se perderán las unidades creadas (transectos/cuadrantes) de este bote.</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="saveEditBote('${opId}','${boteId}')">Guardar</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
    <button class="btn b-red b-sm" style="margin-top:10px;width:100%" onclick="openDeleteBote('${opId}','${boteId}')">Eliminar bote</button>
    `, 'slim');
  };

  /**
   * Abre confirmación para eliminar un bote (y todos sus datos asociados).
   */
  window.openDeleteBote = function openDeleteBote(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    if (!op || !b) return;
    openMo(`Eliminar bote — ${b.nombre}`, `
      <div class="info-box amber"><span>i</span><div>Se eliminará el bote <strong>${b.nombre}</strong> (Zona ${b.zona}) y todas sus unidades de densidad y muestras L-P. Esta acción no se puede deshacer.</div></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-red" style="flex:1" onclick="confirmDeleteBote('${opId}','${boteId}')">Eliminar</button>
        <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
      </div>
    `, 'slim');
  };
  /**
   * Elimina el bote desde la operación y refresca la UI.
   */
  window.confirmDeleteBote = function confirmDeleteBote(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const idx = op?.botes?.findIndex((bt) => bt.id === boteId);
    if (idx == null || idx < 0) return;
    const name = op.botes[idx]?.nombre || 'Bote';
    op.botes.splice(idx, 1);
    closeMo();
    toast(`${name} eliminado`, 'amber');
    aplicarFiltros();
  };

  /**
   * Abre confirmación para eliminar una unidad de densidad (transecto o cuadrante) del bote.
   */
  window.openDeleteUnidad = function openDeleteUnidad(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    const t = b?.transectos?.find((x) => x.num === txNum);
    if (!op || !b || !t) return;
    const label = t.tipo === 'cuadrante' ? `Cuadrante C${txNum}` : `Transecto T${txNum}`;
    openMo(`Eliminar ${label}`, `
      <div class="info-box amber"><span>i</span><div>Se eliminará <strong>${label}</strong> del bote <strong>${b.nombre}</strong>. Esta acción no se puede deshacer.</div></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-red" style="flex:1" onclick="confirmDeleteUnidad('${opId}','${boteId}',${txNum})">Eliminar</button>
        <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
      </div>
    `, 'slim');
  };
  /**
   * Elimina definitivamente una unidad (transecto/cuadrante) y refresca la UI.
   */
  window.confirmDeleteUnidad = function confirmDeleteUnidad(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    const idx = b?.transectos?.findIndex((x) => x.num === txNum);
    if (!b || idx == null || idx < 0) return;
    const tipo = b.transectos[idx]?.tipo === 'cuadrante' ? 'Cuadrante' : 'Transecto';
    b.transectos.splice(idx, 1);
    closeMo();
    toast(`${tipo} eliminado`, 'amber');
    aplicarFiltros();
  };
  /**
   * Guarda cambios del bote desde el modal de edición.
   * Si se cambia el tipo de densidad con unidades existentes, solicita confirmación extra.
   */
  window.saveEditBote = function saveEditBote(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    if (!b) return;
    const newTipo = document.getElementById('ebdt')?.value || b.densTipo;
    if (newTipo === b.densTipo) { closeMo(); toast('Tipo sin cambios', 'green'); return; }
    if ((b.transectos || []).length > 0) {
      openMo('Confirmar cambio de tipo', `
      <div class="info-box amber"><span>i</span><div>Cambiar de ${b.densTipo==='cuadrante'?'cuadrantes':'transectos'} a ${newTipo==='cuadrante'?'cuadrantes':'transectos'} eliminará todas las unidades creadas en este bote.</div></div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-teal" style="flex:1" onclick="confirmChangeBoteTipo('${opId}','${boteId}','${newTipo}')">Confirmar</button>
        <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
      </div>
      `, 'slim');
    } else {
      b.densTipo = newTipo;
      closeMo();
      toast(`Tipo actualizado a ${newTipo}`, 'green');
      aplicarFiltros();
    }
  };
  /**
   * Confirma el cambio de tipo de densidad del bote eliminando sus unidades previas.
   */
  window.confirmChangeBoteTipo = function confirmChangeBoteTipo(opId, boteId, newTipo) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((bt) => bt.id === boteId);
    if (!b) return;
    b.densTipo = newTipo;
    b.transectos = [];
    closeMo();
    toast(`Tipo cambiado a ${newTipo}. Unidades previas eliminadas.`, 'amber');
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

  /**
   * Selección exclusiva en grilla de especies (tipo radio).
   * Se usa cuando se requiere elegir una sola especie (p.ej. creación masiva de cuadrantes).
   */
  window.selectSingleSpChip = function selectSingleSpChip(el, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) { el.classList.toggle('sel'); return; }
    const wasSelected = el.classList.contains('sel');
    grid.querySelectorAll('.sp-chip.sel').forEach((c) => c.classList.remove('sel'));
    if (!wasSelected) el.classList.add('sel');
  };

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
    const esAlga = isAlgaId(spId);
    const tabs = espIds.map((eid) => {
      const s = ESPECIES.find((e) => e.id == eid);
      return `<button class="btn ${eid == spId ? 'b-teal' : 'b-out'} b-sm" onclick="closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${eid}),100)">${s?.com || '?'} (${b.lpMuestras[eid]?.length || 0})</button>`;
    }).join('');
    const rows = muestras.map((m, i) => `<tr>
    <td style="font-family:var(--ff-m);font-size:10px;color:var(--text3)">${i + 1}</td>
    ${esAlga ? `<td>${(m.d ?? m.l) ?? '—'} cm</td>` : `<td>${m.l} mm</td><td>${m.p ?? '—'} g</td>`}
    <td style="white-space:nowrap">
      <button class="btn b-out b-xs" onclick="openEditLP('${opId}','${boteId}',${spId},${i},1)">✎</button>
      <button class="btn b-out b-xs" onclick="borrarLP('${opId}','${boteId}',${spId},${i});closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)">Eliminar</button>
    </td>
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
      <div class="ig"><label class="il">${esAlga ? 'Diámetro disco (cm)' : 'Longitud (mm)'}</label>
        <input class="ii lp-num-inp" id="${esAlga ? 'inp-d' : 'inp-l'}" type="number" placeholder="${esAlga ? 'ej. 12.4' : 'ej. 104'}" min="0" max="99999" step="${esAlga ? '0.1' : '1'}" autofocus
          style="font-size:17px;font-weight:700;text-align:center"
          onkeydown="if(event.key==='Enter'){event.preventDefault();${esAlga ? `addLP('${opId}','${boteId}',${spId})` : `document.getElementById('inp-p')?.focus();`}}">
      </div>
      ${esAlga ? '' : `<div class="ig"><label class="il">Peso (g)</label>
        <input class="ii lp-num-inp" id="inp-p" type="number" placeholder="ej. 267" min="0" max="99999"
          style="font-size:17px;font-weight:700;text-align:center"
          onkeydown="if(event.key==='Enter'){event.preventDefault();addLP('${opId}','${boteId}',${spId})}">
      </div>`}
      <button class="btn b-teal" style="padding:10px 18px;font-size:15px;white-space:nowrap" onclick="addLP('${opId}','${boteId}',${spId})">Agregar</button>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">${esAlga ? 'Presiona Enter para agregar · El campo se vacía automáticamente' : 'Presiona Enter en Peso para agregar · Los campos se vacían automáticamente'}</div>
    <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">#</th>
          ${esAlga ? `<th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">Diámetro (cm)</th>` : `
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">Long. (mm)</th>
          <th style="padding:7px 10px;font-family:var(--ff-m);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);background:var(--bg);text-align:left">Peso (g)</th>`}
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
    const esAlga = isAlgaId(spId);
    const il = document.getElementById(esAlga ? 'inp-d' : 'inp-l');
    const ip = document.getElementById('inp-p');
    const l = parseFloat(il?.value);
    const p = parseFloat(ip?.value);
    if (isNaN(l) || l <= 0) { toast(esAlga ? 'Diámetro inválido' : 'Longitud inválida', 'red'); il?.focus(); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b?.lpMuestras[spId]) b.lpMuestras[spId] = [];
    const muestra = esAlga ? { d: l } : { l };
    if (!esAlga && !isNaN(p) && p >= 0) muestra.p = p;
    b.lpMuestras[spId].push(muestra);
    const n = b.lpMuestras[spId].length;
    const tbody = document.getElementById('lp-rows');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = esAlga ? `<td style="padding:6px 9px;border-bottom:1px solid var(--border);font-family:var(--ff-m);font-size:10px;color:var(--text3)">${n}</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)">${l} cm</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border);white-space:nowrap">
        <button class="btn b-out b-xs" onclick="openEditLP('${opId}','${boteId}',${spId},${n - 1},1)">✎</button>
        <button class="btn b-out b-xs" onclick="borrarLP('${opId}','${boteId}',${spId},${n - 1});closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)">Eliminar</button>
      </td>` : `<td style="padding:6px 9px;border-bottom:1px solid var(--border);font-family:var(--ff-m);font-size:10px;color:var(--text3)">${n}</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)">${l} mm</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border)">${muestra.p ?? '—'} g</td>
      <td style="padding:6px 9px;border-bottom:1px solid var(--border);white-space:nowrap">
        <button class="btn b-out b-xs" onclick="openEditLP('${opId}','${boteId}',${spId},${n - 1},1)">✎</button>
        <button class="btn b-out b-xs" onclick="borrarLP('${opId}','${boteId}',${spId},${n - 1});closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)">Eliminar</button>
      </td>`;
      tbody.appendChild(tr);
      tbody.parentElement.parentElement.scrollTop = 999;
    }
    const cnt = document.getElementById('lp-cnt');
    if (cnt) cnt.textContent = `${n} muestras`;
    const sp = ESPECIES.find((e) => e.id == spId);
    const btn = document.getElementById('btn-fin-lp');
    if (btn) btn.textContent = `Finalizar ${sp?.com} (${n})`;
    if (il) { il.value = ''; il.focus(); }
    if (!esAlga && ip) ip.value = '';
    toast(esAlga ? `Muestra ${n}: ${l} cm` : `Muestra ${n}: ${l}mm${muestra.p ? ' / ' + muestra.p + 'g' : ''}`, 'green');
  };

  /** Elimina una muestra L-P por índice desde la BD en memoria. */
  window.borrarLP = function borrarLP(opId, boteId, spId, idx) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (b?.lpMuestras[spId]) b.lpMuestras[spId].splice(idx, 1);
  };

  /**
   * Abre el modal de edición de una muestra L-P/diámetro (según especie).
   * El parámetro reopen permite volver automáticamente al modal principal de ingreso.
   */
  window.openEditLP = function openEditLP(opId, boteId, spId, idx, reopen = 0) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const sp = ESPECIES.find((e) => e.id == spId);
    const m = b?.lpMuestras?.[spId]?.[idx];
    if (!b || !sp || !m) return;
    const esAlga = isAlgaId(spId);
    const pesoVal = (m.p ?? '') === '' ? '' : String(m.p ?? '');
    openMo(`Editar muestra — ${sp.com} · ${b.nombre}`, `
    <div class="i2">
      <div class="ig"><label class="il">${esAlga ? 'Diámetro disco (cm)' : 'Longitud (mm)'}</label><input class="ii lp-num-inp" id="ed-l" type="number" min="0" max="99999" step="${esAlga ? '0.1' : '1'}" value="${esAlga ? (m.d ?? m.l ?? '') : m.l}"
        onkeydown="if(event.key==='Enter'){event.preventDefault();${esAlga ? `saveEditLP('${opId}','${boteId}',${spId},${idx},${reopen ? 1 : 0})` : `document.getElementById('ed-p')?.focus();`}}"></div>
      ${esAlga ? '' : `<div class="ig"><label class="il">Peso (g)</label><input class="ii lp-num-inp" id="ed-p" type="number" min="0" max="99999" value="${pesoVal}"
        onkeydown="if(event.key==='Enter'){event.preventDefault();saveEditLP('${opId}','${boteId}',${spId},${idx},${reopen ? 1 : 0})}"></div>`}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="saveEditLP('${opId}','${boteId}',${spId},${idx},${reopen ? 1 : 0})">Guardar</button>
      <button class="btn b-out" style="flex:1" onclick="${reopen ? `closeMo();setTimeout(()=>openIngresarMuestras('${opId}','${boteId}',${spId}),100)` : 'closeMo()'}">Cancelar</button>
    </div>
    `, 'slim');
  };

  /**
   * Guarda los cambios de la muestra editada y opcionalmente reabre el modal de ingreso.
   */
  window.saveEditLP = function saveEditLP(opId, boteId, spId, idx, reopen = 0) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const m = b?.lpMuestras?.[spId]?.[idx];
    if (!b || !m) return;
    const esAlga = isAlgaId(spId);
    const l = parseFloat(document.getElementById('ed-l')?.value);
    const pRaw = document.getElementById('ed-p')?.value;
    const p = pRaw === '' || pRaw == null ? null : parseFloat(pRaw);
    if (isNaN(l) || l <= 0) { toast(esAlga ? 'Diámetro inválido' : 'Longitud inválida', 'red'); return; }
    if (!esAlga && p !== null && (isNaN(p) || p < 0)) { toast('Peso inválido', 'red'); return; }
    if (esAlga) { m.d = l; delete m.l; delete m.p; }
    else { m.l = l; if (p === null) delete m.p; else m.p = p; }
    closeMo();
    toast('Muestra actualizada', 'green');
    if (reopen) setTimeout(() => openIngresarMuestras(opId, boteId, spId), 100);
    else aplicarFiltros();
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
    const tipoFinal = (b?.densTipo || tipoInicial);
    const esCuad = tipoFinal === 'cuadrante';
    if (!b) return;
    if (esCuad) {
      openCuadrantesMasivo(opId, boteId, b, tipoFinal);
      return;
    }
    const nextNum = getNextUnidadNum(b);
    openMo(`Agregar transectos — ${b?.nombre} · Zona ${b?.zona}`, `
    <input type="hidden" id="tx-tipo" value="${tipoFinal}">
    <div style="max-height:420px;overflow:auto;border:1px solid var(--border);border-radius:10px">
      <table class="tbl" style="margin:0">
        <thead><tr><th>#</th><th>N°</th><th>Área</th><th>Tipo de sustrato</th><th>Cubierta biológica</th><th>Especies</th><th></th></tr></thead>
        <tbody id="init-tx-rows">
          ${buildInitTransectoRowHTML(nextNum)}${buildInitTransectoRowHTML(nextNum + 1)}${buildInitTransectoRowHTML(nextNum + 2)}${buildInitTransectoRowHTML(nextNum + 3)}${buildInitTransectoRowHTML(nextNum + 4)}${buildInitTransectoRowHTML(nextNum + 5)}
        </tbody>
      </table>
    </div>

    <div id="init-tx-sp-panel" style="display:none;margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:10px">
      <input type="hidden" id="init-tx-sp-active" value="">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <input class="flt" style="flex:1" placeholder="Buscar especie..." oninput="filterSpGrid(this.value,'sp-grid-init-tx')">
        <button class="btn b-out b-sm" onclick="cancelInitTxEspecies()">Cerrar</button>
      </div>
      <div class="sp-grid" id="sp-grid-init-tx">
        ${ESPECIES.map((sp) => `<div class="sp-chip" data-id="${sp.id}" onclick="toggleSpChip(this)">
          <div class="sp-chip-name">${sp.com}</div>
          <div class="sp-chip-sci">${sp.sci}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn b-teal" style="flex:1" onclick="confirmInitTxEspecies()">Confirmar especies</button>
        <button class="btn b-out" style="flex:1" onclick="cancelInitTxEspecies()">Cancelar</button>
      </div>
    </div>

    <div id="init-tx-repl" style="display:none;margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg)">
      <input type="hidden" id="init-tx-repl-payload" value="">
      <div class="info-box blue" style="margin:0"><span>i</span>
        <div>¿Quieres replicar estos datos (área, sustrato, cubierta y especies) al resto de transectos de la tabla?</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn b-teal" style="flex:1" onclick="replicateInitTxFromPayload()">Sí, replicar</button>
        <button class="btn b-out" style="flex:1" onclick="hideInitTxReplicate()">No</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn b-out b-sm" onclick="addInitTransectoRow()">Agregar transecto</button>
      <div style="flex:1"></div>
      <button class="btn b-teal" onclick="crearTransectosDesdeTabla('${opId}','${boteId}')">Crear</button>
      <button class="btn b-out" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'wide');
    updateInitTxRowNumbers();
    window.__INIT_TX_REPL_SHOWN__ = false;
  };

  /**
   * Obtiene el siguiente número disponible para una nueva unidad (transecto/cuadrante) del bote.
   * Se basa en el máximo num existente y suma 1.
   */
  function getNextUnidadNum(b) {
    const nums = (b?.transectos || []).map((t) => parseInt(t.num)).filter((n) => !isNaN(n));
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }

  /**
   * Construye el HTML de una fila de la tabla “crear transectos” (modal).
   * Incluye presets/inputs para área, sustrato, cubierta y selección de especies.
   */
  function buildInitTransectoRowHTML(n) {
    const sustratos = ['', 'ROCA', 'ROCA/ARENA', 'BOLÓN', 'ARENA', 'MIXTO', 'TERTEL'];
    const cubiertas = ['', 'ALGAS PARDAS', 'ALGAS ROJAS', 'ALGAS', 'PIURE', 'SIN COBERTURA', 'MIXTA'];
    return `<tr class="itx-row" data-num="${n}" data-esp="[]">
      <td style="color:var(--text3);font-family:var(--ff-m);font-size:10px">—</td>
      <td style="font-family:var(--ff-m);font-weight:800">T${n}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="is itx-area" style="width:110px" onchange="onInitTxAreaChange(this)">
            <option value="120" selected>120 m²</option>
            <option value="60">60 m²</option>
            <option value="50">50 m²</option>
            <option value="30">30 m²</option>
            <option value="20">20 m²</option>
            <option value="custom">Otro...</option>
          </select>
          <input class="ii itx-area-manual" type="number" step="0.0001" min="0.0001" placeholder="m²" style="display:none;width:110px">
        </div>
      </td>
      <td>
        <select class="is itx-s" style="width:160px">
          ${sustratos.map((c) => `<option value="${c}">${c || '(sin valor)'}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="is itx-c" style="width:180px">
          ${cubiertas.map((c) => `<option value="${c}">${c || '(sin valor)'}</option>`).join('')}
        </select>
      </td>
      <td>
        <input class="ii itx-esp" placeholder="Seleccionar especies..." readonly style="width:240px;cursor:pointer" onclick="openInitTxEspecies(${n})">
      </td>
      <td style="text-align:right"><button class="btn b-out b-xs" onclick="removeInitTransectoRow(this)">Eliminar</button></td>
    </tr>`;
  }

  /**
   * Recalcula el número correlativo (#) de las filas del modal de creación de transectos.
   */
  function updateInitTxRowNumbers() {
    document.querySelectorAll('#init-tx-rows tr.itx-row').forEach((tr, idx) => {
      const td = tr.querySelector('td');
      if (td) td.textContent = String(idx + 1);
    });
  }

  /**
   * Agrega una fila para crear un nuevo transecto en el modal (incrementa Tn automáticamente).
   */
  window.addInitTransectoRow = function addInitTransectoRow() {
    const tbody = document.getElementById('init-tx-rows');
    if (!tbody) return;
    const nums = [...tbody.querySelectorAll('tr.itx-row')].map((tr) => parseInt(tr.getAttribute('data-num'))).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    tbody.insertAdjacentHTML('beforeend', buildInitTransectoRowHTML(next));
    updateInitTxRowNumbers();
  };

  /**
   * Elimina una fila de la tabla de creación de transectos y actualiza numeración.
   */
  window.removeInitTransectoRow = function removeInitTransectoRow(btn) {
    const tr = btn?.closest('tr');
    const tbody = tr?.parentElement;
    if (tr && tbody) {
      tbody.removeChild(tr);
      updateInitTxRowNumbers();
    }
  };

  /**
   * Handler del combo de área en el modal de creación de transectos.
   * Muestra input manual cuando se elige “Otro...”.
   */
  window.onInitTxAreaChange = function onInitTxAreaChange(sel) {
    const wrap = sel?.closest('td');
    const manual = wrap?.querySelector('.itx-area-manual');
    if (!manual) return;
    if (sel.value === 'custom') {
      manual.style.display = '';
      manual.focus();
    } else {
      manual.style.display = 'none';
      manual.value = '';
    }
  };

  /**
   * Abre el panel de selección múltiple de especies para una fila de transecto (modal).
   */
  window.openInitTxEspecies = function openInitTxEspecies(n) {
    const panel = document.getElementById('init-tx-sp-panel');
    const active = document.getElementById('init-tx-sp-active');
    const grid = document.getElementById('sp-grid-init-tx');
    const row = document.querySelector(`#init-tx-rows tr.itx-row[data-num="${n}"]`);
    if (!panel || !active || !grid || !row) return;
    active.value = String(n);
    const sel = (JSON.parse(row.getAttribute('data-esp') || '[]') || []).map((x) => parseInt(x));
    grid.querySelectorAll('.sp-chip').forEach((chip) => {
      const id = parseInt(chip.dataset.id);
      chip.classList.toggle('sel', sel.includes(id));
      chip.style.display = '';
    });
    panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /**
   * Cierra el panel de selección de especies del modal de transectos y limpia el filtro.
   */
  window.cancelInitTxEspecies = function cancelInitTxEspecies() {
    const panel = document.getElementById('init-tx-sp-panel');
    const active = document.getElementById('init-tx-sp-active');
    const search = panel?.querySelector('input.flt');
    if (panel) panel.style.display = 'none';
    if (active) active.value = '';
    if (search) search.value = '';
    if (panel) filterSpGrid('', 'sp-grid-init-tx');
  };

  /**
   * Confirma especies seleccionadas para una fila del modal de transectos
   * y las deja pre-cargadas con conteo inicial 0 en el transecto resultante.
   */
  window.confirmInitTxEspecies = function confirmInitTxEspecies() {
    const panel = document.getElementById('init-tx-sp-panel');
    const active = document.getElementById('init-tx-sp-active');
    const n = parseInt(active?.value);
    if (!n || isNaN(n)) return;
    const row = document.querySelector(`#init-tx-rows tr.itx-row[data-num="${n}"]`);
    if (!row) return;
    const sel = [...document.querySelectorAll('#sp-grid-init-tx .sp-chip.sel')].map((el) => parseInt(el.dataset.id)).filter((x) => !isNaN(x));
    row.setAttribute('data-esp', JSON.stringify(sel));
    const inp = row.querySelector('.itx-esp');
    const names = sel.map((id) => ESPECIES.find((e) => e.id == id)?.com).filter(Boolean);
    if (inp) inp.value = names.length ? names.join(', ') : '';
    if (panel) panel.style.display = 'none';
    if (active) active.value = '';
    if (panel) filterSpGrid('', 'sp-grid-init-tx');

    if (window.__INIT_TX_REPL_SHOWN__) return;
    const nums = [...document.querySelectorAll('#init-tx-rows tr.itx-row')]
      .map((tr) => parseInt(tr?.getAttribute('data-num')))
      .filter((x) => !isNaN(x));
    const firstNum = nums.length ? Math.min(...nums) : n;
    if (n !== firstNum) return;
    const otherRows = [...document.querySelectorAll('#init-tx-rows tr.itx-row')].filter((tr) => tr?.getAttribute('data-num') !== String(n));
    if (!otherRows.length) return;
    const areaSel = row.querySelector('.itx-area')?.value || '120';
    const areaManual = row.querySelector('.itx-area-manual')?.value || '';
    const sustrato = row.querySelector('.itx-s')?.value || '';
    const cubierta = row.querySelector('.itx-c')?.value || '';
    const payload = { n, sel, areaSel, areaManual, sustrato, cubierta };
    const repl = document.getElementById('init-tx-repl');
    const store = document.getElementById('init-tx-repl-payload');
    if (store) store.value = JSON.stringify(payload);
    if (repl) repl.style.display = '';
    window.__INIT_TX_REPL_SHOWN__ = true;
  };

  window.hideInitTxReplicate = function hideInitTxReplicate() {
    const repl = document.getElementById('init-tx-repl');
    const store = document.getElementById('init-tx-repl-payload');
    if (repl) repl.style.display = 'none';
    if (store) store.value = '';
  };

  window.replicateInitTxFromPayload = function replicateInitTxFromPayload() {
    const store = document.getElementById('init-tx-repl-payload');
    if (!store) return;
    let payload = null;
    try { payload = JSON.parse(store.value || ''); } catch { payload = null; }
    if (!payload || typeof payload !== 'object') return;
    const n = parseInt(payload.n);
    const sel = Array.isArray(payload.sel) ? payload.sel.map((x) => parseInt(x)).filter((x) => !isNaN(x)) : [];
    const areaSel = String(payload.areaSel || '120');
    const areaManual = String(payload.areaManual || '');
    const sustrato = String(payload.sustrato || '');
    const cubierta = String(payload.cubierta || '');
    const names = sel.map((id) => ESPECIES.find((e) => e.id == id)?.com).filter(Boolean);
    document.querySelectorAll('#init-tx-rows tr.itx-row').forEach((tr) => {
      if (!tr) return;
      if (String(tr.getAttribute('data-num') || '') === String(n)) return;
      tr.setAttribute('data-esp', JSON.stringify(sel));
      const inp = tr.querySelector('.itx-esp');
      if (inp) inp.value = names.length ? names.join(', ') : '';
      const aSel = tr.querySelector('.itx-area');
      const aMan = tr.querySelector('.itx-area-manual');
      if (aSel) aSel.value = areaSel;
      if (aMan) {
        if (areaSel === 'custom') {
          aMan.style.display = '';
          aMan.value = areaManual;
        } else {
          aMan.style.display = 'none';
          aMan.value = '';
        }
      }
      const sSel = tr.querySelector('.itx-s');
      const cSel = tr.querySelector('.itx-c');
      if (sSel) sSel.value = sustrato;
      if (cSel) cSel.value = cubierta;
    });
    hideInitTxReplicate();
    toast('Datos replicados', 'green');
  };

  /**
   * Crea transectos en el bote según la tabla del modal (área/sustrato/cubierta/especies).
   * Evita colisiones de números ya existentes y refresca la UI.
   */
  window.crearTransectosDesdeTabla = function crearTransectosDesdeTabla(opId, boteId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    const fecha = new Date().toISOString().slice(0, 10);
    const rows = [...document.querySelectorAll('#init-tx-rows tr.itx-row')];
    if (!rows.length) { toast('Agrega al menos un transecto', 'red'); return; }
    const existingNums = new Set((b.transectos || []).map((t) => parseInt(t.num)));
    const toCreate = [];
    let invalid = false;
    rows.forEach((tr) => {
      let num = parseInt(tr.getAttribute('data-num'));
      if (!num || isNaN(num)) return;
      while (existingNums.has(num)) num++;
      existingNums.add(num);
      const areaSel = tr.querySelector('.itx-area')?.value;
      const areaManual = parseFloat(tr.querySelector('.itx-area-manual')?.value);
      const area = areaSel === 'custom' ? areaManual : parseFloat(areaSel);
      if (isNaN(area) || area <= 0) invalid = true;
      const sustrato = tr.querySelector('.itx-s')?.value || '';
      const cubierta = tr.querySelector('.itx-c')?.value || '';
      const esp = (JSON.parse(tr.getAttribute('data-esp') || '[]') || []).map((x) => parseInt(x)).filter((x) => !isNaN(x));
      const counts = {};
      esp.forEach((id) => { counts[id] = 0; });
      toCreate.push({ num, area, sustrato, cubierta, counts });
    });
    if (invalid) { toast('Ingresa un área válida en todos los transectos', 'red'); return; }
    toCreate.forEach((x) => {
      b.transectos.push({ num: x.num, tipo: 'transecto', area: x.area, fecha, sustrato: x.sustrato, cubierta: x.cubierta, counts: x.counts });
    });
    closeMo();
    toast(`${toCreate.length} transecto(s) creado(s)`, 'green');
    aplicarFiltros();
  };

  /**
   * Abre el modal de creación masiva de cuadrantes (una fila generadora).
   * Permite definir cantidad, área, sustrato y una especie única para todos.
   */
  function openCuadrantesMasivo(opId, boteId, b, tipoFinal) {
    const nextNum = getNextUnidadNum(b);
    const sustratos = ['', 'ROCA', 'ROCA/ARENA', 'BOLÓN', 'ARENA', 'MIXTO', 'TERTEL'];
    openMo(`Agregar cuadrantes — ${b?.nombre} · Zona ${b?.zona}`, `
    <input type="hidden" id="tx-tipo" value="${tipoFinal}">
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <table class="tbl" style="margin:0">
        <thead><tr><th>Cantidad</th><th>Área cuadrante</th><th>Tipo sustrato</th><th>Especie</th></tr></thead>
        <tbody>
          <tr>
            <td><input class="ii" id="cuad-n" type="number" min="1" value="30" style="width:110px"></td>
            <td>
              <div style="display:flex;gap:6px;align-items:center">
                <select class="is" id="cuad-area" style="width:140px" onchange="onInitCuadAreaChange(this.value)">
                  <option value="0.25">0.25 m²</option>
                  <option value="0.0625" selected>0.0625 m²</option>
                  <option value="0.01">0.01 m²</option>
                  <option value="custom">Otro...</option>
                </select>
                <input class="ii" id="cuad-area-manual" type="number" step="0.0001" min="0.0001" placeholder="m²" style="display:none;width:130px" value="0.0625">
              </div>
            </td>
            <td>
              <select class="is" id="cuad-s" style="width:180px">
                ${sustratos.map((c) => `<option value="${c}">${c || '(sin valor)'}</option>`).join('')}
              </select>
            </td>
            <td>
              <input type="hidden" id="cuad-esp-id" value="">
              <input class="ii" id="cuad-esp" placeholder="Seleccionar especie..." readonly style="width:260px;cursor:pointer" onclick="openInitCuadEspecie()">
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div id="init-cuad-sp-panel" style="display:none;margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:10px">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <input class="flt" style="flex:1" placeholder="Buscar especie..." oninput="filterSpGrid(this.value,'sp-grid-init-cuad')">
        <button class="btn b-out b-sm" onclick="cancelInitCuadEspecie()">Cerrar</button>
      </div>
      <div class="sp-grid" id="sp-grid-init-cuad">
        ${ESPECIES.map((sp) => `<div class="sp-chip" data-id="${sp.id}" onclick="selectSingleSpChip(this,'sp-grid-init-cuad')">
          <div class="sp-chip-name">${sp.com}</div>
          <div class="sp-chip-sci">${sp.sci}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn b-teal" style="flex:1" onclick="confirmInitCuadEspecie()">Confirmar especie</button>
        <button class="btn b-out" style="flex:1" onclick="cancelInitCuadEspecie()">Cancelar</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:12px">
      <div style="flex:1"></div>
      <button class="btn b-teal" onclick="crearCuadrantesMasivo('${opId}','${boteId}',${nextNum})">Crear</button>
      <button class="btn b-out" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'wide');
  }

  /**
   * Handler del combo de área en el modal de creación masiva de cuadrantes.
   * Muestra el input manual cuando se elige “Otro...”.
   */
  window.onInitCuadAreaChange = function onInitCuadAreaChange(val) {
    const manual = document.getElementById('cuad-area-manual');
    if (!manual) return;
    if (val === 'custom') {
      manual.style.display = '';
      manual.focus();
    } else {
      manual.style.display = 'none';
      manual.value = val;
    }
  };

  /**
   * Abre el panel de selección (una sola especie) para la creación masiva de cuadrantes.
   */
  window.openInitCuadEspecie = function openInitCuadEspecie() {
    const panel = document.getElementById('init-cuad-sp-panel');
    const grid = document.getElementById('sp-grid-init-cuad');
    const curId = parseInt(document.getElementById('cuad-esp-id')?.value);
    if (!panel || !grid) return;
    grid.querySelectorAll('.sp-chip').forEach((chip) => {
      const id = parseInt(chip.dataset.id);
      chip.classList.toggle('sel', curId && id === curId);
      chip.style.display = '';
    });
    panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /**
   * Cierra el panel de selección de especie (cuadrantes masivo) y limpia el filtro.
   */
  window.cancelInitCuadEspecie = function cancelInitCuadEspecie() {
    const panel = document.getElementById('init-cuad-sp-panel');
    const search = panel?.querySelector('input.flt');
    if (panel) panel.style.display = 'none';
    if (search) search.value = '';
    filterSpGrid('', 'sp-grid-init-cuad');
  };

  /**
   * Confirma la especie seleccionada para cuadrantes masivos y la vuelca al input del modal.
   */
  window.confirmInitCuadEspecie = function confirmInitCuadEspecie() {
    const sel = document.querySelector('#sp-grid-init-cuad .sp-chip.sel');
    const id = parseInt(sel?.dataset?.id);
    if (!id || isNaN(id)) { toast('Selecciona una especie', 'red'); return; }
    const sp = ESPECIES.find((e) => e.id == id);
    const idEl = document.getElementById('cuad-esp-id');
    const inp = document.getElementById('cuad-esp');
    if (idEl) idEl.value = String(id);
    if (inp) inp.value = sp?.com || '';
    cancelInitCuadEspecie();
  };

  /**
   * Crea N cuadrantes con la configuración del modal (área/sustrato/especie) y conteo inicial 0.
   * Asigna números consecutivos evitando colisiones con unidades existentes.
   */
  window.crearCuadrantesMasivo = function crearCuadrantesMasivo(opId, boteId, nextNumBase = 1) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    if (!b) return;
    const fecha = new Date().toISOString().slice(0, 10);
    const cantidad = parseInt(document.getElementById('cuad-n')?.value);
    if (!cantidad || isNaN(cantidad) || cantidad <= 0) { toast('Cantidad inválida', 'red'); return; }
    const areaSel = document.getElementById('cuad-area')?.value;
    const areaManual = parseFloat(document.getElementById('cuad-area-manual')?.value);
    const area = areaSel === 'custom' ? areaManual : parseFloat(areaSel);
    if (isNaN(area) || area <= 0) { toast('Área inválida', 'red'); return; }
    const sustrato = document.getElementById('cuad-s')?.value || '';
    const spId = parseInt(document.getElementById('cuad-esp-id')?.value);
    if (!spId || isNaN(spId)) { toast('Selecciona una especie', 'red'); return; }
    const existingNums = new Set((b.transectos || []).map((t) => parseInt(t.num)));
    let num = Math.max(nextNumBase, getNextUnidadNum(b));
    let created = 0;
    while (created < cantidad) {
      while (existingNums.has(num)) num++;
      existingNums.add(num);
      b.transectos.push({
        num,
        tipo: 'cuadrante',
        area,
        fecha,
        sustrato,
        cubierta: '',
        counts: { [spId]: 0 },
        especieId: spId
      });
      created++;
      num++;
    }
    closeMo();
    toast(`${created} cuadrante(s) creado(s)`, 'green');
    aplicarFiltros();
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
        sel.innerHTML = `<option value="120" selected>120 m²</option><option value="60">60 m²</option><option value="20">20 m²</option><option value="30">30 m²</option><option value="50">50 m²</option><option value="custom">Ingresar manualmente...</option>`;
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
    const fecha = new Date().toISOString().slice(0, 10);
    const sustrato = document.getElementById('tx-s')?.value;
    const cubierta = document.getElementById('tx-c')?.value;
    const esCuad = tipo === 'cuadrante';
    b.transectos.push({ num, tipo, area, fecha, sustrato, cubierta, counts: {}, ...(esCuad ? { especieId: null } : {}) });
    closeMo();
    toast(`${esCuad ? 'Cuadrante' : 'Transecto'} ${num} creado (${area} m²). ${esCuad ? 'Selecciona la especie contada.' : 'Agrega las especies contadas.'}`, 'green');
    setTimeout(() => openAddEspTx(opId, boteId, num), 200);
  };

  /** Abre modal para seleccionar especies contadas en una unidad de densidad. */
  window.openAddEspTx = function openAddEspTx(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    const esCuadLocal = t?.tipo === 'cuadrante';
    const ya = esCuadLocal
      ? (t?.especieId ? [parseInt(t.especieId)] : (Object.keys(t?.counts || {})[0] ? [parseInt(Object.keys(t.counts)[0])] : []))
      : Object.keys(t?.counts || {}).map(Number);
    const onClickFn = esCuadLocal ? `selectSingleSpChip(this,'sp-grid-tx')` : `toggleSpChip(this)`;
    openMo(`${esCuadLocal ? 'Cuadrante' : 'Transecto'} — ${esCuadLocal ? 'Cambiar especie' : 'Agregar especies'} ${esCuadLocal ? 'C' : 'T'}${txNum} · ${b?.nombre}`, `
    <div class="info-box purple" style="margin-bottom:13px"><span>i</span><div>${esCuadLocal ? 'En cuadrantes solo puedes registrar una especie. Selecciona la especie contada.' : 'Selecciona las especies contadas en esta unidad. Podrás ingresar el número de individuos observados directamente.'}</div></div>
    <div style="margin-bottom:11px"><input class="flt" style="width:100%" placeholder="Buscar especie..." oninput="filterSpGrid(this.value,'sp-grid-tx')"></div>
    <div class="sp-grid" id="sp-grid-tx">
      ${ESPECIES.map((sp) => `<div class="sp-chip ${ya.includes(sp.id) ? 'sel' : ''}" data-id="${sp.id}" onclick="${onClickFn}">
        <div class="sp-chip-name">${sp.com}</div>
        <div class="sp-chip-sci">${sp.sci}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="confirmarEspTx('${opId}','${boteId}',${txNum})">${esCuadLocal ? 'Confirmar especie' : 'Confirmar especies'}</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
  `, 'wide');
  };
  /**
   * Abre un modal de edición rápida de una unidad (transecto/cuadrante).
   * Actualmente permite modificar el área.
   */
  window.openEditTx = function openEditTx(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (!t) return;
    openMo(`${t.tipo === 'cuadrante' ? 'Cuadrante' : 'Transecto'} — Editar C/T${txNum} · ${b?.nombre}`, `
    <div class="ig"><label class="il">Área (m²)</label><input class="ii" id="ed-a" type="number" step="0.0001" min="0.0001" value="${t.area}"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn b-teal" style="flex:1" onclick="saveEditTx('${opId}','${boteId}',${txNum})">Guardar</button>
      <button class="btn b-out" style="flex:1" onclick="closeMo()">Cancelar</button>
    </div>
    `, 'slim');
  };
  /**
   * Guarda cambios de la unidad editada (área) y refresca la UI.
   */
  window.saveEditTx = function saveEditTx(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (!t) return;
    const area = parseFloat(document.getElementById('ed-a')?.value);
    if (isNaN(area) || area <= 0) { toast('Ingresa un área válida', 'red'); return; }
    t.area = area;
    closeMo();
    toast(`Unidad actualizada: área`, 'green');
    aplicarFiltros();
    setTimeout(() => { const body = document.getElementById(`tx_${opId}_${boteId}_${txNum}`); if (body) body.classList.add('open'); }, 100);
  };

  /** Confirma especies seleccionadas para densidad e inicializa sus conteos en 0. */
  window.confirmarEspTx = function confirmarEspTx(opId, boteId, txNum) {
    const sel = [...document.querySelectorAll('#sp-grid-tx .sp-chip.sel')].map((el) => parseInt(el.dataset.id));
    if (!sel.length) { toast('Selecciona al menos una especie', 'red'); return; }
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t?.tipo === 'cuadrante') {
      const spId = sel[0];
      const prevId = t.especieId ?? (Object.keys(t.counts || {})[0] ? parseInt(Object.keys(t.counts)[0]) : null);
      t.especieId = spId;
      t.counts = { [spId]: prevId === spId ? (t.counts?.[spId] ?? 0) : 0 };
    } else if (t) {
      sel.forEach((id) => { if (!(id in t.counts)) t.counts[id] = 0; });
    }
    closeMo();
    const finish = () => {
      toast(`${t?.tipo === 'cuadrante' ? 'Especie' : 'Especie(s)'} actualizada`, 'green');
      aplicarFiltros();
      setTimeout(() => { const body = document.getElementById(`tx_${opId}_${boteId}_${txNum}`); if (body) body.classList.add('open'); }, 100);
    };
    const hasOtherBotes = (op?.botes || []).some((bb) => bb?.id && bb.id !== boteId);
    if (!t || !hasOtherBotes) { finish(); return; }
    openMo('Replicar especies', `
      <div class="info-box blue" style="margin-bottom:13px"><span>i</span>
        <div>¿Quieres replicar esta selección de ${t.tipo === 'cuadrante' ? 'especie' : 'especies'} al resto de botes (misma unidad ${t.tipo === 'cuadrante' ? 'C' : 'T'}${txNum})?</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn b-teal" style="flex:1" onclick="replicarEspTx('${opId}','${boteId}',${txNum});closeMo()">Sí, replicar</button>
        <button class="btn b-out" style="flex:1" onclick="window.__REPL_FINISH__?.();window.__REPL_FINISH__=null;closeMo()">No</button>
      </div>
    `, 'slim');
    window.__REPL_FINISH__ = finish;
  };

  window.replicarEspTx = function replicarEspTx(opId, boteId, txNum) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (!op || !t) return;
    const cloneBase = {
      num: t.num,
      tipo: t.tipo,
      area: t.area,
      fecha: t.fecha,
      sustrato: t.sustrato,
      cubierta: t.cubierta
    };
    const sel = t.tipo === 'cuadrante'
      ? [parseInt(t.especieId ?? Object.keys(t.counts || {})[0])]
      : Object.keys(t.counts || {}).map((k) => parseInt(k)).filter((x) => !isNaN(x));
    if (!sel.length || sel.some((x) => isNaN(x))) return;
    (op.botes || []).forEach((bb) => {
      if (!bb || bb.id === boteId) return;
      if (!Array.isArray(bb.transectos)) bb.transectos = [];
      let t2 = bb.transectos.find((x) => x.num === txNum && x.tipo === t.tipo);
      if (!t2) {
        t2 = { ...cloneBase, counts: {}, ...(t.tipo === 'cuadrante' ? { especieId: null } : {}) };
        bb.transectos.push(t2);
      }
      if (t.tipo === 'cuadrante') {
        const spId = sel[0];
        const prevId = t2.especieId ?? (Object.keys(t2.counts || {})[0] ? parseInt(Object.keys(t2.counts)[0]) : null);
        t2.especieId = spId;
        t2.counts = { [spId]: prevId === spId ? (t2.counts?.[spId] ?? 0) : 0 };
      } else {
        if (!t2.counts) t2.counts = {};
        sel.forEach((id) => { if (!(id in t2.counts)) t2.counts[id] = 0; });
      }
    });
    window.__REPL_FINISH__?.();
    window.__REPL_FINISH__ = null;
  };

  /** Quita una especie del conteo de un transecto/cuadrante. */
  window.removeSpFromTx = function removeSpFromTx(opId, boteId, txNum, spId) {
    const op = DB.operaciones.find((o) => o.id === opId);
    const b = op?.botes.find((b) => b.id === boteId);
    const t = b?.transectos.find((t) => t.num === txNum);
    if (t?.tipo === 'cuadrante') {
      t.especieId = null;
      t.counts = {};
      toast(`Especie eliminada`, 'green');
    } else if (t) {
      delete t.counts[spId];
      const sp = ESPECIES.find((e) => e.id == spId);
      toast(`${sp?.com} eliminado`, 'green');
    }
    aplicarFiltros();
  };

  /** Abre modal de “subida de Excel” (simulada) para L-P. */
  window.openUploadExcel = function openUploadExcel() {
    openMo('Subir EVADIR (Excel)', `
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

  function getTxCoordValue(t, key) {
    if (!t) return '';
    const map = {
      x: ['coordX', 'x'],
      y: ['coordY', 'y'],
      lon: ['coordLong', 'lon'],
      lat: ['coordLat', 'lat']
    };
    const candidates = map[key] || [];
    for (const k of candidates) {
      const v = t[k];
      if (v === null || v === undefined) continue;
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      const s = String(v).trim();
      if (s !== '') return s;
    }
    return '';
  }

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
          x: getTxCoordValue(t, 'x'),
          y: getTxCoordValue(t, 'y'),
          lon: getTxCoordValue(t, 'lon'),
          lat: getTxCoordValue(t, 'lat'),
          datum: String(t.datum || 'WGS 84'),
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
        const toKey = (m) => (m && m.p !== undefined && m.p !== null && m.p !== '');
        const muestrasPeso = (muestras || []).filter(toKey);
        const muestrasSoloLong = (muestras || []).filter((m) => !toKey(m));

        const buildRows = (arr, includePeso) => arr.map((m, i) => `<tr style="${i % 2 === 0 ? '' : 'background:var(--bg)'}">
        <td>${op.region}</td><td>${op.sector}</td><td>${op.tipoOrg}</td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${op.org}</td>
        <td>${op.fechaInicio}</td>
        <td>${op.fechaInicio.slice(8, 10)}</td><td>${op.fechaInicio.slice(5, 7)}</td><td>${op.fechaInicio.slice(0, 4)}</td>
        <td>${op.numSeg}</td><td>${b.zona}</td><td>${b.nombre}</td><td>${b.buzo}</td>
        <td><em>${sp?.sci || '?'}</em></td>
        <td style="font-family:var(--ff-m);text-align:center;font-weight:700">${m.l ?? m.d ?? '—'}</td>
        ${includePeso ? `<td style="font-family:var(--ff-m);text-align:center">${m.p ?? '—'}</td>` : ''}
      </tr>`).join('');

        if (muestrasSoloLong.length) {
          const _idx = lpSections.length;
          lpSections.push({ sp, bote: b.nombre, zona: b.zona, rows: buildRows(muestrasSoloLong, false), n: muestrasSoloLong.length, hasPeso: false, _idx });
        }
        if (muestrasPeso.length) {
          const _idx = lpSections.length;
          lpSections.push({ sp, bote: b.nombre, zona: b.zona, rows: buildRows(muestrasPeso, true), n: muestrasPeso.length, hasPeso: true, _idx });
        }
      });
    });

    const lpLongSections = lpSections.filter((s) => !s.hasPeso);
    const lpPesoLongSections = lpSections.filter((s) => s.hasPeso);

    const lpTabsHTML = (sections) => sections.map((s) => `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div>
          <span style="font-weight:700;font-size:13px;color:var(--navy)">${s.sp?.com || '?'}</span>
          <em style="font-size:11px;color:var(--text3);margin-left:6px">${s.sp?.sci || ''}</em>
          <span class="pill p-teal" style="margin-left:6px">Bote ${s.bote} · Zona ${s.zona}</span>
          <span class="pill ${s.hasPeso ? 'p-amb' : 'p-slt'}">${s.hasPeso ? 'Peso-Longitud' : 'Longitud'}</span>
          <span class="pill p-amb">${s.n} muestras</span>
        </div>
      </div>
      <div style="overflow-x:auto;max-height:180px">
        <table class="ev-tbl">
          <thead><tr><th>REGION</th><th>SECTOR</th><th>TIPO ORG</th><th>ORGANIZACIÓN</th><th>FECHA</th><th>DIA</th><th>MES</th><th>AÑO</th><th>SEG</th><th>ZONA</th><th>BOTE</th><th>BUZO</th><th>ESPECIE</th><th>LONG. (mm)</th>${s.hasPeso ? '<th>PESO (g)</th>' : ''}</tr></thead>
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
          <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">Tabla EVADIR</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${hasTxRows ? `<span class="pill p-blu" style="margin-right:4px">${densRowsTx.length} transecto(s)</span>` : ''}
            ${hasCuadRows ? `<span class="pill p-pur">${densRowsCuad.length} cuadrante(s)</span>` : ''}
          </div>
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
                ${allSpIds.map((id) => `<td style="font-family:var(--ff-m);font-weight:700;color:var(--teal);text-align:center">${((r.tipo === 'cuadrante' && isLugaId(id)) ? (Number(r.counts[id] ?? 0)) : ((Number(r.counts[id] ?? 0)) / r.area)).toFixed(4)}</td>`).join('')}
                <td style="font-size:10px">${r.x || ''}</td><td style="font-size:10px">${r.y || ''}</td>
                <td>${r.lon || ''}</td><td>${r.lat || ''}</td><td>${r.datum || 'WGS 84'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
    <div>
      ${lpSections.length === 0 ? `<div class="info-box amber"><span>i</span><div>No hay muestras de Longitud/Peso-Longitud en esta operación. Agrégalas desde la sección <strong>Operaciones</strong>.</div></div>` : `
      ${lpLongSections.length > 0 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">Tablas Longitud</div>
      </div>
      ${lpTabsHTML(lpLongSections)}
      ` : ''}

      ${lpLongSections.length > 0 && lpPesoLongSections.length > 0 ? `<div style="height:10px"></div>` : ''}

      ${lpPesoLongSections.length > 0 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;margin-top:6px">
        <div style="font-family:var(--ff-d);font-size:14px;font-weight:700;color:var(--navy)">Tablas PESO-LONGITUD</div>
      </div>
      ${lpTabsHTML(lpPesoLongSections)}
      ` : ''}
      `}
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
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
      const hdr = ['REGION', 'NOMBRE SECTOR', 'TIPO DE ORGANIZACIÓN', 'NOMBRE ORGANIZACIÓN', 'FECHA', 'DIA', 'MES', 'AÑO', 'NUM SEG ESBA', 'ZONA MUESTREO', 'BOTE', 'BUZO', numColName, areaColName, ...allSp.map((s) => `NUM ${s.com.toUpperCase()}`), 'TIPO SUSTRATO', 'CUBIERTA BIOLOGICA', ...allSp.map((s) => `DENS ${s.com.toUpperCase()} (VAL/M2)`), 'X', 'Y', 'LONG', 'LAT', 'DATUM'];
      if (mixedTypes) hdr.splice(0, 0, 'TIPO UNIDAD');
      let rows = '';
      op.botes.forEach((b) => {
        b.transectos.forEach((t) => {
          const esCuad = t.tipo === 'cuadrante';
          const tipoCell = mixedTypes ? `<td style="background:${esCuad ? '#ede9fe' : '#dbeafe'};color:${esCuad ? '#7c3aed' : '#1d6fa4'};font-weight:700">${esCuad ? 'Cuadrante' : 'Transecto'}</td>` : '';
          rows += `<tr>${tipoCell}<td>${op.region}</td><td>${op.sector}</td><td>${op.tipoOrg}</td><td>${op.org}</td><td>${t.fecha}</td><td>${t.fecha.slice(8, 10)}</td><td>${t.fecha.slice(5, 7)}</td><td>${t.fecha.slice(0, 4)}</td><td>${op.numSeg}</td><td>${b.zona}</td><td>${b.nombre}</td><td>${b.buzo}</td><td style="font-weight:700;color:${esCuad ? '#7c3aed' : '#1d6fa4'}">${t.num}</td><td>${t.area}</td>
        ${allSpIds.map((id) => `<td style="text-align:center">${t.counts[id] ?? 0}</td>`).join('')}
        <td>${t.sustrato}</td><td>${t.cubierta}</td>
        ${allSpIds.map((id) => `<td style="text-align:center;font-weight:700;color:#0a8f7e">${((t.tipo === 'cuadrante' && isLugaId(id)) ? (Number(t.counts[id] ?? 0)) : ((Number(t.counts[id] ?? 0)) / t.area)).toFixed(4)}</td>`).join('')}
        <td>${getTxCoordValue(t, 'x')}</td><td>${getTxCoordValue(t, 'y')}</td><td>${getTxCoordValue(t, 'lon')}</td><td>${getTxCoordValue(t, 'lat')}</td><td>${t.datum || 'WGS 84'}</td></tr>`;
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
