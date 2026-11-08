import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { DOCTOR_LEVELS, HEIGHTS, heightOf, type DoctorLevel, type DoctorRound, type PatientId } from '../levels';
import { sameValue, str, type Frac } from '../fractions';
import { sfx, speak, speakSeq } from '../audio';
import {
  DOCTOR_LINES, DOCTOR_NOTES, HEROES, PATIENTS, doctorExplain, doctorReadAsk, doctorSetAsk, doctorSortAsk, doctorSortExplain, mixed,
} from '../lines';
import { store } from '../store';
import { Bubble, Button, Guide, coinsBurst, label, meetCard, modal, nameTag, resultModal, starsFor, topBar, wrapLabel } from '../ui';

const GROUND = 960;
/** Pixels in one «house»: from the ground to the top of the doctor's flat roof. */
const U = 480;
const HOUSE = { x: 640, w: 440, roof: 44 };
const RULER_X = 882;
const BAR_END = 1150;
const SPOT_X = 1010;
const QUEUE_X = 1270;
const WALL = { from: 1430, to: 1890 };
const DOC_X = 230;
const BTN_Y = 1024;

type Phase = 'busy' | 'set' | 'answer' | 'sort';
type Look = 'normal' | 'happy' | 'angry' | 'surprised';

const yOf = (v: number) => GROUND - v * U;
const value = (h: Frac) => h.n / h.d;

export class Doctor extends Phaser.Scene {
  private levelIndex = 0;
  private level!: DoctorLevel;
  private roundIndex = 0;
  private r!: DoctorRound;
  private mistakes = 0;
  private triesOnRound = 0;
  private coins = 0;
  private phase: Phase = 'busy';

  /** Bar height in chart divisions (1/ticks of a house). */
  private barK = 0;
  private maxK = 0;
  private extended = false;
  private dragging = false;

  private guide!: Guide;
  private dots!: Phaser.GameObjects.Graphics;
  private heron!: Phaser.GameObjects.Image;
  private heronTag!: Phaser.GameObjects.Container;
  private ruler!: Phaser.GameObjects.Graphics;
  private rulerLabels: Phaser.GameObjects.Text[] = [];
  private bar!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private patient?: Phaser.GameObjects.Image;
  private bubbles: Bubble[] = [];
  private buttons: Button[] = [];
  private measure!: Button;
  private next!: Button;
  /** The growth wall: everyone measured on this level, to the same scale. */
  private wall: { who: PatientId; img: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Container }[] = [];
  /** Sorting round: who stands where and who is already tapped. */
  private lineup: { who: PatientId; img: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Container; badge?: Phaser.GameObjects.Container }[] = [];
  private picked: PatientId[] = [];

  constructor() { super('Doctor'); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.level = DOCTOR_LEVELS[this.levelIndex];
    this.roundIndex = 0;
    this.mistakes = 0;
    this.coins = 0;
    this.phase = 'busy';
    this.extended = false;
    this.dragging = false;
    this.bubbles = [];
    this.buttons = [];
    this.rulerLabels = [];
    this.wall = [];
    this.lineup = [];
    this.picked = [];
    this.patient = undefined;
  }

  create() {
    this.drawScenery();
    topBar(this, `Доктор ${this.levelIndex + 1}: ${this.level.name}`, () => this.scene.start('Town'));
    this.dots = this.add.graphics();
    this.drawDots();

    this.heron = this.add.image(DOC_X, GROUND, 'heron-normal').setOrigin(0.5, 1);
    this.heron.setScale(U / this.heron.height);
    this.tweens.add({ targets: this.heron, scaleY: this.heron.scaleY * 1.015, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.heronTag = nameTag(this, DOC_X, GROUND + 50, 'Доктор Цапля');

    this.ruler = this.add.graphics();
    this.marks = this.add.graphics().setDepth(5);
    this.bar = this.add.graphics().setDepth(6);
    this.maxK = this.level.ticks;
    this.drawRuler();
    this.bar.setVisible(this.level.ticks > 0);

    this.guide = new Guide(this, 150);
    this.measure = new Button(this, SPOT_X, BTN_Y, 'Мерить', () => this.doMeasure(), { w: 300, h: 92, fill: C.olive, color: HEX.paper });
    this.measure.setVisible(false);
    this.next = new Button(this, SPOT_X, BTN_Y, 'Дальше →', () => this.nextRound(), { w: 340, h: 92, fill: C.olive, color: HEX.paper });
    this.next.setVisible(false);
    this.setupDrag();

    if (store.met('heron')) this.showIntro();
    else meetCard(this, HEROES.heron, () => { store.meet('heron'); this.showIntro(); });
  }

  // ---------- scenery ----------
  private drawScenery() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.oliveLight).fillEllipse(300, GROUND, 1300, 380).fillEllipse(1600, GROUND, 1200, 420);
    g.fillStyle(C.olive).fillRect(0, GROUND, W, H - GROUND);
    g.lineStyle(5, C.navy).lineBetween(0, GROUND, W, GROUND);
    // The doctor's house has a flat roof, so its top is level with the «1» on the chart.
    const { x, w, roof } = HOUSE, left = x - w / 2, top = yOf(1);
    g.fillStyle(C.wall).fillRect(left, top + roof, w, GROUND - top - roof).lineStyle(5, C.navy).strokeRect(left, top + roof, w, GROUND - top - roof);
    g.fillStyle(C.terra).fillRect(left - 20, top, w + 40, roof).lineStyle(5, C.navy).strokeRect(left - 20, top, w + 40, roof);
    g.fillStyle(C.paper).fillRoundedRect(x - 30, top + 80, 60, 60, 6).lineStyle(4, C.navy).strokeRoundedRect(x - 30, top + 80, 60, 60, 6);
    g.lineStyle(10, C.terra).lineBetween(x, top + 92, x, top + 128).lineBetween(x - 18, top + 110, x + 18, top + 110);
    g.fillStyle(C.sand).fillRoundedRect(left + 40, GROUND - 170, 90, 170, 8).lineStyle(5, C.navy).strokeRoundedRect(left + 40, GROUND - 170, 90, 170, 8);
    g.fillStyle(C.paper).fillRoundedRect(left + 200, GROUND - 240, 110, 90, 6).lineStyle(5, C.navy).strokeRoundedRect(left + 200, GROUND - 240, 110, 90, 6);
    g.lineStyle(4, C.navy).lineBetween(left + 255, GROUND - 240, left + 255, GROUND - 150).lineBetween(left + 200, GROUND - 195, left + 310, GROUND - 195);
  }

  /** The height chart: one house tall, divided into `ticks`; taller after the extension. */
  private drawRuler() {
    const g = this.ruler.clear();
    this.rulerLabels.forEach(t => t.destroy());
    this.rulerLabels = [];
    const ticks = this.level.ticks;
    const top = this.extended ? 1.5 : 1;
    g.fillStyle(C.paper).fillRect(RULER_X - 14, yOf(top), 28, top * U).lineStyle(4, C.navy).strokeRect(RULER_X - 14, yOf(top), 28, top * U);
    if (this.extended) {
      // The added piece is a different colour: «we built the chart higher».
      g.fillStyle(C.cheese).fillRect(RULER_X - 14, yOf(top), 28, (top - 1) * U).lineStyle(4, C.navy).strokeRect(RULER_X - 14, yOf(top), 28, (top - 1) * U);
    }
    const n = ticks ? Math.round(top * ticks) : 1;
    for (let k = 1; k <= n; k++) {
      const v = ticks ? k / ticks : 1, y = yOf(v);
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      g.lineStyle(whole ? 6 : 4, C.navy).lineBetween(RULER_X - 14, y, RULER_X + (whole ? 22 : 10), y);
      const text = whole ? String(Math.round(v)) : `${k}/${ticks}`;
      // A paper patch so the roof line doesn't run through the label.
      this.rulerLabels.push(label(this, RULER_X - 22, y, text, whole ? 34 : 26, HEX.navy, 900).setOrigin(1, 0.5)
        .setBackgroundColor(HEX.paper).setPadding(6, 2, 6, 2));
    }
  }

  private drawBar() {
    const y = yOf(this.barK / this.level.ticks);
    const g = this.bar.clear();
    g.fillStyle(C.navy).fillRect(RULER_X - 16, y - 8, BAR_END - RULER_X + 16, 18);
    g.fillStyle(C.mustardDark).fillRect(RULER_X - 16, y - 11, BAR_END - RULER_X + 16, 18).lineStyle(4, C.navy).strokeRect(RULER_X - 16, y - 11, BAR_END - RULER_X + 16, 18);
    g.fillStyle(C.terra).fillCircle(BAR_END + 18, y - 2, 26).lineStyle(5, C.navy).strokeCircle(BAR_END + 18, y - 2, 26);
    g.lineStyle(4, C.paper).lineBetween(BAR_END + 8, y - 10, BAR_END + 28, y - 10).lineBetween(BAR_END + 8, y + 4, BAR_END + 28, y + 4);
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
    layer.add(label(this, W / 2, H / 2 - 170, `Доктор ${this.levelIndex + 1}: ${this.level.name}`, 54, HEX.navy, 900));
    layer.add(wrapLabel(this, W / 2, H / 2 - 20, this.level.intro, 960, 36, 700));
    layer.add(new Button(this, W / 2, H / 2 + 170, 'Начать!', () => {
      layer.destroy();
      this.startRound();
    }, { w: 320, h: 96, fill: C.olive, color: HEX.paper }));
    speak(this.level.intro);
  }

  // ---------- the bar ----------
  private setupDrag() {
    const toK = (y: number) => Phaser.Math.Clamp(Math.round(((GROUND - y) / U) * this.level.ticks), 0, this.maxK);
    const inColumn = (p: Phaser.Input.Pointer) => p.x > RULER_X - 60 && p.x < BAR_END + 70 && p.y > yOf(this.maxK / this.level.ticks) - 60 && p.y < GROUND + 20;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.phase !== 'set' || !inColumn(p)) return;
      this.dragging = true;
      this.setBar(toK(p.y));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.isDown) this.setBar(toK(p.y));
    });
    this.input.on('pointerup', () => { this.dragging = false; });
  }

  setBar(k: number) {
    if (k === this.barK) return;
    this.barK = k;
    sfx('click');
    this.drawBar();
    this.marks.clear();
    if (this.level.guide) this.guide.hideArrow();
  }

  /** The giraffe does not fit: the chart gets a second piece on top. */
  private extend(done: () => void, animate = true) {
    this.extended = true;
    this.maxK = Math.round(this.level.ticks * 1.5);
    this.drawRuler();
    if (!animate) { done(); return; }
    const parts = [this.ruler, ...this.rulerLabels];
    parts.forEach(o => { o.y -= 300; });
    this.tweens.add({ targets: parts, y: '+=300', duration: 700, ease: 'Bounce.Out', onComplete: () => { sfx('good'); done(); } });
  }

  // ---------- patients ----------
  private texture(who: PatientId, look: Look) {
    if (look === 'surprised' && who !== 'giraffe') look = 'angry';
    if (who === 'pyh' && look === 'angry') return 'pyh-worried';
    return `${who}-${look}`;
  }

  private makePatient(who: PatientId, h: Frac, x: number) {
    const img = this.add.image(x, GROUND, this.texture(who, 'normal')).setOrigin(0.5, 1);
    const s = (value(HEIGHTS[who]) * U) / img.height;
    // A stretched neck: same width, taller.
    img.setScale(s, (value(h) * U) / img.height);
    if (who === 'giraffe') img.setFlipX(true);
    return img;
  }

  private look(img: Phaser.GameObjects.Image | undefined, who: PatientId, look: Look) {
    img?.setTexture(this.texture(who, look));
  }

  private walk(img: Phaser.GameObjects.Image, x: number, done?: () => void, delay = 0) {
    const duration = Math.min(900, 200 + Math.abs(img.x - x) * 1.2);
    this.tweens.add({ targets: img, x, duration, delay, ease: 'Sine.InOut', onComplete: () => done?.() });
    this.tweens.add({ targets: img, y: GROUND - 14, duration: 150, delay, yoyo: true, repeat: Math.max(0, Math.floor(duration / 300) - 1) });
  }

  // ---------- rounds ----------
  private startRound() {
    this.r = this.level.rounds[this.roundIndex];
    this.triesOnRound = 0;
    this.clearRound();
    this.guide.say('');
    const r = this.r;
    if (r.kind === 'sort') { this.startSort(r); return; }

    const h = heightOf(r);
    const stretched = !sameValue(h, HEIGHTS[r.who]);
    const begin = () => {
      if (r.kind === 'set') this.startSet(r.who, h);
      else this.startRead(r.who, h, r.options, stretched);
    };
    const afterExtend = () => (stretched ? this.stretch(r.who, h, begin) : begin());
    this.phase = 'busy';
    this.patient = this.enter(r.who);
    this.walk(this.patient, QUEUE_X, () => {
      if (value(h) > 1 && !this.extended) {
        if (r.kind === 'read' || stretched) this.extend(afterExtend, false);
        else this.giraffeEvent(r.who, afterExtend);
      } else afterExtend();
    });
  }

  /**
   * Where the patient comes from: the doctor steps away from her place herself,
   * someone already on the growth wall walks back from it, everyone else comes from the right.
   */
  private enter(who: PatientId) {
    if (who === 'heron') {
      this.heron.setVisible(false);
      this.heronTag.setVisible(false);
      return this.makePatient(who, HEIGHTS[who], DOC_X);
    }
    const onWall = this.wall.find(w => w.who === who);
    if (!onWall) return this.makePatient(who, HEIGHTS[who], W + 250);
    onWall.tag.destroy();
    this.wall = this.wall.filter(w => w !== onWall);
    this.layoutWall();
    return onWall.img;
  }

  /** The giraffe stretches his neck in front of everyone: taller than usual. */
  private stretch(who: PatientId, h: Frac, done: () => void) {
    const p = this.patient!;
    this.say(1, DOCTOR_LINES.stretch);
    speak(DOCTOR_LINES.stretch);
    this.look(p, who, 'happy');
    this.tweens.add({
      targets: p, scaleY: (value(h) * U) / p.height, duration: 1100, delay: 400, ease: 'Back.Out',
      onComplete: () => this.time.delayedCall(900, () => { this.dropBubble(1); done(); }),
    });
  }

  /** The doctor speaks from wherever she is: her own place, or under the chart when measured herself. */
  private doctorSays(text: string) {
    this.say(this.patient && this.r.kind !== 'sort' && this.r.who === 'heron' ? 1 : 0, text);
  }

  private dropBubble(i: number) {
    this.bubbles[i]?.destroy();
  }

  private giraffeEvent(who: PatientId, done: () => void) {
    const go = () => {
      this.look(this.patient, who, 'surprised');
      this.tweens.add({ targets: this.patient, scaleY: this.patient!.scaleY * 1.06, duration: 160, yoyo: true, repeat: 1 });
      this.say(1, DOCTOR_LINES.giraffeWow);
      this.say(0, DOCTOR_LINES.extend);
      speakSeq([DOCTOR_LINES.giraffeWow, DOCTOR_LINES.extend]);
      this.time.delayedCall(2200, () => this.extend(() => {
        this.look(this.patient, who, 'normal');
        this.clearBubbles();
        done();
      }));
    };
    if (who === 'giraffe' && !store.met('giraffe')) meetCard(this, HEROES.giraffe, () => { store.meet('giraffe'); go(); });
    else go();
  }

  private startSet(who: PatientId, h: Frac) {
    const ask = doctorSetAsk(who, h);
    this.doctorSays(ask);
    speak(ask);
    this.barK = this.maxK;
    this.drawBar();
    this.phase = 'set';
    this.measure.setVisible(true).setEnabled(true);
    this.guide.say('Тяни планку за красную ручку, потом нажми «Мерить».');
    if (this.level.guide) this.guide.point(BAR_END + 18, yOf(this.barK / this.level.ticks) - 30, 'top');
  }

  private startRead(who: PatientId, h: Frac, options: Frac[], stretched = false) {
    const ask = doctorReadAsk(who, stretched);
    this.say(0, ask);
    speak(ask);
    this.walk(this.patient!, SPOT_X, () => {
      // The bar slides down onto the head.
      const target = Math.round(value(h) * this.level.ticks);
      const from = { k: this.maxK };
      this.tweens.add({
        targets: from, k: target, duration: 700, ease: 'Cubic.Out',
        onUpdate: () => { this.barK = Math.round(from.k); this.drawBar(); },
        onComplete: () => {
          this.barK = target;
          this.drawBar();
          this.phase = 'answer';
          this.guide.say('Планка на макушке. Какой рост?');
          Phaser.Utils.Array.Shuffle([...options]).forEach((o, i) => {
            const b = new Button(this, SPOT_X + (i - 1) * 240, BTN_Y, o.n === o.d ? '1' : str(o), () => this.pickHeight(o, b), { w: 210, h: 92, size: 44 });
            this.buttons.push(b);
          });
        },
      });
    });
  }

  private clearRound() {
    this.clearBubbles();
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
    this.measure.setVisible(false);
    this.next.setVisible(false);
    this.marks.clear();
    this.guide.hideArrow();
    this.patient?.destroy();
    this.patient = undefined;
    for (const l of this.lineup) { l.img.destroy(); l.tag.destroy(); l.badge?.destroy(); }
    this.lineup = [];
    this.picked = [];
    this.heron.setVisible(true);
    this.heronTag?.setVisible(true);
  }

  private doMeasure() {
    if (this.phase !== 'set' || this.r.kind !== 'set') return;
    this.phase = 'busy';
    this.measure.setEnabled(false);
    this.guide.hideArrow();
    const r = this.r, h = heightOf(r), p = this.patient!;
    const bar = this.barK / this.level.ticks;
    this.walk(p, SPOT_X, () => {
      if (Math.abs(bar - value(h)) < 1e-9) { this.measured(r.who, h); return; }
      const explain = doctorExplain(h, this.level.ticks), spoken = doctorExplain(h, this.level.ticks, true);
      if (bar < value(h)) {
        // Bonk: squashed under the bar for a moment.
        const sy = p.scaleY;
        this.look(p, r.who, 'angry');
        this.tweens.add({ targets: p, scaleY: sy * Math.max(0.3, bar / value(h)), duration: 140, yoyo: true, hold: 260 });
        this.say(1, DOCTOR_LINES.bonk);
        this.mistake(explain, [DOCTOR_LINES.bonk, spoken]);
      } else {
        // A gap between the head and the bar, marked with a dashed line.
        const g = this.marks.clear();
        g.lineStyle(6, C.terra);
        for (let y = yOf(value(h)); y > yOf(bar) + 6; y -= 22) g.lineBetween(SPOT_X + 90, y, SPOT_X + 90, Math.max(yOf(bar) + 6, y - 12));
        this.doctorSays(DOCTOR_LINES.gap);
        this.mistake(explain, [DOCTOR_LINES.gap, spoken]);
      }
      this.time.delayedCall(2000, () => {
        this.look(p, r.who, 'normal');
        this.walk(p, QUEUE_X, () => {
          this.phase = 'set';
          this.measure.setEnabled(true);
        });
      });
    });
  }

  private pickHeight(o: Frac, b: Button) {
    if (this.phase !== 'answer' || this.r.kind !== 'read') return;
    const r = this.r, h = heightOf(r);
    if (sameValue(o, h)) {
      this.phase = 'busy';
      this.buttons.forEach(x => x.setVisible(false));
      this.measured(r.who, h);
      return;
    }
    b.setEnabled(false);
    this.look(this.patient, r.who, 'angry');
    this.mistake(doctorExplain(h, this.level.ticks), [doctorExplain(h, this.level.ticks, true)]);
    this.time.delayedCall(1600, () => this.look(this.patient, r.who, 'normal'));
  }

  /** Right height: the doctor writes it down and the patient goes to the growth wall. */
  private measured(who: PatientId, h: Frac) {
    const stretched = !sameValue(h, HEIGHTS[who]);
    const same = this.wall.find(w => w.who !== who && sameValue(HEIGHTS[w.who], h));
    const written = value(h) > 1 ? mixed(h) : value(h) === 1 ? '1 домик' : `${str(h)} домика`;
    const name = stretched ? `${PATIENTS[who].name} с вытянутой шеей` : PATIENTS[who].name;
    const screen = `Верно! ${name}: ${written}.${same ? ` ${DOCTOR_LINES.same(same.who)}` : ''}`;
    const spoken = `Верно! ${doctorExplain(h, this.level.ticks, true)}${same ? ` ${DOCTOR_LINES.same(same.who)}` : ''}`;
    this.look(this.patient, who, 'happy');
    this.success(screen, spoken);
    const p = this.patient!;
    this.patient = undefined;
    if (who === 'heron') {
      // The doctor goes back to her place; she is not a patient on the wall.
      this.walk(p, DOC_X, () => {
        p.destroy();
        this.heron.setVisible(true).setTexture('heron-happy');
        this.heronTag.setVisible(true);
      }, 1300);
      return;
    }
    // The neck relaxes before he walks back to the wall, where he stands at his usual height.
    if (stretched) this.tweens.add({ targets: p, scaleY: (value(HEIGHTS[who]) * U) / p.height, duration: 400, delay: 1000 });
    this.toWall(who, HEIGHTS[who], p);
  }

  private toWall(who: PatientId, h: Frac, img: Phaser.GameObjects.Image) {
    const old = this.wall.find(w => w.who === who);
    if (old) { old.img.destroy(); old.tag.destroy(); this.wall = this.wall.filter(w => w !== old); }
    const text = value(h) > 1 ? mixed(h) : value(h) === 1 ? '1' : str(h);
    const tag = nameTag(this, img.x, GROUND + 44, text).setScale(0.8);
    tag.setAlpha(0);
    this.tweens.add({ targets: tag, alpha: 1, delay: 1300, duration: 300 });
    this.wall.push({ who, img, tag });
    this.layoutWall(img);
  }

  /** Spread the wall evenly; squeeze when it gets crowded. */
  private layoutWall(newcomer?: Phaser.GameObjects.Image) {
    const widths = this.wall.map(w => w.img.displayWidth);
    const total = widths.reduce((a, b) => a + b, 0);
    const room = WALL.to - WALL.from;
    const gap = Math.min(24, (room - total) / Math.max(1, this.wall.length - 1));
    let x = WALL.from;
    this.wall.forEach((w, i) => {
      const cx = x + widths[i] / 2;
      // The one just measured enjoys the praise for a moment before walking off.
      const delay = w.img === newcomer ? 1300 : 0;
      this.walk(w.img, cx, undefined, delay);
      this.tweens.add({ targets: w.tag, x: cx, duration: 600, delay });
      x += widths[i] + gap;
    });
  }

  // ---------- sorting ----------
  private startSort(r: Extract<DoctorRound, { kind: 'sort' }>) {
    this.say(0, doctorSortAsk(r.order));
    speak(doctorSortAsk(r.order));
    this.guide.say(r.order === 'asc' ? 'Нажимай от самого низкого.' : 'Нажимай от самого высокого.');
    const slots = this.sortSlots(r.who.length);
    // The doctor gets in line herself.
    this.heron.setVisible(!r.who.includes('heron'));
    this.heronTag.setVisible(this.heron.visible);
    r.who.forEach((who, i) => {
      const img = this.makePatient(who, HEIGHTS[who], slots[i]).setInteractive({ useHandCursor: true });
      const h = HEIGHTS[who];
      const tag = nameTag(this, slots[i], GROUND + 44, value(h) > 1 ? mixed(h) : value(h) === 1 ? '1' : str(h)).setScale(0.8);
      const item = { who, img, tag } as (typeof this.lineup)[number];
      img.on('pointerup', () => this.pickInOrder(item));
      this.lineup.push(item);
    });
    this.phase = 'sort';
  }

  private sortSlots(n: number) {
    const from = 440, to = 1400, step = (to - from) / n;
    return Array.from({ length: n }, (_, i) => from + step * (i + 0.5));
  }

  private pickInOrder(item: (typeof this.lineup)[number]) {
    if (this.phase !== 'sort' || item.badge || this.r.kind !== 'sort') return;
    const r = this.r;
    const left = this.lineup.filter(l => !l.badge);
    const sign = r.order === 'asc' ? 1 : -1;
    const best = left.reduce((a, l) => (sign * (value(HEIGHTS[l.who]) - value(HEIGHTS[a.who])) < 0 ? l : a));
    if (value(HEIGHTS[item.who]) !== value(HEIGHTS[best.who])) {
      this.look(item.img, item.who, 'angry');
      this.tweens.add({ targets: item.img, x: item.img.x + 10, duration: 50, yoyo: true, repeat: 5 });
      this.mistake(doctorSortExplain(best.who, item.who, r.order), [doctorSortExplain(best.who, item.who, r.order, true)]);
      this.time.delayedCall(1400, () => this.look(item.img, item.who, 'normal'));
      return;
    }
    sfx('click');
    this.picked.push(item.who);
    const n = this.picked.length;
    const g = this.add.graphics();
    g.fillStyle(C.olive).fillCircle(0, 0, 30).lineStyle(5, C.navy).strokeCircle(0, 0, 30);
    item.badge = this.add.container(item.img.x, GROUND - item.img.displayHeight - 46, [g, label(this, 0, -2, String(n), 36, HEX.paper, 900)]);
    this.look(item.img, item.who, 'happy');
    if (n < this.lineup.length) return;
    // Everyone in order: line up by the badges.
    this.phase = 'busy';
    const slots = this.sortSlots(this.lineup.length);
    for (const l of this.lineup) {
      const x = slots[this.picked.indexOf(l.who)];
      this.walk(l.img, x);
      this.tweens.add({ targets: [l.tag, l.badge], x, duration: 700 });
    }
    this.time.delayedCall(800, () => {
      const text = r.order === 'asc' ? 'Верно! От самого низкого до самого высокого.' : 'Верно! От самого высокого до самого низкого.';
      this.success(text, text);
    });
  }

  // ---------- feedback ----------
  private say(i: 0 | 1, text: string) {
    this.bubbles[i]?.destroy();
    const b = i === 0
      // Narrow enough to leave the chart labels (and its extension) visible.
      ? new Bubble(this, 480, 290, 580, 200, { x: DOC_X + 60 - 480, y: GROUND - U + 60 - 290 })
      : this.patientBubble();
    b.add(wrapLabel(this, 0, 0, text, i === 0 ? 520 : 470, 32, 800));
    b.pop();
    this.bubbles[i] = b;
  }

  /** Above and to the right of the patient, tail to the head. */
  private patientBubble() {
    const p = this.patient;
    const px = p?.x ?? QUEUE_X, top = p ? GROUND - p.displayHeight : 600;
    const x = Phaser.Math.Clamp(px + 300, 1180, W - 280), y = Math.max(250, Math.min(top - 140, 420));
    return new Bubble(this, x, y, 520, 150, { x: px + 20 - x, y: top + 10 - y });
  }

  private clearBubbles() {
    this.bubbles.forEach(b => b?.destroy());
    this.bubbles = [];
  }

  private success(screen: string, spoken: string) {
    sfx('good');
    this.heron.setTexture('heron-happy');
    this.guide.hideArrow();
    this.guide.say(screen);
    speak(spoken);
    const earned = this.triesOnRound === 0 ? 2 : 1;
    this.coins += earned;
    coinsBurst(this, DOC_X, GROUND - U - 20, earned);
    this.measure.setVisible(false);
    this.next.setVisible(true);
    this.phase = 'busy';
  }

  private mistake(screen: string, spoken: string[]) {
    this.mistakes++;
    this.triesOnRound++;
    sfx('bad');
    this.heron.setTexture('heron-angry');
    this.guide.say(screen);
    speakSeq(spoken);
    this.time.delayedCall(1600, () => this.heron.setTexture('heron-normal'));
  }

  private nextRound() {
    this.next.setVisible(false);
    this.heron.setTexture('heron-normal');
    this.roundIndex++;
    this.drawDots();
    if (this.roundIndex < this.level.rounds.length) this.startRound(); else this.finish();
  }

  private finish() {
    this.clearRound();
    this.guide.say('');
    const stars = starsFor(this.mistakes);
    store.setStars('doctor', this.levelIndex, stars);
    store.addCoins(this.coins);
    const hasNext = this.levelIndex + 1 < DOCTOR_LEVELS.length;
    resultModal(this, {
      title: 'Все измерены!',
      stars,
      coins: this.coins,
      note: DOCTOR_NOTES[stars],
      onMap: () => this.scene.start('Town'),
      onRetry: () => this.scene.restart({ level: this.levelIndex }),
      onNext: hasNext ? () => this.scene.restart({ level: this.levelIndex + 1 }) : undefined,
    });
    speak(DOCTOR_NOTES[stars]);
  }
}
