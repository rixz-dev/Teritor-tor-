class MapGrid {
  constructor(cols, rows, tileSize) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = [];
    this._init();
  }

  _init() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = new Tile(x, y, this.tileSize);
        tile.terrain = this._randomTerrain(x, y);
        this.tiles.push(tile);
      }
    }
    this._assignContinents();
  }

  _randomTerrain(x, y) {
    // Tepi map ada lebih banyak air — efek "lautan"
    const edgeDist = Math.min(x, y, this.cols - 1 - x, this.rows - 1 - y);
    if (edgeDist < 2 && Math.random() < 0.6) return 'water';

    const r = Math.random();
    if (r < 0.55) return 'plain';
    if (r < 0.75) return 'forest';
    if (r < 0.88) return 'mountain';
    return 'water';
  }

  _assignContinents() {
    // 4 kuadran = 4 benua
    const midX = Math.floor(this.cols / 2);
    const midY = Math.floor(this.rows / 2);

    // Nama benua: 0=Arkon, 1=Velmira, 2=Duskara, 3=Thornex
    for (const tile of this.tiles) {
      const left = tile.gridX < midX;
      const top  = tile.gridY < midY;
      if (left && top)  tile.continentId = 0;
      if (!left && top) tile.continentId = 1;
      if (left && !top) tile.continentId = 2;
      if (!left && !top) tile.continentId = 3;
    }
  }

  // Ambil tile berdasarkan grid coordinate
  get(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.tiles[y * this.cols + x];
  }

  // Ambil tile yang bersebelahan (4 arah, no diagonal)
  getAdjacent(x, y) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs
      .map(([dx, dy]) => this.get(x + dx, y + dy))
      .filter(Boolean);
  }

  // Konversi pixel position ke tile
  getTileAt(pixelX, pixelY) {
    const gx = Math.floor(pixelX / this.tileSize);
    const gy = Math.floor(pixelY / this.tileSize);
    return this.get(gx, gy);
  }

  // Cek apakah tile adjacent ke territory milik ownerId
  isAdjacentToOwner(tile, ownerId) {
    return this.getAdjacent(tile.gridX, tile.gridY)
      .some(t => t.ownerId === ownerId);
  }

  // Ambil semua tile milik owner tertentu
  getTilesByOwner(ownerId) {
    return this.tiles.filter(t => t.ownerId === ownerId);
  }

  // Hitung % kepemilikan 1 benua oleh ownerId
  getContinentControl(continentId, ownerId) {
    const continentTiles = this.tiles.filter(
      t => t.continentId === continentId && !t.isWater()
    );
    if (continentTiles.length === 0) return 0;
    const owned = continentTiles.filter(t => t.ownerId === ownerId).length;
    return owned / continentTiles.length;
  }

  serialize() {
    return this.tiles.map(t => t.serialize());
  }

  deserialize(data) {
    data.forEach(d => {
      const tile = this.get(d.x, d.y);
      if (tile) tile.deserialize(d);
    });
  }
}
