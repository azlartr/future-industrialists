import * as THREE from 'three';

export const BRAND = { violet: '#847bb8', blue: '#3c58a7', navy: '#2a3590', wash: '#c4d3ef' };
const imgCache = {};
export function loadImg(src) {
  if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  return imgCache[src];
}
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function toTex(c, { srgb = true, repeat, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const loader = new THREE.TextureLoader();
export function pbr(name, repeat = [1, 1], { srgbOnly = false } = {}) {
  const f = k => { const t = loader.load(`assets/tex/${name}_${k}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t; };
  const map = f('diff'); map.colorSpace = THREE.SRGBColorSpace;
  return { map, normalMap: f('nor'), roughnessMap: f('rough') };
}
/* simple value noise for organic variation in procedural textures */
export function noise2(seed = 1) {
  const p = new Uint8Array(512); let s = seed * 9301 + 49297;
  for (let i = 0; i < 256; i++) { s = (s * 9301 + 49297) % 233280; p[i] = (s / 233280) * 256 | 0; }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];
  const fade = t => t * t * (3 - 2 * t);
  return (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = p[p[X] + Y] / 255, b = p[p[X + 1] + Y] / 255, c = p[p[X] + Y + 1] / 255, d = p[p[X + 1] + Y + 1] / 255;
    const u = fade(xf), v = fade(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
export function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
/* the thin brand network pattern from the 2026 theme */
export function network(ctx, w, h, { n = 40, color = 'rgba(255,255,255,.35)', dot = 'rgba(255,255,255,.7)', seed = 3, link = 160, lw = 1.2 } = {}) {
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pts = Array.from({ length: n }, () => [r() * w, r() * h]);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < link) { ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke(); } }
  ctx.fillStyle = dot; pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, lw * 2.2, 0, 7); ctx.fill(); });
}
export function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export const FONT = '"Readex Pro"';
