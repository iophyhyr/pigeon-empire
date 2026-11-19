import Phaser from 'phaser';

import { DEPTH, TEXTURES } from '../game/constants.js';

/** Высота персонажа на экране (игровые пиксели). */
const DISPLAY_HEIGHT = 260;

/** Куда «встают» лапы в локальных координатах контейнера (уровень крыши). */
const FEET_OFFSET = 101;

/**
 * Видимая (непрозрачная) область спрайта в пикселях исходного PNG.
 * Измерена по альфа-каналу: 1312x1199, прозрачные поля сверху/слева/справа внизу.
 * Нужна, чтобы хитбокс совпадал с персонажем, а не с прозрачными полями.
 */
const CONTENT_BOX = { x: 141, y: 18, width: 993, height: 1176 };

/**
 * Pepper — главный персонаж (PNG + прозрачность).
 * Контейнер держит позицию и хитбокс, картинка внутри — idle-анимацию.
 */
export class Pepper extends Phaser.GameObjects.Container {
  constructor(scene, x, y, onTap) {
    super(scene, x, y);

    this.onTap = onTap;
    this._baseY = y;
    this._idleTween = null;
    this._pressTween = null;

    scene.add.existing(this);
    this.setDepth(DEPTH.PIGEON);

    this._buildSprite();
    this._setupHitbox();

    this.on('pointerdown', this.press, this);
    this._startIdle();
  }

  _buildSprite() {
    const image = this.scene.add.image(0, FEET_OFFSET, TEXTURES.PEPPER).setOrigin(0.5, 1);

    // Масштабируем по высоте с сохранением пропорций PNG.
    this._baseScale = DISPLAY_HEIGHT / image.height;
    image.setScale(this._baseScale);

    this.image = image;
    this.add(image);
  }

  /**
   * Хитбокс — прямоугольник по видимой части спрайта, а не по всему PNG
   * (у файла есть прозрачные поля). Такой размер удобен и мышью, и пальцем.
   */
  _setupHitbox() {
    const scale = this.image.scaleY;
    const displayWidth = this.image.displayWidth;
    const displayHeight = this.image.displayHeight;

    const left = -displayWidth / 2 + CONTENT_BOX.x * scale;
    const top = FEET_OFFSET - displayHeight + CONTENT_BOX.y * scale;

    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(
        left,
        top,
        CONTENT_BOX.width * scale,
        CONTENT_BOX.height * scale,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
  }

  /**
   * Idle: покачивание тела + лёгкое «дыхание» масштабом.
   * Точка опоры — низ спрайта, поэтому лапы остаются на крыше,
   * а масштаб меняется равномерно по обеим осям (PNG не искажается).
   */
  _startIdle() {
    if (this._idleTween) this._idleTween.stop();

    const breathScale = this._baseScale * 1.015;

    this._idleTween = this.scene.tweens.add({
      targets: this.image,
      y: FEET_OFFSET - 9,
      scaleX: breathScale,
      scaleY: breathScale,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Реакция на нажатие: короткое сжатие с подскоком и возврат в исходное положение. */
  press() {
    if (this._pressTween) this._pressTween.stop();

    this.setY(this._baseY);
    this.setScale(1);

    this._pressTween = this.scene.tweens.add({
      targets: this,
      y: this._baseY - 18,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 110,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.setY(this._baseY);
        this.setScale(1);
      },
    });

    if (this.onTap) this.onTap();
  }
}
