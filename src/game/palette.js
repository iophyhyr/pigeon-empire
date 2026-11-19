/**
 * Палитра прототипа. Яркая, мультяшная.
 * Фон, крыша и HUD рисуются примитивами Phaser Graphics;
 * сам персонаж — PNG-спрайт (см. `src/objects/Pepper.js`).
 */
export const COLORS = {
  skyTop: 0x4fb3ff,
  skyBottom: 0xe6f6ff,

  sun: 0xfff3b0,
  sunGlow: 0xfffbe0,

  cloud: 0xffffff,

  farBuilding: [0x9cc3e4, 0xa9cde9, 0x8fb9dd, 0xb4d4ea, 0x86b2d8],
  nearBuilding: [0x7fa9cf, 0x8fb7d8, 0x6f9bc4, 0x9cc0dd, 0x7ba5cb],
  windowWarm: 0xffe29a,
  windowCool: 0xd6ecfc,

  parapet: 0xf6d9a8,
  parapetShade: 0xd9b47f,

  roof: 0xe8783f,
  roofLight: 0xf28a52,
  roofDark: 0xc35a2c,
  roofLine: 0x9a4422,

  shadow: 0x1e2a44,

  hudPanel: 0x1f2b47,
  hudPanelLight: 0x2c3d61,
  hudText: 0xffffff,
  hudTextMuted: 0xc9d8ef,
  accent: 0xffcf5c,
  accentLight: 0xffdf8a,
  accentDark: 0xc98f1c,
  ink: 0x16233d,

  crumb: 0xf0b45e,
  crumbDark: 0xcf8a35,
};

/** CSS-строки для текста (Phaser Text принимает цвета строкой). */
export const CSS = {
  ink: '#16233d',
  white: '#ffffff',
  muted: '#c9d8ef',
  plusOne: '#ffd75e',
  plusOneStroke: '#8a4b12',
  fontFamily: 'system-ui, "Segoe UI", Arial, sans-serif',
};
