import Phaser from 'phaser';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { HEX, W, H } from './theme';
import { Boot } from './scenes/Boot';
import { Town } from './scenes/Town';
import { Pizzeria } from './scenes/Pizzeria';
import { Gnomes } from './scenes/Gnomes';

async function start() {
  // Canvas text needs the font (with Cyrillic glyphs) ready before the first draw.
  await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 40px Nunito`, 'Пицца 1/3')));

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: HEX.cream,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H,
    },
    scene: [Boot, Town, Pizzeria, Gnomes],
  });
  if (import.meta.env.DEV) Object.assign(window, { __game: game });
}

start();
