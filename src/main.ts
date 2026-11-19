import Phaser from 'phaser';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { HEX, W, H } from './theme';
import { loadRecordings, loadVoices } from './audio';
import { keepStageCentered } from './stage';
import { setupOrientation } from './orientation';
import { Boot } from './scenes/Boot';
import { Town } from './scenes/Town';
import { Pizzeria } from './scenes/Pizzeria';
import { Gnomes } from './scenes/Gnomes';
import { Clock } from './scenes/Clock';
import { Pier } from './scenes/Pier';
import { Doctor } from './scenes/Doctor';
import { Potion } from './scenes/Potion';
import { Monsters } from './scenes/Monsters';
import { Beaver } from './scenes/Beaver';
import { Courier } from './scenes/Courier';

async function start() {
  // Browser voices arrive asynchronously; start asking now, speech waits for them if needed.
  loadVoices();
  // Canvas text needs the font (with Cyrillic glyphs) ready before the first draw.
  await Promise.all([
    ...['700', '800', '900'].map(w => document.fonts.load(`${w} 40px Nunito`, 'Пицца 1/3')),
    loadRecordings(),
  ]);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: HEX.cream,
    scale: {
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H,
      // The whole page goes full screen, so the «turn the phone» cover (a sibling of the canvas) stays visible.
      fullscreenTarget: document.documentElement,
    },
    scene: [Boot, Town, Pizzeria, Gnomes, Clock, Pier, Beaver, Doctor, Potion, Courier, Monsters],
  });
  game.events.once(Phaser.Core.Events.READY, () => keepStageCentered(game));
  setupOrientation(game);
  if (import.meta.env.DEV) Object.assign(window, { __game: game });
}

start();
