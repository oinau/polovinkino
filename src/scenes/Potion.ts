import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { INGREDIENTS, POTION_LEVELS, potionNumbers, potionOptions, type IngredientId, type PotionLevel, type PotionRound } from '../levels';
import { sameValue, str, type Frac } from '../fractions';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import {
  HEROES, INGREDIENT, POTION_GAGS, POTION_LINES, POTION_NOTES, potionAsk, potionDenominatorHint, potionExplain, potionPourExplain,
  potionQuestion,
} from '../lines';
import { store } from '../store';
import { Bubble, Button, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, steam, topBar, wrapLabel } from '../ui';

const FLOOR = 940;
const FLASK = { x: 820, top: 300, bottom: 880, w: 220 };
const PIP = { x: 1110, y: FLOOR };
const RECIPE = { x: 330, y: 560, w: 470, h: 460 };
const TABLE_Y = 880;
const BOTTLE_X = [1370, 1520, 1670, 1820];
const BTN_Y = 1012;

const COLOR: Record<IngredientId, number> = { frog: C.olive, moon: C.water, pepper: C.terra, honey: C.mustard };

type Phase = 'busy' | 'pour' | 'answer';
type Layer = { id: IngredientId; n: number };

export class Potion extends Phaser.Scene {
  private levelIndex = 0;
  private level!: PotionLevel;
  private roundIndex = 0;
  private r!: PotionRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';

  /** What is in the flask, bottom to top. */
  private layers: Layer[] = [];
  /** What the child poured this time (the flask may start with something in it). */
  private poured: Partial<Record<IngredientId, number>> = {};

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private pip!: Phaser.GameObjects.Image;
  private pipScale = 1;
  private liquid!: Phaser.GameObjects.Graphics;
  private flaskMarks!: Phaser.GameObjects.Graphics;
  private flaskLabels: Phaser.GameObjects.Text[] = [];
  private recipe!: Phaser.GameObjects.Container;
  private bubble?: Bubble;
  private bottles: Phaser.GameObjects.Container[] = [];
  private buttons: Button[] = [];
  private brewBtn!: Button;
  private emptyBtn!: Button;
  private next!: Button;

  constructor() { super('Potion'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = POTION_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.phase = 'busy';
    this.layers = [];
    this.poured = {};
    this.flaskLabels = [];
    this.bottles = [];
    this.buttons = [];
    this.bubble = undefined;
  }

  create() {
    this.drawRoom();
    topBar(this, `Зельеварня ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.drawFlask();
    this.liquid = this.add.graphics();
    this.flaskMarks = this.add.graphics();

    this.pip = this.add.image(PIP.x, PIP.y, 'pip-normal').setOrigin(0.5, 1);
    this.pipScale = 300 / this.pip.height;
    this.pip.setScale(this.pipScale);
    nameTag(this, PIP.x, FLOOR + 40, 'Пип');

    INGREDIENTS.forEach((id, i) => this.bottles.push(this.makeBottle(id, BOTTLE_X[i])));
    this.recipe = this.add.container(RECIPE.x, RECIPE.y);

    this.guide = new Guide(this, 150);
    this.brewBtn = new Button(this, FLASK.x, BTN_Y, 'Варить!', () => this.brew(), { w: 300, h: 92, fill: C.olive, color: HEX.paper });
    this.emptyBtn = new Button(this, FLASK.x - 290, BTN_Y, 'Вылить', () => this.empty(), { w: 220, h: 80, size: 32 });
    this.next = new Button(this, FLASK.x, BTN_Y, 'Дальше →', () => this.nextRound(), { w: 340, h: 92, fill: C.olive, color: HEX.paper });
    [this.brewBtn, this.emptyBtn, this.next].forEach(b => b.setVisible(false));

    if (store.met('pip')) this.showIntro();
    else meetCard(this, HEROES.pip, () => { store.meet('pip'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    g.fillStyle(C.sand).fillRect(-BLEED, FLOOR, W + 2 * BLEED, H - FLOOR + BLEED);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, FLOOR, W + BLEED, FLOOR);
    // A shelf with jars far back, for the mood.
    g.fillStyle(C.mustardDark).fillRect(1240, 260, 640, 18).lineStyle(4, C.navy).strokeRect(1240, 260, 640, 18);
    [[1290, C.olive], [1380, C.terra], [1470, C.water], [1580, C.mustard], [1680, C.oliveLight], [1790, C.terra]].forEach(([x, c], i) => {
      const h = 50 + (i % 3) * 14;
      g.fillStyle(C.paper).fillRoundedRect(x - 28, 260 - h, 56, h, 10).lineStyle(4, C.navy).strokeRoundedRect(x - 28, 260 - h, 56, h, 10);
      g.fillStyle(c).fillRoundedRect(x - 22, 260 - h * 0.6, 44, h * 0.6 - 6, 6);
    });
    // Work table under the bottles.
    g.fillStyle(C.navy).fillRect(1270, TABLE_Y + 6, 620, 34);
    g.fillStyle(C.mustardDark).fillRect(1270, TABLE_Y, 620, 34).lineStyle(5, C.navy).strokeRect(1270, TABLE_Y, 620, 34);
    g.fillStyle(C.mustardDark).fillRect(1300, TABLE_Y + 34, 24, FLOOR - TABLE_Y - 34).fillRect(1836, TABLE_Y + 34, 24, FLOOR - TABLE_Y - 34);
    g.lineStyle(4, C.navy).strokeRect(1300, TABLE_Y + 34, 24, FLOOR - TABLE_Y - 34).strokeRect(1836, TABLE_Y + 34, 24, FLOOR - TABLE_Y - 34);
  }

  /** A straight glass cylinder, so the level reads as a fraction; it stands on a little burner. */
  private drawFlask() {
    const g = this.add.graphics();
    const { x, top, bottom, w } = FLASK;
    g.fillStyle(C.paper).fillRoundedRect(x - w / 2, top, w, bottom - top, { tl: 8, tr: 8, bl: 36, br: 36 });
    g.fillStyle(C.navy).fillRect(x - 90, bottom + 6, 180, 20).fillStyle(C.terra).fillTriangle(x - 30, bottom + 50, x, bottom + 2, x + 30, bottom + 50);
    g.fillStyle(C.mustardDark).fillRect(x - 70, bottom + 26, 140, FLOOR - bottom - 26).lineStyle(4, C.navy).strokeRect(x - 70, bottom + 26, 140, FLOOR - bottom - 26);
    this.add.graphics().setDepth(3).lineStyle(6, C.navy)
      .strokeRoundedRect(x - w / 2, top, w, bottom - top, { tl: 8, tr: 8, bl: 36, br: 36 })
      .lineBetween(x - w / 2 - 16, top, x + w / 2 + 16, top);
  }

  private drawMarks() {
    const g = this.flaskMarks.clear().setDepth(4);
    this.flaskLabels.forEach(t => t.destroy());
    this.flaskLabels = [];
    const d = this.r.d, { x, top, bottom, w } = FLASK;
    for (let k = 1; k <= d; k++) {
      const y = bottom - ((bottom - top) * k) / d;
      g.lineStyle(4, C.navy).lineBetween(x - w / 2, y, x - w / 2 + (k === d ? w : 40), y);
      if (this.level.guide || k === d) {
        this.flaskLabels.push(label(this, x - w / 2 - 14, y, k === d ? '1' : `${k}/${d}`, k === d ? 34 : 28, HEX.navy, 900).setOrigin(1, 0.5));
      }
    }
  }

  private drawLiquid(tint?: number) {
    const g = this.liquid.clear();
    const d = this.r.d, { x, bottom, top, w } = FLASK, part = (bottom - top) / d;
    let k = 0;
    this.layers.forEach((l, i) => {
      const y1 = bottom - part * (k + l.n), y0 = bottom - part * k;
      g.fillStyle(tint ?? COLOR[l.id]);
      const bottomRound = i === 0 ? 34 : 0;
      g.fillRoundedRect(x - w / 2 + 4, y1, w - 8, y0 - y1 - (i === 0 ? 4 : 0), { tl: 0, tr: 0, bl: bottomRound, br: bottomRound });
      k += l.n;
    });
  }

  private makeBottle(id: IngredientId, x: number) {
    const c = this.add.container(x, TABLE_Y);
    const g = this.add.graphics();
    g.fillStyle(C.paper).fillRoundedRect(-50, -150, 100, 150, 22).lineStyle(5, C.navy).strokeRoundedRect(-50, -150, 100, 150, 22);
    g.fillStyle(COLOR[id]).fillRoundedRect(-42, -110, 84, 102, 16);
    g.fillStyle(C.paper).fillRect(-18, -192, 36, 44).lineStyle(5, C.navy).strokeRect(-18, -192, 36, 44);
    g.fillStyle(C.mustardDark).fillRoundedRect(-22, -212, 44, 24, 6).lineStyle(4, C.navy).strokeRoundedRect(-22, -212, 44, 24, 6);
    // The name goes on the floor in front of the table, clear of its edge.
    c.add([g, wrapLabel(this, 0, FLOOR - TABLE_Y + 48, INGREDIENT[id].name, 140, 22, 900)]);
    // A container's hit area is measured from its top-left corner (centre minus half the size), not from its centre:
    // this one covers x -65..65 and y -215..145 around the bottle's foot, from the cap to the name on the floor.
    c.setSize(130, 230).setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, -100, 130, 360), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    c.on('pointerup', () => this.pour(id));
    return c;
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
    layer.add(label(this, W / 2, H / 2 - 170, `Зельеварня ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 960, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 170, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  // ---------- recipe card ----------
  private drawRecipe() {
    const c = this.recipe.removeAll(true);
    const { w, h } = RECIPE, r = this.r, d = r.d;
    const g = this.add.graphics();
    g.fillStyle(C.navy).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 24);
    g.fillStyle(C.paper).fillRoundedRect(-w / 2, -h / 2, w, h, 24).lineStyle(5, C.navy).strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
    c.add([g, label(this, 0, -h / 2 + 50, r.kind === 'brew' ? 'Рецепт' : 'Задание', 40, HEX.terra, 900)]);
    const row = (y: number, id: IngredientId | null, text: string, frac: Frac | null, done = false) => {
      const sw = this.add.graphics();
      if (id) sw.fillStyle(COLOR[id]).fillRoundedRect(-w / 2 + 24, y - 20, 40, 40, 10).lineStyle(4, C.navy).strokeRoundedRect(-w / 2 + 24, y - 20, 40, 40, 10);
      c.add([sw, label(this, -w / 2 + (id ? 80 : 30), y, text, 28, HEX.navy, 800).setOrigin(0, 0.5)]);
      if (frac) c.add(label(this, w / 2 - 70, y, frac.n === frac.d ? '1' : str(frac), 34, HEX.navy, 900));
      if (done) {
        const t = this.add.graphics().lineStyle(8, C.olive);
        t.beginPath().moveTo(w / 2 - 34, y).lineTo(w / 2 - 24, y + 12).lineTo(w / 2 - 6, y - 14).strokePath();
        c.add(t);
      }
    };
    if (r.kind === 'brew') {
      r.recipe.forEach(([id, n], i) => row(-h / 2 + 130 + i * 80, id, INGREDIENT[id].name, { n, d }, this.level.guide && (this.poured[id] ?? 0) === n));
    } else {
      row(-h / 2 + 130, null, 'Нужно зелья:', { n: r.target, d });
      r.start.forEach(([id, n], i) => row(-h / 2 + 210 + i * 70, id, `Уже: ${INGREDIENT[id].name.toLowerCase()}`, { n, d }));
      row(-h / 2 + 230 + r.start.length * 70, r.add, `Долей: ${INGREDIENT[r.add].name.toLowerCase()}`, null);
    }
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.resetPip();
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    this.next.setVisible(false);
    this.guide.say('');
    this.drawMarks();
    this.fillStart();
    this.drawRecipe();
    const ask = potionAsk(this.r);
    this.pipSays(ask);
    speak(ask);
    this.phase = 'pour';
    this.brewBtn.setVisible(true).setEnabled(true);
    this.emptyBtn.setVisible(true).setEnabled(true);
    this.guide.say(this.level.guide ? 'Нажимай на бутылки: каждое нажатие — одна часть колбы. Потом «Варить!»'
      : this.r.kind === 'top' ? 'Долей нужное и нажми «Варить!»' : 'Налей по рецепту и нажми «Варить!»');
  }

  private fillStart() {
    this.layers = this.r.kind === 'top' ? this.r.start.map(([id, n]) => ({ id, n })) : [];
    this.poured = {};
    this.drawLiquid();
  }

  private inFlask() {
    return this.layers.reduce((a, l) => a + l.n, 0);
  }

  pour(id: IngredientId) {
    if (this.phase !== 'pour') return;
    const b = this.bottles[INGREDIENTS.indexOf(id)];
    sfx('click');
    this.tweens.add({ targets: b, angle: -18, duration: 120, yoyo: true });
    if (this.inFlask() + 1 > this.r.d) { this.boom(); return; }
    const last = this.layers.at(-1);
    if (last?.id === id) last.n++; else this.layers.push({ id, n: 1 });
    this.poured[id] = (this.poured[id] ?? 0) + 1;
    // A drop flies from the bottle into the flask, then the level rises.
    const drop = this.add.circle(b.x, TABLE_Y - 220, 16, COLOR[id]).setStrokeStyle(4, C.navy).setDepth(5);
    this.tweens.add({ targets: drop, x: FLASK.x, duration: 380, ease: 'Sine.Out' });
    this.tweens.add({
      targets: drop, y: { from: TABLE_Y - 220, to: FLASK.top - 40 }, duration: 190, yoyo: false, ease: 'Quad.Out',
      onComplete: () => this.tweens.add({ targets: drop, y: FLASK.top + 30, duration: 190, ease: 'Quad.In', onComplete: () => drop.destroy() }),
    });
    this.drawLiquid();
    if (this.level.guide) this.drawRecipe();
  }

  /** Too much: the flask overflows with a puff. */
  private boom() {
    this.phase = 'busy';
    sfx('bad');
    const puffs: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const p = this.add.circle(FLASK.x + Math.cos(a) * 40, FLASK.top + Math.sin(a) * 30, 40, C.paper).setStrokeStyle(5, C.terra).setDepth(20).setScale(0.2);
      puffs.push(p);
      this.tweens.add({ targets: p, x: FLASK.x + Math.cos(a) * 160, y: FLASK.top - 40 + Math.sin(a) * 110, scale: 1.4, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => p.destroy() });
    }
    const t = label(this, FLASK.x, FLASK.top - 60, 'БАБАХ!', 72, HEX.terra, 900).setDepth(21);
    this.tweens.add({ targets: t, scale: 1.3, alpha: 0, delay: 500, duration: 700, onComplete: () => t.destroy() });
    this.mistake(POTION_LINES.boom, [POTION_LINES.boom]);
    this.time.delayedCall(1100, () => { this.fillStart(); this.drawRecipe(); this.phase = 'pour'; });
  }

  private empty() {
    if (this.phase !== 'pour') return;
    sfx('click');
    this.fillStart();
    this.drawRecipe();
  }

  /** Is the flask filled exactly as asked? */
  private pouredRight() {
    const r = this.r;
    if (r.kind === 'top') return Object.keys(this.poured).every(id => id === r.add) && this.inFlask() === r.target;
    const need = new Map(r.recipe);
    return Object.entries(this.poured).every(([id, n]) => need.get(id as IngredientId) === n) && r.recipe.every(([id, n]) => this.poured[id] === n);
  }

  private brew() {
    if (this.phase !== 'pour') return;
    this.phase = 'busy';
    const r = this.r;
    if (!this.pouredRight()) {
      const other = r.kind === 'top' && Object.keys(this.poured).some(id => id !== r.add);
      const why = other ? `Долить нужно только ${INGREDIENT[(r as Extract<PotionRound, { kind: 'top' }>).add].gen}!` : potionPourExplain(r, this.poured);
      const whySpoken = other ? why : potionPourExplain(r, this.poured, true);
      this.drawLiquid(C.floor);
      steam(this, [{ x: FLASK.x - 40, y: FLASK.top }, { x: FLASK.x + 40, y: FLASK.top + 10 }]);
      this.mistake(`${POTION_LINES.fizzle} ${why}`, [POTION_LINES.fizzle, whySpoken]);
      this.time.delayedCall(1800, () => { this.fillStart(); this.drawRecipe(); this.phase = 'pour'; });
      return;
    }
    sfx('good');
    this.brewBtn.setVisible(false);
    this.emptyBtn.setVisible(false);
    this.bubbleUp();
    this.pipSays(POTION_LINES.brewing);
    const q = potionQuestion(r);
    speakSeq([POTION_LINES.brewing, q]);
    this.time.delayedCall(1200, () => {
      this.guide.say(q);
      Phaser.Utils.Array.Shuffle(potionOptions(r)).forEach((o, i) => {
        const b = new Button(this, FLASK.x + (i - 1) * 240, BTN_Y, o.n === o.d ? '1' : str(o), () => this.answer(o, b), { w: 210, h: 92, size: 44 });
        this.buttons.push(b);
      });
      this.phase = 'answer';
    });
  }

  /** Bubbles rise in the flask: it is boiling. */
  private bubbleUp() {
    const top = FLASK.bottom - ((FLASK.bottom - FLASK.top) * this.inFlask()) / this.r.d;
    for (let i = 0; i < 14; i++) {
      const b = this.add.circle(FLASK.x + Phaser.Math.Between(-80, 80), FLASK.bottom - 20, Phaser.Math.Between(6, 14), C.paper).setStrokeStyle(3, C.navy).setDepth(2);
      this.tweens.add({ targets: b, y: top + 6, delay: i * 90, duration: 700, onComplete: () => b.destroy() });
    }
  }

  private answer(o: Frac, b: Button) {
    if (this.phase !== 'answer') return;
    const r = this.r, { answer } = potionNumbers(r);
    if (sameValue(o, { n: answer, d: r.d })) {
      this.phase = 'busy';
      this.buttons.forEach(x => x.setVisible(false));
      this.success();
      return;
    }
    b.setEnabled(false);
    // Adding the denominators too gets its own hint.
    const den = o.d !== r.d ? `${potionDenominatorHint(r.d)} ` : '';
    this.mistake(`${den}${potionExplain(r)}`, [den, potionExplain(r, true)].filter(Boolean));
  }

  private success() {
    const r = this.r;
    sfx('good');
    const gag = POTION_GAGS[(this.levelIndex * 4 + this.roundIndex) % POTION_GAGS.length];
    this.setMood('happy');
    this.pipSays(gag.line);
    this.gag(gag.effect);
    this.guide.say(`Верно! ${potionExplain(r)}`);
    speakSeq([gag.line, `Верно! ${potionExplain(r, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, FLASK.x, FLASK.top - 40, earned);
    this.next.setVisible(true);
  }

  /** What the potion does to Pip. Undone when the next round starts. */
  private gag(effect: (typeof POTION_GAGS)[number]['effect']) {
    const p = this.pip, s = this.pipScale;
    if (effect === 'green') p.setTint(C.oliveLight);
    if (effect === 'tiny') this.tweens.add({ targets: p, scale: s * 0.45, duration: 500, ease: 'Back.In' });
    if (effect === 'giant') this.tweens.add({ targets: p, scale: s * 1.6, duration: 600, ease: 'Back.Out' });
    if (effect === 'float') this.tweens.add({ targets: p, y: PIP.y - 300, duration: 900, ease: 'Sine.Out', yoyo: true, hold: 1200 });
    if (effect === 'spin') this.tweens.add({ targets: p, angle: 360 * 3, duration: 1500, ease: 'Cubic.Out' });
  }

  private resetPip() {
    this.tweens.killTweensOf(this.pip);
    this.pip.clearTint().setScale(this.pipScale).setAngle(0).setPosition(PIP.x, PIP.y);
    this.setMood('normal');
  }

  private pipSays(text: string) {
    this.bubble?.destroy();
    const b = this.bubble = new Bubble(this, 1290, 470, 600, 210, { x: PIP.x + 40 - 1290, y: PIP.y - 300 + 60 - 470 });
    b.add(wrapLabel(this, 0, 0, text, 550, 30, 800));
    b.pop();
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    this.tweens.add({ targets: this.pip, x: PIP.x + 10, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.pip.setX(PIP.x) });
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
    this.resetPip();
    this.bubble?.destroy();
    this.guide.say('');
    [this.brewBtn, this.emptyBtn].forEach(b => b.setVisible(false));
    const stars = starsFor(this.mistakes);
    store.setStars('potion', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < POTION_LEVELS.length;
    resultModal(this, {
      title: 'Зелья готовы!',
      stars,
      coins: this.coins,
      note: POTION_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(POTION_NOTES[stars]);
  }

  private setMood(m: Mood) {
    this.pip.setTexture(`pip-${m}`);
  }
}
