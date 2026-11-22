import { GAME_WIDTH, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { formatAmount } from '../game/format.js';
import { createButton } from './createButton.js';

const HUD_Y = 96;
const HUD_HEIGHT = 72;
/** Пять плашек и три кнопки: 1120 px контента + 5 зазоров по 16 = 1200 px. */
const CRUMBS_PILL = { x: 40, y: HUD_Y, width: 270, height: HUD_HEIGHT };
const INCOME_PILL = { x: 326, y: HUD_Y, width: 190, height: HUD_HEIGHT };
const CLICK_PILL = { x: 532, y: HUD_Y, width: 200, height: HUD_HEIGHT };
const MAP_BUTTON = { x: 748, y: HUD_Y, width: 140, height: HUD_HEIGHT };
const ACHIEVEMENTS_BUTTON = { x: 904, y: HUD_Y, width: 150, height: HUD_HEIGHT };
const SHOP_BUTTON = { x: 1070, y: HUD_Y, width: 170, height: HUD_HEIGHT };

/**
 * Верхний интерфейс: крошки, доход, сила клика и три кнопки окон.
 * Всё уложено внутрь 1280x720 с отступом 40 px, поэтому при FIT-масштабировании
 * (и на мобильных) ничего не обрезается.
 */
export class Hud {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onShop = options.onShop || null;
    this.onAchievements = options.onAchievements || null;
    this.onMap = options.onMap || null;
    this.crumbs = 0;
    this.income = 0;
    this.clickPower = 1;
    this.toast = null;

    this._buildTitle();
    this._buildCrumbs();
    this._buildIncome();
    this._buildClickPower();
    this._buildMapButton();
    this._buildAchievementsButton();
    this._buildShopButton();
  }

  _buildTitle() {
    this.title = this.scene.add
      .text(40, 28, 'PIGEON EMPIRE', {
        fontFamily: CSS.fontFamily,
        fontSize: '46px',
        fontStyle: 'bold',
        color: CSS.ink,
        stroke: '#ffffff',
        strokeThickness: 8,
      })
      .setDepth(DEPTH.UI);
  }

  _buildCrumbs() {
    const { x, y, width, height } = CRUMBS_PILL;
    this.crumbsPill = this.scene.add.container(x, y).setDepth(DEPTH.UI);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.hudPanel, 0.9);
    bg.fillRoundedRect(0, 0, width, height, height / 2);
    bg.lineStyle(4, COLORS.accent, 1);
    bg.strokeRoundedRect(0, 0, width, height, height / 2);

    const icon = this.scene.add.graphics();
    this._paintCrumbIcon(icon, 36, height / 2);

    this.crumbsText = this.scene.add
      .text(68, height / 2, '0', {
        fontFamily: CSS.fontFamily,
        fontSize: '32px',
        fontStyle: 'bold',
        color: CSS.white,
      })
      .setOrigin(0, 0.5);

    this.crumbsPill.add([bg, icon, this.crumbsText]);
  }

  _paintCrumbIcon(g, x, y) {
    g.fillStyle(COLORS.crumb, 1);
    g.fillRoundedRect(x - 15, y - 12, 30, 24, 9);
    g.fillStyle(COLORS.crumbDark, 0.55);
    g.fillCircle(x - 6, y - 3, 3);
    g.fillCircle(x + 6, y + 4, 2.5);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(x - 1, y - 6, 2);
  }

  _buildIncome() {
    const { x, y, width, height } = INCOME_PILL;
    const container = this.scene.add.container(x, y).setDepth(DEPTH.UI);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.hudPanelLight, 0.82);
    bg.fillRoundedRect(0, 0, width, height, height / 2);
    bg.lineStyle(3, COLORS.hudText, 0.25);
    bg.strokeRoundedRect(0, 0, width, height, height / 2);

    // пиктограмма «рост»: три столбика
    const icon = this.scene.add.graphics();
    icon.fillStyle(COLORS.accent, 1);
    icon.fillRoundedRect(22, 44, 7, 12, 3);
    icon.fillRoundedRect(35, 36, 7, 20, 3);
    icon.fillRoundedRect(48, 26, 7, 30, 3);
    icon.lineStyle(3, COLORS.accent, 0.7);
    icon.lineBetween(24, 26, 37, 18);
    icon.lineBetween(37, 18, 51, 22);

    this.incomeText = this.scene.add
      .text(68, height / 2, '0/сек', {
        fontFamily: CSS.fontFamily,
        fontSize: '22px',
        fontStyle: 'bold',
        color: CSS.muted,
      })
      .setOrigin(0, 0.5);

    container.add([bg, icon, this.incomeText]);
  }

  /** Небольшая плашка силы клика рядом с крошками и доходом. */
  _buildClickPower() {
    const { x, y, width, height } = CLICK_PILL;
    const container = this.scene.add.container(x, y).setDepth(DEPTH.UI);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.hudPanelLight, 0.82);
    bg.fillRoundedRect(0, 0, width, height, height / 2);
    bg.lineStyle(3, COLORS.accent, 0.75);
    bg.strokeRoundedRect(0, 0, width, height, height / 2);

    // пиктограмма «удар»: небольшой хлебный брусок
    const icon = this.scene.add.graphics();
    icon.fillStyle(COLORS.crumb, 1);
    icon.fillRoundedRect(20, 26, 30, 22, 8);
    icon.fillStyle(COLORS.crumbDark, 0.5);
    icon.fillCircle(30, 34, 2.5);
    icon.fillCircle(42, 40, 2);

    this.clickText = this.scene.add
      .text(60, height / 2, '+1 за клик', {
        fontFamily: CSS.fontFamily,
        fontSize: '21px',
        fontStyle: 'bold',
        color: CSS.white,
      })
      .setOrigin(0, 0.5);

    container.add([bg, icon, this.clickText]);
  }

  /** Кнопка карты города рядом с магазином и достижениями. */
  _buildMapButton() {
    const { x, y, width, height } = MAP_BUTTON;

    this.mapButton = createButton(this.scene, {
      x,
      y,
      width,
      height,
      label: 'КАРТА',
      fontSize: 24,
      onClick: () => {
        if (this.onMap) this.onMap();
        else this.showToast('Карта скоро откроется');
      },
    });
  }

  /** Отдельная кнопка достижений рядом с магазином. */
  _buildAchievementsButton() {
    const { x, y, width, height } = ACHIEVEMENTS_BUTTON;

    this.achievementsButton = createButton(this.scene, {
      x,
      y,
      width,
      height,
      label: 'ДОСТИЖЕНИЯ',
      fontSize: 17,
      onClick: () => {
        if (this.onAchievements) this.onAchievements();
        else this.showToast('Достижения скоро откроются');
      },
    });
  }

  _buildShopButton() {
    const { x, y, width, height } = SHOP_BUTTON;
    this.shopButton = createButton(this.scene, {
      x,
      y,
      width,
      height,
      label: 'МАГАЗИН',
      fontSize: 22,
      onClick: () => {
        if (this.onShop) this.onShop();
        else this.showToast('Магазин скоро откроется');
      },
    });
  }

  setCrumbs(value) {
    this.crumbs = value;
    this.crumbsText.setText(formatAmount(value));
  }

  setIncome(value) {
    this.income = value;
    this.incomeText.setText(`${formatAmount(value)}/сек`);
  }

  setClickPower(value) {
    this.clickPower = value;
    this.clickText.setText(`+${formatAmount(value)} за клик`);
  }

  /** Короткий «прыжок» плашки при получении крошки. */
  pulseCrumbs() {
    this.scene.tweens.killTweensOf(this.crumbsPill);
    this.crumbsPill.setScale(1);

    this.scene.tweens.add({
      targets: this.crumbsPill,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Всплывающее сообщение-заглушка (например, от кнопки магазина). */
  showToast(message) {
    const scene = this.scene;

    if (!this.toast) {
      this.toast = scene.add.container(GAME_WIDTH / 2, 600).setDepth(DEPTH.TOAST).setAlpha(0);
      this.toastBg = scene.add.graphics();
      this.toastText = scene.add
        .text(0, 0, '', {
          fontFamily: CSS.fontFamily,
          fontSize: '26px',
          fontStyle: 'bold',
          color: CSS.ink,
        })
        .setOrigin(0.5);
      this.toast.add([this.toastBg, this.toastText]);
    }

    this.toastText.setText(message);

    const width = Math.min(640, Math.max(320, this.toastText.width + 80));
    const height = 68;

    this.toastBg.clear();
    this.toastBg.fillStyle(0xffffff, 0.96);
    this.toastBg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    this.toastBg.lineStyle(4, COLORS.accentDark, 1);
    this.toastBg.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);

    scene.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(1).setY(600);

    scene.tweens.add({
      targets: this.toast,
      y: 580,
      duration: 240,
      ease: 'Back.easeOut',
    });

    scene.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 1500,
      duration: 400,
      ease: 'Quad.easeIn',
    });
  }
}
