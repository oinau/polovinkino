import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { GNOME_LEVELS, type Dispute, type GnomeLevel } from '../levels';
import type { Mood } from '../art';
import { capitalize, compare, str, words, type Frac } from '../fractions';
import { sfx, speak } from '../audio';
import { store } from '../store';
import { Bubble, Button, FractionView, Guide, coinsBurst, label, modal, resultModal, starsFor, steam, topBar, wrapLabel } from '../ui';

type Who = 'usach' | 'ochkarik';

const GNOME: Record<Who, { x: number; name: string; gen: string; hat: number }> = {
  usach: { x: 380, name: 'Усач', gen: 'Усача', hat: C.terra },
  ochkarik: { x: 1540, name: 'Очкарик', gen: 'Очкарика', hat: C.olive },
};
const FEET = 935;
const BAR = { x: 700, w: 560, h: 110 };
const BAR_Y: Record<Who, number> = { usach: 560, ochkarik: 720 };

export class Gnomes extends Phaser.Scene {
  private levelIndex = 0;
  private level!: GnomeLevel;
  private round = 0;
  private mistakes = 0;
  private coins = 0;
  private dispute!: Dispute;

  private guide!: Guide;
  private gnomes!: Record<Who, Phaser.GameObjects.Image>;
  private bubbles: Bubble[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private napkins: Phaser.GameObjects.Container[] = [];
  private marks!: Phaser.GameObjects.Graphics;
  private answers: Button[] = [];
  private next!: Button;
  private dots!: Phaser.GameObjects.Graphics;
  private pieLabels: FractionView[] = [];

  constructor() { super('Gnomes'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = GNOME_LEVELS[this.levelIndex];
    this.round = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.bubbles = [];
    this.napkins = [];
    this.answers = [];
    this.pieLabels = [];
  }

  create() {
    this.drawGround();
    topBar(this, `Спор ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.gnomes = {
      usach: this.add.image(GNOME.usach.x, FEET, 'usach-normal').setOrigin(0.5, 1),
      ochkarik: this.add.image(GNOME.ochkarik.x, FEET, 'ochkarik-normal').setOrigin(0.5, 1).setFlipX(true),
    };
    for (const g of Object.values(this.gnomes)) {
      this.tweens.add({ targets: g, scaleY: 1.03, duration: 800 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    // Pie trays: one row per gnome, aligned on the left so lengths compare at a glance.
    const trays = this.add.graphics();
    for (const who of ['usach', 'ochkarik'] as Who[]) {
      const y = BAR_Y[who];
      trays.fillStyle(C.navy).fillRoundedRect(BAR.x - 20, y - BAR.h / 2 - 12, BAR.w + 40, BAR.h + 34, 18);
      trays.fillStyle(C.mustardDark).fillRoundedRect(BAR.x - 20, y - BAR.h / 2 - 18, BAR.w + 40, BAR.h + 34, 18);
      trays.lineStyle(5, C.navy).strokeRoundedRect(BAR.x - 20, y - BAR.h / 2 - 18, BAR.w + 40, BAR.h + 34, 18);
      // hat badge
      const hx = BAR.x - 70;
      trays.fillStyle(GNOME[who].hat).fillTriangle(hx - 26, y + 22, hx, y - 34, hx + 26, y + 22);
      trays.lineStyle(4, C.navy).strokeTriangle(hx - 26, y + 22, hx, y - 34, hx + 26, y + 22);
    }
    this.bars = this.add.graphics();
    this.marks = this.add.graphics();

    this.guide = new Guide(this, 150);

    const btn = (who: Who | 'equal', x: number, text: string, fill: number, color: string) =>
      new Button(this, x, 1000, text, () => this.answer(who), { w: 440, h: 96, size: 36, fill, color });
    this.answers = [
      btn('usach', GNOME.usach.x + 40, 'Больше у Усача', C.terra, HEX.paper),
      btn('equal', W / 2, 'Поровну!', C.mustard, HEX.navy),
      btn('ochkarik', GNOME.ochkarik.x - 40, 'Больше у Очкарика', C.olive, HEX.paper),
    ];
    this.next = new Button(this, W / 2, 1000, 'Дальше →', () => this.nextRound(), { w: 360, h: 96, fill: C.olive, color: HEX.paper });
    this.next.setVisible(false);

    this.showIntro();
  }

  private drawGround() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.oliveLight).fillEllipse(300, 900, 1200, 420).fillEllipse(1650, 910, 1200, 440);
    g.fillStyle(C.olive).fillRect(0, 900, W, H - 900);
    g.lineStyle(5, C.navy).lineBetween(0, 900, W, 900);
  }

  private drawDots() {
    const g = this.dots.clear();
    this.level.rounds.forEach((_, i) => {
      const x = 150 + i * 46, y = 66;
      g.fillStyle(i < this.round ? C.olive : C.paper).fillCircle(x, y, 15);
      g.lineStyle(4, C.navy).strokeCircle(x, y, 15);
    });
  }

  private showIntro() {
    const layer = modal(this, 1100, 480);
    layer.add(label(this, W / 2, H / 2 - 150, `Спор ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 900, 38, 700));
    layer.add(new Button(this, W / 2, H / 2 + 150, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  private startRound() {
    this.dispute = this.level.rounds[this.round];
    const { usach, ochkarik } = this.dispute;
    this.setMood('usach', 'normal');
    this.setMood('ochkarik', 'normal');
    this.marks.clear();
    this.drawBars();
    this.napkins.forEach(n => n.destroy());
    this.napkins = [];
    if (!this.level.showPies) this.napkins = (['usach', 'ochkarik'] as Who[]).map(w => this.napkin(BAR_Y[w]));

    this.answers.forEach(b => b.setVisible(true).setEnabled(false));
    this.next.setVisible(false);
    this.guide.say('');

    const line1 = `У меня ${words(usach)} пирога!`;
    const trap = usach.n === 1 && ochkarik.n === 1 && ochkarik.d > usach.d;
    const line2 = trap
      ? `А у меня ${words(ochkarik)}! ${ochkarik.d} больше, чем ${usach.d}, значит, мне больше!`
      : `А у меня ${words(ochkarik)}! Мне больше!`;
    this.clearBubbles();
    this.bubbleFor('usach', line1, usach);
    this.time.delayedCall(700, () => {
      this.bubbleFor('ochkarik', line2, ochkarik);
      this.answers.forEach(b => b.setEnabled(true));
      this.guide.say('Ты судья! У кого больше пирога?');
    });
    speak(`${line1} ${line2}`);
  }

  private bubbleFor(who: Who, text: string, frac?: Frac) {
    const x = who === 'usach' ? 520 : 1400;
    const g = this.gnomes[who];
    const tail = { x: GNOME[who].x - x + (who === 'usach' ? 40 : -40), y: FEET - g.displayHeight - 330 + 10 };
    const b = new Bubble(this, x, 330, 560, 250, tail);
    if (frac) {
      b.add(wrapLabel(this, 0, -62, text, 500, 30, 800));
      b.add(new FractionView(this, 0, 60, frac.n, frac.d, 44));
    } else {
      b.add(wrapLabel(this, 0, 0, text, 500, 36, 900));
    }
    b.pop();
    this.bubbles.push(b);
  }

  private clearBubbles() {
    this.bubbles.forEach(b => b.destroy());
    this.bubbles = [];
  }

  private drawBars() {
    const g = this.bars.clear();
    for (const who of ['usach', 'ochkarik'] as Who[]) {
      const f = this.dispute[who];
      const y = BAR_Y[who] - BAR.h / 2;
      const pw = BAR.w / f.d;
      for (let i = 0; i < f.d; i++) {
        const x = BAR.x + i * pw;
        if (i < f.n) {
          g.fillStyle(C.cheese).fillRect(x, y, pw, BAR.h);
          g.fillStyle(C.terra).fillRect(x, y + BAR.h * 0.42, pw, BAR.h * 0.16);
        } else {
          g.fillStyle(C.wall).fillRect(x, y, pw, BAR.h);
        }
        g.lineStyle(5, C.navy).strokeRect(x, y, pw, BAR.h);
      }
    }
  }

  private napkin(y: number) {
    const c = this.add.container(BAR.x + BAR.w / 2, y);
    const g = this.add.graphics();
    g.fillStyle(C.paper).fillRoundedRect(-BAR.w / 2 - 14, -BAR.h / 2 - 12, BAR.w + 28, BAR.h + 24, 14);
    g.lineStyle(5, C.navy).strokeRoundedRect(-BAR.w / 2 - 14, -BAR.h / 2 - 12, BAR.w + 28, BAR.h + 24, 14);
    g.lineStyle(4, C.terra, 0.6);
    for (let x = -BAR.w / 2 + 20; x < BAR.w / 2; x += 60) g.lineBetween(x, -BAR.h / 2 - 4, x, BAR.h / 2 + 4);
    c.add([g, label(this, 0, 0, '?', 72, HEX.navy, 900)]);
    return c;
  }

  private answer(pick: Who | 'equal') {
    this.answers.forEach(b => b.setEnabled(false));
    const { usach, ochkarik } = this.dispute;
    const cmp = compare(usach, ochkarik);
    const truth: Who | 'equal' = cmp > 0 ? 'usach' : cmp < 0 ? 'ochkarik' : 'equal';
    const reveal = this.napkins.length > 0;
    this.napkins.forEach((n, i) => this.tweens.add({ targets: n, y: n.y - 60, alpha: 0, duration: 450, delay: i * 150 }));
    this.time.delayedCall(reveal ? 650 : 100, () => this.verdict(pick === truth, truth));
  }

  private verdict(right: boolean, truth: Who | 'equal') {
    const { usach, ochkarik } = this.dispute;
    this.markDifference(truth);
    const why = this.explain(truth);
    const whySpoken = this.explain(truth, true);
    this.clearBubbles();
    if (right) {
      sfx('good');
      this.coins += 2;
      this.setMood('usach', 'happy');
      this.setMood('ochkarik', 'happy');
      coinsBurst(this, W / 2, 420, 2);
      if (truth === 'equal') {
        this.bubbleFor('usach', 'Так у нас поровну!');
        this.bubbleFor('ochkarik', 'Мир, дружба, пирог!');
      } else {
        const loser: Who = truth === 'usach' ? 'ochkarik' : 'usach';
        this.bubbleFor(truth, 'Справедливо!');
        this.bubbleFor(loser, 'Ладно, убедил.');
      }
      this.guide.say(`Верно! ${why}`);
    } else {
      this.mistakes++;
      sfx('bad');
      const wronged: Who[] = truth === 'equal' ? ['usach', 'ochkarik'] : [truth];
      if (truth !== 'equal') this.bubbleFor(truth === 'usach' ? 'ochkarik' : 'usach', 'Ой… кажется, я ошибся.');
      for (const w of wronged) {
        this.setMood(w, 'angry');
        const g = this.gnomes[w];
        steam(this, [{ x: g.x - 50, y: FEET - g.displayHeight + 40 }, { x: g.x + 50, y: FEET - g.displayHeight + 50 }]);
        this.tweens.add({ targets: g, scale: 1.12, duration: 220, yoyo: true, repeat: 2 });
        this.bubbleFor(w, truth === 'equal' ? 'Нечестно! У нас же поровну!' : 'Нечестно! У меня же больше!');
      }
      this.guide.say(why);
    }
    speak(right ? `Верно! ${whySpoken}` : whySpoken);
    // Fraction labels on the pies so the numbers stay connected to the picture.
    for (const who of ['usach', 'ochkarik'] as Who[]) {
      const f = who === 'usach' ? usach : ochkarik;
      this.pieLabels.push(new FractionView(this, BAR.x + BAR.w + 90, BAR_Y[who], f.n, f.d, 40));
    }
    this.answers.forEach(b => b.setVisible(false));
    this.next.setVisible(true);
  }

  /** Written with digits for the screen; spoken in words, since TTS reads «3/4» as «три четыре». */
  private explain(truth: Who | 'equal', spoken = false) {
    const { usach, ochkarik } = this.dispute;
    const nom = (f: Frac) => (spoken ? words(f) : str(f));
    const gen = (f: Frac) => (spoken ? words(f, 'gen') : str(f));
    if (truth === 'equal') return `${capitalize(nom(usach))} и ${nom(ochkarik)} — это поровну. Полоски одной длины!`;
    const big = this.dispute[truth];
    const small = truth === 'usach' ? ochkarik : usach;
    const name = GNOME[truth].gen;
    if (big.d === small.d) return `Кусочки одинаковые, а у ${name} их больше: ${nom(big)} больше ${gen(small)}.`;
    if (big.n === 1 && small.n === 1) {
      return `Чем на больше частей делим, тем меньше кусочек. ${capitalize(nom(small))} меньше ${gen(big)}.`;
    }
    return `Посмотри на полоски: у ${name} длиннее. ${capitalize(nom(big))} больше ${gen(small)}.`;
  }

  /** Outline where the longer pie sticks out past the shorter one, or a line showing equal length. */
  private markDifference(truth: Who | 'equal') {
    const g = this.marks.clear();
    const { usach, ochkarik } = this.dispute;
    const lenU = (BAR.w * usach.n) / usach.d, lenO = (BAR.w * ochkarik.n) / ochkarik.d;
    if (truth === 'equal') {
      const x = BAR.x + lenU;
      g.lineStyle(8, C.olive);
      for (let y = BAR_Y.usach - 80; y < BAR_Y.ochkarik + 80; y += 28) g.lineBetween(x, y, x, y + 16);
      return;
    }
    const y = BAR_Y[truth];
    const from = BAR.x + Math.min(lenU, lenO), to = BAR.x + Math.max(lenU, lenO);
    g.lineStyle(10, C.olive).strokeRoundedRect(from, y - BAR.h / 2 - 6, to - from, BAR.h + 12, 8);
    this.tweens.add({ targets: g, alpha: 0.3, duration: 500, yoyo: true, repeat: 3, onComplete: () => g.setAlpha(1) });
  }

  private nextRound() {
    this.pieLabels.forEach(l => l.destroy());
    this.pieLabels = [];
    this.round++;
    this.drawDots();
    if (this.round < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.next.setVisible(false);
    this.guide.say('');
    this.clearBubbles();
    const stars = starsFor(this.mistakes);
    store.setStars('gnomes', this.levelIndex, stars);
    store.addCoins(this.coins);
    const notes = ['', 'Споры разобраны! Попробуй ещё раз без ошибок.', 'Хороший судья! Почти без ошибок.', 'Самый справедливый судья в Половинкино!'];
    const hasNext = this.levelIndex + 1 < GNOME_LEVELS.length;
    resultModal(this, {
      title: 'Все споры решены!',
      stars,
      coins: this.coins,
      note: notes[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(notes[stars]);
  }

  private setMood(who: Who, m: Mood) {
    this.gnomes[who].setTexture(`${who}-${m}`);
  }
}
