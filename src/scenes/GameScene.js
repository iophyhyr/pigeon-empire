import Phaser from 'phaser';

import { SCENE_KEYS, GAME_WIDTH, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { Economy } from '../game/economy.js';
import { buildBackdrop } from '../world/Backdrop.js';
import { Pepper } from '../objects/Pepper.js';
import { PigeonFlock } from '../objects/PigeonFlock.js';
import { Hud } from '../ui/Hud.js';
import { ShopPanel } from '../ui/ShopPanel.js';

const PEPPER_X = GAME_WIDTH / 2;
const PEPPER_Y = 470;

/**
 * Основной игровой экран: крыша, Pepper, экономика, магазин и голуби.
 * Экономика живёт в отдельном модуле; сцена только связывает её с UI и объектами.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  /** Удобный доступ к состоянию (например, из консоли браузера). */
  get crumbs() {
    return this.economy ? this.economy.crumbs : 0;
  }

  create() {
    this.economy = new Economy();
    this._unsubscribers = [];

    buildBackdrop(this);

    // тень на крыше — отдельно от персонажа, чтобы не подпрыгивала вместе с ним
    this.add
      .graphics()
      .setDepth(DEPTH.SHADOW)
      .fillStyle(COLORS.shadow, 0.18)
      .fillEllipse(PEPPER_X, PEPPER_Y + 104, 190, 36);

    this.pepper = new Pepper(this, PEPPER_X, PEPPER_Y, () => this.collectCrumb());

    this.hud = new Hud(this, { onShop: () => this.shop.open() });
    this.shop = new ShopPanel(this, this.economy);
    this.flock = new PigeonFlock(this, this.economy);

    this._unsubscribers.push(
      this.economy.onChange((state) => {
        this.hud.setCrumbs(state.crumbs);
        this.hud.setIncome(state.income);
      }),
    );

    // Пассивный доход начисляется раз в секунду; при доходе 0 вызов ничего не меняет.
    this.incomeTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.economy.tick(),
    });

    this.events.once('shutdown', () => this._cleanup());
  }

  /** Клик по Pepper: +1 крошка, пульс счётчика и всплывающий «+1». */
  collectCrumb(amount = 1) {
    this.economy.addClicks(amount);
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

  _cleanup() {
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._unsubscribers = [];
    if (this.incomeTimer) this.incomeTimer.remove();
    if (this.flock) this.flock.destroy();
    if (this.shop) this.shop.destroy();
  }
}
