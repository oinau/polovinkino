import Phaser from 'phaser';
import { W, H } from './theme';

// The game is laid out on a 1920×1080 stage. The canvas fills the whole screen (Scale.EXPAND),
// every camera keeps the stage in the middle, and the margins show the scenes' backgrounds.

/** How far the screen reaches past the stage on each side, in stage pixels. */
export function margins(scene: Phaser.Scene) {
  return { x: (scene.scale.width - W) / 2, y: (scene.scale.height - H) / 2 };
}

/** Screen edges in stage coordinates. */
export function edges(scene: Phaser.Scene) {
  const m = margins(scene);
  return { left: -m.x, right: W + m.x, top: -m.y, bottom: H + m.y };
}

const center = (s: Phaser.Scene) => s.cameras.main?.centerOn(W / 2, H / 2);

/** Centre every scene on creation and after every resize. Scenes listen to `resize` for their own anchors. */
export function keepStageCentered(game: Phaser.Game) {
  for (const s of game.scene.getScenes(false)) s.events.on(Phaser.Scenes.Events.CREATE, () => center(s));
  game.scene.getScenes(true).forEach(center);
  // After the camera managers have resized their cameras.
  game.scale.on(Phaser.Scale.Events.RESIZE, () => setTimeout(() => game.scene.getScenes(true).forEach(center)));
}

/** Calls `place` now and after every resize while the scene runs. */
export function onResize(scene: Phaser.Scene, place: () => void) {
  place();
  const later = () => setTimeout(place);
  scene.scale.on(Phaser.Scale.Events.RESIZE, later);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, later));
}

/** Smallest comfortable size of a round button on screen, in CSS pixels (a fingertip). */
const MIN_BUTTON_CSS = 52;

/**
 * How much to enlarge the corner buttons (drawn 88 stage px wide) so they stay finger-sized
 * on a small screen; 1 on a computer or a tablet.
 */
export function hudScale(scene: Phaser.Scene) {
  const cssPerStagePx = 1 / scene.scale.displayScale.x;
  return Phaser.Math.Clamp(MIN_BUTTON_CSS / (88 * cssPerStagePx), 1, 1.8);
}
