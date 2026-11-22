import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { formatAmount } from '../game/format.js';
import { PIGEON_CATALOG, getPigeon } from '../game/pigeons.js';
import { UPGRADE_CATALOG } from '../game/upgrades.js';
import { createButton } from './createButton.js';

/** Окно расположено ниже HUD: верхние плашки остаются видимыми. */
const PANEL = { x: 220, y: 176, width: 840, height: 528 };
const LIST = { x: 28, y: 116, width: 784, height: 344 };

const CARD = { x: 12, width: 760, height: 70, step: 78 };
/** Карточки улучшений выше: в них отдельные строки уровня, цены и нехватки. */
const UPGRADE_CARD = { height: 92, step: 100 };
const CONTENT_HEIGHT = {
  pigeons: PIGEON_CATALOG.length * CARD.step,
  upgrades: UPGRADE_CATALOG.length * UPGRADE_CARD.step,
};

const TAB = { y: 70, width: 180, height: 38 };
const TABS = [
  { id: 'pigeons', label: 'ГОЛУБИ', x: 32, subtitle: 'Голубятня · первая коллекция' },
  { id: 'upgrades', label: 'УЛУЧШЕНИЯ', x: 232, subtitle: 'Клик и пассивный доход' },
];

const STATUS_PIGEONS = 'Клик по Pepper — крошки. Покупай голубей и получай доход пассивно.';
const STATUS_UPGRADES = 'Улучшения применяются сразу после покупки и сохраняются автоматически.';
const COLOR_ERROR = '#b4482f';
const COLOR_SUCCESS = '#2d7d46';
const COLOR_UNAFFORDABLE = '#7a5b2a';
/** Приглушённый, но читаемый на светлом фоне (вместо почти белого CSS.muted). */
const COLOR_SECONDARY = '#58708f';

/**
 * Окно магазина на примитивах Phaser.
 * Две вкладки: голуби и улучшения. У обеих — общая прокрутка внутри списка.
 */
export class ShopPanel {
  constructor(scene, economy) {
    this.scene = scene;
    this.economy = economy;
    this.isOpen = false;
    this.tab = 'pigeons';
    this.scrollY = 0;
    this.maxScroll = Math.max(0, CONTENT_HEIGHT.pigeons - LIST.height);
    this.cardsByTab = { pigeons: [], upgrades: [] };
    this._dragging = false;
    this._dragY = 0;
    this._listMask = null;

    this._build();
    this._updateViewport();

    this._unsubscribe = this.economy.onChange(() => {
      if (this.isOpen) this.refresh();
    });

    this.refresh();
  }

  get cards() {
    return this.cardsByTab[this.tab];
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

    this.subtitle = scene.add
      .text(470, 78, TABS[0].subtitle, {
        fontFamily: CSS.fontFamily,
        fontSize: '19px',
        fontStyle: 'bold',
        color: COLOR_SECONDARY,
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

    this._buildTabs();
    this._buildLists();

    this.statusText = scene.add
      .text(32, 470, STATUS_PIGEONS, {
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
      this.listViewport,
      this.frame,
      this.scrollbar,
      this.statusText,
      this.footerText,
      title,
      this.subtitle,
      ...Object.values(this.tabButtons).map((tab) => tab.container),
      this.closeButton,
    ]);

    this._interactive = [
      this.dim,
      this.closeButton.hit,
      this.listHit,
      ...Object.values(this.tabButtons).map((tab) => tab.hit),
      ...PIGEON_CATALOG.map((pigeon) => this.cardsByTab.pigeons.find((c) => c.id === pigeon.id).buyButton.hit),
      ...UPGRADE_CATALOG.map((upgrade) => this.cardsByTab.upgrades.find((c) => c.id === upgrade.id).buyButton.hit),
    ];

    this._onWheel = (pointer, _objects, _deltaX, deltaY) => {
      if (!this.isOpen || !this._pointerInPanel(pointer)) return;
      this._scrollBy(deltaY * 0.6);
    };
    scene.input.on('wheel', this._onWheel);

    this._onEsc = () => this.close();

    this._paintTabs();
    this._applyScroll();
    this.setVisible(false);
  }

  _buildTabs() {
    const scene = this.scene;
    this.tabButtons = {};

    TABS.forEach((config) => {
      const container = scene.add.container(config.x, TAB.y);

      const bg = scene.add.graphics();
      const text = scene.add
        .text(TAB.width / 2, TAB.height / 2, config.label, {
          fontFamily: CSS.fontFamily,
          fontSize: '20px',
          fontStyle: 'bold',
          color: CSS.ink,
        })
        .setOrigin(0.5);

      const hit = scene.add
        .rectangle(TAB.width / 2, TAB.height / 2, TAB.width, TAB.height, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this._setTab(config.id));

      container.add([bg, text, hit]);
      this.tabButtons[config.id] = { container, bg, text, hit, config };
    });
  }

  _paintTabs() {
    Object.values(this.tabButtons).forEach(({ bg, text, config }) => {
      const active = config.id === this.tab;
      bg.clear();
      bg.fillStyle(active ? COLORS.accent : 0xeaf3ff, 1);
      bg.fillRoundedRect(0, 0, TAB.width, TAB.height, 14);
      bg.lineStyle(3, COLORS.accentDark, active ? 1 : 0.4);
      bg.strokeRoundedRect(0, 0, TAB.width, TAB.height, 14);
      text.setColor(active ? CSS.ink : '#58708f');
    });
  }

  _buildLists() {
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

    // Оба списка живут в одном viewport: одна маска на обе вкладки, старая
    // вкладка становится невидимой и не может оставить свои элементы в кадре.
    this.listViewport = scene.add.container(0, 0);
    this.pigeonList = scene.add.container(0, 0);
    this.upgradeList = scene.add.container(0, 0);
    this.listViewport.add([this.pigeonList, this.upgradeList]);

    PIGEON_CATALOG.forEach((pigeon, index) => {
      const card = this._buildPigeonCard(pigeon, index);
      this.cardsByTab.pigeons.push(card);
      this.pigeonList.add(card.container);
    });

    UPGRADE_CATALOG.forEach((upgrade, index) => {
      const card = this._buildUpgradeCard(upgrade, index);
      this.cardsByTab.upgrades.push(card);
      this.upgradeList.add(card.container);
    });

    this.upgradeList.setVisible(false);

    // Phaser 4: GeometryMask работает только в Canvas, поэтому в WebGL список
    // обрезается Mask filter. Graphics маски не добавляем в видимую часть окна.
    this._setupListMask();

    this.frame = scene.add.graphics();
    this.frame.lineStyle(6, COLORS.accentDark, 1);
    this.frame.strokeRoundedRect(0, 0, PANEL.width, PANEL.height, 28);

    this.scrollbar = scene.add.graphics();
  }

  /** Маска общего viewport двух вкладок в мировых координатах. */
  _setupListMask() {
    const scene = this.scene;
    const graphics = scene.add.graphics().setVisible(false);
    let filter = null;
    let geometryMask = null;

    if (scene.renderer && scene.renderer.gl) {
      this.listViewport.enableFilters();
      filter = this.listViewport.filters.internal.addMask(
        graphics,
        false,
        scene.cameras.main,
        'world',
      );
      filter.autoUpdate = false;
    } else {
      geometryMask = this.listViewport.createGeometryMask(graphics);
      this.listViewport.setMask(geometryMask);
    }

    this._listMask = { graphics, filter, geometryMask };
  }

  /** Пересчёт области прокрутки (вызывается при создании и resize). */
  _updateViewport() {
    if (!this._listMask) return;

    const { graphics, filter } = this._listMask;
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(PANEL.x + LIST.x, PANEL.y + LIST.y, LIST.width, LIST.height);

    if (filter) filter.needsUpdate = true;

    this.maxScroll = Math.max(0, CONTENT_HEIGHT[this.tab] - LIST.height);
    this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY));
    this._applyScroll();
  }

  /** Публичный вызов из GameScene при изменении размера окна. */
  handleResize() {
    this._updateViewport();
  }

  _buildCardBackground(index, height = CARD.height) {
    const bg = this.scene.add.graphics();
    bg.fillStyle(index % 2 === 0 ? 0xeaf3ff : 0xf6faff, 1);
    bg.fillRoundedRect(0, 0, CARD.width, height, 18);
    bg.lineStyle(3, COLORS.accent, 0.75);
    bg.strokeRoundedRect(0, 0, CARD.width, height, 18);
    return bg;
  }

  _buildPigeonCard(pigeon, index) {
    const scene = this.scene;
    const card = scene.add.container(LIST.x + CARD.x, index * CARD.step);

    const bg = this._buildCardBackground(index);

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

  _buildUpgradeCard(upgrade, index) {
    const scene = this.scene;
    const height = UPGRADE_CARD.height;
    const card = scene.add.container(LIST.x + CARD.x, index * UPGRADE_CARD.step);

    const bg = this._buildCardBackground(index, height);

    // Тонкая полоска отделяет название с описанием от уровня и цены.
    const divider = scene.add.graphics();
    divider.lineStyle(3, COLORS.accent, 0.35);
    divider.lineBetween(352, 12, 352, height - 12);

    const badge = scene.add.graphics();
    badge.fillStyle(COLORS.accent, 1);
    badge.fillCircle(44, height / 2, 22);
    badge.lineStyle(3, COLORS.accentDark, 1);
    badge.strokeCircle(44, height / 2, 22);

    const badgeText = scene.add
      .text(44, height / 2, upgrade.kind === 'click' ? '+' : '↗', {
        fontFamily: CSS.fontFamily,
        fontSize: '26px',
        fontStyle: 'bold',
        color: CSS.ink,
      })
      .setOrigin(0.5);

    const name = scene.add
      .text(84, 8, upgrade.name, {
        fontFamily: CSS.fontFamily,
        fontSize: '22px',
        fontStyle: 'bold',
        color: CSS.ink,
        wordWrap: { width: 262 },
      });

    const description = scene.add
      .text(84, 38, upgrade.description, {
        fontFamily: CSS.fontFamily,
        fontSize: '15px',
        color: COLOR_SECONDARY,
        wordWrap: { width: 262 },
      });

    const level = scene.add
      .text(368, 10, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '17px',
        fontStyle: 'bold',
        color: CSS.ink,
        wordWrap: { width: 264 },
      });

    const price = scene.add
      .text(368, 36, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '16px',
        fontStyle: 'bold',
        color: CSS.ink,
        wordWrap: { width: 264 },
      });

    // Отдельная строка, чтобы «не хватает N» не теснило цену.
    const missing = scene.add
      .text(368, 62, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '15px',
        color: COLOR_UNAFFORDABLE,
        wordWrap: { width: 264 },
      });

    const buyButton = createButton(scene, {
      x: 652,
      y: 24,
      width: 96,
      height: 44,
      label: 'КУПИТЬ',
      fontSize: 18,
      onClick: () => this._handleBuyUpgrade(upgrade.id),
    });

    card.add([bg, divider, badge, badgeText, name, description, level, price, missing, buyButton]);

    return {
      id: upgrade.id,
      definition: upgrade,
      container: card,
      height,
      level,
      price,
      missing,
      buyButton,
    };
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, CONTENT_HEIGHT[this.tab] - LIST.height);
    this.setVisible(true);
    this._setStatus(this.tab === 'pigeons' ? STATUS_PIGEONS : STATUS_UPGRADES);
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

  _setTab(id) {
    if (!this.tabButtons[id] || this.tab === id) return;

    this.tab = id;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, CONTENT_HEIGHT[id] - LIST.height);

    this.pigeonList.setVisible(id === 'pigeons');
    this.upgradeList.setVisible(id === 'upgrades');
    this.subtitle.setText(this.tabButtons[id].config.subtitle);

    this._paintTabs();
    this._setStatus(id === 'pigeons' ? STATUS_PIGEONS : STATUS_UPGRADES);
    this._applyScroll();
    this.refresh();
  }

  setVisible(visible) {
    this.dim.setVisible(visible);
    this.panel.setVisible(visible);
    this._updateButtonInputs();
  }

  refresh() {
    this._refreshPigeonCards();
    this._refreshUpgradeCards();

    const income = formatAmount(this.economy.income);
    this.footerText.setText(
      this.tab === 'pigeons'
        ? `Доход: ${income}/сек · колесо или перетаскивание — прокрутка · Esc — закрыть`
        : `Клик: +${formatAmount(this.economy.clickPower)} · Доход: ${income}/сек · Esc — закрыть`,
    );

    this._paintTabs();
    this._updateButtonInputs();
  }

  _refreshPigeonCards() {
    this.cardsByTab.pigeons.forEach((card) => {
      const owned = this.economy.getPurchased(card.id) > 0;
      const affordable = this.economy.canBuy(card.id);

      card.owned.setText(`Куплено: ${owned ? 1 : 0} / ${card.pigeon.max}`);
      card.price.setText(`${card.pigeon.price} крошек`);
      card.price.setColor(owned ? COLOR_SUCCESS : affordable ? CSS.ink : COLOR_UNAFFORDABLE);
      card.buyButton.setLabel(owned ? 'КУПЛЕНО' : 'КУПИТЬ');
    });
  }

  _refreshUpgradeCards() {
    this.cardsByTab.upgrades.forEach((card) => {
      const status = this.economy.getUpgradeStatus(card.id);
      if (!status) return;

      if (status.done) {
        card.level.setText(
          status.maxLevel === 1 ? 'КУПЛЕНО' : `МАКС. ${status.maxLevel} / ${status.maxLevel}`,
        );
        card.price.setText(status.maxLevel === 1 ? 'Одноразовое улучшение' : 'Максимальный уровень');
        card.price.setColor(COLOR_SUCCESS);
        card.missing.setText('');
        card.buyButton.setLabel(status.maxLevel === 1 ? 'КУПЛЕНО' : 'МАКС.');
      } else {
        card.level.setText(`Уровень ${status.level} / ${status.maxLevel}`);
        card.price.setText(`${status.price} крошек`);
        card.price.setColor(status.affordable ? CSS.ink : COLOR_UNAFFORDABLE);
        card.missing.setText(
          status.missing > 0 ? `не хватает ${formatAmount(status.missing)}` : '',
        );
        card.buyButton.setLabel('КУПИТЬ');
      }
    });
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

  _handleBuyUpgrade(id) {
    if (!this.isOpen) return;

    const result = this.economy.buyUpgrade(id);
    const label = result.upgrade ? result.upgrade.name : 'Улучшение';

    if (result.ok) {
      this._setStatus(`${label}: уровень ${result.level} куплен за ${result.price} крошек`, COLOR_SUCCESS);
    } else if (result.reason === 'insufficient') {
      this._setStatus(
        `Недостаточно крошек: не хватает ${formatAmount(result.missing)}`,
        COLOR_ERROR,
      );
    } else if (result.reason === 'maxed') {
      this._setStatus(`${label}: максимальный уровень`, COLOR_ERROR);
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
    this.pigeonList.y = LIST.y - this.scrollY;
    this.upgradeList.y = LIST.y - this.scrollY;
    this._updateButtonInputs();

    this.scrollbar.clear();
    this.scrollbar.fillStyle(COLORS.hudPanel, 0.18);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, LIST.y + 6, 6, LIST.height - 12, 3);

    if (this.maxScroll <= 0) return;

    const trackHeight = LIST.height - 12;
    const thumbHeight = Math.max(36, (LIST.height / CONTENT_HEIGHT[this.tab]) * trackHeight);
    const thumbY = LIST.y + 6 + (this.scrollY / this.maxScroll) * (trackHeight - thumbHeight);

    this.scrollbar.fillStyle(COLORS.accentDark, 0.9);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, thumbY, 6, thumbHeight, 3);
  }

  /** Невидимые карточки и недоступные покупки не должны ловить клики. */
  _updateButtonInputs() {
    this.cards.forEach((card) => {
      const top = card.container.y;
      const height = card.height || CARD.height;
      const visible = top + height > this.scrollY && top < this.scrollY + LIST.height;
      let enabled = this.isOpen && visible;

      if (this.tab === 'upgrades') {
        enabled = enabled && this.economy.canBuyUpgrade(card.id);
      }

      if (card.buyButton.hit && card.buyButton.hit.input) {
        card.buyButton.hit.input.enabled = enabled;
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

    if (this._listMask) {
      const { graphics, filter, geometryMask } = this._listMask;
      if (filter && this.listViewport.filters) this.listViewport.filters.internal.remove(filter);
      if (geometryMask) this.listViewport.clearMask(false);
      if (geometryMask) geometryMask.destroy();
      graphics.destroy();
      this._listMask = null;
    }

    this.dim.destroy();
    this.panel.destroy();
  }
}
