import { DEPTH, ROOF_TOP } from '../game/constants.js';
import { PIGEON_CATALOG } from '../game/pigeons.js';
import { RoofPigeon, FEET_OFFSET } from './RoofPigeon.js';

/** Зазоры между Pepper, голубями и краями игрового поля. */
const GAP_TO_PEPPER = 20;
const GAP_BETWEEN_BIRDS = 24;
const EDGE_MARGIN = 24;

/**
 * Порядок заполнения: сначала задний ряд (все четыре колонки), затем передний.
 * Так 1–4 голуби стоят одной ровной линией у парапета, а второй ряд
 * появляется только с пятого голубя — «постепенное» расширение композиции.
 * Пары справа/слева дают симметрию; нечётное число оставляет одну лишнюю
 * птицу в конце ряда, не смещая остальных.
 *
 * back  — у парапета, front — ближе к зрителю.
 */
const SLOT_ORDER = [
  { side: 'right', column: 'inner', row: 'back' },
  { side: 'left', column: 'inner', row: 'back' },
  { side: 'right', column: 'outer', row: 'back' },
  { side: 'left', column: 'outer', row: 'back' },
  { side: 'right', column: 'inner', row: 'front' },
  { side: 'left', column: 'inner', row: 'front' },
  { side: 'right', column: 'outer', row: 'front' },
  { side: 'left', column: 'outer', row: 'front' },
];

/**
 * Управляет голубями на крыше: слушает экономику, синхронизирует объекты
 * с купленными персонажами и пересчитывает всю композицию после каждой покупки.
 */
export class PigeonFlock {
  constructor(scene, economy, pepper) {
    this.scene = scene;
    this.economy = economy;
    this.pepper = pepper;
    this.birds = new Map();

    this._unsubscribe = economy.onChange((state) => this.sync(state));
    this._onResize = () => this.layout();
    this.scene.scale.on('resize', this._onResize, this);
  }

  sync(state) {
    PIGEON_CATALOG.forEach((pigeon) => {
      const owned = state.pigeons[pigeon.id] > 0;
      const existing = this.birds.get(pigeon.id);

      if (owned && !existing) {
        // Точная позиция выставится ниже, в layout(), до первого кадра.
        this.birds.set(pigeon.id, new RoofPigeon(this.scene, 0, 0, pigeon));
      } else if (!owned && existing) {
        existing.destroy();
        this.birds.delete(pigeon.id);
      }
    });

    this.layout();
  }

  /** Пересчитывает позиции всех голубей под текущий набор и размер поля. */
  layout() {
    if (this.birds.size === 0) return;

    const slots = this._buildSlots();
    const owned = PIGEON_CATALOG.filter((pigeon) => this.birds.has(pigeon.id));
    const backY = ROOF_TOP + 6 - FEET_OFFSET;

    owned.forEach((pigeon, index) => {
      const slot = slots[index];
      const bird = this.birds.get(pigeon.id);
      if (!slot || !bird) return;

      bird.setRoofPosition(slot.x, slot.y);
      // Нижний ряд чуть ближе к зрителю, но всё равно за Pepper.
      bird.setDepth(slot.y > backY ? DEPTH.PIGEON - 1 : DEPTH.PIGEON - 2);
    });
  }

  _buildSlots() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const centerX = this.pepper ? this.pepper.x : width / 2;

    const pepperHalf = this.pepper && this.pepper.getFootprint
      ? this.pepper.getFootprint().halfWidth
      : 108;
    const birdHalf = Math.max(
      80,
      ...Array.from(this.birds.values()).map((bird) => bird.getFootprint().halfWidth),
    );

    const innerOffset = pepperHalf + GAP_TO_PEPPER + birdHalf;

    // Если игровое поле уже стандартного, сжимаем зазор между колонками,
    // но не меньше минимума, чтобы соседи никогда не касались друг друга.
    const halfAvailable = width / 2 - EDGE_MARGIN - birdHalf;
    const minOuter = innerOffset + birdHalf * 2 + 8;
    const outerOffset = Math.min(
      innerOffset + birdHalf * 2 + GAP_BETWEEN_BIRDS,
      Math.max(minOuter, halfAvailable),
    );

    // SLOT_ORDER хранит уровень лап; контейнер сидит на FEET_OFFSET выше.
    const backY = ROOF_TOP + 6 - FEET_OFFSET;
    const frontY = height - 16 - FEET_OFFSET;

    const clampX = (x) => Math.min(
      width - birdHalf - EDGE_MARGIN,
      Math.max(birdHalf + EDGE_MARGIN, x),
    );

    return SLOT_ORDER.map(({ side, column, row }) => {
      const distance = column === 'outer' ? outerOffset : innerOffset;
      return {
        x: clampX(centerX + (side === 'right' ? distance : -distance)),
        y: row === 'front' ? frontY : backY,
      };
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
    if (this._onResize) {
      this.scene.scale.off('resize', this._onResize, this);
      this._onResize = null;
    }

    this.birds.forEach((bird) => bird.destroy());
    this.birds.clear();
  }
}
