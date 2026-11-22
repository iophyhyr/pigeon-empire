import { DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { formatAmount } from '../game/format.js';

/** Плашка в свободном месте над HUD: не закрывает плашки, окна и Pepper. */
const POS = { x: 660, y: 48, width: 500, height: 92 };
const COLOR_SUCCESS = '#2d7d46';

/**
 * Очередь уведомлений о достижениях. Показывается одно, остальные ждут своей
 * очереди — даже если за один клик выполнилось несколько условий подряд.
 */
export class AchievementToast {
  constructor(scene) {
    this.scene = scene;
    this.queue = [];
    this.active = null;
    this.container = null;
    this.destroyed = false;
  }

  enqueue(definitions) {
    if (this.destroyed || !definitions || !definitions.length) return;

    definitions.forEach((definition) => this.queue.push(definition));
    if (!this.active) this._showNext();
  }

  _ensureContainer() {
    if (this.container) return;

    const scene = this.scene;
    const { width, height } = POS;
    const container = scene.add
      .container(POS.x, POS.y - 56)
      .setDepth(DEPTH.TOAST)
      .setAlpha(0);

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.ink, 0.35);
    bg.fillRoundedRect(-width / 2, -height / 2 + 7, width, height - 5, 22);
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height - 7, 22);
    bg.lineStyle(5, COLORS.accentDark, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height - 7, 22);

    // Маленький нарисованный кубок — без новых изображений и шрифтов.
    const cupX = -width / 2 + 38;
    const trophy = scene.add.graphics();
    trophy.fillStyle(COLORS.accent, 1);
    trophy.fillRoundedRect(cupX - 13, -17, 26, 21, 6);
    trophy.lineStyle(4, COLORS.accentDark, 1);
    trophy.strokeCircle(cupX - 16, -7, 6);
    trophy.strokeCircle(cupX + 16, -7, 6);
    trophy.fillStyle(COLORS.accentDark, 1);
    trophy.fillRoundedRect(cupX - 4, 3, 8, 8, 2);
    trophy.fillRoundedRect(cupX - 13, 10, 26, 7, 3);

    const textX = -width / 2 + 76;

    this.titleText = scene.add
      .text(textX, -32, 'ДОСТИЖЕНИЕ!', {
        fontFamily: CSS.fontFamily,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#a46d10',
      })
      .setOrigin(0, 0.5);

    this.nameText = scene.add
      .text(textX, -3, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '24px',
        fontStyle: 'bold',
        color: CSS.ink,
      })
      .setOrigin(0, 0.5);

    this.rewardText = scene.add
      .text(textX, 27, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '19px',
        fontStyle: 'bold',
        color: COLOR_SUCCESS,
      })
      .setOrigin(0, 0.5);

    container.add([bg, trophy, this.titleText, this.nameText, this.rewardText]);
    container.setVisible(false);
    this.container = container;
  }

  _showNext() {
    if (this.destroyed) return;

    if (!this.queue.length) {
      this.active = null;
      return;
    }

    this.active = this.queue.shift();
    this._ensureContainer();

    this.nameText.setText(this.active.name);
    this.rewardText.setText(`+${formatAmount(this.active.reward)} крошек`);
    this.container.setVisible(true).setAlpha(0).setY(POS.y - 56);

    this.scene.tweens.add({
      targets: this.container,
      y: POS.y,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.destroyed) return;

        this.scene.tweens.add({
          targets: this.container,
          y: POS.y - 24,
          alpha: 0,
          delay: 1100,
          duration: 260,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.destroyed) return;
            this.container.setVisible(false);
            this.active = null;
            this._showNext();
          },
        });
      },
    });
  }

  destroy() {
    this.destroyed = true;
    this.queue.length = 0;
    this.active = null;

    if (this.container) {
      this.scene.tweens.killTweensOf(this.container);
      this.container.destroy();
      this.container = null;
    }
  }
}
