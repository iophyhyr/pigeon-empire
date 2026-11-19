import Phaser from 'phaser';

import { SCENE_KEYS } from '../game/constants.js';

/**
 * BootScene — самый первый экран: здесь выполняются только технические
 * настройки (масштабирование, глобальные флаги), без загрузки ассетов.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    // Полезно при отладке: видно, какая версия движка реально запущена.
    console.info(`[PIGEON EMPIRE] Phaser ${Phaser.VERSION}`);

    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
