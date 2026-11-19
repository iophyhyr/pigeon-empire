import { GAME_WIDTH, GAME_HEIGHT, DEPTH, TEXTURES } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { SHOP_ITEMS } from '../game/economy.js';
import { createButton } from './createButton.js';

/** Окно расположено ниже HUD: верхние плашки остаются видимыми и не перекрываются. */
const PANEL = { x: 316, y: 188, width: 648, height: 476 };

const STATUS_DEFAULT = 'Клик по Pepper — +1 крошка. Покупай голубей и получай доход пассивно.';
const COLOR_ERROR = '#b4482f';
const COLOR_SUCCESS = '#2d7d46';
const COLOR_UNAFFORDABLE = '#7a5b2a';

/**
 * Простое окно магазина на примитивах Phaser.
 * Работает с Economics через публичный API: читает состояние и вызывает buy().
 */
export class ShopPanel {
  constructor(scene, economy) {
    this.scene = scene;
    this.economy = economy;
    this.item = SHOP_ITEMS[0];
    this.isOpen = false;

    this._build();

    this._unsubscribe = this.economy.onChange(() => {
      if (this.isOpen) this.refresh();
    });

    this.refresh();
  }

  _build() {
    const scene = this.scene;
    const { width, height } = PANEL;

    this.dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.5)
      .setDepth(DEPTH.SHOP_DIM)
      .setInteractive({ useHandCursor: false });
    this.dim.on('pointerdown', () => this.close());

    this.panel = scene.add.container(PANEL.x, PANEL.y).setDepth(DEPTH.SHOP);

    const shadow = scene.add.graphics();
    shadow.fillStyle(COLORS.ink, 0.25);
    shadow.fillRoundedRect(0, 10, width, height, 28);

    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(0, 0, width, height, 28);
    bg.lineStyle(6, COLORS.accentDark, 1);
    bg.strokeRoundedRect(0, 0, width, height, 28);

    const title = scene.add
      .text(32, 22, 'МАГАЗИН', {
        fontFamily: CSS.fontFamily,
        fontSize: '40px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    const subtitle = scene.add
      .text(34, 76, 'Голубятня', {
        fontFamily: CSS.fontFamily,
        fontSize: '21px',
        color: CSS.muted,
      });

    this.closeButton = createButton(scene, {
      x: width - 84,
      y: 22,
      width: 56,
      height: 56,
      label: '✕',
      fontSize: 30,
      onClick: () => this.close(),
    });
    this.closeButton.setDepth(DEPTH.SHOP);

    this._buildCard();

    this.statusText = scene.add
      .text(32, 382, STATUS_DEFAULT, {
        fontFamily: CSS.fontFamily,
        fontSize: '23px',
        color: CSS.ink,
        wordWrap: { width: width - 64 },
      });

    this.footerText = scene.add
      .text(32, 438, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '19px',
        color: CSS.muted,
      });

    this.panel.add([
      shadow,
      bg,
      title,
      subtitle,
      this.closeButton,
      ...this.cardObjects,
      this.statusText,
      this.footerText,
    ]);

    this._interactive = [this.dim, this.closeButton.hit, this.buyButton.hit];
    this.setVisible(false);

    this._onEsc = () => this.close();
  }

  _buildCard() {
    const scene = this.scene;
    const card = scene.add.graphics();
    card.fillStyle(0xeaf3ff, 1);
    card.fillRoundedRect(28, 118, 592, 236, 22);
    card.lineStyle(3, COLORS.accent, 0.9);
    card.strokeRoundedRect(28, 118, 592, 236, 22);

    // Миниатюра — тот же спрайт Pepper, без новых изображений.
    const thumb = scene.add
      .image(96, 234, TEXTURES.PEPPER)
      .setOrigin(0.5)
      .setScale(0.09);

    const name = scene.add
      .text(176, 154, this.item.name, {
        fontFamily: CSS.fontFamily,
        fontSize: '30px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    const description = scene.add
      .text(176, 204, this.item.description, {
        fontFamily: CSS.fontFamily,
        fontSize: '22px',
        color: CSS.ink,
      });

    this.ownedText = scene.add
      .text(176, 246, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '21px',
        color: CSS.muted,
      });

    this.priceText = scene.add
      .text(176, 292, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '26px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    this.buyButton = createButton(scene, {
      x: 386,
      y: 278,
      width: 208,
      height: 64,
      label: 'КУПИТЬ',
      fontSize: 25,
      onClick: () => this._handleBuy(),
    });
    this.buyButton.setDepth(DEPTH.SHOP);

    this.cardObjects = [card, thumb, name, description, this.ownedText, this.priceText, this.buyButton];
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.setVisible(true);
    this._setStatus(STATUS_DEFAULT);
    this.refresh();

    const keyboard = this.scene.input.keyboard;
    if (keyboard) keyboard.on('keydown-ESC', this._onEsc);
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.setVisible(false);

    const keyboard = this.scene.input.keyboard;
    if (keyboard) keyboard.off('keydown-ESC', this._onEsc);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  setVisible(visible) {
    this.dim.setVisible(visible);
    this.panel.setVisible(visible);
    this._interactive.forEach((object) => {
      if (object.input) object.input.enabled = visible;
    });
  }

  refresh() {
    const purchased = this.economy.getPurchased(this.item.id);
    const soldOut = purchased >= this.item.max;

    this.ownedText.setText(`Куплено: ${purchased} / ${this.item.max}`);
    this.priceText.setText(soldOut ? 'Уже в голубятне' : `${this.item.price} крошек`);
    this.priceText.setColor(
      soldOut ? COLOR_SUCCESS : this.economy.canBuy(this.item.id) ? CSS.ink : COLOR_UNAFFORDABLE,
    );
    this.buyButton.setLabel(soldOut ? 'КУПЛЕНО' : 'КУПИТЬ');
    this.footerText.setText(
      `Доход: ${this.economy.income}/сек · Esc или клик вне окна — закрыть`,
    );
  }

  _handleBuy() {
    if (!this.isOpen) return;

    const result = this.economy.buy(this.item.id);

    if (result.ok) {
      this._setStatus(
        `${this.item.name} на крыше! Доход +${this.item.income}/сек`,
        COLOR_SUCCESS,
      );
    } else if (result.reason === 'insufficient') {
      this._setStatus(
        `Недостаточно крошек: не хватает ${result.missing}. Кликни по Pepper!`,
        COLOR_ERROR,
      );
    } else if (result.reason === 'maxed') {
      this._setStatus('Голубь-разведчик уже куплен', COLOR_ERROR);
    }

    this.refresh();
  }

  _setStatus(message, color = CSS.ink) {
    this.statusText.setText(message);
    this.statusText.setColor(color);
  }

  destroy() {
    this.close();
    if (this._unsubscribe) this._unsubscribe();
    this.dim.destroy();
    this.panel.destroy();
  }
}
