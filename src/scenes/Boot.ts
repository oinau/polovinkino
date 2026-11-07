import Phaser from 'phaser';
import { allArt } from '../art';
import { C, HEX, W, H } from '../theme';
import { label } from '../ui';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    label(this, W / 2, H / 2 - 60, 'Половинкино', 90, HEX.navy, 900);
    const bar = this.add.rectangle(W / 2 - 300, H / 2 + 60, 0, 30, C.terra).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 60, 600, 30).setStrokeStyle(5, C.navy);
    this.load.on('progress', (p: number) => { bar.width = 600 * p; });

    for (const a of allArt()) {
      // Phaser's loader decodes data URIs as base64 only.
      const bytes = new TextEncoder().encode(a.svg);
      const b64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
      this.load.svg(a.key, 'data:image/svg+xml;base64,' + b64, { scale: a.scale });
    }
  }

  create() {
    this.scene.start('Town');
  }
}
