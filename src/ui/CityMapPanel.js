import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { formatAmount } from '../game/format.js';
import { DISTRICT_CATALOG, DISTRICT_COUNT, getDistrict } from '../game/districts.js';
import { createButton } from './createButton.js';

/** Та же форма и тот же слой, что у магазина и достижений: окно ниже HUD. */
const PANEL = { x: 220, y: 176, width: 840, height: 528 };
const MAP = { x: 28, y: 104, width: 784, height: 268 };
const INFO = { x: 28, y: 384, width: 784, height: 104 };

const COLOR_SECONDARY = '#58708f';
const COLOR_SUCCESS = '#2d7d46';
const COLOR_MUTED_TEXT = '#5d6e86';

/** Дороги проходят под районами и связывают их в единый город. */
const ROADS = [
  ['roof', 'park'],
  ['park', 'station'],
  ['roof', 'industrial'],
  ['park', 'market'],
  ['station', 'downtown'],
  ['industrial', 'market'],
  ['market', 'downtown'],
];

/**
 * Окно карты города: схематичная карта на Phaser Graphics и карточка выбранного
 * района. Все деньги списываются через economy.openDistrict(); панель только
 * показывает состояние и результат операции.
 */
export class CityMapPanel {
  constructor(scene, economy, options = {}) {
    this.scene = scene;
    this.economy = economy;
    this.onDistrictOpened = options.onDistrictOpened || null;
    this.isOpen = false;
    this.selectedId = 'roof';
    this.nodes = new Map();

    this._build();

    this._unsubscribe = this.economy.onChange(() => {
      if (this.isOpen) this.refresh();
    });

    this.refresh();
    this.setVisible(false);
  }

  // -------------------------------------------------------------------------
  // Построение окна
  // -------------------------------------------------------------------------

  _build() {
    const scene = this.scene;
    const { width, height } = PANEL;

    this.dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.5)
      .setDepth(DEPTH.SHOP_DIM)
      .setInteractive({ useHandCursor: false });

    // Клик по затемнению закрывает окно, клик внутри самого окна — нет.
    this.dim.on('pointerdown', (pointer) => {
      if (!this._pointerInPanel(pointer)) this.close();
    });

    this.panel = scene.add.container(PANEL.x, PANEL.y).setDepth(DEPTH.SHOP);

    const shadow = scene.add.graphics();
    shadow.fillStyle(COLORS.ink, 0.25);
    shadow.fillRoundedRect(0, 10, width, height, 28);

    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(0, 0, width, height, 28);
    bg.lineStyle(6, COLORS.accentDark, 1);
    bg.strokeRoundedRect(0, 0, width, height, 28);

    this.panel.add([shadow, bg]);

    this._buildMap();
    this._buildInfo();

    const title = scene.add
      .text(32, 18, 'КАРТА ГОРОДА', {
        fontFamily: CSS.fontFamily,
        fontSize: '36px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    this.counter = scene.add
      .text(470, 30, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '20px',
        fontStyle: 'bold',
        color: COLOR_SECONDARY,
      });

    const subtitle = scene.add
      .text(32, 72, 'Открывай районы — они усиливают пассивный доход', {
        fontFamily: CSS.fontFamily,
        fontSize: '17px',
        color: COLOR_SECONDARY,
      });

    const footer = scene.add
      .text(32, 501, 'Выбери район на карте · бонусы складываются с улучшениями · Esc — закрыть', {
        fontFamily: CSS.fontFamily,
        fontSize: '16px',
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

    this.panel.add([title, this.counter, subtitle, footer, this.closeButton]);

    this._onEsc = () => this.close();
  }

  _buildMap() {
    const scene = this.scene;

    const mapBg = scene.add.graphics();
    mapBg.fillStyle(0xf4f9ff, 1);
    mapBg.fillRoundedRect(MAP.x, MAP.y, MAP.width, MAP.height, 18);
    mapBg.lineStyle(3, COLORS.accent, 0.8);
    mapBg.strokeRoundedRect(MAP.x, MAP.y, MAP.width, MAP.height, 18);
    this._paintBlocks(mapBg);
    this._paintDecor(mapBg);
    this.panel.add(mapBg);

    this.roads = scene.add.graphics();
    this._paintRoads(this.roads);
    this.panel.add(this.roads);

    DISTRICT_CATALOG.forEach((definition) => {
      const node = this._buildNode(definition);
      this.nodes.set(definition.id, node);
      this.panel.add(node.container);
    });
  }

  /** Лёгкие кварталы на фоне, чтобы карта читалась как город, а не таблица. */
  _paintBlocks(g) {
    const blocks = [
      [6, 6, 42, 16], [236, 144, 44, 18], [756, 6, 22, 22],
      [6, 240, 30, 18], [488, 132, 26, 12], [740, 236, 36, 20],
    ];

    g.fillStyle(0xd7e7f6, 0.7);
    blocks.forEach(([x, y, width, height]) => {
      g.fillRoundedRect(MAP.x + x, MAP.y + y, width, height, 5);
    });
  }

  _paintDecor(g) {
    const trees = [[14, 132], [258, 132], [506, 130], [746, 126], [288, 252], [764, 250]];
    trees.forEach(([x, y]) => {
      const px = MAP.x + x;
      const py = MAP.y + y;
      g.fillStyle(0x9c7048, 1);
      g.fillRect(px - 2, py + 4, 4, 8);
      g.fillStyle(0x66b86d, 1);
      g.fillCircle(px, py, 6);
      g.fillCircle(px - 5, py + 3, 4);
      g.fillCircle(px + 5, py + 3, 4);
    });

    const lamps = [[266, 66], [524, 122], [296, 208]];
    lamps.forEach(([x, y]) => {
      const px = MAP.x + x;
      const py = MAP.y + y;
      g.lineStyle(2, 0x8598ad, 1);
      g.lineBetween(px, py, px, py + 10);
      g.fillStyle(COLORS.accent, 1);
      g.fillCircle(px, py - 2, 4);
    });
  }

  _paintRoads(g) {
    g.clear();

    const centerOf = (id) => {
      const definition = getDistrict(id);
      return {
        x: MAP.x + definition.map.x + definition.map.width / 2,
        y: MAP.y + definition.map.y + definition.map.height / 2,
      };
    };

    ROADS.forEach(([from, to]) => {
      const a = centerOf(from);
      const b = centerOf(to);

      g.lineStyle(24, 0xb3c5d6, 1);
      g.lineBetween(a.x, a.y + 2, b.x, b.y + 2);
      g.lineStyle(19, 0xfff8e8, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(2, 0xe6c98f, 0.9);
      g.lineBetween(a.x, a.y, b.x, b.y);
    });
  }

  _buildNode(definition) {
    const scene = this.scene;
    const { width, height } = definition.map;
    const container = scene.add.container(MAP.x + definition.map.x, MAP.y + definition.map.y);

    const glow = scene.add.graphics();
    const bg = scene.add.graphics();
    const icon = scene.add.graphics();
    const badgeBg = scene.add.graphics();

    const name = scene.add
      .text(12, 44, definition.name, {
        fontFamily: CSS.fontFamily,
        fontSize: '16px',
        fontStyle: 'bold',
        color: CSS.ink,
        wordWrap: { width: width - 24 },
      });

    const price = scene.add
      .text(12, height - 25, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '13px',
        color: COLOR_SECONDARY,
      });

    const badge = scene.add
      .text(width - 12, 17, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '11px',
        fontStyle: 'bold',
        color: CSS.white,
      })
      .setOrigin(1, 0.5);

    const hit = scene.add
      .rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.select(definition.id));

    icon.setPosition(14, 11);
    container.add([glow, bg, icon, badgeBg, name, price, badge, hit]);

    return { id: definition.id, definition, container, glow, bg, icon, badgeBg, name, price, badge, hit };
  }

  _paintNode(node, opened) {
    const definition = node.definition;
    const { width, height } = definition.map;
    const selected = node.id === this.selectedId;

    node.glow.clear();
    if (selected) {
      node.glow.fillStyle(COLORS.accent, 0.35);
      node.glow.fillRoundedRect(-6, -6, width + 12, height + 12, 24);
    }

    node.bg.clear();
    node.bg.fillStyle(COLORS.ink, 0.14);
    node.bg.fillRoundedRect(0, 6, width, height, 18);
    node.bg.fillStyle(opened ? definition.tint.fill : 0xdce4ef, 1);
    node.bg.fillRoundedRect(0, 0, width, height, 18);
    node.bg.lineStyle(
      selected ? 5 : 3,
      selected ? COLORS.accentDark : opened ? definition.tint.border : 0xa6b5c8,
      1,
    );
    node.bg.strokeRoundedRect(0, 0, width, height, 18);

    if (!opened) {
      // Приглушаем саму карточку, но текст рисуем поверх — он остаётся читаемым.
      node.bg.fillStyle(COLORS.shadow, 0.1);
      node.bg.fillRoundedRect(0, 0, width, height, 18);
    }

    this._paintIcon(node.icon, definition.icon, opened ? definition.tint.icon : 0x8496ad);

    node.name.setColor(opened ? CSS.ink : COLOR_MUTED_TEXT);
    node.price.setText(
      definition.id === 'roof'
        ? 'Стартовая территория'
        : `Цена: ${formatAmount(definition.price)} крошек`,
    );
    node.price.setColor(opened ? COLOR_SUCCESS : COLOR_SECONDARY);

    const status = selected ? 'ВЫБРАН' : opened ? 'ОТКРЫТ' : 'ЗАКРЫТ';
    node.badge.setText(status);
    node.badge.setColor(selected ? CSS.ink : CSS.white);
    node.badgeBg.clear();
    node.badgeBg.fillStyle(selected ? COLORS.accent : opened ? 0x4aab6a : 0x8fa1b8, 1);
    node.badgeBg.fillRoundedRect(width - 92, 7, 80, 20, 10);
  }

  /** Простые символы районов: без спрайтов и без новых изображений. */
  _paintIcon(g, kind, color) {
    g.clear();

    switch (kind) {
      case 'roof':
        g.fillStyle(color, 1);
        g.fillTriangle(0, 14, 14, 2, 28, 14);
        g.fillStyle(0xffffff, 0.92);
        g.fillRect(3, 14, 22, 14);
        g.lineStyle(2, color, 1);
        g.strokeRect(3, 14, 22, 14);
        g.fillStyle(color, 1);
        g.fillRect(12, 20, 6, 8);
        break;

      case 'park':
        g.fillStyle(0x8b5a2b, 1);
        g.fillRect(12, 18, 5, 10);
        g.fillStyle(color, 1);
        g.fillCircle(14, 12, 8);
        g.fillCircle(7, 16, 6);
        g.fillCircle(21, 16, 6);
        break;

      case 'station':
        g.fillStyle(color, 1);
        g.fillRoundedRect(2, 5, 25, 16, 5);
        g.fillStyle(0xffffff, 0.92);
        g.fillRoundedRect(6, 9, 6, 6, 2);
        g.fillRoundedRect(17, 9, 6, 6, 2);
        g.fillStyle(COLORS.ink, 0.8);
        g.fillCircle(8, 23, 3);
        g.fillCircle(21, 23, 3);
        break;

      case 'industrial':
        g.fillStyle(color, 1);
        g.fillRect(3, 12, 22, 15);
        g.fillTriangle(3, 12, 10, 6, 17, 12);
        g.fillTriangle(17, 12, 24, 6, 28, 12);
        g.fillRect(22, 2, 5, 12);
        g.fillStyle(0xffffff, 0.85);
        g.fillRect(7, 18, 5, 5);
        g.fillRect(15, 18, 5, 5);
        break;

      case 'market':
        g.fillStyle(color, 1);
        g.fillRect(3, 5, 24, 9);
        g.fillStyle(0xffffff, 0.85);
        g.fillRect(5, 14, 5, 4);
        g.fillRect(14, 14, 5, 4);
        g.fillStyle(color, 1);
        g.fillRect(5, 18, 20, 9);
        g.fillStyle(0xffffff, 0.85);
        g.fillRect(8, 20, 14, 4);
        break;

      case 'downtown':
      default:
        g.fillStyle(color, 1);
        g.fillRect(2, 9, 10, 19);
        g.fillRect(15, 2, 11, 26);
        g.fillStyle(0xffffff, 0.85);
        [12, 18, 24].forEach((y) => {
          g.fillRect(5, y, 3, 3);
          g.fillRect(19, y - 5, 3, 3);
          g.fillRect(19, y + 3, 3, 3);
        });
        break;
    }
  }

  _buildInfo() {
    const scene = this.scene;
    const container = scene.add.container(INFO.x, INFO.y);

    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(0, 0, INFO.width, INFO.height, 18);
    bg.lineStyle(4, COLORS.accentDark, 1);
    bg.strokeRoundedRect(0, 0, INFO.width, INFO.height, 18);

    const dividers = scene.add.graphics();
    dividers.lineStyle(2, COLORS.accent, 0.4);
    dividers.lineBetween(430, 14, 430, 90);
    dividers.lineBetween(624, 14, 624, 90);

    this.infoName = scene.add
      .text(20, 12, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '24px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    this.infoDescription = scene.add
      .text(20, 46, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '14px',
        color: COLOR_SECONDARY,
        wordWrap: { width: 396 },
      });

    this.infoStatus = scene.add
      .text(20, 78, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLOR_SECONDARY,
      });

    this.infoStats = scene.add
      .text(446, 12, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '15px',
        color: CSS.ink,
        lineSpacing: 6,
        wordWrap: { width: 168 },
      });

    this.openedBadgeBg = scene.add.graphics();
    this.openedBadge = scene.add
      .text(700, 52, 'РАЙОН ОТКРЫТ', {
        fontFamily: CSS.fontFamily,
        fontSize: '16px',
        fontStyle: 'bold',
        color: COLOR_SUCCESS,
      })
      .setOrigin(0.5);

    this.buyButton = createButton(scene, {
      x: 636,
      y: 30,
      width: 132,
      height: 46,
      label: 'ОТКРЫТЬ РАЙОН',
      fontSize: 14,
      onClick: () => this._handleBuy(),
    });

    container.add([
      bg,
      dividers,
      this.infoName,
      this.infoDescription,
      this.infoStatus,
      this.infoStats,
      this.openedBadgeBg,
      this.openedBadge,
      this.buyButton,
    ]);

    this.panel.add(container);
  }

  // -------------------------------------------------------------------------
  // Состояние и ввод
  // -------------------------------------------------------------------------

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.setVisible(true);
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

  select(id) {
    if (!this.isOpen || !getDistrict(id)) return;
    this.selectedId = id;
    this.refresh();
  }

  refresh() {
    const openedCount = DISTRICT_CATALOG.filter(
      (definition) => this.economy.districts[definition.id] === true,
    ).length;
    this.counter.setText(`${openedCount} / ${DISTRICT_COUNT} РАЙОНОВ ОТКРЫТО`);

    let status = this.economy.getDistrictStatus(this.selectedId);
    if (!status) {
      this.selectedId = 'roof';
      status = this.economy.getDistrictStatus(this.selectedId);
    }

    this.nodes.forEach((node) => {
      this._paintNode(node, this.economy.districts[node.id] === true);
    });
    this._paintInfo(status);
  }

  _paintInfo(status) {
    const definition = status.definition;

    this.infoName.setText(definition.name);
    this.infoDescription.setText(definition.description);
    this.infoStatus.setText(
      status.opened ? 'Статус: ОТКРЫТ · бонус уже действует' : 'Статус: ЗАКРЫТ',
    );
    this.infoStatus.setColor(status.opened ? COLOR_SUCCESS : COLOR_SECONDARY);

    const lines = [
      `Цена: ${formatAmount(status.price)} крошек`,
      definition.incomeBonus > 0
        ? `Бонус: +${Math.round(definition.incomeBonus * 100)}% дохода`
        : 'Бонус: стартовая территория',
      `Баланс: ${formatAmount(status.balance)} крошек`,
    ];
    if (!status.opened && status.missing > 0) {
      lines.push(`Не хватает: ${formatAmount(status.missing)} крошек`);
    }
    this.infoStats.setText(lines.join('\n'));

    this.buyButton.setVisible(!status.opened);
    this.openedBadge.setVisible(status.opened);
    this.openedBadgeBg.clear();
    if (status.opened) {
      this.openedBadgeBg.fillStyle(0xe7f7ec, 1);
      this.openedBadgeBg.fillRoundedRect(636, 30, 132, 46, 23);
      this.openedBadgeBg.lineStyle(3, 0x5abf7d, 1);
      this.openedBadgeBg.strokeRoundedRect(636, 30, 132, 46, 23);
    }

    this._updateButtonInputs();
  }

  _handleBuy() {
    if (!this.isOpen) return;

    const result = this.economy.openDistrict(this.selectedId);
    if (result.ok && this.onDistrictOpened) {
      this.onDistrictOpened(result.district);
    }
    this.refresh();
  }

  _updateButtonInputs() {
    const status = this.economy.getDistrictStatus(this.selectedId);

    this.nodes.forEach((node) => {
      if (node.hit.input) node.hit.input.enabled = this.isOpen;
    });

    const canBuy = !!(this.isOpen && status && status.affordable);
    if (this.buyButton.hit && this.buyButton.hit.input) {
      this.buyButton.hit.input.enabled = canBuy;
    }
  }

  setVisible(visible) {
    this.dim.setVisible(visible);
    this.panel.setVisible(visible);
    this._updateButtonInputs();
  }

  _pointerInPanel(pointer) {
    return (
      pointer.x >= PANEL.x &&
      pointer.x <= PANEL.x + PANEL.width &&
      pointer.y >= PANEL.y &&
      pointer.y <= PANEL.y + PANEL.height
    );
  }

  /** FIT-масштаб сохраняет игровые координаты; обновление — на всякий случай. */
  handleResize() {
    if (this.isOpen) this.refresh();
  }

  destroy() {
    this.close();

    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    this.dim.destroy();
    this.panel.destroy();
    this.nodes.clear();
  }
}
