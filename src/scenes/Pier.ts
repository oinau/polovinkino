import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { PIER_LEVELS, pierNumbers, type PierLevel, type PierRound } from '../levels';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { CREW, HEROES, PIER_LINES, PIER_NOTES, coinsWord, pierAsk, pierExplain, pierGivenNote } from '../lines';
import { store } from '../store';
import {
  Bubble, Button, FractionView, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, topBar, wrapLabel,
} from '../ui';

const CAPTAIN = { x: 210, y: 1000 };
const CHEST = { x: 540, y: 780 };
const TABLE = { x: 760, w: 720, y: 770 };
const SACK = { x: 1640, y: 1000 };
const PARROT = { x: 1820, y: 1010 };
const BTN_Y = 1000;
const COIN_R = 20;

/** A pile on the table: the check shows the treasure dealt into equal piles. */
interface Tray {
  x: number;
  w: number;
  g: Phaser.GameObjects.Graphics;
  coins: Phaser.GameObjects.Graphics[];
  /** The piles that make the asked share. */
  selected: boolean;
  /** Dashed outline with «?»: a pile we only imagine. */
  ghost?: Phaser.GameObjects.Text;
}

/** give: coins go from the chest into the sack; answer: pick a number. */
type Phase = 'busy' | 'give' | 'answer';

export class Pier extends Phaser.Scene {
  private levelIndex = 0;
  private level!: PierLevel;
  private roundIndex = 0;
  private r!: PierRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private captain!: Phaser.GameObjects.Image;
  private parrot!: Phaser.GameObjects.Image;
  private bubbles: Bubble[] = [];
  private chest: Phaser.GameObjects.Graphics[] = [];
  /** Coins in the sack, hidden inside it. */
  private sackCoins: Phaser.GameObjects.Graphics[] = [];
  private chestLabel!: Phaser.GameObjects.Text;
  private trays: Tray[] = [];
  private flying: Phaser.GameObjects.Graphics[] = [];
  private sackTag?: Phaser.GameObjects.Container;
  private sackCount!: Phaser.GameObjects.Text;
  private given = 0;
  private buttons: Button[] = [];
  /** Number buttons already tried on this round. */
  private wrong = new Set<Button>();
  private give!: Button;
  private next!: Button;

  constructor() { super('Pier'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = PIER_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.bubbles = [];
    this.chest = [];
    this.sackCoins = [];
    this.trays = [];
    this.flying = [];
    this.buttons = [];
    this.sackTag = undefined;
    this.phase = 'busy';
  }

  create() {
    this.drawDeck();
    topBar(this, `Пристань ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.captain = this.add.image(CAPTAIN.x, CAPTAIN.y, 'sardina-normal').setOrigin(0.5, 1);
    this.tweens.add({ targets: this.captain, scaleY: 1.02, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    nameTag(this, CAPTAIN.x, CAPTAIN.y + 40, 'Капитан Сардина');

    // Barrel with the parrot on top.
    const b = this.add.graphics();
    b.fillStyle(C.mustardDark).fillRoundedRect(PARROT.x - 65, PARROT.y - 140, 130, 140, 18);
    b.lineStyle(5, C.navy).strokeRoundedRect(PARROT.x - 65, PARROT.y - 140, 130, 140, 18);
    b.lineStyle(5, C.navy).lineBetween(PARROT.x - 65, PARROT.y - 100, PARROT.x + 65, PARROT.y - 100).lineBetween(PARROT.x - 65, PARROT.y - 40, PARROT.x + 65, PARROT.y - 40);
    this.parrot = this.add.image(PARROT.x, PARROT.y - 110, 'rumb-normal').setOrigin(0.5, 1).setScale(0.85).setFlipX(true);
    this.tweens.add({ targets: this.parrot, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.drawChest();
    this.drawSack();

    this.guide = new Guide(this, 150);
    // Always pressable: if it is too early, Rumb says what to do.
    this.give = new Button(this, TABLE.x + TABLE.w / 2, BTN_Y, 'Отдать', () => this.giveAway(), { w: 300, h: 96, fill: C.olive, color: HEX.paper });
    this.give.setVisible(false);
    this.next = new Button(this, TABLE.x + TABLE.w / 2, BTN_Y, 'Дальше →', () => this.nextRound(), { w: 360, h: 96, fill: C.olive, color: HEX.paper });
    this.next.setVisible(false);

    if (store.met('pier')) this.showIntro();
    else meetCard(this, HEROES.pier, () => { store.meet('pier'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawDeck() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    g.fillStyle(C.water).fillRect(-BLEED, 330, W + 2 * BLEED, 250);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, 330, W + BLEED, 330);
    g.lineStyle(4, C.paper);
    for (const [x, y] of [[160, 400], [520, 460], [980, 390], [1380, 470], [1760, 410], [1200, 530]]) {
      g.beginPath().arc(x, y, 18, Math.PI, 0).arc(x + 36, y, 18, Math.PI, 0).strokePath();
    }
    // Deck planks.
    g.fillStyle(C.sand).fillRect(-BLEED, 580, W + 2 * BLEED, H - 580 + BLEED);
    g.lineStyle(5, C.navy).lineBetween(-BLEED, 580, W + BLEED, 580);
    g.lineStyle(3, C.floor);
    for (let y = 660; y < H + BLEED; y += 80) g.lineBetween(-BLEED, y, W + BLEED, y);
    // Table under the piles.
    g.fillStyle(C.navy).fillRoundedRect(TABLE.x - 30, TABLE.y - 120, TABLE.w + 60, 250, 24);
    g.fillStyle(C.mustardDark).fillRoundedRect(TABLE.x - 30, TABLE.y - 128, TABLE.w + 60, 250, 24);
    g.lineStyle(5, C.navy).strokeRoundedRect(TABLE.x - 30, TABLE.y - 128, TABLE.w + 60, 250, 24);
  }

  private drawChest() {
    const g = this.add.graphics();
    const { x, y } = CHEST;
    // Open lid behind, box in front.
    g.fillStyle(C.terra).fillRoundedRect(x - 170, y - 170, 340, 80, 30).lineStyle(5, C.navy).strokeRoundedRect(x - 170, y - 170, 340, 80, 30);
    g.fillStyle(C.mustardDark).fillRect(x - 170, y - 100, 340, 180).lineStyle(5, C.navy).strokeRect(x - 170, y - 100, 340, 180);
    g.lineStyle(4, C.navy).lineBetween(x - 170, y + 30, x + 170, y + 30);
    g.fillStyle(C.mustard).fillRect(x - 20, y + 18, 40, 30).lineStyle(4, C.navy).strokeRect(x - 20, y + 18, 40, 30);
    this.chestLabel = label(this, x, y + 120, '', 34, HEX.navy, 900);
    // Each tap moves one coin into the sack.
    const zone = this.add.zone(x, y - 45, 360, 270).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.tapChest());
  }

  private drawSack() {
    const g = this.add.graphics();
    const { x, y } = SACK;
    g.fillStyle(C.floor).fillEllipse(x, y - 70, 180, 150).lineStyle(5, C.navy).strokeEllipse(x, y - 70, 180, 150);
    g.fillStyle(C.floor).fillTriangle(x - 40, y - 175, x + 40, y - 175, x, y - 135).lineStyle(5, C.navy).strokeTriangle(x - 40, y - 175, x + 40, y - 175, x, y - 135);
    g.lineStyle(7, C.terra).lineBetween(x - 26, y - 140, x + 26, y - 140);
    this.sackCount = label(this, x, y - 66, '', 42, HEX.navy, 900);
    // A tap takes one coin back to the chest.
    const zone = this.add.zone(x, y - 90, 200, 190).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.tapSack());
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
    const layer = modal(this, 1100, 500);
    layer.add(label(this, W / 2, H / 2 - 160, `Пристань ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 940, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 160, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  // ---------- coins ----------
  private coin(x: number, y: number) {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(C.mustard).fillCircle(0, 0, COIN_R).lineStyle(4, C.navy).strokeCircle(0, 0, COIN_R);
    g.lineStyle(3, C.mustardDark).strokeCircle(0, 0, COIN_R - 9);
    return g.setPosition(x, y);
  }

  /** Coin places in the chest: four in a row, filling from the bottom. */
  private chestSlot(i: number) {
    return { x: CHEST.x - 1.5 * 52 + (i % 4) * 52, y: CHEST.y + 50 - Math.floor(i / 4) * 46 };
  }

  private traySlot(t: Tray, i: number) {
    return { x: t.x + ((i % 2) - 0.5) * 46, y: TABLE.y + 62 - Math.floor(i / 2) * 46 };
  }

  private fillChest(n: number) {
    for (let i = 0; i < n; i++) {
      const p = this.chestSlot(i);
      this.chest.push(this.coin(p.x, p.y));
    }
  }

  private fly(c: Phaser.GameObjects.Graphics, to: { x: number; y: number }, duration = 260, onDone?: () => void) {
    this.tweens.add({ targets: c, x: to.x, y: to.y, duration, ease: 'Cubic.Out', onComplete: onDone });
  }

  private showGiven() {
    this.sackCount.setText(this.given ? `+${this.given}` : '');
  }

  tapChest() {
    if (this.phase !== 'give') return;
    const c = this.chest.pop();
    if (!c) return;
    sfx('click');
    this.guide.hideArrow();
    this.sackCoins.push(c);
    this.given++;
    this.showGiven();
    this.fly(c, { x: SACK.x, y: SACK.y - 80 }, 300, () => { if (this.sackCoins.includes(c)) c.setVisible(false); });
  }

  tapSack() {
    if (this.phase !== 'give') return;
    const c = this.sackCoins.pop();
    if (!c) return;
    sfx('click');
    this.given--;
    this.showGiven();
    this.tweens.killTweensOf(c);
    c.setVisible(true).setPosition(SACK.x, SACK.y - 80);
    this.fly(c, this.chestSlot(this.chest.length), 300);
    this.chest.push(c);
  }

  // ---------- piles ----------
  private makeTrays(d: number, ghosts = false) {
    const step = TABLE.w / d;
    for (let i = 0; i < d; i++) {
      const x = TABLE.x + step * (i + 0.5), w = Math.min(170, step - 18);
      const t: Tray = { x, w, g: this.add.graphics(), coins: [], selected: false };
      this.trays.push(t);
      this.setGhost(t, ghosts);
    }
  }

  private setGhost(t: Tray, ghost: boolean) {
    t.ghost?.destroy();
    t.ghost = ghost ? label(this, t.x, TABLE.y - 4, '?', 64, HEX.navy, 900) : undefined;
    this.drawTray(t);
  }

  private drawTray(t: Tray) {
    const g = t.g.clear();
    const x = t.x - t.w / 2, y = TABLE.y - 98, h = 196;
    if (t.ghost) {
      g.lineStyle(5, C.navy, 0.6);
      for (let k = 0; k < 4; k++) {
        const [x1, y1, x2, y2] = [[x, y, x + t.w, y], [x + t.w, y, x + t.w, y + h], [x + t.w, y + h, x, y + h], [x, y + h, x, y]][k];
        const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / 26);
        for (let s = 0; s < n; s += 2) g.lineBetween(x1 + ((x2 - x1) * s) / n, y1 + ((y2 - y1) * s) / n, x1 + ((x2 - x1) * (s + 1)) / n, y1 + ((y2 - y1) * (s + 1)) / n);
      }
      return;
    }
    g.fillStyle(t.selected ? C.oliveLight : C.paper).fillRoundedRect(x, y, t.w, h, 22);
    g.lineStyle(t.selected ? 9 : 5, t.selected ? C.olive : C.navy).strokeRoundedRect(x, y, t.w, h, 22);
  }

  private putInTray(t: Tray, c: Phaser.GameObjects.Graphics, duration = 260) {
    const p = this.traySlot(t, t.coins.length);
    t.coins.push(c);
    this.fly(c, p, duration);
  }

  /** The asked share: the first `frac.n` piles light up. */
  private markShare() {
    for (const t of this.trays.slice(0, this.r.frac.n)) { t.selected = true; this.drawTray(t); }
  }

  private clearTrays() {
    for (const t of this.trays) { t.g.destroy(); t.ghost?.destroy(); }
    this.trays = [];
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    // Nothing from the previous round may still land on the table.
    this.time.removeAllEvents();
    this.tweens.killTweensOf([...this.chest, ...this.sackCoins, ...this.flying, ...this.trays.flatMap(t => t.coins)]);
    this.triesOnRound = 0;
    this.clearTable();
    this.setMood('normal');
    this.clearBubbles();
    this.next.setVisible(false);
    this.sackTag?.destroy();
    this.sackTag = nameTag(this, SACK.x, SACK.y - 210, CREW[this.r.who].name);
    this.given = 0;
    this.showGiven();

    const r = this.r, ask = pierAsk(r);
    const b = new Bubble(this, 660, 330, 700, 250, { x: CAPTAIN.x + 70 - 660, y: CAPTAIN.y - this.captain.displayHeight + 60 - 330 });
    b.add(wrapLabel(this, 0, -58, ask, 640, r.kind === 'give' ? 36 : 30, 800));
    b.add(new FractionView(this, 0, 64, r.frac.n, r.frac.d, 42));
    b.pop();
    this.bubbles.push(b);
    speak(ask);

    if (r.kind === 'give') {
      this.fillChest(r.total);
      this.chestLabel.setText(coinsWord(r.total));
      this.phase = 'give';
      this.give.setVisible(true);
      this.guide.say('Нажимай на сундук: монеты полетят в мешок. Лишнюю верни — нажми на мешок. Потом «Отдать».');
      if (this.level.guide) this.pointChest();
    } else {
      // The share is in the sack; the chest and the piles are what we work out.
      this.chestLabel.setText('? монет');
      this.sackCount.setText(`+${r.part}`);
      this.makeTrays(r.frac.d, true);
      this.phase = 'answer';
      this.guide.say('Посчитай в уме и выбери ответ.');
      const opts = Phaser.Utils.Array.Shuffle([...r.options]);
      opts.forEach((v, i) => {
        const btn = new Button(this, TABLE.x + TABLE.w / 2 + (i - 1) * 250, BTN_Y, String(v), () => this.pickNumber(v, btn), { w: 220, h: 96, size: 44 });
        this.buttons.push(btn);
      });
    }
  }

  private pointChest() {
    this.guide.point(CHEST.x, CHEST.y - 190, 'top');
  }

  private clearTable() {
    for (const c of [...this.chest, ...this.sackCoins, ...this.flying, ...this.trays.flatMap(t => t.coins)]) c.destroy();
    this.clearTrays();
    this.chest = [];
    this.sackCoins = [];
    this.flying = [];
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    this.wrong.clear();
    this.give.setVisible(false);
    this.guide.hideArrow();
  }

  giveAway() {
    if (this.phase !== 'give') return;
    if (!this.given) {
      // Not a mistake: Rumb says what to do and the arrow shows where.
      sfx('click');
      this.parrotSays(PIER_LINES.empty);
      speak(PIER_LINES.empty);
      this.pointChest();
      return;
    }
    this.phase = 'busy';
    this.give.setVisible(false);
    this.check();
  }

  /** The whole treasure is dealt into equal piles; the asked piles light up and are compared with the sack. */
  private check() {
    const r = this.r, given = this.given, { answer } = pierNumbers(r);
    this.tweens.killTweensOf([...this.sackCoins, ...this.chest]);
    const coins = [...this.sackCoins.splice(0).map(c => c.setVisible(true).setPosition(SACK.x, SACK.y - 80)), ...this.chest.splice(0).reverse()];
    this.makeTrays(r.frac.d);
    coins.forEach((c, i) => this.time.delayedCall(i * 110, () => this.putInTray(this.trays[i % r.frac.d], c, 220)));
    this.time.delayedCall(coins.length * 110 + 350, () => {
      this.markShare();
      if (given === answer) {
        this.given = 0;
        this.toSack(this.trays.filter(t => t.selected), () => this.success());
        return;
      }
      const few = given < answer;
      this.mistake(`${pierExplain(r)} ${pierGivenNote(given)}`, [few ? PIER_LINES.few : PIER_LINES.many, pierExplain(r, true)]);
      if (few) this.captainSays(PIER_LINES.few); else this.parrotSays(PIER_LINES.many);
      this.time.delayedCall(4000, () => {
        // Everything back into the chest: try again.
        const all = this.trays.flatMap(t => t.coins.splice(0));
        this.clearTrays();
        all.forEach((c, i) => { this.chest.push(c); this.fly(c, this.chestSlot(i), 300); });
        this.given = 0;
        this.showGiven();
        this.give.setVisible(true);
        this.phase = 'give';
      });
    });
  }

  /** Coins of the chosen piles fly into the crew member's sack. */
  private toSack(trays: Tray[], done: () => void) {
    const coins = trays.flatMap(t => t.coins.splice(0));
    coins.forEach((c, i) => {
      this.flying.push(c);
      this.time.delayedCall(i * 70, () => this.fly(c, { x: SACK.x + Phaser.Math.Between(-30, 30), y: SACK.y - 80 }, 380, () => {
        c.setVisible(false);
        sfx('coin');
        this.given++;
        this.showGiven();
      }));
    });
    this.time.delayedCall(coins.length * 70 + 500, done);
  }

  /** Whole rounds: every imagined pile fills up like the share in the sack; the share's piles light up. */
  private fillGhosts(done: () => void) {
    const { pile } = pierNumbers(this.r);
    this.trays.forEach((t, k) => {
      this.time.delayedCall(k * 350, () => {
        this.setGhost(t, false);
        for (let i = 0; i < pile; i++) {
          const p = this.traySlot(t, i);
          const c = this.coin(p.x, p.y - 40).setAlpha(0);
          t.coins.push(c);
          this.tweens.add({ targets: c, y: p.y, alpha: 1, duration: 250, delay: i * 60 });
        }
        sfx('coin');
      });
    });
    this.time.delayedCall(this.trays.length * 350 + 500, () => { this.markShare(); done(); });
  }

  pickNumber(v: number, btn: Button) {
    if (this.phase !== 'answer') return;
    this.phase = 'busy';
    this.buttons.forEach(b => b.setEnabled(false));
    const r = this.r;
    this.fillGhosts(() => {
      if (v === pierNumbers(r).answer) {
        this.chestLabel.setText(coinsWord(pierNumbers(r).total));
        this.success();
        return;
      }
      this.mistake(pierExplain(r), [pierExplain(r, true)]);
      this.time.delayedCall(3800, () => {
        // Back to imagined piles and let the child answer again.
        for (const t of this.trays) { t.coins.splice(0).forEach(c => c.destroy()); t.selected = false; this.setGhost(t, true); }
        this.wrong.add(btn);
        this.buttons.forEach(b => b.setEnabled(!this.wrong.has(b)));
        this.phase = 'answer';
      });
    });
  }

  private success() {
    const r = this.r;
    sfx('good');
    this.setMood('happy');
    this.guide.hideArrow();
    this.buttons.forEach(b => b.setVisible(false));
    this.parrotSays(PIER_LINES.right);
    this.guide.say(`Верно! ${pierExplain(r)}`);
    speakSeq([PIER_LINES.right, `Верно! ${pierExplain(r, true)}`]);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, CAPTAIN.x, CAPTAIN.y - this.captain.displayHeight - 10, earned);
    this.tweens.add({ targets: this.captain, y: CAPTAIN.y - 24, duration: 180, yoyo: true, repeat: 2 });
    this.next.setVisible(true);
    this.phase = 'busy';
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.setMood('angry');
    this.tweens.add({ targets: this.captain, x: CAPTAIN.x + 10, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.captain.setX(CAPTAIN.x) });
    this.guide.say(screen);
    speakSeq(spoken);
    this.time.delayedCall(1600, () => this.setMood('normal'));
  }

  private parrotSays(text: string) {
    this.dropBubble(1);
    const b = new Bubble(this, 1540, 470, 460, 150, { x: PARROT.x - 60 - 1540, y: PARROT.y - 110 - this.parrot.displayHeight + 70 - 470 });
    b.add(wrapLabel(this, 0, 0, text, 410, 30, 900));
    b.pop();
    this.bubbles[1] = b;
  }

  private captainSays(text: string) {
    this.dropBubble(0);
    const b = new Bubble(this, 660, 330, 700, 250, { x: CAPTAIN.x + 70 - 660, y: CAPTAIN.y - this.captain.displayHeight + 60 - 330 });
    b.add(wrapLabel(this, 0, 0, `${text}\n${pierAsk(this.r)}`, 640, 32, 800));
    b.pop();
    this.bubbles[0] = b;
  }

  private dropBubble(i: number) {
    this.bubbles[i]?.destroy();
  }

  private clearBubbles() {
    this.bubbles.forEach(b => b?.destroy());
    this.bubbles = [];
  }

  private nextRound() {
    this.next.setVisible(false);
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.clearTable();
    this.clearBubbles();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('pier', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < PIER_LEVELS.length;
    resultModal(this, {
      title: 'Клад поделён!',
      stars,
      coins: this.coins,
      note: PIER_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(PIER_NOTES[stars]);
  }

  private setMood(m: Mood) {
    this.captain.setTexture(`sardina-${m}`);
    this.parrot.setTexture(`rumb-${m}`);
  }
}
