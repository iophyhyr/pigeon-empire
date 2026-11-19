import Phaser from 'phaser';

import './styles/main.css';
import { gameConfig } from './game/config.js';

/**
 * Точка входа: создаём экземпляр Phaser-игры.
 * Наружу отдаём game — удобно для отладки из консоли браузера.
 */
const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  window.game = game;
}

export default game;
