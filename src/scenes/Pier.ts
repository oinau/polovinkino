import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { PIER_LEVELS, pierNumbers, type PierLevel, type PierRound } from '../levels';
import type { Mood } from '../art';
import { sfx, speak, speakSeq } from '../audio';
import { CREW, HEROES, PIER_LINES, PIER_NOTES, coinsWord, pierAsk, pierExplain, pierPickHint } from '../lines';
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
/** A pile never needs more: totals are at most 12 and there are at least 2 piles. */
const PILE_MAX = 6;

interface Tray {
  x: number;
  w: number;
  g: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  coins: Phaser.GameObjects.Graphics[];
  selected: boolean;
  /** Dashed outline with «?»: a pile we only imagine. */
  ghost?: Phaser.GameObjects.Text;
}

type Phase = 'busy' | 'deal' | 'pick' | 'answer';

export class Pier extends Phaser.Scene {
  private levelIndex = 0;
  private level!: PierLevel;
  private roundIndex = 0;
  private r!: PierRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';
  /** After an uneven deal the arrow helps even on levels without the guide. */
  private assist = false;

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private captain!: Phaser.GameObjects.Image;
  private parrot!: Phaser.GameObjects.Image;
  private bubbles: Bubble[] = [];
  private chest: Phaser.GameObjects.Graphics[] = [];
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
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.water).fillRect(0, 330, W, 250);
    g.lineStyle(5, C.navy).lineBetween(0, 330, W, 330);
    g.lineStyle(4, C.paper);
    for (const [x, y] of [[160, 400], [520, 460], [980, 390], [1380, 470], [1760, 410], [1200, 530]]) {
      g.beginPath().arc(x, y, 18, Math.PI, 0).arc(x + 36, y, 18, Math.PI, 0).strokePath();
    }
    // Deck planks.
    g.fillStyle(C.sand).fillRect(0, 580, W, H - 580);
    g.lineStyle(5, C.navy).lineBetween(0, 580, W, 580);
    g.lineStyle(3, C.floor);
    for (let y = 660; y < H; y += 80) g.lineBetween(0, y, W, y);
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
  }

  private drawSack() {
    const g = this.add.graphics();
    const { x, y } = SACK;
    g.fillStyle(C.floor).fillEllipse(x, y - 70, 180, 150).lineStyle(5, C.navy).strokeEllipse(x, y - 70, 180, 150);
    g.fillStyle(C.floor).fillTriangle(x - 40, y - 175, x + 40, y - 175, x, y - 135).lineStyle(5, C.navy).strokeTriangle(x - 40, y - 175, x + 40, y - 175, x, y - 135);
    g.lineStyle(7, C.terra).lineBetween(x - 26, y - 140, x + 26, y - 140);
    this.sackCount = label(this, x, y - 66, '', 42, HEX.navy, 900);
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

  // ---------- piles ----------
  private makeTrays(d: number, ghosts = false) {
    const step = TABLE.w / d;
    for (let i = 0; i < d; i++) {
      const x = TABLE.x + step * (i + 0.5), w = Math.min(170, step - 18);
      const zone = this.add.zone(x, TABLE.y, w, 200).setInteractive({ useHandCursor: true });
      const t: Tray = { x, w, g: this.add.graphics(), zone, coins: [], selected: false };
      zone.on('pointerup', () => this.tapTray(t));
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

  /** The tray with the fewest coins: where the next coin goes when dealing in turn. */
  private nextTray() {
    return this.trays.reduce((a, t) => (t.coins.length < a.coins.length ? t : a));
  }

  private pointNext() {
    if ((this.level.guide || this.assist) && this.phase === 'deal' && this.chest.length) {
      const t = this.nextTray();
      this.guide.point(t.x, TABLE.y - 112, 'top');
    } else this.guide.hideArrow();
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    // Nothing from the previous round may still land on the table.
    this.time.removeAllEvents();
    this.tweens.killTweensOf([...this.chest, ...this.flying, ...this.trays.flatMap(t => t.coins)]);
    this.triesOnRound = 0;
    this.assist = false;
    this.clearTable();
    this.setMood('normal');
    this.clearBubbles();
    this.next.setVisible(false);
    this.sackTag?.destroy();
    this.sackTag = nameTag(this, SACK.x, SACK.y - 210, CREW[this.r.who].name);
    this.given = 0;
    this.sackCount.setText('');

    const r = this.r, ask = pierAsk(r);
    const b = new Bubble(this, 660, 330, 700, 250, { x: CAPTAIN.x + 70 - 660, y: CAPTAIN.y - this.captain.displayHeight + 60 - 330 });
    b.add(wrapLabel(this, 0, -58, ask, 640, r.kind === 'deal' ? 36 : 30, 800));
    b.add(new FractionView(this, 0, 64, r.frac.n, r.frac.d, 42));
    b.pop();
    this.bubbles.push(b);
    speak(ask);

    if (r.kind === 'deal') {
      this.fillChest(r.total);
      this.chestLabel.setText(coinsWord(r.total));
      this.makeTrays(r.frac.d);
      this.phase = 'deal';
      this.guide.say(this.level.guide ? 'Нажимай на кучки по очереди: по одной монете в каждую.' : 'Разложи монеты поровну: нажимай на кучки.');
      this.pointNext();
    } else {
      if (r.kind === 'count') {
        this.fillChest(r.total);
        this.chestLabel.setText(coinsWord(r.total));
      } else {
        this.chestLabel.setText('? монет');
        this.makeTrays(r.frac.d, true);
        // The one pile we know about.
        const t = this.trays[0];
        this.setGhost(t, false);
        for (let i = 0; i < r.part; i++) {
          const p = this.traySlot(t, i);
          t.coins.push(this.coin(p.x, p.y));
        }
      }
      this.phase = 'answer';
      this.guide.say('Посчитай в уме и выбери ответ.');
      const opts = Phaser.Utils.Array.Shuffle([...r.options]);
      opts.forEach((v, i) => {
        const btn = new Button(this, TABLE.x + TABLE.w / 2 + (i - 1) * 250, BTN_Y, String(v), () => this.pickNumber(v, btn), { w: 220, h: 96, size: 44 });
        this.buttons.push(btn);
      });
    }
  }

  private clearTable() {
    for (const c of [...this.chest, ...this.flying, ...this.trays.flatMap(t => t.coins)]) c.destroy();
    for (const t of this.trays) { t.g.destroy(); t.zone.destroy(); t.ghost?.destroy(); }
    this.chest = [];
    this.flying = [];
    this.trays = [];
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    this.wrong.clear();
    this.give.setVisible(false);
    this.guide.hideArrow();
  }

  private tapTray(t: Tray) {
    if (this.phase === 'deal') {
      if (!this.chest.length) return;
      if (t.coins.length >= PILE_MAX) {
        this.tweens.add({ targets: t.g, x: 8, duration: 50, yoyo: true, repeat: 3, onComplete: () => t.g.setX(0) });
        return;
      }
      sfx('click');
      this.putInTray(t, this.chest.pop()!);
      if (this.chest.length) this.pointNext();
      else {
        this.phase = 'busy';
        this.guide.hideArrow();
        this.time.delayedCall(450, () => this.checkDeal());
      }
    } else if (this.phase === 'pick') {
      sfx('click');
      t.selected = !t.selected;
      this.drawTray(t);
      this.give.setEnabled(this.trays.some(x => x.selected));
    }
  }

  private checkDeal() {
    const sizes = this.trays.map(t => t.coins.length);
    if (sizes.every(s => s === sizes[0])) {
      this.phase = 'pick';
      sfx('good');
      this.guide.say(this.level.guide ? pierPickHint(this.r) : `По ${sizes[0]} в каждой кучке! Выбери, сколько кучек отдать, и нажми «Отдать».`);
      this.give.setVisible(true).setEnabled(false);
      return;
    }
    this.mistake(PIER_LINES.unevenHint, [PIER_LINES.uneven, PIER_LINES.unevenHint]);
    this.parrotSays(PIER_LINES.uneven);
    this.assist = true;
    this.time.delayedCall(1800, () => {
      // Everything back into the chest, deal again.
      const all = this.trays.flatMap(t => t.coins.splice(0));
      all.forEach((c, i) => {
        const p = this.chestSlot(i);
        this.chest.push(c);
        this.fly(c, p, 320);
      });
      this.phase = 'deal';
      this.pointNext();
    });
  }

  private giveAway() {
    if (this.phase !== 'pick') return;
    const picked = this.trays.filter(t => t.selected);
    const need = this.r.frac.n;
    if (picked.length === need) {
      this.phase = 'busy';
      this.give.setVisible(false);
      this.toSack(picked, () => this.success());
      return;
    }
    const few = picked.length < need;
    this.mistake(pierPickHint(this.r), [few ? PIER_LINES.few : PIER_LINES.many]);
    if (few) this.captainSays(PIER_LINES.few); else this.parrotSays(PIER_LINES.many);
    for (const t of this.trays) { t.selected = false; this.drawTray(t); }
    this.give.setEnabled(false);
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
        this.sackCount.setText(`+${this.given}`);
      }));
    });
    this.time.delayedCall(coins.length * 70 + 500, done);
  }

  /** Count rounds: deal the chest out in turn so the answer is visible, then pick the piles. */
  private dealOut(done: () => void) {
    const r = this.r;
    this.makeTrays(r.frac.d);
    const coins = this.chest.splice(0).reverse();
    coins.forEach((c, i) => this.time.delayedCall(i * 110, () => this.putInTray(this.trays[i % r.frac.d], c, 220)));
    this.time.delayedCall(coins.length * 110 + 350, () => {
      for (const t of this.trays.slice(0, r.frac.n)) { t.selected = true; this.drawTray(t); }
      done();
    });
  }

  /** Whole rounds: fill the imagined piles, each like the known one. */
  private fillGhosts(done: () => void) {
    const r = this.r;
    const pile = pierNumbers(r).pile;
    this.trays.slice(1).forEach((t, k) => {
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
    this.time.delayedCall((r.frac.d - 1) * 350 + 500, done);
  }

  private pickNumber(v: number, btn: Button) {
    if (this.phase !== 'answer') return;
    this.phase = 'busy';
    this.buttons.forEach(b => b.setEnabled(false));
    const r = this.r;
    const right = v === pierNumbers(r).answer;
    const show = (done: () => void) => (r.kind === 'whole' ? this.fillGhosts(done) : this.dealOut(done));
    show(() => {
      if (right) {
        if (r.kind === 'whole') {
          this.chestLabel.setText(coinsWord(pierNumbers(r).total));
          this.success();
        } else this.toSack(this.trays.filter(t => t.selected), () => this.success());
        return;
      }
      this.mistake(pierExplain(r), [pierExplain(r, true)]);
      this.time.delayedCall(3800, () => {
        // Put everything back and let the child answer again.
        if (r.kind === 'whole') this.trays.slice(1).forEach(t => { t.coins.splice(0).forEach(c => c.destroy()); this.setGhost(t, true); });
        else {
          const all = this.trays.flatMap(t => t.coins.splice(0));
          for (const t of this.trays) { t.g.destroy(); t.zone.destroy(); }
          this.trays = [];
          all.forEach((c, i) => { this.chest.push(c); this.fly(c, this.chestSlot(i), 300); });
        }
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
