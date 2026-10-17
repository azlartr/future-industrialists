import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, BRAND } from './tex.js';
import { TRACKS } from './regions.js';
import { TOUR } from './content.js';
import { makePalmField } from './palm.js';

/* The walk-through inside a factory hall. The student comes in at the front-left door into a small
   gear room (lockers), steps through the safety gate onto the production floor, reads three
   information kiosks along the green walkway, starts the factory's mission at the terminal, and
   finishes at the supervisor's booth. A golden gear is tucked away somewhere on the floor. */
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .2, ...o });
function mk(geo, mat, x, y, z, cast = true) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; }
const box = (w, h, d, mat, x, y, z) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
function screenTex(title, sub, n, color) {
  const [c, x] = canvas(512, 352); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 512, 352);
  const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, color); g.addColorStop(1, '#847bb8'); x.fillStyle = g; x.fillRect(0, 0, 512, 10);
  x.fillStyle = color; x.beginPath(); x.arc(256, 112, 62, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '700 72px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 256, 116);
  x.direction = 'rtl'; x.font = '700 44px "Readex Pro"'; x.fillText(title, 256, 226); x.font = '500 28px "Readex Pro"'; x.fillStyle = '#9fb3e8'; x.fillText(sub, 256, 290);
  return toTex(c);
}
/* every factory presents its facts in its own way: the kiosk's shape, the screen's look, and the card
   that opens when the student reads it (comic, poster, hologram, blueprint, notebook, water) */
export const FSTYLE = {
  rabie: { kiosk: 'carton', theme: 'comic', ic: ['🍊', '🔥', '📦'] }, coca: { kiosk: 'bottle', theme: 'poster', ic: ['💧', '🧪', '🍾'] },
  kacst: { kiosk: 'holo', theme: 'holo', ic: ['🥼', '🛰️', '☀️'] }, york: { kiosk: 'acunit', theme: 'blueprint', ic: ['❄️', '⚙️', '🧪'] },
  sadafco: { kiosk: 'churn', theme: 'notebook', ic: ['🐄', '🔥', '🥛'] }, yamamah: { kiosk: 'plate', theme: 'blueprint', ic: ['🔥', '⚙️', '♻️'] },
  kareeda: { kiosk: 'palm', theme: 'notebook', ic: ['🌴', '💦', '🗺️'] }, naqi: { kiosk: 'drop', theme: 'drop', ic: ['💧', '🔬', '🍶'] },
  tozeen: { kiosk: 'gift', theme: 'comic', ic: ['⚖️', '🍪', '🎁'] }, petro: { kiosk: 'drum', theme: 'holo', ic: ['🛢️', '🏭', '🔥'] },
  desal: { kiosk: 'wave', theme: 'drop', ic: ['🌊', '🔬', '🚰'] }, port: { kiosk: 'container', theme: 'blueprint', ic: ['📦', '🏗️', '🚢'] }
};
/* the kiosk's screen, drawn in the factory's theme */
function themedScreen(theme, title, n, icon, color) {
  const [c, x] = canvas(512, 352), W = 512, H = 352;
  const head = (fg, sub) => { x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillStyle = fg; let fs = 46; x.font = `700 ${fs}px "Readex Pro"`; while (x.measureText(title).width > 440 && fs > 26) { fs -= 2; x.font = `700 ${fs}px "Readex Pro"`; } x.fillText(title, W / 2, 262); x.font = '500 26px "Readex Pro"'; x.fillStyle = sub; x.fillText('اقرأ المعلومة', W / 2, 314); };
  const emo = (ex, ey, size) => { x.font = `${size}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'ltr'; x.fillText(icon, ex, ey); };
  if (theme === 'comic') {
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, W, H); x.fillStyle = color + '33'; for (let i = 0; i < W; i += 16) for (let j = 0; j < H; j += 16) { x.beginPath(); x.arc(i + (j % 32 ? 8 : 0), j, 3, 0, 7); x.fill(); }
    x.fillStyle = color; x.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? 70 : 96; x.lineTo(150 + Math.cos(a) * r, 120 + Math.sin(a) * r); } x.fill(); x.fillStyle = '#fff'; x.font = '900 80px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 150, 126);
    emo(370, 120, 120); x.strokeStyle = '#1b2263'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8); head('#1b2263', '#5a6390');
  } else if (theme === 'poster') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, color); g.addColorStop(1, '#5e0911'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 10; x.beginPath(); x.moveTo(0, 200); x.bezierCurveTo(150, 150, 330, 250, W, 180); x.stroke();
    x.fillStyle = '#fff'; x.font = '900 150px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 130, 110); emo(370, 105, 110); head('#ffffff', 'rgba(255,255,255,.75)');
  } else if (theme === 'holo') {
    x.fillStyle = '#06112b'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(79,227,255,.18)'; x.lineWidth = 1; for (let i = 0; i < W; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 24) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    x.strokeStyle = '#4fe3ff'; x.lineWidth = 4; x.beginPath(); x.arc(256, 112, 70, 0, 7); x.stroke(); x.beginPath(); x.arc(256, 112, 84, -.6, 1.2); x.stroke(); x.fillStyle = '#4fe3ff'; x.font = '700 70px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 256, 116); emo(420, 110, 70); head('#bff5ff', '#4fe3ff');
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let j = 0; j < H; j += 4) x.fillRect(0, j, W, 2);
  } else if (theme === 'blueprint') {
    x.fillStyle = '#123f7a'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1; for (let i = 0; i < W; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 20) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.setLineDash([10, 8]); x.strokeRect(20, 20, W - 40, H - 40); x.setLineDash([]); x.beginPath(); x.arc(140, 115, 62, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.font = '700 72px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 140, 118); emo(370, 112, 96); head('#ffffff', '#bcd4f5');
  } else if (theme === 'notebook') {
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(80,120,200,.25)'; x.lineWidth = 2; for (let j = 60; j < H; j += 34) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } x.strokeStyle = 'rgba(220,80,80,.4)'; x.beginPath(); x.moveTo(W - 60, 0); x.lineTo(W - 60, H); x.stroke();
    x.fillStyle = 'rgba(242,194,48,.7)'; x.save(); x.translate(256, 14); x.rotate(-.04); x.fillRect(-60, -14, 120, 30); x.restore();
    x.fillStyle = color; x.font = '700 92px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 150, 125); emo(350, 120, 110); head('#5a3a16', '#8a6a3a');
  } else {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e6f6ff'); g.addColorStop(1, '#8fd0f2'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc((i * 83) % W, (i * 57) % 200, 6 + i % 10, 0, 7); x.fill(); }
    x.fillStyle = color; x.beginPath(); x.moveTo(150, 30); x.bezierCurveTo(190, 80, 220, 110, 220, 140); x.bezierCurveTo(220, 180, 190, 205, 150, 205); x.bezierCurveTo(110, 205, 80, 180, 80, 140); x.bezierCurveTo(80, 110, 110, 80, 150, 30); x.fill();
    x.fillStyle = '#fff'; x.font = '700 64px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 150, 145); emo(370, 118, 100); head('#0d3a5c', '#1f6f9f');
  }
  return toTex(c);
}
/* the kiosk itself, front facing -z, the screen returned so it can be lit */
function kioskModel(kind, color, tex, anim) {
  const g = new THREE.Group(), face = new THREE.MeshStandardMaterial({ map: tex, emissive: '#fff', emissiveMap: tex, emissiveIntensity: .75 });
  const screen = (w, h, x, y, z, tilt = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face); p.position.set(x, y, z); p.rotation.set(tilt, Math.PI, 0); g.add(p); return p; };
  const brandM = std(color), white = std('#f6f7fa'), dark = std('#2b3038', { metalness: .6, roughness: .35 });
  if (kind === 'carton') { g.add(box(1.2, 1.9, .9, white, 0, .95, 0)); g.add(box(1.22, .7, .92, brandM, 0, .45, 0)); const roof = mk(new THREE.CylinderGeometry(.01, .86, .5, 4), white, 0, 2.15, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = .75; g.add(roof); g.add(box(.18, .2, .18, brandM, .2, 2.45, 0)); screen(.96, .66, 0, 1.4, -.46); }
  else if (kind === 'bottle') { const b = mk(new THREE.LatheGeometry([[.001, 0], [.42, 0], [.46, .3], [.42, 1.2], [.24, 1.9], [.15, 2.35], [.16, 2.55], [.001, 2.55]].map(p => new THREE.Vector2(...p)), 28), new THREE.MeshPhysicalMaterial({ color: '#2a0d06', roughness: .06, clearcoat: 1 }), 0, 0, 0); g.add(b); g.add(mk(new THREE.CylinderGeometry(.47, .47, .1, 24), brandM, 0, 2.6, 0)); g.add(box(1.05, .78, .08, dark, 0, 1.05, -.42)); screen(.96, .66, 0, 1.05, -.47); }
  else if (kind === 'holo') { g.add(mk(new THREE.CylinderGeometry(.45, .55, .25, 32), dark, 0, .12, 0)); const ring = mk(new THREE.TorusGeometry(.4, .03, 8, 40), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#4fe3ff', emissiveIntensity: 2 }), 0, .27, 0); ring.rotation.x = Math.PI / 2; g.add(ring); const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .3, 1.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#4fe3ff', transparent: true, opacity: .12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = .9; g.add(beam); face.transparent = true; face.opacity = .9; const p = screen(1.1, .76, 0, 1.75, 0); anim.push(t => { p.position.y = 1.75 + Math.sin(t * 1.6) * .04; face.emissiveIntensity = .8 + Math.sin(t * 9) * .05; }); }
  else if (kind === 'acunit') { g.add(mk(new THREE.CylinderGeometry(.05, .07, 1.1, 10), dark, 0, .55, 0)); g.add(mk(new RoundedBoxGeometry(1.4, .9, .35, 3, .08), white, 0, 1.45, .05)); g.add(box(1.2, .06, .05, std('#d3d8e0'), 0, 1.05, -.12)); screen(1, .62, 0, 1.5, -.13); }
  else if (kind === 'churn') { g.add(mk(new THREE.LatheGeometry([[.001, 0], [.4, 0], [.42, .7], [.3, .95], [.22, 1.05], [.24, 1.15], [.001, 1.15]].map(p => new THREE.Vector2(...p)), 24), std('#dfe4ea', { metalness: .8, roughness: .3 }), 0, 0, 0)); g.add(mk(new THREE.CylinderGeometry(.43, .43, .12, 24), brandM, 0, .45, 0)); g.add(mk(new THREE.CylinderGeometry(.04, .04, .7, 8), dark, 0, 1.4, .1)); g.add(box(1.05, .74, .06, white, 0, 1.85, .05)); screen(.96, .66, 0, 1.85, .01); }
  else if (kind === 'plate') { for (const x of [-.6, .6]) g.add(box(.14, 2.2, .14, dark, x, 1.1, 0)); g.add(box(1.4, .14, .2, dark, 0, 2.2, 0)); g.add(box(1.16, .86, .05, std('#7d8592', { metalness: .9, roughness: .3 }), 0, 1.45, 0)); for (const [x, y] of [[-.52, 1.06], [.52, 1.06], [-.52, 1.84], [.52, 1.84]]) g.add(mk(new THREE.SphereGeometry(.03, 8, 6), dark, x, y, -.04)); screen(.96, .66, 0, 1.45, -.03); }
  else if (kind === 'palm') { g.add(box(.18, 2.4, .18, new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: .8 }), .7, 1.2, .1)); const fr = makePalmField([[.7, .1]], { h: 2.6, lite: true }); g.add(fr); g.add(box(1.2, .86, .08, std('#b07a4a', { roughness: .7 }), 0, 1.35, 0)); g.add(box(.08, 1, .08, std('#8a6a3a'), -.5, .5, .05)); screen(1.04, .72, 0, 1.35, -.05); }
  else if (kind === 'drop') { const d = mk(new THREE.LatheGeometry(Array.from({ length: 18 }, (_, i) => { const t = i / 17, a = t * Math.PI; return new THREE.Vector2(Math.sin(a) * .62 * Math.pow(1 - t, .6) + .001, t * 2.4); }), 28), new THREE.MeshPhysicalMaterial({ color: '#7cc8ea', roughness: .1, transparent: true, opacity: .55, clearcoat: 1 }), 0, 0, .1); g.add(d); screen(.86, .6, 0, .95, -.42); g.add(box(.94, .68, .04, dark, 0, .95, -.39)); }
  else if (kind === 'gift') { const giftM = std('#f3e7d3'), rib = std(color, { metalness: .4 }); g.add(box(1.2, .9, .9, giftM, 0, .45, 0)); g.add(box(1.22, .92, .12, rib, 0, .45, 0)); g.add(box(.12, .92, .92, rib, 0, .45, 0)); g.add(box(.9, .7, .7, std('#fbd8e6'), 0, 1.25, 0)); for (const s of [-1, 1]) { const bw = mk(new THREE.TorusGeometry(.14, .05, 8, 16), rib, s * .14, 1.68, 0); g.add(bw); } screen(.82, .56, 0, 1.25, -.36); }
  else if (kind === 'drum') { g.add(mk(new THREE.CylinderGeometry(.42, .42, 1.1, 24), std(color, { metalness: .5 }), 0, .55, 0)); for (const y of [.3, .8]) { const r = mk(new THREE.TorusGeometry(.43, .03, 6, 24), dark, 0, y, 0); r.rotation.x = Math.PI / 2; g.add(r); } g.add(box(1.1, .78, .06, dark, 0, 1.6, 0)); screen(1, .7, 0, 1.6, -.04); }
  else if (kind === 'wave') { const arch = mk(new THREE.TorusGeometry(.9, .1, 10, 32, Math.PI), std('#1f86c9', { metalness: .3 }), 0, .05, 0); g.add(arch); screen(1.1, .76, 0, .95, -.02); g.add(box(1.16, .82, .04, std('#e6f6ff'), 0, .95, .02)); }
  else if (kind === 'container') { const t = corrug(color); g.add(box(2, 1.5, 1.1, new THREE.MeshStandardMaterial({ map: t, metalness: .35, roughness: .55 }), 0, .75, .2)); screen(1.1, .76, 0, 1.0, -.37); g.add(box(1.16, .82, .03, dark, 0, 1.0, -.36)); }
  else { g.add(mk(new THREE.CylinderGeometry(.05, .07, 1.25, 12), dark, 0, .62, 0)); g.add(box(.98, .7, .07, dark, 0, 1.4, 0)); screen(.9, .62, 0, 1.4, -.04, -.45); }
  return g;
}
function corrug(col) { const [c, x] = canvas(256, 64); x.fillStyle = col; x.fillRect(0, 0, 256, 64); for (let i = 0; i < 256; i += 16) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 5, 64); } return toTex(c); }
function signTex(lines, bg = '#f2c230', fg = '#1b2263') {
  const [c, x] = canvas(1024, 192); x.fillStyle = bg; x.fillRect(0, 0, 1024, 192);
  for (let i = -2; i < 22; i++) { x.fillStyle = i % 2 ? '#1b2263' : bg; x.beginPath(); x.moveTo(i * 52, 192); x.lineTo(i * 52 + 26, 172); x.lineTo(i * 52 + 52, 172); x.lineTo(i * 52 + 26, 192); x.fill(); }
  x.fillStyle = fg; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 64px "Readex Pro"'; x.fillText(lines[0], 512, 84); if (lines[1]) { x.font = '500 38px "Readex Pro"'; x.fillText(lines[1], 512, 142); }
  return toTex(c);
}
function iconTex(glyph, color) {
  const [c, x] = canvas(128, 128); x.fillStyle = color; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.font = '700 60px "Readex Pro", "Segoe UI Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(glyph, 64, 68);
  return toTex(c);
}
function gearGeo() {
  const s = new THREE.Shape(), N = 10, R1 = .32, R2 = .42;
  for (let i = 0; i < N * 2; i++) { const a0 = i / (N * 2) * Math.PI * 2, a1 = (i + 1) / (N * 2) * Math.PI * 2, r = i % 2 ? R1 : R2; const p0 = [Math.cos(a0 + .05) * r, Math.sin(a0 + .05) * r], p1 = [Math.cos(a1 - .05) * r, Math.sin(a1 - .05) * r]; if (i === 0) s.moveTo(...p0); else s.lineTo(...p0); s.lineTo(...p1); }
  const h = new THREE.Path(); h.absarc(0, 0, .13, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }); g.center(); return g;
}
export const GEAR_GEO = gearGeo();
export const GEAR_MAT = new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: .9, roughness: .22, emissive: '#7a5200', emissiveIntensity: .35 });

export function addTour(IN, F, M) {
  const scene = IN.scene, T = TRACKS[M.track], C = TOUR[F.id], anim = [], FS = FSTYLE[F.id] || FSTYLE.rabie;
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfeefa', roughness: .05, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
  const frameM = std('#2b3038', { metalness: .6, roughness: .35 }), brand = std(F.color), white = std('#f2f4f7');
  // the door the student comes in by, on the front wall
  scene.add(box(2.6, 3, .2, frameM, -16, 1.5, 12.88)); scene.add(box(2.2, 2.7, .1, new THREE.MeshStandardMaterial({ color: '#9fc3e0', metalness: .3, roughness: .1 }), -16, 1.35, 12.8));
  { const ex = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .45), new THREE.MeshStandardMaterial({ map: signTex(['مدخل الزوار', 'VISITORS'], '#0f9d58', '#fff'), emissive: '#fff', emissiveIntensity: .2 })); ex.position.set(-16, 3.4, 12.7); ex.rotation.y = Math.PI; scene.add(ex); }
  // the gear room: glass partition with a safety gate onto the floor
  const part = [[-15.95, 8.5, 7.9, .1], [-12, 9, .1, 1], [-12, 12.15, .1, 1.5]];
  for (const [x, z, w, d] of part) { scene.add(mk(new THREE.BoxGeometry(w, 2.4, d), glassM, x, 1.2, z, false)); scene.add(box(w + .06, .08, d + .06, frameM, x, 2.42, z)); }
  IN.boxes.push([-19.9, 8.4, -12, 8.6], [-12.1, 8.5, -11.9, 9.5], [-12.1, 11.4, -11.9, 12.9]);
  const gate = [new THREE.Group(), new THREE.Group()], stripeT = (() => { const [c, x] = canvas(64, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1b2263' : '#f2c230'; x.fillRect(0, i * 32, 64, 32); } return toTex(c); })();
  gate.forEach((g, i) => { g.position.set(-12, 0, i ? 11.4 : 9.4); scene.add(g); const leaf = mk(new THREE.BoxGeometry(.08, 1.1, 1), new THREE.MeshStandardMaterial({ map: stripeT, roughness: .5 }), 0, .7, i ? -.5 : .5); g.add(leaf); });
  const gateBox = [-12.15, 9.4, -11.85, 11.4]; IN.boxes.push(gateBox);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4, .75), new THREE.MeshStandardMaterial({ map: signTex(['منطقة الإنتاج', 'الدخول بمعدات الوقاية فقط']), roughness: .5 })); banner.position.set(-11.9, 3.35, 10.4); banner.rotation.y = Math.PI / 2; scene.add(banner);
  const lockerM = std(F.color, { metalness: .5, roughness: .35 }), ventM = std('#1e2430');
  for (let i = 0; i < 6; i++) { const x = -18.6 + i * .95; scene.add(box(.9, 2.1, .55, lockerM, x, 1.05, 12.45)); for (let k = 0; k < 3; k++) scene.add(box(.5, .03, .02, ventM, x, 1.75 - k * .07, 12.16)); scene.add(box(.04, .22, .04, white, x + .3, 1.1, 12.16)); }
  IN.boxes.push([-19.9, 12.1, -13.6, 12.9]);
  scene.add(box(3.4, .1, .5, std('#b07a4a', { roughness: .6 }), -16.2, .48, 10.9)); IN.boxes.push([-17.9, 10.6, -14.5, 11.2]);
  // information kiosks along the green walkway
  const kiosks = C.facts.map((f, i) => {
    const x = -8 + i * 10, z = 6.95;
    const g = kioskModel(FS.kiosk, F.color, themedScreen(FS.theme, f.t.ar, String(i + 1), FS.ic[i], FS.theme === 'poster' ? F.color : T.color), anim); g.position.set(x, 0, z); scene.add(g);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    IN.circles.push([x, z, FS.kiosk === 'container' ? 1 : .6]);
    return { x, z: z - 1.2, i };
  });
  // the mission terminal at the far end of the walkway
  const term = new THREE.Group(); term.position.set(16.2, 0, 4.7); term.rotation.y = -Math.PI / 2; scene.add(term);
  term.add(mk(new RoundedBoxGeometry(1.5, 1.05, .8, 3, .08), white, 0, .53, 0)); term.add(box(1.6, .08, .9, brand, 0, 1.08, 0));
  const tt = screenTex(M.title, 'ابدأ المهمة', '★', T.color), tscr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .95), new THREE.MeshStandardMaterial({ map: tt, emissive: '#fff', emissiveMap: tt, emissiveIntensity: .8 }));
  tscr.position.set(0, 1.75, -.15); tscr.rotation.x = -.15; term.add(tscr); term.add(box(1.5, 1.05, .06, frameM, 0, 1.75, -.2));
  IN.boxes.push([15.7, 3.9, 16.7, 5.5]);
  // the supervisor's booth at the back right
  const booth = new THREE.Group(); scene.add(booth);
  booth.add(mk(new THREE.BoxGeometry(5.8, 2.6, .1), glassM, 17, 1.3, -8.6, false)); booth.add(mk(new THREE.BoxGeometry(.1, 2.6, 3.4), glassM, 14.1, 1.3, -11.2, false));
  booth.add(box(5.9, .12, 4.4, frameM, 17, 2.66, -10.75)); booth.add(box(1.6, .9, .7, std('#b07a4a'), 15, .45, -10)); booth.add(box(.6, .5, .05, frameM, 15, 1.2, -10.2));
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(3, .55), new THREE.MeshStandardMaterial({ map: signTex(['مكتب المشرف', 'SUPERVISOR'], '#ffffff', '#1b2263'), roughness: .5 })); bs.position.set(17, 3.05, -8.54); scene.add(bs);
  IN.boxes.push([14, -12.9, 19.9, -8.5]);
  // the golden gear on a crate: one jump up
  const crateM = std('#c69c64', { roughness: .8 }); scene.add(box(1.3, .72, 1.3, crateM, -18, .36, -7.4)); scene.add(box(1, .5, 1, crateM, -16.6, .25, -7.5));
  const platforms = [[-18.65, -8.05, -17.35, -6.75, .72], [-17.1, -8, -16.1, -7, .5]];
  const gear = new THREE.Mesh(GEAR_GEO, GEAR_MAT); gear.position.set(-18, 1.25, -7.4); gear.castShadow = true; scene.add(gear);
  const gl = new THREE.PointLight('#ffd36a', 3, 4); gl.position.set(-18, 1.6, -7.4); scene.add(gl);
  anim.push(t => { gear.rotation.y = t * 1.6; gear.position.y = 1.25 + Math.sin(t * 2.3) * .06; });
  // floating markers over the next station
  const mkIcon = (glyph, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(glyph, color), depthTest: false, transparent: true })); s.scale.setScalar(.7); s.renderOrder = 9; s.visible = false; scene.add(s); return s; };
  const icons = { ppe: mkIcon('⛑', '#e0a21c'), k0: mkIcon('1', T.color), k1: mkIcon('2', T.color), k2: mkIcon('3', T.color), mission: mkIcon('★', '#847bb8'), quiz: mkIcon('✓', '#2fb36d') };
  icons.ppe.position.set(-16, 2.7, 12); kiosks.forEach((k, i) => icons['k' + i].position.set(k.x, 2.6, 6.95)); icons.mission.position.set(16.2, 3.2, 4.7); icons.quiz.position.set(15, 2.3, -10);
  let gt = 0, gateOpen = 0, gateWant = 0;
  return {
    kiosks, gear, platforms, icons,
    spawn: new THREE.Vector3(-16, 0, 10.1),
    points: { ppe: new THREE.Vector3(-16, 0, 11.2), mission: new THREE.Vector3(15.1, 0, 4.7), quiz: new THREE.Vector3(13.4, 0, -10.1), exit: new THREE.Vector3(-16, 0, 12.2) },
    openGate() { gateWant = 1; const i = IN.boxes.indexOf(gateBox); if (i >= 0) IN.boxes.splice(i, 1); },
    update(dt) {
      gt += dt; for (const f of anim) f(gt);
      gateOpen += (gateWant - gateOpen) * Math.min(1, dt * 3); gate[0].rotation.y = gateOpen * 1.5; gate[1].rotation.y = -gateOpen * 1.5;
      for (const k in icons) icons[k].position.y += Math.sin(gt * 2.4 + k.length) * .002;
    }
  };
}
