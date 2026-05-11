class Tile {
  constructor(x, y, size) {
    this.gridX = x;
    this.gridY = y;
    this.size = size;
    this.ownerId = -1;        // -1 = neutral, 0 = player, 1+ = bot
    this.terrain = 'plain';   // plain, forest, mountain, water
    this.devLevel = 0;        // 0-5 economic development
    this.militaryPower = 0;   // 0-10 defense strength
    this.population = 0;
    this.happiness = 100;
    this.continentId = -1;    // 0-3 (4 region)
  }

  getPixelX() { return this.gridX * this.size; }
  getPixelY() { return this.gridY * this.size; }

  isWater() { return this.terrain === 'water'; }
  isNeutral() { return this.ownerId === -1; }
  isOwnedBy(id) { return this.ownerId === id; }

  serialize() {
    return {
      x: this.gridX,
      y: this.gridY,
      owner: this.ownerId,
      terrain: this.terrain,
      dev: this.devLevel,
      military: this.militaryPower,
      pop: this.population,
      happiness: this.happiness,
      continent: this.continentId
    };
  }

  deserialize(data) {
    this.ownerId = data.owner;
    this.terrain = data.terrain;
    this.devLevel = data.dev;
    this.militaryPower = data.military;
    this.population = data.pop;
    this.happiness = data.happiness;
    this.continentId = data.continent;
  }
}
