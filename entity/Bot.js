class Bot {
  constructor(ownerId) {
    this.ownerId        = ownerId;
    this._expandTimer   = null;
    this.EXPAND_INTERVAL = 30000; // 30 detik per expand action
  }

  // Mulai bot expand — dipanggil saat EXPAND phase start
  startExpand(grid, onExpand) {
    this.stopExpand(); // clear dulu biar gak dobel

    // Langsung expand sekali di awal
    this._doExpand(grid, onExpand);

    // Lanjut tiap 30 detik
    this._expandTimer = setInterval(() => {
      this._doExpand(grid, onExpand);
    }, this.EXPAND_INTERVAL);
  }

  // Stop bot (pas EXPAND phase habis)
  stopExpand() {
    clearInterval(this._expandTimer);
    this._expandTimer = null;
  }

  // Logic expand: cari tile adjacent neutral, klaim satu
  _doExpand(grid, onExpand) {
    const myTiles = grid.getTilesByOwner(this.ownerId);
    if (myTiles.length === 0) return;

    // Kumpulin semua kandidat tile yang bisa diklaim
    const candidates = [];
    const seen = new Set();

    for (const t of myTiles) {
      for (const adj of grid.getAdjacent(t.gridX, t.gridY)) {
        const key = `${adj.gridX},${adj.gridY}`;
        if (!seen.has(key) && adj.isNeutral() && !adj.isWater()) {
          candidates.push(adj);
          seen.add(key);
        }
      }
    }

    if (candidates.length === 0) return;

    // Pick satu tile random dari kandidat
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    target.ownerId = this.ownerId;

    // Notify Game.js supaya HUD dll bisa update
    if (onExpand) onExpand(this.ownerId, target);
  }
}
