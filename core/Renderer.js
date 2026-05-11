class Renderer {
  constructor(canvas, grid) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.grid   = grid;

    this.OWNER_COLORS = {
      '-1': '#1a1a2e',
      '0':  '#c1121f',
      '1':  '#1d6fa4',
      '2':  '#7b2d8b',
      '3':  '#1a8a7a',
    };

    this.OWNER_LIGHT = {
      '0':  '#e63946',
      '1':  '#457b9d',
      '2':  '#9b5ba5',
      '3':  '#2aa89a',
    };

    this.OWNER_SHADOW = {
      '0':  '#8b0000',
      '1':  '#0d3d5e',
      '2':  '#4a1460',
      '3':  '#0c5045',
    };

    this.OWNER_BORDER = {
      '0':  '#ff6b6b',
      '1':  '#74b3d4',
      '2':  '#c47fd4',
      '3':  '#4fd1c0',
    };

    this.TERRAIN_BG = {
      plain:    '#111122',
      forest:   '#0a1f14',
      mountain: '#161620',
      water:    '#080d1a',
    };

    this._pulse    = 0;
    this._pulseDir = 1;
  }

  render(selectedTile = null, expandableTiles = []) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this._pulse += 0.04 * this._pulseDir;
    if (this._pulse >= 1) { this._pulse = 1; this._pulseDir = -1; }
    if (this._pulse <= 0) { this._pulse = 0; this._pulseDir =  1; }

    for (const tile of this.grid.tiles) this._drawBase(tile);
    for (const tile of this.grid.tiles) {
      if (!tile.isNeutral() && !tile.isWater()) this._drawTerritoryBorders(tile);
    }
    for (const tile of this.grid.tiles) {
      if (!tile.isNeutral() && !tile.isWater()) this._drawShading(tile);
    }
    for (const tile of expandableTiles) this._drawExpandable(tile);
    if (selectedTile) this._drawSelection(selectedTile);
  }

  _drawBase(tile) {
    const ctx = this.ctx;
    const x = tile.getPixelX(), y = tile.getPixelY(), s = tile.size;

    if (tile.isWater()) {
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#0d1f35';
      ctx.fillRect(x + 1, y + Math.floor(s * 0.35), s - 3, 1);
      ctx.fillRect(x + 2, y + Math.floor(s * 0.65), s - 4, 1);
      return;
    }

    if (tile.isNeutral()) {
      ctx.fillStyle = this.TERRAIN_BG[tile.terrain] ?? '#111122';
      ctx.fillRect(x, y, s, s);
      this._drawTerrainDetail(tile, x, y, s);
    } else {
      ctx.fillStyle = this.OWNER_COLORS[tile.ownerId] ?? '#333';
      ctx.fillRect(x, y, s, s);
    }
  }

  _drawTerritoryBorders(tile) {
    const ctx = this.ctx;
    const x = tile.getPixelX(), y = tile.getPixelY(), s = tile.size;
    const oid = tile.ownerId;
    ctx.fillStyle = this.OWNER_BORDER[oid] ?? '#aaa';

    const nbs = [
      { dx: 0, dy: -1, ex: x,     ey: y,         ew: s, eh: 2 },
      { dx: 0, dy:  1, ex: x,     ey: y + s - 2, ew: s, eh: 2 },
      { dx:-1, dy:  0, ex: x,     ey: y,         ew: 2, eh: s },
      { dx: 1, dy:  0, ex: x+s-2, ey: y,         ew: 2, eh: s },
    ];

    for (const nb of nbs) {
      const n = this.grid.get(tile.gridX + nb.dx, tile.gridY + nb.dy);
      if (!n || n.isWater() || n.ownerId !== oid) {
        ctx.fillRect(nb.ex, nb.ey, nb.ew, nb.eh);
      }
    }
  }

  _drawShading(tile) {
    const ctx = this.ctx;
    const x = tile.getPixelX(), y = tile.getPixelY(), s = tile.size;
    const oid = String(tile.ownerId);

    ctx.fillStyle = this._alpha(this.OWNER_LIGHT[oid] ?? '#fff', 0.22);
    ctx.fillRect(x, y, s, 2);
    ctx.fillRect(x, y, 2, s);

    ctx.fillStyle = this._alpha(this.OWNER_SHADOW[oid] ?? '#000', 0.32);
    ctx.fillRect(x, y + s - 2, s, 2);
    ctx.fillRect(x + s - 2, y, 2, s);
  }

  _drawTerrainDetail(tile, x, y, s) {
    const ctx = this.ctx;
    if (tile.terrain === 'forest') {
      const mid = Math.floor(s / 2);
      ctx.fillStyle = '#0f3320';
      ctx.fillRect(x + mid - 1, y + s - 5, 2, 5);
      ctx.fillStyle = '#1a5c30';
      ctx.fillRect(x + 3, y + 5, s - 6, s - 10);
      ctx.fillStyle = '#238040';
      ctx.fillRect(x + 4, y + 3, s - 8, 5);
    } else if (tile.terrain === 'mountain') {
      ctx.fillStyle = '#2a2a40';
      ctx.beginPath();
      ctx.moveTo(x + Math.floor(s * 0.5), y + 2);
      ctx.lineTo(x + s - 2, y + s - 3);
      ctx.lineTo(x + 2, y + s - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6060a0';
      ctx.fillRect(x + Math.floor(s * 0.5) - 1, y + 2, 2, 2);
    } else if (tile.terrain === 'plain') {
      ctx.fillStyle = '#1e2840';
      ctx.fillRect(x + 2, y + 4, 1, 2);
      ctx.fillRect(x + s - 4, y + s - 6, 1, 2);
    }
  }

  _drawExpandable(tile) {
    const ctx = this.ctx;
    const x = tile.getPixelX(), y = tile.getPixelY(), s = tile.size;
    const a = 0.08 + this._pulse * 0.18;
    ctx.fillStyle = `rgba(255,204,0,${a})`;
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = `rgba(255,204,0,${0.4 + this._pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }

  _drawSelection(tile) {
    const ctx = this.ctx;
    const x = tile.getPixelX(), y = tile.getPixelY(), s = tile.size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.setLineDash([]);
  }

  _alpha(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  getOwnerColor(ownerId) {
    return this.OWNER_COLORS[String(ownerId)] ?? '#555';
  }
}
