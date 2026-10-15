/* Ambient 2D effects for the menu screens: drifting light motes and the brand's thin network.
   One canvas per screen; animation pauses while the canvas is hidden. */
export class Ambient {
  constructor(cv, { motes = 50, net = 0, netArea = [0, 0, 1, .45], color = '255,226,160', netColor = '255,255,255', mouse = false } = {}) {
    this.cv = cv; this.cx = cv.getContext('2d'); this.o = { motes, net, netArea, color, netColor, mouse }; this.run = false; this.m = null;
    this.resize(); addEventListener('resize', () => this.resize());
    if (mouse) { addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); this.m = [e.clientX - r.left, e.clientY - r.top]; }); }
  }
  resize() {
    this.w = Math.max(1, this.cv.clientWidth); this.h = Math.max(1, this.cv.clientHeight);
    this.cv.width = this.w; this.cv.height = this.h; this.seed();
  }
  seed() {
    const { motes, net, netArea: [ax, ay, aw, ah] } = this.o, w = this.w, h = this.h;
    this.p = Array.from({ length: motes }, () => this.mote(true));
    this.n = Array.from({ length: net }, () => ({ x: (ax + Math.random() * aw) * w, y: (ay + Math.random() * ah) * h, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .12 }));
    this.pulses = [];
  }
  mote(any) { return { x: Math.random() * this.w, y: any ? Math.random() * this.h : this.h + 10, r: .8 + Math.random() * 2.2, vy: .15 + Math.random() * .45, vx: (Math.random() - .5) * .25, t: Math.random() * 6.28, a: .25 + Math.random() * .6 }; }
  start() { if (this.run) return; this.run = true; const f = () => { if (!this.run) return; if (this.cv.offsetParent !== null) { if (this.cv.clientWidth !== this.w || this.cv.clientHeight !== this.h) this.resize(); this.draw(); } requestAnimationFrame(f); }; requestAnimationFrame(f); }
  stop() { this.run = false; }
  draw() {
    const c = this.cx, w = this.w, h = this.h, { netArea: [ax, ay, aw, ah], color, netColor } = this.o;
    c.clearRect(0, 0, w, h);
    // network
    const n = this.n, maxD = Math.min(220, w * .18);
    for (const q of n) {
      q.x += q.vx; q.y += q.vy;
      if (q.x < ax * w || q.x > (ax + aw) * w) q.vx *= -1; if (q.y < ay * h || q.y > (ay + ah) * h) q.vy *= -1;
      if (this.m) { const dx = this.m[0] - q.x, dy = this.m[1] - q.y, d = Math.hypot(dx, dy); if (d < 160) { q.x += dx * .002; q.y += dy * .002; } }
    }
    c.lineWidth = 1;
    for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) {
      const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y); if (d > maxD) continue;
      c.strokeStyle = `rgba(${netColor},${.22 * (1 - d / maxD)})`; c.beginPath(); c.moveTo(n[i].x, n[i].y); c.lineTo(n[j].x, n[j].y); c.stroke();
    }
    if (this.m) for (const q of n) { const d = Math.hypot(this.m[0] - q.x, this.m[1] - q.y); if (d < 170) { c.strokeStyle = `rgba(${netColor},${.35 * (1 - d / 170)})`; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(this.m[0], this.m[1]); c.stroke(); } }
    c.fillStyle = `rgba(${netColor},.7)`; for (const q of n) { c.beginPath(); c.arc(q.x, q.y, 1.8, 0, 6.283); c.fill(); }
    // a slow pulse travelling along a random link
    if (n.length > 1 && Math.random() < .02 && this.pulses.length < 3) { const a = n[Math.random() * n.length | 0], b = n.reduce((best, q) => q !== a && (!best || Math.hypot(q.x - a.x, q.y - a.y) < Math.hypot(best.x - a.x, best.y - a.y)) ? q : best, null); if (b) this.pulses.push({ a, b, t: 0 }); }
    this.pulses = this.pulses.filter(p => (p.t += .012) < 1);
    for (const p of this.pulses) { const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t, k = Math.sin(p.t * Math.PI); c.fillStyle = `rgba(${netColor},${.9 * k})`; c.beginPath(); c.arc(x, y, 2.6, 0, 6.283); c.fill(); }
    // light motes
    for (const q of this.p) {
      q.y -= q.vy; q.x += q.vx + Math.sin(q.t) * .15; q.t += .02;
      if (q.y < -10) Object.assign(q, this.mote(false));
      const tw = .55 + .45 * Math.sin(q.t * 2.3);
      const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 4); g.addColorStop(0, `rgba(${color},${q.a * tw})`); g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.r * 4, 0, 6.283); c.fill();
    }
  }
}
