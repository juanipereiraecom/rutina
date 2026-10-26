'use strict';
(() => {
const VERSION = '2.0.1';
const KEY = 'rutina.v1';
const { uid, PICS, ICONS, TEMPLATES, THEMES, AI_PROMPT } = window.RA;
const RP = window.RutinaParser;

/* ═══════════════ Fechas (siempre la fecha local del teléfono) ═══════════════ */
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAYS_ABBR = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const DAYS_1 = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MON3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const todayKey = () => keyOf(new Date());
const dayIdx = k => (parseKey(k).getDay() + 6) % 7;
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const weekStart = k => addDays(k, -dayIdx(k));
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const fmtLong = k => { const d = parseKey(k); return `${DAYS[dayIdx(k)]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
const fmtShort = k => { const d = parseKey(k); return `${d.getDate()} ${MON3[d.getMonth()]}`; };
const fmtDayShort = k => `${DAYS_ABBR[dayIdx(k)]} ${parseKey(k).getDate()} ${MON3[parseKey(k).getMonth()]}`;
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* ═══════════════ Utilidades ═══════════════ */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { if (v === null || v === undefined) return null; const s = String(v).trim().replace(',', '.'); if (s === '') return null; const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
const round = n => Math.round(n * 100) / 100;
const fk = n => n === null || n === undefined || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const repsText = e => e.rmax === 0 ? 'al fallo' : (e.rmin === e.rmax ? `${e.rmin}` : `${e.rmin}–${e.rmax}`) + (e.unit === 's' ? ' s' : '');
const setsText = e => `${e.sets} × ${repsText(e)}`;
const pic = (key, size = 40) => `<svg class="pic" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${(PICS[key] || PICS.generic)[1]}</svg>`;
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const blankPlan = () => DAYS.map(() => ({ title: 'Descanso', sub: '', type: 'rest', exercises: [] }));

/* ═══════════════ Estado y persistencia ═══════════════ */
const DEFAULT_SETTINGS = { goal: null, side: null, step: 2.5, lastBackup: null, hideInstall: false, wake: true, theme: 'brasa', mode: 'auto' };
function freshState() { return { v: 2, created: todayKey(), onboarded: false, settings: { ...DEFAULT_SETTINGS }, plan: blankPlan(), sessions: [] }; }
let S;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.plan) && s.plan.length === 7 && Array.isArray(s.sessions)) return migrate(s);
    }
  } catch (e) { console.warn(e); }
  return freshState();
}
function migrate(s) {
  s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
  s.created = s.created || todayKey();
  if (s.onboarded === undefined) s.onboarded = true; // quienes ya usaban la app no ven la bienvenida
  const fix = x => { if (!x.unit) x.unit = 'reps'; if (x.rmin == null) x.rmin = 8; if (x.rmax == null) x.rmax = x.rmin; };
  s.plan.forEach(d => d.exercises.forEach(fix));
  s.sessions.forEach(ss => (ss.items || []).forEach(fix));
  s.v = 2;
  return s;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No se pudo guardar: memoria llena. Exportá una copia.'); }
}
let saveT;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };

/* Fotos en IndexedDB */
const db = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('rutina', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => open().then(d => new Promise((res, rej) => {
    const t = d.transaction('photos', mode); const req = fn(t.objectStore('photos'));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
  }));
  return {
    get: id => run('readonly', s => s.get(id)),
    put: (id, b) => run('readwrite', s => s.put(b, id)),
    del: id => run('readwrite', s => s.delete(id)),
    keys: () => run('readonly', s => s.getAllKeys()),
    clear: () => run('readwrite', s => s.clear()),
  };
})();
const photoURLs = new Map();
async function photoURL(id) {
  if (photoURLs.has(id)) return photoURLs.get(id);
  const b = await db.get(id).catch(() => null);
  if (!b) return null;
  const u = URL.createObjectURL(b); photoURLs.set(id, u); return u;
}
function hydratePhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach(async img => {
    const u = await photoURL(img.dataset.photo);
    if (u) img.src = u;
    else img.replaceWith(document.createRange().createContextualFragment(pic(img.dataset.fallback || 'generic', +img.dataset.size || 40)));
  });
}
async function resizeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const max = 900, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}
function usedPhotoIds() {
  const set = new Set();
  S.plan.forEach(d => d.exercises.forEach(e => e.photo && set.add(e.photo)));
  S.sessions.forEach(s => (s.items || []).forEach(i => i.photo && set.add(i.photo)));
  return set;
}
async function gcPhotos(keep) {
  try {
    const used = usedPhotoIds(); if (keep) used.add(keep);
    for (const k of await db.keys()) if (!used.has(k)) { await db.del(k); photoURLs.delete(k); }
  } catch (e) { /* sin fotos */ }
}

/* ═══════════════ Tema y apariencia ═══════════════ */
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const st = S.settings, html = document.documentElement;
  const dark = st.mode === 'dark' || (st.mode === 'auto' && mq && mq.matches);
  html.setAttribute('data-theme', st.theme || 'brasa');
  html.setAttribute('data-mode', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(html).getPropertyValue('--bg').trim() || (dark ? '#0C0C0B' : '#F2F2EF'));
}
if (mq) { const f = () => { if (S && S.settings.mode === 'auto') applyTheme(); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }

/* ═══════════════ Consultas ═══════════════ */
const trainDays = () => S.plan.filter(d => d.type === 'train' && d.exercises.length).length;
const goal = () => S.settings.goal || Math.max(1, trainDays() || S.plan.filter(d => d.type === 'train').length);
const finished = () => S.sessions.filter(s => s.finishedAt);
let ddCache = null;
function doneDates() { if (ddCache) return ddCache; const set = new Set(); finished().forEach(s => set.add(s.date)); return (ddCache = set); }
const invalidate = () => { ddCache = null; };
function findEx(id) {
  for (let d = 0; d < 7; d++) { const e = S.plan[d].exercises.find(x => x.id === id); if (e) return { ex: e, day: d }; }
  return null;
}
function itemsOf(s) { return s.items.map(snap => { const f = findEx(snap.id); return f ? Object.assign({}, snap, f.ex) : snap; }); }
const hasW = e => !!e && (e.w != null || e.wL != null || e.wR != null);
function sortedSessions() {
  return [...S.sessions].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || a.updatedAt || 0) - (b.finishedAt || b.updatedAt || 0));
}
function lastEntry(id, cur) {
  const list = sortedSessions().reverse();
  for (const s of list) {
    if (s === cur) continue;
    if (cur && s.date > cur.date) continue;
    const e = s.entries[id];
    if (e && e.done && hasW(e)) return { e, date: s.date };
  }
  return null;
}
function history(id) {
  return sortedSessions().filter(s => s.finishedAt && s.entries[id] && s.entries[id].done && hasW(s.entries[id])).map(s => ({ date: s.date, e: s.entries[id] }));
}
const metric = e => e.w != null ? e.w : Math.max(e.wL != null ? e.wL : -Infinity, e.wR != null ? e.wR : -Infinity);
function weekCount(ws) { const dd = doneDates(); let n = 0; for (let i = 0; i < 7; i++) if (dd.has(addDays(ws, i))) n++; return n; }
function streakInfo() {
  const g = goal(), t = todayKey(), first = weekStart(S.created);
  let w = weekStart(t), cur = 0;
  if (weekCount(w) >= g) cur++;
  w = addDays(w, -7);
  while (w >= first && weekCount(w) >= g) { cur++; w = addDays(w, -7); }
  let best = 0, run = 0;
  for (let x = first; x <= weekStart(t); x = addDays(x, 7)) { if (weekCount(x) >= g) { run++; best = Math.max(best, run); } else if (x !== weekStart(t)) run = 0; }
  return { cur, best: Math.max(best, cur) };
}
function isMissed(k) {
  const d = S.plan[dayIdx(k)];
  return k < todayKey() && k >= S.created && d.type === 'train' && d.exercises.length > 0 && !doneDates().has(k);
}
function consistency() {
  const t = todayKey(), g = goal(), dd = doneDates(); let ok = 0, den = 0;
  for (let i = 0; i < 4; i++) {
    const ws = addDays(weekStart(t), -7 * i);
    let expected = 0;
    for (let j = 0; j < 7; j++) { const k = addDays(ws, j); const d = S.plan[j]; if ((k < t || (k === t && dd.has(k))) && k >= S.created && d.type === 'train' && d.exercises.length) expected++; }
    expected = Math.min(expected, g);
    if (!expected) continue;
    den += expected; ok += Math.min(weekCount(ws), expected);
  }
  return den ? Math.round(ok / den * 100) : null;
}
const sessionsOn = k => S.sessions.filter(s => s.date === k);
const weeksSinceStart = () => Math.floor(daysBetween(weekStart(S.created), weekStart(todayKey())) / 7) + 1;
const sideTag = side => S.settings.side === side ? '<span class="tag">LESIÓN</span>' : '';
const anyDone = s => Object.values(s.entries).some(e => e.done || e.skip);

function tidySessions() {
  const t = todayKey(); let changed = false;
  S.sessions = S.sessions.filter(s => {
    if (s.finishedAt) return true;
    const any = Object.values(s.entries).some(e => e.done);
    if (!any && s.date < t) { changed = true; return false; }
    if (any && s.date < t) { s.finishedAt = s.updatedAt || Date.now(); changed = true; }
    return true;
  });
  if (changed) { invalidate(); save(); }
}

/* ═══════════════ Interfaz: navegación, avisos, hojas ═══════════════ */
const UI = { tab: 'hoy', stack: [], sheet: null, expanded: null, editDay: null, calMonth: null, nav: false, fresh: null, justDone: null, countUp: false, importText: '', aiText: '' };
const $ = id => document.getElementById(id);
const top = () => UI.stack[UI.stack.length - 1];
function go(screen) { UI.stack.push(screen); UI.nav = true; render(); }
function back() {
  const s = top();
  if (s && s.type === 'workout') { dropIfEmpty(s.sid); UI.expanded = null; releaseWake(); }
  UI.stack.pop(); UI.nav = true; render();
}
function dropIfEmpty(sid) {
  const s = S.sessions.find(x => x.id === sid);
  if (s && !s.finishedAt && !anyDone(s)) { S.sessions = S.sessions.filter(x => x !== s); save(); }
}
function setTab(t) { UI.tab = t; UI.stack = []; UI.nav = true; UI.countUp = t === 'progreso'; render(); }

let toastT;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

let sheetGen = 0;
function openSheet(s) { sheetGen++; UI.sheet = s; drawSheet(true); document.body.classList.add('locked'); }
function closeSheet() {
  if (!UI.sheet) return;
  UI.sheet = null; const g = ++sheetGen, root = $('sheet');
  root.querySelectorAll('.backdrop,.sheet').forEach(el => el.classList.add('closing'));
  document.body.classList.remove('locked');
  setTimeout(() => { if (g === sheetGen) root.innerHTML = ''; }, 230);
}
function drawSheet(first) {
  const s = UI.sheet; if (!s) return;
  const old = $('sheet').querySelector('.sheet:not(.closing)'), sy = old ? old.scrollTop : 0;
  $('sheet').innerHTML = `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(s.label || '')}"><div class="grab"></div>${SHEETS[s.type](s)}</div>`;
  const nw = $('sheet').querySelector('.sheet');
  if (!first) { nw.style.animation = 'none'; $('sheet').querySelector('.backdrop').style.animation = 'none'; }
  nw.scrollTop = sy;
  hydratePhotos($('sheet'));
}
const sheetHead = title => `<div class="sheet-h"><h2>${title}</h2><button class="icon-btn" data-a="closeSheet" aria-label="Cerrar">${ic('close')}</button></div>`;

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove(); return ok;
  }
}
async function readClipboard() {
  try { return await navigator.clipboard.readText(); } catch (e) { return null; }
}
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/* ═══════════════ Render ═══════════════ */
function render() {
  const t = top();
  const onboarding = !S.onboarded;
  const y = window.scrollY;
  let html;
  if (t) html = SCREENS[t.type](t);
  else if (onboarding) html = screenWelcome({ type: 'welcome', first: true });
  else html = TABS[UI.tab]();
  $('view').innerHTML = html;
  const tabsHidden = !!t || onboarding;
  $('tabbar').hidden = tabsHidden;
  document.body.classList.toggle('no-tabs', tabsHidden);
  if (!tabsHidden) {
    $('tabbar').innerHTML = [['hoy', 'Hoy', 'today'], ['progreso', 'Progreso', 'chart'], ['rutina', 'Rutina', 'list']]
      .map(([k, l, i]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}" ${UI.tab === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('');
  }
  renderBottom(t);
  const v = $('view');
  if (UI.nav) {
    UI.nav = false; window.scrollTo(0, 0);
    v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  } else { v.classList.remove('enter'); window.scrollTo(0, y); }
  if (UI.countUp) { UI.countUp = false; countUp(v); }
  UI.fresh = null; UI.justDone = null;
  hydratePhotos(v);
  syncWake();
}
function countUp(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count; if (!end || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(), dur = 700;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e); if (p < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  });
}
function renderBottom(t) {
  let html = '';
  if (t && t.type === 'workout') {
    const s = S.sessions.find(x => x.id === t.sid);
    if (s) {
      const items = itemsOf(s), d = items.filter(i => s.entries[i.id] && s.entries[i.id].done).length;
      const allHandled = items.every(i => s.entries[i.id] && (s.entries[i.id].done || s.entries[i.id].skip));
      html = s.finishedAt
        ? `<button class="btn btn-ink btn-lg btn-block" data-a="back">Listo</button>`
        : `<button class="btn ${allHandled && d ? 'btn-accent' : 'btn-ink'} btn-lg btn-block" data-a="finish" ${d ? '' : 'disabled'}>Terminar entrenamiento</button>`;
    }
  } else if (t && (t.type === 'import' || t.type === 'ai')) {
    html = `<button class="btn btn-ink btn-lg btn-block" data-a="parse" data-src="${t.type}">${ic('spark')} Leer rutina</button>`;
  } else if (t && t.type === 'preview') {
    const n = t.days.reduce((a, d) => a + d.exercises.length, 0);
    html = `<button class="btn btn-accent btn-lg btn-block" data-a="applyPlan" ${n ? '' : 'disabled'}>Usar esta rutina</button>`;
  } else if (t && t.type === 'scratch') {
    html = `<button class="btn btn-ink btn-lg btn-block" data-a="createScratch" ${t.sel.length ? '' : 'disabled'}>Crear mi semana</button>`;
  }
  $('bbar').innerHTML = html ? `<div class="in">${html}</div>` : '';
  document.body.classList.toggle('has-bbar', !!html);
}
function thumb(e, cls = '', size = 40) {
  const z = cls === 'lg' ? 56 : cls === 'sm' ? 30 : size;
  return `<div class="thumb ${cls}">${e.photo ? `<img data-photo="${esc(e.photo)}" data-fallback="${esc(e.icon)}" data-size="${z}" alt="">` : pic(e.icon, z)}</div>`;
}
const backBtn = (a = 'back') => `<button class="icon-btn" data-a="${a}" aria-label="Volver">${ic('back')}</button>`;

/* ═══════════════ Bienvenida y cambio de rutina ═══════════════ */
function screenWelcome(sc) {
  const first = !!sc.first;
  const install = first && isIOS() && !isStandalone()
    ? `<button class="notice" data-a="installHelp" style="margin-top:18px"><span class="ico">${ic('share')}</span><span class="grow">Primero, instalala en tu pantalla de inicio para usarla sin internet</span>${ic('next', 'sm')}</button>` : '';
  return `${first ? '' : `<div class="top">${backBtn()}</div>`}
  <div class="hello">
    ${first ? `<div class="mark"><svg class="i lg" viewBox="0 0 24 24" style="color:var(--accent);stroke-width:2.4" aria-hidden="true">${ICONS.bar}</svg></div><div class="eyebrow">Bienvenido/a</div><h1>Tu rutina,<br>siempre a mano.</h1>
      <p class="sub" style="font-size:15px;margin-top:12px">Registrá tus pesos entre series, mirá tu constancia y cómo progresás. Funciona sin internet y tus datos quedan solo en tu teléfono.</p>`
      : `<div class="eyebrow">Tu historial se mantiene</div><h1 class="md">Cambiar rutina</h1><p class="sub">Elegí de dónde sale tu nueva rutina. Tus registros y estadísticas anteriores no se borran.</p>`}
  </div>
  ${install}
  <div class="stack stagger" style="margin-top:22px">
    <button class="opt primary" data-a="goImport"><span class="ico">${ic('paste')}</span><span class="grow"><span class="t">Importar mi rutina</span><span class="d">Pegá tu rutina escrita (de WhatsApp, Notas, un PDF) y se arma sola</span></span>${ic('next', 'sm')}</button>
    <button class="opt" data-a="goTemplates"><span class="ico">${ic('layers')}</span><span class="grow"><span class="t">Elegir una rutina armada</span><span class="d">Plantillas listas para empezar hoy y editar a tu gusto</span></span>${ic('next', 'sm')}</button>
    <button class="opt" data-a="goScratch"><span class="ico">${ic('pencil')}</span><span class="grow"><span class="t">Empezar de cero</span><span class="d">Elegí tus días y cargá tus ejercicios a mano</span></span>${ic('next', 'sm')}</button>
  </div>
  ${first ? `<div style="text-align:center;margin-top:18px"><label class="textlink" style="cursor:pointer;position:relative">¿Tenés una copia de seguridad? Restaurala<input type="file" accept="application/json,.json" data-ch="import" style="position:absolute;inset:0;opacity:0"></label></div>` : ''}`;
}
function screenTemplates() {
  const cards = TEMPLATES.map(t => {
    const plan = t.plan();
    const n = plan.reduce((a, d) => a + d.exercises.length, 0);
    const wk = plan.map((d, i) => `<span class="${d.type === 'train' ? 'on' : d.type === 'optional' ? 'op' : ''}">${DAYS_1[i]}</span>`).join('');
    return `<button class="tpl" data-a="pickTemplate" data-id="${t.id}"><span class="row" style="justify-content:space-between;align-items:baseline"><span class="t">${esc(t.name)}</span><span class="tag soft">${esc(t.days)}</span></span>
      <span class="d">${esc(t.desc)}</span><span class="wk">${wk}</span><span class="meta" style="margin:0">${plural(n, 'ejercicio', 'ejercicios')} · ${plan.filter(d => d.exercises.length).map(d => esc(d.title)).join(' · ')}</span></button>`;
  }).join('');
  return `<div class="top">${backBtn()}</div>
  <div class="head"><h1 class="md">Rutinas armadas</h1><p class="sub">Tocá una para ver el detalle. Después podés cambiar ejercicios, días y series.</p></div>
  <div class="stack stagger">${cards}</div>`;
}
function screenScratch(sc) {
  const btns = DAYS_1.map((d, i) => `<button class="${sc.sel.includes(i) ? 'on' : ''}" data-a="toggleScratch" data-i="${i}" aria-pressed="${sc.sel.includes(i)}" aria-label="${DAYS[i]}">${d}</button>`).join('');
  return `<div class="top">${backBtn()}</div>
  <div class="head"><h1 class="md">Empezar de cero</h1><p class="sub">¿Qué días vas a entrenar? Después le cargás los ejercicios a cada uno.</p></div>
  <div class="daypick">${btns}</div>
  <p class="msg" style="text-align:center">${sc.sel.length ? `${plural(sc.sel.length, 'día', 'días')} por semana · ese va a ser tu objetivo semanal` : 'Elegí al menos un día'}</p>`;
}
function screenImport() {
  const canPaste = !!(navigator.clipboard && navigator.clipboard.readText);
  return `<div class="top">${backBtn()}</div>
  <div class="head"><h1 class="md">Importar rutina</h1><p class="sub">Pegá tu rutina tal como la tenés. La app detecta los días, los ejercicios, las series y las repeticiones.</p></div>
  <label class="sr" for="imptext">Texto de la rutina</label>
  <textarea id="imptext" class="inp big" data-in="importText" placeholder="Ejemplo:&#10;&#10;Lunes - Piernas&#10;Sentadilla 4x10&#10;Prensa 3x12&#10;Estocadas 3x12 por pierna&#10;&#10;Miércoles - Espalda&#10;Jalón al pecho 4x10&#10;Remo 3 series de 12" spellcheck="false" autocapitalize="sentences">${esc(UI.importText)}</textarea>
  <div class="row" style="gap:8px;margin-top:8px">
    ${canPaste ? `<button class="btn btn-soft grow" data-a="pasteInto" data-target="imptext">${ic('paste', 'sm')} Pegar</button>` : ''}
    <label class="btn btn-soft grow">${ic('file', 'sm')} Abrir archivo<input type="file" accept=".txt,.json,.md,text/plain,application/json" data-ch="importFile"></label>
    ${UI.importText ? `<button class="btn btn-soft" data-a="clearImport" aria-label="Borrar texto">${ic('close', 'sm')}</button>` : ''}
  </div>
  <div class="section card">
    <h2 style="font-size:15px">Para que se lea perfecto</h2>
    <ul class="hint" style="padding-left:18px;margin:8px 0 0;font-size:13px;line-height:1.6">
      <li>Un ejercicio por renglón.</li>
      <li>Series y reps como <b>4x10</b>, <b>3x8-12</b> o <b>3 series de 12</b>.</li>
      <li>Los días como <b>Lunes</b>, <b>Día 1</b> o el grupo muscular (<b>Piernas</b>).</li>
      <li>Si es de a una pierna, escribí <b>por pierna</b>.</li>
      <li>¿La tenés en foto? En la app Fotos, mantené apretado el texto de la imagen → <b>Copiar</b>, y pegalo acá.</li>
    </ul>
  </div>
  <button class="opt" data-a="goAI" style="margin-top:10px"><span class="ico">${ic('spark')}</span><span class="grow"><span class="t" style="font-size:16px">¿Está muy desordenada?</span><span class="d">Usá ChatGPT, Claude o Gemini para ordenarla. Te explico cómo en 3 pasos.</span></span>${ic('next', 'sm')}</button>`;
}
function screenAI() {
  const canPaste = !!(navigator.clipboard && navigator.clipboard.readText);
  return `<div class="top">${backBtn()}</div>
  <div class="head"><h1 class="md">Ordenarla con una IA</h1><p class="sub">Sirve para rutinas en foto, PDF o escritas de forma muy libre. Es gratis y tarda un minuto.</p></div>
  <ol class="steps">
    <li><div><b>Copiá estas instrucciones</b><div class="prompt">${esc(AI_PROMPT)}</div><button class="btn btn-ink btn-block" data-a="copyPrompt">${ic('copy', 'sm')} Copiar instrucciones</button></div></li>
    <li><div><b>Abrí una IA y pegalas en el chat.</b> Justo debajo, pegá tu rutina o adjuntá la foto, y enviá.
      <div class="grid3" style="margin-top:10px"><a class="btn btn-line btn-sm" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT</a><a class="btn btn-line btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude</a><a class="btn btn-line btn-sm" href="https://gemini.google.com/" target="_blank" rel="noopener">Gemini</a></div></div></li>
    <li><div><b>Copiá la respuesta de la IA, volvé y pegala acá:</b>
      <label class="sr" for="aitext">Respuesta de la IA</label>
      <textarea id="aitext" class="inp big" style="min-height:160px;margin-top:10px" data-in="aiText" placeholder="## Lunes | Piernas | ...&#10;- Sentadilla | 4x8-10" spellcheck="false">${esc(UI.aiText)}</textarea>
      ${canPaste ? `<button class="btn btn-soft btn-block" style="margin-top:8px" data-a="pasteInto" data-target="aitext">${ic('paste', 'sm')} Pegar respuesta</button>` : ''}</div></li>
  </ol>`;
}
function screenPreview(sc) {
  const total = sc.days.reduce((a, d) => a + d.exercises.length, 0);
  const tdays = sc.days.filter(d => d.exercises.length).length;
  const flagged = sc.days.reduce((a, d) => a + d.exercises.filter(e => e.flags && e.flags.length).length, 0);
  const days = sc.days.map((d, i) => {
    const sel = `<select data-ch="pvMove" data-i="${i}" aria-label="Mover a otro día">${DAYS.map((n, j) => `<option value="${j}" ${j === i ? 'selected' : ''}>${n.slice(0, 3)}</option>`).join('')}</select>`;
    if (!d.exercises.length) return `<div class="pv-day rest"><div class="pv-h"><span class="tag line" style="min-width:42px;text-align:center">${DAYS_ABBR[i].toUpperCase()}</span><span class="meta grow" style="margin:0">Descanso</span></div></div>`;
    const exs = d.exercises.map((e, j) => `<div class="pv-ex">${thumb(e, 'sm')}<span class="grow"><span class="ellipsis" style="display:block;font-weight:600;font-size:15px">${esc(e.name)}</span>
      <span class="meta" style="display:block">${setsText(e)}${e.uni ? ' · por pierna' : ''}${e.rest ? ` · desc. ${esc(e.rest)}` : ''}${e.flags && e.flags.length ? ' · <span class="tag soft">REVISAR</span>' : ''}</span></span>
      <button class="x" data-a="pvRemove" data-i="${i}" data-j="${j}" aria-label="Quitar ${esc(e.name)}">${ic('close', 'sm')}</button></div>`).join('');
    return `<div class="pv-day"><div class="pv-h">${sel}<label class="sr" for="pvt${i}">Nombre del día</label><input id="pvt${i}" value="${esc(d.title)}" data-in="pvTitle" data-i="${i}" maxlength="40">
      ${d.type === 'optional' ? '<span class="tag soft">OPCIONAL</span>' : ''}</div>${exs}</div>`;
  }).join('');
  const warn = sc.warnings && sc.warnings.length ? `<div class="warnbox" style="margin-bottom:10px"><b>${plural(sc.warnings.length, 'renglón no lo usé', 'renglones no los usé')}</b> (no parecían ejercicios):<ul>${sc.warnings.slice(0, 6).map(w => `<li>${esc(w)}</li>`).join('')}${sc.warnings.length > 6 ? '<li>…</li>' : ''}</ul></div>` : '';
  return `<div class="top">${backBtn()}</div>
  <div class="head"><div class="eyebrow">${sc.source === 'template' ? 'Rutina armada' : 'Así quedó'}</div><h1 class="md">${esc(sc.name || 'Tu rutina')}</h1>
  <p class="sub">${plural(tdays, 'día', 'días')} de entreno · ${plural(total, 'ejercicio', 'ejercicios')}. ${sc.source === 'template' ? 'Revisala y, si te sirve, usala. Después la podés editar.' : 'Revisá que esté bien: podés renombrar días, moverlos de día o quitar ejercicios. El resto se edita después en Rutina.'}</p></div>
  ${flagged ? `<div class="banner">${ic('info', 'sm')}<span>En ${plural(flagged, 'ejercicio', 'ejercicios')} no encontré series o repeticiones: puse <b>3 × 8–12</b>. Los marqué con <span class="tag soft">REVISAR</span>.</span></div>` : ''}
  ${warn}
  <div class="stack">${days}</div>`;
}

/* ═══════════════ Pestaña: Hoy ═══════════════ */
function tabHoy() {
  const t = todayKey(), di = dayIdx(t), day = S.plan[di], g = goal();
  const today = sessionsOn(t), fin = today.filter(s => s.finishedAt);
  const draft = today.find(s => !s.finishedAt && anyDone(s));
  let card;
  if (draft) {
    const items = itemsOf(draft), d = items.filter(i => draft.entries[i.id] && (draft.entries[i.id].done || draft.entries[i.id].skip)).length;
    card = `<div class="today"><div><div class="label">EN CURSO</div><div class="t">${esc(draft.title)}</div><div class="s">Vas ${d} de ${items.length} ejercicios</div></div>
      <button class="btn btn-main btn-lg btn-block" data-a="openSession" data-sid="${draft.id}">Continuar</button></div>`;
  } else if (fin.length) {
    const s = fin[fin.length - 1];
    const mins = s.startedAt && !s.backfill ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : null;
    card = `<div class="today calm"><div class="row"><div class="grow"><div class="label">HOY · COMPLETADO</div><div class="t">${esc(s.title)}</div>
      <div class="m">${mins ? `${mins} min · ` : ''}terminado ${fmtTime(s.finishedAt)}</div></div><div class="done-mark">${ic('check')}</div></div>
      <div class="grid2"><button class="btn btn-soft" data-a="openSession" data-sid="${s.id}">Ver registro</button><button class="btn btn-soft" data-a="pickRoutine">Entrenar otra</button></div></div>`;
  } else if (day.type === 'rest' || !day.exercises.length && day.type !== 'train') {
    card = `<div class="today calm"><div><div class="label">HOY · ${DAYS[di].toUpperCase()}</div><div class="t">Descanso</div><div class="s">Descansar también es parte del plan.</div></div>
      <button class="btn btn-soft btn-block" data-a="pickRoutine">Entrenar igual</button></div>`;
  } else if (!day.exercises.length) {
    card = `<div class="today calm"><div><div class="label">HOY · ${DAYS[di].toUpperCase()}</div><div class="t">${esc(day.title)}</div><div class="s">Todavía no cargaste ejercicios para este día.</div></div>
      <button class="btn btn-main btn-lg btn-block" data-a="editToday">${ic('plus', 'sm')} Cargar ejercicios</button></div>`;
  } else {
    const n = day.exercises.length;
    card = `<div class="today ${day.type === 'optional' ? 'optional' : ''}"><div><div class="label">HOY · ${DAYS[di].toUpperCase()}${day.type === 'optional' ? ' · OPCIONAL' : ''}</div>
      <div class="t">${esc(day.title)}</div>${day.sub ? `<div class="s">${esc(day.sub)}</div>` : ''}<div class="m">${plural(n, 'ejercicio', 'ejercicios')}</div></div>
      <button class="btn btn-main btn-lg btn-block" data-a="start" data-d="${di}">Empezar</button></div>`;
  }

  const ws = weekStart(t), count = weekCount(ws), st = streakInfo();
  const segs = Array.from({ length: Math.max(g, count) }, (_, i) => `<div class="seg ${i >= g ? 'extra' : ''}">${i < count ? '<i class="grow-x"></i>' : ''}</div>`).join('');
  const streakTxt = st.cur > 0
    ? `Racha: <b>${plural(st.cur, 'semana', 'semanas')}</b> cumpliendo tu objetivo`
    : count >= g ? '<b>Semana cumplida.</b>' : `Hacé <b>${g}</b> esta semana para arrancar tu racha`;
  const dd = doneDates();
  const rows = S.plan.map((d, i) => {
    const k = addDays(ws, i), isT = k === t, past = k < t;
    const sess = sessionsOn(k), fs = sess.filter(s => s.finishedAt).pop();
    const prog = isT && sess.find(s => !s.finishedAt && anyDone(s));
    let cls = 'day', status = '';
    if (dd.has(k)) { cls += ' is-done'; status = `<span class="chk on">${ic('check', 'sm')}</span>`; }
    else if (prog) status = '<span class="status prog">En curso</span>';
    else if (isT && d.type !== 'rest') status = '<span class="tag">HOY</span>';
    else if (isMissed(k)) status = '<span class="status miss">No hecho</span>';
    if (isT) cls += ' is-today';
    if (past && !dd.has(k)) cls += ' is-past';
    if ((d.type === 'rest' || !d.exercises.length) && !dd.has(k)) {
      return `<div class="${cls} is-rest"><div class="dbox"><b>${DAYS_1[i]}</b><span>${parseKey(k).getDate()}</span></div><div class="dtext"><div class="dtitle" style="font-weight:600;color:var(--muted)">${d.type === 'rest' ? 'Descanso' : `${esc(d.title)} · sin ejercicios`}</div></div>${isT ? '<span class="tag line">HOY</span>' : ''}</div>`;
    }
    const title = fs && fs.dayIdx !== i ? fs.title : d.title;
    const sub = fs && fs.dayIdx !== i ? `Hiciste: ${esc(fs.title)}` : esc(d.sub || plural(d.exercises.length, 'ejercicio', 'ejercicios'));
    return `<button class="${cls}" data-a="openDay" data-k="${k}">
      <div class="dbox"><b>${DAYS_1[i]}</b><span>${parseKey(k).getDate()}</span></div>
      <div class="dtext"><div class="dtitle">${esc(title)}${d.type === 'optional' && !fs ? ' <span class="status" style="display:inline">· opcional</span>' : ''}</div><div class="dsub">${sub}</div></div>${status}</button>`;
  }).join('');

  const installTip = isIOS() && !isStandalone() && !S.settings.hideInstall
    ? `<button class="notice" data-a="installHelp"><span class="ico">${ic('share')}</span><span class="grow">Instalala en tu inicio para usarla sin internet</span>${ic('next', 'sm')}</button>` : '';
  const nFin = finished().length, lb = S.settings.lastBackup;
  const backupTip = nFin >= 8 && (!lb || Date.now() - lb > 30 * 864e5)
    ? `<button class="notice" data-a="settings"><span class="ico">${ic('download')}</span><span class="grow">${lb ? `Hace ${Math.floor((Date.now() - lb) / 864e5)} días` : 'Todavía no'} hiciste una copia de seguridad</span>${ic('next', 'sm')}</button>` : '';
  const d0 = parseKey(t);
  return `<div class="top"><span class="eyebrow">Semana ${weeksSinceStart()} · ${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}</span><button class="icon-btn" data-a="settings" aria-label="Ajustes">${ic('gear')}</button></div>
  <div class="head"><h1>${DAYS[di]} ${d0.getDate()}</h1><p class="sub">${cap(MONTHS[d0.getMonth()])} ${d0.getFullYear()}</p></div>
  ${card}${installTip}${backupTip}
  <div class="section"><div class="section-h"><h2>Esta semana</h2><span class="mono" style="font-size:14px;font-weight:600">${count} / ${g}</span></div>
  <div class="segs">${segs}</div><div class="streak">${ic('flame', 'sm')}<span>${streakTxt}</span></div></div>
  <div class="section stack stagger">${rows}</div>`;
}

/* ═══════════════ Vista previa de un día ═══════════════ */
function screenDay(sc) {
  const day = S.plan[sc.d], k = sc.k, t = todayKey(), past = k < t;
  const list = day.exercises.map(e => {
    const le = lastEntry(e.id, null);
    return `<div class="ex"><div class="exrow">${thumb(e)}<div class="grow"><div class="exname">${esc(e.name)}</div><div class="meta">${setsText(e)}${e.uni ? ' · por pierna' : ''}</div></div>
    ${le ? `<div class="wt">${e.uni ? `I ${fk(le.e.wL)}<small>D ${fk(le.e.wR)}</small>` : `${fk(metric(le.e))}<small>kg</small>`}</div>` : ''}</div></div>`;
  }).join('');
  return `<div class="top">${backBtn()}</div>
  <div class="head"><div class="eyebrow">${fmtLong(k)}${past ? ' · no registrado' : k > t ? ' · próximo' : ''}</div><h1 class="md">${esc(day.title)}</h1>${day.sub ? `<p class="sub">${esc(day.sub)}</p>` : ''}</div>
  <div class="stack stagger">${list || '<div class="card empty">Este día no tiene ejercicios.</div>'}</div>
  <div class="section stack">
    <button class="btn btn-ink btn-lg btn-block" data-a="start" data-d="${sc.d}" ${day.exercises.length ? '' : 'disabled'}>Entrenar esto hoy</button>
    ${past && k >= addDays(t, -60) && day.exercises.length ? `<button class="textlink" data-a="backfill" data-d="${sc.d}" data-k="${k}">Lo hice el ${fmtDayShort(k)} y no lo registré</button>` : ''}
  </div>`;
}

/* ═══════════════ Entrenamiento ═══════════════ */
function startSession(k, d, backfill = false) {
  let s = S.sessions.find(x => x.date === k && x.dayIdx === d);
  if (!s) {
    const day = S.plan[d];
    s = { id: uid(), date: k, dayIdx: d, title: day.title, sub: day.sub,
      items: day.exercises.map(e => ({ id: e.id, name: e.name, sets: e.sets, rmin: e.rmin, rmax: e.rmax, unit: e.unit, icon: e.icon, note: e.note, rest: e.rest, uni: e.uni, photo: e.photo })),
      entries: {}, startedAt: null, finishedAt: null, backfill, updatedAt: Date.now() };
    S.sessions.push(s);
  }
  const t = top(); if (t && t.type === 'day') UI.stack.pop();
  UI.expanded = null; go({ type: 'workout', sid: s.id });
}
function entry(s, id) { return s.entries[id] || (s.entries[id] = { done: false, skip: false, top: false, w: null, wL: null, wR: null }); }
function prefill(s, it) {
  const e = entry(s, it.id);
  if (e.done || e.touched || hasW(e)) return;
  const le = lastEntry(it.id, s); if (!le) return;
  const inc = le.e.top ? S.settings.step : 0, L = le.e;
  if (it.uni) {
    e.wL = L.wL != null ? round(L.wL + inc) : L.w != null ? round(L.w + inc) : null;
    e.wR = L.wR != null ? round(L.wR + inc) : L.w != null ? round(L.w + inc) : null;
  } else {
    const m = L.w != null ? L.w : (L.wL != null || L.wR != null) ? metric(L) : null;
    e.w = m != null ? round(m + inc) : null;
  }
}
function lastText(le, uni) {
  if (!le) return 'Primera vez · cargá el peso que uses';
  const e = le.e;
  const v = uni ? `I ${fk(e.wL)} · D ${fk(e.wR)} kg` : `${fk(e.w != null ? e.w : metric(e))} kg`;
  return `Última: ${v} · ${fmtShort(le.date)}`;
}
function stepperHTML(id, side, val, label) {
  return `<div class="stepper">
    <button class="sb" data-a="step" data-id="${id}" data-side="${side}" data-dir="-1" aria-label="Restar ${fk(S.settings.step)} kg${label ? ' ' + label : ''}">−</button>
    <label class="wfield"><span class="sr">Peso en kg${label ? ' ' + label : ''}</span><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="0" value="${val != null ? fk(val) : ''}" data-in="weight" data-id="${id}" data-side="${side}"><span class="u">kg</span></label>
    <button class="sb" data-a="step" data-id="${id}" data-side="${side}" data-dir="1" aria-label="Sumar ${fk(S.settings.step)} kg${label ? ' ' + label : ''}">+</button>
  </div>`;
}
function screenWorkout(sc) {
  const s = S.sessions.find(x => x.id === sc.sid);
  if (!s) { UI.stack.pop(); return UI.stack.length ? SCREENS[top().type](top()) : TABS[UI.tab](); }
  const items = itemsOf(s), t = todayKey();
  const handled = items.filter(i => s.entries[i.id] && (s.entries[i.id].done || s.entries[i.id].skip)).length;
  let openId = UI.expanded;
  if (openId === null && !s.finishedAt) { const nx = items.find(i => !(s.entries[i.id] && (s.entries[i.id].done || s.entries[i.id].skip))); openId = nx ? nx.id : null; }

  const cards = items.map(it => {
    const e = s.entries[it.id] || {};
    const isOpen = it.id === openId;
    const st = e.done ? 'is-done' : e.skip ? 'is-skip' : '';
    if (!isOpen) {
      const right = e.done
        ? `${hasW(e) ? `<div class="wt">${it.uni ? `I ${fk(e.wL)}<small>D ${fk(e.wR)}</small>` : `${fk(e.w)}<small>kg</small>`}</div>` : ''}<span class="chk on ${UI.justDone === it.id ? 'pop' : ''}">${ic('check', 'sm')}</span>`
        : e.skip ? '<span class="status">Salteado</span>' : '<span class="chk"></span>';
      return `<div class="ex ${st}" data-exid="${it.id}"><button class="exrow" data-a="expand" data-id="${it.id}" aria-expanded="false">${thumb(it)}
        <div class="grow"><div class="exname">${esc(it.name)}</div><div class="meta">${setsText(it)}${it.uni ? ' · por pierna' : ''}</div></div>${right}</button></div>`;
    }
    prefill(s, it);
    const en = s.entries[it.id];
    const le = lastEntry(it.id, s);
    const tip = le && le.e.top && !e.done ? `<div class="tip">${ic('up', 'sm')}<span>La última vez llegaste al tope. Subí a <b>${it.uni ? `I ${fk(round((le.e.wL || 0) + S.settings.step))} · D ${fk(round((le.e.wR || 0) + S.settings.step))}` : fk(round(metric(le.e) + S.settings.step))} kg</b></span></div>` : '';
    const weights = it.uni
      ? `<div class="side"><div class="side-h">Izquierda ${sideTag('L')}</div>${stepperHTML(it.id, 'wL', en.wL, 'izquierda')}</div>
         <div class="side"><div class="side-h">Derecha ${sideTag('R')}</div>${stepperHTML(it.id, 'wR', en.wR, 'derecha')}</div>`
      : stepperHTML(it.id, 'w', en.w, '');
    const topLabel = it.rmax === 0 ? '' : `<label class="check-chip"><input type="checkbox" class="cb" data-ch="top" data-id="${it.id}" ${en.top ? 'checked' : ''}><span>Llegué a ${it.rmax}${it.unit === 's' ? ' s' : ' reps'} en todas las series</span></label>`;
    return `<div class="ex open ${st} ${UI.fresh === it.id ? 'fresh' : ''}" data-exid="${it.id}">
      <div class="exrow"><button class="thumb lg" data-a="exInfo" data-id="${it.id}" aria-label="Ver ficha de ${esc(it.name)}">${it.photo ? `<img data-photo="${esc(it.photo)}" data-fallback="${esc(it.icon)}" data-size="56" alt="">` : pic(it.icon, 56)}<span class="zoom">${ic('zoom', 'sm')}</span></button>
        <button class="grow" data-a="collapse" aria-expanded="true" style="text-align:left"><div class="exname">${esc(it.name)}</div><div class="meta">${setsText(it)}${it.uni ? ' por pierna' : ''}${it.rest ? ` · desc. ${esc(it.rest)}` : ''}</div><div class="last">${lastText(le, it.uni)}</div></button></div>
      ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}
      ${tip}${weights}${topLabel}
      <div class="ex-actions">
        ${e.done || e.skip ? `<button class="btn btn-soft" data-a="undo" data-id="${it.id}">Desmarcar</button><button class="btn btn-ink" data-a="done" data-id="${it.id}">Guardar</button>`
          : `<button class="btn btn-soft" data-a="skip" data-id="${it.id}">Saltear</button><button class="btn btn-ink" data-a="done" data-id="${it.id}">${ic('check')} Hecho</button>`}
      </div></div>`;
  }).join('');

  const mins = s.finishedAt && s.startedAt && !s.backfill ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : null;
  const when = s.date === t ? `Hoy · ${fmtLong(t)}` : fmtLong(s.date);
  return `<div class="top">${backBtn()}<span class="row" style="gap:6px"><span class="mono" style="font-size:14px;font-weight:600;padding:0 6px">${handled} / ${items.length}</span><button class="icon-btn" data-a="sessionMenu" aria-label="Opciones del entrenamiento">${ic('dots')}</button></span></div>
  <div class="head" style="margin-bottom:12px"><div class="eyebrow">${when}</div><h1 class="md">${esc(s.title)}</h1>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}
  <div class="progress"><div style="width:${items.length ? handled / items.length * 100 : 0}%"></div></div></div>
  ${s.finishedAt ? `<div class="banner"><span class="chk on">${ic('check', 'sm')}</span><span>Completado${mins ? ` en ${mins} min` : ''}${s.backfill ? ' · registrado después' : ` · ${fmtTime(s.finishedAt)}`}. Tocá un ejercicio para corregir pesos.</span></div>` : ''}
  ${s.backfill && !s.finishedAt ? `<div class="banner">${ic('clock', 'sm')}<span>Estás registrando el <b>${fmtDayShort(s.date)}</b>. Va a contar para ese día.</span></div>` : ''}
  <div class="stack ${UI.nav ? 'stagger' : ''}">${cards}</div>`;
}
function curSession() { const t = top(); return t && t.type === 'workout' ? S.sessions.find(x => x.id === t.sid) : null; }
const itemIn = (s, id) => itemsOf(s).find(i => i.id === id);
function markStart(s) { if (s && !s.startedAt && !s.backfill && !s.finishedAt) s.startedAt = Date.now(); }

function buildSummary(s) {
  const items = itemsOf(s), doneItems = items.filter(i => s.entries[i.id] && s.entries[i.id].done);
  const prs = [];
  doneItems.forEach(it => {
    const e = s.entries[it.id]; if (!hasW(e)) return;
    const prev = sortedSessions().filter(x => x !== s && x.finishedAt && x.date <= s.date && x.entries[it.id] && x.entries[it.id].done && hasW(x.entries[it.id])).map(x => x.entries[it.id]);
    if (!prev.length) return;
    if (it.uni) ['wL', 'wR'].forEach(k => { const pm = Math.max(...prev.map(p => p[k] != null ? p[k] : -Infinity)); if (e[k] != null && pm > -Infinity && e[k] > pm) prs.push(`${it.name} (${k === 'wL' ? 'izq.' : 'der.'}): ${fk(e[k])} kg`); });
    else { const pm = Math.max(...prev.map(metric)); if (e.w != null && e.w > pm) prs.push(`${it.name}: ${fk(e.w)} kg`); }
  });
  return { title: s.title, done: doneItems.length, total: items.length,
    mins: s.startedAt && !s.backfill ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : null,
    week: weekCount(weekStart(s.date)), prs };
}

/* ═══════════════ Pestaña: Progreso ═══════════════ */
function tabProgreso() {
  const t = todayKey(), g = goal(), st = streakInfo(), pct = consistency(), wc = weekCount(weekStart(t));
  const dd = doneDates();
  let msg;
  if (!trainDays()) msg = 'Cargá ejercicios en tu rutina para empezar a medir tu constancia.';
  else if (wc >= g) msg = '<b>Objetivo semanal cumplido.</b> Todo lo que sumes ahora es extra.';
  else {
    const left = g - wc; let remaining = 0;
    for (let k = t; k <= addDays(weekStart(t), 6); k = addDays(k, 1)) if (S.plan[dayIdx(k)].type !== 'rest' && S.plan[dayIdx(k)].exercises.length && !dd.has(k)) remaining++;
    msg = left > remaining ? `Te faltan <b>${plural(left, 'entrenamiento', 'entrenamientos')}</b> y quedan ${remaining} días de entreno en tu plan. Igual podés sumar en otros días.` : `Te ${left === 1 ? 'falta' : 'faltan'} <b>${plural(left, 'entrenamiento', 'entrenamientos')}</b> para cumplir la semana.`;
  }
  const [cy, cm] = UI.calMonth || [parseKey(t).getFullYear(), parseKey(t).getMonth()];
  const first = new Date(cy, cm, 1, 12), lead = (first.getDay() + 6) % 7, dim = new Date(cy, cm + 1, 0).getDate();
  let cells = DAYS_1.map(d => `<div class="h">${d}</div>`).join('');
  for (let i = 0; i < lead; i++) cells += '<div class="cell blank"></div>';
  let monthDone = 0, monthMiss = 0;
  for (let d = 1; d <= dim; d++) {
    const k = keyOf(new Date(cy, cm, d, 12)); let c = 'cell', lab = '';
    if (dd.has(k)) { c += ' done'; monthDone++; lab = 'entrenado'; }
    else if (isMissed(k)) { c += ' miss'; monthMiss++; lab = 'no hecho'; }
    else if (k > t) c += ' future';
    else if (S.plan[dayIdx(k)].type === 'rest') c += ' rest';
    if (k === t) c += ' is-today';
    const fs = dd.has(k) ? finished().filter(x => x.date === k).pop() : null;
    cells += fs ? `<button class="${c}" style="--i:${d}" data-a="openSession" data-sid="${fs.id}" aria-label="${d}: ${lab}, ver registro">${d}</button>`
      : `<div class="${c}" ${lab ? `aria-label="${d}: ${lab}"` : ''}>${d}</div>`;
  }
  const isCur = cy === parseKey(t).getFullYear() && cm === parseKey(t).getMonth();
  const firstOfMonth = keyOf(new Date(cy, cm, 1, 12));
  const canPrev = firstOfMonth > S.created.slice(0, 8) + '01' || finished().some(s => s.date < firstOfMonth);

  const weeks = [];
  for (let i = 11; i >= 0; i--) { const ws = addDays(weekStart(t), -7 * i); weeks.push({ ws, n: weekCount(ws), cur: i === 0, pre: addDays(ws, 6) < S.created }); }
  const maxN = Math.max(g, ...weeks.map(w => w.n), 1);
  const bars = weeks.map((w, i) => `<div class="bar ${w.cur ? 'cur' : w.n >= g ? 'met' : ''} ${w.pre ? 'pre' : ''}" style="height:${Math.max(2, w.n / maxN * 100)}%;--i:${i}" aria-label="Semana del ${fmtShort(w.ws)}: ${w.n}"></div>`).join('');
  const blabels = weeks.map((w, i) => `<span>${i % 3 === 2 || w.cur ? parseKey(w.ws).getDate() + '/' + (parseKey(w.ws).getMonth() + 1) : ''}</span>`).join('');

  const fin = finished(), monthKey = t.slice(0, 7);
  const thisMonth = new Set(fin.filter(s => s.date.startsWith(monthKey)).map(s => s.date)).size;
  const durs = fin.filter(s => s.startedAt && !s.backfill).map(s => (s.finishedAt - s.startedAt) / 60000).filter(m => m > 3 && m < 300);
  const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null;

  const groups = S.plan.map((d, i) => d.exercises.length ? `<div class="gtitle">${DAYS[i]} · ${esc(d.title)}</div>` + d.exercises.map(e => {
    const h = history(e.id);
    let right = '<span class="meta" style="margin:0">Sin registros</span>';
    if (h.length) {
      const L = h[h.length - 1].e, F = h[0].e;
      const val = e.uni ? `I ${fk(L.wL)} · D ${fk(L.wR)}` : `${fk(metric(L))} kg`;
      const dl = !e.uni && h.length > 1 ? round(metric(L) - metric(F)) : null;
      right = `<span class="wt">${val}</span>${dl ? `<span class="delta ${dl > 0 ? 'up' : ''}">${dl > 0 ? '+' : ''}${fk(dl)}</span>` : ''}`;
    }
    return `<button class="prow" data-a="exInfo" data-id="${e.id}">${thumb(e, 'sm')}<span class="grow ellipsis" style="font-weight:600;font-size:15px">${esc(e.name)}</span>${right}</button>`;
  }).join('') : '').join('');

  return `<div class="top"><span class="eyebrow">${fmtLong(t)}</span></div>
  <div class="head"><h1>Progreso</h1></div>
  <div class="stats stagger">
    <div class="stat"><b><span data-count="${wc}">${wc}</span><small>/${g}</small></b><span>Esta semana</span></div>
    <div class="stat"><b><span data-count="${st.cur}">${st.cur}</span></b><span>${st.cur === 1 ? 'Semana' : 'Semanas'} de racha</span></div>
    <div class="stat"><b>${pct === null ? '—' : `<span data-count="${pct}">${pct}</span><small>%</small>`}</b><span>Constancia 4 semanas</span></div>
  </div>
  <p class="msg">${msg}</p>
  <div class="section card">
    <div class="calnav"><button class="icon-btn" data-a="cal" data-dir="-1" aria-label="Mes anterior" ${canPrev ? '' : 'disabled'}>${ic('back')}</button>
      <span class="t">${MONTHS[cm]} ${cy}</span>
      <button class="icon-btn" data-a="cal" data-dir="1" aria-label="Mes siguiente" ${isCur ? 'disabled' : ''}>${ic('next')}</button></div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i style="background:var(--ink)"></i>Entrenado · ${monthDone}</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--accent-line)"></i>No hecho · ${monthMiss}</span><span>Tocá un día para ver el registro</span></div>
  </div>
  <div class="section card">
    <div class="section-h" style="padding:0"><h2>Últimas 12 semanas</h2><span class="aside">por semana</span></div>
    <div class="bars">${bars}<div class="goal" style="bottom:${g / maxN * 100}%"><span>obj. ${g}</span></div></div>
    <div class="blabels">${blabels}</div>
  </div>
  <div class="section grid2s stagger">
    <div class="stat"><b><span data-count="${fin.length}">${fin.length}</span></b><span>Entrenamientos totales</span></div>
    <div class="stat"><b><span data-count="${thisMonth}">${thisMonth}</span></b><span>Días entrenados en ${MONTHS[parseKey(t).getMonth()]}</span></div>
    <div class="stat"><b>${avg ? `<span data-count="${avg}">${avg}</span><small> min</small>` : '—'}</b><span>Duración promedio</span></div>
    <div class="stat"><b><span data-count="${st.best}">${st.best}</span></b><span>Mejor racha (semanas)</span></div>
  </div>
  <div class="section"><div class="section-h"><h2>Ejercicios</h2><span class="aside">último peso · cambio</span></div>
  <div class="card" style="padding-top:6px;padding-bottom:6px">${groups || '<div class="empty">No hay ejercicios en la rutina.</div>'}</div></div>`;
}

/* ═══════════════ Ficha de ejercicio ═══════════════ */
function chartSVG(h, uni) {
  const W = 320, H = 150, P = { l: 30, r: 10, t: 12, b: 22 };
  const series = uni ? [h.map(x => x.e.wL), h.map(x => x.e.wR)] : [h.map(x => metric(x.e))];
  const vals = series.flat().filter(v => v != null && Number.isFinite(v));
  if (!vals.length) return '';
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { lo -= 5; hi += 5; } else { const pd = (hi - lo) * 0.15; lo -= pd; hi += pd; }
  lo = Math.max(0, lo);
  const n = h.length, x = i => P.l + (n === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (n - 1)), y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  let g = '';
  [lo, (lo + hi) / 2, hi].forEach(v => { g += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 6}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`; });
  const lbl = [0, n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => `<text x="${x(i)}" y="${H - 4}" text-anchor="${n === 1 ? 'middle' : i === 0 ? 'start' : 'end'}">${fmtShort(h[i].date)}</text>`).join('');
  const cls = uni ? (S.settings.side === 'L' ? ['2', '1'] : ['1', '2']) : ['1'];
  const lines = series.map((sv, si) => {
    const pts = sv.map((v, i) => v != null ? [x(i), y(v)] : null).filter(Boolean);
    if (!pts.length) return '';
    return `<path class="ln l${cls[si]}" pathLength="1" d="M${pts.map(p => p.join(' ')).join(' L')}"/>` + pts.map((p, k) => `<circle class="p${cls[si]}" style="--i:${k}" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join('');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">${g}${lines}${lbl}</svg>`;
}
function screenEx(sc) {
  const f = findEx(sc.id);
  let it = f ? f.ex : null;
  if (!it) { const s = S.sessions.find(x => x.items.some(i => i.id === sc.id)); it = s && s.items.find(i => i.id === sc.id); }
  if (!it) { UI.stack.pop(); return UI.stack.length ? SCREENS[top().type](top()) : TABS[UI.tab](); }
  const h = history(it.id);
  let summary = '';
  if (h.length) {
    const L = h[h.length - 1].e, F = h[0].e;
    if (it.uni) {
      const op = S.settings.side, a = op === 'L' ? L.wL : L.wR, b = op === 'L' ? L.wR : L.wL;
      const diff = a != null && b ? Math.round((a - b) / b * 100) : null;
      summary = `<div class="grid2"><div class="stat"><span>Izquierda ${sideTag('L')}</span><b>${fk(L.wL)}<small> kg</small></b></div>
        <div class="stat"><span>Derecha ${sideTag('R')}</span><b>${fk(L.wR)}<small> kg</small></b></div></div>
        ${diff !== null ? `<p class="msg">${op ? 'Lado lesionado vs. sano' : 'Derecha vs. izquierda'}: <b>${diff > 0 ? '+' : ''}${diff}%</b>${op ? '' : '. Si tenés un lado lesionado, marcalo en Ajustes.'}</p>` : ''}`;
    } else {
      const dl = round(metric(L) - metric(F));
      summary = `<div class="grid2"><div class="stat"><span>Último</span><b>${fk(metric(L))}<small> kg</small></b></div>
        <div class="stat"><span>Desde el inicio</span><b>${dl > 0 ? '+' : ''}${fk(dl)}<small> kg</small></b></div></div>`;
    }
  }
  const rows = h.slice().reverse().slice(0, 30).map(x => `<div class="hrow"><span>${fmtDayShort(x.date)}</span><span class="mono" style="font-weight:600">${it.uni ? `I ${fk(x.e.wL)} · D ${fk(x.e.wR)}` : fk(metric(x.e))} kg${x.e.top ? ' <span class="tag ink" style="margin-left:6px">TOPE</span>' : ''}</span></div>`).join('');
  const op = S.settings.side;
  return `<div class="top">${backBtn()}${f ? `<button class="pill-btn" data-a="editEx" data-day="${f.day}" data-id="${it.id}">${ic('edit', 'sm')} Editar</button>` : ''}</div>
  <div class="hero" style="margin-top:8px">${it.photo ? `<img data-photo="${esc(it.photo)}" data-fallback="${esc(it.icon)}" data-size="150" alt="Foto de ${esc(it.name)}">` : pic(it.icon, 150)}
    ${f ? `<button class="btn btn-ink" data-a="editEx" data-day="${f.day}" data-id="${it.id}" data-img="1">${ic('camera', 'sm')} Cambiar imagen</button>` : ''}</div>
  <div class="head" style="margin-top:18px"><h1 class="md">${esc(it.name)}</h1><div class="eyebrow" style="margin-top:8px">${setsText(it)}${it.uni ? ' por pierna' : ''}${it.rest ? ` · desc. ${esc(it.rest)}` : ''}</div>
  ${it.note ? `<p class="sub" style="color:var(--ink);opacity:.8">${esc(it.note)}</p>` : ''}</div>
  ${h.length ? `${summary}
    <div class="section card"><div class="section-h" style="padding:0"><h2>Evolución</h2>${it.uni ? `<span class="aside" style="display:flex;gap:10px"><span>● ${op === 'L' ? 'der.' : 'izq.'}</span><span style="color:var(--accent-line)">● ${op === 'L' ? 'izq.' : 'der.'}</span></span>` : ''}</div>${chartSVG(h, it.uni)}</div>
    <div class="section card" style="padding-top:4px;padding-bottom:4px">${rows}</div>`
    : '<div class="card empty">Todavía no hay registros.<br>Aparecen acá cuando completes este ejercicio.</div>'}`;
}

/* ═══════════════ Pestaña: Rutina ═══════════════ */
function tabRutina() {
  const t = todayKey();
  if (UI.editDay === null) UI.editDay = dayIdx(t);
  const i = UI.editDay, d = S.plan[i];
  const chips = S.plan.map((x, j) => `<button class="${j === i ? 'on' : ''} ${x.type === 'rest' ? 'rest' : ''} ${j === dayIdx(t) ? 'is-today' : ''}" data-a="editDay" data-d="${j}" aria-label="${DAYS[j]}" ${j === i ? 'aria-pressed="true"' : ''}>${DAYS_1[j]}</button>`).join('');
  const list = d.exercises.map((e, j) => `<div class="erow">
    <button class="main" data-a="editEx" data-day="${i}" data-id="${e.id}">${thumb(e, 'sm')}<span class="grow"><span class="ellipsis" style="display:block;font-weight:600;font-size:15px">${esc(e.name)}</span><span class="meta" style="display:block">${setsText(e)}${e.uni ? ' · por pierna' : ''}</span></span></button>
    <span class="move"><button data-a="move" data-d="${i}" data-j="${j}" data-dir="-1" aria-label="Subir" ${j === 0 ? 'disabled' : ''}>${ic('up', 'sm')}</button><button data-a="move" data-d="${i}" data-j="${j}" data-dir="1" aria-label="Bajar" ${j === d.exercises.length - 1 ? 'disabled' : ''}>${ic('down', 'sm')}</button></span></div>`).join('');
  return `<div class="top"><span class="eyebrow">Tu plan semanal</span><button class="pill-btn" data-a="routineMenu">${ic('layers', 'sm')} Opciones</button></div>
  <div class="head"><h1>Rutina</h1><p class="sub">Los cambios se guardan solos. Tu historial no se pierde.</p></div>
  <div class="chips">${chips}</div>
  <div class="section card" style="margin-top:12px">
    <div class="eyebrow">${DAYS[i]}</div>
    ${d.type === 'rest' ? `<div class="titleinp" style="color:var(--muted);display:flex;align-items:center">Descanso</div>` : `<label><span class="sr">Nombre del día</span><input class="titleinp" value="${esc(d.title)}" data-in="dayTitle" data-d="${i}" maxlength="40"></label>
    <label><span class="sr">Descripción</span><input class="subinp" value="${esc(d.sub)}" placeholder="Descripción (opcional)" data-in="daySub" data-d="${i}" maxlength="60"></label>`}
    <div class="segctl" style="margin-top:12px" role="group" aria-label="Tipo de día">
      ${[['train', 'Entreno'], ['optional', 'Opcional'], ['rest', 'Descanso']].map(([k, l]) => `<button class="${d.type === k ? 'on' : ''}" data-a="dayType" data-d="${i}" data-t="${k}" ${d.type === k ? 'aria-pressed="true"' : ''}>${l}</button>`).join('')}
    </div>
    <p class="hint" style="margin-top:8px">${d.type === 'train' ? 'Cuenta para tu objetivo semanal.' : d.type === 'optional' ? 'Si lo hacés suma; si no, no cuenta como día perdido.' : 'Día de recuperación: no cuenta como perdido.'}</p>
  </div>
  ${d.type !== 'rest' ? `<div class="section"><div class="section-h"><h2>Ejercicios</h2><span class="aside">${d.exercises.length}</span></div>
  <div class="stack">${list}<button class="addbtn" data-a="editEx" data-day="${i}" data-id="">${ic('plus')} Agregar ejercicio</button></div></div>` : ''}`;
}

/* ═══════════════ Hojas ═══════════════ */
function sheetExEdit(s) {
  const d = s.draft;
  const imgBox = `<div class="thumb lg">${d.photo ? `<img data-photo="${esc(d.photo)}" data-fallback="${esc(d.icon)}" data-size="56" alt="">` : pic(d.icon, 56)}</div>`;
  const picker = s.picker ? `<div class="picker">${Object.entries(PICS).map(([k, v]) => `<button class="${!d.photo && d.icon === k ? 'on' : ''}" data-a="pickIcon" data-k="${k}">${pic(k, 36)}<span>${v[0]}</span></button>`).join('')}</div>` : '';
  const sec = d.unit === 's';
  return `${sheetHead(s.id ? 'Editar ejercicio' : 'Nuevo ejercicio')}
  <div class="form">
    <div class="imgedit">${imgBox}<div class="btns">
      <label class="btn btn-soft btn-sm">${ic('camera', 'sm')} ${d.photo ? 'Cambiar foto' : 'Usar foto'}<input type="file" accept="image/*" data-ch="photo"></label>
      <button class="btn btn-soft btn-sm" data-a="togglePicker">${ic('shapes', 'sm')} Ilustración</button>
      ${d.photo ? `<button class="btn btn-soft btn-sm btn-danger" data-a="removePhoto">Quitar foto</button>` : ''}
    </div></div>
    ${picker}
    <label class="field"><span>Nombre</span><input class="inp" value="${esc(d.name)}" data-in="draft" data-k="name" maxlength="60" placeholder="Ej: Prensa de piernas"></label>
    <div class="segctl" role="group" aria-label="Medida">${[['reps', 'Repeticiones'], ['s', 'Segundos']].map(([k, l]) => `<button class="${(d.unit || 'reps') === k ? 'on' : ''}" data-a="draftUnit" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="grid3">
      <label class="field"><span>Series</span><input class="inp num" inputmode="numeric" value="${esc(d.sets)}" data-in="draft" data-k="sets"></label>
      <label class="field"><span>${sec ? 'Seg. mín.' : 'Reps mín.'}</span><input class="inp num" inputmode="numeric" value="${d.rmax === 0 ? '' : esc(d.rmin)}" data-in="draft" data-k="rmin" placeholder="—"></label>
      <label class="field"><span>${sec ? 'Seg. máx.' : 'Reps máx.'}</span><input class="inp num" inputmode="numeric" value="${d.rmax === 0 ? '' : esc(d.rmax)}" data-in="draft" data-k="rmax" placeholder="—"></label>
    </div>
    <p class="hint" style="margin-top:-6px">Dejá las ${sec ? 'cantidades' : 'reps'} vacías si el ejercicio es <b>al fallo</b>.</p>
    <label class="field"><span>Descanso entre series</span><input class="inp" value="${esc(d.rest)}" data-in="draft" data-k="rest" placeholder="Ej: 2–3 min" maxlength="20"></label>
    <label class="field"><span>Nota</span><textarea class="inp" rows="3" data-in="draft" data-k="note" placeholder="Técnica, máquina, indicaciones…" maxlength="300">${esc(d.note)}</textarea></label>
    <label class="swrow"><span><span class="t">Por pierna / por lado</span><span class="d">Registra el peso de izquierda y derecha por separado</span></span><input type="checkbox" class="sw" data-ch="draftUni" ${d.uni ? 'checked' : ''}></label>
    <div class="row" style="gap:8px;margin-top:4px">
      ${s.id ? `<button class="btn btn-line btn-danger" data-a="deleteEx">${ic('trash', 'sm')} Eliminar</button>` : ''}
      <button class="btn btn-ink grow" data-a="saveEx">Guardar</button>
    </div>
  </div>`;
}
function sheetSettings() {
  const st = S.settings, g = goal(), lb = st.lastBackup;
  const dark = document.documentElement.getAttribute('data-mode') === 'dark';
  const themes = THEMES.map(t => {
    const a = dark && t.ad ? t.ad : t.a, bg = dark ? t.d : t.l;
    return `<button class="theme ${st.theme === t.id ? 'on' : ''}" data-a="setTheme" data-v="${t.id}" aria-pressed="${st.theme === t.id}"><span class="sw3" style="background:${bg}"><i style="width:55%;background:${a}"></i><i style="width:25%;background:${dark ? '#F2F2EF' : '#0E0E0E'}"></i></span><span>${t.name}</span></button>`;
  }).join('');
  return `${sheetHead('Ajustes')}
  <div class="form">
    <div class="sgroup">Apariencia</div>
    <div class="themes">${themes}</div>
    <div class="segctl" role="group" aria-label="Modo">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button class="${st.mode === k ? 'on' : ''}" data-a="setMode" data-v="${k}">${l}</button>`).join('')}</div>
    <p class="hint" style="margin-top:-6px">Automático sigue el modo de tu teléfono.</p>

    <div class="sgroup">Rutina</div>
    <div class="grid2"><button class="btn btn-soft" data-a="changeRoutine">${ic('layers', 'sm')} Cambiar rutina</button><button class="btn btn-soft" data-a="shareRoutine">${ic('share', 'sm')} Compartir</button></div>

    <div class="sgroup">Entrenamiento</div>
    <div class="field"><span>Objetivo semanal</span>
      <div class="stepper"><button class="sb" data-a="goal" data-dir="-1" aria-label="Menos">−</button><div class="wfield"><span class="mono" style="font-size:22px;font-weight:600">${g}</span><span class="u">días</span></div><button class="sb" data-a="goal" data-dir="1" aria-label="Más">+</button></div>
      <p class="hint">Entrenamientos por semana para mantener tu racha.</p></div>
    <div class="field"><span>Pierna o lado operado / lesionado</span>
      <div class="segctl">${[['L', 'Izquierdo'], ['R', 'Derecho'], ['', 'Ninguno']].map(([k, l]) => `<button class="${(st.side || '') === k ? 'on' : ''}" data-a="side" data-v="${k}">${l}</button>`).join('')}</div>
      <p class="hint">Se marca en los ejercicios por pierna para comparar los dos lados.</p></div>
    <div class="field"><span>Saltos de peso (botones − / +)</span>
      <div class="segctl">${[1, 2.5, 5].map(v => `<button class="${st.step === v ? 'on' : ''}" data-a="stepSize" data-v="${v}">${fk(v)} kg</button>`).join('')}</div></div>
    <label class="swrow"><span><span class="t">Pantalla encendida al entrenar</span><span class="d">Evita que el teléfono se bloquee entre series</span></span><input type="checkbox" class="sw" data-ch="wake" ${st.wake ? 'checked' : ''}></label>

    <div class="sgroup">Copia de seguridad</div>
    <p class="hint">Tus datos viven solo en este teléfono. Guardá una copia en Archivos o iCloud Drive cada tanto. ${lb ? `Última copia: ${fmtDayShort(keyOf(new Date(lb)))}.` : 'Todavía no hiciste ninguna.'}</p>
    <div class="grid2"><button class="btn btn-ink" data-a="export">${ic('download', 'sm')} Exportar</button>
      <label class="btn btn-soft">${ic('upload', 'sm')} Importar<input type="file" accept="application/json,.json" data-ch="import"></label></div>
    <div class="divider"></div>
    <button class="btn btn-line btn-danger" data-a="wipe">Borrar todos los datos</button>
    <p class="hint" style="text-align:center">Rutina ${VERSION} · funciona sin internet</p>
  </div>`;
}
function sheetPick() {
  const opts = S.plan.map((d, i) => d.type !== 'rest' && d.exercises.length ? `<button class="day" data-a="start" data-d="${i}"><div class="dbox"><b>${DAYS_1[i]}</b></div><div class="dtext"><div class="dtitle">${esc(d.title)}</div><div class="dsub">${esc(d.sub || plural(d.exercises.length, 'ejercicio', 'ejercicios'))}</div></div>${ic('next', 'sm')}</button>` : '').join('');
  return `${sheetHead('¿Qué vas a entrenar?')}<p class="hint" style="margin:-6px 0 12px">Se registra con la fecha de hoy.</p><div class="stack">${opts || '<div class="empty">Tu rutina no tiene días con ejercicios todavía.</div>'}</div>`;
}
function sheetSummary(s) {
  const g = goal();
  return `<div class="done-hero"><div class="ring">${ic('check')}</div><h2>¡Entrenamiento completo!</h2><p class="sub" style="margin:0">${esc(s.title)}</p></div>
  <div class="stats" style="margin:16px 0">
    <div class="stat" style="background:var(--field)"><b>${s.mins != null ? s.mins : '—'}<small>${s.mins ? ' min' : ''}</small></b><span>Duración</span></div>
    <div class="stat" style="background:var(--field)"><b>${s.done}<small>/${s.total}</small></b><span>Ejercicios</span></div>
    <div class="stat" style="background:var(--field)"><b>${s.week}<small>/${g}</small></b><span>Esta semana</span></div>
  </div>
  ${s.prs.length ? `<div class="stack" style="margin-bottom:12px">${s.prs.map(p => `<div class="pr">${ic('trophy', 'sm')}<span>Récord: <b>${esc(p)}</b></span></div>`).join('')}</div>` : ''}
  <p class="msg" style="text-align:center;margin:0 0 16px">${s.week >= g ? (s.week === g ? 'Cumpliste tu objetivo de la semana.' : 'Semana cumplida y con extra.') : `${g - s.week === 1 ? 'Te falta 1' : `Te faltan ${g - s.week}`} para cumplir la semana.`}</p>
  <button class="btn btn-ink btn-lg btn-block" data-a="closeSheet">Listo</button>`;
}
function sheetInstall() {
  return `${sheetHead('Instalar en el iPhone')}
  <ol class="steps">
    <li><div>Abrí esta página en <b>Safari</b>.</div></li>
    <li><div>Tocá <b>Compartir</b> ${ic('share', 'sm')} en la barra de abajo.</div></li>
    <li><div>Elegí <b>Agregar a pantalla de inicio</b> y después <b>Agregar</b>.</div></li>
    <li><div>Abrila siempre desde el ícono: funciona sin internet.</div></li>
  </ol>
  <p class="hint" style="margin-top:14px">Lo que registres en Safari y en la app instalada se guarda por separado. Usá siempre el ícono.</p>
  <div class="grid2" style="margin-top:16px"><button class="btn btn-soft" data-a="hideInstall">No mostrar más</button><button class="btn btn-ink" data-a="closeSheet">Entendido</button></div>`;
}
function sheetSessionMenu() {
  const s = curSession(); if (!s) return '';
  const opt = (a, icon, t, d, danger) => `<button class="menu-opt ${danger ? 'danger' : ''}" data-a="${a}"><span class="thumb sm" style="background:var(--field)">${ic(icon)}</span><span class="grow"><span class="t">${t}</span><span class="d">${d}</span></span></button>`;
  return `${sheetHead('Opciones')}
  ${s.finishedAt
    ? opt('reopenSession', 'undo', 'Marcar como no terminado', 'Vuelve a quedar en curso para seguir cargando', false)
      + opt('deleteSession', 'trash', 'Eliminar este registro', `Se borra el entrenamiento del ${fmtDayShort(s.date)} y deja de contar en tus estadísticas`, true)
    : opt('resetSession', 'refresh', 'Empezar de nuevo', 'Desmarca todos los ejercicios de este entrenamiento', false)
      + opt('deleteSession', 'trash', 'Descartar entrenamiento', 'Se borra lo cargado y el día queda sin registrar', true)}`;
}
function sheetRoutineMenu() {
  const opt = (a, icon, t, d) => `<button class="menu-opt" data-a="${a}"><span class="thumb sm" style="background:var(--field)">${ic(icon)}</span><span class="grow"><span class="t">${t}</span><span class="d">${d}</span></span>${ic('next', 'sm')}</button>`;
  return `${sheetHead('Rutina')}
  ${opt('changeRoutine', 'layers', 'Cambiar rutina', 'Importar otra, elegir una armada o empezar de cero')}
  ${opt('shareRoutine', 'share', 'Compartir mi rutina', 'Mandala por WhatsApp. Se comparte la rutina, no tus pesos')}`;
}
const SHEETS = { exedit: sheetExEdit, settings: sheetSettings, pick: sheetPick, summary: sheetSummary, install: sheetInstall, smenu: sheetSessionMenu, rmenu: sheetRoutineMenu };
const TABS = { hoy: tabHoy, progreso: tabProgreso, rutina: tabRutina };
const SCREENS = { welcome: screenWelcome, templates: screenTemplates, scratch: screenScratch, import: screenImport, ai: screenAI, preview: screenPreview, day: screenDay, workout: screenWorkout, ex: screenEx };

/* ═══════════════ Rutina ↔ texto ═══════════════ */
function planToText(plan) {
  const clean = s => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ').trim();
  const lines = ['# Rutina', ''];
  plan.forEach((d, i) => {
    if (d.type === 'rest' || !d.exercises.length) { lines.push(`## ${DAYS[i]} | Descanso`, ''); return; }
    lines.push(`## ${DAYS[i]} | ${clean(d.title)}${d.sub ? ' | ' + clean(d.sub) : ''}${d.type === 'optional' ? ' | opcional' : ''}`);
    d.exercises.forEach(e => {
      const reps = e.rmax === 0 ? 'fallo' : (e.rmin === e.rmax ? `${e.rmin}` : `${e.rmin}-${e.rmax}`);
      const p = [clean(e.name), `${e.sets}x${reps}${e.unit === 's' && e.rmax ? ' seg' : ''}`];
      if (e.uni) p.push('por pierna');
      if (e.rest) p.push('desc ' + clean(e.rest));
      if (e.note) p.push('nota: ' + clean(e.note));
      lines.push('- ' + p.join(' | '));
    });
    lines.push('');
  });
  return lines.join('\n').trim() + '\n';
}
function parsedToDays(text) {
  const r = RP.parse(text);
  const w = RP.toWeek(r.blocks);
  const days = w.days.map(d => ({ title: d.title, sub: d.sub, type: d.type, exercises: d.exercises.map(x => ({ id: uid(), name: x.name, sets: x.sets, rmin: x.rmin, rmax: x.rmax, unit: x.unit === 's' ? 's' : 'reps', icon: x.icon, note: x.note, rest: x.rest, uni: x.uni, photo: null, flags: x.flags })) }));
  const warnings = r.warnings.concat(w.dropped ? [`${w.dropped} día(s) más de los que entran en una semana`] : []);
  return { days, warnings };
}
function applyDays(days) {
  S.plan = days.map(d => ({ title: d.exercises.length ? (d.title || 'Entrenamiento') : 'Descanso', sub: d.sub || '', type: d.exercises.length ? (d.type === 'rest' ? 'train' : d.type) : 'rest',
    exercises: d.exercises.map(e => { const c = Object.assign({}, e); delete c.flags; return c; }) }));
  S.settings.goal = null;
  const firstTime = !S.onboarded;
  S.onboarded = true; invalidate(); save();
  UI.stack = []; UI.tab = 'hoy'; UI.editDay = null; UI.importText = ''; UI.aiText = ''; UI.nav = true;
  render(); toast(firstTime ? '¡Rutina lista! A entrenar' : 'Rutina actualizada');
  gcPhotos();
}

/* ═══════════════ Acciones ═══════════════ */
const A = {
  tab: d => setTab(d.t),
  back: () => back(),
  settings: () => openSheet({ type: 'settings', label: 'Ajustes' }),
  installHelp: () => openSheet({ type: 'install', label: 'Instalar' }),
  hideInstall: () => { S.settings.hideInstall = true; save(); closeSheet(); render(); },
  closeSheet: () => {
    const sh = UI.sheet;
    if (sh && sh.type === 'exedit' && JSON.stringify(sh.draft) !== sh.orig && !confirm('¿Descartar los cambios de este ejercicio?')) return;
    const wasSummary = sh && sh.type === 'summary';
    closeSheet(); if (wasSummary) render();
  },
  // Bienvenida
  goImport: () => go({ type: 'import' }),
  goTemplates: () => go({ type: 'templates' }),
  goScratch: () => go({ type: 'scratch', sel: [0, 2, 4] }),
  goAI: () => go({ type: 'ai' }),
  toggleScratch: d => { const sc = top(), i = +d.i; sc.sel = sc.sel.includes(i) ? sc.sel.filter(x => x !== i) : sc.sel.concat(i).sort(); render(); },
  createScratch: () => {
    const sc = top(); let n = 0;
    const letters = 'ABCDEFG';
    const days = DAYS.map((_, i) => sc.sel.includes(i) ? { title: `Entrenamiento ${letters[n++]}`, sub: '', type: 'train', exercises: [] } : { title: 'Descanso', sub: '', type: 'rest', exercises: [] });
    S.plan = days; S.settings.goal = null; S.onboarded = true; invalidate(); save();
    UI.stack = []; UI.tab = 'rutina'; UI.editDay = sc.sel[0]; UI.nav = true; render();
    toast('Ahora agregá los ejercicios de cada día');
  },
  pickTemplate: d => { const t = TEMPLATES.find(x => x.id === d.id); go({ type: 'preview', source: 'template', name: t.name, days: t.plan(), warnings: [] }); },
  changeRoutine: () => { closeSheet(); go({ type: 'welcome', first: false }); },
  routineMenu: () => openSheet({ type: 'rmenu', label: 'Rutina' }),
  shareRoutine: async () => {
    const text = planToText(S.plan);
    closeSheet();
    if (navigator.share) {
      try { await navigator.share({ title: 'Mi rutina', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    toast(await copyText(text) ? 'Rutina copiada. Pegala donde quieras' : 'No se pudo compartir');
  },
  pasteInto: async d => {
    const txt = await readClipboard();
    const el = $(d.target);
    if (txt == null) { if (el) el.focus(); toast('Mantené apretado el cuadro y elegí Pegar'); return; }
    if (!txt.trim()) return toast('No hay texto copiado');
    if (d.target === 'imptext') UI.importText = txt; else UI.aiText = txt;
    render();
  },
  clearImport: () => { UI.importText = ''; render(); },
  copyPrompt: async () => toast(await copyText(AI_PROMPT) ? 'Instrucciones copiadas' : 'No se pudo copiar'),
  parse: d => {
    const text = d.src === 'ai' ? UI.aiText : UI.importText;
    if (!text || !text.trim()) return toast('Primero pegá tu rutina');
    const { days, warnings } = parsedToDays(text);
    const n = days.reduce((a, x) => a + x.exercises.length, 0);
    if (!n) return toast('No encontré ejercicios. Probá con el formato de los tips o usá una IA');
    go({ type: 'preview', source: 'import', name: 'Tu rutina', days, warnings });
  },
  pvRemove: d => { const sc = top(), day = sc.days[+d.i]; day.exercises.splice(+d.j, 1); if (!day.exercises.length) day.type = 'rest'; render(); },
  applyPlan: () => {
    const sc = top();
    const hasPlan = S.onboarded && S.plan.some(x => x.exercises.length);
    if (hasPlan && !confirm('Esto reemplaza tu rutina actual. Tus registros y estadísticas se mantienen. ¿Seguimos?')) return;
    applyDays(sc.days);
  },
  // Hoy
  pickRoutine: () => openSheet({ type: 'pick', label: 'Elegir rutina' }),
  editToday: () => { UI.editDay = dayIdx(todayKey()); setTab('rutina'); },
  start: d => { closeSheet(); startSession(todayKey(), +d.d); },
  backfill: d => startSession(d.k, +d.d, true),
  openSession: d => { UI.expanded = null; go({ type: 'workout', sid: d.sid }); },
  openDay: d => {
    const k = d.k, t = todayKey(), i = dayIdx(k), sess = sessionsOn(k);
    if (sess.length) {
      const s = sess.find(x => !x.finishedAt && anyDone(x)) || sess.filter(x => x.finishedAt).pop() || sess[0];
      UI.expanded = null; return go({ type: 'workout', sid: s.id });
    }
    if (k === t) return startSession(t, i);
    go({ type: 'day', d: i, k });
  },
  // Entrenamiento
  expand: d => { UI.expanded = d.id; UI.fresh = d.id; render(); requestAnimationFrame(() => { const el = document.querySelector(`[data-exid="${d.id}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); },
  collapse: () => { UI.expanded = '__none__'; render(); },
  exInfo: d => go({ type: 'ex', id: d.id }),
  step: (d, el) => {
    const s = curSession(); if (!s) return;
    const e = entry(s, d.id); e.touched = true; markStart(s);
    const v = round(Math.max(0, (e[d.side] != null ? e[d.side] : 0) + (+d.dir) * S.settings.step));
    e[d.side] = v; s.updatedAt = Date.now(); saveSoon();
    const inp = document.querySelector(`input[data-id="${d.id}"][data-side="${d.side}"]`);
    if (inp) { inp.value = fk(v); const wf = inp.closest('.wfield'); wf.classList.remove('bump'); void wf.offsetWidth; wf.classList.add('bump'); }
  },
  done: d => {
    const s = curSession(); if (!s) return;
    const it = itemIn(s, d.id), e = entry(s, d.id);
    e.done = true; e.skip = false; e.name = it.name; e.uni = !!it.uni;
    if (it.uni) e.w = null; else { e.wL = null; e.wR = null; }
    markStart(s); s.updatedAt = Date.now(); invalidate();
    const wasEditing = !!s.finishedAt;
    UI.expanded = wasEditing ? '__none__' : null; UI.justDone = d.id; save();
    const items = itemsOf(s), nx = items.find(i => !(s.entries[i.id] && (s.entries[i.id].done || s.entries[i.id].skip)));
    if (nx && !wasEditing) UI.fresh = nx.id;
    render();
    if (wasEditing) toast('Registro actualizado');
    else if (nx) { const el = document.querySelector(`[data-exid="${nx.id}"]`); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    else { toast('¡Todo listo! Tocá Terminar entrenamiento'); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 60); }
  },
  skip: d => { const s = curSession(); const e = entry(s, d.id); e.skip = true; e.done = false; s.updatedAt = Date.now(); UI.expanded = null; save(); render(); },
  undo: d => { const s = curSession(); const e = entry(s, d.id); e.done = false; e.skip = false; s.updatedAt = Date.now(); invalidate(); save(); render(); },
  finish: () => {
    const s = curSession(); if (!s) return;
    const items = itemsOf(s), doneN = items.filter(i => s.entries[i.id] && s.entries[i.id].done).length;
    const pending = items.filter(i => !(s.entries[i.id] && (s.entries[i.id].done || s.entries[i.id].skip))).length;
    if (!doneN) return toast('Marcá al menos un ejercicio como hecho');
    if (pending && !confirm(`Te ${pending === 1 ? 'queda 1 ejercicio' : `quedan ${pending} ejercicios`} sin marcar. ¿Terminar igual?`)) return;
    s.finishedAt = Date.now(); s.updatedAt = Date.now();
    if (s.startedAt && s.finishedAt - s.startedAt < 60000) s.startedAt = s.finishedAt - 60000;
    invalidate(); save();
    const sum = buildSummary(s);
    UI.stack = []; UI.tab = 'hoy'; UI.expanded = null; UI.nav = true; render();
    openSheet({ type: 'summary', label: 'Resumen', ...sum });
  },
  sessionMenu: () => openSheet({ type: 'smenu', label: 'Opciones' }),
  resetSession: () => {
    const s = curSession(); if (!s || !confirm('¿Desmarcar todos los ejercicios de este entrenamiento?')) return;
    s.entries = {}; s.startedAt = null; s.updatedAt = Date.now(); UI.expanded = null; save(); closeSheet(); render(); toast('Entrenamiento reiniciado');
  },
  reopenSession: () => {
    const s = curSession(); if (!s) return;
    s.finishedAt = null; s.updatedAt = Date.now(); invalidate(); UI.expanded = null; save(); closeSheet(); render(); toast('Entrenamiento en curso de nuevo');
  },
  deleteSession: () => {
    const s = curSession(); if (!s) return;
    if (!confirm(s.finishedAt ? `¿Eliminar el registro del ${fmtDayShort(s.date)}? No se puede deshacer.` : '¿Descartar este entrenamiento?')) return;
    S.sessions = S.sessions.filter(x => x !== s); invalidate(); save();
    closeSheet(); UI.stack.pop(); UI.expanded = null; UI.nav = true; releaseWake(); render(); gcPhotos();
    toast(s.finishedAt ? 'Registro eliminado' : 'Entrenamiento descartado');
  },
  // Progreso
  cal: d => {
    const t = parseKey(todayKey());
    let [y, m] = UI.calMonth || [t.getFullYear(), t.getMonth()];
    m += +d.dir; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    UI.calMonth = [y, m]; render();
  },
  // Rutina
  editDay: d => { UI.editDay = +d.d; render(); },
  dayType: d => {
    const day = S.plan[+d.d];
    if (d.t === 'rest' && day.exercises.length && !confirm('El día pasa a descanso y sus ejercicios se quitan del plan (tu historial no se borra). ¿Seguimos?')) return;
    if (d.t === 'rest') { day.exercises = []; day.title = 'Descanso'; day.sub = ''; }
    else if (day.type === 'rest') { day.title = 'Entrenamiento'; }
    day.type = d.t; invalidate(); save(); render();
  },
  move: d => {
    const list = S.plan[+d.d].exercises, j = +d.j, k = j + (+d.dir);
    if (k < 0 || k >= list.length) return;
    [list[j], list[k]] = [list[k], list[j]]; save(); render();
  },
  editEx: d => {
    const day = +d.day, e = d.id ? S.plan[day].exercises.find(x => x.id === d.id) : null;
    const draft = e ? Object.assign({}, e) : { id: null, name: '', sets: 3, rmin: 8, rmax: 12, unit: 'reps', icon: 'generic', note: '', rest: '', uni: false, photo: null };
    openSheet({ type: 'exedit', label: 'Editar ejercicio', day, id: e ? e.id : null, draft, orig: JSON.stringify(draft), picker: !!d.img && !(e && e.photo) });
  },
  togglePicker: () => { UI.sheet.picker = !UI.sheet.picker; drawSheet(); },
  pickIcon: d => { UI.sheet.draft.icon = d.k; UI.sheet.draft.photo = null; drawSheet(); },
  removePhoto: () => { UI.sheet.draft.photo = null; drawSheet(); },
  draftUnit: d => { UI.sheet.draft.unit = d.v; drawSheet(); },
  saveEx: () => {
    const s = UI.sheet, d = s.draft;
    const name = (d.name || '').trim(); if (!name) return toast('Poné un nombre al ejercicio');
    let sets = parseInt(d.sets, 10), a = parseInt(d.rmin, 10), b = parseInt(d.rmax, 10);
    sets = Number.isFinite(sets) ? Math.min(Math.max(sets, 1), 12) : 3;
    if (!Number.isFinite(a) && !Number.isFinite(b)) { a = 0; b = 0; }
    else { a = Number.isFinite(a) ? Math.max(a, 1) : b; b = Number.isFinite(b) ? Math.max(b, 1) : a; if (a > b) [a, b] = [b, a]; }
    const clean = { name, sets, rmin: a, rmax: b, unit: d.unit || 'reps', icon: d.icon, note: (d.note || '').trim(), rest: (d.rest || '').trim(), uni: !!d.uni, photo: d.photo || null };
    const list = S.plan[s.day].exercises;
    if (s.id) Object.assign(list.find(x => x.id === s.id), clean);
    else { list.push(Object.assign({ id: uid() }, clean)); if (S.plan[s.day].type === 'rest') S.plan[s.day].type = 'train'; }
    invalidate(); save(); closeSheet(); render(); toast(s.id ? 'Ejercicio actualizado' : 'Ejercicio agregado'); gcPhotos();
  },
  deleteEx: () => {
    const s = UI.sheet;
    if (!confirm('¿Eliminar este ejercicio de la rutina? Su historial queda guardado.')) return;
    S.plan[s.day].exercises = S.plan[s.day].exercises.filter(x => x.id !== s.id);
    invalidate(); save(); closeSheet();
    const t = top(); if (t && t.type === 'ex' && t.id === s.id) UI.stack.pop();
    render(); toast('Ejercicio eliminado'); gcPhotos();
  },
  // Ajustes
  setTheme: d => { S.settings.theme = d.v; save(); applyTheme(); drawSheet(); },
  setMode: d => { S.settings.mode = d.v; save(); applyTheme(); drawSheet(); },
  goal: d => { S.settings.goal = Math.min(7, Math.max(1, goal() + (+d.dir))); save(); drawSheet(); render(); },
  side: d => { S.settings.side = d.v || null; save(); drawSheet(); render(); },
  stepSize: d => { S.settings.step = +d.v; save(); drawSheet(); },
  export: () => exportData(),
  wipe: async () => {
    if (!confirm('Se borran la rutina, todos tus registros y fotos. ¿Seguro?')) return;
    if (!confirm('Última confirmación: esto no se puede deshacer.')) return;
    const keep = { theme: S.settings.theme, mode: S.settings.mode };
    S = freshState(); Object.assign(S.settings, keep); invalidate(); save(); await db.clear().catch(() => {}); photoURLs.clear();
    closeSheet(); UI.stack = []; UI.tab = 'hoy'; UI.editDay = null; UI.nav = true; render(); toast('Datos borrados');
  },
};
const IN = {
  weight: el => {
    const s = curSession(); if (!s) return;
    const e = entry(s, el.dataset.id); e.touched = true; markStart(s);
    const v = num(el.value); e[el.dataset.side] = v != null ? Math.max(0, round(v)) : null;
    s.updatedAt = Date.now(); saveSoon();
  },
  dayTitle: el => { S.plan[+el.dataset.d].title = el.value; saveSoon(); },
  daySub: el => { S.plan[+el.dataset.d].sub = el.value; saveSoon(); },
  draft: el => { UI.sheet.draft[el.dataset.k] = el.value; },
  importText: el => { UI.importText = el.value; },
  aiText: el => { UI.aiText = el.value; },
  pvTitle: el => { const sc = top(); if (sc && sc.days) sc.days[+el.dataset.i].title = el.value; },
};
const CH = {
  top: el => { const s = curSession(); if (!s) return; const e = entry(s, el.dataset.id); e.top = el.checked; s.updatedAt = Date.now(); save(); },
  draftUni: el => { UI.sheet.draft.uni = el.checked; },
  wake: el => { S.settings.wake = el.checked; save(); syncWake(); },
  photo: async el => {
    const f = el.files && el.files[0]; if (!f) return;
    try { const blob = await resizeImage(f); const id = 'p' + uid(); await db.put(id, blob); UI.sheet.draft.photo = id; drawSheet(); }
    catch (e) { toast('No se pudo cargar la imagen'); }
  },
  import: el => { const f = el.files && el.files[0]; if (f) importBackup(f); el.value = ''; },
  importFile: async el => {
    const f = el.files && el.files[0]; el.value = ''; if (!f) return;
    const text = await f.text();
    if (/\.json$/i.test(f.name) || /^\s*\{/.test(text)) { try { const j = JSON.parse(text); if (j && j.state) return importBackup(f); } catch (e) { /* no es copia */ } }
    UI.importText = text; render(); toast('Archivo cargado. Tocá Leer rutina');
  },
  pvMove: el => {
    const sc = top(), i = +el.dataset.i, j = +el.value;
    [sc.days[i], sc.days[j]] = [sc.days[j], sc.days[i]]; render();
  },
};

/* ═══════════════ Copia de seguridad ═══════════════ */
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
async function exportData() {
  try {
    const photos = {};
    for (const k of await db.keys().catch(() => [])) { const b = await db.get(k); if (b) photos[k] = await blobToDataURL(b); }
    const data = { app: 'rutina', version: VERSION, exportedAt: new Date().toISOString(), state: S, photos };
    const name = `rutina-copia-${todayKey()}.json`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    let file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) { /* iOS viejo */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); }
      catch (e) { if (e.name === 'AbortError') return; download(blob, name); }
    } else download(blob, name);
    S.settings.lastBackup = Date.now(); save(); drawSheet(); render(); toast('Copia exportada');
  } catch (e) { toast('No se pudo exportar'); }
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    const st = data && data.state;
    if (!st || !Array.isArray(st.plan) || st.plan.length !== 7 || !Array.isArray(st.sessions)) throw new Error('formato');
    if (!confirm(`¿Restaurar la copia del ${data.exportedAt ? fmtDayShort(keyOf(new Date(data.exportedAt))) : '?'}? Reemplaza los datos actuales.`)) return;
    await db.clear().catch(() => {}); photoURLs.clear();
    for (const [k, v] of Object.entries(data.photos || {})) { const b = await (await fetch(v)).blob(); await db.put(k, b); }
    st.onboarded = true;
    S = migrate(st); invalidate(); save(); applyTheme(); closeSheet(); UI.stack = []; UI.tab = 'hoy'; UI.editDay = null; UI.nav = true; render(); toast('Copia restaurada');
  } catch (e) { toast('Ese archivo no es una copia válida'); }
}

/* ═══════════════ Pantalla encendida ═══════════════ */
let wake = null;
async function holdWake() {
  if (!S.settings.wake || wake || !('wakeLock' in navigator) || document.hidden) return;
  try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch (e) { wake = null; }
}
function releaseWake() { if (wake) { wake.release().catch(() => {}); wake = null; } }
function syncWake() {
  const t = top(), s = t && t.type === 'workout' ? S.sessions.find(x => x.id === t.sid) : null;
  if (s && !s.finishedAt) holdWake(); else releaseWake();
}

/* ═══════════════ Eventos ═══════════════ */
let lastTap = { a: '', t: 0 };
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a, now = Date.now();
  if ((a === 'done' || a === 'finish' || a === 'skip') && lastTap.a === a && now - lastTap.t < 500) { e.preventDefault(); return; }
  lastTap = { a, t: now };
  const fn = A[a]; if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.in; if (k && IN[k]) IN[k](e.target); });
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.ch; if (k && CH[k]) CH[k](e.target);
  if (e.target.dataset && e.target.dataset.in === 'weight') { const v = num(e.target.value); e.target.value = v != null ? fk(Math.max(0, round(v))) : ''; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches && e.target.matches('input[data-in="weight"], .pv-h input, .titleinp, .subinp')) e.target.blur();
  if (e.key === 'Escape' && UI.sheet) A.closeSheet();
});
document.addEventListener('focusin', e => {
  if (e.target.matches && e.target.matches('input[data-in="weight"]')) setTimeout(() => { try { e.target.setSelectionRange(0, e.target.value.length); } catch (_) { e.target.select(); } }, 40);
});

let lastDay = todayKey();
function checkDay() {
  const t = todayKey();
  if (t !== lastDay) { lastDay = t; invalidate(); tidySessions(); if (!UI.sheet) { const tp = top(); if (!tp || tp.type !== 'workout') UI.stack = []; render(); } }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDay(); syncWake(); } else save(); });
setInterval(checkDay, 30000);
window.addEventListener('pagehide', save);

/* ═══════════════ Inicio ═══════════════ */
S = load();
applyTheme();
tidySessions();
save();
const live = S.onboarded && S.sessions.find(s => s.date === todayKey() && !s.finishedAt && anyDone(s) && Date.now() - (s.updatedAt || 0) < 4 * 3600e3);
if (live) UI.stack = [{ type: 'workout', sid: live.id }];
render();
gcPhotos();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__rutina = { get state() { return S; }, render, VERSION, planToText, parsedToDays };
})();
