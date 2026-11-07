import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { PIZZA_LEVELS, type Order, type PizzaLevel } from '../levels';
import { type CustomerId, type Mood } from '../art';
import { capitalize, sameValue, simplify, str, words, type Frac } from '../fractions';
import { sfx, speak, stopSpeaking } from '../audio';
import { store } from '../store';
import {
  Bubble, Button, FractionView, Guide, coinsBurst, iconButton, label, modal, resultModal, starsFor, steam, topBar, wrapLabel,
} from '../ui';

const PIZZA = { x: 760, y: 676, r: 200 };
const CUST = { x: 1560, y: 1000 };
const COUNTER_TOP = 690;
const GIVE = { x: 1110, y: 1000 };

type Reaction = 'happy' | 'little' | 'much' | 'leave';

interface Lines extends Record<Reaction, string> {
  order: (w: string) => string;
  /** Second head's remarks: shown in a small bubble, never read aloud. */
  side?: Record<Reaction, string> & { order: string[] };
}

const LINES: Record<CustomerId, Lines> = {
  ekibas: {
    order: w => `Мне ${w} пиццы!`,
    happy: 'Вот это сервис! Обе головы довольны.',
    little: 'Маловато! Голов-то у меня две.',
    much: 'Многовато! Одна голова на диете!',
    leave: 'Всё, уходим! Обе головы обиделись.',
    side: {
      order: [
        'А мне ничего. Я на диете. Наверное.',
        'А мне только корочку. Я на диете.',
        'Мне не надо! …Ну, может, кусочек.',
        '«Екібас» по-казахски — «две головы»!',
      ],
      happy: 'Ладно, диета с понедельника!',
      little: 'Я же говорил: надо было и мне заказать.',
      much: 'Столько? Я же на диете!',
      leave: 'Ну и ладно. Я всё равно на диете.',
    },
  },
  osya: {
    order: w => `${capitalize(w)} пиццы, пожалуйста! Щупальца уже урчат.`,
    happy: 'Ура! Все восемь щупалец довольны!',
    little: 'Ой, маловато…',
    much: 'Ой, столько я не съем!',
    leave: 'Пойду лучше рыбку поймаю…',
  },
  tikhon: {
    order: () => '',
    happy: 'СПАСИБО!',
    little: 'МАЛО!',
    much: 'МНОГО!',
    leave: 'УХОЖУ.',
  },
  borovik: {
    order: w => `Дружок, отрежь-ка мне ${w} пиццы.`,
    happy: 'Вот уважил старика!',
    little: 'Эх, маловато будет.',
    much: 'Куда мне столько, дружок?',
    leave: 'Пойду-ка я домой, вздремну…',
  },
};

const pieces = (k: number) => {
  const m10 = k % 10, m100 = k % 100;
  if (m10 === 1 && m100 !== 11) return `${k} кусочек`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${k} кусочка`;
  return `${k} кусочков`;
};

/** «на 3 части», «на 6 частей» */
const intoParts = (n: number) => `${n} ${n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'части' : 'частей'}`;

/** A pizza on a board that can be cut into equal slices and picked slice by slice. */
class PizzaView {
  root: Phaser.GameObjects.Container;
  n = 0;
  sel = new Set<number>();
  private slices: { c: Phaser.GameObjects.Container; hl: Phaser.GameObjects.Graphics; mid: number }[] = [];
  private scene: Phaser.Scene;
  private hlTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const board = scene.add.graphics();
    board.fillStyle(C.navy).fillCircle(PIZZA.x, PIZZA.y + 8, PIZZA.r + 28);
    board.fillStyle(C.mustardDark).fillCircle(PIZZA.x, PIZZA.y, PIZZA.r + 28);
    board.lineStyle(5, C.navy).strokeCircle(PIZZA.x, PIZZA.y, PIZZA.r + 28);
    this.root = scene.add.container(PIZZA.x, PIZZA.y);
  }

  /** n = 0 or 1 draws a whole, uncut pizza. */
  draw(n: number) {
    this.root.removeAll(true);
    this.slices = [];
    this.sel.clear();
    this.n = n;
    const parts = Math.max(1, n);
    const step = (Math.PI * 2) / parts;
    const r = PIZZA.r;
    for (let i = 0; i < parts; i++) {
      const a0 = -Math.PI / 2 + i * step, a1 = a0 + step, mid = (a0 + a1) / 2;
      const c = this.scene.add.container(0, 0);
      const g = this.scene.add.graphics();
      g.fillStyle(C.cheese);
      if (parts === 1) g.fillCircle(0, 0, r); else { g.slice(0, 0, r, a0, a1, false); g.fillPath(); }
      g.lineStyle(24, C.mustard);
      g.beginPath(); g.arc(0, 0, r - 12, a0, a1, false); g.strokePath();
      const count = Math.max(1, Math.round(12 / parts));
      const perRow = Math.ceil(count / 2);
      for (let p = 0; p < count; p++) {
        const row = p % 2, col = Math.floor(p / 2);
        const a = a0 + (step * (col + 0.5)) / perRow;
        const pr = row ? r * 0.32 : r * 0.64;
        g.fillStyle(C.terra).fillCircle(pr * Math.cos(a), pr * Math.sin(a), 18);
        g.lineStyle(3, C.navy).strokeCircle(pr * Math.cos(a), pr * Math.sin(a), 18);
      }
      g.lineStyle(5, C.navy);
      if (parts === 1) g.strokeCircle(0, 0, r); else { g.slice(0, 0, r, a0, a1, false); g.strokePath(); }
      const hl = this.scene.add.graphics().setVisible(false);
      hl.fillStyle(C.olive, 0.45);
      hl.lineStyle(14, C.olive);
      if (parts === 1) hl.fillCircle(0, 0, r).strokeCircle(0, 0, r);
      else { hl.slice(0, 0, r, a0, a1, false); hl.fillPath(); hl.slice(0, 0, r, a0, a1, false); hl.strokePath(); }
      c.add([g, hl]);
      this.root.add(c);
      this.slices.push({ c, hl, mid });
    }
  }

  /** Cut animation: knife lines appear one by one, then the slices spread a little. */
  cut(n: number, done: () => void) {
    this.draw(0);
    const lines = this.scene.add.graphics();
    this.root.add(lines);
    let i = 0;
    this.scene.time.addEvent({
      delay: 110, repeat: n - 1,
      callback: () => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
        lines.lineStyle(6, C.navy).lineBetween(0, 0, PIZZA.r * Math.cos(a), PIZZA.r * Math.sin(a));
        sfx('chop');
        if (++i === n) {
          this.scene.time.delayedCall(160, () => {
            this.draw(n);
            this.slices.forEach(s => {
              this.scene.tweens.add({
                targets: s.c, x: 8 * Math.cos(s.mid), y: 8 * Math.sin(s.mid), duration: 120, yoyo: true,
              });
            });
            done();
          });
        }
      },
    });
  }

  indexAt(x: number, y: number) {
    const dx = x - PIZZA.x, dy = y - PIZZA.y;
    if (dx * dx + dy * dy > (PIZZA.r + 30) ** 2 || this.n < 1) return -1;
    const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 4) % (Math.PI * 2);
    return Math.floor(a / ((Math.PI * 2) / this.n));
  }

  toggle(i: number) {
    const s = this.slices[i];
    const on = !this.sel.has(i);
    if (on) this.sel.add(i); else this.sel.delete(i);
    this.scene.tweens.add({
      targets: s.c, x: on ? 26 * Math.cos(s.mid) : 0, y: on ? 26 * Math.sin(s.mid) : 0, duration: 140, ease: 'Back.Out',
    });
    sfx(on ? 'pick' : 'unpick');
  }

  clearSelection() {
    for (const i of this.sel) this.scene.tweens.add({ targets: this.slices[i].c, x: 0, y: 0, duration: 140 });
    this.sel.clear();
  }

  hint(count: number) {
    this.hideHint();
    this.slices.forEach((s, i) => s.hl.setVisible(i < count));
    this.hlTween = this.scene.tweens.add({
      targets: this.slices.slice(0, count).map(s => s.hl), alpha: 0.35, duration: 600, yoyo: true, repeat: -1,
    });
  }

  hideHint() {
    this.hlTween?.remove();
    this.slices.forEach(s => s.hl.setVisible(false).setAlpha(1));
  }

  /** Selected slices fly to the customer, the rest fade away. */
  serve(to: { x: number; y: number }, done: () => void) {
    this.hideHint();
    this.slices.forEach((s, i) => {
      if (this.sel.has(i)) {
        this.scene.tweens.add({
          targets: s.c, x: to.x - PIZZA.x, y: to.y - PIZZA.y, scale: 0.25, alpha: 0, duration: 650, delay: 80 * i, ease: 'Cubic.In',
        });
      } else {
        this.scene.tweens.add({ targets: s.c, alpha: 0, duration: 400, delay: 300 });
      }
    });
    this.scene.time.delayedCall(900, done);
  }
}

export class Pizzeria extends Phaser.Scene {
  private levelIndex = 0;
  private level!: PizzaLevel;
  private orderIndex = 0;
  private order!: Order;
  private mistakes = 0;
  private triesOnOrder = 0;
  private coins = 0;
  private busy = true;
  private patience = 0;

  private pizza!: PizzaView;
  private guide!: Guide;
  private pyh!: Phaser.GameObjects.Image;
  private customer?: Phaser.GameObjects.Image;
  private bubble?: Bubble;
  private sideBubble?: Bubble;
  private sideOrderLine = '';
  private cutButtons: Button[] = [];
  private give!: Button;
  private took!: FractionView;
  private dots!: Phaser.GameObjects.Graphics;
  private patienceBar?: Phaser.GameObjects.Graphics;

  constructor() { super('Pizzeria'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = PIZZA_LEVELS[this.levelIndex];
    this.orderIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.busy = true;
    this.cutButtons = [];
    this.customer = undefined;
    this.bubble = undefined;
    this.sideBubble = undefined;
    this.patienceBar = undefined;
  }

  create() {
    this.drawRoom();
    this.pyh = this.add.image(300, 722, 'pyh-normal').setOrigin(0.5, 1);
    this.tweens.add({ targets: this.pyh, y: 716, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.drawCounter();
    this.pizza = new PizzaView(this);
    this.pizza.draw(0);

    topBar(this, `Смена ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();
    if (this.level.patience) {
      label(this, 1330, 66, 'терпение', 28, HEX.navy, 800);
      this.patienceBar = this.add.graphics();
    }

    this.guide = new Guide(this, 150);
    this.buildControls();

    const hit = this.add.circle(PIZZA.x, PIZZA.y, PIZZA.r + 30).setInteractive({ useHandCursor: true });
    hit.on('pointerup', (p: Phaser.Input.Pointer) => this.tapPizza(p.worldX, p.worldY));

    this.showIntro();
  }

  update(_t: number, dt: number) {
    if (!this.level.patience || !this.patienceBar) return;
    if (!this.busy && this.customer) {
      this.patience = Math.max(0, this.patience - dt / 1000);
      if (this.patience === 0) this.customerGivesUp();
    }
    this.drawPatience();
  }

  // ---------- scenery ----------
  private drawRoom() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.wall).fillRect(0, 560, W, 450);
    g.fillStyle(C.floor).fillRect(0, 1010, W, 70);
    g.lineStyle(5, C.navy).lineBetween(0, 1010, W, 1010);
    g.lineStyle(3, C.navy, 0.25).lineBetween(0, 560, W, 560);
  }

  private drawCounter() {
    const g = this.add.graphics();
    g.fillStyle(C.sand).fillRect(-10, COUNTER_TOP, 1270, 44);
    g.lineStyle(5, C.navy).strokeRect(-10, COUNTER_TOP, 1270, 44);
    g.fillStyle(C.terra).fillRect(-10, COUNTER_TOP + 44, 1260, H);
    g.lineStyle(5, C.navy).strokeRect(-10, COUNTER_TOP + 44, 1260, H);
    g.fillStyle(C.olive).fillRect(-8, COUNTER_TOP + 70, 1253, 16);
  }

  private drawDots() {
    const g = this.dots.clear();
    this.level.orders.forEach((_, i) => {
      const x = 150 + i * 46, y = 66;
      g.fillStyle(i < this.orderIndex ? C.olive : C.paper).fillCircle(x, y, 15);
      g.lineStyle(4, C.navy).strokeCircle(x, y, 15);
    });
  }

  private drawPatience() {
    const g = this.patienceBar!.clear();
    const x = 1410, y = 52, w = 360, h = 30;
    const p = this.level.patience ? this.patience / this.level.patience : 1;
    g.fillStyle(C.paper).fillRoundedRect(x, y, w, h, 15);
    if (p > 0.02) {
      g.fillStyle(p > 0.5 ? C.olive : p > 0.25 ? C.mustard : C.terra).fillRoundedRect(x, y, Math.max(30, w * p), h, 15);
    }
    g.lineStyle(5, C.navy).strokeRoundedRect(x, y, w, h, 15);
  }

  private buildControls() {
    const cuts = this.level.cuts;
    if (cuts.length) {
      label(this, 320, 830, 'Разрезать на:', 36, HEX.paper, 900);
      cuts.forEach((n, i) => {
        const b = new Button(this, 125 + i * 130, 930, String(n), () => this.chooseCut(n), { w: 110, h: 100, size: 52 });
        b.setData('n', n);
        this.cutButtons.push(b);
      });
    }
    label(this, GIVE.x, 790, 'Взял:', 34, HEX.paper, 900);
    this.took = new FractionView(this, GIVE.x, 872, 0, '?', 50, HEX.paper);
    this.give = new Button(this, GIVE.x, GIVE.y, 'Отдать', () => this.serve(), { w: 250, h: 84, size: 40, fill: C.mustard });
    this.give.setEnabled(false);
  }

  private updateTook() {
    this.took.set(this.pizza.sel.size, this.pizza.n || '?');
    this.give.setEnabled(this.pizza.sel.size > 0 && !this.busy);
  }

  // ---------- flow ----------
  private showIntro() {
    const layer = modal(this, 1100, 520);
    layer.add(label(this, W / 2, H / 2 - 170, `Смена ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 30, this.level.intro, 900, 38, 700));
    if (this.level.patience) {
      layer.add(label(this, W / 2, H / 2 + 75, 'Следи за терпением клиентов!', 32, HEX.terra, 800));
    }
    layer.add(new Button(this, W / 2, H / 2 + 175, 'Начать!', () => {
      layer.destroy();
      this.nextCustomer();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  private nextCustomer() {
    this.order = this.level.orders[this.orderIndex];
    const side = LINES[this.order.who].side;
    this.sideOrderLine = side ? Phaser.Utils.Array.GetRandom(side.order) : '';
    this.triesOnOrder = 0;
    this.patience = this.level.patience ?? 0;
    this.busy = true;
    this.pizza.draw(this.order.preCut ?? 0);
    this.highlightCut();
    this.updateTook();
    this.setPyh('normal');
    this.guide.hideArrow();
    this.guide.say('');

    const c = this.add.image(W + 300, CUST.y, `${this.order.who}-normal`).setOrigin(0.5, 1);
    this.customer = c;
    this.tweens.add({ targets: c, y: CUST.y - 16, duration: 160, yoyo: true, repeat: 4 });
    this.tweens.add({
      targets: c, x: CUST.x, duration: 1000, ease: 'Cubic.Out',
      onComplete: () => {
        this.showOrder();
        this.busy = false;
        this.stepGuide();
      },
    });
  }

  private orderText() {
    return LINES[this.order.who].order(words(this.order.want, 'acc'));
  }

  /** Main speech bubble; narrower when the second head needs room on the right. */
  private mainBubble(h: number) {
    this.bubble?.destroy();
    const side = !!LINES[this.order.who].side;
    const x = side ? 1350 : 1400, w = side ? 540 : 600;
    const b = new Bubble(this, x, 360, w, h, { x: CUST.x - x - 40, y: this.customerTop() - 360 + 10 });
    this.bubble = b;
    return b;
  }

  private sideSay(text?: string) {
    this.sideBubble?.destroy();
    this.sideBubble = undefined;
    if (!text) return;
    // Ekibas's right head sits at about (1650, 530) on screen.
    const b = new Bubble(this, 1790, 410, 230, 170, { x: 1650 - 1790, y: 528 - 410 });
    b.add(wrapLabel(this, 0, 0, text, 200, 24, 800));
    this.sideBubble = b;
    this.time.delayedCall(450, () => { if (this.sideBubble === b) b.pop(); });
    b.setAlpha(0);
  }

  private showOrder() {
    const tikhon = this.order.who === 'tikhon';
    const b = this.mainBubble(290);
    this.sideSay(this.sideOrderLine);
    if (tikhon) {
      b.add(label(this, 0, -95, '(молча показывает табличку)', 28, HEX.navy, 700));
      b.add(new FractionView(this, 0, 30, this.order.want.n, this.order.want.d, 84));
    } else {
      b.add(wrapLabel(this, 0, -75, this.orderText(), 520, 34, 800));
      b.add(new FractionView(this, 0, 62, this.order.want.n, this.order.want.d, 52));
      b.add(iconButton(this, 240, 90, 'replay', () => speak(this.orderText()), 32));
      speak(this.orderText());
    }
    b.pop();
  }

  private react(kind: Reaction) {
    const lines = LINES[this.order.who];
    const b = this.mainBubble(200);
    b.add(wrapLabel(this, 0, 0, lines[kind], b.w - 60, 38, 900));
    b.pop();
    this.sideSay(lines.side?.[kind]);
    if (this.order.who !== 'tikhon') speak(lines[kind]);
  }

  private customerTop() {
    return CUST.y - (this.customer?.displayHeight ?? 400);
  }

  /** Tells the player what to do now and points at it. */
  private stepGuide() {
    if (this.busy) return;
    const showArrow = this.level.guide;
    if (this.pizza.n === 0) {
      this.guide.say('Разрежь пиццу на равные части');
      const target = this.cutButtons[1] ?? this.cutButtons[0];
      if (showArrow && target) this.guide.point(target.x, target.y - 70, 'top'); else this.guide.hideArrow();
    } else if (this.pizza.sel.size === 0) {
      this.guide.say('Нажимай на кусочки, которые отдашь');
      if (showArrow) this.guide.point(PIZZA.x, PIZZA.y - PIZZA.r - 40, 'top'); else this.guide.hideArrow();
    } else {
      this.guide.say('Готово? Нажми «Отдать»');
      if (showArrow) this.guide.point(GIVE.x + 150, GIVE.y, 'right'); else this.guide.hideArrow();
    }
  }

  private highlightCut() {
    this.cutButtons.forEach(b => b.setFill(b.getData('n') === this.pizza.n ? C.mustard : C.paper));
  }

  private chooseCut(n: number) {
    if (this.busy) return;
    this.busy = true;
    this.guide.hideArrow();
    this.pizza.cut(n, () => {
      this.busy = false;
      this.highlightCut();
      this.updateTook();
      this.stepGuide();
    });
  }

  private tapPizza(x: number, y: number) {
    if (this.busy) return;
    if (this.pizza.n === 0) {
      this.guide.say('Сначала разрежь пиццу!');
      return;
    }
    const i = this.pizza.indexAt(x, y);
    if (i < 0) return;
    this.pizza.hideHint();
    this.pizza.toggle(i);
    this.updateTook();
    this.stepGuide();
  }

  private serve() {
    if (this.busy || this.pizza.sel.size === 0) return;
    const gave: Frac = { n: this.pizza.sel.size, d: this.pizza.n };
    const want = this.order.want;
    this.busy = true;
    this.give.setEnabled(false);
    this.guide.hideArrow();
    if (sameValue(gave, want)) this.success(gave); else this.mistake(gave);
  }

  private success(gave: Frac) {
    const want = this.order.want;
    sfx('good');
    this.setMood('happy');
    this.setPyh('happy');
    const earned = this.triesOnOrder === 0 ? 3 : 1;
    this.coins += earned;
    const equivalent = gave.d !== want.d;
    this.guide.say(equivalent
      ? `Верно! ${str(gave)} — это то же самое, что ${str(want)}!`
      : `Верно! ${capitalize(words(want))} — это ${pieces(gave.n)} из ${gave.d}.`);
    this.pizza.serve({ x: CUST.x, y: this.customerTop() + 150 }, () => {
      this.react('happy');
      coinsBurst(this, CUST.x, this.customerTop() + 60, earned);
      this.tweens.add({ targets: this.customer, y: CUST.y - 30, duration: 180, yoyo: true, repeat: 2 });
      this.time.delayedCall(2300, () => this.customerLeaves());
    });
  }

  private mistake(gave: Frac) {
    const want = this.order.want;
    this.mistakes++;
    this.triesOnOrder++;
    sfx('bad');
    this.setMood('angry');
    this.setPyh('worried');
    if (this.level.patience) this.patience = Math.max(3, this.patience - this.level.patience * 0.2);
    const tooMuch = gave.n * want.d > want.n * gave.d;
    this.react(tooMuch ? 'much' : 'little');
    this.shakeCustomer();
    const s = simplify(gave);
    const same = s.n === gave.n ? '' : ` (то же, что ${str(s)})`;
    this.guide.say(`Ты дал ${str(gave)}${same}, а нужно ${str(want)}`);

    this.time.delayedCall(2000, () => {
      this.setMood('normal');
      this.setPyh('normal');
      this.pizza.clearSelection();
      this.showOrder();
      this.busy = false;
      this.updateTook();
      const n = this.pizza.n;
      const s = simplify(want);
      if ((s.n * n) % s.d === 0) {
        const need = (s.n * n) / s.d;
        this.pizza.hint(need);
        this.guide.say(`Пицца на ${intoParts(n)}: ${str(want)} — это ${pieces(need)}`);
        if (this.level.guide) this.guide.point(PIZZA.x, PIZZA.y - PIZZA.r - 40, 'top');
      } else {
        const b = this.cutButtons.find(x => x.getData('n') === want.d)
          ?? this.cutButtons.find(x => x.getData('n') === s.d);
        this.guide.say(`Из ${n} частей ${str(want)} не сложить. Разрежь на ${want.d}!`);
        if (b) this.guide.point(b.x, b.y - 70, 'top');
      }
    });
  }

  private customerGivesUp() {
    this.busy = true;
    this.mistakes++;
    sfx('angry');
    this.setMood('angry');
    this.setPyh('worried');
    this.react('leave');
    this.shakeCustomer();
    this.guide.hideArrow();
    this.guide.say('Клиент не дождался… Ничего, следующий!');
    this.pizza.hideHint();
    this.time.delayedCall(2200, () => this.customerLeaves());
  }

  private customerLeaves() {
    stopSpeaking();
    this.bubble?.destroy();
    this.bubble = undefined;
    this.sideSay();
    const c = this.customer!;
    this.customer = undefined;
    c.setFlipX(true);
    this.tweens.add({ targets: c, x: W + 300, duration: 900, ease: 'Cubic.In', onComplete: () => c.destroy() });
    this.orderIndex++;
    this.drawDots();
    this.time.delayedCall(700, () => {
      if (this.orderIndex < this.level.orders.length) this.nextCustomer(); else this.finish();
    });
  }

  private finish() {
    this.guide.say('');
    this.guide.hideArrow();
    this.pizza.draw(0);
    const stars = starsFor(this.mistakes);
    store.setStars('pizza', this.levelIndex, stars);
    store.addCoins(this.coins);
    this.setPyh('happy');
    const notes = ['', 'Смена пройдена! Попробуй ещё раз без ошибок.', 'Хорошая смена! Почти без ошибок.', 'Идеальная смена! Ни одной ошибки!'];
    const hasNext = this.levelIndex + 1 < PIZZA_LEVELS.length;
    resultModal(this, {
      title: 'Смена окончена!',
      stars,
      coins: this.coins,
      note: notes[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(notes[stars]);
  }

  // ---------- characters ----------
  private setMood(m: Mood) {
    if (!this.customer) return;
    this.customer.setTexture(`${this.order.who}-${m}`);
    if (m === 'angry') {
      const top = this.customerTop();
      steam(this, [{ x: CUST.x - 70, y: top + 30 }, { x: CUST.x + 70, y: top + 20 }]);
    }
  }

  private shakeCustomer() {
    if (!this.customer) return;
    this.tweens.add({ targets: this.customer, x: CUST.x + 10, duration: 50, yoyo: true, repeat: 7, onComplete: () => this.customer?.setX(CUST.x) });
  }

  private setPyh(m: 'normal' | 'happy' | 'worried') {
    this.pyh.setTexture(`pyh-${m}`);
  }
}
