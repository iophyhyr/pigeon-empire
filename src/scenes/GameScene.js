import Phaser from 'phaser';

import { SCENE_KEYS, GAME_WIDTH, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { buildBackdrop } from '../world/Backdrop.js';
import { Pepper } from '../objects/Pepper.js';
import { Hud } from '../ui/Hud.js';

const PEPPER_X = GAME_WIDTH / 2;
const PEPPER_Y = 470;

/**
 * Основной игровой экран: крыша, Pepper, крошки, HUD.
 * Вся логика пока простая и живёт здесь: нажатие на Pepper → +1 крошка.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.crumbs = 0;

    buildBackdrop(this);

    // тень на крыше — отдельно от персонажа, чтобы не подпрыгивала вместе с ним
    this.add
      .graphics()
      .setDepth(DEPTH.SHADOW)
      .fillStyle(COLORS.shadow, 0.18)
      .fillEllipse(PEPPER_X, PEPPER_Y + 104, 190, 36);

    this.pepper = new Pepper(this, PEPPER_X, PEPPER_Y, () => this.collectCrumb());

    this.hud = new Hud(this);
    this.hud.setCrumbs(this.crumbs);
    this.hud.setIncome(0);
  }

  /** Начисление крошки: счётчик + всплывающий «+1». */
  collectCrumb(amount = 1) {
    this.crumbs += amount;
    this.hud.setCrumbs(this.crumbs);
    this.hud.pulseCrumbs();
    this._spawnFloatingText(`+${amount}`);
  }

  _spawnFloatingText(label) {
    const startX = this.pepper.x + Phaser.Math.Between(-40, 40);
    const startY = this.pepper.y - 165;

    const text = this.add
      .text(startX, startY, label, {
        fontFamily: CSS.fontFamily,
        fontSize: '48px',
        fontStyle: 'bold',
        color: CSS.plusOne,
        stroke: CSS.plusOneStroke,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.FLOATING)
      .setScale(0.6);

    this.tweens.add({
      targets: text,
      y: startY - 90,
      alpha: 0,
      scale: 1.2,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
