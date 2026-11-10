import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { COURIER_LEVELS, courierTolerance, type CourierLevel, type CourierRound } from '../levels';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { CLIENTS, COURIER_LINES, COURIER_NOTES, HEROES, courierAsk, courierExplain } from '../lines';
import { store } from '../store';
import { Bubble, Button, FractionView, Guide, coinsBurst, label, meetCard, modal, resultModal, starsFor, topBar, wrapLabel } from '../ui';

const X0 = 300;
/** One street is always this wide on screen, so a longer street runs off the edge and the view follows. */
const UNIT = 1420;
const SIDEWALK = 720;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const ROAD = { top: 740, bottom: 880 };
const BTN_Y = 1000;
/** Seconds to ride one street. */
const SECONDS_PER_STREET = 4.5;
/** Arrow buttons move by this part of a street. */
const NUDGE = 1 / 48;
/** While riding, the view keeps the scooter this far from the left edge. */
const FOLLOW_X = 1000;

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
  /** How far the street is scrolled to the left, in pixels. */
  private scroll = 0;

  /** The street and everything on it; scrolls as one piece. */
  private world!: Phaser.GameObjects.Container;
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
    this.scroll = 0;
    this.card = undefined;
    this.client = undefined;
    this.flag = undefined;
    this.bubble = undefined;
  }

  private xOf(p: number) { return X0 + p * UNIT; }
  private get maxScroll() { return Math.max(0, this.xOf(this.level.length) + 200 - W); }

  private setScroll(s: number) {
    this.scroll = Phaser.Math.Clamp(s, 0, this.maxScroll);
    this.world.setX(-this.scroll);
  }

  /** Where the view should be to keep the scooter in sight. */
  private followScroll() { return Phaser.Math.Clamp(this.xOf(this.pos) - FOLLOW_X, 0, this.maxScroll); }

  create() {
    this.drawStreet();
    topBar(this, `Курьеры ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.pin = this.add.graphics();
    this.scooter = this.add.image(X0, ROAD.top + 100, 'shustrik-normal').setOrigin(0.5, 1);
    this.scooter.setScale(150 / this.scooter.height);
    this.world.add([this.pin, this.scooter]);

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
    // Sky and hills stay put; the street itself scrolls.
    const bg = this.add.graphics();
    bg.fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    bg.fillStyle(C.oliveLight).fillEllipse(500, SIDEWALK, 1200, 300).fillEllipse(1500, SIDEWALK, 1200, 340)
      .fillEllipse(-600, SIDEWALK, 1200, 340).fillEllipse(2600, SIDEWALK, 1200, 300);

    this.world = this.add.container(0, 0);
    const g = this.add.graphics();
    this.world.add(g);
    const end = this.xOf(this.level.length), wide = Math.max(W, end + 300) + BLEED;
    g.fillStyle(C.sand).fillRect(-BLEED, SIDEWALK, wide + BLEED, ROAD.top - SIDEWALK);
    g.fillStyle(C.floor).fillRect(-BLEED, ROAD.top, wide + BLEED, ROAD.bottom - ROAD.top);
    g.fillStyle(C.olive).fillRect(-BLEED, ROAD.bottom, wide + BLEED, H - ROAD.bottom + BLEED);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, SIDEWALK, wide, SIDEWALK).lineBetween(-BLEED, ROAD.top, wide, ROAD.top).lineBetween(-BLEED, ROAD.bottom, wide, ROAD.bottom);
    g.lineStyle(6, C.paper);
    for (let x = 20 - 1080; x < wide; x += 90) g.lineBetween(x, (ROAD.top + ROAD.bottom) / 2 + 30, x + 45, (ROAD.top + ROAD.bottom) / 2 + 30);

    // The pizzeria at 0 and the sign at the end of the street.
    this.world.add(this.add.image(X0 - 150, SIDEWALK, 'house-pizza').setOrigin(0.5, 1).setScale(0.5));
    g.fillStyle(C.mustardDark).fillRect(end - 6, SIDEWALK - 150, 12, 150).lineStyle(4, C.navy).strokeRect(end - 6, SIDEWALK - 150, 12, 150);
    g.fillStyle(C.paper).fillRoundedRect(end - 100, SIDEWALK - 200, 200, 60, 10).lineStyle(4, C.navy).strokeRoundedRect(end - 100, SIDEWALK - 200, 200, 60, 10);
    this.world.add(label(this, end, SIDEWALK - 170, 'конец улицы', 24, HEX.navy, 900));

    // Marks along the road edge; houses stand on the marks (not on the «by eye» level).
    // Where one street ends and the next begins there is a crossroads instead of a house.
    const { ticks, length } = this.level;
    const n = ticks ? ticks * length : length;
    for (let k = 0; k <= n; k++) {
      const v = ticks ? k / ticks : k, x = this.xOf(v);
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      const crossing = whole && v > 0 && v < length;
      if (crossing) this.drawCrossing(g, x, Math.round(v));
      g.lineStyle(whole ? 6 : 4, C.navy).lineBetween(x, ROAD.bottom, x, ROAD.bottom + (whole ? 34 : 22));
      this.world.add(label(this, x, ROAD.bottom + 56, whole ? String(Math.round(v)) : `${k}/${ticks}`, whole ? 34 : 26, HEX.navy, 900));
      if (ticks && k > 0 && k < n && !crossing) this.drawHouse(g, x, k);
    }
  }

  /** A side street with a zebra, and a signpost naming the streets on either side. */
  private drawCrossing(g: Phaser.GameObjects.Graphics, x: number, street: number) {
    const half = 80, far = SIDEWALK - 170;
    g.fillStyle(C.floor).fillPoints([v(x - half, SIDEWALK + 3), v(x - half * 0.55, far), v(x + half * 0.55, far), v(x + half, SIDEWALK + 3)], true);
    g.fillStyle(C.floor).fillRect(x - half, SIDEWALK, half * 2, ROAD.top - SIDEWALK + 3);
    g.lineStyle(5, C.navy).lineBetween(x - half, SIDEWALK, x - half * 0.55, far).lineBetween(x + half, SIDEWALK, x + half * 0.55, far);
    // Bushes where the side street disappears into the distance.
    g.fillStyle(C.olive).fillEllipse(x - 40, far, 120, 60).fillEllipse(x + 40, far - 6, 130, 70);
    g.lineStyle(4, C.navy).strokeEllipse(x - 40, far, 120, 60).strokeEllipse(x + 40, far - 6, 130, 70);
    // Zebra across the main road.
    g.fillStyle(C.floor).fillRect(x - half + 10, ROAD.top + 3, half * 2 - 20, ROAD.bottom - ROAD.top - 6);
    g.fillStyle(C.paper);
    for (let y = ROAD.top + 14; y < ROAD.bottom - 14; y += 26) g.fillRect(x - half + 16, y, half * 2 - 32, 13);
    // The signpost on the corner.
    const px = x + half + 30, top = SIDEWALK - 300;
    g.fillStyle(C.mustardDark).fillRect(px - 6, top, 12, SIDEWALK - top).lineStyle(4, C.navy).strokeRect(px - 6, top, 12, SIDEWALK - top);
    const plate = (y: number, dir: -1 | 1, text: string) => {
      const w = 180, x0 = dir < 0 ? px - w + 20 : px - 20;
      const tip = dir < 0 ? x0 - 24 : x0 + w + 24;
      const edge = dir < 0 ? x0 : x0 + w;
      const back = dir < 0 ? x0 + w : x0;
      const pts = [v(back, y - 26), v(edge, y - 26), v(tip, y), v(edge, y + 26), v(back, y + 26)];
      g.fillStyle(C.paper).fillPoints(pts, true).lineStyle(4, C.navy).strokePoints(pts, true);
      this.world.add(label(this, x0 + w / 2, y, text, 24, HEX.navy, 900));
    };
    plate(top + 34, -1, `${street}-я улица`);
    plate(top + 96, 1, `${street + 1}-я улица`);
  }

  private drawHouse(g: Phaser.GameObjects.Graphics, x: number, k: number) {
    const w = Math.min(120, UNIT / this.level.ticks - 30), h = 120, roof = [C.terra, C.olive, C.mustard][k % 3];
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
    this.setScroll(this.followScroll());
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
    const away = x - this.scroll < 150 || x - this.scroll > W - 150;
    const view = away ? Phaser.Math.Clamp(x - W / 2, 0, this.maxScroll) : this.scroll;
    this.clientSays(line, x, view);
    this.mistake(courierExplain(this.level, this.r.at), [line, courierExplain(this.level, this.r.at, true)]);
    if (away) this.lookAt(view);
  }

  /** Off-screen client: glide over to show them, then back to the scooter. */
  private lookAt(view: number) {
    this.phase = 'busy';
    const glide = (from: number, to: number, done: () => void) =>
      this.tweens.addCounter({ from, to, duration: 700, ease: 'Sine.InOut', onUpdate: t => this.setScroll(t.getValue() ?? to), onComplete: done });
    glide(this.scroll, view, () => this.time.delayedCall(1800, () => glide(view, this.followScroll(), () => { this.phase = 'stopped'; })));
  }

  private showClient() {
    if (this.client) return;
    const x = this.xOf(this.r.at.n / this.r.at.d);
    // In the house window, or on the pavement when there are no houses.
    const inWindow = this.level.ticks > 0;
    const img = this.client = this.add.image(x, inWindow ? SIDEWALK - 60 : SIDEWALK + 6, `${this.r.who}-happy`).setOrigin(0.5, 1);
    this.world.addAt(img, this.world.getIndex(this.pin));
    img.setScale(Math.min((inWindow ? 46 : 120) / img.height, (inWindow ? 42 : 90) / img.width));
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 250 });
  }

  private showFlag(x: number) {
    if (this.flag) return;
    const g = this.flag = this.add.graphics();
    this.world.addAt(g, this.world.getIndex(this.pin));
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
    const box = this.add.rectangle(this.scooter.x - 30, this.scooter.y - 110, 44, 30, C.mustard).setStrokeStyle(3, C.navy);
    this.world.add(box);
    this.tweens.add({ targets: box, x, y: SIDEWALK - 80, duration: 500, ease: 'Quad.Out', onComplete: () => box.destroy() });
    this.clientSays(COURIER_LINES.thanks, x);
    const why = courierExplain(this.level, this.r.at);
    this.guide.say(`Верно! ${why}`);
    speakSeq([COURIER_LINES.thanks, `Верно! ${courierExplain(this.level, this.r.at, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, x - this.scroll, SIDEWALK - 200, earned);
    this.showButtons([this.next]);
  }

  /** The bubble lives on the street; `view` is the scroll it should fit into. */
  private clientSays(text: string, x: number, view = this.scroll) {
    this.bubble?.destroy();
    const bx = Phaser.Math.Clamp(x, view + 870, view + W - 300), by = 420;
    const b = this.bubble = new Bubble(this, bx, by, 520, 130, { x: x - bx, y: SIDEWALK - 130 - by });
    this.world.add(b);
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
