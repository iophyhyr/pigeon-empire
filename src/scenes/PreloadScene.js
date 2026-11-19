import Phaser from 'phaser';

import { SCENE_KEYS, TEXTURES } from '../game/constants.js';

const BASE = import.meta.env.BASE_URL;

/**
 * PreloadScene — единственное место, где грузятся ассеты.
 *
 * Ассеты лежат в `public/assets/...`, поэтому Vite отдаёт их по тому же
 * относительному пути и в dev-режиме, и в собранном `dist`.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload() {
    this.load.image(TEXTURES.PEPPER, `${BASE}assets/characters/pepper/pepper.png`);

    this.load.on('progress', (value) => {
      console.debug(`[PIGEON EMPIRE] loading ${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file) => {
      console.error(`[PIGEON EMPIRE] failed to load: ${file.key} (${file.src})`);
    });
  }

  create() {
    this.scene.start(SCENE_KEYS.GAME);
  }
}
