import Phaser from 'phaser';

import { SCENE_KEYS, TEXTURES } from '../game/constants.js';
import { MATTE_CLEANUPS, PIGEON_CATALOG } from '../game/pigeons.js';

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
    const assets = [
      { key: TEXTURES.PEPPER, path: 'assets/characters/pepper/pepper.png' },
      ...PIGEON_CATALOG.map((pigeon) => ({ key: pigeon.id, path: pigeon.assetPath })),
    ];

    // Загружаем исходные файлы под их «сырыми» ключами. Для worker/guard позже
    // будут созданы display-копии с прозрачным фоном.
    const rawKeys = {
      [TEXTURES.WORKER_DISPLAY]: TEXTURES.WORKER,
      [TEXTURES.GUARD_DISPLAY]: TEXTURES.GUARD,
    };

    assets.forEach((asset) => {
      const key = rawKeys[asset.key] || asset.key;
      this.load.image(key, `${BASE}${asset.path}`);
    });

    this.load.on('progress', (value) => {
      console.debug(`[PIGEON EMPIRE] loading ${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file) => {
      console.error(`[PIGEON EMPIRE] failed to load: ${file.key} (${file.src})`);
    });
  }

  create() {
    MATTE_CLEANUPS.forEach(({ source, target }) => this._makeTransparentCopy(source, target));
    this.scene.start(SCENE_KEYS.GAME);
  }

  /**
   * Некоторые PNG должны быть с альфой, но сохранены как RGB с почти чёрным
   * фоном. Делаем прозрачную копию только в памяти: исходные файлы не трогаем.
   *
   * Обходим только чёрные пиксели, связанные с краями изображения. Тёмные
   * детали внутри персонажа (глаза, контуры) остаются непрозрачными.
   */
  _makeTransparentCopy(sourceKey, targetKey) {
    if (this.textures.exists(targetKey)) return;

    const sourceTexture = this.textures.get(sourceKey);
    const source = sourceTexture && sourceTexture.getSourceImage ? sourceTexture.getSourceImage() : null;
    if (!source || !source.width || !source.height) return;

    const canvasTexture = this.textures.createCanvas(targetKey, source.width, source.height);
    if (!canvasTexture) return;

    try {
      canvasTexture.draw(0, 0, source, false);

      const { width, height } = source;
      const imageData = canvasTexture.getData(0, 0, width, height);
      const pixels = imageData.data;
      const visited = new Uint8Array(width * height);
      const stack = [];

      const isMatte = (index) => {
        const offset = index * 4;
        return pixels[offset] <= 4 && pixels[offset + 1] <= 4 && pixels[offset + 2] <= 4;
      };

      const push = (index) => {
        if (index < 0 || visited[index] || !isMatte(index)) return;
        visited[index] = 1;
        stack.push(index);
      };

      // Запускаем обход от всех четырёх краёв: это гарантированно фон.
      for (let x = 0; x < width; x += 1) {
        push(x);
        push((height - 1) * width + x);
      }
      for (let y = 0; y < height; y += 1) {
        push(y * width);
        push(y * width + width - 1);
      }

      while (stack.length > 0) {
        const index = stack.pop();
        pixels[index * 4 + 3] = 0;

        const x = index % width;
        const y = (index - x) / width;

        if (x > 0) push(index - 1);
        if (x < width - 1) push(index + 1);
        if (y > 0) push(index - width);
        if (y < height - 1) push(index + width);
      }

      canvasTexture.putData(imageData, 0, 0);
      canvasTexture.refresh();
    } catch (error) {
      console.warn(`[PIGEON EMPIRE] cannot clean texture ${sourceKey}`, error);
    }
  }
}
