/**
 * Экономика игры: крошки, купленные голуби, улучшения, пассивный доход
 * и сохранение. Это единственный модуль, который меняет игровые числа.
 *
 * Доход голубей и бонусы улучшений считаются раздельно; в сохранении лежит
 * только уровни, а не готовые эффекты. При загрузке всё пересчитывается заново.
 * Здесь же учитываются все заработанные крошки и выдаются награды достижений.
 */

import { PIGEON_CATALOG, SHOP_ITEMS, getPigeon } from './pigeons.js';
import {
  ACHIEVEMENT_CATALOG,
  createAchievementState,
  isAchievementMet,
  buildAchievementStatuses,
} from './achievements.js';
import {
  UPGRADE_CATALOG,
  createUpgradeLevels,
  getUpgrade,
  getUpgradePrice,
  getClickPower,
  getIncomeMultiplier,
} from './upgrades.js';
import { formatAmount } from './format.js';

/** Ключ сохранения не меняем: старый прогресс игрока должен подхватиться. */
export const SAVE_KEY = 'pigeon-empire.save.v1';

/** v4 добавил достижения и суммарно заработанные крошки; старые ключи мигрируют. */
export const SAVE_VERSION = 4;

/** Страховка от случайно испорченного/огромного значения в сохранении. */
const MAX_CRUMBS = 1_000_000_000_000;

export { SHOP_ITEMS, UPGRADE_CATALOG };

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

/** Крошки могут быть дробными из-за процентного дохода — храним 2 знака. */
function safeAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(MAX_CRUMBS, Math.max(0, round2(number)));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function emptyState() {
  const pigeons = {};
  PIGEON_CATALOG.forEach((pigeon) => {
    pigeons[pigeon.id] = 0;
  });
  return {
    crumbs: 0,
    pigeons,
    upgrades: createUpgradeLevels(),
    totalEarnedCrumbs: 0,
    achievements: createAchievementState(),
  };
}

/** Приводим любые данные из localStorage к корректному состоянию. */
function sanitize(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;

  state.crumbs = safeAmount(raw.crumbs);

  const savedPigeons = raw.pigeons && typeof raw.pigeons === 'object' ? raw.pigeons : {};
  PIGEON_CATALOG.forEach((pigeon) => {
    let saved = savedPigeons[pigeon.id];

    // Миграция очень старых сохранений, где scout мог лежать отдельным полем.
    if (pigeon.id === 'scout' && saved === undefined) saved = raw.scout;

    state.pigeons[pigeon.id] = safeInteger(saved, 0, pigeon.max);
  });

  // Улучшения в старых сохранениях отсутствуют — это нулевые уровни, не бонусы.
  const savedUpgrades =
    raw.upgrades && typeof raw.upgrades === 'object' && !Array.isArray(raw.upgrades)
      ? raw.upgrades
      : {};
  UPGRADE_CATALOG.forEach((definition) => {
    state.upgrades[definition.id] = safeInteger(
      savedUpgrades[definition.id],
      0,
      definition.maxLevel,
    );
  });

  // Достижения из старых сохранений отсутствуют: это невыполненные достижения,
  // а не выданные награды. Проверка условий при загрузке не запускается.
  state.totalEarnedCrumbs = safeAmount(raw.totalEarnedCrumbs);

  const savedAchievements =
    raw.achievements && typeof raw.achievements === 'object' && !Array.isArray(raw.achievements)
      ? raw.achievements
      : {};
  ACHIEVEMENT_CATALOG.forEach((definition) => {
    state.achievements[definition.id] = savedAchievements[definition.id] === true;
  });

  // `income` в сохранении только для информации: доход и сила клика всегда
  // пересчитываются из купленных голубей и уровней улучшений.
  return state;
}

export class Economy {
  constructor(storage) {
    this.storage = resolveStorage(storage);
    this.listeners = new Set();
    this.achievementListeners = new Set();
    this._unlockQueue = [];

    const saved = this._read();
    this.crumbs = saved.crumbs;
    this.pigeons = saved.pigeons;
    this.upgrades = saved.upgrades;
    this.totalEarnedCrumbs = saved.totalEarnedCrumbs;
    this.achievements = saved.achievements;
    this._recalculate();
  }

  getState() {
    return {
      crumbs: this.crumbs,
      baseIncome: this.baseIncome,
      income: this.income,
      clickPower: this.clickPower,
      pigeons: { ...this.pigeons },
      upgrades: { ...this.upgrades },
      totalEarnedCrumbs: this.totalEarnedCrumbs,
      achievements: { ...this.achievements },
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

  /**
   * Подписка на свежеполученные достижения. Слушатель получает пачку
   * определений — UI ставит их в очередь уведомлений, а не показывает все сразу.
   */
  onAchievement(listener) {
    this.achievementListeners.add(listener);
    return () => this.achievementListeners.delete(listener);
  }

  /**
   * Клик по Pepper. Без аргумента используется текущая сила клика.
   * Возвращает фактически начисленное значение (0 на потолке крошек).
   */
  addClicks(amount) {
    const value = amount === undefined || amount === null
      ? this.clickPower
      : Math.floor(Number(amount));

    if (!Number.isFinite(value) || value <= 0) return 0;

    const before = this.crumbs;
    this.crumbs = Math.min(MAX_CRUMBS, round2(before + value));
    const gained = round2(this.crumbs - before);

    if (gained > 0) {
      this.totalEarnedCrumbs = safeAmount(this.totalEarnedCrumbs + gained);
      this._commit();
    }
    return gained;
  }

  /** Пассивный доход за одну секунду. */
  tick() {
    if (this.income <= 0) return;

    const before = this.crumbs;
    this.crumbs = Math.min(MAX_CRUMBS, round2(before + this.income));
    const gained = round2(this.crumbs - before);

    if (gained > 0) {
      this.totalEarnedCrumbs = safeAmount(this.totalEarnedCrumbs + gained);
      this._commit();
    }
  }

  canBuy(id) {
    const pigeon = getPigeon(id);
    if (!pigeon) return false;
    return this.getPurchased(id) < pigeon.max && this.crumbs >= pigeon.price;
  }

  /**
   * Покупка одного голубя. Вызов синхронный: даже двойной клик не спишет
   * две цены, потому что второй вызов увидит уже купленного голубя.
   */
  buy(id) {
    const pigeon = getPigeon(id);
    if (!pigeon) return { ok: false, reason: 'unknown' };
    if (this.getPurchased(id) >= pigeon.max) return { ok: false, reason: 'maxed' };
    if (this.crumbs < pigeon.price) {
      return { ok: false, reason: 'insufficient', missing: pigeon.price - this.crumbs };
    }

    this.crumbs -= pigeon.price;
    this.pigeons[id] = this.getPurchased(id) + 1;
    this._recalculate();
    this._commit();

    return { ok: true, pigeon };
  }

  // -------------------------------------------------------------------------
  // Улучшения
  // -------------------------------------------------------------------------

  getUpgradeLevel(id) {
    const definition = getUpgrade(id);
    if (!definition) return 0;
    return safeInteger(this.upgrades[id], 0, definition.maxLevel);
  }

  /** Цена следующего уровня; `null` для завершённого улучшения. */
  getUpgradePrice(id) {
    const definition = getUpgrade(id);
    if (!definition) return null;
    return getUpgradePrice(definition, this.getUpgradeLevel(id));
  }

  /** Всё, что нужно карточке магазина, в одном вызове. */
  getUpgradeStatus(id) {
    const definition = getUpgrade(id);
    if (!definition) return null;

    const level = this.getUpgradeLevel(id);
    const maxLevel = definition.maxLevel;
    const price = getUpgradePrice(definition, level);
    const done = level >= maxLevel;
    const missing = done || price === null ? 0 : round2(Math.max(0, price - this.crumbs));

    return {
      definition,
      level,
      maxLevel,
      price,
      done,
      affordable: !done && price !== null && this.crumbs >= price,
      missing,
    };
  }

  canBuyUpgrade(id) {
    const status = this.getUpgradeStatus(id);
    return !!(status && status.affordable);
  }

  /**
   * Покупка уровня улучшения. Проверка и списание идут синхронно, поэтому
   * два быстрых нажатия не могут списать цену дважды.
   */
  buyUpgrade(id) {
    const definition = getUpgrade(id);
    if (!definition) return { ok: false, reason: 'unknown' };

    const level = this.getUpgradeLevel(id);
    if (level >= definition.maxLevel) {
      return { ok: false, reason: 'maxed', upgrade: definition };
    }

    const price = getUpgradePrice(definition, level);
    if (price === null || !Number.isFinite(price) || price <= 0) {
      return { ok: false, reason: 'invalid', upgrade: definition };
    }

    if (this.crumbs < price) {
      return {
        ok: false,
        reason: 'insufficient',
        upgrade: definition,
        price,
        missing: round2(price - this.crumbs),
      };
    }

    this.crumbs = round2(this.crumbs - price);
    this.upgrades[id] = level + 1;
    this._recalculate();
    this._commit();

    return { ok: true, upgrade: definition, level: level + 1, price };
  }

  // -------------------------------------------------------------------------
  // Достижения
  // -------------------------------------------------------------------------

  /** Сколько голубей куплено всего (все типы по одному). */
  getTotalPigeons() {
    return PIGEON_CATALOG.reduce((sum, pigeon) => sum + this.getPurchased(pigeon.id), 0);
  }

  /** Метрики для чистых функций из achievements.js. */
  getAchievementMetrics() {
    return {
      totalCrumbs: this.totalEarnedCrumbs,
      pigeons: this.getTotalPigeons(),
      income: this.income,
      clickPower: this.clickPower,
      roofUpgrade: this.getUpgradeLevel('betterRoof'),
    };
  }

  getAchievementStatuses() {
    return buildAchievementStatuses(this.getAchievementMetrics(), this.achievements);
  }

  /**
   * Проверка после каждой операции, меняющей экономику. Награды тоже считаются
   * заработком, поэтому цикл повторяется, пока не останется новых условий.
   * Каждое achievement отмечается один раз: повторной выдачи не бывает.
   */
  _checkAchievements() {
    for (let pass = 0; pass <= ACHIEVEMENT_CATALOG.length; pass += 1) {
      const metrics = this.getAchievementMetrics();
      const newly = ACHIEVEMENT_CATALOG.filter(
        (definition) => !this.achievements[definition.id] && isAchievementMet(definition, metrics),
      );
      if (!newly.length) break;

      newly.forEach((definition) => {
        this.achievements[definition.id] = true;
        const reward = safeAmount(definition.reward);
        this.totalEarnedCrumbs = safeAmount(this.totalEarnedCrumbs + reward);
        this.crumbs = safeAmount(this.crumbs + reward);
        this._unlockQueue.push(definition);
      });
    }
  }

  // -------------------------------------------------------------------------
  // Расчёты и сохранение
  // -------------------------------------------------------------------------

  _recalculate() {
    this.baseIncome = this._calculateBaseIncome();
    this.clickPower = getClickPower(this.upgrades);
    this.income = round2(this.baseIncome * getIncomeMultiplier(this.upgrades));
  }

  _calculateBaseIncome() {
    return PIGEON_CATALOG.reduce(
      (total, pigeon) => total + this.getPurchased(pigeon.id) * pigeon.income,
      0,
    );
  }

  _commit() {
    this._checkAchievements();
    this._save();
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));

    if (this._unlockQueue.length) {
      const batch = this._unlockQueue.splice(0);
      this.achievementListeners.forEach((listener) => listener(batch));
    }
  }

  _save() {
    try {
      this.storage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: SAVE_VERSION,
          crumbs: this.crumbs,
          pigeons: this.pigeons,
          upgrades: this.upgrades,
          baseIncome: this.baseIncome,
          income: this.income,
          clickPower: this.clickPower,
          totalEarnedCrumbs: this.totalEarnedCrumbs,
          achievements: this.achievements,
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

/** Экспорт для сообщений об ошибках: «не хватает N крошек». */
export { formatAmount };
