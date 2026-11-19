import Phaser from 'phaser';
import { HEX } from './theme';

// The game is drawn for a landscape screen. A phone held upright shows it as a thin strip with tiny
// buttons, so on touch screens in portrait a cover asks to turn the phone and offers full screen,
// which also turns the picture by itself (Android browsers allow an orientation lock in full screen).

const isTouch = () => matchMedia('(pointer: coarse)').matches;
const portrait = matchMedia('(orientation: portrait)');

/** In full screen on a phone, keep the picture landscape even if auto-rotate is off. */
function lockLandscape() {
  if (!isTouch()) return;
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  o?.lock?.('landscape').catch(() => { /* not allowed here (desktop, iPhone): turning by hand still works */ });
}

const PHONE_SVG = `<svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
  <g class="phone"><rect x="38" y="14" width="44" height="92" rx="9" fill="${HEX.paper}" stroke="${HEX.paper}" stroke-width="2"/>
  <rect x="44" y="24" width="32" height="68" rx="3" fill="${HEX.terra}"/><circle cx="60" cy="99" r="3" fill="${HEX.navy}"/></g>
  <path d="M100 40 A44 44 0 0 1 100 80" fill="none" stroke="${HEX.mustard}" stroke-width="6" stroke-linecap="round"/>
  <path d="M92 78 L101 84 L106 74" fill="none" stroke="${HEX.mustard}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function setupOrientation(game: Phaser.Game) {
  game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, lockLandscape);

  const cover = document.createElement('div');
  cover.id = 'rotate';
  cover.innerHTML = `
    <style>
      #rotate { position: fixed; inset: 0; z-index: 10; display: none; flex-direction: column; align-items: center;
        justify-content: center; gap: 28px; padding: 24px; box-sizing: border-box; text-align: center;
        background: ${HEX.navy}; color: ${HEX.paper}; font-family: Nunito, sans-serif; font-weight: 800; }
      #rotate.on { display: flex; }
      #rotate h1 { margin: 0; font-size: 30px; font-weight: 900; }
      #rotate button { font: inherit; font-size: 24px; font-weight: 900; border: 4px solid ${HEX.paper}; border-radius: 999px;
        padding: 16px 32px; background: ${HEX.terra}; color: ${HEX.paper}; }
      #rotate .skip { background: none; border: none; color: ${HEX.paper}; opacity: .7; font-size: 18px; text-decoration: underline; padding: 8px; }
      #rotate .phone { transform-origin: 60px 60px; animation: turn 2.4s ease-in-out infinite; }
      @keyframes turn { 0%, 25% { transform: rotate(0); } 55%, 85% { transform: rotate(-90deg); } 100% { transform: rotate(0); } }
    </style>
    ${PHONE_SVG}
    <h1>Поверни телефон боком</h1>
    <button class="full" type="button">Играть на весь экран</button>
    <button class="skip" type="button">Играть так</button>`;
  document.body.appendChild(cover);

  const full = cover.querySelector<HTMLButtonElement>('.full')!;
  if (!game.scale.fullscreen.available) full.remove();
  // Full screen must start right inside the tap; the lock follows on ENTER_FULLSCREEN.
  full.addEventListener('click', () => game.scale.startFullscreen());

  let skipped = false;
  cover.querySelector('.skip')!.addEventListener('click', () => { skipped = true; update(); });

  const update = () => cover.classList.toggle('on', isTouch() && portrait.matches && !skipped);
  portrait.addEventListener('change', update);
  update();
}
