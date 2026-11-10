import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { BEAVER_LEVELS, type BeaverLevel, type BeaverRound } from '../levels';
import { gcd, str, type Frac } from '../fractions';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { BEAVER_LINES, BEAVER_NOTES, HEROES, beaverAsk, beaverExplain, beaverTooLong } from '../lines';
import { store } from '../store';
import { Bubble, Button, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, topBar, wrapLabel } from '../ui';

/** Pixels in one whole plank. */
const U = 600;
const DECK_Y = 560;
const PLANK_H = 46;
const GAP_X = 560;
const BANK_Y = 620;
const WATER = { top: 640, bottom: 860 };
const PILE_Y = 950;
const BRUNO = { x: 1770, y: BANK_Y };

type Plank = { p: Frac; c: Phaser.GameObjects.Container; placed: boolean; slot: number };

const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

export class Beaver extends Phaser.Scene {
  private levelIndex = 0;
  private level!: BeaverLevel;
  private roundIndex = 0;
  private r!: BeaverRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private busy = true;

  /** Everything in 1/L units, so sums stay exact. */
  private L = 1;
  private planks: Plank[] = [];
  private placed: Plank[] = [];

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private bruno!: Phaser.GameObjects.Image;
  private bridge!: Phaser.GameObjects.Graphics;
  private bubble?: Bubble;
  private next!: Button;
  private walker?: Phaser.GameObjects.Image;

  constructor() { super('Beaver'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = BEAVER_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.busy = true;
    this.planks = [];
    this.placed = [];
    this.bubble = undefined;
    this.walker = undefined;
  }

  create() {
    this.drawRiver();
    topBar(this, `Мост бобра ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();
    this.bridge = this.add.graphics();

    this.bruno = this.add.image(BRUNO.x, BRUNO.y, 'bruno-normal').setOrigin(0.5, 1);
    this.bruno.setScale(260 / this.bruno.height);
    this.tweens.add({ targets: this.bruno, scaleY: this.bruno.scaleY * 1.03, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    nameTag(this, BRUNO.x, BANK_Y + 40, 'Бруно');

    this.guide = new Guide(this, 150);
    this.next = new Button(this, 1700, 1010, 'Дальше →', () => this.nextRound(), { w: 320, h: 92, fill: C.olive, color: HEX.paper });
    this.next.setVisible(false);

    if (store.met('bruno')) this.showIntro();
    else meetCard(this, HEROES.bruno, () => { store.meet('bruno'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawRiver() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    g.fillStyle(C.water).fillRect(-BLEED, WATER.top, W + 2 * BLEED, WATER.bottom - WATER.top);
    g.lineStyle(4, C.paper);
    for (const [x, y] of [[620, 700], [900, 760], [1180, 690], [760, 820], [1080, 830]]) {
      g.beginPath().arc(x, y, 16, Math.PI, 0).arc(x + 32, y, 16, Math.PI, 0).strokePath();
    }
    // Banks: left and right of the river, and the near bank at the bottom where the planks lie.
    g.fillStyle(C.olive).fillRect(-BLEED, BANK_Y, 420 + BLEED, WATER.bottom - BANK_Y).fillRect(1460, BANK_Y, W - 1460 + BLEED, WATER.bottom - BANK_Y);
    g.fillStyle(C.oliveLight).fillRect(-BLEED, WATER.bottom, W + 2 * BLEED, H - WATER.bottom + BLEED);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, BANK_Y, 420, BANK_Y).lineBetween(1460, BANK_Y, W + BLEED, BANK_Y)
      .lineBetween(-BLEED, WATER.bottom, W + BLEED, WATER.bottom).lineBetween(420, BANK_Y, 420, WATER.bottom).lineBetween(1460, BANK_Y, 1460, WATER.bottom);
  }

  /** The two halves of the bridge with the hole between them, and division marks under the hole. */
  private drawBridge() {
    const g = this.bridge.clear();
    const end = GAP_X + this.value(this.r.gap) * U;
    const deck = (x0: number, x1: number) => {
      g.fillStyle(C.navy).fillRect(x0, DECK_Y + 6, x1 - x0, PLANK_H);
      g.fillStyle(C.mustardDark).fillRect(x0, DECK_Y, x1 - x0, PLANK_H).lineStyle(4, C.navy).strokeRect(x0, DECK_Y, x1 - x0, PLANK_H);
      for (let x = x0 + 60; x < x1; x += 60) g.lineStyle(3, C.navy).lineBetween(x, DECK_Y, x, DECK_Y + PLANK_H);
    };
    deck(180, GAP_X);
    deck(end, 1640);
    // Posts down into the water.
    for (const x of [GAP_X - 30, end + 10]) g.fillStyle(C.mustardDark).fillRect(x, DECK_Y + PLANK_H, 20, WATER.bottom - DECK_Y - PLANK_H).lineStyle(4, C.navy).strokeRect(x, DECK_Y + PLANK_H, 20, WATER.bottom - DECK_Y - PLANK_H);
    if (this.r.marks) {
      g.lineStyle(3, C.navy, 0.45);
      for (let k = 1; k < this.r.marks * this.value(this.r.gap); k++) {
        const x = GAP_X + (U * k) / this.r.marks;
        for (let y = DECK_Y + 4; y < DECK_Y + PLANK_H; y += 12) g.lineBetween(x, y, x, y + 6);
      }
    }
    // The hole's outline, so its length is clear.
    g.lineStyle(3, C.terra);
    for (let x = GAP_X; x < end; x += 24) g.lineBetween(x, DECK_Y, Math.min(end, x + 12), DECK_Y).lineBetween(x, DECK_Y + PLANK_H, Math.min(end, x + 12), DECK_Y + PLANK_H);
  }

  private drawDots() {
    const g = this.dots.clear();
    this.level.rounds.forEach((_, i) => {
      const x = 150 + i * 46, y = 66;
      g.fillStyle(i < this.roundIndex ? C.olive : C.paper).fillCircle(x, y, 15);
      g.lineStyle(4, C.navy).strokeCircle(x, y, 15);
    });
  }

  private showIntro() {
    const layer = modal(this, 1100, 520);
    layer.add(label(this, W / 2, H / 2 - 170, `Мост бобра ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 960, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 170, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  // ---------- planks ----------
  private value(p: Frac) { return p.n / p.d; }
  private units(p: Frac) { return (p.n * this.L) / p.d; }
  private filled() { return this.placed.reduce((a, k) => a + this.units(k.p), 0); }

  private makePlank(p: Frac, slot: number) {
    const w = this.value(p) * U;
    const c = this.add.container(0, 0).setDepth(5);
    const g = this.add.graphics();
    g.fillStyle(C.navy).fillRect(-w / 2, -PLANK_H / 2 + 6, w, PLANK_H);
    g.fillStyle(C.mustard).fillRect(-w / 2, -PLANK_H / 2, w, PLANK_H).lineStyle(4, C.navy).strokeRect(-w / 2, -PLANK_H / 2, w, PLANK_H);
    g.lineStyle(2, C.mustardDark).lineBetween(-w / 2 + 10, -6, w / 2 - 10, -10).lineBetween(-w / 2 + 14, 10, w / 2 - 14, 8);
    c.add([g, label(this, 0, -1, str(p), 26, HEX.navy, 900)]);
    c.setSize(w, PLANK_H + 20).setInteractive({ useHandCursor: true });
    const plank: Plank = { p, c, placed: false, slot };
    c.on('pointerup', () => this.tap(plank));
    return plank;
  }

  /** Planks lie on the near bank in a row. */
  private pileX(slot: number) {
    let x = 200;
    for (let i = 0; i < slot; i++) x += this.value(this.planks[i].p) * U + 30;
    return x + (this.value(this.planks[slot].p) * U) / 2;
  }

  private layoutPlaced() {
    let x = GAP_X;
    for (const k of this.placed) {
      const w = this.value(k.p) * U;
      this.tweens.add({ targets: k.c, x: x + w / 2, y: DECK_Y + PLANK_H / 2, duration: 260, ease: 'Cubic.Out' });
      x += w;
    }
  }

  tap(k: Plank) {
    if (this.busy) return;
    sfx('click');
    if (k.placed) {
      // Take it back to the bank; the rest close up.
      k.placed = false;
      this.placed = this.placed.filter(x => x !== k);
      this.tweens.add({ targets: k.c, x: this.pileX(k.slot), y: PILE_Y, duration: 260 });
      this.layoutPlaced();
      return;
    }
    const gap = this.units(this.r.gap), have = this.filled(), add = this.units(k.p);
    if (have + add > gap) { this.tooLong(k, gap - have); return; }
    k.placed = true;
    this.placed.push(k);
    this.layoutPlaced();
    if (have + add === gap) {
      this.busy = true;
      this.time.delayedCall(400, () => this.success());
    }
  }

  /** It sticks out over the water, turns red and goes back. */
  private tooLong(k: Plank, leftUnits: number) {
    this.busy = true;
    const w = this.value(k.p) * U;
    const x = GAP_X + (this.filled() / this.L) * U + w / 2;
    const left = { n: leftUnits, d: this.L };
    const g = gcd(left.n, left.d) || 1;
    const leftFr = { n: left.n / g, d: left.d / g };
    this.tweens.add({ targets: k.c, x, y: DECK_Y + PLANK_H / 2 - 30, angle: -6, duration: 260 });
    (k.c.list[0] as Phaser.GameObjects.Graphics).setAlpha(0.7);
    this.mistake(beaverTooLong(leftFr, k.p), [beaverTooLong(leftFr, k.p, true)]);
    this.time.delayedCall(1100, () => {
      (k.c.list[0] as Phaser.GameObjects.Graphics).setAlpha(1);
      this.tweens.add({ targets: k.c, x: this.pileX(k.slot), y: PILE_Y, angle: 0, duration: 300 });
      this.busy = false;
    });
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.planks.forEach(k => k.c.destroy());
    this.walker?.destroy();
    this.walker = undefined;
    this.placed = [];
    this.L = this.r.planks.reduce((a, p) => lcm(a, p.d), this.r.gap.d);
    this.planks = [];
    this.r.planks.forEach((p, i) => this.planks.push(this.makePlank(p, i)));
    this.planks.forEach(k => k.c.setPosition(this.pileX(k.slot), PILE_Y));
    this.drawBridge();
    this.setMood('normal');
    this.next.setVisible(false);
    const ask = beaverAsk(this.r.gap);
    this.say(ask);
    speak(ask);
    this.guide.say('Нажимай на доски: они лягут в дыру. Нажми на доску в мосту — она вернётся.');
    this.busy = false;
  }

  private success() {
    const r = this.r, placed = this.placed.map(k => k.p);
    sfx('good');
    this.setMood('happy');
    this.say(BEAVER_LINES.done);
    this.guide.say(`Верно! ${beaverExplain(placed, r.gap)}`);
    speakSeq([BEAVER_LINES.done, `Верно! ${beaverExplain(placed, r.gap, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, GAP_X + (this.value(r.gap) * U) / 2, DECK_Y - 120, earned);
    // Someone crosses the mended bridge.
    const w = this.walker = this.add.image(120, DECK_Y, 'osya-happy').setOrigin(0.5, 1).setDepth(6);
    w.setScale(120 / w.height);
    this.tweens.add({ targets: w, x: 1640, duration: 2600, ease: 'Sine.InOut' });
    this.tweens.add({ targets: w, y: DECK_Y - 10, duration: 160, yoyo: true, repeat: 7 });
    this.next.setVisible(true);
  }

  private say(text: string) {
    this.bubble?.destroy();
    const b = this.bubble = new Bubble(this, 1360, 250, 620, 170, { x: BRUNO.x - 40 - 1360, y: BRUNO.y - 230 - 250 });
    b.add(wrapLabel(this, 0, 0, text, 570, 30, 800));
    b.pop();
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    this.tweens.add({ targets: this.bruno, x: BRUNO.x + 10, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.bruno.setX(BRUNO.x) });
    this.guide.say(screen);
    speakSeq(spoken);
    this.time.delayedCall(1600, () => this.setMood('normal'));
  }

  private nextRound() {
    this.next.setVisible(false);
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.busy = true;
    this.planks.forEach(k => k.c.destroy());
    this.planks = [];
    this.walker?.destroy();
    this.bubble?.destroy();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('beaver', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < BEAVER_LEVELS.length;
    resultModal(this, {
      title: 'Мост починен!',
      stars,
      coins: this.coins,
      note: BEAVER_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(BEAVER_NOTES[stars]);
  }

  private setMood(m: Mood) {
    this.bruno.setTexture(`bruno-${m}`);
  }
}
