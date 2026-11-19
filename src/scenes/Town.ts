import Phaser from 'phaser';
import { C, HEX, W, H, BLEED } from '../theme';
import { store, type Place } from '../store';
import { BEAVER_LEVELS, CLOCK_LEVELS, COURIER_LEVELS, DOCTOR_LEVELS, GNOME_LEVELS, MONSTER_LEVELS, PIER_LEVELS, PIZZA_LEVELS, POTION_LEVELS } from '../levels';
import { Button, label, iconButton, modal, soundButton, starShape } from '../ui';
import { nextVoice, previewVoice, ruVoices, sfx, voiceName } from '../audio';
import { STRESS_MODES } from '../pronounce/dictionary';
import { edges, margins, onResize } from '../stage';
import { FAR_FACTOR, MID_FACTOR, RIVER, ROAD_END, SPOTS, WORLD_W, clampScroll, maxScroll, nextSpot, scrollTo, type Spot } from '../map';

const LEVELS: Record<Place, { name: string }[]> = { pizza: PIZZA_LEVELS, gnomes: GNOME_LEVELS, clock: CLOCK_LEVELS, pier: PIER_LEVELS, beaver: BEAVER_LEVELS, doctor: DOCTOR_LEVELS, potion: POTION_LEVELS, courier: COURIER_LEVELS, monsters: MONSTER_LEVELS };
const SCENE: Record<Place, string> = { pizza: 'Pizzeria', gnomes: 'Gnomes', clock: 'Clock', pier: 'Pier', beaver: 'Beaver', doctor: 'Doctor', potion: 'Potion', courier: 'Courier', monsters: 'Monsters' };

/** A place is done when every level has at least one star. */
const done = (p: Place) => LEVELS[p].every((_, i) => store.stars(p, i) > 0);

/** Where the map was left, so coming back from a place doesn't jump. Lives until the page reloads. */
let lastScroll: number | null = null;
let lastNext: string | null = null;

export class Town extends Phaser.Scene {
  private scroll = 0;
  private layers: { c: Phaser.GameObjects.Container; f: number }[] = [];
  private navL!: Phaser.GameObjects.Container;
  private navR!: Phaser.GameObjects.Container;
  private drag: { x: number; scroll: number } | null = null;
  /** The pointer moved far enough to count as a drag: taps on buildings are ignored. */
  private moved = false;
  private pan?: Phaser.Tweens.Tween;
  private snd!: ReturnType<typeof soundButton>;

  constructor() { super('Town'); }

  create() {
    this.layers = [];
    this.add.graphics().fillStyle(C.cream).fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);
    const clouds = this.layer(0.05);
    const far = this.layer(FAR_FACTOR);
    const mid = this.layer(MID_FACTOR);
    const world = this.layer(1);
    this.drawClouds(clouds);
    this.drawMountain(far);
    this.drawHills(mid);
    const ground = this.drawGround(world);
    for (const s of SPOTS) this.addLife(world, s, ground, this.addSpot(world, s));
    this.addResidents(world, ground);
    const next = nextSpot(SPOTS, done);
    if (next) this.addMarker(world, next.x, next.y - this.textures.getFrame(next.key).height * next.scale + 10);
    // Everything on the road is done: the arrow points up to the monster house.
    else if (!done('monsters')) this.addMarker(world, ROAD_END.x, ROAD_END.y - 190);

    label(this, W / 2, 90, 'Половинкино', 84, HEX.navy, 900);
    label(this, W / 2, 160, 'город, где всё делят на части', 34, HEX.terra, 800);

    const coins = this.add.container(0, 0);
    const coin = this.add.graphics();
    coin.fillStyle(C.mustard).fillCircle(70, 66, 26).lineStyle(5, C.navy).strokeCircle(70, 66, 26);
    coin.lineStyle(4, C.mustardDark).strokeCircle(70, 66, 14);
    coins.add([coin, this.add.text(112, 66, String(store.coins), { fontFamily: 'Nunito', fontSize: '42px', fontStyle: '900', color: HEX.navy }).setOrigin(0, 0.5)]);

    // Three round buttons in the corner: settings, full screen, sound. Sound stays out of the menu: it may be needed in a hurry.
    this.snd = soundButton(this, 0, 0);
    const corner = [iconButton(this, 0, 0, 'gear', () => this.openSettings()), this.fullscreenButton(), this.snd]
      .filter(b => b !== null).reverse();

    this.navL = this.navButton(70, -1);
    this.navR = this.navButton(W - 70, 1);
    this.setupScrolling();
    // The corner buttons and the arrows keep to the screen edges, the title to the middle.
    onResize(this, () => {
      const e = edges(this);
      coins.setPosition(e.left, e.top);
      corner.forEach((b, i) => b.setPosition(e.right - 70 - i * 110, e.top + 66));
      this.navL.setX(e.left + 70);
      this.navR.setX(e.right - 70);
      this.setScroll(this.scroll);
    });

    // Back from a place: start where the map was left, then ride to the next place if it changed.
    const target = next ? scrollTo(next.x, this.extra) : maxScroll(this.extra);
    const nextKey = next?.key ?? null;
    if (lastScroll === null) this.setScroll(target);
    else {
      this.setScroll(lastScroll);
      if (nextKey !== lastNext) this.time.delayedCall(500, () => this.panTo(target));
    }
    lastNext = nextKey;
    this.events.once('shutdown', () => { lastScroll = this.scroll; });
  }

  /** How far the screen shows past the stage on each side. */
  private get extra() { return Math.max(0, margins(this).x); }

  private layer(f: number) {
    const c = this.add.container(0, 0);
    this.layers.push({ c, f });
    return c;
  }

  setScroll(v: number) {
    this.scroll = clampScroll(v, this.extra);
    for (const { c, f } of this.layers) c.x = -Math.round(this.scroll * f);
    this.navL.setVisible(this.scroll > this.extra);
    this.navR.setVisible(this.scroll < maxScroll(this.extra));
  }

  panTo(v: number, duration = 900) {
    this.pan?.stop();
    const from = { v: this.scroll };
    this.pan = this.tweens.add({ targets: from, v: clampScroll(v, this.extra), duration, ease: 'Sine.InOut', onUpdate: () => this.setScroll(from.v) });
  }

  private modalOpen() {
    return this.children.list.some(o => (o as Phaser.GameObjects.Container).depth >= 100);
  }

  private setupScrolling() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.moved = false;
      if (this.modalOpen()) return;
      this.pan?.stop();
      this.drag = { x: p.x, scroll: this.scroll };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.x;
      if (Math.abs(dx) > 14) this.moved = true;
      if (this.moved) this.setScroll(this.drag.scroll - dx);
    });
    this.input.on('pointerup', () => { this.drag = null; });
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      if (this.modalOpen()) return;
      this.pan?.stop();
      this.setScroll(this.scroll + (Math.abs(dx) > Math.abs(dy) ? dx : dy));
    });
  }

  /** Round arrow at the screen edge: rides the map by most of a screen. */
  private navButton(x: number, dir: -1 | 1) {
    const c = this.add.container(x, 600);
    const g = this.add.graphics();
    g.fillStyle(C.navy).fillCircle(0, 6, 46);
    g.fillStyle(C.paper).fillCircle(0, 0, 46).lineStyle(5, C.navy).strokeCircle(0, 0, 46);
    g.fillStyle(C.navy).fillTriangle(dir * 22, 0, -dir * 12, -22, -dir * 12, 22);
    c.add(g);
    c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { sfx('click'); this.panTo(this.scroll + dir * 1300, 700); });
    return c;
  }

  private drawClouds(layer: Phaser.GameObjects.Container) {
    for (const [x, y, s] of [[260, 230, 1], [1320, 210, 1.2], [1720, 300, 0.8], [2100, 240, 1]] as const) {
      const c = this.add.graphics();
      c.fillStyle(C.paper).lineStyle(4, C.navy);
      for (const [dx, dy, r] of [[-50, 10, 38], [0, -10, 52], [55, 8, 40]]) c.fillCircle(dx, dy, r).strokeCircle(dx, dy, r);
      c.fillCircle(-50, 10, 35).fillCircle(0, -10, 49).fillCircle(55, 8, 37).fillRect(-80, 10, 160, 38);
      c.lineStyle(4, C.navy).lineBetween(-88, 48, 95, 48);
      c.setPosition(x, y).setScale(s);
      layer.add(c);
      this.tweens.add({ targets: c, x: x + 60, duration: 6000 + x * 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  /** The monster house on its mountain: the goal at the end of the road, visible from anywhere. */
  private drawMountain(layer: Phaser.GameObjects.Container) {
    const x = 1760, top = 470, foot = 800;
    const g = this.add.graphics();
    const pts = [
      { x: x - 640, y: foot }, { x: x - 330, y: top + 150 }, { x: x - 120, y: top + 10 }, { x: x - 60, y: top },
      { x: x + 70, y: top }, { x: x + 140, y: top + 20 }, { x: x + 380, y: top + 170 }, { x: x + 640, y: foot },
    ];
    const curve = new Phaser.Curves.Spline(pts.map(p => new Phaser.Math.Vector2(p.x, p.y))).getPoints(80);
    g.fillStyle(C.sand).fillPoints(curve, true);
    g.lineStyle(5, C.navy).strokePoints(curve);
    // Zigzag path up to the door.
    g.lineStyle(6, C.paper).strokePoints([
      new Phaser.Math.Vector2(x + 330, foot - 40), new Phaser.Math.Vector2(x + 120, top + 170),
      new Phaser.Math.Vector2(x + 250, top + 110), new Phaser.Math.Vector2(x + 20, top + 6),
    ]);
    layer.add(g);
    const house = this.add.image(x, top + 8, 'house-monsters').setOrigin(0.5, 1).setScale(0.62).setInteractive({ useHandCursor: true });
    house.on('pointerup', () => this.openMonsters());
    layer.add(house);
    const bat = this.add.image(x - 120, top - 150, 'bat-normal').setScale(0.16);
    layer.add(bat);
    this.tweens.add({ targets: bat, x: x + 130, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.InOut', onYoyo: () => bat.setFlipX(true), onRepeat: () => bat.setFlipX(false) });
    this.tweens.add({ targets: bat, y: top - 200, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: bat, scaleY: 0.1, duration: 160, yoyo: true, repeat: -1 });
  }

  private drawHills(layer: Phaser.GameObjects.Container) {
    const g = this.add.graphics().fillStyle(C.oliveLight);
    const width = WORLD_W * MID_FACTOR + W;
    for (let x = 200, i = 0; x < width; x += 720, i++) g.fillEllipse(x, 830 - (i % 2) * 40, 1100, 380);
    layer.add(g);
  }

  /** Rolling ground through the building spots, the river and the winding road. Returns ground height at x. */
  private drawGround(layer: Phaser.GameObjects.Container) {
    const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    const top = new Phaser.Curves.Spline([
      v(-40, 850), ...SPOTS.map(s => v(s.x, s.y - 12)), v(ROAD_END.x, ROAD_END.y - 20), v(WORLD_W + 40, ROAD_END.y - 30),
    ]).getPoints(260);
    const groundY = (x: number) => {
      let best = top[0];
      for (const p of top) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
      return best.y;
    };
    const g = this.add.graphics();
    g.fillStyle(C.olive).fillPoints([...top, v(WORLD_W + 40, H + BLEED), v(-40, H + BLEED)], true);
    g.lineStyle(5, C.navy).strokePoints(top);

    // The river winds down from the hills into the bay between the pier and Bruno's lodge, then flows under the bridge.
    const bay = new Phaser.Curves.Spline(RIVER.banks.map(([x, y]) => v(x, y))).getPoints(120);
    g.fillStyle(C.water).fillPoints(bay, true);
    // The banks below the waterlines hide behind the pier's and the lodge's water.
    const tip = bay.reduce((a, p, i) => (p.y < bay[a].y ? i : a), 0);
    g.lineStyle(5, C.navy).strokePoints(bay.filter((p, i) => p.y <= (i <= tip ? RIVER.pierWater : RIVER.lodgeWater)));
    const rx = RIVER.x - RIVER.w / 2, ry = groundY(RIVER.x);
    g.fillStyle(C.water).fillRect(rx, ry, RIVER.w, H - ry + BLEED);
    g.lineStyle(5, C.navy).lineBetween(rx, ry + 20, rx, H + BLEED).lineBetween(rx + RIVER.w, ry + 20, rx + RIVER.w, H + BLEED);

    const road = new Phaser.Curves.Spline([v(-40, 900), ...SPOTS.map(s => v(s.x, s.y + 38)), v(ROAD_END.x, ROAD_END.y + 40)]);
    const pts = road.getPoints(300);
    g.lineStyle(68, C.navy).strokePoints(pts);
    g.lineStyle(56, C.sand).strokePoints(pts);
    const dots = road.getSpacedPoints(Math.floor(road.getLength() / 46));
    g.lineStyle(7, C.paper);
    for (let i = 0; i + 1 < dots.length; i += 2) g.lineBetween(dots[i].x, dots[i].y, dots[i + 1].x, dots[i + 1].y);

    // Bridge where the road crosses the river.
    const by = pts.reduce((a, p) => (Math.abs(p.x - RIVER.x) < Math.abs(a.x - RIVER.x) ? p : a)).y;
    const bx = rx - 24, bw = RIVER.w + 48;
    g.fillStyle(C.mustardDark).fillRect(bx, by - 36, bw, 72).lineStyle(5, C.navy).strokeRect(bx, by - 36, bw, 72);
    g.lineStyle(3, C.navy);
    for (let x = bx + 22; x < bx + bw; x += 22) g.lineBetween(x, by - 36, x, by + 36);
    g.lineStyle(8, C.navy).lineBetween(bx - 6, by - 46, bx + bw + 6, by - 46);
    for (let x = bx; x <= bx + bw; x += bw / 4) g.lineBetween(x, by - 46, x, by - 30);

    // Signpost at the end of the road, pointing up the mountain.
    g.fillStyle(C.mustardDark).fillRect(ROAD_END.x - 8, ROAD_END.y - 140, 16, 150);
    g.lineStyle(4, C.navy).strokeRect(ROAD_END.x - 8, ROAD_END.y - 140, 16, 150);
    g.fillStyle(C.paper).fillPoints([v(ROAD_END.x - 90, ROAD_END.y - 160), v(ROAD_END.x + 70, ROAD_END.y - 160),
      v(ROAD_END.x + 100, ROAD_END.y - 130), v(ROAD_END.x + 70, ROAD_END.y - 100), v(ROAD_END.x - 90, ROAD_END.y - 100)], true);
    g.lineStyle(4, C.navy).strokePoints([v(ROAD_END.x - 90, ROAD_END.y - 160), v(ROAD_END.x + 70, ROAD_END.y - 160),
      v(ROAD_END.x + 100, ROAD_END.y - 130), v(ROAD_END.x + 70, ROAD_END.y - 100), v(ROAD_END.x - 90, ROAD_END.y - 100)], true);
    layer.add(g);
    this.addRipples(layer, ry);
    layer.add(label(this, ROAD_END.x - 6, ROAD_END.y - 131, 'к монстрам', 26, HEX.navy, 900));
    // The signpost carries the monster house's stars and opens it too.
    layer.add(this.plaque(ROAD_END.x, ROAD_END.y + 92, 'Дом монстров', { have: store.totalStars('monsters'), total: MONSTER_LEVELS.length * 3 }));
    const zone = this.add.zone(ROAD_END.x, ROAD_END.y, 260, 340).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.openMonsters());
    layer.add(zone);
    return groundY;
  }

  /** Ripples float downstream: through the bay and on under the bridge. */
  private addRipples(layer: Phaser.GameObjects.Container, ry: number) {
    const ripple = (x: number, y0: number, y1: number, half: number, delay: number) => {
      const r = this.add.graphics().lineStyle(4, C.paper).lineBetween(-half, 0, half, 0).setPosition(x, y0).setAlpha(0);
      layer.add(r);
      // Fades in and out on the way.
      this.tweens.add({ targets: r, y: y1, duration: 3600, delay, repeat: -1, ease: 'Linear',
        onUpdate: () => r.setAlpha(Math.sin(((r.y - y0) / (y1 - y0)) * Math.PI)) });
    };
    ripple(RIVER.x - 10, 770, 836, 16, 0);
    ripple(RIVER.x + 40, 790, 850, 18, 1800);
    for (const [dx, delay] of [[-40, 0], [30, 1200], [-10, 2400]] as const) ripple(RIVER.x + dx, ry + 80, H - 20, 18, delay);
  }

  /** Name plate under a building: navy for open places, sand with «скоро» for closed ones. */
  private plaque(x: number, y: number, name: string, stars: { have: number; total: number } | null) {
    const c = this.add.container(x, y);
    const t = label(this, 0, 0, name, stars ? 36 : 28, stars ? HEX.paper : HEX.navy, 900);
    const w = Math.max(t.width, 200) + 48, h = stars ? 112 : 92;
    const g = this.add.graphics();
    g.fillStyle(C.navy).fillRoundedRect(-w / 2, -30 + 6, w, h, 20);
    g.fillStyle(stars ? C.navy : C.sand).fillRoundedRect(-w / 2, -30, w, h, 20);
    g.lineStyle(4, C.navy).strokeRoundedRect(-w / 2, -30, w, h, 20);
    c.add([g, t]);
    if (stars) {
      const n = label(this, 0, 46, `${stars.have} / ${stars.total}`, 32, HEX.paper, 900);
      const left = -(n.width + 52) / 2;
      starShape(g, left + 20, 46, 20, true);
      n.setX(left + 52 + n.width / 2);
      c.add(n);
    } else {
      c.add(label(this, 0, 38, 'скоро', 24, HEX.terra, 800));
    }
    return c;
  }

  /** Returns what grows under the pointer: the building and, later, its moving details. */
  private addSpot(layer: Phaser.GameObjects.Container, s: Spot) {
    const img = this.add.image(s.x, s.y, s.key).setOrigin(0.5, 1).setScale(s.scale);
    layer.add(img);
    const grow: Phaser.GameObjects.Image[] = [img];
    if (!s.place) {
      img.setTint(0xd9d2c3); // faded, but opaque: the mountain must not show through
      layer.add(this.plaque(s.x, s.y + 92, s.name, null));
      return grow;
    }
    const place = s.place;
    layer.add(this.plaque(s.x, s.y + 92, s.name, { have: store.totalStars(place), total: LEVELS[place].length * 3 }));
    img.setInteractive({ useHandCursor: true });
    const hover = (f: number) => grow.forEach(o => this.tweens.add({ targets: o, scale: o.getData('scale') * f, duration: 150 }));
    grow.forEach(o => o.setData('scale', o.scale));
    img.on('pointerover', () => hover(1.05));
    img.on('pointerout', () => hover(1));
    img.on('pointerup', () => {
      if (this.moved) return;
      sfx('click');
      this.openPicker(place, s.name);
    });
    return grow;
  }

  /**
   * Something moves at every place, so the town looks lived in. Coordinates are in the building's art.
   * The details sit right in the world layer: Phaser breaks rotated images in nested containers.
   */
  private addLife(c: Phaser.GameObjects.Container, s: Spot, groundY: (x: number) => number, grow: Phaser.GameObjects.Image[]) {
    const k = this.textures.getFrame(s.key).width / 300 * s.scale;
    const at = (x: number, y: number) => ({ x: s.x + (x - 150) * k, y: s.y + (y - 300) * k });
    switch (s.place) {
      case 'clock': {
        const p = at(222, 267);
        const heart = this.add.image(p.x, p.y, 'clock-heart').setOrigin(0.5, 17 / 36).setScale(s.scale);
        c.add(heart);
        this.tweens.add({ targets: heart, scale: s.scale * 1.2, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Sine.Out' });
        break;
      }
      case 'pier': {
        // Rocks on the water around its waterline.
        const p = at(162, 252);
        const ship = this.add.image(p.x, p.y, 'pier-ship').setOrigin(162 / 300, 252 / 300).setScale(s.scale).setAngle(-2);
        c.add(ship);
        grow.push(ship.setData('scale', s.scale));
        this.tweens.add({ targets: ship, angle: 2, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.tweens.add({ targets: ship, y: p.y + 4, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        break;
      }
      case 'doctor': {
        // Doctor Heron waits for patients by her height chart, now and then bending to look.
        const heron = this.add.image(at(272, 300).x, s.y, 'heron-normal').setOrigin(0.5, 1).setScale(0.36);
        c.add(heron);
        grow.push(heron.setData('scale', 0.36));
        this.tweens.add({ targets: heron, angle: -6, duration: 900, yoyo: true, hold: 600, repeat: -1, repeatDelay: 2200, ease: 'Sine.InOut' });
        break;
      }
      case 'potion': {
        // Bubbles rise from the flask by the door and pop.
        const p = at(223, 200);
        this.time.addEvent({ delay: 650, loop: true, callback: () => {
          const r = Phaser.Math.Between(7, 12), dx = Phaser.Math.Between(-10, 10);
          const b = this.add.graphics().fillStyle(C.oliveLight).fillCircle(0, 0, r).lineStyle(3, C.navy).strokeCircle(0, 0, r);
          b.setPosition(p.x + dx, p.y);
          c.add(b);
          this.tweens.add({ targets: b, y: p.y - Phaser.Math.Between(80, 120), x: p.x + dx * 2, duration: 1800, ease: 'Sine.Out', onComplete: () => b.destroy() });
          this.tweens.add({ targets: b, alpha: 0, delay: 1200, duration: 600 });
        } });
        break;
      }
      case 'courier': {
        // Shustrik rides his scooter up and down the road by the house.
        const sh = this.add.image(0, 0, 'shustrik-normal').setOrigin(0.5, 1).setScale(0.3);
        c.add(sh);
        const ride = { x: s.x - 260 };
        const place = () => sh.setPosition(ride.x, groundY(ride.x) + 22);
        place();
        this.tweens.add({ targets: ride, x: s.x + 260, duration: 3200, yoyo: true, repeat: -1, hold: 700, repeatDelay: 700, ease: 'Sine.InOut',
          onUpdate: place, onYoyo: () => sh.setFlipX(true), onRepeat: () => sh.setFlipX(false) });
        break;
      }
    }
  }

  /** Residents hanging around their buildings. */
  private addResidents(layer: Phaser.GameObjects.Container, groundY: (x: number) => number) {
    const at = (key: string, x: number, scale: number, flip = false) => {
      const img = this.add.image(x, groundY(x) + 22, key).setOrigin(0.5, 1).setScale(scale).setFlipX(flip);
      layer.add(img);
      return img;
    };
    const pizza = SPOTS[0].x, gazebo = SPOTS[1].x, clock = SPOTS[2].x;
    const pyh = at('pyh-normal', pizza + 300, 0.5);
    this.tweens.add({ targets: pyh, y: pyh.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const g1 = at('usach-normal', gazebo + 265, 0.44);
    const g2 = at('ochkarik-normal', gazebo + 340, 0.44, true);
    this.tweens.add({ targets: [g1, g2], scaleY: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // Tikhon waits at the clock until Nosochka arrives in the last clock level.
    const together = store.stars('clock', CLOCK_LEVELS.length - 1) > 0;
    const tikhon = at(together ? 'tikhon-happy' : 'tikhon-normal', clock + 185, 0.36);
    if (together) at('nosochka-happy', clock + 260, 0.36, true);
    // Waiting impatiently: hops in place.
    else this.tweens.add({ targets: tikhon, y: tikhon.y - 14, duration: 380, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Quad.Out' });
  }

  private openMonsters() {
    if (this.moved) return;
    sfx('click');
    this.openPicker('monsters', 'Дом монстров');
  }

  /** Bouncing arrow over the place to play next. */
  private addMarker(layer: Phaser.GameObjects.Container, x: number, y: number) {
    const g = this.add.graphics();
    const pts = [[-26, -70], [26, -70], [26, -30], [50, -30], [0, 16], [-50, -30], [-26, -30]].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(C.navy).fillPoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y + 6)), true);
    g.fillStyle(C.mustard).fillPoints(pts, true).lineStyle(5, C.navy).strokePoints(pts, true);
    g.setPosition(x, y);
    layer.add(g);
    this.tweens.add({ targets: g, y: y - 26, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  /** Full screen on and off; hidden where the browser can't do it (iPhone Safari allows it for video only). */
  private fullscreenButton() {
    if (!this.scale.fullscreen.available) return null;
    const icon = () => (this.scale.isFullscreen ? 'shrink' : 'expand');
    const b = iconButton(this, 0, 0, icon(), () => this.scale.toggleFullscreen());
    const sync = () => b.setIcon(icon());
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, sync);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, sync);
    this.events.once('shutdown', () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, sync);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, sync);
    });
    return b;
  }

  /** Settings behind the gear: voice and stress marks (only with browser voices), and starting over. */
  private openSettings() {
    const voices = ruVoices().length > 0;
    const rows = voices ? 3 : 1, h = 174 + rows * 120;
    const layer = modal(this, 900, h);
    const top = H / 2 - h / 2;
    layer.add(label(this, W / 2, top + 80, 'Настройки', 56, HEX.navy, 900));
    layer.add(iconButton(this, W / 2 + 400, top + 60, 'close', () => layer.destroy(), 40));
    let y = top + 190;
    const row = (caption: string, onClick: (b: Button) => void, opts: { fill?: number; color?: string } = {}) => {
      const b: Button = new Button(this, W / 2, y, caption, () => onClick(b), { w: 640, h: 88, size: 32, ...opts });
      layer.add(b);
      y += 120;
    };
    if (voices) {
      // Each choice is heard at once, so it is picked by ear; it turns the sound on too.
      const soundOn = () => { store.sound = true; this.snd.setIcon('sound'); };
      row(`Голос: ${voiceName()}`, b => { soundOn(); nextVoice(); b.setCaption(`Голос: ${voiceName()}`); });
      const stressCaption = () => `Ударения: ${STRESS_MODES.find(m => m.mode === store.stress)?.label}`;
      row(stressCaption(), b => {
        const i = STRESS_MODES.findIndex(m => m.mode === store.stress);
        store.stress = STRESS_MODES[(i + 1) % STRESS_MODES.length].mode;
        b.setCaption(stressCaption());
        soundOn();
        previewVoice();
      });
    }
    row('Сбросить прогресс', () => { layer.destroy(); this.confirmReset(); }, { fill: C.terra, color: HEX.paper });
  }

  private confirmReset() {
    const layer = modal(this, 1000, 460);
    layer.add(label(this, W / 2, H / 2 - 140, 'Сбросить прогресс?', 56, HEX.navy, 900));
    layer.add(label(this, W / 2, H / 2 - 40, 'Звёзды, монеты и знакомства с героями обнулятся.', 32, HEX.navy, 700));
    layer.add(label(this, W / 2, H / 2 + 10, 'Звук, голос и ударения останутся.', 28, HEX.navy, 600));
    layer.add(new Button(this, W / 2 - 170, H / 2 + 130, 'Отмена', () => layer.destroy(), { w: 280, h: 88, size: 34 }));
    layer.add(new Button(this, W / 2 + 170, H / 2 + 130, 'Сбросить', () => {
      store.reset();
      this.scene.restart();
    }, { w: 280, h: 88, size: 34, fill: C.terra, color: HEX.paper }));
  }

  private openPicker(place: Place, title: string) {
    const levels = LEVELS[place];
    // Leave 200 px on each side of the outer circles for the level names; cap at the stage width.
    const gap = Math.min(300, (W - 120 - 400) / Math.max(1, levels.length - 1));
    const pw = Math.max(1400, (levels.length - 1) * gap + 400);
    const layer = modal(this, pw, 660);
    const top = H / 2 - 330;
    layer.add(label(this, W / 2, top + 80, title, 56, HEX.navy, 900));
    const close = iconButton(this, W / 2 + pw / 2 - 60, top + 60, 'close', () => layer.destroy(), 40);
    layer.add(close);

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
          this.scene.start(SCENE[place], { level: i });
        });
        layer.add(hit);
      }
    });
  }
}
