import { TEXTURES } from './constants.js';

/**
 * Каталог персонажей PIGEON EMPIRE.
 *
 * Pepper не попадает в каталог покупок: он стартовый и остаётся единственной
 * кликабельной птицей. Здесь собраны только покупаемые голуби первой коллекции.
 */
export const PIGEON_CATALOG = [
  {
    id: 'scout',
    name: 'Голубь-разведчик',
    description: '+1 крошка/сек · пассивно',
    price: 25,
    income: 1,
    max: 1,
    texture: TEXTURES.SCOUT,
    assetPath: 'assets/characters/scout/scout.png',
    displayHeight: 150,
  },
  {
    id: 'courier',
    name: 'Голубь-курьер',
    description: '+3 крошки/сек · быстрая доставка',
    price: 100,
    income: 3,
    max: 1,
    texture: TEXTURES.COURIER,
    assetPath: 'assets/characters/courier/courier.png',
    displayHeight: 155,
  },
  {
    id: 'worker',
    name: 'Голубь-работяга',
    description: '+7 крошек/сек · надёжные руки',
    price: 250,
    income: 7,
    max: 1,
    texture: TEXTURES.WORKER_DISPLAY,
    assetPath: 'assets/characters/worker/worker.png',
    displayHeight: 160,
  },
  {
    id: 'merchant',
    name: 'Голубь-торговец',
    description: '+15 крошек/сек · выгодные сделки',
    price: 600,
    income: 15,
    max: 1,
    texture: TEXTURES.MERCHANT,
    assetPath: 'assets/characters/merchant/merchant.png',
    displayHeight: 165,
  },
  {
    id: 'scientist',
    name: 'Голубь-учёный',
    description: '+35 крошек/сек · научный подход',
    price: 1500,
    income: 35,
    max: 1,
    texture: TEXTURES.SCIENTIST,
    assetPath: 'assets/characters/scientist/scientist.png',
    displayHeight: 168,
  },
  {
    id: 'engineer',
    name: 'Голубь-инженер',
    description: '+80 крошек/сек · техника и схемы',
    price: 3500,
    income: 80,
    max: 1,
    texture: TEXTURES.ENGINEER,
    assetPath: 'assets/characters/engineer/engineer.png',
    displayHeight: 170,
  },
  {
    id: 'guard',
    name: 'Голубь-охранник',
    description: '+180 крошек/сек · порядок на крыше',
    price: 8000,
    income: 180,
    max: 1,
    texture: TEXTURES.GUARD_DISPLAY,
    assetPath: 'assets/characters/guard/guard.png',
    displayHeight: 170,
  },
];

/** Старый экспорт economy.js сохраняем для совместимости импортов. */
export const SHOP_ITEMS = PIGEON_CATALOG;

/**
 * У двух PNG нет альфа-канала: фон сохранён почти чёрным (RGB 0..1).
 * Эти записи используются только в PreloadScene для создания прозрачной
 * runtime-копии; исходные файлы остаются без изменений.
 */
export const MATTE_CLEANUPS = [
  { source: TEXTURES.WORKER, target: TEXTURES.WORKER_DISPLAY },
  { source: TEXTURES.GUARD, target: TEXTURES.GUARD_DISPLAY },
];

export function getPigeon(id) {
  return PIGEON_CATALOG.find((pigeon) => pigeon.id === id) || null;
}

export function getPigeonIds() {
  return PIGEON_CATALOG.map((pigeon) => pigeon.id);
}
