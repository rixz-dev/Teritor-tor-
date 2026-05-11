class PhaseSystem {
  constructor(onExpandEnd) {
    this.EXPAND_DURATION = 5 * 60; // 300 detik = 5 menit
    // DEBUG: ganti jadi 30 kalau mau test cepet
    // this.EXPAND_DURATION = 30;

    this.timeLeft  = this.EXPAND_DURATION;
    this.active    = false;
    this.onExpandEnd = onExpandEnd;
    this._interval = null;
  }

  // Mulai timer EXPAND phase
  startExpand() {
    this.timeLeft = this.EXPAND_DURATION;
    this.active   = true;
    this._updateDisplay();

    clearInterval(this._interval);
    this._interval = setInterval(() => this._tick(), 1000);
  }

  // Stop timer (pas masuk MANAGE phase)
  stop() {
    this.active = false;
    clearInterval(this._interval);
    this._interval = null;
  }

  _tick() {
    if (!this.active) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this._updateDisplay();

    if (this.timeLeft <= 0) {
      this.stop();
      this.onExpandEnd(); // trigger ke Game.js
    }
  }

  getFormatted() {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  _updateDisplay() {
    const el = document.getElementById('hudTimer');
    if (!el) return;
    el.textContent = this.getFormatted();
    // Merah kalau < 60 detik, kuning normal
    el.style.color = this.timeLeft <= 60 ? '#e63946' : '#ffcc00';
    // Kedip-kedip kalau < 10 detik (CSS animation)
    if (this.timeLeft <= 10) {
      el.classList.add('timer-blink');
    } else {
      el.classList.remove('timer-blink');
    }
  }
}
