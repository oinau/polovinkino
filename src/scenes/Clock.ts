import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { CLOCK_LEVELS, type ClockLevel, type ClockRound } from '../levels';
import type { Mood } from '../art';
import { capitalize } from '../fractions';
import { sfx, speak, stopSpeaking } from '../audio';
import { store } from '../store';
import {
  CLOCK_ASK, CLOCK_FINALE, CLOCK_NOTES, HEROES, clockLetter, clockSetExplain, clockWaitAsk, clockWaitExplain,
} from '../lines';
import { digital, explainTime, hourPart, meetWords, minuteOf, timeWords } from '../time';
import {
  Bubble, Button, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, topBar, wrapLabel,
} from '../ui';

const CLK = { x: 760, y: 500, r: 270 };
const TIKHON = { x: 1620, y: 960 };
const PAIR_X = 1380;
const BTN_Y = 1010;

/** Angle of the minute hand for a time, 0 at 12 o'clock, clockwise. */
const minuteAngle = (t: number) => (t / 60) * Math.PI * 2;

export class Clock extends Phaser.Scene {
  private levelIndex = 0;
  private level!: ClockLevel;
  private roundIndex = 0;
  private round!: ClockRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private busy = true;
  /** Time on the clock face, minutes since 12:00 (not wrapped, so the hands turn smoothly). */
  private t = 0;
  private dragging = false;

  private guide!: Guide;
  private minuteHand!: Phaser.GameObjects.Container;
  private hourHand!: Phaser.GameObjects.Container;
  private ghost!: Phaser.GameObjects.Graphics;
  private sector!: Phaser.GameObjects.Graphics;
  private digitalText!: Phaser.GameObjects.Text;
  private tikhon!: Phaser.GameObjects.Image;
  private bubble?: Bubble;
  private buttons: Button[] = [];
  private dots!: Phaser.GameObjects.Graphics;

  constructor() { super('Clock'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = CLOCK_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.busy = true;
    this.buttons = [];
    this.bubble = undefined;
    this.dragging = false;
  }

  create() {
    this.drawSquare();
    this.drawClock();
    topBar(this, `Часы ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.tikhon = this.add.image(TIKHON.x, TIKHON.y, 'tikhon-normal').setOrigin(0.5, 1);
    this.tweens.add({ targets: this.tikhon, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    nameTag(this, TIKHON.x, TIKHON.y + 50, HEROES.tikhon.tag);
    this.guide = new Guide(this, 150);
    this.setupDrag();

    if (store.met('tikhon')) this.showIntro();
    else meetCard(this, HEROES.tikhon, () => { store.meet('tikhon'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawSquare() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    g.fillStyle(C.oliveLight).fillEllipse(260, 920, 1100, 360).fillEllipse(1700, 930, 1100, 380);
    g.fillStyle(C.olive).fillRect(-BLEED, 900, W + 2 * BLEED, H - 900 + BLEED);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, 900, W + BLEED, 900);
    // Lamp post on the right, a quiet bit of decoration.
    g.fillStyle(C.navy).fillRect(1846, 420, 12, 480);
    g.fillStyle(C.mustard).fillCircle(1852, 410, 26);
    g.lineStyle(5, C.navy).strokeCircle(1852, 410, 26);
  }

  private drawClock() {
    const { x, y, r } = CLK;
    const post = this.add.graphics();
    post.fillStyle(C.navy).fillRect(x - 22, y + r, 44, 960 - y - r);
    post.fillStyle(C.mustardDark).fillRect(x - 16, y + r, 32, 960 - y - r);
    post.fillStyle(C.navy).fillRoundedRect(x - 70, 945, 140, 30, 10);

    const face = this.add.graphics();
    face.fillStyle(C.navy).fillCircle(x, y + 10, r + 30);
    face.fillStyle(C.terra).fillCircle(x, y, r + 30);
    face.lineStyle(6, C.navy).strokeCircle(x, y, r + 30);
    face.fillStyle(C.paper).fillCircle(x, y, r);
    face.lineStyle(5, C.navy).strokeCircle(x, y, r);

    this.sector = this.add.graphics();

    const ticks = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      const r1 = r - (big ? 30 : 16), r2 = r - 6;
      ticks.lineStyle(big ? 7 : 3, C.navy);
      ticks.lineBetween(x + r1 * Math.sin(a), y - r1 * Math.cos(a), x + r2 * Math.sin(a), y - r2 * Math.cos(a));
    }
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      label(this, x + (r - 72) * Math.sin(a), y - (r - 72) * Math.cos(a), String(h), 52, HEX.navy, 900);
    }

    this.ghost = this.add.graphics().setPosition(x, y).setVisible(false);
    this.ghost.fillStyle(C.olive, 0.55).fillRoundedRect(-9, -(r - 34), 18, r - 34, 9);

    const hour = this.add.graphics();
    hour.fillStyle(C.navy).fillRoundedRect(-12, -r * 0.52, 24, r * 0.52 + 24, 12);
    this.hourHand = this.add.container(x, y, [hour]);
    const minute = this.add.graphics();
    minute.fillStyle(C.navy).fillRoundedRect(-7, -(r - 34), 14, r - 34 + 30, 7);
    minute.fillStyle(C.terra).fillCircle(0, -(r - 44), 10);
    this.minuteHand = this.add.container(x, y, [minute]);
    const cap = this.add.graphics();
    cap.fillStyle(C.mustard).fillCircle(x, y, 20).lineStyle(5, C.navy).strokeCircle(x, y, 20);

    // Digital display on the post.
    const board = this.add.graphics();
    board.fillStyle(C.navy).fillRoundedRect(x - 130, 822, 260, 96, 18);
    this.digitalText = label(this, x, 868, '--:--', 60, HEX.paper, 900);
  }

  private drawDots() {
    const g = this.dots.clear();
    this.level.rounds.forEach((_, i) => {
      const x = 150 + i * 46, y = 66;
      g.fillStyle(i < this.roundIndex ? C.olive : C.paper).fillCircle(x, y, 15);
      g.lineStyle(4, C.navy).strokeCircle(x, y, 15);
    });
  }

  // ---------- clock state ----------
  private setTime(t: number) {
    this.t = t;
    this.minuteHand.rotation = minuteAngle(t);
    this.hourHand.rotation = (t / 720) * Math.PI * 2;
  }

  /** Sweep the hands to a later time. */
  private animateTo(t: number, done?: () => void) {
    const proxy = { v: this.t };
    this.tweens.add({
      targets: proxy, v: t, duration: 900, ease: 'Sine.InOut',
      onUpdate: () => this.setTime(proxy.v), onComplete: () => { this.setTime(t); done?.(); },
    });
  }

  private showDigital(t: number | null) {
    this.digitalText.setText(t === null ? '--:--' : digital(t));
  }

  /** Shade the face from one time to another, like a slice of pizza. */
  private shade(from: number, to: number, color: number) {
    const g = this.sector.clear();
    if (to <= from) return;
    const a0 = minuteAngle(from) - Math.PI / 2;
    const a1 = minuteAngle(Math.min(to, from + 60)) - Math.PI / 2;
    g.fillStyle(color, 0.75);
    g.slice(CLK.x, CLK.y, CLK.r - 4, a0, a1, false);
    g.fillPath();
  }

  private hourStart = (t: number) => t - minuteOf(t);

  // ---------- dragging the minute hand («Поставь стрелки») ----------
  private setupDrag() {
    const minutesAt = (p: Phaser.Input.Pointer) => {
      const a = (Math.atan2(p.worldY - CLK.y, p.worldX - CLK.x) + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2);
      return (Math.round(((a / (Math.PI * 2)) * 60) / 5) * 5) % 60;
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.busy || this.round?.kind !== 'set') return;
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, CLK.x, CLK.y) > CLK.r + 30) return;
      this.dragging = true;
      this.guide.hideArrow();
      this.dragTo(minutesAt(p));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragging) this.dragTo(minutesAt(p)); });
    this.input.on('pointerup', () => { this.dragging = false; });
  }

  /** Move the minute hand to a mark; passing 12 moves the hour on, like a real clock. */
  private dragTo(m: number) {
    let diff = m - minuteOf(this.t);
    if (diff > 30) diff -= 60;
    if (diff < -30) diff += 60;
    if (!diff) return;
    sfx('pick');
    this.setTime(this.t + diff);
    this.ghost.setVisible(false);
    this.showDigital(this.t);
    this.shade(this.hourStart(this.t), this.t, C.cheese);
  }

  // ---------- flow ----------
  private showIntro() {
    const layer = modal(this, 1100, 520);
    layer.add(label(this, W / 2, H / 2 - 170, `Часы ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 900, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 175, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  private clearRound() {
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    this.bubble?.destroy();
    this.bubble = undefined;
    this.sector.clear();
    this.ghost.setVisible(false);
    this.guide.hideArrow();
  }

  private sign(lines: string, h = 230) {
    this.bubble?.destroy();
    const x = 1450, y = 330;
    const b = new Bubble(this, x, y, 600, h, { x: TIKHON.x - x - 20, y: TIKHON.y - this.tikhon.displayHeight - y + 10 });
    b.add(wrapLabel(this, 0, 0, lines, 540, 36, 900));
    this.bubble = b.pop();
  }

  private startRound() {
    this.clearRound();
    this.round = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.setMood('normal');
    const r = this.round;
    if (r.kind === 'read') {
      this.setTime(r.t);
      this.showDigital(null);
      this.sign('(показывает табличку)\nКОТОРЫЙ ЧАС?');
      this.guide.say('Посмотри на стрелки: который час?');
      const opts = Phaser.Utils.Array.Shuffle([...r.options]);
      opts.forEach((t, i) => {
        const b = new Button(this, 330 + i * 430, BTN_Y, capitalize(timeWords(t)), () => this.pickTime(t, b), { w: 410, h: 92, size: 32 });
        this.buttons.push(b);
      });
      speak(CLOCK_ASK);
    } else if (r.kind === 'set') {
      this.setTime(r.from);
      this.showDigital(r.from);
      this.sign(clockLetter(r.to), 250);
      this.guide.say('Поставь стрелки: тяни минутную стрелку');
      if (this.level.guide) this.guide.point(CLK.x + 40, CLK.y - CLK.r + 70, 'right');
      this.buttons.push(new Button(this, 1240, BTN_Y, 'Готово', () => this.checkSet(), { w: 300, h: 92, fill: C.mustard }));
      speak(clockLetter(r.to));
    } else {
      this.setTime(r.now);
      this.showDigital(r.now);
      this.sign(`СКОЛЬКО ЖДАТЬ?\nВстреча ${meetWords(r.meet)}`, 250);
      this.guide.say('Сколько минут Тихону ждать встречи?');
      r.options.forEach((m, i) => {
        const b = new Button(this, 230 + i * 250, BTN_Y, `${m} минут`, () => this.pickWait(m, b), { w: 230, h: 92, size: 32 });
        this.buttons.push(b);
      });
      speak(clockWaitAsk(r.now, r.meet));
    }
    this.busy = false;
  }

  private pickTime(t: number, b: Button) {
    if (this.busy || this.round.kind !== 'read') return;
    const right = this.round.t;
    this.shade(this.hourStart(right), right, C.cheese);
    if (t === right) {
      this.showDigital(right);
      this.success(`Верно! ${capitalize(timeWords(right))} — это ${digital(right)}.`, `Верно! ${capitalize(timeWords(right))}.`);
    } else {
      b.setEnabled(false);
      this.mistake(explainTime(right));
    }
  }

  private checkSet() {
    if (this.busy || this.round.kind !== 'set') return;
    const to = this.round.to;
    if (((this.t % 720) + 720) % 720 === to % 720) {
      this.shade(this.hourStart(to), to, C.cheese);
      this.success(`Верно! ${capitalize(timeWords(to))} — это ${digital(to)}.`, `Верно! ${capitalize(timeWords(to))}.`);
    } else {
      this.ghost.rotation = minuteAngle(to);
      this.ghost.setVisible(true);
      this.mistake(clockSetExplain(to));
    }
  }

  private pickWait(m: number, b: Button) {
    if (this.busy || this.round.kind !== 'wait') return;
    const { now, meet } = this.round;
    const diff = meet - now;
    this.shade(now, meet, C.olive);
    if (m === diff) {
      const part = hourPart(diff);
      this.success(
        `Верно! ${diff} минут${part ? ` = ${part.n}/${part.d} часа` : ''}`,
        `Верно! ${clockWaitExplain(now, meet)}`,
        () => this.animateTo(meet, () => this.showDigital(meet)),
      );
    } else {
      b.setEnabled(false);
      // First miss: count the marks yourself; second: the full explanation.
      if (this.triesOnRound === 0) this.mistake('Посмотри на зелёную дугу: каждое деление — 5 минут. Посчитай!');
      else this.mistake(clockWaitExplain(now, meet));
    }
  }

  private success(screen: string, spoken: string, extra?: () => void) {
    this.busy = true;
    sfx('good');
    this.setMood('happy');
    this.guide.hideArrow();
    this.guide.say(screen);
    speak(spoken);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, TIKHON.x, TIKHON.y - this.tikhon.displayHeight - 20, earned);
    this.tweens.add({ targets: this.tikhon, y: TIKHON.y - 30, duration: 180, yoyo: true, repeat: 2 });
    extra?.();
    this.time.delayedCall(2600, () => this.nextRound());
  }

  private mistake(text: string) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    this.tweens.add({ targets: this.tikhon, x: TIKHON.x + 10, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.tikhon.setX(TIKHON.x) });
    this.guide.say(text);
    speak(text);
    this.time.delayedCall(1400, () => this.setMood('normal'));
  }

  private nextRound() {
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finale();
  }

  /** Nosochka arrives: hearts, then the results. */
  private finale() {
    this.busy = true;
    this.clearRound();
    this.guide.say('Смотри, кто пришёл!');
    const nos = this.add.image(-200, TIKHON.y, 'nosochka-normal').setOrigin(0.5, 1).setFlipX(true);
    const tag = nameTag(this, -200, TIKHON.y + 50, HEROES.nosochka.tag);
    this.tweens.add({ targets: nos, y: TIKHON.y - 16, duration: 160, yoyo: true, repeat: 8 });
    this.tweens.add({
      targets: [nos, tag], x: PAIR_X, duration: 1800, ease: 'Cubic.Out',
      onComplete: () => {
        const hug = () => this.hug(nos);
        if (store.met('nosochka')) hug();
        else meetCard(this, HEROES.nosochka, () => { store.meet('nosochka'); hug(); });
      },
    });
  }

  private hug(nos: Phaser.GameObjects.Image) {
    nos.setTexture('nosochka-happy');
    this.setMood('happy');
    sfx('good');
    this.guide.say(CLOCK_FINALE);
    speak(CLOCK_FINALE);
    this.sign('УРА!', 160);
    this.tweens.add({ targets: [nos, this.tikhon], y: TIKHON.y - 26, duration: 220, yoyo: true, repeat: 3 });
    for (let i = 0; i < 9; i++) {
      this.time.delayedCall(i * 160, () => this.heart(1500 + Phaser.Math.Between(-140, 140), TIKHON.y - 300));
    }
    this.time.delayedCall(3200, () => this.finish());
  }

  private heart(x: number, y: number) {
    const g = this.add.graphics().setPosition(x, y).setDepth(70);
    g.fillStyle(C.terra);
    g.fillCircle(-12, 0, 15).fillCircle(12, 0, 15).fillTriangle(-26, 6, 26, 6, 0, 34);
    g.setScale(0.5);
    this.tweens.add({ targets: g, y: y - 220, scale: 1.2, alpha: 0, duration: 1600, ease: 'Cubic.Out', onComplete: () => g.destroy() });
  }

  private finish() {
    stopSpeaking();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('clock', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < CLOCK_LEVELS.length;
    resultModal(this, {
      title: 'Встреча состоялась!',
      stars,
      coins: this.coins,
      note: CLOCK_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(CLOCK_NOTES[stars]);
  }

  private setMood(m: Mood) {
    this.tikhon.setTexture(`tikhon-${m}`);
  }
}
