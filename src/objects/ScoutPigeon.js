import { getPigeon } from '../game/pigeons.js';
import { RoofPigeon } from './RoofPigeon.js';

/**
 * Обратная совместимость: раньше разведчик был отдельным классом.
 * Теперь это частный случай универсального RoofPigeon из каталога.
 */
export class ScoutPigeon extends RoofPigeon {
  constructor(scene, x, y) {
    super(scene, x, y, getPigeon('scout'));
  }
}
