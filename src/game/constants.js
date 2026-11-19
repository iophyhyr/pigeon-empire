/**
 * Общие константы игры: ключи сцен, базовое разрешение, слои отрисовки.
 * Держим их в одном месте, чтобы не дублировать строки/числа по коду.
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Уровень земли (верхняя кромка крыши) в координатах игрового поля. */
export const ROOF_TOP = 508;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  GAME: 'GameScene',
};

/**
 * Ключи текстур в кэше Phaser (сами файлы грузятся в PreloadScene).
 * WORKER_DISPLAY/GUARD_DISPLAY — runtime-копии с прозрачным фоном: исходные PNG
 * без альфа-канала, и файлы намеренно не изменяются.
 */
export const TEXTURES = {
  PEPPER: 'pepper',
  SCOUT: 'scout',
  COURIER: 'courier',
  WORKER: 'worker',
  WORKER_DISPLAY: 'worker-display',
  MERCHANT: 'merchant',
  SCIENTIST: 'scientist',
  ENGINEER: 'engineer',
  GUARD: 'guard',
  GUARD_DISPLAY: 'guard-display',
};

/** Порядок отрисовки: больше число — ближе к игроку. */
export const DEPTH = {
  SKY: 0,
  CLOUD: 5,
  SKYLINE: 10,
  ROOF: 20,
  SHADOW: 25,
  PIGEON: 30,
  FLOATING: 40,
  SHOP_DIM: 90,
  UI: 100,
  TOAST: 130,
  SHOP: 120,
};
