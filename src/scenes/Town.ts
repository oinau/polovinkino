import Phaser from 'phaser';
import { C, HEX, W, H } from '../theme';
import { store, type Place } from '../store';
import { PIZZA_LEVELS, GNOME_LEVELS } from '../levels';
import { Button, label, iconButton, modal, starShape } from '../ui';
import { nextVoice, ruVoices, sfx, voiceName } from '../audio';

interface Spot {
  key: string;
  x: number;
  name: string;
  place?: Place;
  scale: number;
  /** Ground line the building stands on. */
  y: number;
}

const SPOTS: Spot[] = [
  // Closed places stand on the far hill, open ones in front.
  { key: 'house-courier', x: 1520, y: 690, name: 'Курьеры', scale: 0.56 },
  { key: 'house-pier', x: 1690, y: 700, name: 'Пристань', scale: 0.56 },
  { key: 'house-potion', x: 1825, y: 690, name: 'Зельеварня', scale: 0.56 },
  { key: 'house-pizza', x: 390, y: 890, name: 'Пиццерия «Кусочек»', place: 'pizza', scale: 1 },
  { key: 'house-gazebo', x: 1000, y: 890, name: 'Беседка спорщиков', place: 'gnomes', scale: 1 },
];

export class Town extends Phaser.Scene {
  constructor() { super('Town'); }

  create() {
    this.drawLandscape();

    label(this, W / 2, 90, 'Половинкино', 84, HEX.navy, 900);
    label(this, W / 2, 160, 'город, где всё делят на части', 34, HEX.terra, 800);

    const snd = iconButton(this, W - 70, 66, store.sound ? 'sound' : 'mute', () => {
      store.sound = !store.sound;
      snd.setIcon(store.sound ? 'sound' : 'mute');
    });
    this.addVoicePicker(() => snd.setIcon('sound'));
    new Button(this, W - 190, H - 48, 'Начать заново', () => this.confirmReset(), { w: 320, h: 64, size: 26 });

    const coin = this.add.graphics();
    coin.fillStyle(C.mustard).fillCircle(70, 66, 26).lineStyle(5, C.navy).strokeCircle(70, 66, 26);
    coin.lineStyle(4, C.mustardDark).strokeCircle(70, 66, 14);
    this.add.text(112, 66, String(store.coins), { fontFamily: 'Nunito', fontSize: '42px', fontStyle: '900', color: HEX.navy }).setOrigin(0, 0.5);

    for (const s of SPOTS) this.addSpot(s);

    // Residents hanging around their buildings.
    const pyh = this.add.image(690, 900, 'pyh-normal').setOrigin(0.5, 1).setScale(0.55);
    this.tweens.add({ targets: pyh, y: 892, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const g1 = this.add.image(1250, 905, 'usach-normal').setOrigin(0.5, 1).setScale(0.48);
    const g2 = this.add.image(1335, 905, 'ochkarik-normal').setOrigin(0.5, 1).setScale(0.48).setFlipX(true);
    this.tweens.add({ targets: [g1, g2], scaleY: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  /** «Голос: Anna» — tap to hear the next voice. Hidden when the browser has no Russian voice. */
  private addVoicePicker(onSoundOn: () => void) {
    const caption = () => `Голос: ${voiceName()}`;
    const b = new Button(this, W - 330, 66, caption(), () => {
      store.sound = true;
      onSoundOn();
      nextVoice();
      b.setCaption(caption());
    }, { w: 360, h: 70, size: 28 });
    const refresh = () => { b.setVisible(ruVoices().length > 0).setCaption(caption()); };
    refresh();
    // Voices load asynchronously in some browsers.
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', refresh);
    this.events.once('shutdown', () => speechSynthesis.removeEventListener('voiceschanged', refresh));
  }

  private confirmReset() {
    const layer = modal(this, 1000, 460);
    layer.add(label(this, W / 2, H / 2 - 140, 'Начать заново?', 56, HEX.navy, 900));
    layer.add(label(this, W / 2, H / 2 - 40, 'Звёзды, монеты и знакомства с героями обнулятся.', 32, HEX.navy, 700));
    layer.add(label(this, W / 2, H / 2 + 10, 'Звук и выбранный голос останутся.', 28, HEX.navy, 600));
    layer.add(new Button(this, W / 2 - 170, H / 2 + 130, 'Отмена', () => layer.destroy(), { w: 280, h: 88, size: 34 }));
    layer.add(new Button(this, W / 2 + 170, H / 2 + 130, 'Сбросить', () => {
      store.reset();
      this.scene.restart();
    }, { w: 280, h: 88, size: 34, fill: C.terra, color: HEX.paper }));
  }

  private drawLandscape() {
    const g = this.add.graphics();
    g.fillStyle(C.cream).fillRect(0, 0, W, H);
    g.fillStyle(C.oliveLight).fillEllipse(300, 860, 1300, 360).fillEllipse(1620, 800, 1100, 420);
    g.fillStyle(C.olive).fillRect(0, 880, W, H - 880);
    g.lineStyle(5, C.navy).lineBetween(0, 880, W, 880);

    // Drifting clouds.
    for (const [x, y, s] of [[260, 230, 1], [1320, 210, 1.2], [1720, 300, 0.8]] as const) {
      const c = this.add.graphics();
      c.fillStyle(C.paper).lineStyle(4, C.navy);
      for (const [dx, dy, r] of [[-50, 10, 38], [0, -10, 52], [55, 8, 40]]) c.fillCircle(dx, dy, r).strokeCircle(dx, dy, r);
      c.fillCircle(-50, 10, 35).fillCircle(0, -10, 49).fillCircle(55, 8, 37).fillRect(-80, 10, 160, 38);
      c.lineStyle(4, C.navy).lineBetween(-88, 48, 95, 48);
      c.setPosition(x, y).setScale(s);
      this.tweens.add({ targets: c, x: x + 60, duration: 6000 + x * 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private addSpot(s: Spot) {
    const y = s.y;
    const img = this.add.image(s.x, y, s.key).setOrigin(0.5, 1).setScale(s.scale);
    const open = !!s.place;
    label(this, s.x, y + (open ? 60 : 30), s.name, open ? 40 : 26, open ? HEX.paper : HEX.navy, 900);

    if (!open) {
      img.setAlpha(0.5);
      const lock = this.add.graphics();
      lock.lineStyle(10, C.navy).beginPath().arc(0, -18, 22, Math.PI, 0).strokePath();
      lock.fillStyle(C.navy).fillRoundedRect(-34, -18, 68, 54, 10);
      lock.fillStyle(C.paper).fillCircle(0, 4, 8);
      lock.setPosition(s.x, y - 100);
      label(this, s.x, y + 60, 'скоро', 24, HEX.terra, 800);
      return;
    }

    const place = s.place!;
    const total = (place === 'pizza' ? PIZZA_LEVELS : GNOME_LEVELS).length * 3;
    const sg = this.add.graphics();
    starShape(sg, s.x - 60, y + 125, 24, true);
    label(this, s.x + 14, y + 125, `${store.totalStars(place)} / ${total}`, 36, HEX.paper, 900);

    img.setInteractive({ useHandCursor: true });
    img.on('pointerover', () => this.tweens.add({ targets: img, scale: s.scale * 1.05, duration: 150 }));
    img.on('pointerout', () => this.tweens.add({ targets: img, scale: s.scale, duration: 150 }));
    img.on('pointerup', () => { sfx('click'); this.openPicker(place, s.name); });
  }

  private openPicker(place: Place, title: string) {
    const levels = place === 'pizza' ? PIZZA_LEVELS : GNOME_LEVELS;
    const layer = modal(this, 1400, 660);
    const top = H / 2 - 330;
    layer.add(label(this, W / 2, top + 80, title, 56, HEX.navy, 900));
    const close = iconButton(this, W / 2 + 640, top + 60, 'close', () => layer.destroy(), 40);
    layer.add(close);

    const gap = 300;
    const x0 = W / 2 - ((levels.length - 1) * gap) / 2;
    levels.forEach((lv, i) => {
      const x = x0 + i * gap, y = top + 300;
      const unlocked = store.unlocked(place, i);
      const g = this.add.graphics();
      g.fillStyle(C.navy).fillCircle(x, y + 8, 95);
      g.fillStyle(unlocked ? (i % 2 ? C.olive : C.terra) : C.sand).fillCircle(x, y, 95);
      g.lineStyle(6, C.navy).strokeCircle(x, y, 95);
      layer.add(g);
      if (unlocked) {
        layer.add(label(this, x, y - 4, String(i + 1), 84, HEX.paper, 900));
      } else {
        g.lineStyle(9, C.navy).beginPath().arc(x, y - 14, 20, Math.PI, 0).strokePath();
        g.fillStyle(C.navy).fillRoundedRect(x - 30, y - 14, 60, 48, 10);
      }
      layer.add(label(this, x, y + 140, lv.name, 30, HEX.navy, 800));
      const sg = this.add.graphics();
      for (let k = 0; k < 3; k++) starShape(sg, x + (k - 1) * 56, y + 200, 22, k < store.stars(place, i));
      layer.add(sg);

      if (unlocked) {
        const hit = this.add.circle(x, y, 95).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => {
          sfx('click');
          this.scene.start(place === 'pizza' ? 'Pizzeria' : 'Gnomes', { level: i });
        });
        layer.add(hit);
      }
    });
  }
}
