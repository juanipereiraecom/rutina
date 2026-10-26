/* Ilustraciones, íconos y rutinas armadas */
(function (root) {
'use strict';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const PICS = {
  squat:      ['Sentadilla',    '<circle cx="32" cy="11" r="4.5"/><path class="t" d="M15 19H49"/><path d="M32 16v3M32 19l-2 16M30 35l11 4-3 14M30 35l-9 5 4 13"/><path class="f" d="M12 56h40"/>'],
  legpress:   ['Prensa',        '<path class="f t" d="M9 48l11-25"/><circle cx="20" cy="16" r="4.5"/><path d="M21 22l5 17M26 39l11-9 9 8"/><path class="t" d="M43 47l11-15"/>'],
  legext:     ['Extensión',     '<circle cx="17" cy="13" r="4.5"/><path class="f" d="M14 44l-2-20M16 44h16M18 44v10M30 44v10"/><path d="M18 19l3 22h15l13-8"/><circle class="a" cx="51" cy="32" r="3"/>'],
  legcurl:    ['Curl femoral',  '<circle cx="14" cy="14" r="4.5"/><path class="f" d="M11 41l-1-18M11 41h22"/><path d="M15 20l3 18h17l-1 14"/><circle class="a" cx="37" cy="51" r="3"/>'],
  calf:       ['Talones',       '<circle cx="30" cy="9" r="4.5"/><path d="M30 14v20M30 19l-6 10M30 19l6 10M30 34l-2 13M30 34l2 13M28 47l-1 4M32 47l1 4"/><rect class="f" x="20" y="51" width="20" height="5" rx="1.5"/><path class="a" d="M48 38V24M44 28l4-4 4 4"/>'],
  abduction:  ['Abducción',     '<circle cx="26" cy="9" r="4.5"/><path d="M26 14v21M26 19l-6 10M26 35l-1 19M26 35l16 12"/><path class="d" d="M42 47l14 7"/><path class="f" d="M16 56h22"/>'],
  hipthrust:  ['Hip thrust',    '<rect class="f" x="5" y="31" width="12" height="14" rx="2"/><circle cx="11" cy="24" r="4.5"/><path d="M15 30l18-3 10 8v16M40 54h9"/><circle class="a" cx="33" cy="22" r="4"/><path class="t" d="M23 22h20"/>'],
  rdl:        ['Peso muerto',   '<circle cx="50" cy="24" r="4.5"/><path d="M24 30l21-5M24 30l3 12-2 12M41 26v14"/><path class="t" d="M37 41h10"/><path class="f" d="M12 56h40"/>'],
  bulgarian:  ['Búlgara',       '<circle cx="30" cy="9" r="4.5"/><path d="M30 14l-1 18M29 32l10 7-1 15M29 32l-9 10-8-5"/><rect class="f" x="3" y="36" width="13" height="6" rx="1.5"/><path class="f" d="M30 56h16"/>'],
  chestpress: ['Press pecho',   '<path class="f" d="M15 48l3-30M14 43h20"/><circle cx="21" cy="12" r="4.5"/><path d="M20 18l2 22M21 24h23M22 40h14v12"/><path class="t" d="M46 17v14"/>'],
  incline:    ['Press inclinado','<path class="f t" d="M14 41l20 9"/><circle cx="14" cy="27" r="4.5"/><path d="M18 32l16 14M19 33l3-19M34 46h10v10"/><path class="t" d="M16 12h12"/>'],
  shoulder:   ['Press hombros', '<circle cx="32" cy="21" r="4.5"/><path d="M32 27v19M32 29l-10 3V16M32 29l10 3V16M32 46h12v10"/><path class="t" d="M17 14h10M37 14h10"/>'],
  pulldown:   ['Jalón',         '<path class="t" d="M12 9h40"/><path class="d" d="M32 3v6"/><circle cx="32" cy="25" r="4.5"/><path d="M17 9l9 21M47 9l-9 21M32 30v14M32 44h12v12"/><path class="f" d="M22 47h20"/>'],
  row:        ['Remo',          '<circle cx="38" cy="15" r="4.5"/><path d="M38 21l2 19M39 26l-14 2M40 40l-17 2-2 8"/><path class="t" d="M23 23v10"/><path class="d" d="M23 28H6"/><path class="t f" d="M16 40v12"/>'],
  row2:       ['Remo apoyado',  '<path class="f t" d="M18 54l16-32"/><circle cx="40" cy="17" r="4.5"/><path d="M36 22L21 46M30 31l2 13M21 46l-6 10"/><path class="t" d="M27 46h10"/>'],
  reversefly: ['Apert. inversas','<circle cx="32" cy="23" r="4.5"/><path d="M32 29v17M32 31l-15-5M32 31l15-5M32 46h11v10"/><circle class="a" cx="14" cy="25" r="2.6"/><circle class="a" cx="50" cy="25" r="2.6"/>'],
  lateral:    ['Laterales',     '<circle cx="32" cy="11" r="4.5"/><path d="M32 16v22M32 21l15 3M32 21l-15 3M32 38l-4 16M32 38l4 16"/><circle class="a" cx="50" cy="24" r="2.6"/><circle class="a" cx="14" cy="24" r="2.6"/>'],
  curl:       ['Curl bíceps',   '<circle cx="28" cy="9" r="4.5"/><path d="M28 14v22M28 19l3 12 10-9M28 36l-3 18M28 36l4 18"/><path class="t" d="M39 17l5 7"/>'],
  triceps:    ['Tríceps polea', '<circle cx="26" cy="11" r="4.5"/><path d="M26 16l2 21M27 21l4 11 6 9M28 37l-3 18M28 37l5 18"/><path class="d" d="M38 40l8-36"/><path class="t" d="M35 43l5-4"/>'],
  overhead:   ['Tríceps arriba','<circle cx="32" cy="19" r="4.5"/><path d="M32 25v18M29 25l-3-16 6 7M35 25l3-16-6 7M32 43l-4 13M32 43l4 13"/><path class="t" d="M28 15h8"/>'],
  abs:        ['Abdominales',   '<path class="f" d="M14 46h22"/><circle cx="35" cy="17" r="4.5"/><path d="M28 44c-7-6-7-15 3-22M30 26l10 6M28 44h13v11"/>'],
  generic:    ['Genérico',      '<path class="t" d="M14 32h36"/><rect x="8" y="23" width="6" height="18" rx="2"/><rect x="50" y="23" width="6" height="18" rx="2"/><rect x="3" y="27" width="5" height="10" rx="1.5"/><rect x="56" y="27" width="5" height="10" rx="1.5"/>'],
};

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/>',
  shapes: '<circle cx="8" cy="8" r="4"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M15 3l4 7h-8z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .3 1.6 1 2.6 2.1 3 0-3 .1-5.6.5-8z"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="1.6" fill="currentColor" stroke="none"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  zoom: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M9.5 17h5"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  bar: '<path d="M3 12h18" stroke-width="2.4"/><rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/>',
};

/* ——— Rutinas armadas ——— */
function e(name, sets, rmin, rmax, icon, note, o) {
  o = o || {};
  return { id: uid(), name, sets, rmin, rmax, unit: o.unit || 'reps', icon, note: note || '', rest: o.rest || '', uni: !!o.uni, photo: null };
}
const R = (title, sub, exercises, type) => ({ title, sub, type: type || 'train', exercises });
const REST = () => ({ title: 'Descanso', sub: '', type: 'rest', exercises: [] });
const B = '2–3 min', I = '60–90 s';

const TEMPLATES = [
  { id: 'fb3', name: 'Cuerpo completo', days: '3 días', desc: 'Ideal para empezar o con poco tiempo. Todo el cuerpo en cada sesión, con días de descanso en el medio.',
    plan: () => [
      R('Cuerpo completo A', 'Fuerza general', [e('Sentadilla', 3, 8, 10, 'squat', '', { rest: B }), e('Press de banca', 3, 8, 10, 'chestpress', '', { rest: B }), e('Jalón al pecho', 3, 10, 12, 'pulldown', '', { rest: I }), e('Peso muerto rumano', 3, 10, 12, 'rdl', '', { rest: B }), e('Elevaciones laterales', 3, 12, 15, 'lateral', '', { rest: I }), e('Plancha', 3, 30, 45, 'abs', '', { unit: 's', rest: I })]),
      REST(),
      R('Cuerpo completo B', 'Volumen', [e('Prensa de piernas', 3, 10, 12, 'legpress', '', { rest: B }), e('Press inclinado con mancuernas', 3, 8, 12, 'incline', '', { rest: B }), e('Remo sentado en polea', 3, 10, 12, 'row', '', { rest: I }), e('Curl femoral', 3, 10, 12, 'legcurl', '', { rest: I }), e('Curl de bíceps', 3, 10, 12, 'curl', '', { rest: I }), e('Tríceps en polea', 3, 10, 12, 'triceps', '', { rest: I })]),
      REST(),
      R('Cuerpo completo C', 'Glúteos y espalda', [e('Hip thrust', 3, 8, 12, 'hipthrust', '', { rest: B }), e('Press militar', 3, 8, 10, 'shoulder', '', { rest: B }), e('Remo con pecho apoyado', 3, 10, 12, 'row2', '', { rest: I }), e('Zancadas', 3, 10, 12, 'bulgarian', '', { rest: I, uni: true }), e('Aperturas inversas', 3, 12, 15, 'reversefly', '', { rest: I }), e('Abdominales en máquina', 3, 12, 15, 'abs', '', { rest: I })]),
      REST(), REST()] },
  { id: 'tl4', name: 'Torso / Pierna', days: '4 días', desc: 'Equilibrio entre fuerza e hipertrofia. Cada grupo muscular se entrena dos veces por semana.',
    plan: () => [
      R('Torso A', 'Fuerza', [e('Press de banca', 4, 6, 8, 'chestpress', '', { rest: B }), e('Remo con barra', 4, 6, 8, 'row', '', { rest: B }), e('Press militar', 3, 8, 10, 'shoulder', '', { rest: B }), e('Jalón al pecho', 3, 10, 12, 'pulldown', '', { rest: I }), e('Curl de bíceps', 3, 10, 12, 'curl', '', { rest: I }), e('Tríceps en polea', 3, 10, 12, 'triceps', '', { rest: I })]),
      R('Pierna A', 'Cuádriceps', [e('Sentadilla', 4, 6, 8, 'squat', '', { rest: B }), e('Prensa de piernas', 3, 10, 12, 'legpress', '', { rest: B }), e('Extensión de cuádriceps', 3, 12, 15, 'legext', '', { rest: I }), e('Curl femoral', 3, 10, 12, 'legcurl', '', { rest: I }), e('Elevación de talones', 4, 12, 15, 'calf', '', { rest: I })]),
      REST(),
      R('Torso B', 'Hipertrofia', [e('Press inclinado con mancuernas', 3, 8, 12, 'incline', '', { rest: B }), e('Jalón con agarre neutro', 3, 10, 12, 'pulldown', '', { rest: I }), e('Remo con pecho apoyado', 3, 10, 12, 'row2', '', { rest: I }), e('Elevaciones laterales', 4, 12, 20, 'lateral', '', { rest: I }), e('Aperturas inversas', 3, 12, 15, 'reversefly', '', { rest: I }), e('Extensión de tríceps sobre la cabeza', 3, 10, 12, 'overhead', '', { rest: I })]),
      R('Pierna B', 'Cadena posterior', [e('Peso muerto rumano', 4, 8, 10, 'rdl', '', { rest: B }), e('Hip thrust', 3, 8, 12, 'hipthrust', '', { rest: B }), e('Sentadilla búlgara', 3, 8, 10, 'bulgarian', '', { rest: B, uni: true }), e('Curl femoral sentado', 3, 10, 15, 'legcurl', '', { rest: I }), e('Abducción de cadera', 3, 12, 15, 'abduction', '', { rest: I }), e('Abdominales', 3, 12, 15, 'abs', '', { rest: I })]),
      REST(), REST()] },
  { id: 'ppl5', name: 'Empuje · Tirón · Piernas', days: '5 días', desc: 'Para quienes ya entrenan seguido. Más volumen, sesiones enfocadas por patrón de movimiento.',
    plan: () => [
      R('Empuje', 'Pecho, hombros y tríceps', [e('Press de banca', 4, 6, 10, 'chestpress', '', { rest: B }), e('Press inclinado con mancuernas', 3, 8, 12, 'incline', '', { rest: B }), e('Press militar', 3, 8, 10, 'shoulder', '', { rest: B }), e('Elevaciones laterales', 3, 12, 20, 'lateral', '', { rest: I }), e('Tríceps en polea', 3, 10, 12, 'triceps', '', { rest: I }), e('Extensión de tríceps sobre la cabeza', 3, 10, 12, 'overhead', '', { rest: I })]),
      R('Tirón', 'Espalda y bíceps', [e('Dominadas o jalón al pecho', 4, 6, 10, 'pulldown', '', { rest: B }), e('Remo con barra', 3, 8, 10, 'row', '', { rest: B }), e('Remo con pecho apoyado', 3, 10, 12, 'row2', '', { rest: I }), e('Face pull', 3, 12, 15, 'reversefly', '', { rest: I }), e('Curl de bíceps', 3, 10, 12, 'curl', '', { rest: I }), e('Curl martillo', 3, 10, 12, 'curl', '', { rest: I })]),
      R('Piernas', 'Cuádriceps e isquios', [e('Sentadilla', 4, 6, 10, 'squat', '', { rest: B }), e('Peso muerto rumano', 3, 8, 10, 'rdl', '', { rest: B }), e('Prensa de piernas', 3, 10, 12, 'legpress', '', { rest: B }), e('Curl femoral', 3, 10, 12, 'legcurl', '', { rest: I }), e('Elevación de talones', 4, 12, 15, 'calf', '', { rest: I })]),
      REST(),
      R('Torso', 'Volumen de pecho y espalda', [e('Press inclinado en máquina', 3, 8, 10, 'incline', '', { rest: B }), e('Jalón con agarre neutro', 3, 10, 12, 'pulldown', '', { rest: I }), e('Press de pecho en máquina', 3, 10, 12, 'chestpress', '', { rest: I }), e('Remo sentado en polea', 3, 10, 12, 'row', '', { rest: I }), e('Elevaciones laterales', 3, 15, 20, 'lateral', '', { rest: I }), e('Curl de bíceps en polea', 3, 12, 15, 'curl', '', { rest: I })]),
      R('Piernas B', 'Glúteos y unilateral', [e('Hip thrust', 4, 8, 12, 'hipthrust', '', { rest: B }), e('Sentadilla búlgara', 3, 8, 10, 'bulgarian', '', { rest: B, uni: true }), e('Extensión de cuádriceps', 3, 12, 15, 'legext', '', { rest: I }), e('Curl femoral sentado', 3, 10, 15, 'legcurl', '', { rest: I }), e('Abdominales en máquina', 3, 12, 15, 'abs', '', { rest: I })]),
      REST()] },
  { id: 'glu4', name: 'Glúteos y piernas', days: '4 días', desc: 'Foco en tren inferior y glúteos, con un día de tren superior para mantener el equilibrio.',
    plan: () => [
      R('Glúteos e isquios', 'Cadena posterior', [e('Hip thrust', 4, 8, 12, 'hipthrust', '', { rest: B }), e('Peso muerto rumano', 3, 10, 12, 'rdl', '', { rest: B }), e('Patada de glúteo en polea', 3, 12, 15, 'abduction', '', { rest: I, uni: true }), e('Abducción en máquina', 3, 15, 20, 'abduction', '', { rest: I }), e('Curl femoral', 3, 10, 15, 'legcurl', '', { rest: I })]),
      R('Tren superior', 'Espalda, hombros y brazos', [e('Jalón al pecho', 3, 10, 12, 'pulldown', '', { rest: I }), e('Remo sentado en polea', 3, 10, 12, 'row', '', { rest: I }), e('Press de hombros con mancuernas', 3, 10, 12, 'shoulder', '', { rest: I }), e('Elevaciones laterales', 3, 12, 15, 'lateral', '', { rest: I }), e('Press de pecho en máquina', 3, 10, 12, 'chestpress', '', { rest: I }), e('Tríceps en polea', 3, 12, 15, 'triceps', '', { rest: I })]),
      REST(),
      R('Cuádriceps y glúteos', 'Fuerza de piernas', [e('Sentadilla', 4, 8, 10, 'squat', '', { rest: B }), e('Sentadilla búlgara', 3, 10, 10, 'bulgarian', '', { rest: B, uni: true }), e('Prensa de piernas', 3, 12, 15, 'legpress', '', { rest: B }), e('Extensión de cuádriceps', 3, 12, 15, 'legext', '', { rest: I }), e('Elevación de talones', 3, 15, 20, 'calf', '', { rest: I })]),
      R('Glúteos y core', 'Bombeo y estabilidad', [e('Puente de glúteos', 3, 12, 15, 'hipthrust', '', { rest: I }), e('Estocadas caminando', 3, 12, 12, 'bulgarian', '', { rest: I, uni: true }), e('Abducción en máquina', 3, 20, 20, 'abduction', '', { rest: I }), e('Plancha', 3, 30, 45, 'abs', '', { unit: 's', rest: I }), e('Crunch en máquina', 3, 15, 15, 'abs', '', { rest: I })]),
      REST(), REST()] },
  { id: 'knee5', name: 'Fuerza con rodilla operada', days: '5 días', desc: 'Prioriza recuperar la pierna operada con trabajo unilateral. Las cargas siempre según tu kinesiólogo.',
    plan: () => kneePlan() },
];

function kneePlan() {
  const BIG = '2–3 min', ISO = '60–120 s';
  return [
    R('Piernas A', 'Cuádriceps y fuerza general', [
      e('Sentadilla con barra o multipower', 3, 6, 10, 'squat', 'Ejercicio principal de fuerza. Usá solo el rango y la variante aprobados para tu rodilla.', { rest: BIG }),
      e('Prensa de piernas', 3, 8, 12, 'legpress', 'Volumen adicional para cuádriceps y glúteos.', { rest: BIG }),
      e('Extensión de cuádriceps', 3, 10, 15, 'legext', 'Trabajo directo del cuádriceps, clave para recuperar la fuerza de la rodilla. Rango y carga según rehabilitación.', { rest: ISO }),
      e('Elevación de talones', 3, 10, 15, 'calf', 'Gemelos y capacidad de empuje del tobillo.', { rest: ISO }),
      e('Abducción de cadera en polea o máquina', 2, 12, 15, 'abduction', 'Glúteo medio y control de la pelvis. Las reps son por lado.', { rest: ISO })]),
    R('Tren superior A', 'Pecho, espalda, hombros y brazos', [
      e('Press de pecho en máquina o banca', 3, 6, 10, 'chestpress', '', { rest: BIG }), e('Jalón al pecho', 3, 8, 12, 'pulldown', '', { rest: BIG }),
      e('Remo sentado en polea', 3, 8, 12, 'row', '', { rest: BIG }), e('Press de hombros sentado', 3, 8, 12, 'shoulder', '2 o 3 series según cómo llegues.', { rest: BIG }),
      e('Elevaciones laterales', 3, 12, 20, 'lateral', '', { rest: ISO }), e('Curl de bíceps', 3, 10, 15, 'curl', '', { rest: ISO }), e('Tríceps en polea con cuerda', 3, 10, 15, 'triceps', '', { rest: ISO })]),
    R('Piernas B', 'Isquiotibiales, glúteos y trabajo unilateral', [
      e('Peso muerto rumano con mancuernas', 3, 8, 12, 'rdl', 'Cadena posterior: glúteos e isquiotibiales. Confirmá la carga con tu kinesiólogo.', { rest: BIG }),
      e('Curl femoral sentado', 3, 10, 15, 'legcurl', 'Fortalece directamente los isquiotibiales. Especialmente relevante tras un injerto de este grupo muscular.', { rest: ISO }),
      e('Hip thrust', 3, 8, 12, 'hipthrust', 'Trabajo directo de glúteos, con poca carga sobre la espalda.', { rest: BIG }),
      e('Prensa unilateral', 3, 8, 12, 'legpress', 'Permite comparar y trabajar cada lado por separado. Solo si tu kinesiólogo autorizó la carga unilateral.', { rest: BIG, uni: true })]),
    R('Tren superior B', 'Espalda, pecho, hombros y brazos', [
      e('Press inclinado con mancuernas', 3, 8, 12, 'incline', '', { rest: BIG }), e('Remo con pecho apoyado', 3, 8, 12, 'row2', '', { rest: BIG }),
      e('Jalón al pecho con agarre neutro', 3, 8, 12, 'pulldown', '', { rest: BIG }), e('Aperturas inversas en máquina', 3, 12, 15, 'reversefly', 'Deltoides posteriores y parte alta de la espalda.', { rest: ISO }),
      e('Curl de bíceps inclinado', 3, 10, 15, 'curl', '', { rest: ISO }), e('Extensión de tríceps por encima de la cabeza', 3, 10, 15, 'overhead', '', { rest: ISO })]),
    R('Piernas C', 'Fuerza unilateral y complemento', [
      e('Sentadilla búlgara', 3, 8, 10, 'bulgarian', 'Fuerza unilateral de cuádriceps y glúteos. Requiere autorización para este nivel de carga y control.', { rest: BIG, uni: true }),
      e('Sentadilla con carga moderada', 3, 8, 10, 'squat', 'Variante aprobada. Si el lunes hiciste sentadilla pesada, usá una más liviana.', { rest: BIG }),
      e('Extensión de cuádriceps unilateral', 3, 10, 15, 'legext', 'Sirve para detectar y reducir diferencias de fuerza entre lados.', { rest: ISO, uni: true }),
      e('Elevación de talones', 3, 12, 15, 'calf', 'Si llegás muy fatigado, alternalo con el lunes.', { rest: ISO })]),
    R('Opcional', 'Brazos, hombros y abdominales', [
      e('Elevaciones laterales', 3, 15, 20, 'lateral', '', { rest: ISO }), e('Curl de bíceps en polea', 3, 10, 15, 'curl', '', { rest: ISO }),
      e('Tríceps con cuerda', 3, 10, 15, 'triceps', '', { rest: ISO }), e('Abdominales en máquina', 3, 10, 15, 'abs', '', { rest: ISO })], 'optional'),
    REST()];
}

const THEMES = [
  { id: 'brasa', name: 'Brasa', a: '#FF5A1F', l: '#F2F2EF', d: '#0C0C0B' },
  { id: 'lima', name: 'Lima', a: '#C8F031', l: '#EEF0EC', d: '#0A0B09' },
  { id: 'oceano', name: 'Océano', a: '#2E6BFF', l: '#EDF0F5', d: '#090B10' },
  { id: 'flamenco', name: 'Flamenco', a: '#FF4D8D', l: '#F5F0F1', d: '#0E0B0C' },
  { id: 'bosque', name: 'Bosque', a: '#1F7A57', ad: '#3DBB86', l: '#EFF1EC', d: '#0A0C0A' },
  { id: 'violeta', name: 'Violeta', a: '#6C4DFF', ad: '#8C75FF', l: '#F0EFF5', d: '#0B0A10' },
  { id: 'grafito', name: 'Grafito', a: '#1C1C1C', ad: '#ECECE8', l: '#F2F2EF', d: '#0C0C0B' },
];

const AI_PROMPT = `Convertí la rutina de gimnasio que te paso al final al formato exacto de abajo. Respondé SOLO con la rutina en ese formato, sin explicaciones ni texto extra.

FORMATO:
## Día de la semana | Nombre del día | Descripción corta
- Ejercicio | series x repeticiones | detalles opcionales

REGLAS:
- Usá los días Lunes a Domingo. Si la rutina no dice días, repartilos (ej.: 3 días → Lunes, Miércoles y Viernes).
- Repeticiones como "3x10" o con rango "4x8-12". Por tiempo: "3x30 seg". Al fallo: "3x fallo".
- Si un ejercicio es por pierna o por lado, agregá "| por pierna".
- Si hay descanso entre series, agregá "| desc 90 s".
- Aclaraciones o técnica: "| nota: texto" (siempre al final).
- Un ejercicio por línea. Días de descanso: "## Domingo | Descanso".
- Si un día es opcional, agregá "| opcional" en el encabezado.

EJEMPLO:
## Lunes | Piernas | Cuádriceps y glúteos
- Sentadilla | 4x8-10 | desc 2 min
- Estocadas | 3x12 | por pierna
- Plancha | 3x30 seg

MI RUTINA:
`;

root.RA = { uid, PICS, ICONS, TEMPLATES, THEMES, AI_PROMPT, kneePlan };
})(window);
