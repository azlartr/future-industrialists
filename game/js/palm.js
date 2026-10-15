import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvas, toTex, noise2 } from './tex.js';

/* Date palm: textured trunk of leaf-base "boots", ~36 pinnate fronds folded into a V, date bunches. */
let frondMat, deadMat, trunkMat, bootMat;
function frondTex(dry = false) {
  const W = 256, H = 1024, [c, x] = canvas(W, H); x.clearRect(0, 0, W, H);
  let s = dry ? 7 : 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const yOf = t => H * (1 - t);
  // rachis
  x.strokeStyle = dry ? '#b49a63' : '#b9b77c'; x.lineWidth = 7; x.beginPath(); x.moveTo(W / 2, yOf(0)); x.lineTo(W / 2, yOf(1)); x.stroke();
  // leaflets: narrow blades pointing towards the tip
  for (let t = .1; t < .99; t += .0085) {
    for (const side of [-1, 1]) {
      const len = (W / 2 - 6) * Math.min(1, (t - .08) * 4) * (1 - Math.max(0, t - .75) * 2.6) * (.82 + r() * .18);
      if (len < 6) continue;
      const y0 = yOf(t), ang = .5 + r() * .12, x1 = W / 2 + side * len * Math.cos(ang), y1 = y0 - len * Math.sin(ang) * .9;
      const g = dry ? [150 + r() * 40, 120 + r() * 30, 70] : [98 + r() * 30, 120 + r() * 26, 70 + r() * 18];
      x.strokeStyle = `rgb(${g[0] | 0},${g[1] | 0},${g[2] | 0})`; x.lineWidth = 3.6 + r() * 1.8; x.lineCap = 'round';
      x.beginPath(); x.moveTo(W / 2 + side * 3, y0); x.quadraticCurveTo(W / 2 + side * len * .55, y0 - len * .32, x1, y1); x.stroke();
    }
  }
  // spines on the lower rachis
  if (!dry) for (let t = .02; t < .1; t += .012) for (const side of [-1, 1]) { x.strokeStyle = '#9a8c5a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2, yOf(t)); x.lineTo(W / 2 + side * 26, yOf(t) - 18); x.stroke(); }
  const t = toTex(c, { aniso: 8 }); return t;
}
function trunkTex() {
  const W = 512, H = 512, [c, x] = canvas(W, H), n = noise2(4);
  x.fillStyle = '#4a3a2a'; x.fillRect(0, 0, W, H);
  const cols = 8, rows = 8, cw = W / cols, rh = H / rows;
  for (let j = -1; j <= rows; j++) for (let i = -1; i <= cols; i++) {
    const ox = (j % 2) * cw / 2, cx = i * cw + ox + cw / 2, cy = j * rh + rh / 2, v = n(i * 1.7, j * 1.3);
    const g = x.createLinearGradient(cx, cy - rh * .6, cx, cy + rh * .5); g.addColorStop(0, `rgb(${120 + v * 40},${100 + v * 30},${74 + v * 20})`); g.addColorStop(1, `rgb(${70 + v * 20},${56 + v * 14},${40 + v * 10})`);
    x.fillStyle = g; x.beginPath(); x.moveTo(cx - cw * .46, cy - rh * .1); x.quadraticCurveTo(cx, cy - rh * .75, cx + cw * .46, cy - rh * .1); x.lineTo(cx + cw * .3, cy + rh * .45); x.lineTo(cx - cw * .3, cy + rh * .45); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(30,22,14,.6)'; x.lineWidth = 2; x.stroke();
    x.strokeStyle = 'rgba(200,180,140,.15)'; x.lineWidth = 1; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(cx - cw * .3 + k * cw * .15, cy - rh * .3); x.lineTo(cx - cw * .25 + k * cw * .13, cy + rh * .4); x.stroke(); }
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function mats() {
  if (frondMat) return;
  frondMat = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: .38, side: THREE.DoubleSide, roughness: .62, metalness: 0, color: '#d8e0c8' });
  deadMat = new THREE.MeshStandardMaterial({ map: frondTex(true), alphaTest: .45, side: THREE.DoubleSide, roughness: .8 });
  const tt = trunkTex(); trunkMat = new THREE.MeshStandardMaterial({ map: tt, bumpMap: tt, bumpScale: 6, roughness: .95 });
  bootMat = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: .95 });
}
function frond(L, el, az, sag, width = .55, fold = .5) {
  const N = 18, pos = [], uv = [], idx = [];
  const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
  const C = t => dir.clone().multiplyScalar(L * t).add(new THREE.Vector3(0, -sag * t * t * L, 0));
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = C(t), T = C(Math.min(1, t + .01)).sub(C(Math.max(0, t - .01))).normalize();
    const side = new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, T).normalize();
    const w = width * Math.min(1, t * 3) * (1 - t * .55);
    for (const s of [-1, 0, 1]) {
      const q = p.clone().addScaledVector(side, s * w * Math.cos(fold)).addScaledVector(up, Math.abs(s) * w * Math.sin(fold));
      pos.push(q.x, q.y, q.z); uv.push((s + 1) / 2, t);
    }
    if (i < N) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const cache = {};
function crown(seed) {
  if (cache[seed]) return cache[seed];
  let s = seed * 9973 + 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const green = [], dead = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const k = i / n, az = i * 2.39996 + r() * .2, el = 1.25 - k * 1.75 + (r() - .5) * .15;
    const L = 3.3 + r() * .9 - (k < .15 ? 1 : 0), sag = .12 + k * .55;
    (k > .9 ? dead : green).push(frond(L, el, az, sag, .5 + r() * .1, .45 + r() * .15));
  }
  for (let i = 0; i < 5; i++) dead.push(frond(2.2 + r(), -1.2 - r() * .25, r() * 6.28, .05, .32, .2));
  cache[seed] = { green: mergeGeometries(green), dead: mergeGeometries(dead) }; return cache[seed];
}
export function makePalm(h = 8, seed = 1) {
  mats();
  const g = new THREE.Group(); let s = seed * 7 + 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const lean = (r() - .5) * .5, leanZ = (r() - .5) * .5;
  const tg = new THREE.CylinderGeometry(.26, .33, h, 20, 24, true); tg.translate(0, h / 2, 0);
  const p = tg.attributes.position, uv = tg.attributes.uv;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / h; p.setX(i, p.getX(i) + lean * t * t); p.setZ(i, p.getZ(i) + leanZ * t * t); uv.setY(i, uv.getY(i) * h / .65); }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, trunkMat); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  const top = new THREE.Vector3(lean, h, leanZ);
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 1.1, 16), bootMat); boot.position.copy(top).add(new THREE.Vector3(0, -.15, 0)); boot.castShadow = true; g.add(boot);
  const cr = crown(seed % 4);
  const gm = new THREE.Mesh(cr.green, frondMat), dm = new THREE.Mesh(cr.dead, deadMat);
  for (const m of [gm, dm]) { m.position.copy(top).add(new THREE.Vector3(0, .1, 0)); m.rotation.y = r() * 6.28; m.castShadow = true; m.receiveShadow = true; g.add(m); }
  // date bunches
  const dateM = new THREE.MeshStandardMaterial({ color: '#d98a1e', roughness: .5 });
  for (let b = 0; b < 3; b++) {
    const a = b * 2.1 + r(), bunch = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), dateM, 60), m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) { const yy = -r() * .5, rr = .08 + (-yy) * .2; m4.makeTranslation(Math.cos(i) * rr * r(), yy, Math.sin(i * 1.3) * rr * r()); bunch.setMatrixAt(i, m4); }
    bunch.position.copy(top).add(new THREE.Vector3(Math.cos(a) * .45, -.25, Math.sin(a) * .45)); bunch.castShadow = true; g.add(bunch);
  }
  return g;
}
