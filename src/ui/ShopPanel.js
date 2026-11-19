import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { PIGEON_CATALOG, getPigeon } from '../game/pigeons.js';
import { createButton } from './createButton.js';

/** Окно расположено ниже HUD: верхние плашки остаются видимыми. */
const PANEL = { x: 220, y: 176, width: 840, height: 528 };
const LIST = { x: 28, y: 104, width: 784, height: 356 };

const CARD = { x: 12, width: 760, height: 70, step: 78 };
const CONTENT_HEIGHT = PIGEON_CATALOG.length * CARD.step;

const STATUS_DEFAULT = 'Клик по Pepper — +1 крошка. Покупай голубей и получай доход пассивно.';
const COLOR_ERROR = '#b4482f';
const COLOR_SUCCESS = '#2d7d46';
const COLOR_UNAFFORDABLE = '#7a5b2a';

/**
 * Окно магазина на примитивах Phaser.
 * Показывает всю коллекцию голубей с прокруткой внутри списка.
 */
export class ShopPanel {
  constructor(scene, economy) {
    this.scene = scene;
    this.economy = economy;
    this.isOpen = false;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, CONTENT_HEIGHT - LIST.height);
    this.cards = [];
    this._dragging = false;
    this._dragY = 0;

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
      .text(32, 18, 'МАГАЗИН', {
        fontFamily: CSS.fontFamily,
        fontSize: '38px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    const subtitle = scene.add
      .text(34, 70, 'Голубятня · первая коллекция', {
        fontFamily: CSS.fontFamily,
        fontSize: '20px',
        color: CSS.muted,
      });

    this.closeButton = createButton(scene, {
      x: width - 84,
      y: 18,
      width: 56,
      height: 56,
      label: '✕',
      fontSize: 30,
      onClick: () => this.close(),
    });

    this._buildList();

    this.statusText = scene.add
      .text(32, 470, STATUS_DEFAULT, {
        fontFamily: CSS.fontFamily,
        fontSize: '20px',
        color: CSS.ink,
        wordWrap: { width: width - 64 },
      });

    this.footerText = scene.add
      .text(32, 502, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '18px',
        color: CSS.muted,
      });

    this.panel.add([
      shadow,
      bg,
      this.listHit,
      this.listContainer,
      this.topCover,
      this.bottomCover,
      this.frame,
      this.scrollbar,
      this.statusText,
      this.footerText,
      title,
      subtitle,
      this.closeButton,
    ]);

    this._interactive = [
      this.dim,
      this.closeButton.hit,
      this.listHit,
      ...this.cards.map((card) => card.buyButton.hit),
    ];

    this._onWheel = (pointer, _objects, _deltaX, deltaY) => {
      if (!this.isOpen || !this._pointerInPanel(pointer)) return;
      this._scrollBy(deltaY * 0.6);
    };
    scene.input.on('wheel', this._onWheel);

    this._onEsc = () => this.close();

    this._applyScroll();
    this.setVisible(false);
  }

  _buildList() {
    const scene = this.scene;

    this.listHit = scene.add
      .rectangle(LIST.x + LIST.width / 2, LIST.y + LIST.height / 2, LIST.width, LIST.height, 0xffffff, 0)
      .setInteractive({ useHandCursor: false });

    this.listHit.on('pointerdown', (pointer) => {
      if (!this.isOpen) return;
      this._dragging = true;
      this._dragY = pointer.y;
    });

    this.listHit.on('pointermove', (pointer) => {
      if (!this.isOpen || !this._dragging) return;
      this._scrollBy(this._dragY - pointer.y);
      this._dragY = pointer.y;
    });

    const stopDrag = () => {
      this._dragging = false;
    };
    this.listHit.on('pointerup', stopDrag);
    this.listHit.on('pointerout', stopDrag);

    this.listContainer = scene.add.container(0, 0);

    PIGEON_CATALOG.forEach((pigeon, index) => {
      const card = this._buildCard(pigeon, index);
      this.cards.push(card);
      this.listContainer.add(card.container);
    });

    // Phaser 4 в WebGL не поддерживает GeometryMask у контейнеров. Вместо маски
    // закрываем выходящие за список карточки непрозрачными «полками» окна.
    this.topCover = scene.add.graphics();
    this.topCover.fillStyle(0xffffff, 1);
    this.topCover.fillRoundedRect(0, 0, PANEL.width, LIST.y, 28);

    this.bottomCover = scene.add.graphics();
    this.bottomCover.fillStyle(0xffffff, 1);
    this.bottomCover.fillRoundedRect(
      0,
      LIST.y + LIST.height,
      PANEL.width,
      PANEL.height - LIST.y - LIST.height,
      28,
    );

    // Рамку рисуем поверх «полок», чтобы окно оставалось цельным.
    this.frame = scene.add.graphics();
    this.frame.lineStyle(6, COLORS.accentDark, 1);
    this.frame.strokeRoundedRect(0, 0, PANEL.width, PANEL.height, 28);

    this.scrollbar = scene.add.graphics();
  }

  _buildCard(pigeon, index) {
    const scene = this.scene;
    const card = scene.add.container(LIST.x + CARD.x, index * CARD.step);

    const bg = scene.add.graphics();
    bg.fillStyle(index % 2 === 0 ? 0xeaf3ff : 0xf6faff, 1);
    bg.fillRoundedRect(0, 0, CARD.width, CARD.height, 18);
    bg.lineStyle(3, COLORS.accent, 0.75);
    bg.strokeRoundedRect(0, 0, CARD.width, CARD.height, 18);

    const thumb = scene.add
      .image(44, CARD.height / 2, pigeon.texture)
      .setOrigin(0.5)
      .setScale(46 / scene.textures.get(pigeon.texture).getSourceImage().height);

    const name = scene.add
      .text(84, 10, pigeon.name, {
        fontFamily: CSS.fontFamily,
        fontSize: '22px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    const description = scene.add
      .text(84, 40, pigeon.description, {
        fontFamily: CSS.fontFamily,
        fontSize: '16px',
        color: CSS.muted,
      });

    const income = scene.add
      .text(390, 10, `+${pigeon.income} крошка/сек`, {
        fontFamily: CSS.fontFamily,
        fontSize: '18px',
        fontStyle: 'bold',
        color: COLOR_SUCCESS,
      });

    const price = scene.add
      .text(390, 42, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '18px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    const owned = scene.add
      .text(540, 10, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '17px',
        color: CSS.muted,
      });

    const buyButton = createButton(scene, {
      x: 650,
      y: 13,
      width: 98,
      height: 44,
      label: 'КУПИТЬ',
      fontSize: 18,
      onClick: () => this._handleBuy(pigeon.id),
    });

    card.add([bg, thumb, name, description, income, price, owned, buyButton]);

    return { id: pigeon.id, pigeon, container: card, price, owned, buyButton };
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
    this._dragging = false;
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
    this._updateButtonInputs();
  }

  refresh() {
    this.cards.forEach((card) => {
      const owned = this.economy.getPurchased(card.id) > 0;
      const affordable = this.economy.canBuy(card.id);

      card.owned.setText(`Куплено: ${owned ? 1 : 0} / ${card.pigeon.max}`);
      card.price.setText(`${card.pigeon.price} крошек`);
      card.price.setColor(owned ? COLOR_SUCCESS : affordable ? CSS.ink : COLOR_UNAFFORDABLE);
      card.buyButton.setLabel(owned ? 'КУПЛЕНО' : 'КУПИТЬ');
    });

    this.footerText.setText(
      `Доход: ${this.economy.income}/сек · колесо или перетаскивание — прокрутка · Esc — закрыть`,
    );
  }

  _handleBuy(id) {
    if (!this.isOpen) return;

    const result = this.economy.buy(id);
    const pigeon = getPigeon(id);
    const label = pigeon ? pigeon.name : 'Голубь';

    if (result.ok) {
      this._setStatus(
        `${label} на крыше! Доход +${result.pigeon.income}/сек`,
        COLOR_SUCCESS,
      );
    } else if (result.reason === 'insufficient') {
      this._setStatus(
        `Недостаточно крошек: не хватает ${result.missing}. Кликни по Pepper!`,
        COLOR_ERROR,
      );
    } else if (result.reason === 'maxed') {
      this._setStatus(`${label} уже куплен`, COLOR_ERROR);
    }

    this.refresh();
  }

  _setStatus(message, color = CSS.ink) {
    this.statusText.setText(message);
    this.statusText.setColor(color);
  }

  _pointerInPanel(pointer) {
    return (
      pointer.x >= PANEL.x &&
      pointer.x <= PANEL.x + PANEL.width &&
      pointer.y >= PANEL.y &&
      pointer.y <= PANEL.y + PANEL.height
    );
  }

  _scrollBy(amount) {
    if (this.maxScroll <= 0) return;

    const next = Math.min(this.maxScroll, Math.max(0, this.scrollY + amount));
    if (next === this.scrollY) return;

    this.scrollY = next;
    this._applyScroll();
  }

  _applyScroll() {
    this.listContainer.y = LIST.y - this.scrollY;
    this._updateButtonInputs();

    this.scrollbar.clear();
    this.scrollbar.fillStyle(COLORS.hudPanel, 0.18);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, LIST.y + 6, 6, LIST.height - 12, 3);

    if (this.maxScroll <= 0) return;

    const trackHeight = LIST.height - 12;
    const thumbHeight = Math.max(36, (LIST.height / CONTENT_HEIGHT) * trackHeight);
    const thumbY =
      LIST.y +
      6 +
      (this.scrollY / this.maxScroll) * (trackHeight - thumbHeight);

    this.scrollbar.fillStyle(COLORS.accentDark, 0.9);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, thumbY, 6, thumbHeight, 3);
  }

  /** Заглушка списка не должна ловить клики по невидимым кнопкам. */
  _updateButtonInputs() {
    this.cards.forEach((card) => {
      const top = card.container.y;
      const visible = top + CARD.height > this.scrollY && top < this.scrollY + LIST.height;
      if (card.buyButton.hit && card.buyButton.hit.input) {
        card.buyButton.hit.input.enabled = this.isOpen && visible;
      }
    });
  }

  destroy() {
    this.close();
    this.scene.input.off('wheel', this._onWheel);

    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    this.dim.destroy();
    this.panel.destroy();
  }
}
