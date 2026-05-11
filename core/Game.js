class Game {
  constructor() {
    this.TILE_SIZE  = 20;
    this.HUD_H      = 56;
    this.INFO_H     = 28;

    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');

    // Ukuran grid — dikurangi HUD atas + info bar bawah
    this.COLS = Math.floor(window.innerWidth / this.TILE_SIZE);
    this.ROWS = Math.floor(
      (window.innerHeight - this.HUD_H - this.INFO_H) / this.TILE_SIZE
    );

    this.canvas.width  = this.COLS * this.TILE_SIZE;
    this.canvas.height = this.ROWS * this.TILE_SIZE;

    // Core objects
    this.grid     = new MapGrid(this.COLS, this.ROWS, this.TILE_SIZE);
    this.renderer = new Renderer(this.canvas, this.grid);

    // State
    this.playerId     = 0;
    this.selectedTile = null;
    this.expandable   = [];
    this.turn         = 1;
    this.phase        = 'EXPAND'; // 'EXPAND' | 'MANAGE'

    // M2 — PhaseSystem (timer 5 menit)
    this.phaseSystem = new PhaseSystem(() => this._onExpandEnd());

    // M2 — 3 bot instances
    this.bots = [
      new Bot(1),
      new Bot(2),
      new Bot(3),
    ];

    // Init
    this._placeStartingTiles();
    this._calcExpandable();
    this._bindEvents();
    this._updateHUD();

    // Langsung start expand phase (timer + bot)
    this._startExpandPhase();

    // Render loop
    this._loop();
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  _placeStartingTiles() {
    const cx = Math.floor(this.COLS / 2);
    const cy = Math.floor(this.ROWS / 2);

    // Player di tengah
    this._forceOwn(cx, cy, this.playerId);

    // 3 bot di sudut
    const corners = [
      [2, 2],
      [this.COLS - 3, 2],
      [2, this.ROWS - 3],
    ];

    for (let i = 0; i < 3; i++) {
      const [bx, by] = corners[i];
      this._forceOwn(bx, by, i + 1);
    }
  }

  _forceOwn(x, y, ownerId) {
    const tile = this.grid.get(x, y);
    if (!tile) return;
    if (tile.isWater()) {
      const adj = this.grid.getAdjacent(x, y).find(t => !t.isWater());
      if (adj) adj.ownerId = ownerId;
      return;
    }
    tile.ownerId = ownerId;
  }

  // ── EXPAND PHASE ────────────────────────────────────────────────────────

  _startExpandPhase() {
    this.phase = 'EXPAND';
    this._calcExpandable();
    this._updateHUD();

    // Start countdown timer
    this.phaseSystem.startExpand();

    // Start semua bot expand
    this.bots.forEach(bot => {
      bot.startExpand(this.grid, (ownerId, tile) => {
        this._onBotExpand(ownerId, tile);
      });
    });

    this._showMessage(`Turn ${this.turn} — EXPAND phase dimulai!`);
  }

  // Dipanggil oleh PhaseSystem saat timer habis
  _onExpandEnd() {
    // Stop semua bot
    this.bots.forEach(b => b.stopExpand());

    // Pindah ke manage phase
    this._startManagePhase();
  }

  _startManagePhase() {
    this.phase = 'MANAGE';
    this.expandable = []; // gak bisa expand lagi
    this._updateHUD();
    this._showMessage('MANAGE phase — atur wilayahmu');
  }

  // Callback dari bot saat dia expand
  _onBotExpand(ownerId, tile) {
    // Recalc expandable player karena peta berubah
    this._calcExpandable();
    // Log ke info bar (optional)
    const botName = `Bot ${ownerId}`;
    const el = document.getElementById('tileInfo');
    if (el) el.textContent = `${botName} klaim tile [${tile.gridX},${tile.gridY}]`;
  }

  // ── EXPANDABLE CALC ─────────────────────────────────────────────────────

  _calcExpandable() {
    const playerTiles = this.grid.getTilesByOwner(this.playerId);
    const seen = new Set();
    this.expandable = [];

    for (const pt of playerTiles) {
      for (const t of this.grid.getAdjacent(pt.gridX, pt.gridY)) {
        const key = `${t.gridX},${t.gridY}`;
        if (!seen.has(key) && t.isNeutral() && !t.isWater()) {
          this.expandable.push(t);
          seen.add(key);
        }
      }
    }
  }

  // ── INPUT ────────────────────────────────────────────────────────────────

  _bindEvents() {
    const handler = (pixelX, pixelY) => {
      const tile = this.grid.getTileAt(pixelX, pixelY);
      if (tile) this._onTileClick(tile);
    };

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handler(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      handler(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: false });

    document.getElementById('btnEndTurn').addEventListener('click', () => {
      this._onEndTurnBtn();
    });
  }

  _onTileClick(tile) {
    if (tile.isWater()) return;

    this.selectedTile = tile;
    this._showTileInfo(tile);

    // Hanya bisa klaim saat EXPAND phase
    if (this.phase === 'EXPAND' && this.expandable.includes(tile)) {
      this._claimTile(tile);
    }
  }

  // ── GAME LOGIC ───────────────────────────────────────────────────────────

  _claimTile(tile) {
    tile.ownerId = this.playerId;
    this.selectedTile = tile;
    this._calcExpandable();
    this._updateHUD();
    this._showMessage('+1 Territory claimed!');
  }

  _onEndTurnBtn() {
    if (this.phase === 'EXPAND') {
      // Player bisa skip expand phase sebelum timer habis
      this.phaseSystem.stop();
      this.bots.forEach(b => b.stopExpand());
      this._startManagePhase();
      return;
    }

    if (this.phase === 'MANAGE') {
      // Next turn — kembali ke expand
      this.turn++;
      this._startExpandPhase();
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const playerTiles = this.grid.getTilesByOwner(this.playerId).length;
    document.getElementById('hudTurn').textContent  = `TURN ${this.turn}`;
    document.getElementById('hudPhase').textContent = this.phase;
    document.getElementById('hudTiles').textContent = `${playerTiles} tiles`;

    // Sembunyikan timer saat MANAGE phase
    const timerEl = document.getElementById('hudTimer');
    if (timerEl) {
      timerEl.style.display = this.phase === 'EXPAND' ? '' : 'none';
      const timerBlock = timerEl.parentElement;
      if (timerBlock) timerBlock.style.display = this.phase === 'EXPAND' ? '' : 'none';
    }
  }

  _showTileInfo(tile) {
    const ownerLabel = tile.isNeutral() ? 'Neutral'
      : tile.ownerId === this.playerId ? 'Yours'
      : `Bot ${tile.ownerId}`;

    const canExpand = this.phase === 'EXPAND' && this.expandable.includes(tile);
    const el = document.getElementById('tileInfo');
    el.textContent = `[${tile.gridX},${tile.gridY}] ${tile.terrain} | ${ownerLabel}${canExpand ? ' — TAP TO CLAIM' : ''}`;
  }

  _showMessage(msg) {
    const el = document.getElementById('msgBox');
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  // ── RENDER LOOP ──────────────────────────────────────────────────────────

  _loop() {
    this.renderer.render(this.selectedTile, this.expandable);
    requestAnimationFrame(() => this._loop());
  }
}

window.addEventListener('load', () => {
  window._game = new Game();
});
