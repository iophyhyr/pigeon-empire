/**
 * Экономика игры: крошки, купленные голуби, пассивный доход и сохранение.
 *
 * Модуль не зависит от Phaser — его можно проверить отдельно и использовать
 * из любой сцены. Все числа целые, чтобы не копить ошибки округления.
 */

export const SAVE_KEY = 'pigeon-empire.save.v1';

/** Страховка от случайно испорченного/огромного значения в сохранении. */
const MAX_CRUMBS = 1_000_000_000_000;

/** Товары магазина. Пока один, но структура готова к расширению. */
export const SHOP_ITEMS = [
  {
    id: 'scout',
    name: 'Голубь-разведчик',
    description: '+1 крошка/сек · пассивно',
    price: 25,
    income: 1,
    max: 1,
  },
];

/** Хранилище по умолчанию: LocalStorage, а если он недоступен — память процесса. */
function resolveStorage(storage) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    return storage;
  }

  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Доступ к storage может быть запрещён настройками браузера.
  }

  return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

function safeInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function emptyState() {
  const pigeons = {};
  SHOP_ITEMS.forEach((item) => {
    pigeons[item.id] = 0;
  });
  return { crumbs: 0, pigeons };
}

/** Приводим любые данные из localStorage к корректному состоянию. */
function sanitize(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;

  state.crumbs = safeInteger(raw.crumbs, 0, MAX_CRUMBS);

  const savedPigeons = raw.pigeons && typeof raw.pigeons === 'object' ? raw.pigeons : {};
  SHOP_ITEMS.forEach((item) => {
    state.pigeons[item.id] = safeInteger(savedPigeons[item.id], 0, item.max);
  });

  // `income` в сохранении только для информации: доход всегда пересчитываем
  // из купленных голубей, чтобы подмена сохранения не дала неверных значений.
  return state;
}

export class Economy {
  constructor(storage) {
    this.storage = resolveStorage(storage);
    this.listeners = new Set();

    const saved = this._read();
    this.crumbs = saved.crumbs;
    this.pigeons = saved.pigeons;
    this.income = this._calculateIncome();
  }

  getState() {
    return {
      crumbs: this.crumbs,
      income: this.income,
      pigeons: { ...this.pigeons },
    };
  }

  getPurchased(id) {
    const value = this.pigeons[id];
    return Number.isInteger(value) && value > 0 ? value : 0;
  }

  /** Подписка на изменения; сразу возвращает текущее состояние. */
  onChange(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Клик по Pepper. */
  addClicks(amount = 1) {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value <= 0) return;

    this.crumbs = Math.min(MAX_CRUMBS, this.crumbs + value);
    this._commit();
  }

  /** Пассивный доход за одну секунду. */
  tick() {
    if (this.income <= 0) return;

    this.crumbs = Math.min(MAX_CRUMBS, this.crumbs + this.income);
    this._commit();
  }

  canBuy(id) {
    const item = SHOP_ITEMS.find((entry) => entry.id === id);
    if (!item) return false;
    return this.getPurchased(id) < item.max && this.crumbs >= item.price;
  }

  buy(id) {
    const item = SHOP_ITEMS.find((entry) => entry.id === id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (this.getPurchased(id) >= item.max) return { ok: false, reason: 'maxed' };
    if (this.crumbs < item.price) {
      return { ok: false, reason: 'insufficient', missing: item.price - this.crumbs };
    }

    this.crumbs -= item.price;
    this.pigeons[id] = this.getPurchased(id) + 1;
    this.income = this._calculateIncome();
    this._commit();

    return { ok: true, item };
  }

  _calculateIncome() {
    return SHOP_ITEMS.reduce(
      (total, item) => total + this.getPurchased(item.id) * item.income,
      0,
    );
  }

  _commit() {
    this._save();
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  _save() {
    try {
      this.storage.setItem(
        SAVE_KEY,
        JSON.stringify({
          crumbs: this.crumbs,
          pigeons: this.pigeons,
          income: this.income,
        }),
      );
    } catch {
      // Нельзя писать в localStorage — игра продолжает работать в памяти.
    }
  }

  _read() {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : emptyState();
    } catch {
      return emptyState();
    }
  }
}
