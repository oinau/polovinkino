import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { COURIER_LEVELS, courierTolerance, type CourierLevel, type CourierRound } from '../levels';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { CLIENTS, COURIER_LINES, COURIER_NOTES, HEROES, courierAsk, courierExplain } from '../lines';
import { store } from '../store';
import { Bubble, Button, FractionView, Guide, coinsBurst, label, meetCard, modal, resultModal, starsFor, topBar, wrapLabel } from '../ui';

const X0 = 300;
const X1 = 1720;
const SIDEWALK = 720;
const ROAD = { top: 740, bottom: 880 };
const BTN_Y = 1000;
/** Seconds to ride one street. */
const SECONDS_PER_STREET = 4.5;
/** Arrow buttons move by this part of a street. */
const NUDGE = 1 / 48;

type Phase = 'busy' | 'ready' | 'driving' | 'stopped';

export class Courier extends Phaser.Scene {
  private levelIndex = 0;
  private level!: CourierLevel;
  private roundIndex = 0;
  private r!: CourierRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';
  /** Where the scooter is, in streets from the pizzeria. */
  private pos = 0;

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private scooter!: Phaser.GameObjects.Image;
  private pin!: Phaser.GameObjects.Graphics;
  private card?: Phaser.GameObjects.Container;
  private client?: Phaser.GameObjects.Image;
  private flag?: Phaser.GameObjects.Graphics;
  private bubble?: Bubble;
  private goBtn!: Button;
  private stopBtn!: Button;
  private giveBtn!: Button;
  private leftBtn!: Button;
  private rightBtn!: Button;
  private next!: Button;

  constructor() { super('Courier'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = COURIER_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.phase = 'busy';
    this.pos = 0;
    this.card = undefined;
    this.client = undefined;
    this.flag = undefined;
    this.bubble = undefined;
  }

  private get unit() { return (X1 - X0) / this.level.length; }
  private xOf(p: number) { return X0 + p * this.unit; }

  create() {
    this.drawStreet();
    topBar(this, `Курьеры ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.pin = this.add.graphics().setDepth(4);
    this.scooter = this.add.image(X0, ROAD.top + 100, 'shustrik-normal').setOrigin(0.5, 1).setDepth(5);
    this.scooter.setScale(150 / this.scooter.height);

    this.guide = new Guide(this, 150);
    this.goBtn = new Button(this, W / 2, BTN_Y, 'Поехали!', () => this.go(), { w: 320, h: 92, fill: C.olive, color: HEX.paper });
    this.stopBtn = new Button(this, W / 2, BTN_Y, 'Стоп!', () => this.stop(), { w: 320, h: 92, fill: C.terra, color: HEX.paper });
    this.leftBtn = new Button(this, W / 2 - 330, BTN_Y, '◀', () => this.nudge(-1), { w: 140, h: 92, size: 44 });
    this.giveBtn = new Button(this, W / 2, BTN_Y, 'Отдать пиццу', () => this.deliver(), { w: 380, h: 92, fill: C.olive, color: HEX.paper });
    this.rightBtn = new Button(this, W / 2 + 330, BTN_Y, '▶', () => this.nudge(1), { w: 140, h: 92, size: 44 });
    this.next = new Button(this, W / 2, BTN_Y, 'Дальше →', () => this.nextRound(), { w: 340, h: 92, fill: C.olive, color: HEX.paper });
    this.showButtons([]);

    if (store.met('shustrik')) this.showIntro();
    else meetCard(this, HEROES.shustrik, () => { store.meet('shustrik'); this.showIntro(); });
  }

  update(_t: number, dt: number) {
    if (this.phase !== 'driving') return;
    this.setPos(this.pos + dt / 1000 / SECONDS_PER_STREET);
    if (this.pos >= this.level.length) {
      this.stop();
      this.clientSays(COURIER_LINES.end, this.xOf(this.level.length));
    }
  }

  // ---------- scenery ----------
  private drawStreet() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.oliveLight).fillEllipse(500, SIDEWALK, 1200, 300).fillEllipse(1500, SIDEWALK, 1200, 340);
    g.fillStyle(C.sand).fillRect(0, SIDEWALK, W, ROAD.top - SIDEWALK);
    g.fillStyle(C.floor).fillRect(0, ROAD.top, W, ROAD.bottom - ROAD.top);
    g.fillStyle(C.olive).fillRect(0, ROAD.bottom, W, H - ROAD.bottom);
    g.lineStyle(5, C.navy).lineBetween(0, SIDEWALK, W, SIDEWALK).lineBetween(0, ROAD.top, W, ROAD.top).lineBetween(0, ROAD.bottom, W, ROAD.bottom);
    g.lineStyle(6, C.paper);
    for (let x = 20; x < W; x += 90) g.lineBetween(x, (ROAD.top + ROAD.bottom) / 2 + 30, x + 45, (ROAD.top + ROAD.bottom) / 2 + 30);

    // The pizzeria at 0 and the sign at the end of the street.
    this.add.image(X0 - 150, SIDEWALK, 'house-pizza').setOrigin(0.5, 1).setScale(0.5);
    g.fillStyle(C.mustardDark).fillRect(X1 - 6, SIDEWALK - 150, 12, 150).lineStyle(4, C.navy).strokeRect(X1 - 6, SIDEWALK - 150, 12, 150);
    g.fillStyle(C.paper).fillRoundedRect(X1 - 100, SIDEWALK - 200, 200, 60, 10).lineStyle(4, C.navy).strokeRoundedRect(X1 - 100, SIDEWALK - 200, 200, 60, 10);
    label(this, X1, SIDEWALK - 170, 'конец улицы', 24, HEX.navy, 900);

    // Marks along the road edge; houses stand on the marks (not on the «by eye» level).
    const { ticks, length } = this.level;
    const n = ticks ? ticks * length : length;
    for (let k = 0; k <= n; k++) {
      const v = ticks ? k / ticks : k, x = this.xOf(v);
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      g.lineStyle(whole ? 6 : 4, C.navy).lineBetween(x, ROAD.bottom, x, ROAD.bottom + (whole ? 34 : 22));
      label(this, x, ROAD.bottom + 56, whole ? String(Math.round(v)) : `${k}/${ticks}`, whole ? 34 : 26, HEX.navy, 900);
      if (ticks && k > 0 && k < n) this.drawHouse(g, x, k);
    }
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, x: number, k: number) {
    const w = Math.min(120, this.unit / this.level.ticks - 30), h = 120, roof = [C.terra, C.olive, C.mustard][k % 3];
    g.fillStyle(C.wall).fillRect(x - w / 2, SIDEWALK - h, w, h).lineStyle(4, C.navy).strokeRect(x - w / 2, SIDEWALK - h, w, h);
    g.fillStyle(roof).fillTriangle(x - w / 2 - 10, SIDEWALK - h, x, SIDEWALK - h - 60, x + w / 2 + 10, SIDEWALK - h).lineStyle(4, C.navy).strokeTriangle(x - w / 2 - 10, SIDEWALK - h, x, SIDEWALK - h - 60, x + w / 2 + 10, SIDEWALK - h);
    g.fillStyle(C.paper).fillRect(x - 22, SIDEWALK - h + 20, 44, 40).lineStyle(4, C.navy).strokeRect(x - 22, SIDEWALK - h + 20, 44, 40);
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
    const layer = modal(this, 1100, 540);
    layer.add(label(this, W / 2, H / 2 - 180, `Курьеры ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 960, 34, 700));
    layer.add(new Button(this, W / 2, H / 2 + 180, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  private showButtons(which: Button[]) {
    for (const b of [this.goBtn, this.stopBtn, this.leftBtn, this.giveBtn, this.rightBtn, this.next]) b.setVisible(which.includes(b));
  }

  // ---------- riding ----------
  setPos(p: number) {
    this.pos = Phaser.Math.Clamp(p, 0, this.level.length);
    const x = this.xOf(this.pos);
    this.scooter.setX(x);
    // A pointer from the scooter down to the marks.
    this.pin.clear().fillStyle(C.terra).fillTriangle(x - 14, ROAD.bottom - 22, x + 14, ROAD.bottom - 22, x, ROAD.bottom).lineStyle(3, C.navy)
      .strokeTriangle(x - 14, ROAD.bottom - 22, x + 14, ROAD.bottom - 22, x, ROAD.bottom);
  }

  go() {
    if (this.phase !== 'ready') return;
    sfx('click');
    this.phase = 'driving';
    this.showButtons([this.stopBtn]);
    this.guide.say('Жми «Стоп!» у нужного места.');
  }

  stop() {
    if (this.phase !== 'driving') return;
    sfx('click');
    this.phase = 'stopped';
    this.setPos(Math.round(this.pos / NUDGE) * NUDGE);
    this.showButtons([this.leftBtn, this.giveBtn, this.rightBtn]);
    this.guide.say('Подъедь стрелками точнее и отдай пиццу.');
  }

  nudge(dir: -1 | 1) {
    if (this.phase !== 'stopped') return;
    sfx('click');
    this.setPos(this.pos + dir * NUDGE);
  }

  deliver() {
    if (this.phase !== 'stopped') return;
    const at = this.r.at.n / this.r.at.d;
    const x = this.xOf(at);
    if (Math.abs(this.pos - at) <= courierTolerance(this.level)) { this.success(); return; }
    // The client calls out, and the right spot is shown.
    this.showClient();
    this.showFlag(x);
    const line = this.pos > at ? COURIER_LINES.far : COURIER_LINES.near;
    this.clientSays(line, x);
    this.mistake(courierExplain(this.level, this.r.at), [line, courierExplain(this.level, this.r.at, true)]);
  }

  private showClient() {
    if (this.client) return;
    const x = this.xOf(this.r.at.n / this.r.at.d);
    // In the house window, or on the pavement when there are no houses.
    const inWindow = this.level.ticks > 0;
    const img = this.client = this.add.image(x, inWindow ? SIDEWALK - 60 : SIDEWALK + 6, `${this.r.who}-happy`).setOrigin(0.5, 1).setDepth(3);
    img.setScale(Math.min((inWindow ? 46 : 120) / img.height, (inWindow ? 42 : 90) / img.width));
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 250 });
  }

  private showFlag(x: number) {
    if (this.flag) return;
    const g = this.flag = this.add.graphics().setDepth(4);
    g.lineStyle(5, C.navy).lineBetween(x, ROAD.bottom, x, ROAD.top - 10);
    g.fillStyle(C.olive).fillTriangle(x, ROAD.top - 10, x + 40, ROAD.top + 4, x, ROAD.top + 18).lineStyle(3, C.navy).strokeTriangle(x, ROAD.top - 10, x + 40, ROAD.top + 4, x, ROAD.top + 18);
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.client?.destroy();
    this.client = undefined;
    this.flag?.destroy();
    this.flag = undefined;
    this.bubble?.destroy();
    this.setMood('normal');
    this.setPos(0);
    this.drawCard();
    const ask = courierAsk(this.r.who, this.r.at);
    speak(ask);
    this.guide.say('Нажми «Поехали»!');
    this.showButtons([this.goBtn]);
    this.phase = 'ready';
  }

  /** The order slip: who and how far. */
  private drawCard() {
    this.card?.destroy();
    // Top left, above the pizzeria: the client's bubble stays to the right of it.
    const c = this.card = this.add.container(330, 310);
    const g = this.add.graphics();
    g.fillStyle(C.navy).fillRoundedRect(-250, -110 + 8, 500, 220, 22);
    g.fillStyle(C.paper).fillRoundedRect(-250, -110, 500, 220, 22).lineStyle(5, C.navy).strokeRoundedRect(-250, -110, 500, 220, 22);
    const face = this.add.image(-170, 70, `${this.r.who}-normal`).setOrigin(0.5, 1);
    face.setScale(Math.min(150 / face.height, 120 / face.width));
    c.add([g, face, label(this, 60, -70, 'Заказ', 34, HEX.terra, 900), label(this, 60, -20, CLIENTS[this.r.who], 30, HEX.navy, 900),
      label(this, -10, 50, 'Дом:', 30, HEX.navy, 800), new FractionView(this, 80, 50, this.r.at.n, this.r.at.d, 34), label(this, 175, 50, 'пути', 30, HEX.navy, 800)]);
  }

  private success() {
    this.phase = 'busy';
    sfx('good');
    this.setMood('happy');
    this.showClient();
    const x = this.xOf(this.r.at.n / this.r.at.d);
    // The pizza box flies to the client.
    const box = this.add.rectangle(this.scooter.x - 30, this.scooter.y - 110, 44, 30, C.mustard).setStrokeStyle(3, C.navy).setDepth(6);
    this.tweens.add({ targets: box, x, y: SIDEWALK - 80, duration: 500, ease: 'Quad.Out', onComplete: () => box.destroy() });
    this.clientSays(COURIER_LINES.thanks, x);
    const why = courierExplain(this.level, this.r.at);
    this.guide.say(`Верно! ${why}`);
    speakSeq([COURIER_LINES.thanks, `Верно! ${courierExplain(this.level, this.r.at, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, x, SIDEWALK - 200, earned);
    this.showButtons([this.next]);
  }

  private clientSays(text: string, x: number) {
    this.bubble?.destroy();
    const bx = Phaser.Math.Clamp(x, 870, W - 300), by = 420;
    const b = this.bubble = new Bubble(this, bx, by, 520, 130, { x: x - bx, y: SIDEWALK - 130 - by });
    b.add(wrapLabel(this, 0, 0, text, 480, 30, 900));
    b.pop();
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    this.guide.say(screen);
    speakSeq(spoken);
    this.time.delayedCall(1600, () => this.setMood('normal'));
  }

  private nextRound() {
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.phase = 'busy';
    this.showButtons([]);
    this.bubble?.destroy();
    this.card?.destroy();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('courier', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < COURIER_LEVELS.length;
    resultModal(this, {
      title: 'Пицца доставлена!',
      stars,
      coins: this.coins,
      note: COURIER_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(COURIER_NOTES[stars]);
  }

  private setMood(m: Mood) {
    this.scooter.setTexture(`shustrik-${m}`);
  }
}
