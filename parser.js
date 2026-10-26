/* Lector de rutinas escritas: convierte texto libre (o el formato de la app / de una IA) en días y ejercicios. */
(function (root) {
'use strict';
const DAY_NAMES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAY_ABBR = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const DAY_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SPREAD = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const clean = s => s.replace(/\s+/g, ' ').replace(/^[\s:;,.\-–—|·•*]+|[\s:;,\-–—|·•*]+$/g, '').trim();

const ICON_RULES = [
  [/bulgar|zancad|estocad|lunge|split squat|desplante/, 'bulgarian'],
  [/hip ?thrust|puente de glut|puente glut|glute bridge|empuje de cadera/, 'hipthrust'],
  [/peso muerto|rumano|deadlift|rdl|buenos dias|good morning/, 'rdl'],
  [/sentadilla|squat|hack|goblet/, 'squat'],
  [/prensa|leg press/, 'legpress'],
  [/extension(es)? de (cuadriceps|pierna)|sillon|cuadriceps|leg extension/, 'legext'],
  [/femoral|isquio|leg curl|curl de pierna|camilla/, 'legcurl'],
  [/gemel|talon|pantorrill|calf|soleo/, 'calf'],
  [/abduc|abductor|glute(o)? medio/, 'abduction'],
  [/aduc/, 'abduction'],
  [/patada de glut|patada.*polea|kickback/, 'abduction'],
  [/jalon|dominad|pull ?down|pull ?up|lat\b|polea al pecho/, 'pulldown'],
  [/pecho apoyado|chest supported|remo en banco/, 'row2'],
  [/remo|row|serrucho/, 'row'],
  [/inclinad|incline/, 'incline'],
  [/press (de )?(banca|banco|pecho|plano)|bench|pecho|chest|aperturas?(?! invers)|pec ?deck|cruce|flexiones|push ?up/, 'chestpress'],
  [/militar|press (de )?hombro|hombros?|shoulder|arnold|overhead press/, 'shoulder'],
  [/invers|posterior|face ?pull|pajaro|rear delt|vuelos? posterior/, 'reversefly'],
  [/lateral|vuelos?|elevaciones? de hombro/, 'lateral'],
  [/frances|copa|tras nuca|overhead (tricep|extension)|skull/, 'overhead'],
  [/tricep|fondos|dips|patada|pushdown|soga|cuerda/, 'triceps'],
  [/curl|bicep|martillo|hammer|predicador/, 'curl'],
  [/hiperexten|lumbar|extension de espalda/, 'rdl'],
  [/abdom|tronco|crunch|plancha|plank|core|oblicu|rueda|elevacion de piernas|russian|bicho muerto|dead bug/, 'abs'],
];
const guessIcon = name => { const n = norm(name); for (const [re, k] of ICON_RULES) if (re.test(n)) return k; return 'generic'; };

const MUSCLE_WORDS = /^(piernas?|gluteos?( y piernas?)?|cuadriceps|isquios?|espalda|pecho|hombros?|brazos?|torso|tren (superior|inferior)|full ?body|cuerpo completo|upper|lower|push|pull|legs|empuje|tiron|core|abdomen|abdominales|biceps|triceps|cardio|espalda y biceps|pecho y triceps|pecho y hombros)( [a-e1-9])?$/;
const SKIP_WORDS = /^(calentamiento|calentar|entrada en calor|estirar|estiramiento|elongar|elongacion|movilidad|vuelta a la calma|cardio|caminar|cinta|bici|bicicleta|eliptico|correr|trotar)/;
const REST_WORDS = /^(descanso|off|libre|recuperacion|rest)\b/;
const STARTS_DAY = /^(lunes|martes|miercoles|jueves|viernes|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(dia|day)\s*\d{1,2})\b/;

/* Series y repeticiones */
function findSets(lower) {
  let m;
  // Series: 3 - Reps: 12 / 3 series - 12 reps
  if ((m = lower.match(/series?\s*:?\s*(\d{1,2})\s*[-–,;|\/]?\s*(?:reps?|repeticiones)\s*:?\s*(\d{1,3})(?:\s*(?:-|–|a)\s*(\d{1,3}))?/))) {
    return { at: m.index, len: m[0].length, sets: +m[1], rmin: +m[2], rmax: m[3] ? +m[3] : +m[2] };
  }
  // 4x12-10-8 (pirámide)
  if ((m = lower.match(/(\d{1,2})\s*(?:x|×|\*)\s*(\d{1,3}(?:\s*[-–,\/]\s*\d{1,3}){2,})/))) {
    const nums = m[2].split(/[-–,\/]/).map(n => parseInt(n, 10));
    return { at: m.index, len: m[0].length, sets: +m[1], rmin: Math.min(...nums), rmax: Math.max(...nums) };
  }
  // 3x10, 4 x 8-12, 3x30 seg, 3 por 12, 3x fallo
  if ((m = lower.match(/(\d{1,2})\s*(?:x|×|\*|por)\s*(?:(\d{1,3})(?:\s*(?:-|–|—|a|\/|o|ó)\s*(\d{1,3}))?|(?:al )?(fallo|max(?:imo)?|amrap))\s*(segundos|seg|s\b|"|min\b|minutos)?/))) {
    if (m[4]) return { at: m.index, len: m[0].length, sets: +m[1], rmin: 0, rmax: 0 };
    return { at: m.index, len: m[0].length, sets: +m[1], rmin: +m[2], rmax: m[3] ? +m[3] : +m[2], unit: m[5] ? (/min/.test(m[5]) ? 'min' : 's') : null };
  }
  // 3 series de 12 / 4 sets of 8-10 / 3 series al fallo
  if ((m = lower.match(/(\d{1,2})\s*(?:series|serie|sets?|vueltas|rondas)\s*(?:de|x|×|of|por)?\s*(?:(\d{1,3})(?:\s*(?:-|–|a|\/|o)\s*(\d{1,3}))?|(?:al )?(fallo|max(?:imo)?))?\s*(?:rep\w*)?\s*(segundos|seg|s\b|")?/))) {
    if (m[4]) return { at: m.index, len: m[0].length, sets: +m[1], rmin: 0, rmax: 0 };
    if (m[2]) return { at: m.index, len: m[0].length, sets: +m[1], rmin: +m[2], rmax: m[3] ? +m[3] : +m[2], unit: m[5] ? 's' : null };
    return { at: m.index, len: m[0].length, sets: +m[1], rmin: 8, rmax: 12, guessReps: true };
  }
  // 12-10-8 sin series
  if ((m = lower.match(/(?:^|\s)(\d{1,2}(?:\s*[-–,\/]\s*\d{1,2}){2,})\b/))) {
    const nums = m[1].split(/[-–,\/]/).map(n => parseInt(n, 10));
    if (nums.every(n => n > 0 && n <= 30)) return { at: m.index, len: m[0].length, sets: nums.length, rmin: Math.min(...nums), rmax: Math.max(...nums) };
  }
  // 12 reps / 15 repeticiones / 45 seg
  if ((m = lower.match(/(\d{1,3})(?:\s*(?:-|–|a)\s*(\d{1,3}))?\s*(reps?|repeticiones|rep\.|segundos|seg\b|s\b|")/))) {
    const sec = /^s|"/.test(m[3]) && !/^rep/.test(m[3]);
    return { at: m.index, len: m[0].length, sets: 3, rmin: +m[1], rmax: m[2] ? +m[2] : +m[1], unit: sec ? 's' : null, guessSets: true };
  }
  return null;
}

function parseExercise(raw, blockRest) {
  let s = raw;
  const notes = [];
  // nota: ... / (texto)
  s = s.replace(/\bnotas?\s*:\s*(.+)$/i, (_, t) => { notes.push(t.trim()); return ''; });
  s = s.replace(/\(([^)]{2,120})\)/g, (_, t) => { notes.push(t.trim()); return ' '; });
  const fields = s.split('|').map(x => x.trim()).filter(Boolean);
  let text = fields.join(' | ');
  let lower = text.toLowerCase();
  const n = norm(text);
  const ex = { name: '', sets: 3, rmin: 8, rmax: 12, unit: 'reps', uni: false, rest: '', note: '', flags: [] };

  if (/\b(por|x|c\/|cada)\s*(pierna|lado|brazo)\b|\bc\/\s*(pierna|lado)|\bunilateral|\balternad[oa]s?\b|\bc\/u\b/.test(n)) ex.uni = true;
  const restM = n.match(/\bdesc(?:anso|\.)?\s*:?\s*(\d+\s*(?:'|’)?\s*\d*\s*(?:-|–|a)?\s*\d*\s*(?:min(?:utos)?|m\b|seg(?:undos)?|s\b|"|'')?)/);
  if (restM) ex.rest = restM[1].replace(/\s+/g, ' ').replace(/segundos|seg/, 's').replace(/minutos/, 'min').replace(/(\d)\s*m$/, '$1 min').trim();
  else if (blockRest) ex.rest = blockRest;

  const sm = findSets(lower);
  let name, rest;
  if (sm) {
    ex.sets = Math.min(Math.max(sm.sets || 3, 1), 12);
    ex.rmin = Math.min(sm.rmin, 300); ex.rmax = Math.min(sm.rmax, 300);
    if (sm.unit === 's') ex.unit = 's';
    if (sm.unit === 'min') { ex.unit = 's'; ex.rmin *= 60; ex.rmax *= 60; }
    if (sm.guessReps) ex.flags.push('reps');
    if (sm.guessSets) ex.flags.push('series');
    const before = text.slice(0, sm.at), after = text.slice(sm.at + sm.len);
    name = clean(before.replace(/\|/g, ' ')) ? before : after;
    rest = name === before ? after : '';
  } else {
    ex.flags.push('series', 'reps');
    name = text; rest = '';
  }
  // limpiar nombre
  name = name.split('|')[0];
  name = name.replace(/\b(por|c\/|cada)\s*(pierna|lado|brazo)\b|\bc\/\s*(pierna|lado)/gi, ' ')
             .replace(/\bdesc(?:anso|\.)?\s*:?\s*\d+[^a-z]*(min(?:utos)?|seg(?:undos)?|s|m)?\b/gi, ' ')
             .replace(/\b\d+(?:[.,]\d+)?\s*(kg|kilos?|lb)\b/gi, ' ');
  name = clean(name);
  // texto extra → nota
  const leftovers = [];
  fields.slice(1).forEach(f => {
    const nf = norm(f);
    if (findSets(f.toLowerCase()) || /^(por|c\/|cada)\s*(pierna|lado|brazo)|^unilateral|^desc/.test(nf)) return;
    if (/^opcional$/.test(nf)) return;
    leftovers.push(f);
  });
  if (rest && fields.length <= 1) {
    const r = clean(rest.replace(/\b(por|c\/|cada)\s*(pierna|lado|brazo)\b|\bunilateral\b|\bdesc(?:anso|\.)?\s*:?\s*\d+[^a-z]*(min(?:utos)?|seg(?:undos)?|s|m)?\b|\breps?\b|\brepeticiones\b/gi, ' '));
    if (/[a-zA-Záéíóúñ]{3,}/.test(r) || /\d+\s*(kg|kilos)/i.test(r)) leftovers.push(r);
  }
  ex.note = clean([...leftovers.filter(l => !/^\s*$/.test(l)), ...notes].join('. ').replace(/\.\s*\./g, '.'));
  ex.name = cap(name).slice(0, 60);
  ex.icon = guessIcon(ex.name);
  return ex;
}

function weekdayIn(n) {
  for (let i = 0; i < 7; i++) {
    const re = new RegExp(`\\b(${DAY_NAMES[i]}|${DAY_EN[i]})\\b`);
    if (re.test(n)) return i;
  }
  const m = n.match(/^(lun|mar|mie|jue|vie|sab|dom)\b\.?/);
  return m ? DAY_ABBR.indexOf(m[1]) : null;
}

function isHeader(line, n, hasSets) {
  if (/^#{1,6}\s*/.test(line)) return true;
  if (hasSets) return false;
  if (weekdayIn(n) !== null && (n.length < 90 || STARTS_DAY.test(n))) return true;
  if (/^(dia|day|rutina|entrenamiento|entreno|sesion|semana|bloque|workout)\s*(\d+|[a-e]|uno|dos|tres|cuatro|cinco)\b/.test(n)) return true;
  if (/^(rutina|entrenamiento|entreno|sesion|workout)\s+[a-z]/.test(n) && n.length < 40) return true;
  if (/:$/.test(line.trim()) && n.length < 50) return true;
  if (REST_WORDS.test(n) && n.length < 30) return true;
  const letters = line.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase() && n.length < 40) return true;
  if (MUSCLE_WORDS.test(clean(n.replace(/[#:*]/g, '')))) return true;
  return false;
}

function parseHeader(line) {
  let t = line.replace(/^#{1,6}\s*/, '').replace(/\*+/g, '').trim().replace(/:$/, '');
  const n = norm(t);
  const block = { weekday: weekdayIn(n), title: '', sub: '', type: 'train', exercises: [], rest: '' };
  if (/\bopcional\b/.test(n)) block.type = 'optional';
  let parts = t.split(/\s*\|\s*|\s+[-–—]\s+|:\s+/).map(clean).filter(Boolean);
  parts = parts.filter(p => {
    const np = norm(p);
    if (block.weekday !== null && new RegExp(`^(${DAY_NAMES[block.weekday]}|${DAY_EN[block.weekday]}|${DAY_ABBR[block.weekday]}\\.?)$`).test(np)) return false;
    if (/^\(?opcional\)?$/.test(np)) return false;
    return true;
  }).map(p => p.replace(/\(?\s*opcional\s*\)?/i, '').trim()).filter(Boolean);
  // quitar el nombre del día pegado al título ("Lunes piernas")
  if (block.weekday !== null && parts.length) {
    parts[0] = clean(parts[0].replace(new RegExp(`^(${DAY_NAMES[block.weekday]}|${DAY_EN[block.weekday]})\\b`, 'i'), '').replace(/^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i, ''));
    if (!parts[0]) parts.shift();
  }
  const sentence = x => (x && x === x.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(x)) ? cap(x.toLowerCase()) : x;
  parts = parts.map(sentence);
  // "Día 1 - Glúteos": el número pasa a etiqueta y el grupo muscular es el título
  if (parts.length > 1 && /^(dia|day|rutina|entrenamiento|entreno|sesion|bloque|workout)\s*(\d+|[a-e])$/.test(norm(parts[0]))) {
    block.label = cap(parts[0]); parts.shift();
  }
  let title = parts[0] || '', sub = parts[1] || '';
  const nt = norm(title);
  const dn = nt.match(/^(dia|day|rutina|entrenamiento|entreno|sesion|bloque|workout)\s*(\d+|[a-e])\b\s*[-–.:]?\s*(.*)$/);
  if (dn && dn[3]) { block.label = cap(dn[1]) + ' ' + dn[2].toUpperCase(); title = cap(clean(title.slice(title.length - dn[3].length))); }
  if (REST_WORDS.test(norm(title)) || (!title && REST_WORDS.test(n))) { block.type = 'rest'; title = 'Descanso'; }
  block.title = cap(title).slice(0, 40);
  block.sub = cap(sub).slice(0, 60);
  return block;
}

function preclean(raw) {
  return raw.replace(/\t/g, ' ').replace(/ /g, ' ').replace(/\*\*|__/g, '')
    .replace(/(^|\s)\*(\S(?:[^*]*\S)?)\*(?=\s|$|[.,:;])/g, '$1$2').replace(/`/g, '').trim();
}
/* Filas de tabla markdown: | Ejercicio | Series | Reps | Descanso | */
function tableRow(line) {
  if (!/^\|.*\|$/.test(line)) return null;
  const cells = line.slice(1, -1).split('|').map(c => c.trim());
  if (cells.every(c => !c || /^:?-{2,}:?$/.test(c))) return '';
  if (/^(ejercicio|ejercicios|exercise|nombre|movimiento|dia)$/.test(norm(cells[0]))) return '';
  if (cells.length >= 3 && /^\d{1,2}$/.test(cells[1]) && /\d/.test(cells[2])) {
    let out = `${cells[0]} ${cells[1]}x${cells[2].replace(/\s*(reps?|repeticiones)\s*/i, '')}`;
    cells.slice(3).forEach(c => {
      if (!c || c === '-') return;
      if (/^\d/.test(c) && /(seg|s\b|min|'|")/i.test(c)) out += ` | desc ${c}`; else out += ` | ${c}`;
    });
    return out;
  }
  return cells.filter(Boolean).join(' | ');
}

function parse(text) {
  const warnings = [];
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let cur = null;
  for (const rawLine of lines) {
    let line = preclean(rawLine);
    if (!line || /^```/.test(line) || /^[-=_*~]{3,}$/.test(line)) continue;
    const hash = /^#{1,6}/.test(line);
    const tr = tableRow(line);
    if (tr === '') continue;
    if (tr) line = tr;
    const bullet = /^\s*(?:[-*•·▪►>✅✔☑️🔹🔸]+|\d{1,2}[.)]\s|[a-h][.)]\s)/u.test(line);
    line = line.replace(/^\s*(?:[-*•·▪►>✅✔☑️🔹🔸]+|\d{1,2}[.)](?=\s)|[a-h][.)](?=\s))\s*/u, '').trim();
    if (!line) continue;
    const n = norm(line);
    const hasSets = !!findSets(line.toLowerCase());
    const startsDay = STARTS_DAY.test(n.replace(/^#+\s*/, ''));
    if (hash || (startsDay && !hasSets) || (!bullet && isHeader(line, n, hasSets))) {
      const b = parseHeader(line);
      if (/^rutina$|^mi rutina$|^routine$/.test(norm(b.title)) && b.weekday === null && !b.label) continue;
      cur = b; blocks.push(cur); continue;
    }
    // "Descanso 1 min entre series" fija el descanso; "Descanso | 0x0" o "Descanso" marcan día libre
    if (/^desc(anso|\.)?\b/.test(n)) {
      const tm = n.replace(/\b0\s*[x×]\s*0\b/, '').match(/(\d+\s*(?:'|’)?\s*\d*\s*(?:-|–|a)?\s*\d*\s*(?:min(?:utos)?|m\b|seg(?:undos)?|s\b|"|''))/);
      if (tm && cur) {
        const r = tm[1].replace(/\s+/g, ' ').replace(/segundos|seg/, 's').replace(/minutos/, 'min').replace(/(\d)\s*m$/, '$1 min').trim();
        cur.rest = r; cur.exercises.forEach(e => { if (!e.rest) e.rest = r; });
      } else if (cur && !cur.exercises.length) cur.type = 'rest';
      continue;
    }
    if (/^(off|libre|recuperacion|rest|ninguno|nada|-+)$/.test(clean(n.split('|')[0])) || /^\s*0\s*[x×]\s*0\b/.test(n) || /\|\s*0\s*[x×]\s*0\b/.test(n)) continue;
    if (SKIP_WORDS.test(n) && !hasSets) { warnings.push(line); continue; }
    if (!hasSets && (line.length > 70 || /[.!?]$/.test(line) && line.split(' ').length > 6)) { warnings.push(line); continue; }
    if (!/[a-zA-Záéíóúñ]{3,}/.test(line)) { warnings.push(line); continue; }
    if (!cur) { cur = { weekday: null, title: '', sub: '', type: 'train', exercises: [], rest: '' }; blocks.push(cur); }
    const ex = parseExercise(line, cur.rest);
    if (!ex.name || ex.name.length < 3) { warnings.push(line); continue; }
    if (cur.type === 'rest') { cur.type = 'train'; if (/^descanso$/i.test(cur.title)) cur.title = ''; }
    cur.exercises.push(ex);
  }
  const useful = blocks.filter(b => b.exercises.length || (b.weekday !== null && b.type === 'rest'));
  return { blocks: useful, warnings };
}

/* Reparte los bloques en la semana */
function toWeek(blocks) {
  const week = Array(7).fill(null);
  const train = blocks.filter(b => b.type !== 'rest' || b.exercises.length);
  const extra = [];
  blocks.forEach(b => { if (b.weekday !== null && !week[b.weekday]) week[b.weekday] = b; });
  const pending = blocks.filter(b => !week.includes(b));
  const pattern = SPREAD[Math.min(7, Math.max(1, train.length))] || SPREAD[7];
  pending.forEach(b => {
    let slot = pattern.find(i => !week[i]);
    if (slot === undefined) slot = week.findIndex(x => !x);
    if (slot === -1) extra.push(b); else week[slot] = b;
  });
  let label = 0;
  const days = week.map((b, i) => {
    if (!b) return { title: 'Descanso', sub: '', type: 'rest', exercises: [] };
    label++;
    const title = b.title || b.label || (b.type === 'rest' ? 'Descanso' : `Entrenamiento ${String.fromCharCode(64 + label)}`);
    return { title, sub: b.sub || '', type: b.exercises.length ? (b.type === 'rest' ? 'train' : b.type) : 'rest', exercises: b.exercises };
  });
  return { days, dropped: extra.length };
}

const api = { parse, toWeek, guessIcon, findSets, parseExercise, norm };
if (typeof module !== 'undefined') module.exports = api; else root.RutinaParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
