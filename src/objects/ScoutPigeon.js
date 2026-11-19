import Phaser from 'phaser';

import { DEPTH, TEXTURES } from '../game/constants.js';

/**
 * Голубь-разведчик — первый покупаемый питомец.
 *
 * Использует тот же спрайт Pepper (никаких новых изображений), но заметно
 * меньше и стоит рядом, чуть ниже и правее главного персонажа.
 */
const DISPLAY_HEIGHT = 172;
const FEET_OFFSET = 101;

export class ScoutPigeon extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    this._baseY = y;
    this._idleTween = null;

    scene.add.existing(this);
    this.setDepth(DEPTH.PIGEON - 1);

    const image = scene.add.image(0, FEET_OFFSET, TEXTURES.PEPPER).setOrigin(0.5, 1);
    this._baseScale = DISPLAY_HEIGHT / image.height;
    image.setScale(this._baseScale);
    this.image = image;
    this.add(image);

    this._startIdle();
  }

  /** Мягкое «дыхание»: смещение по высоте и равномерное изменение масштаба. */
  _startIdle() {
    const breathScale = this._baseScale * 1.02;

    this._idleTween = this.scene.tweens.add({
      targets: this.image,
      y: FEET_OFFSET - 6,
      scaleX: breathScale,
      scaleY: breathScale,
      duration: 1750,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }
}
