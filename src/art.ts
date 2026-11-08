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

function house(roof: string, prop: 'box' | 'flask' | 'doctor') {
  const props = {
    box: `<rect x="196" y="240" width="54" height="44" fill="${P.mustard}" ${S} stroke-width="3"/><path d="M196 254 h54 M223 240 v14" ${S} stroke-width="3"/>`,
    flask: `<path d="M214 222 v20 l-22 38 h62 l-22 -38 v-20 z" fill="${P.olive}" ${S} stroke-width="3" stroke-linejoin="round"/><circle cx="223" cy="210" r="7" fill="${P.paper}" ${S} stroke-width="2.5"/>`,
    // Height chart on the outside wall and a red cross on the roof.
    doctor: `<rect x="212" y="130" width="22" height="160" fill="${P.paper}" ${S} stroke-width="3"/>
      <path d="M212 170 h11 M212 210 h16 M212 250 h11" ${S} stroke-width="3"/>
      <rect x="116" y="80" width="28" height="28" rx="3" fill="${P.paper}" ${S} stroke-width="3"/>
      <path d="M130 86 v16 M122 94 h16" stroke="${P.terra}" stroke-width="6" stroke-linecap="round"/>`,
  }[prop];
  return svg([0, 0, 300, 300], `
    <path d="M40 130 L130 50 L220 130 Z" fill="${roof}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="56" y="130" width="148" height="160" fill="${P.wall}" ${S} stroke-width="4"/>
    <rect x="76" y="160" width="46" height="46" rx="4" fill="${P.paper}" ${S} stroke-width="4"/>
    <path d="M99 160 v46 M76 183 h46" ${S} stroke-width="3"/>
    <rect x="140" y="200" width="44" height="90" rx="4" fill="${P.sand}" ${S} stroke-width="4"/>
    ${props}`);
}

/** Crooked, cosy-spooky house of the monster family: glowing windows, bats, a spider. */
function monsterHouse() {
  return svg([0, 0, 300, 340], `
    <path d="M70 120 L150 18 L238 116 Z" fill="${P.navy}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M196 64 v-34 h22 v56" fill="${P.sand}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M84 118 L222 112 L228 330 L78 330 Z" fill="${P.sand}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <circle cx="152" cy="78" r="16" fill="${P.mustard}" ${S} stroke-width="3"/>
    <path d="M152 62 v32 M136 78 h32" ${S} stroke-width="2.5"/>
    <rect x="102" y="150" width="40" height="48" rx="18" fill="${P.mustard}" ${S} stroke-width="4"/>
    <rect x="166" y="146" width="40" height="48" rx="18" fill="${P.mustard}" ${S} stroke-width="4"/>
    <path d="M122 150 v48 M186 146 v48" ${S} stroke-width="3"/>
    <path d="M128 330 V262 a26 26 0 0 1 52 0 V330" fill="${P.terra}" ${S} stroke-width="4"/>
    <circle cx="168" cy="292" r="4" fill="${P.navy}"/>
    <path d="M206 112 v58" ${S} stroke-width="2"/>
    <circle cx="206" cy="176" r="7" fill="${P.navy}"/>
    <path d="M200 172 l-7 -4 M200 178 l-7 4 M212 172 l7 -4 M212 178 l7 4" ${S} stroke-width="2"/>
    <path d="M26 70 q10 -12 20 0 q10 -12 20 0 q-10 4 -20 14 q-10 -10 -20 -14z" fill="${P.navy}"/>
    <path d="M246 40 q8 -10 16 0 q8 -10 16 0 q-8 3 -16 11 q-8 -8 -16 -11z" fill="${P.navy}"/>`);
}

// ---------- Pier: captain Sardina and her parrot Rumb ----------
function sardina(mood: Mood) {
  const eyes = {
    normal: `<circle cx="50" cy="72" r="10" fill="#fff" ${S} stroke-width="3"/><circle cx="52" cy="73" r="5" fill="${P.navy}"/>
             <circle cx="80" cy="72" r="10" fill="#fff" ${S} stroke-width="3"/><circle cx="82" cy="73" r="5" fill="${P.navy}"/>`,
    happy: `<path d="M41 74 q9 -11 18 0 M71 74 q9 -11 18 0" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>`,
    angry: `<circle cx="50" cy="74" r="9" fill="#fff" ${S} stroke-width="3"/><circle cx="52" cy="76" r="4.5" fill="${P.navy}"/>
            <circle cx="80" cy="74" r="9" fill="#fff" ${S} stroke-width="3"/><circle cx="82" cy="76" r="4.5" fill="${P.navy}"/>
            <path d="M39 60 L60 66 M91 60 L70 66" ${S} stroke-width="4" stroke-linecap="round"/>`,
  }[mood];
  const mouth = {
    normal: `<path d="M56 90 Q65 98 74 90" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
    happy: `<path d="M53 87 Q65 104 77 87 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>`,
    angry: `<path d="M56 95 Q65 87 74 95" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
  }[mood];
  return svg([0, 4, 130, 216], `
    <path d="M24 118 Q2 128 7 152 Q19 140 30 140 Z" fill="${P.water}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M106 118 Q128 128 123 152 Q111 140 100 140 Z" fill="${P.water}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M58 186 Q40 198 28 216 Q48 212 65 204 Q82 212 102 216 Q90 198 72 186 Z" fill="${P.water}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M65 40 C105 40 112 90 108 130 C104 165 88 185 65 192 C42 185 26 165 22 130 C18 90 25 40 65 40 Z" fill="${P.water}" ${S} stroke-width="4"/>
    <path d="M65 104 C88 104 95 132 92 155 C88 175 78 184 65 186 C52 184 42 175 38 155 C35 132 42 104 65 104 Z" fill="${P.paper}" ${S} stroke-width="3"/>
    <path d="M44 122 H86 M39 140 H91 M40 158 H90 M47 174 H83" stroke="${P.terra}" stroke-width="6"/>
    <path d="M65 104 C88 104 95 132 92 155 C88 175 78 184 65 186 C52 184 42 175 38 155 C35 132 42 104 65 104 Z" fill="none" ${S} stroke-width="3"/>
    <circle cx="38" cy="88" r="6" fill="${P.terra}" opacity="0.35"/><circle cx="92" cy="88" r="6" fill="${P.terra}" opacity="0.35"/>
    ${eyes}${mouth}
    <path d="M34 46 Q36 12 65 10 Q94 12 96 46 Z" fill="${P.navy}" ${S} stroke-width="3"/>
    <rect x="30" y="38" width="70" height="12" rx="4" fill="${P.paper}" ${S} stroke-width="3"/>
    <path d="M32 50 Q65 66 98 50 L98 47 Q65 58 32 47 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <circle cx="65" cy="27" r="7" fill="${P.mustard}" ${S} stroke-width="2.5"/>`);
}

function rumb(mood: Mood) {
  const eye = {
    normal: `<circle cx="72" cy="56" r="5" fill="${P.navy}"/>`,
    happy: `<path d="M66 58 q6 -8 12 0" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
    angry: `<circle cx="72" cy="58" r="4.5" fill="${P.navy}"/><path d="M62 46 L82 52" ${S} stroke-width="4" stroke-linecap="round"/>`,
  }[mood];
  const crest = mood === 'angry'
    ? `<path d="M46 34 Q34 8 50 2 Q56 18 58 30 Q62 0 80 4 Q72 22 66 32 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>`
    : `<path d="M50 32 Q44 10 56 6 Q58 20 60 30 Q64 8 76 10 Q70 24 66 32 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>`;
  const beak = mood === 'happy'
    ? `<path d="M82 60 Q102 58 98 78 Q92 70 82 70 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/><path d="M82 74 Q92 78 94 86 Q84 88 80 80 Z" fill="${P.mustardDark}" ${S} stroke-width="3" stroke-linejoin="round"/>`
    : `<path d="M80 62 Q100 62 96 82 Q90 74 80 74 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/><path d="M80 74 Q88 76 90 80 Q84 84 80 80 Z" fill="${P.mustardDark}" ${S} stroke-width="3" stroke-linejoin="round"/>`;
  return svg([10, 0, 100, 200], `
    <path d="M55 140 L44 196 L62 192 L72 140 Z" fill="${P.olive}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 160 v14 M46 176 h10 M68 160 v14 M64 176 h10" ${S} stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="60" cy="115" rx="34" ry="45" fill="${P.terra}" ${S} stroke-width="4"/>
    <ellipse cx="64" cy="124" rx="20" ry="30" fill="${P.cheese}"/>
    <path d="M34 95 Q18 130 40 162 Q56 140 52 100 Z" fill="${P.olive}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    ${crest}
    <circle cx="60" cy="58" r="30" fill="${P.terra}" ${S} stroke-width="4"/>
    <ellipse cx="71" cy="57" rx="13" ry="15" fill="${P.paper}" ${S} stroke-width="3"/>
    ${eye}${beak}`);
}

/** The pier: a ship with a sail split into three stripes, a jetty and a chest. */
function pierShip() {
  return svg([0, 0, 300, 300], `
    <rect x="0" y="252" width="300" height="48" fill="${P.water}"/>
    <path d="M0 252 H300" ${S} stroke-width="4"/>
    <path d="M150 220 V40" ${S} stroke-width="7" stroke-linecap="round"/>
    <path d="M150 40 l40 12 l-40 12 z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 76 H200 V196 H100 Z" fill="${P.paper}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <rect x="100" y="116" width="100" height="40" fill="${P.terra}"/>
    <path d="M100 76 H200 V196 H100 Z M100 116 H200 M100 156 H200" fill="none" ${S} stroke-width="4"/>
    <path d="M62 214 H262 L232 268 H96 Z" fill="${P.terra}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M78 236 H248" ${S} stroke-width="3"/>
    <circle cx="120" cy="250" r="7" fill="${P.paper}" ${S} stroke-width="3"/><circle cx="160" cy="250" r="7" fill="${P.paper}" ${S} stroke-width="3"/><circle cx="200" cy="250" r="7" fill="${P.paper}" ${S} stroke-width="3"/>
    <rect x="0" y="236" width="80" height="16" fill="${P.mustardDark}" ${S} stroke-width="3"/>
    <path d="M14 252 V292 M62 252 V292" ${S} stroke-width="6"/>
    <rect x="18" y="206" width="42" height="30" rx="4" fill="${P.mustard}" ${S} stroke-width="3"/>
    <path d="M18 218 H60 M39 214 v8" ${S} stroke-width="3"/>`);
}

// ---------- Doctor: heron the doctor and George the giraffe ----------
function heron(mood: Mood) {
  const eyes = {
    normal: `<circle cx="72" cy="62" r="3" fill="${P.navy}"/><circle cx="86" cy="62" r="3" fill="${P.navy}"/>`,
    happy: `<path d="M68 63 q4 -5 8 0 M82 63 q4 -5 8 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
    angry: `<circle cx="72" cy="63" r="3" fill="${P.navy}"/><circle cx="86" cy="63" r="3" fill="${P.navy}"/><path d="M65 52 L77 56 M93 52 L81 56" ${S} stroke-width="3" stroke-linecap="round"/>`,
  }[mood];
  const beak = mood === 'happy'
    ? `<path d="M93 60 L138 62 L93 66 Z M93 70 L130 74 L93 74 Z" fill="${P.mustard}" ${S} stroke-width="2.5" stroke-linejoin="round"/>`
    : `<path d="M93 60 L138 68 L93 74 Z" fill="${P.mustard}" ${S} stroke-width="2.5" stroke-linejoin="round"/><path d="M93 67 L130 68" ${S} stroke-width="2"/>`;
  return svg([10, 18, 132, 282], `
    <path d="M62 200 L58 292 M80 200 L84 292" ${S} stroke-width="5" stroke-linecap="round"/>
    <path d="M44 293 H66 M76 293 H98" ${S} stroke-width="5" stroke-linecap="round"/>
    <path d="M30 168 Q20 200 40 206 L50 190 Z" fill="${P.paper}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="70" cy="176" rx="42" ry="34" fill="${P.paper}" ${S} stroke-width="4"/>
    <path d="M44 166 Q70 196 102 170" fill="none" ${S} stroke-width="3"/>
    <rect x="60" y="182" width="20" height="20" rx="3" fill="${P.paper}" ${S} stroke-width="2.5"/>
    <path d="M70 186 v12 M64 192 h12" stroke="${P.terra}" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 150 C58 122 92 104 78 80" fill="none" ${S} stroke-width="22" stroke-linecap="round"/>
    <path d="M74 150 C58 122 92 104 78 80" fill="none" stroke="${P.paper}" stroke-width="15" stroke-linecap="round"/>
    <path d="M60 58 L36 50 M60 64 L40 64" ${S} stroke-width="4" stroke-linecap="round"/>
    <circle cx="78" cy="64" r="20" fill="${P.paper}" ${S} stroke-width="4"/>
    ${beak}
    <circle cx="72" cy="62" r="7" fill="none" ${S} stroke-width="2.5"/><circle cx="86" cy="62" r="7" fill="none" ${S} stroke-width="2.5"/>
    <path d="M79 62 h0" ${S} stroke-width="2.5"/>
    ${eyes}
    <path d="M60 48 Q78 36 96 48" fill="none" ${S} stroke-width="3"/>
    <circle cx="78" cy="42" r="8" fill="${P.mustard}" ${S} stroke-width="2.5"/>`);
}

export type GiraffeMood = Mood | 'surprised';
function giraffe(mood: GiraffeMood) {
  const eyes = {
    normal: `<circle cx="108" cy="46" r="4" fill="${P.navy}"/><circle cx="124" cy="45" r="4" fill="${P.navy}"/>`,
    happy: `<path d="M103 47 q5 -6 10 0 M119 46 q5 -6 10 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>`,
    angry: `<circle cx="108" cy="47" r="4" fill="${P.navy}"/><circle cx="124" cy="46" r="4" fill="${P.navy}"/><path d="M100 36 L113 40 M132 35 L119 40" ${S} stroke-width="3" stroke-linecap="round"/>`,
    surprised: `<circle cx="107" cy="44" r="8" fill="#fff" ${S} stroke-width="2.5"/><circle cx="107" cy="44" r="3" fill="${P.navy}"/>
                <circle cx="125" cy="43" r="8" fill="#fff" ${S} stroke-width="2.5"/><circle cx="125" cy="43" r="3" fill="${P.navy}"/>
                <path d="M99 30 q8 -6 16 0 M117 29 q8 -6 16 0" fill="none" ${S} stroke-width="2.5" stroke-linecap="round"/>`,
  }[mood];
  const mouth = {
    normal: `<path d="M120 68 q7 5 14 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>`,
    happy: `<path d="M118 66 Q127 80 136 66 Z" fill="${P.navy}" ${S} stroke-width="2.5" stroke-linejoin="round"/>`,
    angry: `<path d="M120 72 q7 -5 14 0" fill="none" ${S} stroke-width="3" stroke-linecap="round"/>`,
    surprised: `<ellipse cx="128" cy="70" rx="5" ry="7" fill="${P.navy}"/>`,
  }[mood];
  const spot = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${P.terra}"/>`;
  return svg([4, 6, 148, 266], `
    <path d="M26 182 Q12 200 16 216" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>
    <path d="M10 214 q6 10 12 0 z" fill="${P.navy}"/>
    <g fill="${P.mustard}" ${S} stroke-width="3.5">
      <rect x="36" y="196" width="13" height="64"/><rect x="56" y="196" width="13" height="64"/>
      <rect x="88" y="196" width="13" height="64"/><rect x="106" y="196" width="13" height="64"/>
    </g>
    <g fill="${P.navy}"><rect x="35" y="256" width="15" height="10" rx="2"/><rect x="55" y="256" width="15" height="10" rx="2"/><rect x="87" y="256" width="15" height="10" rx="2"/><rect x="105" y="256" width="15" height="10" rx="2"/></g>
    <ellipse cx="76" cy="188" rx="52" ry="30" fill="${P.mustard}" ${S} stroke-width="4"/>
    <path d="M90 182 L98 64 L124 66 L120 182 Z" fill="${P.mustard}" ${S} stroke-width="4" stroke-linejoin="round"/>
    ${spot(50, 182, 8)}${spot(72, 196, 7)}${spot(96, 186, 6)}${spot(60, 170, 5)}${spot(108, 150, 6)}${spot(104, 118, 5)}${spot(112, 92, 5)}${spot(108, 170, 5)}
    <path d="M104 34 L100 14 M122 32 L124 12" ${S} stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="13" r="5" fill="${P.terra}" ${S} stroke-width="2.5"/><circle cx="124" cy="11" r="5" fill="${P.terra}" ${S} stroke-width="2.5"/>
    <ellipse cx="90" cy="42" rx="10" ry="6" fill="${P.mustard}" ${S} stroke-width="3" transform="rotate(-25 90 42)"/>
    <ellipse cx="114" cy="50" rx="26" ry="22" fill="${P.mustard}" ${S} stroke-width="4"/>
    <ellipse cx="128" cy="64" rx="17" ry="12" fill="${P.paper}" ${S} stroke-width="3"/>
    <circle cx="124" cy="60" r="1.8" fill="${P.navy}"/><circle cx="133" cy="60" r="1.8" fill="${P.navy}"/>
    ${eyes}${mouth}`);
}

// ---------- Potion shop: Pip the owlet, a wizard's apprentice ----------
function pip(mood: Mood) {
  const eyes = {
    normal: `<circle cx="62" cy="112" r="17" fill="#fff" ${S} stroke-width="3.5"/><circle cx="98" cy="112" r="17" fill="#fff" ${S} stroke-width="3.5"/>
             <circle cx="65" cy="114" r="7" fill="${P.navy}"/><circle cx="95" cy="114" r="7" fill="${P.navy}"/>`,
    happy: `<circle cx="62" cy="112" r="17" fill="#fff" ${S} stroke-width="3.5"/><circle cx="98" cy="112" r="17" fill="#fff" ${S} stroke-width="3.5"/>
            <path d="M53 115 q9 -10 18 0 M89 115 q9 -10 18 0" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>`,
    angry: `<circle cx="62" cy="114" r="16" fill="#fff" ${S} stroke-width="3.5"/><circle cx="98" cy="114" r="16" fill="#fff" ${S} stroke-width="3.5"/>
            <circle cx="65" cy="117" r="6" fill="${P.navy}"/><circle cx="95" cy="117" r="6" fill="${P.navy}"/>
            <path d="M44 96 L74 104 M116 96 L86 104" ${S} stroke-width="4.5" stroke-linecap="round"/>`,
  }[mood];
  const beak = mood === 'happy'
    ? `<path d="M72 128 L88 128 L80 144 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>`
    : `<path d="M73 126 L87 126 L80 140 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>`;
  const star = (x: number, y: number, r: number) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)} `;
    }
    return `<path d="${d}Z" fill="${P.mustard}"/>`;
  };
  return svg([6, 0, 148, 236], `
    <path d="M62 222 v10 M54 232 h16 M98 222 v10 M90 232 h16" stroke="${P.mustardDark}" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="80" cy="168" rx="56" ry="58" fill="${P.sand}" ${S} stroke-width="4"/>
    <ellipse cx="80" cy="182" rx="34" ry="38" fill="${P.paper}"/>
    <path d="M66 166 q6 6 12 0 M84 166 q6 6 12 0 M70 184 q6 6 12 0 M88 184 q-6 6 0 0 M74 202 q6 6 12 0" fill="none" stroke="${P.floor}" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 150 Q8 184 30 206 Q40 180 38 150 Z" fill="${P.terra}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M134 150 Q152 184 130 206 Q120 180 122 150 Z" fill="${P.terra}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="80" cy="116" rx="50" ry="40" fill="${P.sand}" ${S} stroke-width="4"/>
    ${eyes}${beak}
    <path d="M24 92 Q80 70 136 92 L128 82 Q80 64 32 82 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 84 L92 4 L120 84 Z" fill="${P.navy}" ${S} stroke-width="4" stroke-linejoin="round"/>
    ${star(76, 52, 10)}${star(98, 30, 7)}${star(96, 70, 6)}
    <circle cx="92" cy="4" r="6" fill="${P.mustard}" ${S} stroke-width="2.5"/>`);
}

// ---------- Monster house: a cosy, slightly spooky family ----------
const monsterEyes = (mood: Mood, l: [number, number], r: [number, number], rad = 9, white = true) => {
  const [lx, ly] = l, [rx, ry] = r;
  if (mood === 'happy') return `<path d="M${lx - rad} ${ly + 2} q${rad} -${rad + 2} ${2 * rad} 0 M${rx - rad} ${ry + 2} q${rad} -${rad + 2} ${2 * rad} 0" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>`;
  const ball = (x: number, y: number) => (white ? `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" ${S} stroke-width="3"/>` : '') + `<circle cx="${x + 1}" cy="${y + 1}" r="${rad * 0.45}" fill="${P.navy}"/>`;
  const brows = mood === 'angry' ? `<path d="M${lx - rad - 3} ${ly - rad - 8} L${lx + rad} ${ly - rad} M${rx + rad + 3} ${ry - rad - 8} L${rx - rad} ${ry - rad}" ${S} stroke-width="4" stroke-linecap="round"/>` : '';
  return ball(lx, ly) + ball(rx, ry) + brows;
};
const monsterMouth = (mood: Mood, x: number, y: number, w = 12) => ({
  normal: `<path d="M${x - w} ${y} Q${x} ${y + w * 0.7} ${x + w} ${y}" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
  happy: `<path d="M${x - w} ${y - 2} Q${x} ${y + w * 1.4} ${x + w} ${y - 2} Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>`,
  angry: `<path d="M${x - w} ${y + 6} Q${x} ${y - w * 0.4} ${x + w} ${y + 6}" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`,
})[mood];

function mummy(mood: Mood) {
  return svg([0, 0, 140, 210], `
    <path d="M30 70 Q30 14 70 12 Q110 14 110 70 L116 196 Q70 210 24 196 Z" fill="${P.paper}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M32 46 L108 58 M28 92 L112 80 M26 122 L114 136 M25 160 L115 150 M24 186 L116 178" fill="none" stroke="${P.sand}" stroke-width="7" stroke-linecap="round"/>
    <path d="M40 120 H100 V190 Q70 200 40 190 Z" fill="${P.terra}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M48 136 H92" stroke="${P.paper}" stroke-width="4"/>
    <rect x="40" y="58" width="60" height="30" rx="12" fill="${P.navy}"/>
    ${monsterEyes(mood, [56, 73], [84, 73], 8)}
    ${monsterMouth(mood, 70, 102, 10)}
    <path d="M104 40 q18 6 16 26" fill="none" stroke="${P.sand}" stroke-width="6" stroke-linecap="round"/>`);
}

function wolf(mood: Mood) {
  return svg([0, 0, 170, 220], `
    <path d="M38 210 V178 M132 210 V178" ${S} stroke-width="16" stroke-linecap="round"/>
    <path d="M26 180 Q20 110 85 104 Q150 110 144 180 Q85 196 26 180 Z" fill="${P.floor}" ${S} stroke-width="4"/>
    <path d="M70 116 L85 160 L100 116 Z" fill="${P.terra}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M36 42 L48 4 L70 32 Z M134 42 L122 4 L100 32 Z" fill="${P.floor}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M30 70 Q24 28 85 26 Q146 28 140 70 Q148 100 120 114 Q85 126 50 114 Q22 100 30 70 Z" fill="${P.floor}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M30 70 l-12 8 l14 4 M140 70 l12 8 l-14 4" fill="none" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="85" cy="92" rx="30" ry="20" fill="${P.sand}" ${S} stroke-width="3"/>
    <ellipse cx="85" cy="80" rx="9" ry="6" fill="${P.navy}"/>
    ${monsterEyes(mood, [64, 62], [106, 62], 9)}
    ${monsterMouth(mood, 85, 96, 14)}
    <path d="M76 98 l3 9 l3 -8 M88 98 l3 8 l3 -9" fill="#fff" ${S} stroke-width="2" stroke-linejoin="round"/>`);
}

function slime(mood: Mood) {
  return svg([0, 0, 150, 170], `
    <path d="M18 160 Q8 120 28 84 Q46 22 76 16 Q106 22 122 84 Q142 120 132 160 Q118 154 106 162 Q90 150 76 162 Q60 150 46 162 Q32 154 18 160 Z" fill="${P.oliveLight}" ${S} stroke-width="4" stroke-linejoin="round"/>
    <path d="M48 40 Q56 30 66 30" fill="none" stroke="${P.paper}" stroke-width="6" stroke-linecap="round"/>
    ${monsterEyes(mood, [60, 84], [92, 84], 13)}
    ${monsterMouth(mood, 76, 116, 14)}
    <path d="M100 124 q4 10 0 16 q-4 -6 0 -16 z" fill="${P.water}" ${S} stroke-width="2"/>`);
}

function spider(mood: Mood) {
  let legs = '';
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const y = 84 + i * 16, x0 = 75 + side * 26, x1 = 75 + side * (62 + (i % 2) * 6), x2 = 75 + side * (72 + i * 4);
    legs += `<path d="M${x0} ${y} Q${x1} ${y - 30} ${x2} ${y + 34}" fill="none" ${S} stroke-width="5" stroke-linecap="round"/>`;
  }
  return svg([0, 0, 150, 170], `
    <path d="M75 0 V40" ${S} stroke-width="2.5"/>
    ${legs}
    <ellipse cx="75" cy="100" rx="38" ry="40" fill="${P.navy}" ${S} stroke-width="3"/>
    <circle cx="75" cy="58" r="26" fill="${P.navy}" ${S} stroke-width="3"/>
    ${mood === 'happy'
      ? `<path d="M56 60 q7 -8 14 0 M80 60 q7 -8 14 0" fill="none" stroke="${P.mustard}" stroke-width="4" stroke-linecap="round"/>`
      : `<circle cx="63" cy="56" r="9" fill="${P.mustard}"/><circle cx="87" cy="56" r="9" fill="${P.mustard}"/><circle cx="64" cy="57" r="4" fill="${P.navy}"/><circle cx="88" cy="57" r="4" fill="${P.navy}"/>`}
    ${mood === 'angry' ? `<path d="M52 42 L70 48 M98 42 L80 48" stroke="${P.mustard}" stroke-width="4" stroke-linecap="round"/>` : ''}
    <path d="M${mood === 'angry' ? '66 76 Q75 70 84 76' : '66 72 Q75 80 84 72'}" fill="none" stroke="${P.paper}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M62 128 L75 120 L88 128 L75 136 Z" fill="${P.terra}" stroke="${P.paper}" stroke-width="2"/>`);
}

function bat(mood: Mood) {
  return svg([0, 0, 200, 140], `
    <path d="M100 60 Q60 20 8 40 Q24 52 20 70 Q40 62 46 80 Q62 70 74 88 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 60 Q140 20 192 40 Q176 52 180 70 Q160 62 154 80 Q138 70 126 88 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 34 L84 8 L96 30 Z M122 34 L116 8 L104 30 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="100" cy="70" rx="32" ry="40" fill="${P.navy}"/>
    ${monsterEyes(mood, [88, 60], [112, 60], 9)}
    ${monsterMouth(mood, 100, 84, 10).replace(/stroke="#2E3A59"/g, `stroke="${P.paper}"`)}
    <path d="M93 88 l3 7 l3 -6 M101 88 l3 6 l3 -7" fill="#fff"/>
    <path d="M90 110 v14 M110 110 v14" stroke="${P.navy}" stroke-width="5" stroke-linecap="round"/>`);
}

// ---------- Beaver's bridge: Bruno the builder ----------
function bruno(mood: Mood) {
  const eyes = {
    normal: `<circle cx="66" cy="70" r="6" fill="${P.navy}"/><circle cx="98" cy="70" r="6" fill="${P.navy}"/>`,
    happy: `<path d="M59 72 q7 -9 14 0 M91 72 q7 -9 14 0" fill="none" ${S} stroke-width="4" stroke-linecap="round"/>`,
    angry: `<circle cx="66" cy="72" r="5.5" fill="${P.navy}"/><circle cx="98" cy="72" r="5.5" fill="${P.navy}"/><path d="M54 56 L74 63 M110 56 L90 63" ${S} stroke-width="4" stroke-linecap="round"/>`,
  }[mood];
  const mouth = mood === 'angry'
    ? `<path d="M70 106 Q82 100 94 106" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`
    : `<path d="M68 100 Q82 ${mood === 'happy' ? 114 : 108} 96 100" fill="none" ${S} stroke-width="3.5" stroke-linecap="round"/>`;
  return svg([0, 0, 190, 230], `
    <path d="M118 200 Q176 196 182 150 Q186 120 160 126 Q130 132 112 176 Z" fill="${P.navy}" ${S} stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 182 L170 140 M140 190 L178 156 M136 160 L160 176 M150 146 L172 162" stroke="${P.paper}" stroke-width="2.5" opacity="0.5"/>
    <path d="M58 222 v6 M108 222 v6" stroke="${P.navy}" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="82" cy="164" rx="56" ry="62" fill="${P.mustardDark}" ${S} stroke-width="4"/>
    <ellipse cx="82" cy="178" rx="34" ry="40" fill="${P.floor}"/>
    <path d="M30 150 Q14 170 28 186 Q40 176 40 160 Z M134 150 Q150 170 136 186 Q124 176 124 160 Z" fill="${P.mustardDark}" ${S} stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="38" cy="38" r="14" fill="${P.mustardDark}" ${S} stroke-width="3.5"/><circle cx="126" cy="38" r="14" fill="${P.mustardDark}" ${S} stroke-width="3.5"/>
    <ellipse cx="82" cy="78" rx="52" ry="48" fill="${P.mustardDark}" ${S} stroke-width="4"/>
    <ellipse cx="82" cy="96" rx="30" ry="22" fill="${P.floor}" ${S} stroke-width="3"/>
    <ellipse cx="82" cy="84" rx="10" ry="7" fill="${P.navy}"/>
    ${eyes}${mouth}
    <rect x="72" y="106" width="9" height="16" rx="2" fill="#fff" ${S} stroke-width="2.5"/><rect x="83" y="106" width="9" height="16" rx="2" fill="#fff" ${S} stroke-width="2.5"/>
    <path d="M44 34 Q82 6 120 34 L118 44 Q82 24 46 44 Z" fill="${P.mustard}" ${S} stroke-width="3" stroke-linejoin="round"/>`);
}

/** Bruno's lodge of sticks by the river. */
function beaverLodge() {
  let sticks = '';
  for (let i = 0; i < 9; i++) {
    const y = 290 - i * 18, half = 120 - i * 11;
    sticks += `<path d="M${150 - half} ${y} L${150 + half} ${y - 6}" ${S} stroke-width="4" stroke-linecap="round"/>`;
  }
  return svg([0, 0, 300, 300], `
    <rect x="0" y="262" width="300" height="38" fill="${P.water}"/>
    <path d="M0 262 H300" ${S} stroke-width="4"/>
    <path d="M30 290 Q40 140 150 120 Q260 140 270 290 Z" fill="${P.mustardDark}" ${S} stroke-width="4" stroke-linejoin="round"/>
    ${sticks}
    <path d="M120 290 V238 a30 30 0 0 1 60 0 V290 Z" fill="${P.navy}" ${S} stroke-width="4"/>
    <path d="M150 120 L136 70 M150 120 L168 76 M150 120 L150 64" ${S} stroke-width="5" stroke-linecap="round"/>
    <circle cx="168" cy="72" r="8" fill="${P.olive}" ${S} stroke-width="3"/>`);
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
    list.push({ key: `sardina-${m}`, svg: sardina(m), scale: 2.2 });
    list.push({ key: `rumb-${m}`, svg: rumb(m), scale: 1.5 });
    list.push({ key: `heron-${m}`, svg: heron(m), scale: 2.2 });
    list.push({ key: `giraffe-${m}`, svg: giraffe(m), scale: 2.4 });
    list.push({ key: `pip-${m}`, svg: pip(m), scale: 1.8 });
    list.push({ key: `mummy-${m}`, svg: mummy(m), scale: 2 });
    list.push({ key: `wolf-${m}`, svg: wolf(m), scale: 2 });
    list.push({ key: `slime-${m}`, svg: slime(m), scale: 2 });
    list.push({ key: `spider-${m}`, svg: spider(m), scale: 2 });
    list.push({ key: `bat-${m}`, svg: bat(m), scale: 2 });
    list.push({ key: `bruno-${m}`, svg: bruno(m), scale: 1.8 });
  }
  list.push({ key: 'giraffe-surprised', svg: giraffe('surprised'), scale: 2.4 });
  list.push({ key: 'house-pizza', svg: pizzeriaHouse(), scale: 1.6 });
  list.push({ key: 'house-gazebo', svg: gazebo(), scale: 1.6 });
  list.push({ key: 'house-clock', svg: clockTower(), scale: 1.6 });
  list.push({ key: 'house-courier', svg: house(P.terra, 'box'), scale: 1.1 });
  list.push({ key: 'house-pier', svg: pierShip(), scale: 1.6 });
  list.push({ key: 'house-potion', svg: house(P.mustard, 'flask'), scale: 1.1 });
  list.push({ key: 'house-doctor', svg: house(P.paper, 'doctor'), scale: 1.1 });
  list.push({ key: 'house-monsters', svg: monsterHouse(), scale: 1.1 });
  list.push({ key: 'house-beaver', svg: beaverLodge(), scale: 1.6 });
  return list;
}
