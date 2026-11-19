import { DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';

/**
 * Простая мультяшная кнопка из Graphics + Text + прозрачной хит-зоны.
 * Возвращает контейнер; x/y — левый верхний угол кнопки.
 */
export function createButton(scene, { x, y, width, height, label, onClick, fontSize = 26 }) {
  const container = scene.add.container(x, y).setDepth(DEPTH.UI);
  const bg = scene.add.graphics();
  const radius = height / 2;

  const paint = (fillColor) => {
    bg.clear();
    bg.fillStyle(COLORS.accentDark, 1);
    bg.fillRoundedRect(0, 5, width, height - 5, radius);
    bg.fillStyle(fillColor, 1);
    bg.fillRoundedRect(0, 0, width, height - 5, radius);
    bg.lineStyle(4, COLORS.ink, 0.25);
    bg.strokeRoundedRect(0, 0, width, height - 5, radius);
  };

  paint(COLORS.accent);

  const text = scene.add
    .text(width / 2, (height - 5) / 2, label, {
      fontFamily: CSS.fontFamily,
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: CSS.ink,
    })
    .setOrigin(0.5);

  // Прозрачный прямоугольник ловит и мышь, и палец (Phaser pointer events).
  const hit = scene.add
    .rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });

  container.add([bg, text, hit]);

  // Наружу отдаём текст и хит-зону: кнопку можно переподписать (магазин)
  // и временно отключить ввод, когда окно скрыто.
  container.labelText = text;
  container.hit = hit;
  container.setLabel = (value) => {
    text.setText(value);
    return container;
  };

  hit.on('pointerover', () => {
    paint(COLORS.accentLight);
    container.setScale(1.03);
  });

  hit.on('pointerout', () => {
    paint(COLORS.accent);
    container.setScale(1);
  });

  hit.on('pointerdown', () => container.setScale(0.97));

  hit.on('pointerup', () => {
    container.setScale(1);
    if (onClick) onClick();
  });

  return container;
}
