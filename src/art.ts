import { HEX as P } from './theme';

// All characters are hand-written flat SVG, rasterized by the Phaser loader.
// Each mood is its own texture: `${who}-${mood}`.

export type Mood = 'normal' | 'happy' | 'angry';
export const MOODS: Mood[] = ['normal', 'happy', 'angry'];

export interface Art {
  key: string;
  svg: string;
  scale: number;
}

const S = 'stroke="' + P.navy + '"';

function svg(vb: [number, number, number, number], body: string) {
  const [x, y, w, h] = vb;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}

// ---------- Pyh, the dumpling chef ----------
function pyh(mood: 'normal' | 'happy' | 'worried') {
  const eyes = mood === 'happy'
    ? `<path d="M118 252 q9 -11 18 0 M162 252 q9 -11 18 0" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>`
    : `<ellipse cx="128" cy="252" rx="6" ry="7" fill="${P.navy}"/>
       <circle cx="172" cy="250" r="11" fill="#fff" ${S} stroke-width="3"/><circle cx="175" cy="253" r="5" fill="${P.navy}"/>`;
  const mouth = {
    normal: `<path d="M140 274 Q151 286 162 274" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>`,
    happy: `<path d="M136 270 Q151 296 166 270 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>`,
    worried: `<path d="M138 280 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>
              <path d="M214 222 q8 12 0 17 q-8 -5 0 -17z" fill="${P.paper}" ${S} stroke-width="2.5"/>`,
  }[mood];
  return svg([60, 40, 232, 266], `
    <path d="M70 305 Q68 200 150 192 Q232 200 230 305 Z" fill="${P.paper}" ${S} stroke-width="4"/>
    <path d="M101 222 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0 q7 -12 14 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>
    <g ${S} stroke-width="4" fill="${P.paper}"><circle cx="105" cy="130" r="40"/><circle cx="150" cy="98" r="52"/><circle cx="198" cy="128" r="40"/><circle cx="150" cy="140" r="42"/></g>
    <g fill="${P.paper}"><circle cx="105" cy="130" r="38"/><circle cx="150" cy="98" r="50"/><circle cx="198" cy="128" r="38"/><circle cx="150" cy="140" r="40"/></g>
    <rect x="98" y="166" width="104" height="38" rx="8" fill="${P.paper}" ${S} stroke-width="4"/>
    <line x1="112" y1="185" x2="188" y2="185" stroke="${P.mustard}" stroke-width="6" stroke-linecap="round"/>
    ${eyes}
    <ellipse cx="111" cy="270" rx="10" ry="5" fill="${P.terra}" opacity=".5"/>
    <ellipse cx="192" cy="272" rx="10" ry="5" fill="${P.terra}" opacity=".5"/>
    ${mouth}
    <path d="M226 272 Q250 270 258 254" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>
    <line x1="258" y1="254" x2="270" y2="240" ${S} stroke-width="7" stroke-linecap="round"/>
    <circle cx="276" cy="232" r="11" fill="${P.paper}" ${S} stroke-width="3"/>
    <circle cx="276" cy="232" r="2.5" fill="${P.navy}"/>`);
}

// ---------- Ekibas («two heads» in Kazakh), two heads that never agree ----------
function ekibas(mood: Mood) {
  const skin = mood === 'angry' ? P.terra : P.olive;
  const mL = {
    normal: `<path d="M568 186 Q585 197 602 186" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
    happy: `<path d="M566 182 Q585 208 604 182 Z" fill="${P.navy}" ${S} stroke-width="3.5" stroke-linejoin="round"/>`,
    angry: `<path d="M568 194 Q585 181 602 194" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>
            <path d="M566 141 L600 149" ${S} stroke-width="4" stroke-linecap="round"/>`,
  }[mood];
  const mR = {
    normal: 'M696 170 L714 170',
    happy: 'M694 166 Q705 179 716 166',
    angry: 'M694 173 Q705 164 716 173',
  }[mood];
  const brows = mood === 'happy' ? 'M688 127 L700 124 M722 127 L710 124' : 'M688 130 L700 134 M722 130 L710 134';
  return svg([535, 95, 210, 357], `
    <line x1="615" y1="390" x2="608" y2="440" ${S} stroke-width="5" stroke-linecap="round"/>
    <line x1="665" y1="390" x2="672" y2="440" ${S} stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="600" cy="442" rx="16" ry="7" fill="${P.terra}" ${S} stroke-width="3"/>
    <ellipse cx="682" cy="442" rx="16" ry="7" fill="${P.terra}" ${S} stroke-width="3"/>
    <path d="M592 302 Q562 302 550 282" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>
    <path d="M690 302 Q720 312 732 290" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>
    <circle cx="548" cy="279" r="7" fill="${skin}" ${S} stroke-width="3"/>
    <circle cx="733" cy="287" r="7" fill="${skin}" ${S} stroke-width="3"/>
    <path d="M618 262 L590 200 M665 258 L700 185" ${S} stroke-width="22" stroke-linecap="round"/>
    <path d="M618 262 L590 200 M665 258 L700 185" stroke="${skin}" stroke-width="14" stroke-linecap="round"/>
    <path d="M600 395 Q560 330 590 272 Q640 228 690 272 Q720 330 680 395 Z" fill="${skin}" ${S} stroke-width="4"/>
    <ellipse cx="640" cy="338" rx="28" ry="36" fill="${P.oliveLight}"/>
    <circle cx="585" cy="170" r="36" fill="${skin}" ${S} stroke-width="4"/>
    <circle cx="585" cy="162" r="15" fill="#fff" ${S} stroke-width="3"/><circle cx="579" cy="165" r="6" fill="${P.navy}"/>
    ${mL}
    <ellipse cx="705" cy="150" rx="28" ry="40" fill="${skin}" ${S} stroke-width="4"/>
    <circle cx="696" cy="142" r="4" fill="${P.navy}"/><circle cx="715" cy="142" r="4" fill="${P.navy}"/>
    <path d="${brows}" ${S} stroke-width="3" stroke-linecap="round"/>
    <path d="${mR}" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="705" cy="112" rx="30" ry="9" fill="${P.terra}" ${S} stroke-width="3"/>
    <circle cx="705" cy="102" r="4" fill="${P.navy}"/>`);
}

// ---------- Osya, the octopus ----------
function osya(mood: Mood) {
  const skin = mood === 'angry' ? '#B9553A' : P.terra;
  let tent = '';
  for (const [w, c] of [[10, P.navy], [5.5, skin]] as const) {
    for (let i = 0; i < 8; i++) {
      const x = 30 + i * 8.6, sway = i % 2 ? 6 : -6;
      tent += `<path d="M${x} 66 q${sway} 14 0 26 q${-sway} 8 ${sway / 2} 16" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    }
  }
  const eyes = mood === 'happy'
    ? `<path d="M38 46 q8 -10 16 0 M68 46 q7 -9 14 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>`
    : `<circle cx="46" cy="44" r="11" fill="#fff" ${S} stroke-width="2.5"/><circle cx="${mood === 'angry' ? 48 : 41}" cy="${mood === 'angry' ? 45 : 41}" r="4.5" fill="${P.navy}"/>
       <circle cx="75" cy="42" r="8" fill="#fff" ${S} stroke-width="2.5"/><circle cx="${mood === 'angry' ? 73 : 79}" cy="${mood === 'angry' ? 44 : 46}" r="3.5" fill="${P.navy}"/>`;
  const extra = mood === 'angry' ? `<path d="M34 30 L54 36 M86 30 L68 34" ${S} stroke-width="3" stroke-linecap="round"/>` : '';
  const mouth = {
    normal: `<path d="M54 60 q6 5 12 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    happy: `<path d="M50 57 q10 13 20 0 Z" fill="${P.navy}" ${S} stroke-width="2.5" stroke-linejoin="round"/>`,
    angry: `<path d="M52 63 q8 -7 16 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
  }[mood];
  return svg([10, 8, 100, 104], `${tent}
    <path d="M24 72 Q22 14 60 14 Q98 14 96 72 Z" fill="${skin}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M44 70 L60 84 L76 70 Z" fill="${P.paper}" ${S} stroke-width="2.5" stroke-linejoin="round"/>
    ${eyes}${extra}${mouth}`);
}

// ---------- Tikhon, the silent sock ----------
function tikhon(mood: Mood) {
  const base = mood === 'angry' ? P.terra : P.mustard;
  const stripe = mood === 'angry' ? P.mustard : P.terra;
  const face = {
    normal: `<circle cx="55" cy="46" r="3.5" fill="${P.navy}"/><circle cx="67" cy="46" r="3.5" fill="${P.navy}"/>
             <ellipse cx="61" cy="57" rx="3" ry="4" fill="${P.navy}"/>`,
    happy: `<path d="M51 47 q4 -5 8 0 M63 47 q4 -5 8 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>
            <path d="M55 54 q6 8 12 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    angry: `<circle cx="55" cy="47" r="3.5" fill="${P.navy}"/><circle cx="67" cy="47" r="3.5" fill="${P.navy}"/>
            <path d="M50 39 L59 42 M72 39 L63 42" ${S} stroke-width="2.5" stroke-linecap="round"/>
            <path d="M55 60 q6 -6 12 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
  }[mood];
  return svg([8, 10, 72, 96], `
    <path d="M45 15 L75 15 L75 76 Q75 102 50 102 L26 102 Q12 102 12 90 Q12 79 25 77 L45 71 Z" fill="${base}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="45" y="15" width="30" height="7" fill="${stripe}"/><rect x="45" y="27" width="30" height="5" fill="${stripe}"/>
    <path d="M45 15 L75 15" ${S} stroke-width="3.5"/>
    <path d="M20 84 q8 -3 14 2" fill="none" ${S} stroke-width="2" opacity=".5"/>
    ${face}`);
}

// ---------- Nosochka, Tikhon's pair ----------
function nosochka(mood: Mood) {
  const base = '#F2B79F';
  const face = {
    normal: `<circle cx="55" cy="47" r="3.5" fill="${P.navy}"/><circle cx="67" cy="47" r="3.5" fill="${P.navy}"/>
             <path d="M54 58 q7 5 14 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    happy: `<path d="M51 48 q4 -5 8 0 M63 48 q4 -5 8 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>
            <path d="M54 55 q7 9 14 0 Z" fill="${P.navy}" ${S} stroke-width="2" stroke-linejoin="round"/>`,
    angry: `<circle cx="55" cy="48" r="3.5" fill="${P.navy}"/><circle cx="67" cy="48" r="3.5" fill="${P.navy}"/>
            <path d="M55 61 q6 -5 12 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
  }[mood];
  return svg([8, 0, 72, 106], `
    <path d="M45 15 L75 15 L75 76 Q75 102 50 102 L26 102 Q12 102 12 90 Q12 79 25 77 L45 71 Z" fill="${base}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="45" y="15" width="30" height="7" fill="${P.paper}"/><rect x="45" y="27" width="30" height="5" fill="${P.paper}"/>
    <path d="M45 15 L75 15" ${S} stroke-width="3.5"/>
    <path d="M60 10 L48 3 L48 17 Z M60 10 L72 3 L72 17 Z" fill="${P.mustard}" ${S} stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="60" cy="10" r="3.5" fill="${P.terra}" ${S} stroke-width="2"/>
    <path d="M51 42 l-2 -3 M55 41 l0 -3 M65 41 l0 -3 M69 42 l2 -3" ${S} stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="50" cy="55" rx="4" ry="2.5" fill="${P.terra}" opacity=".6"/><ellipse cx="72" cy="55" rx="4" ry="2.5" fill="${P.terra}" opacity=".6"/>
    ${face}`);
}

// ---------- Ded Borovik, the old mushroom ----------
function borovik(mood: Mood) {
  const cap = mood === 'angry' ? P.terra : P.olive;
  const eyes = {
    normal: `<path d="M47 71 q5 4 10 0 M63 71 q5 4 10 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    happy: `<path d="M47 72 q5 -6 10 0 M63 72 q5 -6 10 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    angry: `<circle cx="52" cy="71" r="3" fill="${P.navy}"/><circle cx="68" cy="71" r="3" fill="${P.navy}"/>
            <path d="M45 63 L57 67 M75 63 L63 67" ${S} stroke-width="3" stroke-linecap="round"/>`,
  }[mood];
  const mouth = {
    normal: '',
    happy: `<path d="M53 90 q7 7 14 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    angry: `<path d="M54 93 q6 -4 12 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
  }[mood];
  return svg([8, 2, 104, 112], `
    <rect x="40" y="52" width="40" height="56" rx="14" fill="${P.paper}" ${S} stroke-width="3.5"/>
    <path d="M12 56 Q60 -4 108 56 Z" fill="${cap}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="40" cy="38" r="6" fill="${P.paper}"/><circle cx="66" cy="26" r="7" fill="${P.paper}"/><circle cx="86" cy="44" r="5" fill="${P.paper}"/>
    ${eyes}
    <path d="M60 80 q-12 -6 -19 6 q10 1 19 -3 q9 4 19 3 q-7 -12 -19 -6z" fill="${P.navy}"/>
    ${mouth}
    <path d="M92 70 L100 110 M92 70 q-2 -8 -9 -6" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`);
}

// ---------- the arguing gnomes ----------
function gnome(kind: 'usach' | 'ochkarik', mood: Mood) {
  const hat = kind === 'usach' ? P.terra : P.olive;
  const face = mood === 'angry' ? '#F4C2A8' : P.paper;
  const cheeks = mood === 'angry' ? 9 : 6;
  const eyes = mood === 'happy'
    ? `<path d="M34 66 q4 -5 8 0 M48 66 q4 -5 8 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`
    : `<circle cx="38" cy="65" r="3" fill="${P.navy}"/><circle cx="52" cy="65" r="3" fill="${P.navy}"/>`;
  const brows = mood === 'angry' ? `<path d="M31 56 L41 60 M59 56 L49 60" ${S} stroke-width="2.5" stroke-linecap="round"/>` : '';
  const feature = kind === 'usach'
    ? `<path d="M45 73 q-10 -4 -15 6 q8 0 15 -3 q7 3 15 3 q-5 -10 -15 -6z" fill="${P.navy}"/>
       ${mood === 'happy' ? `<path d="M40 82 q5 5 10 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>` : ''}
       ${mood === 'angry' ? `<path d="M41 84 q4 -3 8 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>` : ''}`
    : `<circle cx="38" cy="65" r="6.5" fill="none" ${S} stroke-width="2.5"/><circle cx="52" cy="65" r="6.5" fill="none" ${S} stroke-width="2.5"/>
       <line x1="44" y1="65" x2="46" y2="65" ${S} stroke-width="2.5"/>
       ${mood === 'happy' ? `<path d="M39 76 q6 7 12 0 Z" fill="${P.navy}" ${S} stroke-width="2" stroke-linejoin="round"/>`
         : mood === 'angry' ? `<path d="M40 80 q5 -4 10 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`
         : `<ellipse cx="45" cy="78" rx="4" ry="3" fill="${P.navy}"/>`}`;
  return svg([18, 4, 54, 116], `
    <line x1="37" y1="112" x2="36" y2="118" ${S} stroke-width="4" stroke-linecap="round"/>
    <line x1="53" y1="112" x2="54" y2="118" ${S} stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="45" cy="100" rx="22" ry="16" fill="${P.mustard}" ${S} stroke-width="3"/>
    <circle cx="45" cy="66" r="18" fill="${face}" ${S} stroke-width="3"/>
    <ellipse cx="32" cy="73" rx="${cheeks}" ry="${cheeks * 0.6}" fill="${P.terra}" opacity=".55"/>
    <ellipse cx="58" cy="73" rx="${cheeks}" ry="${cheeks * 0.6}" fill="${P.terra}" opacity=".55"/>
    <path d="M24 56 L45 8 L66 56 Z" fill="${hat}" ${S} stroke-width="3" stroke-linejoin="round"/>
    ${eyes}${brows}${feature}`);
}

// ---------- buildings for the town map ----------
function pizzeriaHouse() {
  let awning = '';
  for (let i = 0; i < 8; i++) {
    awning += `<path d="M${30 + i * 30} 120 h30 v26 q-15 14 -30 0 z" fill="${i % 2 ? P.paper : P.terra}" ${S} stroke-width="3"/>`;
  }
  return svg([0, 0, 300, 300], `
    <path d="M30 120 L150 40 L270 120 Z" fill="${P.mustard}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="40" y="120" width="220" height="176" fill="${P.wall}" ${S} stroke-width="4"/>
    ${awning}
    <rect x="62" y="176" width="86" height="70" rx="6" fill="${P.paper}" ${S} stroke-width="4"/>
    <circle cx="105" cy="211" r="25" fill="${P.cheese}" stroke="${P.mustard}" stroke-width="6"/>
    <path d="M105 211 L105 186 M105 211 L127 224 M105 211 L83 224" ${S} stroke-width="2.5"/>
    <circle cx="96" cy="202" r="4" fill="${P.terra}"/><circle cx="114" cy="206" r="4" fill="${P.terra}"/><circle cx="104" cy="224" r="4" fill="${P.terra}"/>
    <rect x="174" y="180" width="62" height="116" rx="6" fill="${P.olive}" ${S} stroke-width="4"/>
    <circle cx="223" cy="240" r="4" fill="${P.navy}"/>`);
}

function gazebo() {
  return svg([0, 0, 300, 300], `
    <path d="M150 16 L150 50" ${S} stroke-width="4"/>
    <path d="M150 18 L182 28 L150 38 Z" fill="${P.terra}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 130 Q150 20 260 130 Z" fill="${P.olive}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="30" y="126" width="240" height="20" rx="6" fill="${P.mustard}" ${S} stroke-width="4"/>
    <rect x="52" y="146" width="16" height="122" fill="${P.paper}" ${S} stroke-width="4"/>
    <rect x="232" y="146" width="16" height="122" fill="${P.paper}" ${S} stroke-width="4"/>
    <rect x="142" y="146" width="16" height="122" fill="${P.paper}" ${S} stroke-width="4"/>
    <rect x="80" y="232" width="50" height="10" rx="4" fill="${P.terra}" ${S} stroke-width="3"/>
    <rect x="170" y="232" width="50" height="10" rx="4" fill="${P.terra}" ${S} stroke-width="3"/>
    <rect x="20" y="266" width="260" height="26" rx="8" fill="${P.sand}" ${S} stroke-width="4"/>`);
}

function house(roof: string, prop: 'box' | 'boat' | 'flask') {
  const props = {
    box: `<rect x="196" y="240" width="54" height="44" fill="${P.mustard}" ${S} stroke-width="3"/><path d="M196 254 h54 M223 240 v14" ${S} stroke-width="3"/>`,
    boat: `<path d="M180 262 h86 l-14 24 h-58 z" fill="${P.terra}" ${S} stroke-width="3" stroke-linejoin="round"/><path d="M222 262 V214 l28 40 z" fill="${P.paper}" ${S} stroke-width="3" stroke-linejoin="round"/>`,
    flask: `<path d="M214 222 v20 l-22 38 h62 l-22 -38 v-20 z" fill="${P.olive}" ${S} stroke-width="3" stroke-linejoin="round"/><circle cx="223" cy="210" r="7" fill="${P.paper}" ${S} stroke-width="2.5"/>`,
  }[prop];
  return svg([0, 0, 300, 300], `
    <path d="M40 130 L130 50 L220 130 Z" fill="${roof}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="56" y="130" width="148" height="160" fill="${P.wall}" ${S} stroke-width="4"/>
    <rect x="76" y="160" width="46" height="46" rx="4" fill="${P.paper}" ${S} stroke-width="4"/>
    <path d="M99 160 v46 M76 183 h46" ${S} stroke-width="3"/>
    <rect x="140" y="200" width="44" height="90" rx="4" fill="${P.sand}" ${S} stroke-width="4"/>
    ${props}`);
}

function clockTower() {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ticks += `<line x1="${150 + 30 * Math.sin(a)}" y1="${118 - 30 * Math.cos(a)}" x2="${150 + 35 * Math.sin(a)}" y2="${118 - 35 * Math.cos(a)}" ${S} stroke-width="2.5"/>`;
  }
  return svg([0, 0, 300, 300], `
    <path d="M90 66 L150 12 L210 66 Z" fill="${P.terra}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="102" y="66" width="96" height="226" fill="${P.sand}" ${S} stroke-width="4"/>
    <circle cx="150" cy="118" r="40" fill="${P.paper}" ${S} stroke-width="4"/>
    ${ticks}
    <line x1="150" y1="118" x2="150" y2="150" ${S} stroke-width="4" stroke-linecap="round"/>
    <line x1="150" y1="118" x2="166" y2="104" ${S} stroke-width="6" stroke-linecap="round"/>
    <circle cx="150" cy="118" r="4" fill="${P.navy}"/>
    <rect x="126" y="186" width="48" height="26" rx="4" fill="${P.paper}" ${S} stroke-width="3"/>
    <path d="M132 292 V246 a18 18 0 0 1 36 0 V292" fill="${P.olive}" ${S} stroke-width="4"/>
    <path d="M222 262 c-8 -10 -20 -2 -12 8 l12 12 l12 -12 c8 -10 -4 -18 -12 -8 z" fill="${P.terra}" ${S} stroke-width="3" stroke-linejoin="round"/>`);
}

export const CUSTOMERS = ['ekibas', 'osya', 'tikhon', 'borovik'] as const;
export type CustomerId = (typeof CUSTOMERS)[number];

export function allArt(): Art[] {
  const list: Art[] = [];
  for (const m of ['normal', 'happy', 'worried'] as const) list.push({ key: `pyh-${m}`, svg: pyh(m), scale: 1.7 });
  for (const m of MOODS) {
    list.push({ key: `ekibas-${m}`, svg: ekibas(m), scale: 1.35 });
    list.push({ key: `osya-${m}`, svg: osya(m), scale: 3.6 });
    list.push({ key: `tikhon-${m}`, svg: tikhon(m), scale: 4.2 });
    list.push({ key: `borovik-${m}`, svg: borovik(m), scale: 3.8 });
    list.push({ key: `usach-${m}`, svg: gnome('usach', m), scale: 4.2 });
    list.push({ key: `ochkarik-${m}`, svg: gnome('ochkarik', m), scale: 4.2 });
    list.push({ key: `nosochka-${m}`, svg: nosochka(m), scale: 4.2 });
  }
  list.push({ key: 'house-pizza', svg: pizzeriaHouse(), scale: 1.6 });
  list.push({ key: 'house-gazebo', svg: gazebo(), scale: 1.6 });
  list.push({ key: 'house-clock', svg: clockTower(), scale: 1.6 });
  list.push({ key: 'house-courier', svg: house(P.terra, 'box'), scale: 1.1 });
  list.push({ key: 'house-pier', svg: house(P.olive, 'boat'), scale: 1.1 });
  list.push({ key: 'house-potion', svg: house(P.mustard, 'flask'), scale: 1.1 });
  return list;
}
