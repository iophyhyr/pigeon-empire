import { PIGEON_CATALOG } from '../game/pigeons.js';
import { RoofPigeon } from './RoofPigeon.js';

/**
 * Фиксированные места на крыше. Два ряда позволяют не накладывать голубей
 * друг на друга: задний ряд стоит у парапета, передний — ближе к зрителю.
 * Pepper занимает центр.
 */
const SLOTS = {
  courier: { x: 170, y: 408 },
  merchant: { x: 360, y: 408 },
  engineer: { x: 920, y: 408 },
  scout: { x: 900, y: 598 },
  worker: { x: 180, y: 598 },
  scientist: { x: 380, y: 598 },
  guard: { x: 1100, y: 598 },
};

/**
 * Управляет голубями на крыше: слушает экономику и синхронизирует объекты
 * с фактически купленными персонажами.
 */
export class PigeonFlock {
  constructor(scene, economy) {
    this.scene = scene;
    this.economy = economy;
    this.birds = new Map();

    this._unsubscribe = economy.onChange((state) => this.sync(state));
  }

  sync(state) {
    PIGEON_CATALOG.forEach((pigeon) => {
      const owned = state.pigeons[pigeon.id] > 0;
      const existing = this.birds.get(pigeon.id);

      if (owned && !existing) {
        const slot = SLOTS[pigeon.id];
        if (!slot) return;
        this.birds.set(pigeon.id, new RoofPigeon(this.scene, slot.x, slot.y, pigeon));
      } else if (!owned && existing) {
        existing.destroy();
        this.birds.delete(pigeon.id);
      }
    });
  }

  get(id) {
    return this.birds.get(id) || null;
  }

  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.birds.forEach((bird) => bird.destroy());
    this.birds.clear();
  }
}
