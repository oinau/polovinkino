import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { MONSTER_LEVELS, monsterAnswer, type MonsterId, type MonsterLevel, type MonsterRound } from '../levels';
import { sameValue, str, type Frac } from '../fractions';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { digital } from '../time';
import { DIPLOMA, HEROES, MONSTERS, MONSTER_LINES, MONSTER_NOTES, monsterAsk, monsterExplain, monsterQuestion } from '../lines';
import { store } from '../store';
import { Bubble, Button, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, topBar, wrapLabel } from '../ui';

const FLOOR = 960;
const HOST_X = 230;
const STAGE = { x: 820, y: 560 };
const BTN_Y = 1020;
/** Door height in the nursery: «one door». */
const DOOR_U = 440;

type Phase = 'busy' | 'act' | 'answer';
type Item = Phaser.GameObjects.Graphics & { done?: boolean };

const ROOM_HOST: Record<MonsterLevel['room'], MonsterId> = { kitchen: 'mummy', attic: 'spider', cellar: 'wolf', nursery: 'slime', parlor: 'bat' };
const ROOM_WALL: Record<MonsterLevel['room'], number> = { kitchen: C.wall, attic: C.sand, cellar: C.floor, nursery: C.cream, parlor: C.wall };

export class Monsters extends Phaser.Scene {
  private levelIndex = 0;
  private level!: MonsterLevel;
  private roundIndex = 0;
  private r!: MonsterRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private host!: Phaser.GameObjects.Image;
  private hostId!: MonsterId;
  private bubble?: Bubble;
  /** Everything that belongs to the current round; destroyed when the next one starts. */
  private stage: Phaser.GameObjects.GameObject[] = [];
  private items: Item[] = [];
  private buttons: Button[] = [];
  private next!: Button;
  // Room-specific state.
  private given: number[] = [];
  private thread?: Phaser.GameObjects.Graphics;
  private headLine?: Phaser.GameObjects.Graphics;
  private hands?: { hour: Phaser.GameObjects.Container; minute: Phaser.GameObjects.Container };

  constructor() { super('Monsters'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = MONSTER_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.phase = 'busy';
    this.stage = [];
    this.items = [];
    this.buttons = [];
    this.bubble = undefined;
    this.hands = undefined;
    this.thread = undefined;
  }

  update() {
    this.thread?.clear().lineStyle(3, C.navy).lineBetween(this.host.x, 100, this.host.x, this.host.y - this.host.displayHeight + 6);
  }

  create() {
    this.drawRoom();
    topBar(this, `Дом монстров: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.hostId = ROOM_HOST[this.level.room];
    const hostY = this.hostId === 'bat' ? 330 : FLOOR;
    // The baby slime stands right of the door he is measured on.
    const hostX = this.hostId === 'bat' ? STAGE.x : this.hostId === 'spider' ? 1320 : this.hostId === 'slime' ? 1260 : HOST_X;
    this.host = this.add.image(hostX, hostY, `${this.hostId}-normal`).setOrigin(0.5, this.hostId === 'bat' ? 0.5 : 1).setDepth(6);
    const size = { mummy: 380, wolf: 400, slime: 200, spider: 190, bat: 120 }[this.hostId];
    this.host.setScale(size / this.host.height);
    if (this.hostId === 'spider') {
      this.host.setY(hostY - 380);
      // The thread follows the spider wherever it goes.
      this.thread = this.add.graphics().setDepth(5);
    }
    if (this.hostId !== 'bat' && this.hostId !== 'spider') nameTag(this, hostX, FLOOR + 40, MONSTERS[this.hostId].tag);
    this.tweens.add({ targets: this.host, scaleY: this.host.scaleY * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.guide = new Guide(this, 150);
    this.next = new Button(this, STAGE.x, BTN_Y, 'Дальше →', () => this.nextRound(), { w: 340, h: 92, fill: C.olive, color: HEX.paper });
    this.next.setVisible(false);

    if (store.met('monsters')) this.showIntro();
    else meetCard(this, HEROES.monsters, () => { store.meet('monsters'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawRoom() {
    const room = this.level.room, g = this.add.graphics();
    g.fillStyle(ROOM_WALL[room]).fillRect(0, 0, W, H);
    g.fillStyle(room === 'cellar' ? C.mustardDark : C.floor).fillRect(0, FLOOR, W, H - FLOOR);
    g.lineStyle(5, C.navy).lineBetween(0, FLOOR, W, FLOOR);
    // A cobweb garland and a crooked picture: cosy, a little spooky.
    g.lineStyle(3, C.navy, 0.5);
    for (let x = 0; x < W; x += 160) g.beginPath().arc(x + 80, 96, 80, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
    if (room === 'attic') {
      g.fillStyle(C.mustardDark);
      for (const x of [200, 1720]) g.fillRect(x - 14, 0, 28, FLOOR).lineStyle(4, C.navy).strokeRect(x - 14, 0, 28, FLOOR);
    }
    if (room === 'cellar') {
      // Stone blocks.
      g.lineStyle(3, C.mustardDark, 0.6);
      for (let y = 200, row = 0; y < FLOOR; y += 90, row++) {
        g.lineBetween(0, y, W, y);
        for (let x = (row % 2) * 110; x < W; x += 220) g.lineBetween(x, y, x, y + 90);
      }
      // The crack the draught comes through.
      g.lineStyle(6, C.navy).beginPath().moveTo(1840, 300).lineTo(1810, 360).lineTo(1846, 420).lineTo(1812, 480).strokePath();
    }
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
    layer.add(label(this, W / 2, H / 2 - 170, `Дом монстров: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 960, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 170, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.clearStage();
    this.setMood('normal');
    this.next.setVisible(false);
    this.guide.say('');
    const r = this.r;
    if (r.kind === 'cake') this.setupCake(r);
    else if (r.kind === 'web') this.setupWeb(r);
    else if (r.kind === 'candles') this.setupCandles(r);
    else if (r.kind === 'grow') this.setupGrow(r);
    else this.setupClock(r);
    // After the setup: the host may have moved, and the bubble points at where it stands now.
    const ask = monsterAsk(r);
    this.say(ask);
    speak(ask);
  }

  private clearStage() {
    this.stage.forEach(o => o.destroy());
    this.stage = [];
    this.items = [];
    this.buttons = [];
    this.given = [];
    this.hands = undefined;
    this.headLine = undefined;
    this.guide.hideArrow();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T) {
    this.stage.push(o);
    return o;
  }

  /** Answer buttons: fractions as «3/4» (a whole as «1»), candles as numbers, times as on a digital clock. */
  private showOptions() {
    const r = this.r;
    const opts: (Frac | number)[] = Phaser.Utils.Array.Shuffle([...r.options] as (Frac | number)[]);
    const text = (o: Frac | number) => (typeof o === 'number' ? (r.kind === 'clock' ? digital(o) : String(o)) : o.n === o.d ? '1' : str(o));
    this.guide.say(monsterQuestion(r));
    opts.forEach((o, i) => {
      const b = this.keep(new Button(this, STAGE.x + (i - 1) * 250, BTN_Y, text(o), () => this.answer(o, b), { w: 220, h: 92, size: 44 }));
      this.buttons.push(b);
    });
    this.phase = 'answer';
  }

  private isRight(o: Frac | number) {
    const a = monsterAnswer(this.r);
    return typeof a === 'number' ? o === a : typeof o !== 'number' && sameValue(o, a);
  }

  private answer(o: Frac | number, b: Button) {
    if (this.phase !== 'answer') return;
    if (!this.isRight(o)) {
      b.setEnabled(false);
      this.mistake(monsterExplain(this.r), [monsterExplain(this.r, true)]);
      this.showWrong();
      return;
    }
    this.phase = 'busy';
    this.buttons.forEach(x => x.setVisible(false));
    this.afterRight();
  }

  /** A wrong answer is shown on the picture, then put back for another try. */
  private showWrong() {
    const r = this.r;
    if (r.kind === 'candles') { this.phase = 'busy'; this.blowOut(r, () => this.time.delayedCall(1800, () => { this.relightAll(); this.phase = 'answer'; })); }
    if (r.kind === 'grow') { this.phase = 'busy'; this.growTo(r.was + r.grew, () => this.time.delayedCall(1800, () => { this.growTo(r.was); this.phase = 'answer'; })); }
  }

  /** What happens on the picture after the right answer, before the praise. */
  private afterRight() {
    const r = this.r;
    switch (r.kind) {
      case 'cake': this.success(MONSTER_LINES.yum); break;
      case 'web':
        this.phase = 'act';
        this.guide.say(MONSTER_LINES.mend);
        speak(MONSTER_LINES.mend);
        break;
      case 'candles':
        this.blowOut(r, () => {
          this.setMood('angry');
          this.phase = 'act';
          this.guide.say(MONSTER_LINES.light);
          speak(MONSTER_LINES.light);
        });
        break;
      case 'grow': this.growTo(r.was + r.grew, () => this.success(MONSTER_LINES.grown)); break;
      case 'clock': this.sweepTo(r.now + r.plus, () => this.success(MONSTER_LINES.guests)); break;
    }
  }

  // ---------- kitchen: grandma's cake ----------
  private setupCake(r: Extract<MonsterRound, { kind: 'cake' }>) {
    // A little lower than the stage centre: the speech bubble sits above it.
    const x = STAGE.x, y = 640, R = 210, n = r.slices;
    const plate = this.keep(this.add.graphics());
    plate.fillStyle(C.paper).fillCircle(x, y, R + 30).lineStyle(5, C.navy).strokeCircle(x, y, R + 30);
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
      const g = this.keep(this.add.graphics()) as Item;
      g.fillStyle(C.terra).slice(0, 0, R, a0, a1, false).fillPath();
      g.fillStyle(C.cheese).slice(0, 0, R * 0.8, a0, a1, false).fillPath();
      g.lineStyle(5, C.navy).slice(0, 0, R, a0, a1, false).strokePath();
      const mid = (a0 + a1) / 2;
      g.fillStyle(C.paper).fillCircle(Math.cos(mid) * R * 0.55, Math.sin(mid) * R * 0.55, 14).lineStyle(3, C.navy).strokeCircle(Math.cos(mid) * R * 0.55, Math.sin(mid) * R * 0.55, 14);
      g.setPosition(x, y);
      const pts = [new Phaser.Math.Vector2(0, 0)];
      for (let k = 0; k <= 6; k++) { const a = a0 + ((a1 - a0) * k) / 6; pts.push(new Phaser.Math.Vector2(Math.cos(a) * R, Math.sin(a) * R)); }
      g.setInteractive(new Phaser.Geom.Polygon(pts), Phaser.Geom.Polygon.Contains);
      g.on('pointerup', () => this.giveSlice(g));
      this.items.push(g);
    }
    // Who gets cake: standing on the right with a plate and their share.
    r.gives.forEach(([who, need], i) => {
      const px = 1350 + i * 220;
      const img = this.keep(this.add.image(px, 790, `${who}-normal`).setOrigin(0.5, 1));
      img.setScale(Math.min(200 / img.height, 190 / img.width));
      const p = this.keep(this.add.graphics());
      p.fillStyle(C.paper).fillEllipse(px, 870, 170, 60).lineStyle(4, C.navy).strokeEllipse(px, 870, 170, 60);
      this.keep(label(this, px, 930, `${MONSTERS[who].tag}: ${need}/${n}`, 28, HEX.navy, 900));
      this.given.push(0);
    });
    this.phase = 'act';
    this.guide.say(MONSTER_LINES.give);
  }

  private giveSlice(g: Item) {
    const r = this.r;
    if (this.phase !== 'act' || r.kind !== 'cake' || g.done) return;
    const i = r.gives.findIndex(([, need], k) => this.given[k] < need);
    if (i < 0) return;
    g.done = true;
    g.disableInteractive();
    sfx('click');
    const k = this.given[i]++;
    g.setDepth(4);
    this.tweens.add({ targets: g, x: 1350 + i * 220 + (k % 3 - 1) * 30, y: 862 - Math.floor(k / 3) * 16, scale: 0.3, duration: 450, ease: 'Cubic.Out' });
    if (r.gives.every(([, need], k2) => this.given[k2] >= need)) {
      this.phase = 'busy';
      this.time.delayedCall(600, () => this.showOptions());
    }
  }

  // ---------- attic: the torn web ----------
  private setupWeb(r: Extract<MonsterRound, { kind: 'web' }>) {
    const n = r.sectors;
    // Torn sectors are spread round the web, not all in a row.
    const torn = new Set<number>();
    for (let k = 0; torn.size < r.torn; k++) torn.add((k * Math.ceil(n / r.torn) + Math.floor(k / Math.ceil(n / r.torn))) % n);
    for (let i = 0; i < n; i++) {
      const g = this.keep(this.add.graphics()) as Item;
      g.done = !torn.has(i);
      g.setPosition(STAGE.x, STAGE.y);
      this.drawSector(g, i, n);
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n, R = 270;
      const pts = [new Phaser.Math.Vector2(0, 0)];
      for (let k = 0; k <= 6; k++) { const a = a0 + ((a1 - a0) * k) / 6; pts.push(new Phaser.Math.Vector2(Math.cos(a) * R, Math.sin(a) * R)); }
      g.setInteractive(new Phaser.Geom.Polygon(pts), Phaser.Geom.Polygon.Contains);
      g.on('pointerup', () => this.mend(g, i));
      this.items.push(g);
    }
    this.showOptions();
  }

  private drawSector(g: Item, i: number, n: number) {
    const R = 260, a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
    g.clear();
    if (g.done) g.fillStyle(C.paper, 0.35).slice(0, 0, R, a0, a1, false).fillPath();
    g.lineStyle(4, C.navy).lineBetween(0, 0, Math.cos(a0) * R, Math.sin(a0) * R);
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (R * ring) / 4;
      if (g.done) {
        g.lineStyle(3, C.navy).lineBetween(Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a1) * rr, Math.sin(a1) * rr);
      } else {
        // Broken threads: two loose ends.
        const ax = Math.cos(a0) * rr, ay = Math.sin(a0) * rr, bx = Math.cos(a1) * rr, by = Math.sin(a1) * rr;
        g.lineStyle(3, C.terra).lineBetween(ax, ay, ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25 + 10).lineBetween(bx, by, bx + (ax - bx) * 0.25, by + (ay - by) * 0.25 + 10);
      }
    }
  }

  private mend(g: Item, i: number) {
    const r = this.r;
    if (this.phase !== 'act' || r.kind !== 'web' || g.done) return;
    g.done = true;
    sfx('click');
    const a = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / r.sectors;
    this.tweens.add({ targets: this.host, x: STAGE.x + Math.cos(a) * 160, y: STAGE.y + Math.sin(a) * 160 + 60, duration: 350, ease: 'Sine.InOut' });
    this.drawSector(g, i, r.sectors);
    if (this.items.every(x => x.done)) {
      this.phase = 'busy';
      this.time.delayedCall(500, () => {
        this.tweens.add({ targets: this.host, x: 1320, y: FLOOR - 380, duration: 500 });
        this.success(`${MONSTER_LINES.mended} ${r.sectors}/${r.sectors} = 1.`);
      });
    }
  }

  // ---------- cellar: candles in the draught ----------
  private setupCandles(r: Extract<MonsterRound, { kind: 'candles' }>) {
    const per = r.total / r.frac.d, gap = 36, step = 78;
    const width = r.total * step + (r.frac.d - 1) * gap;
    // Centred right of the wolf, who stands on the left.
    const cx = 1080, x0 = cx - width / 2 + step / 2, y = 640;
    const bar = this.keep(this.add.graphics());
    bar.fillStyle(C.mustardDark).fillRect(x0 - 70, y + 40, width + 50, 22).lineStyle(4, C.navy).strokeRect(x0 - 70, y + 40, width + 50, 22);
    bar.lineStyle(4, C.navy, 0.6).lineBetween(cx, 100, cx, y + 40);
    for (let i = 0; i < r.total; i++) {
      const g = this.keep(this.add.graphics()) as Item;
      g.done = true;
      g.setPosition(x0 + i * step + Math.floor(i / per) * gap, y);
      this.drawCandle(g);
      g.setInteractive(new Phaser.Geom.Rectangle(-34, -110, 68, 160), Phaser.Geom.Rectangle.Contains);
      g.on('pointerup', () => this.light(g));
      this.items.push(g);
    }
    this.showOptions();
  }

  private drawCandle(g: Item) {
    g.clear();
    g.fillStyle(C.paper).fillRoundedRect(-18, -40, 36, 80, 6).lineStyle(4, C.navy).strokeRoundedRect(-18, -40, 36, 80, 6);
    g.lineStyle(3, C.navy).lineBetween(0, -40, 0, -54);
    if (g.done) {
      g.fillStyle(C.mustard).fillEllipse(0, -74, 26, 40).lineStyle(3, C.navy).strokeEllipse(0, -74, 26, 40);
      g.fillStyle(C.cheese).fillEllipse(0, -68, 10, 18);
    } else {
      g.lineStyle(4, C.navy, 0.5).beginPath().moveTo(0, -56).lineTo(-6, -70).lineTo(4, -84).lineTo(-4, -98).strokePath();
    }
  }

  /** The draught blows out the right number of candles, group by group, so the answer shows. */
  private blowOut(r: Extract<MonsterRound, { kind: 'candles' }>, done: () => void) {
    const n = monsterAnswer(r) as number;
    for (let k = 0; k < 4; k++) {
      const w = this.keep(this.add.graphics());
      w.lineStyle(5, C.navy, 0.6).beginPath().arc(0, 0, 40, -0.4, 0.4).strokePath();
      w.setPosition(1850, 330 + k * 60);
      this.tweens.add({ targets: w, x: 300, alpha: 0, duration: 1100, delay: k * 120 });
    }
    sfx('click');
    this.items.slice(0, n).forEach((c, i) => this.time.delayedCall(250 + i * 70, () => { c.done = false; this.drawCandle(c); }));
    this.time.delayedCall(400 + n * 70, done);
  }

  private relightAll() {
    this.items.forEach(c => { c.done = true; this.drawCandle(c); });
  }

  private light(g: Item) {
    if (this.phase !== 'act' || g.done) return;
    g.done = true;
    sfx('coin');
    this.drawCandle(g);
    if (this.items.every(c => c.done)) {
      this.phase = 'busy';
      this.time.delayedCall(300, () => this.success(MONSTER_LINES.lit));
    }
  }

  // ---------- nursery: growing on the door frame ----------
  private setupGrow(r: Extract<MonsterRound, { kind: 'grow' }>) {
    const g = this.keep(this.add.graphics());
    const dx = STAGE.x, top = FLOOR - DOOR_U, w = 230;
    g.fillStyle(C.mustardDark).fillRect(dx - w / 2 - 24, top - 24, w + 48, DOOR_U + 24).lineStyle(5, C.navy).strokeRect(dx - w / 2 - 24, top - 24, w + 48, DOOR_U + 24);
    g.fillStyle(C.terra).fillRect(dx - w / 2, top, w, DOOR_U).lineStyle(5, C.navy).strokeRect(dx - w / 2, top, w, DOOR_U);
    g.fillStyle(C.mustard).fillCircle(dx + w / 2 - 30, FLOOR - DOOR_U / 2, 12).lineStyle(4, C.navy).strokeCircle(dx + w / 2 - 30, FLOOR - DOOR_U / 2, 12);
    // Pencil marks on the left of the frame, where the baby is measured.
    const fx = dx - w / 2 - 24;
    for (let k = 1; k <= r.d + 1; k++) {
      const y = FLOOR - (DOOR_U * k) / r.d;
      const above = k > r.d;
      g.lineStyle(4, C.navy, above ? 0.4 : 1).lineBetween(fx - (k === r.d ? 30 : 16), y, fx + 24, y);
      this.keep(label(this, fx - 40, y, k === r.d ? '1' : `${k}/${r.d}`, 26, HEX.navy, 900).setOrigin(1, 0.5).setAlpha(above ? 0.5 : 1));
    }
    // The baby stands on the right; a dashed line runs from his head to the frame.
    this.headLine = this.keep(this.add.graphics());
    this.host.setPosition(1260, FLOOR);
    this.growTo(r.was, undefined, false);
    this.showOptions();
  }

  private growTo(k: number, done?: () => void, animate = true) {
    if (this.r.kind !== 'grow') return;
    const target = ((DOOR_U * k) / this.r.d) / this.host.height;
    this.tweens.killTweensOf(this.host);
    if (!animate) { this.host.setScale(target); this.drawHeadLine(); return; }
    this.tweens.add({ targets: this.host, scale: target, duration: 900, ease: 'Back.Out', onUpdate: () => this.drawHeadLine(), onComplete: () => done?.() });
  }

  private drawHeadLine() {
    const g = this.headLine?.clear();
    if (!g) return;
    const y = FLOOR - this.host.displayHeight, from = STAGE.x - 115 - 24, to = this.host.x;
    g.lineStyle(4, C.navy, 0.6);
    for (let x = from; x < to; x += 28) g.lineBetween(x, y, Math.min(to, x + 14), y);
  }

  // ---------- parlor: the clock with a bat ----------
  private setupClock(r: Extract<MonsterRound, { kind: 'clock' }>) {
    const { x } = STAGE, cy = 560, R = 210;
    const g = this.keep(this.add.graphics());
    g.fillStyle(C.mustardDark).fillRoundedRect(x - R - 40, cy - R - 120, 2 * R + 80, 2 * R + 160 + (FLOOR - cy - R - 40), 30).lineStyle(5, C.navy)
      .strokeRoundedRect(x - R - 40, cy - R - 120, 2 * R + 80, 2 * R + 160 + (FLOOR - cy - R - 40), 30);
    g.fillStyle(C.navy).fillRoundedRect(x - 60, cy - R - 100, 120, 90, 14);
    g.fillStyle(C.paper).fillCircle(x, cy, R).lineStyle(6, C.navy).strokeCircle(x, cy, R);
    for (let i = 1; i <= 12; i++) {
      const a = (i * Math.PI) / 6;
      g.lineStyle(i % 3 ? 3 : 6, C.navy).lineBetween(x + Math.sin(a) * (R - 14), cy - Math.cos(a) * (R - 14), x + Math.sin(a) * (R - 32), cy - Math.cos(a) * (R - 32));
      this.keep(label(this, x + Math.sin(a) * (R - 58), cy - Math.cos(a) * (R - 58), String(i), 32, HEX.navy, 900));
    }
    const hand = (len: number, width: number, color: number) => {
      const c = this.keep(this.add.container(x, cy));
      const h = this.add.graphics();
      h.lineStyle(width + 4, C.navy).lineBetween(0, 12, 0, -len).lineStyle(width, color).lineBetween(0, 10, 0, -len + 2);
      c.add(h);
      return c;
    };
    this.hands = { hour: hand(R * 0.5, 12, C.terra), minute: hand(R * 0.78, 8, C.navy) };
    const pin = this.keep(this.add.circle(x, cy, 12, C.navy));
    pin.setDepth(1);
    this.host.setPosition(x, cy - R - 55);
    this.setTime(r.now);
    this.showOptions();
  }

  private setTime(t: number) {
    if (!this.hands) return;
    this.hands.minute.setRotation((t / 60) * Math.PI * 2);
    this.hands.hour.setRotation((t / 720) * Math.PI * 2);
  }

  private sweepTo(t: number, done: () => void) {
    if (this.r.kind !== 'clock') return;
    const from = { t: this.r.now };
    this.tweens.add({ targets: from, t, duration: 1200, ease: 'Sine.InOut', onUpdate: () => this.setTime(from.t), onComplete: done });
  }

  // ---------- feedback ----------
  private say(text: string) {
    this.bubble?.destroy();
    // Next to the host, below the guide pill and clear of the clock.
    const bx = this.hostId === 'bat' ? 1460 : Phaser.Math.Clamp(this.host.x + 520, 750, 1520), by = this.hostId === 'bat' ? 480 : 300;
    const head = { x: this.host.x - bx + 30, y: (this.host.originY === 1 ? this.host.y - this.host.displayHeight + 30 : this.host.y) - by };
    const b = this.bubble = new Bubble(this, bx, by, 760, 180, head);
    b.add(wrapLabel(this, 0, 0, text, 700, 30, 800));
    b.pop();
  }

  private success(line: string) {
    sfx('good');
    this.setMood('happy');
    this.say(line);
    const why = monsterExplain(this.r);
    this.guide.say(`Верно! ${why}`);
    speakSeq([line, `Верно! ${monsterExplain(this.r, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, STAGE.x, 330, earned);
    this.next.setVisible(true);
    this.phase = 'busy';
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    const x0 = this.host.x;
    this.tweens.add({ targets: this.host, x: x0 + 10, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.host.setX(x0) });
    this.guide.say(screen);
    speakSeq(spoken);
    this.time.delayedCall(1600, () => { if (this.phase !== 'act') this.setMood('normal'); });
  }

  private nextRound() {
    this.next.setVisible(false);
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.clearStage();
    this.bubble?.destroy();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('monsters', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < MONSTER_LEVELS.length;
    const result = () => {
      resultModal(this, {
        title: 'Комната пройдена!',
        stars,
        coins: this.coins,
        note: MONSTER_NOTES[stars],
        onMap: () => this.scene.start('Town'),
        onRetry: () => this.scene.restart({ level: this.levelIndex }),
        onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
      });
      speak(MONSTER_NOTES[stars]);
    };
    // The whole house is done for the first time: a diploma with everyone.
    const allDone = MONSTER_LEVELS.every((_, i) => store.stars('monsters', i) > 0);
    if (allDone && !store.met('diploma')) {
      store.meet('diploma');
      this.diploma(result);
    } else result();
  }

  private diploma(onClose: () => void) {
    const layer = modal(this, 1500, 820);
    const cx = W / 2, top = H / 2 - 410;
    layer.add(label(this, cx, top + 80, DIPLOMA.title, 64, HEX.terra, 900));
    layer.add(wrapLabel(this, cx, top + 170, DIPLOMA.text, 1200, 34, 700));
    const heroes = ['pyh', 'ekibas', 'osya', 'borovik', 'tikhon', 'nosochka', 'usach', 'ochkarik', 'sardina',
      'rumb', 'heron', 'giraffe', 'pip', 'mummy', 'wolf', 'slime', 'spider', 'bat'];
    heroes.forEach((h, i) => {
      const row = Math.floor(i / 9), col = i % 9;
      const img = this.add.image(cx + (col - 4) * 150, top + 420 + row * 200, `${h}-happy`).setOrigin(0.5, 1);
      img.setScale(Math.min(170 / img.height, 130 / img.width));
      layer.add(img);
      this.tweens.add({ targets: img, y: img.y - 12, duration: 400 + (i % 4) * 80, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    layer.add(new Button(this, cx, top + 730, 'Ура!', () => { layer.destroy(); onClose(); }, { w: 300, h: 96, fill: C.olive, color: HEX.paper }));
    sfx('star');
    speak(`${DIPLOMA.title}! ${DIPLOMA.text}`);
  }

  private setMood(m: Mood) {
    this.host.setTexture(`${this.hostId}-${m}`);
  }
}
