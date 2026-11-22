/**
 * Каталог районов PIGEON EMPIRE и чистые функции работы с ними.
 *
 * Здесь только данные: цены, описания, бонусы и геометрия схематичной карты.
 * Меняют крошки, открывают районы и пересчитывают доход только в `economy.js`.
 * В сохранении хранится факт открытия (булево значение), а не готовый бонус.
 */

/**
 * `incomeBonus` — доля пассивного дохода (0.1 = +10%).
 * `map` — положение и размер области на карте в локальных координатах 784×266.
 * `tint` — цвета района на карте: заливка, рамка, цвет иконки.
 */
export const DISTRICT_CATALOG = [
  {
    id: 'roof',
    name: 'Крыша',
    description: 'Родная крыша Pepper. Отсюда началась голубиная империя.',
    price: 0,
    incomeBonus: 0,
    icon: 'roof',
    map: { x: 24, y: 30, width: 220, height: 98 },
    tint: { fill: 0xffe6c4, border: 0xe3a45c, icon: 0xe8783f },
  },
  {
    id: 'park',
    name: 'Парк',
    description: 'Зелёные аллеи и голубиные деревянные домики. Тихое место для отдыха.',
    price: 10_000,
    incomeBonus: 0.1,
    icon: 'park',
    map: { x: 272, y: 18, width: 228, height: 104 },
    tint: { fill: 0xd9f2d6, border: 0x69b56c, icon: 0x4ca85a },
  },
  {
    id: 'station',
    name: 'Вокзал',
    description: 'Сюда прилетают новые голуби. Пассажирский поток приносит крошки.',
    price: 50_000,
    incomeBonus: 0.15,
    icon: 'station',
    map: { x: 532, y: 34, width: 224, height: 96 },
    tint: { fill: 0xd9e9ff, border: 0x5b93d6, icon: 0x3f7fc7 },
  },
  {
    id: 'industrial',
    name: 'Промзона',
    description: 'Мастерские и пекарни. Здесь пекут хлеб, которым кормят всю стаю.',
    price: 1_000_000,
    incomeBonus: 0.25,
    icon: 'industrial',
    map: { x: 48, y: 150, width: 230, height: 98 },
    tint: { fill: 0xe4e7ee, border: 0x8b9bb3, icon: 0x6c7e99 },
  },
  {
    id: 'market',
    name: 'Рыночная площадь',
    description: 'Торговые ряды с хлебом и зёрном. Шумный район с быстрым оборотом.',
    price: 250_000,
    incomeBonus: 0.2,
    icon: 'market',
    map: { x: 308, y: 142, width: 210, height: 106 },
    tint: { fill: 0xffe1dc, border: 0xe08670, icon: 0xd96a4f },
  },
  {
    id: 'downtown',
    name: 'Центр города',
    description: 'Высотки, золотые витрины и главная голубиная биржа целого города.',
    price: 10_000_000,
    incomeBonus: 0.5,
    icon: 'downtown',
    map: { x: 552, y: 154, width: 204, height: 94 },
    tint: { fill: 0xe8dcff, border: 0x9574d6, icon: 0x7355b8 },
  },
];

export const DISTRICT_COUNT = DISTRICT_CATALOG.length;

export function getDistrict(id) {
  return DISTRICT_CATALOG.find((definition) => definition.id === id) || null;
}

/** Новое сохранение: открыта только стартовая крыша. */
export function createDistrictState() {
  const state = {};
  DISTRICT_CATALOG.forEach((definition) => {
    state[definition.id] = definition.id === 'roof';
  });
  return state;
}

/**
 * Приводим любые данные из сохранения к корректному виду.
 * Поддерживаем и карту `{ park: true }`, и старый список `['park', ...]`.
 * Неизвестные ID, отрицательные значения и дубликаты игнорируются;
 * крыша открыта всегда, сколько бы раз ни было записано обратное.
 */
export function normalizeDistrictState(raw) {
  const state = createDistrictState();
  if (!raw || typeof raw !== 'object') return state;

  if (Array.isArray(raw)) {
    raw.forEach((id) => {
      if (getDistrict(id)) state[id] = true;
    });
    return state;
  }

  DISTRICT_CATALOG.forEach((definition) => {
    if (definition.id !== 'roof' && raw[definition.id] === true) {
      state[definition.id] = true;
    }
  });
  return state;
}

/**
 * Сумма бонусов открытых районов. Промежуточные значения не округляются:
 * итоговую сумму экономика умножит на базовый доход и округлит один раз.
 */
export function getDistrictIncomeBonus(state) {
  let bonus = 0;

  DISTRICT_CATALOG.forEach((definition) => {
    if (state && state[definition.id] === true && Number.isFinite(definition.incomeBonus)) {
      bonus += definition.incomeBonus;
    }
  });

  return Number.isFinite(bonus) ? bonus : 0;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Всё, что нужно информационной карточке и кнопке покупки. */
export function buildDistrictStatus(id, state, crumbs) {
  const definition = getDistrict(id);
  if (!definition) return null;

  const opened = !!(state && state[id] === true);
  const price = definition.price;
  const balance = Number.isFinite(Number(crumbs)) ? Number(crumbs) : 0;
  const missing = opened ? 0 : round2(Math.max(0, price - balance));

  return {
    definition,
    opened,
    price,
    affordable: !opened && balance >= price,
    missing,
    balance,
  };
}
