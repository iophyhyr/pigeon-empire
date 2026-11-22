/**
 * Каталог достижений PIGEON EMPIRE и чистые функции прогресса.
 *
 * Экономика импортирует отсюда условия и награды; здесь не меняются крошки,
 * уровни и сохранения — это остаётся ответственностью `economy.js`.
 */

import { formatAmount } from './format.js';

/**
 * `metric` — имя числа в `Economy.getAchievementMetrics()`.
 * `unit` — суффикс шкалы в окне достижений; у событийных достижений не нужен.
 */
export const ACHIEVEMENT_CATALOG = [
  {
    id: 'firstCrumb',
    name: 'Первая крошка',
    description: 'Собрать 1 крошку за всё время',
    reward: 10,
    metric: 'totalCrumbs',
    target: 1,
    unit: 'крошек',
  },
  {
    id: 'breadMagnate',
    name: 'Хлебный магнат',
    description: 'Собрать 100 крошек за всё время',
    reward: 50,
    metric: 'totalCrumbs',
    target: 100,
    unit: 'крошек',
  },
  {
    id: 'hungryPigeon',
    name: 'Голодный голубь',
    description: 'Собрать 1 000 крошек за всё время',
    reward: 100,
    metric: 'totalCrumbs',
    target: 1000,
    unit: 'крошек',
  },
  {
    id: 'breadThief',
    name: 'Воришка хлеба',
    description: 'Собрать 10 000 крошек за всё время',
    reward: 250,
    metric: 'totalCrumbs',
    target: 10000,
    unit: 'крошек',
  },
  {
    id: 'firstHelper',
    name: 'Первый помощник',
    description: 'Купить первого голубя',
    reward: 50,
    metric: 'pigeons',
    target: 1,
    unit: 'голубя',
  },
  {
    id: 'pigeonGang',
    name: 'Голубиная банда',
    description: 'Купить 3 голубей',
    reward: 150,
    metric: 'pigeons',
    target: 3,
    unit: 'голубя',
  },
  {
    id: 'birdEmpire',
    name: 'Империя птиц',
    description: 'Приобрести все 7 типов голубей',
    reward: 500,
    metric: 'pigeons',
    target: 7,
    unit: 'типов голубей',
  },
  {
    id: 'workforce',
    name: 'Рабочая сила',
    description: 'Достичь пассивного дохода 10 крошек/сек',
    reward: 100,
    metric: 'income',
    target: 10,
    unit: 'крошек/сек',
  },
  {
    id: 'business',
    name: 'Бизнес пошёл',
    description: 'Достичь пассивного дохода 100 крошек/сек',
    reward: 300,
    metric: 'income',
    target: 100,
    unit: 'крошек/сек',
  },
  {
    id: 'clicker',
    name: 'Кликер',
    description: 'Достичь силы клика 5',
    reward: 100,
    metric: 'clickPower',
    target: 5,
    unit: 'силы клика',
  },
  {
    id: 'heavyArtillery',
    name: 'Тяжёлая артиллерия',
    description: 'Достичь силы клика 10',
    reward: 250,
    metric: 'clickPower',
    target: 10,
    unit: 'силы клика',
  },
  {
    id: 'roofOverHead',
    name: 'Крыша над головой',
    description: 'Купить улучшение «Крыша получше»',
    reward: 200,
    metric: 'roofUpgrade',
    target: 1,
    event: true,
  },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENT_CATALOG.length;

/** Нулевой статус для нового/повреждённого сохранения. */
export function createAchievementState() {
  const state = {};
  ACHIEVEMENT_CATALOG.forEach((definition) => {
    state[definition.id] = false;
  });
  return state;
}

export function getAchievement(id) {
  return ACHIEVEMENT_CATALOG.find((definition) => definition.id === id) || null;
}

/** Текущее значение метрики, ограниченное целью — для шкалы прогресса. */
export function getAchievementProgress(definition, metrics) {
  if (!definition) return 0;
  const value = Number(metrics && metrics[definition.metric]);
  if (!Number.isFinite(value)) return 0;
  return Math.min(definition.target, Math.max(0, Math.floor(value)));
}

/** Условие выполнено: сравнение идёт по исходному значению, без округления. */
export function isAchievementMet(definition, metrics) {
  if (!definition) return false;
  const value = Number(metrics && metrics[definition.metric]);
  if (!Number.isFinite(value)) return false;
  return value >= definition.target;
}

/** Всё, что нужно карточке окна, одним вызовом. */
export function buildAchievementStatuses(metrics, unlocked) {
  return ACHIEVEMENT_CATALOG.map((definition) => {
    const progress = getAchievementProgress(definition, metrics);
    const done = isAchievementMet(definition, metrics);
    const statusUnlocked = !!(unlocked && unlocked[definition.id]);
    const fraction = definition.target > 0
      ? Math.min(1, progress / definition.target)
      : done ? 1 : 0;

    return {
      definition,
      progress,
      target: definition.target,
      fraction,
      done,
      unlocked: statusUnlocked,
      progressText: definition.event
        ? done || statusUnlocked ? 'Выполнено' : 'Не выполнено'
        : `${formatAmount(progress)} / ${formatAmount(definition.target)} ${definition.unit}`,
    };
  });
}
