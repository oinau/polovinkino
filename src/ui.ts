import Phaser from 'phaser';
import { C, HEX, FONT, W, H } from './theme';
import { sfx, speak, stopSpeaking } from './audio';
import { store } from './store';

type Scene = Phaser.Scene;

export function label(scene: Scene, x: number, y: number, text: string, size = 40, color: string = HEX.navy, weight = 800) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: String(weight), color, align: 'center',
  }).setOrigin(0.5);
}

export function wrapLabel(scene: Scene, x: number, y: number, text: string, width: number, size = 36, weight = 800) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: String(weight), color: HEX.navy, align: 'center',
    wordWrap: { width, useAdvancedWrap: true }, lineSpacing: 4,
  }).setOrigin(0.5);
}

// ---------- buttons ----------
export interface ButtonOpts {
  w: number;
  h: number;
  fill?: number;
  color?: string;
  size?: number;
  radius?: number;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  private opts: Required<ButtonOpts>;
  private enabled = true;
  private onClick: () => void;

  constructor(scene: Scene, x: number, y: number, caption: string, onClick: () => void, opts: ButtonOpts) {
    super(scene, x, y);
    this.opts = { fill: C.paper, color: HEX.navy, size: 40, radius: 22, ...opts };
    this.onClick = onClick;
    this.bg = scene.add.graphics();
    this.text = label(scene, 0, -3, caption, this.opts.size, this.opts.color, 900);
    this.add([this.bg, this.text]);
    this.draw(false);
    this.setSize(opts.w, opts.h + 8);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.draw(true);
      this.text.y = 3;
    });
    this.on('pointerout', () => { this.draw(false); this.text.y = -3; });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.draw(false);
      this.text.y = -3;
      sfx('click');
      this.onClick();
    });
    scene.add.existing(this);
  }

  private draw(pressed: boolean) {
    const { w, h, fill, radius } = this.opts;
    const g = this.bg.clear();
    const off = pressed ? 6 : 0;
    if (!pressed) {
      g.fillStyle(C.navy).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, radius);
    }
    g.fillStyle(fill).fillRoundedRect(-w / 2, -h / 2 + off, w, h, radius);
    g.lineStyle(5, C.navy).strokeRoundedRect(-w / 2, -h / 2 + off, w, h, radius);
  }

  setFill(fill: number, color?: string) {
    this.opts.fill = fill;
    if (color) { this.opts.color = color; this.text.setColor(color); }
    this.draw(false);
    return this;
  }

  setCaption(s: string) { this.text.setText(s); return this; }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.4);
    return this;
  }
}

/** Round icon button drawn with Graphics (back, sound, close). */
export function iconButton(scene: Scene, x: number, y: number, icon: 'home' | 'sound' | 'mute' | 'close' | 'replay', onClick: () => void, r = 44) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const drawIcon = (kind: typeof icon) => {
    g.clear();
    g.fillStyle(C.navy).fillCircle(0, 5, r);
    g.fillStyle(C.paper).fillCircle(0, 0, r);
    g.lineStyle(5, C.navy).strokeCircle(0, 0, r);
    g.lineStyle(5, C.navy);
    g.fillStyle(C.navy);
    const s = r / 44;
    if (kind === 'home') {
      g.fillTriangle(-22 * s, -2 * s, 0, -22 * s, 22 * s, -2 * s);
      g.fillRect(-15 * s, -4 * s, 30 * s, 22 * s);
      g.fillStyle(C.paper).fillRect(-5 * s, 6 * s, 10 * s, 12 * s);
    } else if (kind === 'sound' || kind === 'mute' || kind === 'replay') {
      g.fillRect(-20 * s, -8 * s, 10 * s, 16 * s);
      g.fillTriangle(-12 * s, 0, 4 * s, -18 * s, 4 * s, 18 * s);
      if (kind === 'mute') {
        g.lineBetween(12 * s, -10 * s, 26 * s, 10 * s);
        g.lineBetween(26 * s, -10 * s, 12 * s, 10 * s);
      } else {
        g.beginPath(); g.arc(4 * s, 0, 12 * s, -0.8, 0.8); g.strokePath();
        g.beginPath(); g.arc(4 * s, 0, 22 * s, -0.8, 0.8); g.strokePath();
      }
    } else if (kind === 'close') {
      g.lineStyle(7, C.navy);
      g.lineBetween(-14 * s, -14 * s, 14 * s, 14 * s);
      g.lineBetween(14 * s, -14 * s, -14 * s, 14 * s);
    }
  };
  drawIcon(icon);
  c.add(g);
  c.setSize(r * 2, r * 2).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.92));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); sfx('click'); onClick(); });
  return Object.assign(c, { setIcon: drawIcon });
}

/** Home + sound buttons shared by every play scene. */
export function topBar(scene: Scene, title: string, onHome: () => void) {
  iconButton(scene, 70, 66, 'home', () => { stopSpeaking(); onHome(); });
  const snd = iconButton(scene, W - 70, 66, store.sound ? 'sound' : 'mute', () => {
    store.sound = !store.sound;
    if (!store.sound) stopSpeaking();
    snd.setIcon(store.sound ? 'sound' : 'mute');
  });
  label(scene, W / 2, 62, title, 40, HEX.navy, 900);
}

// ---------- stacked fraction ----------
export class FractionView extends Phaser.GameObjects.Container {
  private num: Phaser.GameObjects.Text;
  private den: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Rectangle;
  private size: number;

  constructor(scene: Scene, x: number, y: number, n: number | string, d: number | string, size = 56, color: string = HEX.navy) {
    super(scene, x, y);
    this.size = size;
    this.num = label(scene, 0, -size * 0.62, String(n), size, color, 900);
    this.den = label(scene, 0, size * 0.62, String(d), size, color, 900);
    this.bar = scene.add.rectangle(0, 0, size * 1.1, Math.max(4, size / 10), Phaser.Display.Color.HexStringToColor(color).color);
    this.add([this.num, this.bar, this.den]);
    this.fitBar();
    scene.add.existing(this);
  }

  private fitBar() {
    this.bar.width = Math.max(this.num.width, this.den.width, this.size * 0.7) + this.size * 0.25;
  }

  set(n: number | string, d: number | string) {
    this.num.setText(String(n));
    this.den.setText(String(d));
    this.fitBar();
    return this;
  }
}

// ---------- speech bubble ----------
export class Bubble extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  w: number;
  h: number;

  /** tail: point in local coords (relative to bubble centre) the tail should reach */
  constructor(scene: Scene, x: number, y: number, w: number, h: number, tail: { x: number; y: number }) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.drawShape(tail);
    scene.add.existing(this);
  }

  drawShape(tail: { x: number; y: number }) {
    const { w, h } = this;
    const g = this.g.clear();
    const bx = Phaser.Math.Clamp(tail.x, -w / 2 + 60, w / 2 - 60);
    const by = tail.y > 0 ? h / 2 : -h / 2;
    g.fillStyle(C.paper);
    g.lineStyle(5, C.navy);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 30);
    g.fillTriangle(bx - 26, by, bx + 26, by, tail.x, tail.y);
    g.lineBetween(bx - 26, by, tail.x, tail.y);
    g.lineBetween(bx + 26, by, tail.x, tail.y);
    g.fillStyle(C.paper).fillRect(bx - 23, by - (tail.y > 0 ? 6 : -1), 46, 6);
  }

  pop() {
    this.setScale(0.2).setAlpha(0);
    this.scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    return this;
  }
}

// ---------- guidance: instruction pill + bouncing arrow ----------
export class Guide {
  private pill: Phaser.GameObjects.Container;
  private pillBg: Phaser.GameObjects.Graphics;
  private pillText: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Container;
  private arrowTween?: Phaser.Tweens.Tween;
  private scene: Scene;

  constructor(scene: Scene, y = 150) {
    this.scene = scene;
    this.pillBg = scene.add.graphics();
    this.pillText = label(scene, 0, -2, '', 34, HEX.paper, 800).setWordWrapWidth(1500, true).setLineSpacing(2);
    this.pill = scene.add.container(W / 2, y, [this.pillBg, this.pillText]).setDepth(50);
    const a = scene.add.graphics();
    a.fillStyle(C.paper).fillTriangle(-34, -40, 34, -40, 0, 8);
    a.fillStyle(C.paper).fillRect(-16, -84, 32, 50);
    a.fillStyle(C.terra).fillTriangle(-26, -36, 26, -36, 0, 0);
    a.fillStyle(C.terra).fillRect(-10, -78, 20, 44);
    this.arrow = scene.add.container(0, 0, [a]).setDepth(60).setVisible(false);
  }

  say(text: string) {
    this.pillText.setText(text);
    // Long explanations wrap onto a second line; the pill grows with them.
    const w = this.pillText.width + 70, h = Math.max(72, this.pillText.height + 26);
    this.pillBg.clear().fillStyle(C.navy).fillRoundedRect(-w / 2, -h / 2, w, h, 36);
    this.pill.setVisible(text.length > 0);
    this.pill.setScale(0.9);
    this.scene.tweens.add({ targets: this.pill, scale: 1, duration: 200, ease: 'Back.Out' });
  }

  /** Point at a spot; dir is where the arrow comes from. */
  point(x: number, y: number, from: 'top' | 'bottom' | 'left' | 'right' = 'top') {
    const rot = { top: 0, bottom: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[from];
    this.arrow.setPosition(x, y).setRotation(rot).setVisible(true);
    this.arrowTween?.remove();
    const dx = from === 'left' ? -18 : from === 'right' ? 18 : 0;
    const dy = from === 'top' ? -18 : from === 'bottom' ? 18 : 0;
    this.arrowTween = this.scene.tweens.add({
      targets: this.arrow, x: x + dx, y: y + dy, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  hideArrow() {
    this.arrowTween?.remove();
    this.arrow.setVisible(false);
  }
}

// ---------- effects ----------
export function coinsBurst(scene: Scene, x: number, y: number, n = 4) {
  for (let i = 0; i < n; i++) {
    const c = scene.add.container(x + (i - (n - 1) / 2) * 46, y).setDepth(80);
    const g = scene.add.graphics();
    g.fillStyle(C.mustard).fillCircle(0, 0, 22).lineStyle(5, C.navy).strokeCircle(0, 0, 22);
    g.lineStyle(4, C.mustardDark).strokeCircle(0, 0, 12);
    c.add(g);
    scene.tweens.add({
      targets: c, y: y - 220, alpha: 0, duration: 1100, delay: i * 120, ease: 'Cubic.Out',
      onStart: () => sfx('coin'), onComplete: () => c.destroy(),
    });
  }
}

export function steam(scene: Scene, points: { x: number; y: number }[]) {
  points.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      const g = scene.add.graphics().setDepth(70);
      g.fillStyle(C.paper).fillCircle(0, 0, 16).lineStyle(4, C.navy).strokeCircle(0, 0, 16);
      g.setPosition(p.x, p.y);
      scene.tweens.add({
        targets: g, y: p.y - 70, alpha: 0, scale: 1.4, duration: 650, delay: i * 90 + k * 300, onComplete: () => g.destroy(),
      });
    }
  });
}

export function starShape(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(x + rr * Math.cos(a), y + rr * Math.sin(a)));
  }
  g.fillStyle(filled ? C.mustard : C.sand).fillPoints(pts, true);
  g.lineStyle(Math.max(3, r / 9), C.navy).strokePoints(pts, true);
}

// ---------- modal panel ----------
export function modal(scene: Scene, w: number, h: number) {
  const layer = scene.add.container(0, 0).setDepth(100);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, C.navy, 0.55).setInteractive();
  const g = scene.add.graphics();
  g.fillStyle(C.navy).fillRoundedRect(W / 2 - w / 2, H / 2 - h / 2 + 10, w, h, 40);
  g.fillStyle(C.cream).fillRoundedRect(W / 2 - w / 2, H / 2 - h / 2, w, h, 40);
  g.lineStyle(6, C.navy).strokeRoundedRect(W / 2 - w / 2, H / 2 - h / 2, w, h, 40);
  layer.add([dim, g]);
  layer.setAlpha(0);
  scene.tweens.add({ targets: layer, alpha: 1, duration: 200 });
  return layer;
}

/** Stars + coins + buttons shown at the end of a level. */
export function resultModal(
  scene: Scene,
  o: { title: string; stars: number; coins: number; note: string; onMap: () => void; onRetry: () => void; onNext?: () => void },
) {
  const layer = modal(scene, 1000, 640);
  const cx = W / 2, top = H / 2 - 320;
  layer.add(label(scene, cx, top + 80, o.title, 58, HEX.navy, 900));
  const g = scene.add.graphics();
  layer.add(g);
  [0, 1, 2].forEach(i => {
    const x = cx + (i - 1) * 160, y = top + 220, r = i === 1 ? 74 : 62;
    starShape(g, x, y, r, false);
    if (i >= o.stars) return;
    scene.time.delayedCall(350 + i * 300, () => {
      starShape(g, x, y, r, true);
      sfx('star');
    });
  });
  layer.add(wrapLabel(scene, cx, top + 360, o.note, 820, 34, 700));
  layer.add(label(scene, cx, top + 430, `+${o.coins} монет`, 36, HEX.terra, 900));
  const bw = 270, y = top + 540;
  const btns: Button[] = [
    new Button(scene, cx - (o.onNext ? 300 : 150), y, 'На карту', o.onMap, { w: bw, h: 90, size: 34 }),
    new Button(scene, cx + (o.onNext ? 0 : 150), y, 'Ещё раз', o.onRetry, { w: bw, h: 90, size: 34 }),
  ];
  if (o.onNext) btns.push(new Button(scene, cx + 300, y, 'Дальше →', o.onNext, { w: bw, h: 90, size: 34, fill: C.olive, color: HEX.paper }));
  layer.add(btns);
  return layer;
}

export function starsFor(mistakes: number) {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

// ---------- heroes ----------
/** Navy pill with the hero's name. */
export function nameTag(scene: Scene, x: number, y: number, text: string) {
  const t = label(scene, 0, -2, text, 30, HEX.paper, 900);
  const w = t.width + 44, h = 52;
  const g = scene.add.graphics();
  g.fillStyle(C.navy).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  return scene.add.container(x, y, [g, t]);
}

/** «Знакомься!» card shown the first time a hero appears. */
export function meetCard(scene: Scene, hero: { name: string; textures: string[]; intro: string }, onClose: () => void) {
  const layer = modal(scene, 1240, 620);
  const cx = W / 2, cy = H / 2;
  const box = { x: cx - 330, w: 460, h: 420 };
  hero.textures.forEach((key, i) => {
    const img = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    const n = hero.textures.length;
    const scale = Math.min(box.h / img.height, box.w / n / img.width) * 0.95;
    img.setScale(scale).setPosition(box.x + (i - (n - 1) / 2) * (box.w / n), cy + box.h / 2);
    if (i === 1) img.setFlipX(true);
    layer.add(img);
    scene.tweens.add({ targets: img, y: img.y - 14, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  });
  const tx = cx + 260;
  layer.add(label(scene, tx, cy - 220, 'Знакомься!', 34, HEX.terra, 900));
  layer.add(wrapLabel(scene, tx, cy - 150, hero.name, 600, 54, 900));
  layer.add(wrapLabel(scene, tx, cy + 10, hero.intro, 600, 32, 700));
  layer.add(new Button(scene, tx, cy + 220, 'Привет!', () => {
    stopSpeaking();
    layer.destroy();
    onClose();
  }, { w: 300, h: 92, fill: C.olive, color: HEX.paper }));
  speak(hero.intro);
  return layer;
}
