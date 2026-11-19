import Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { GameScene } from '../scenes/GameScene.js';

/**
 * Конфигурация Phaser.
 * Физика пока не подключена намеренно: прототипу она не нужна.
 */
export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#4fb3ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // Несколько одновременных касаний — чтобы можно было «долбить» голубя двумя пальцами.
  input: {
    activePointers: 3,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [BootScene, PreloadScene, GameScene],
};
