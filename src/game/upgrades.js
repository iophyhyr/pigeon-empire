/**
 * Каталог улучшений PIGEON EMPIRE.
 *
 * Здесь только данные и чистые функции расчёта: экономика импортирует их
 * и остаётся единственным местом, где меняются крошки, уровни и доход.
 */

/** Защита от невероятно большой цены при повреждённом уровне в сохранении. */
const MAX_PRICE = 1_000_000_000_000;

export const UPGRADE_CATALOG = [
  {
    id: 'bigBread',
    name: 'Большой кусок хлеба',
    description: '+1 крошка за клик за каждый уровень',
    basePrice: 100,
    growth: 1.5,
    maxLevel: 10,
    kind: 'click',
    perLevel: 1,
  },
  {
    id: 'tastyBait',
    name: 'Вкусная приманка',
    description: '+2 крошки за клик за каждый уровень',
    basePrice: 500,
    growth: 1.75,
    maxLevel: 5,
    kind: 'click',
    perLevel: 2,
  },
  {
    id: 'cozyNest',
    name: 'Уютное гнездо',
    description: '+10% к пассивному доходу за уровень',
    basePrice: 1000,
    growth: 1.6,
    maxLevel: 10,
    kind: 'income',
    perLevel: 0.1,
  },
  {
    id: 'betterRoof',
    name: 'Крыша получше',
    description: '+25% к пассивному доходу · один раз',
    basePrice: 5000,
    growth: 1,
    maxLevel: 1,
    kind: 'income',
    perLevel: 0.25,
    once: true,
  },
];

export function getUpgrade(id) {
  return UPGRADE_CATALOG.find((upgrade) => upgrade.id === id) || null;
}

export function getUpgradeIds() {
  return UPGRADE_CATALOG.map((upgrade) => upgrade.id);
}

/** Нулевые уровни для нового/повреждённого сохранения. */
export function createUpgradeLevels() {
  const levels = {};
  UPGRADE_CATALOG.forEach((upgrade) => {
    levels[upgrade.id] = 0;
  });
  return levels;
}

/** Цена следующего уровня; `null`, если улучшение уже завершено. */
export function getUpgradePrice(definition, level) {
  if (!definition || level >= definition.maxLevel) return null;

  const price = definition.once
    ? definition.basePrice
    : Math.ceil(definition.basePrice * definition.growth ** level);

  if (!Number.isFinite(price) || price <= 0) return MAX_PRICE;
  return Math.min(MAX_PRICE, Math.floor(price));
}

/** Сила клика: базовая 1 + все бонусы клика. */
export function getClickPower(levels) {
  let power = 1;

  UPGRADE_CATALOG.forEach((definition) => {
    if (definition.kind !== 'click') return;
    const level = safeLevel(levels, definition);
    power += level * definition.perLevel;
  });

  return Number.isFinite(power) ? power : 1;
}

/**
 * Множитель пассивного дохода. Все бонусы суммируются до применения:
 * 100 × (1 + 0.30 + 0.25) = 155, а не последовательные округления.
 */
export function getIncomeMultiplier(levels) {
  let bonus = 0;

  UPGRADE_CATALOG.forEach((definition) => {
    if (definition.kind !== 'income') return;
    bonus += safeLevel(levels, definition) * definition.perLevel;
  });

  return Number.isFinite(bonus) ? round2(1 + bonus) : 1;
}

function safeLevel(levels, definition) {
  const value = Number(levels && levels[definition.id]);
  if (!Number.isFinite(value)) return 0;
  return Math.min(definition.maxLevel, Math.max(0, Math.floor(value)));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
