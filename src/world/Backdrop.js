import Phaser from 'phaser';

import { GAME_WIDTH, GAME_HEIGHT, ROOF_TOP, DEPTH } from '../game/constants.js';
import { COLORS } from '../game/palette.js';

/**
 * Фон сцены: небо, солнце, облака, город на горизонте и крыша.
 * Всё нарисовано примитивами Graphics — внешние изображения не используются.
 */

const SKY_BANDS = 24;

export function buildBackdrop(scene) {
  drawSky(scene);
  drawSun(scene);
  drawSkyline(scene);
  drawRooftop(scene);
  drawClouds(scene);
}

/** Смешивает два 0xRRGGBB цвета. */
function mixColor(colorA, colorB, t) {
  const ar = (colorA >> 16) & 0xff;
  const ag = (colorA >> 8) & 0xff;
  const ab = colorA & 0xff;
  const br = (colorB >> 16) & 0xff;
  const bg = (colorB >> 8) & 0xff;
  const bb = colorB & 0xff;

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);

  return (r << 16) | (g << 8) | b;
}

/** Небо: набор горизонтальных полос вместо градиента (работает и в WebGL, и в Canvas). */
function drawSky(scene) {
  const bandHeight = GAME_HEIGHT / SKY_BANDS;
  const g = scene.add.graphics().setDepth(DEPTH.SKY);

  for (let i = 0; i < SKY_BANDS; i += 1) {
    const t = i / (SKY_BANDS - 1);
    g.fillStyle(mixColor(COLORS.skyTop, COLORS.skyBottom, t), 1);
    g.fillRect(0, Math.floor(i * bandHeight), GAME_WIDTH, Math.ceil(bandHeight) + 1);
  }
}

function drawSun(scene) {
  const g = scene.add.graphics().setDepth(DEPTH.SKY);
  const x = 1088;
  const y = 118;

  g.fillStyle(COLORS.sunGlow, 0.22);
  g.fillCircle(x, y, 138);
  g.fillStyle(COLORS.sunGlow, 0.34);
  g.fillCircle(x, y, 104);
  g.fillStyle(COLORS.sun, 1);
  g.fillCircle(x, y, 72);
}

/** Город на заднем плане: два ряда зданий с окнами. */
function drawSkyline(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['pigeon-empire']);
  const g = scene.add.graphics().setDepth(DEPTH.SKYLINE);

  drawBuildingRow(g, rng, {
    baseline: ROOF_TOP - 30,
    minWidth: 72,
    maxWidth: 126,
    minHeight: 120,
    maxHeight: 250,
    palette: COLORS.farBuilding,
    alpha: 0.85,
  });

  drawBuildingRow(g, rng, {
    baseline: ROOF_TOP - 8,
    minWidth: 92,
    maxWidth: 152,
    minHeight: 88,
    maxHeight: 176,
    palette: COLORS.nearBuilding,
    alpha: 1,
  });
}

function drawBuildingRow(g, rng, options) {
  const { baseline, minWidth, maxWidth, minHeight, maxHeight, palette, alpha } = options;
  let x = -40;

  while (x < GAME_WIDTH + 40) {
    const width = rng.between(minWidth, maxWidth);
    const height = rng.between(minHeight, maxHeight);
    const top = baseline - height;
    const color = rng.pick(palette);

    g.fillStyle(color, alpha);
    g.fillRect(x, top, width, height + 30);

    // тёмная кромка крыши здания
    g.fillStyle(mixColor(color, COLORS.parapetShade, 0.35), alpha);
    g.fillRect(x, top, width, 8);

    // окна
    const stepX = 22;
    const stepY = 30;
    for (let wy = top + 26; wy < baseline - 26; wy += stepY) {
      for (let wx = x + 14; wx < x + width - 18; wx += stepX) {
        if (rng.frac() < 0.28) continue;
        g.fillStyle(rng.frac() < 0.25 ? COLORS.windowWarm : COLORS.windowCool, 0.85);
        g.fillRect(wx, wy, 12, 16);
      }
    }

    // антенна на некоторых крышах
    if (rng.frac() < 0.35) {
      const ax = x + width / 2 + rng.between(-14, 14);
      g.lineStyle(3, mixColor(color, COLORS.ink, 0.35), 0.9);
      g.lineBetween(ax, top, ax, top - rng.between(18, 46));
    }

    x += width + rng.between(6, 22);
  }
}

/** Крыша: парапет, плитка и пара декоративных деталей на переднем плане. */
function drawRooftop(scene) {
  const g = scene.add.graphics().setDepth(DEPTH.ROOF);
  const tileHeight = 48;

  // поверхность крыши
  g.fillStyle(COLORS.roofLight, 1);
  g.fillRect(0, ROOF_TOP, GAME_WIDTH, GAME_HEIGHT - ROOF_TOP);

  // плитка: горизонтальные швы
  g.lineStyle(3, COLORS.roofDark, 0.4);
  for (let y = ROOF_TOP + tileHeight; y < GAME_HEIGHT; y += tileHeight) {
    g.lineBetween(0, y, GAME_WIDTH, y);
  }

  // плитка: вертикальные швы со смещением
  for (let row = 0, y = ROOF_TOP; y < GAME_HEIGHT + tileHeight; y += tileHeight, row += 1) {
    const offset = row % 2 === 0 ? 0 : 46;
    for (let x = offset; x < GAME_WIDTH; x += 92) {
      g.lineBetween(x, y, x, Math.min(y + tileHeight, GAME_HEIGHT));
    }
  }

  // парапет на заднем крае
  g.fillStyle(COLORS.parapet, 1);
  g.fillRect(0, ROOF_TOP - 38, GAME_WIDTH, 26);
  g.fillStyle(COLORS.parapetShade, 1);
  g.fillRect(0, ROOF_TOP - 12, GAME_WIDTH, 12);
  g.lineStyle(4, COLORS.roofLine, 0.5);
  g.lineBetween(0, ROOF_TOP - 38, GAME_WIDTH, ROOF_TOP - 38);

  // блик на передней кромке
  g.fillStyle(COLORS.accent, 0.5);
  g.fillRect(0, ROOF_TOP, GAME_WIDTH, 4);

  drawRoofProps(g);
}

/** Вентиляция слева и люк справа: декор переднего плана, вне центра экрана. */
function drawRoofProps(g) {
  // труба вентиляции
  g.fillStyle(COLORS.roofDark, 1);
  g.fillRoundedRect(58, 612, 46, 130, 12);
  g.fillStyle(COLORS.roof, 1);
  g.fillRoundedRect(50, 596, 62, 34, 12);
  g.lineStyle(4, COLORS.roofLine, 0.55);
  g.strokeRoundedRect(50, 596, 62, 34, 12);

  // люк
  g.fillStyle(COLORS.roofDark, 1);
  g.fillRoundedRect(1140, 654, 104, 90, 14);
  g.fillStyle(COLORS.roof, 1);
  g.fillRoundedRect(1148, 662, 88, 74, 10);
  g.lineStyle(4, COLORS.roofLine, 0.5);
  g.strokeRoundedRect(1148, 662, 88, 74, 10);
  g.fillStyle(COLORS.accent, 0.85);
  g.fillCircle(1222, 700, 7);
}

/** Облака: контейнеры из окружностей, медленно «дышат» влево-вправо. */
function drawClouds(scene) {
  const specs = [
    { x: 170, y: 126, scale: 1.15, alpha: 0.95, drift: 54 },
    { x: 612, y: 82, scale: 0.78, alpha: 0.8, drift: -46 },
    { x: 946, y: 196, scale: 0.92, alpha: 0.85, drift: 40 },
    { x: 1198, y: 68, scale: 0.6, alpha: 0.7, drift: -34 },
    { x: 420, y: 212, scale: 0.55, alpha: 0.6, drift: 30 },
  ];

  specs.forEach((spec, index) => {
    const cloud = scene.add.container(spec.x, spec.y).setDepth(DEPTH.CLOUD).setScale(spec.scale);
    const g = scene.add.graphics();

    g.fillStyle(COLORS.cloud, spec.alpha);
    g.fillCircle(-62, 10, 34);
    g.fillCircle(-20, -8, 46);
    g.fillCircle(26, 2, 38);
    g.fillCircle(64, 14, 26);
    g.fillRoundedRect(-92, 8, 186, 34, 17);

    cloud.add(g);

    scene.tweens.add({
      targets: cloud,
      x: spec.x + spec.drift,
      duration: 9000 + index * 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  });
}
