import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../game/constants.js';
import { COLORS, CSS } from '../game/palette.js';
import { formatAmount } from '../game/format.js';
import { ACHIEVEMENT_COUNT } from '../game/achievements.js';
import { createButton } from './createButton.js';

/** Окно такой же формы, как магазин: оба находятся ниже HUD. */
const PANEL = { x: 220, y: 176, width: 840, height: 528 };
const LIST = { x: 28, y: 112, width: 784, height: 348 };

const CARD = { x: 12, width: 760, height: 76, step: 84 };
const CONTENT_HEIGHT = ACHIEVEMENT_COUNT * CARD.step;
const BAR = { x: 500, y: 36, width: 230, height: 14 };

const COLOR_SECONDARY = '#58708f';
const COLOR_SUCCESS = '#2d7d46';
const COLOR_DONE_BG = 0xe7f7ec;
const COLOR_DONE_BORDER = 0x5abf7d;

/**
 * Окно достижений: список карточек с описанием, наградой, шкалой прогресса
 * и статусом. Прокрутка и закрытие устроены так же, как в ShopPanel.
 */
export class AchievementsPanel {
  constructor(scene, economy) {
    this.scene = scene;
    this.economy = economy;
    this.isOpen = false;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, CONTENT_HEIGHT - LIST.height);
    this.cards = [];
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
      .text(32, 18, 'ДОСТИЖЕНИЯ', {
        fontFamily: CSS.fontFamily,
        fontSize: '38px',
        fontStyle: 'bold',
        color: CSS.ink,
      });

    this.counter = scene.add
      .text(600, 30, `0 / ${ACHIEVEMENT_COUNT}`, {
        fontFamily: CSS.fontFamily,
        fontSize: '26px',
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

    this._buildList();

    const status = scene.add
      .text(32, 472, 'Награды начисляются автоматически и сохраняются.', {
        fontFamily: CSS.fontFamily,
        fontSize: '19px',
        color: CSS.ink,
        wordWrap: { width: width - 64 },
      });

    const footer = scene.add
      .text(32, 502, 'колесо или перетаскивание — прокрутка · Esc — закрыть', {
        fontFamily: CSS.fontFamily,
        fontSize: '18px',
        color: COLOR_SECONDARY,
      });

    this.panel.add([
      shadow,
      bg,
      this.listHit,
      this.list,
      this.frame,
      this.scrollbar,
      status,
      footer,
      title,
      this.counter,
      this.closeButton,
    ]);

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

    this.list = scene.add.container(0, 0);

    for (let index = 0; index < ACHIEVEMENT_COUNT; index += 1) {
      const card = this._buildCard(index);
      this.cards.push(card);
      this.list.add(card.container);
    }

    // Phaser 4: GeometryMask работает только в Canvas, поэтому в WebGL список
    // обрезается Mask filter. Graphics маски не добавляем в видимую часть окна.
    this._setupListMask();

    this.frame = scene.add.graphics();
    this.frame.lineStyle(6, COLORS.accentDark, 1);
    this.frame.strokeRoundedRect(0, 0, PANEL.width, PANEL.height, 28);

    this.scrollbar = scene.add.graphics();
  }

  /** Маска списка живёт в мировых координатах и не является частью панели. */
  _setupListMask() {
    const scene = this.scene;
    const graphics = scene.add.graphics().setVisible(false);
    let filter = null;
    let geometryMask = null;

    if (scene.renderer && scene.renderer.gl) {
      this.list.enableFilters();
      filter = this.list.filters.internal.addMask(
        graphics,
        false,
        scene.cameras.main,
        'world',
      );
      // Прямоугольник маски статичен: достаточно одного обновления текстуры.
      filter.autoUpdate = false;
    } else {
      geometryMask = this.list.createGeometryMask(graphics);
      this.list.setMask(geometryMask);
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

    this.maxScroll = Math.max(0, CONTENT_HEIGHT - LIST.height);
    this.scrollY = Math.min(this.maxScroll, Math.max(0, this.scrollY));
    this._applyScroll();
  }

  /** Публичный вызов из GameScene при изменении размера окна. */
  handleResize() {
    this._updateViewport();
  }

  _buildCard(index) {
    const scene = this.scene;
    const container = scene.add.container(LIST.x + CARD.x, index * CARD.step);

    const bg = scene.add.graphics();
    const badge = scene.add.graphics();

    const name = scene.add
      .text(72, 6, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '20px',
        fontStyle: 'bold',
        color: CSS.ink,
        wordWrap: { width: 410 },
      });

    const description = scene.add
      .text(72, 32, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '14px',
        color: COLOR_SECONDARY,
        wordWrap: { width: 410 },
      });

    const reward = scene.add
      .text(72, 54, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLOR_SUCCESS,
      });

    const progress = scene.add
      .text(BAR.x, 8, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '15px',
        fontStyle: 'bold',
        color: COLOR_SECONDARY,
        wordWrap: { width: 235 },
      });

    const bar = scene.add.graphics();

    const status = scene.add
      .text(BAR.x, 54, '', {
        fontFamily: CSS.fontFamily,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLOR_SECONDARY,
      });

    container.add([bg, badge, name, description, reward, progress, bar, status]);

    return { index, container, bg, badge, name, description, reward, progress, bar, status };
  }

  _paintBadge(graphics, unlocked) {
    graphics.clear();

    const cup = unlocked ? COLORS.accent : 0xc2cedd;
    const line = unlocked ? COLORS.accentDark : 0x8fa1b8;

    graphics.fillStyle(cup, 1);
    graphics.fillRoundedRect(24, 19, 24, 19, 6);
    graphics.lineStyle(3, line, 1);
    graphics.strokeCircle(22, 27, 5);
    graphics.strokeCircle(50, 27, 5);
    graphics.fillStyle(line, 1);
    graphics.fillRoundedRect(32, 37, 8, 6, 2);
    graphics.fillRoundedRect(27, 42, 18, 5, 2);
  }

  _paintCard(card, status) {
    const unlocked = status.unlocked;
    const fill = unlocked ? COLOR_DONE_BG : card.index % 2 === 0 ? 0xeaf3ff : 0xf6faff;

    card.bg.clear();
    card.bg.fillStyle(fill, 1);
    card.bg.fillRoundedRect(0, 0, CARD.width, CARD.height, 18);
    card.bg.lineStyle(3, unlocked ? COLOR_DONE_BORDER : COLORS.accent, unlocked ? 1 : 0.75);
    card.bg.strokeRoundedRect(0, 0, CARD.width, CARD.height, 18);

    this._paintBadge(card.badge, unlocked);

    card.name.setText(status.definition.name);
    card.description.setText(status.definition.description);
    card.reward.setText(`Награда: +${formatAmount(status.definition.reward)} крошек`);

    card.progress.setText(status.progressText);
    card.progress.setColor(unlocked ? COLOR_SUCCESS : COLOR_SECONDARY);

    card.bar.clear();
    card.bar.fillStyle(0xd5e2f1, 1);
    card.bar.fillRoundedRect(BAR.x, BAR.y, BAR.width, BAR.height, BAR.height / 2);

    if (status.fraction > 0) {
      const width = Math.max(BAR.height, BAR.width * status.fraction);
      card.bar.fillStyle(unlocked ? COLOR_DONE_BORDER : COLORS.accent, 1);
      card.bar.fillRoundedRect(BAR.x, BAR.y, width, BAR.height, BAR.height / 2);
    }

    card.status.setText(unlocked ? 'ВЫПОЛНЕНО' : 'НЕ ВЫПОЛНЕНО');
    card.status.setColor(unlocked ? COLOR_SUCCESS : COLOR_SECONDARY);
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.scrollY = 0;
    this.setVisible(true);
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

  setVisible(visible) {
    this.dim.setVisible(visible);
    this.panel.setVisible(visible);
  }

  refresh() {
    const statuses = this.economy.getAchievementStatuses();
    const completed = statuses.filter((status) => status.unlocked).length;

    this.counter.setText(`${completed} / ${ACHIEVEMENT_COUNT}`);
    statuses.forEach((status, index) => this._paintCard(this.cards[index], status));

    this._applyScroll();
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
    const next = Math.min(this.maxScroll, Math.max(0, this.scrollY + amount));
    if (next === this.scrollY) return;

    this.scrollY = next;
    this._applyScroll();
  }

  _applyScroll() {
    this.list.y = LIST.y - this.scrollY;

    this.scrollbar.clear();
    this.scrollbar.fillStyle(COLORS.hudPanel, 0.18);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, LIST.y + 6, 6, LIST.height - 12, 3);

    if (this.maxScroll <= 0) return;

    const trackHeight = LIST.height - 12;
    const thumbHeight = Math.max(36, (LIST.height / CONTENT_HEIGHT) * trackHeight);
    const thumbY = LIST.y + 6 + (this.scrollY / this.maxScroll) * (trackHeight - thumbHeight);

    this.scrollbar.fillStyle(COLORS.accentDark, 0.9);
    this.scrollbar.fillRoundedRect(LIST.x + LIST.width - 10, thumbY, 6, thumbHeight, 3);
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
      if (filter && this.list.filters) this.list.filters.internal.remove(filter);
      if (geometryMask) this.list.clearMask(false);
      if (geometryMask) geometryMask.destroy();
      graphics.destroy();
      this._listMask = null;
    }

    this.dim.destroy();
    this.panel.destroy();
  }
}
