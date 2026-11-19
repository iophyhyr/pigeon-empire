import Phaser from 'phaser';

import { DEPTH, TEXTURES } from '../game/constants.js';
import { COLORS } from '../game/palette.js';

/** Куда «встают» лапы в локальных координатах контейнера (как у Pepper). */
const FEET_OFFSET = 101;

/**
 * Универсальный голубь на крыше.
 *
 * Использует свою текстуру из каталога, но общую с Pepper логику:
 * пропорциональный масштаб, тень, лёгкое «дыхание» и короткий pop при появлении.
 */
export class RoofPigeon extends Phaser.GameObjects.Container {
  constructor(scene, x, y, definition) {
    super(scene, x, y);

    this.definition = definition;
    this._baseY = y;
    this._idleTween = null;
    this._popTween = null;
    this.shadow = null;

    scene.add.existing(this);
    this.setDepth(DEPTH.PIGEON - 1);

    const image = scene.add.image(0, FEET_OFFSET, definition.texture || TEXTURES.PEPPER).setOrigin(0.5, 1);
    this._baseScale = (definition.displayHeight || 150) / image.height;
    image.setScale(this._baseScale);
    this.image = image;
    this.add(image);

    this._buildShadow();
    this._startIdle();
    this._popIn();
  }

  _buildShadow() {
    const width = Math.max(60, this.image.displayWidth * 0.72);

    this.shadow = this.scene.add
      .graphics()
      .setDepth(DEPTH.SHADOW)
      .fillStyle(COLORS.shadow, 0.16)
      .fillEllipse(this.x, this.y + FEET_OFFSET + 3, width, 22);
  }

  /** Мягкое «дыхание»: смещение по высоте и равномерное изменение масштаба. */
  _startIdle() {
    const breathScale = this._baseScale * 1.02;
    const duration = 1650 + (this.definition.income % 5) * 90;

    this._idleTween = this.scene.tweens.add({
      targets: this.image,
      y: FEET_OFFSET - 5,
      scaleX: breathScale,
      scaleY: breathScale,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Короткое появление сразу после покупки, без задержки. */
  _popIn() {
    this.setScale(0.88);
    this._popTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  destroy(fromScene) {
    if (this._idleTween) {
      this._idleTween.remove();
      this._idleTween = null;
    }
    if (this._popTween) {
      this._popTween.remove();
      this._popTween = null;
    }
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }
    super.destroy(fromScene);
  }
}
