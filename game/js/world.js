import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { canvas, toTex, loadImg, pbr, BRAND, network, grad, noise2 } from './tex.js';
import { makePalm, makePalmField } from './palm.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REGIONS } from './regions.js';

/* One street per region: a 4-lane road along x with a palm median, the bus stop on the near
   sidewalk (+z), three factory compounds behind a wall on the far side (-z) and two compounds
   still under construction. Each region adds its own scenery and light. */
/* The road runs along x. Every place sits behind the wall on the far side (-z) with a zebra crossing
   at its gate; the coach stops on the near lane just before each crossing. */
export const LAYOUT = { SCHOOL_X: -360, FACT_X: [-120, 120, 360], SOON_X: [0, 240], WALL_Z: -14, LANE_Z: 5.6, STOP_BACK: 14, ROAD: 1300 };

const THEMES = {
  riyadh: { elev: 50, azim: -35, turb: 3.2, ray: 1.2, mie: .004, sun: '#fff1dc', sunI: 3, fog: '#d8e1ea', fogD: .0017, ground: '#e9c99a', exposure: .95, tint: '#ffffff', sea: false },
  jeddah: { elev: 24, azim: 160, turb: 4.5, ray: 1.7, mie: .005, sun: '#ffdcb4', sunI: 2.7, fog: '#e4d9d2', fogD: .0011, ground: '#e6caa0', exposure: .95, tint: '#fff6ec', sea: true },
  qassim: { elev: 30, azim: -70, turb: 4, ray: 1.4, mie: .005, sun: '#ffe1b0', sunI: 2.9, fog: '#eadbc4', fogD: .0016, ground: '#d4ab7e', exposure: .95, tint: '#fff4e4', sea: false },
  eastern: { elev: 11, azim: 172, turb: 7, ray: 2.4, mie: .006, sun: '#ffb87e', sunI: 2.4, fog: '#e9cbb8', fogD: .0012, ground: '#e5c9a0', exposure: 1.0, tint: '#ffe9dc', sea: true }
};

function m(g, mat, cast = true) { const o = new THREE.Mesh(g, mat); o.castShadow = cast; o.receiveShadow = true; return o; }
function box(w, h, d, mat, x, y, z, cast = true) { const o = m(new THREE.BoxGeometry(w, h, d), mat, cast); o.position.set(x, y, z); return o; }
function cyl(rt, rb, h, mat, x, y, z, seg = 32, cast = true) { const o = m(new THREE.CylinderGeometry(rt, rb, h, seg), mat, cast); o.position.set(x, y, z); return o; }
/* box UVs scaled to world metres, so tiled textures keep a constant size */
function worldUV(g, scale = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > .5) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale);
    else if (ax > .5) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale);
    else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale);
  }
  return g;
}
function tbox(w, h, d, mat, x, y, z, scale = 1) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); worldUV(g, scale); return m(g, mat); }
let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

/* ---------------- textures ---------------- */
function curbTex() { const [c, x] = canvas(256, 32); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#111317' : '#f2c230'; x.fillRect(i * 64, 0, 64, 32); } const t = toTex(c); t.wrapS = THREE.RepeatWrapping; return t; }
function facadeGlass(cols, rows, seed = 1, tint = [150, 175, 205]) {
  const [c, x] = canvas(512, 1024), n = noise2(seed), cw = 512 / cols, rh = 1024 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = n(i * .7, j * .35) * .5 + Math.random() * .12, k = .55 + v * .5;
    x.fillStyle = `rgb(${tint[0] * k | 0},${tint[1] * k | 0},${tint[2] * k | 0})`; x.fillRect(i * cw, j * rh, cw, rh);
  }
  x.fillStyle = 'rgba(60,66,80,.85)'; for (let i = 0; i <= cols; i++) x.fillRect(i * cw - 2, 0, 4, 1024); for (let j = 0; j <= rows; j++) x.fillRect(0, j * rh - 3, 512, 6);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function facadeStone(cols, rows, seed = 2, base = '#d9c3a0', win = '#3c4656') {
  const [c, x] = canvas(512, 512), n = noise2(seed); x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 512; j += 4) for (let i = 0; i < 512; i += 4) { const v = n(i / 30, j / 30); x.fillStyle = `rgba(120,90,50,${v * .12})`; x.fillRect(i, j, 4, 4); }
  const cw = 512 / cols, rh = 512 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const wx = i * cw + cw * .22, wy = j * rh + rh * .28, ww = cw * .56, wh = rh * .5; x.fillStyle = win; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(160,190,220,.3)'; x.fillRect(wx, wy, ww, wh * .4); }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* Hijazi house front: coral-stone walls with wooden rawasheen bays */
function rawasheen(seed = 3) {
  const [c, x] = canvas(512, 1024), n = noise2(seed); x.fillStyle = '#e8dcc6'; x.fillRect(0, 0, 512, 1024);
  for (let j = 0; j < 1024; j += 4) for (let i = 0; i < 512; i += 4) { x.fillStyle = `rgba(140,110,70,${n(i / 25, j / 25) * .14})`; x.fillRect(i, j, 4, 4); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
    const X = 50 + i * 230, Y = 80 + j * 240; x.fillStyle = ['#2f6f6a', '#7a4a26', '#3d5f8a'][(i + j + seed) % 3]; x.fillRect(X, Y, 180, 190);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(X + 10 + k * 20, Y + 20); x.lineTo(X + 10 + k * 20, Y + 170); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X, Y + 175, 180, 15); x.fillRect(X, Y, 180, 12);
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* Najdi mud wall with triangular openings along the parapet */
function najdi(seed = 4) {
  const [c, x] = canvas(512, 512), n = noise2(seed); x.fillStyle = '#c99a68'; x.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 512; j += 4) for (let i = 0; i < 512; i += 4) { x.fillStyle = `rgba(90,55,25,${n(i / 18, j / 18) * .16})`; x.fillRect(i, j, 4, 4); }
  x.fillStyle = '#6b4526'; for (let i = 0; i < 512; i += 64) { x.beginPath(); x.moveTo(i + 16, 70); x.lineTo(i + 32, 40); x.lineTo(i + 48, 70); x.fill(); }
  x.fillStyle = '#4a2f1a'; for (let i = 0; i < 4; i++) x.fillRect(60 + i * 115, 220, 40, 70);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 100, 512, 6);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

async function logoPanel(F, w, h, { bg = '#ffffff', pad = .1 } = {}) {
  const W = 1024, H = Math.round(1024 * h / w), [c, x] = canvas(W, H);
  x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, W, H, 24); x.fill();
  if (F.logo) {
    const im = await loadImg(F.logo), r = Math.min(W * (1 - pad * 2) / im.width, H * (1 - pad * 2) / im.height);
    x.drawImage(im, (W - im.width * r) / 2, (H - im.height * r) / 2, im.width * r, im.height * r);
  } else {
    const s = H * .5; drawIcon(x, F.icon, W - H * .55, H / 2, s, F.color);
    x.fillStyle = BRAND.ink || '#1b2263'; x.textAlign = 'right'; x.direction = 'rtl'; x.textBaseline = 'middle';
    let fs = H * .3; x.font = `700 ${fs}px "Readex Pro"`; while (x.measureText(F.name).width > W - H * 1.2 && fs > 20) { fs -= 4; x.font = `700 ${fs}px "Readex Pro"`; }
    x.fillStyle = '#1b2263'; x.fillText(F.name, W - H * 1.05, H / 2);
    x.fillStyle = F.color; x.fillRect(0, H - 22, W, 22);
  }
  return toTex(c);
}
export function drawIcon(x, icon, cx, cy, s, color) {
  x.save(); x.translate(cx, cy); x.fillStyle = color; x.strokeStyle = color; x.lineWidth = s * .08; x.lineJoin = 'round'; x.lineCap = 'round';
  if (icon === 'flask') { x.beginPath(); x.moveTo(-s * .14, -s * .42); x.lineTo(-s * .14, -s * .08); x.lineTo(-s * .4, s * .38); x.lineTo(s * .4, s * .38); x.lineTo(s * .14, -s * .08); x.lineTo(s * .14, -s * .42); x.stroke(); x.beginPath(); x.moveTo(-s * .3, s * .2); x.lineTo(s * .3, s * .2); x.lineTo(s * .36, s * .34); x.lineTo(-s * .36, s * .34); x.fill(); x.fillRect(-s * .2, -s * .48, s * .4, s * .08); }
  else if (icon === 'drop') { x.beginPath(); x.moveTo(0, -s * .45); x.bezierCurveTo(s * .2, -s * .15, s * .36, s * .02, s * .36, s * .16); x.arc(0, s * .16, s * .36, 0, Math.PI); x.bezierCurveTo(-s * .36, s * .02, -s * .2, -s * .15, 0, -s * .45); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(-s * .12, s * .18, s * .08, 0, 7); x.fill(); }
  else if (icon === 'ship') { x.beginPath(); x.moveTo(-s * .45, s * .05); x.lineTo(s * .45, s * .05); x.lineTo(s * .3, s * .32); x.lineTo(-s * .32, s * .32); x.closePath(); x.fill(); for (let i = 0; i < 3; i++) x.fillRect(-s * .32 + i * s * .22, -s * .2, s * .18, s * .22); x.fillRect(-s * .32, -s * .38, s * .14, s * .16); }
  x.restore();
}
async function gateSign(F, region) {
  const W = 1400, H = 300, [c, x] = canvas(W, H); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = F.color; x.fillRect(0, H - 28, W, 28);
  x.textAlign = 'right'; x.direction = 'rtl'; let fs = 88; x.font = `700 ${fs}px "Readex Pro"`;
  while (x.measureText(F.name).width > W - 420 && fs > 40) { fs -= 4; x.font = `700 ${fs}px "Readex Pro"`; }
  x.fillStyle = '#1b2263'; x.fillText(F.name, W - 44, 140);
  x.fillStyle = '#5a6380'; x.font = '400 50px "Readex Pro"'; x.fillText(`${REGIONS[region].sub}`, W - 44, 228);
  if (F.logo) { const im = await loadImg(F.logo), r = Math.min(330 / im.width, 220 / im.height); x.drawImage(im, 40, (H - 28 - im.height * r) / 2, im.width * r, im.height * r); }
  else drawIcon(x, F.icon, 160, 136, 200, F.color);
  return toTex(c);
}
function soonSign(name) {
  const W = 1200, H = 600, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, W, H, [[0, BRAND.navy], [.6, BRAND.blue], [1, BRAND.violet]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 26, link: 220, color: 'rgba(255,255,255,.16)', dot: 'rgba(255,255,255,.5)', lw: 2, seed: 3 });
  x.fillStyle = '#ffd36a'; x.beginPath(); x.roundRect(W / 2 - 170, 70, 340, 90, 45); x.fill();
  x.fillStyle = '#1b2263'; x.font = '700 54px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText('قريباً', W / 2, 132);
  x.fillStyle = '#fff'; x.font = '700 86px "Readex Pro"'; x.fillText(name, W / 2, 300);
  x.font = '400 52px "Readex Pro"'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('مصنع جديد سيفتح أبوابه لاحقاً', W / 2, 400);
  x.font = '500 40px "Readex Pro"'; x.fillText('صناعيو المستقبل', W / 2, 520);
  return toTex(c);
}
async function fiAd() {
  const W = 2048, H = 1024, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, W, H, [[0, BRAND.navy], [.6, BRAND.blue], [1, BRAND.violet]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 60, link: 260, color: 'rgba(255,255,255,.16)', dot: 'rgba(255,255,255,.5)', lw: 2.4, seed: 9 });
  const logo = await loadImg('assets/img/logo.webp');
  x.fillStyle = '#fff'; x.beginPath(); x.arc(W - 380, H / 2, 300, 0, 7); x.fill();
  const r = 440 / Math.max(logo.width, logo.height); x.drawImage(logo, W - 380 - logo.width * r / 2, H / 2 - logo.height * r / 2, logo.width * r, logo.height * r);
  x.fillStyle = '#fff'; x.textAlign = 'right'; x.direction = 'rtl';
  x.font = '700 150px "Readex Pro"'; x.fillText('اكتشف مصانعنا', W - 760, 420);
  x.font = '400 78px "Readex Pro"'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('جيل وطني يرى الصناعة من الداخل', W - 760, 560);
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(170, 680, 640, 130, 65); x.fill(); x.fillStyle = BRAND.navy; x.font = '600 66px "Readex Pro"'; x.textAlign = 'center'; x.fillText('هاكثون 2026', 490, 770);
  return toTex(c);
}
async function posterTex(F) {
  const W = 512, H = 896, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, 0, H, [[0, BRAND.violet], [1, BRAND.navy]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 30, link: 160, color: 'rgba(255,255,255,.18)', dot: 'rgba(255,255,255,.5)', lw: 1.6, seed: 4 });
  const logo = await loadImg('assets/img/logo.webp'); x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2, 270, 165, 0, 7); x.fill();
  const r = 245 / Math.max(logo.width, logo.height); x.drawImage(logo, W / 2 - logo.width * r / 2, 270 - logo.height * r / 2, logo.width * r, logo.height * r);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 62px "Readex Pro"'; x.fillText('شارك في', W / 2, 560); x.fillText('الهاكثون', W / 2, 640);
  x.font = '500 34px "Readex Pro"'; x.fillText('جوائز تصل إلى 200,000 ريال', W / 2, 730);
  x.font = '400 28px "Readex Pro"'; x.fillStyle = 'rgba(255,255,255,.8)'; x.fillText('futureindustrialist.org', W / 2, 820);
  return toTex(c);
}
function stopTag(region) {
  const [c, x] = canvas(768, 128); x.fillStyle = '#fff'; x.fillRect(0, 0, 768, 128); x.fillStyle = BRAND.violet; x.fillRect(0, 112, 768, 16);
  x.fillStyle = BRAND.navy; x.font = '600 50px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(`محطة ${REGIONS[region].name} · المدينة الصناعية`, 384, 76);
  return toTex(c);
}

/* ---------------- shared props ---------------- */
function billboard(tex, w = 12, h = 6, pole = 9) {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: '#8a9099', metalness: .8, roughness: .35 }), dark = new THREE.MeshStandardMaterial({ color: '#2b2f37', metalness: .6, roughness: .4 });
  g.add(cyl(.42, .5, pole, steel, 0, pole / 2, 0, 24));
  const frame = m(new RoundedBoxGeometry(w + .5, h + .5, .6, 3, .12), dark); frame.position.y = pole + h / 2 - .4; g.add(frame);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .18 });
  for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); f.position.set(0, pole + h / 2 - .4, .31 * s); if (s < 0) f.rotation.y = Math.PI; g.add(f); }
  return g;
}
function busStop(posterT, tagT) {
  // the open side faces the road (-z); glass back panel and bench on the sidewalk side
  const stop = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#d7dbe2', metalness: .85, roughness: .25 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfe9f2', roughness: .05, transparent: true, opacity: .25, side: THREE.DoubleSide });
  const roof = m(new RoundedBoxGeometry(7.2, .22, 2.6, 4, .1), new THREE.MeshPhysicalMaterial({ color: BRAND.navy, roughness: .35, clearcoat: .6 })); roof.position.set(0, 2.9, 0); stop.add(roof);
  const lip = box(7.2, .08, .1, new THREE.MeshStandardMaterial({ color: BRAND.violet, emissive: BRAND.violet, emissiveIntensity: .4 }), 0, 2.77, -1.28, false); stop.add(lip);
  for (const x of [-3.3, 3.3]) for (const z of [1, -1]) stop.add(cyl(.06, .06, 2.8, steel, x, 1.4, z, 12));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.3), glassM); back.position.set(0, 1.4, 1.05); stop.add(back);
  const benchM = new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: .6 });
  const seat = m(new RoundedBoxGeometry(3.6, .1, .5, 2, .04), benchM); seat.position.set(-.8, .5, .6); stop.add(seat);
  const backrest = m(new RoundedBoxGeometry(3.6, .5, .08, 2, .03), benchM); backrest.position.set(-.8, .82, .86); stop.add(backrest);
  for (const x of [-2.4, .8]) stop.add(box(.08, .45, .4, steel, x, .25, .6));
  // advertising box at the end, poster on both faces, lit from inside
  const lb = m(new RoundedBoxGeometry(.24, 2.4, 1.4, 3, .06), steel); lb.position.set(3.05, 1.4, .2); stop.add(lb);
  const pm = new THREE.MeshStandardMaterial({ map: posterT, emissive: '#ffffff', emissiveMap: posterT, emissiveIntensity: .55, roughness: .3 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.1), pm); p.rotation.y = s * Math.PI / 2; p.position.set(3.05 + s * .125, 1.4, .2); stop.add(p); }
  // name board above the open side, readable from both directions
  const tm = new THREE.MeshStandardMaterial({ map: tagT, roughness: .4 });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(3, .5), tm); tag.position.set(-1.2, 3.3, -.02); tag.rotation.y = Math.PI; stop.add(tag);
  const tag2 = tag.clone(); tag2.rotation.y = 0; tag2.position.z = .02; stop.add(tag2);
  stop.add(box(3.1, .56, .02, new THREE.MeshStandardMaterial({ color: BRAND.navy }), -1.2, 3.3, 0, false));
  stop.add(cyl(.04, .04, .5, steel, -2.4, 3.05, 0, 8), cyl(.04, .04, .5, steel, 0, 3.05, 0, 8));
  return stop;
}

/* ---------------- factory compounds ---------------- */
const MAT = {};
function mats() {
  if (MAT.clad) return MAT;
  const clad = pbr('box_profile_metal_sheet', [1, 1]);
  MAT.cladN = clad.normalMap; MAT.cladR = clad.roughnessMap;
  MAT.clad = c => new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, roughnessMap: clad.roughnessMap, normalScale: new THREE.Vector2(1.3, 1.3), color: c, metalness: .45, roughness: .45 });
  MAT.stainless = new THREE.MeshStandardMaterial({ color: '#d5d9df', metalness: .92, roughness: .28 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: .5, roughness: .4 });
  MAT.concrete = new THREE.MeshStandardMaterial({ color: '#b9b5ad', roughness: .9 });
  MAT.wall = new THREE.MeshStandardMaterial({ ...pbr('white_sandstone_bricks', [1, 1]), color: '#efe2cc' });
  MAT.pave = new THREE.MeshStandardMaterial({ ...pbr('concrete_pavers', [1, 1]), color: '#d9d4ca' });
  MAT.glass = facadeGlass(10, 6, 3);
  return MAT;
}
const col = c => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .25 });
function silo(r, h, mat, band, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(cyl(r, r, h, mat, 0, h / 2, 0, 40));
  const cap = m(new THREE.ConeGeometry(r * 1.02, r * .6, 40), mat); cap.position.y = h + r * .3; g.add(cap);
  for (const y of [h * .2, h * .5, h * .8]) { const t = m(new THREE.TorusGeometry(r * 1.01, .1, 8, 48), band, false); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  return g;
}
function hall(g, w, h, d, cladColor, bandColor, z0 = -2) {
  const M = mats();
  g.add(tbox(w, h, d, M.clad(cladColor), 0, h / 2, z0, 2.5));
  g.add(box(w + .2, 1.5, d + .2, col(bandColor), 0, h - .55, z0));
  g.add(box(w - .2, .3, d - .2, new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: .5, roughness: .5 }), 0, h + .32, z0));
  for (let i = 0; i < 4; i++) g.add(box(2.2, .25, d - 6, new THREE.MeshStandardMaterial({ color: '#eef4fb', emissive: '#dfeaf7', emissiveIntensity: .25 }), -14 + i * 9.3, h + .55, z0, false));
  g.add(box(w + .3, 1.1, d + .3, new THREE.MeshStandardMaterial({ color: '#8d939c', roughness: .8 }), 0, .55, z0));
  for (let i = 0; i < 3; i++) g.add(box(4, 4.4, .3, new THREE.MeshStandardMaterial({ color: '#7b8592', metalness: .5, roughness: .45 }), -12 + i * 6, 2.2, z0 + d / 2 + .05));
}
function office(g, x, z, w = 12, h = 10, d = 8) {
  const M = mats(); const t = M.glass.clone(); t.needsUpdate = true; t.repeat.set(w / 12, h / 10);
  g.add(box(w, h, d, new THREE.MeshPhysicalMaterial({ map: t, metalness: .55, roughness: .08, clearcoat: 1 }), x, h / 2, z));
  g.add(box(w + .5, .6, d + .5, new THREE.MeshStandardMaterial({ color: '#eceff3', roughness: .5 }), x, h + .3, z));
  g.add(box(6, .3, 3, new THREE.MeshStandardMaterial({ color: '#f4f5f8', metalness: .3, roughness: .3 }), x, 3.6, z + d / 2 + 1.5));
}
function pipeRun(g, pts, r, mat) { g.add(m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .05), 40, r, 12), mat)); }
function flame() {
  const [c, x] = canvas(64, 128); const gr = x.createRadialGradient(32, 90, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(.3, 'rgba(255,190,80,.95)'); gr.addColorStop(.7, 'rgba(255,90,20,.5)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  x.fillStyle = gr; x.beginPath(); x.ellipse(32, 72, 26, 60, 0, 0, 7); x.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); return s;
}

async function compound(F, region, x, anim) {
  const M = mats(), g = new THREE.Group(); g.position.set(x, 0, -40);
  const brand = col(F.color);
  const P = F.product;
  // ---- main buildings by product
  if (P === 'lab') {
    const t = M.glass.clone(); t.needsUpdate = true; t.repeat.set(3, 1.6);
    g.add(box(34, 14, 20, new THREE.MeshPhysicalMaterial({ map: t, metalness: .6, roughness: .08, clearcoat: 1, color: '#dfe8f5' }), 0, 7, -2));
    for (const xx of [-17, 17]) g.add(box(.8, 14.6, 20.6, new THREE.MeshStandardMaterial({ color: '#f2f4f7' }), xx, 7.3, -2));
    g.add(box(34.8, 1, 20.8, new THREE.MeshStandardMaterial({ color: '#f2f4f7' }), 0, 14.4, -2));
    const dome = m(new THREE.SphereGeometry(5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#eef1f6', metalness: .3, roughness: .3 })); dome.position.set(-8, 14.9, -4); g.add(dome);
    const dish = m(new THREE.SphereGeometry(3, 32, 12, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, metalness: .2, roughness: .4 }));
    dish.rotation.x = Math.PI * .75; dish.position.set(9, 18.5, -4); g.add(dish); g.add(cyl(.25, .4, 4, M.stainless, 9, 16.4, -4, 12));
    g.add(box(34.4, 1.2, .3, brand, 0, 12.8, 8.2));
    anim.push(t2 => { dish.rotation.z = Math.sin(t2 * .2) * .6; });
  } else if (P === 'chem') {
    g.add(box(18, 7, 10, M.clad('#f1f2f4'), -6, 3.5, 6)); g.add(box(18.2, 1, 10.2, brand, -6, 6.6, 6));
    for (const [sx, sz] of [[10, -2], [-12, -12]]) { const sp = m(new THREE.SphereGeometry(5.5, 40, 24), new THREE.MeshStandardMaterial({ color: '#eef0f3', metalness: .5, roughness: .35 })); sp.position.set(sx, 7, sz); g.add(sp); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(cyl(.18, .18, 7, M.dark, sx + Math.cos(a) * 4, 3.5, sz + Math.sin(a) * 4, 8)); } }
    for (let i = 0; i < 3; i++) { const h = 22 + i * 5; g.add(cyl(1.2 - i * .15, 1.4, h, M.stainless, 2 + i * 4, h / 2, -14, 24)); for (let y = 4; y < h; y += 5) { const pl = m(new THREE.TorusGeometry(1.6, .08, 6, 24), M.dark, false); pl.rotation.x = Math.PI / 2; pl.position.set(2 + i * 4, y, -14); g.add(pl); } }
    g.add(cyl(.5, .7, 34, new THREE.MeshStandardMaterial({ color: '#d84a2a', roughness: .5 }), 16, 17, -16, 16));
    const fl = flame(); fl.scale.set(3.2, 6, 1); fl.position.set(16, 37, -16); g.add(fl);
    anim.push(t2 => { const k = 1 + Math.sin(t2 * 9) * .08 + Math.sin(t2 * 23) * .05; fl.scale.set(3.2 * k, 6 * (2 - k), 1); });
    const pm = new THREE.MeshStandardMaterial({ color: '#c9a640', metalness: .6, roughness: .4 });
    pipeRun(g, [[-12, 1.5, -6], [0, 1.5, -6], [10, 1.5, -6], [16, 1.5, -10]], .35, pm); pipeRun(g, [[-14, 2.4, -4], [2, 2.4, -4], [6, 2.4, -14]], .25, new THREE.MeshStandardMaterial({ color: '#3a7bc8', metalness: .5, roughness: .4 }));
  } else if (P === 'containers') {
    g.add(box(14, 8, 9, M.clad('#e8ebef'), -12, 4, 6)); g.add(box(14.2, 1, 9.2, brand, -12, 7.6, 6));
    const cc = ['#c0392b', '#2471a3', '#d68910', '#1e8449', '#7d3c98', '#2e4053'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2 + ((i + j) % 2); k++) g.add(box(6, 2.5, 2.4, col(cc[(i * 3 + j + k) % 6]), 4 + i * 0, 1.25 + k * 2.55, -14 + j * 2.6 + i * 0).translateX(0));
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) g.add(box(6, 2.5, 2.4, col(cc[(i + k * 2) % 6]), 12, 1.25 + k * 2.55, -14 + i * 2.6));
    const craneM = new THREE.MeshStandardMaterial({ color: '#f0b429', metalness: .4, roughness: .5 });
    for (const xx of [1, 15]) for (const zz of [-18, -4]) g.add(box(.7, 16, .7, craneM, xx, 8, zz));
    g.add(box(15, 1.2, 1, craneM, 8, 16, -18)); g.add(box(15, 1.2, 1, craneM, 8, 16, -4)); g.add(box(1.2, 1, 15, craneM, 8, 16.6, -11));
    const trolley = box(2.4, 1, 2.4, M.dark, 8, 15.4, -11); g.add(trolley);
    anim.push(t2 => { trolley.position.x = 8 + Math.sin(t2 * .4) * 5; });
  } else if (P === 'membranes') {
    g.add(tbox(40, 8, 16, M.clad('#f2f4f6'), 0, 4, 2, 2.5)); g.add(box(40.2, 1, 16.2, brand, 0, 7.6, 2));
    const pm = new THREE.MeshStandardMaterial({ color: '#2f80c8', metalness: .4, roughness: .35 });
    // reverse-osmosis pressure vessels on a rack behind the hall, storage tanks beside them
    for (let i = 0; i < 4; i++) for (let row = 0; row < 2; row++) g.add(cyl(.9, .9, 16, pm, -4, 1.3 + row * 2.1, -9 - i * 2.2, 20).rotateZ(Math.PI / 2));
    for (const xx of [-11, -4, 3]) { g.add(box(.3, 4.6, 9.4, M.dark, xx, 2.3, -12.3)); }
    for (let i = 0; i < 2; i++) g.add(silo(3.4, 9, new THREE.MeshStandardMaterial({ color: '#e9f3fb', metalness: .3, roughness: .4 }), col('#2f80c8'), 9.5 + i * 7.5, -13));
  } else {
    const looks = { juice: ['#e9edf2', F.color], bottles: ['#eef0f3', F.color], ac: ['#e9edf2', F.color], dairy: ['#f4f6f9', F.color], steel: ['#5b626d', F.color], dates: ['#d8c19c', F.color], water: ['#eef5fa', F.color], sweets: ['#efe6d6', '#c9a24a'] };
    const [cl, bd] = looks[P] || ['#e9edf2', F.color];
    hall(g, 40, P === 'steel' ? 15 : 12, 24, cl, bd);
    office(g, -13, 14.5);
    if (P === 'juice' || P === 'dairy' || P === 'water') {
      const sm = P === 'water' ? new THREE.MeshStandardMaterial({ color: '#2f8fd0', metalness: .4, roughness: .35 }) : M.stainless;
      for (let i = 0; i < 3; i++) g.add(silo(3, 18, sm, brand, -12 + i * 7.2, -19));
    }
    if (P === 'ac') {
      const acM = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: .4, roughness: .45 }), fanM = new THREE.MeshStandardMaterial({ color: '#4a5260', metalness: .5, roughness: .5 });
      for (let i = 0; i < 6; i++) { g.add(m(new RoundedBoxGeometry(3, 1.6, 2, 2, .08), acM).translateX(-15 + i * 6).translateY(12.8).translateZ(-6 + (i % 2) * 6)); for (const dx of [-.7, .7]) g.add(cyl(.55, .55, .05, fanM, -15 + i * 6 + dx, 13.62, -6 + (i % 2) * 6, 24, false)); }
    }
    if (P === 'bottles') {
      for (let i = 0; i < 2; i++) g.add(silo(2.8, 16, new THREE.MeshStandardMaterial({ color: '#d71a28', metalness: .3, roughness: .4 }), col('#ffffff'), -10 + i * 7, -19));
      for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) g.add(box(1.2, .9, 1.2, col(i % 2 ? '#c4151f' : '#e01e2b'), 10 + i * 1.3, .45 + k * .92, 15));
    }
    if (P === 'steel') {
      g.add(cyl(1.4, 1.8, 28, new THREE.MeshStandardMaterial({ color: '#6b707a', roughness: .7 }), 14, 14, -10, 20));
      const glow = cyl(1.45, 1.45, 1.5, new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff6a00', emissiveIntensity: 1.2 }), 14, 27.4, -10, 20, false); g.add(glow);
      const cm = new THREE.MeshStandardMaterial({ color: '#e0a21c', metalness: .4, roughness: .5 });
      for (const xx of [6, 18]) g.add(box(.6, 9, .6, cm, xx, 4.5, 14)); g.add(box(13, .9, .9, cm, 12, 9, 14));
      const beamM = new THREE.MeshStandardMaterial({ color: '#4d535c', metalness: .85, roughness: .35 });
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3 - (i % 2); k++) g.add(box(9, .35, .35, beamM, 12, .2 + k * .36, 17 + i * .5));
      anim.push(t2 => { glow.material.emissiveIntensity = 1 + Math.sin(t2 * 3) * .3; });
    }
    if (P === 'dates') {
      for (const [px, pz] of [[12, 15], [17, 13], [6, 17]]) { const pl = makePalm(6 + rnd() * 2, 20 + px); pl.position.set(px, 0, pz); g.add(pl); }
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) g.add(box(.9, .5, .7, col(k % 2 ? '#a0703a' : '#b98a4a'), 10 + i * 1, .25 + k * .52, 19));
    }
    if (P === 'sweets') {
      const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: .8, roughness: .3 });
      const arch = m(new THREE.TorusGeometry(3, .4, 12, 40, Math.PI), gold); arch.position.set(8, 3, 10.4); g.add(arch);
      for (const xx of [5, 11]) g.add(cyl(.4, .4, 3, gold, xx, 1.5, 10.4, 16));
    }
  }
  // ---- facade logo sign
  const lw = 11, lh = F.logo ? 11 * (F.logo.includes('kareeda') ? 1.3 : .5) : 3.4;
  const panelT = await logoPanel(F, lw, Math.min(lh, 8));
  const front = P === 'lab' ? 8.2 : P === 'chem' ? 11.1 : P === 'containers' ? 10.6 : P === 'membranes' ? 10.1 : 10.06;
  const sx = P === 'chem' ? -6 : P === 'containers' ? -12 : 7, sy = P === 'chem' || P === 'containers' ? 4.5 : P === 'lab' ? 8.5 : 7;
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(P === 'chem' || P === 'containers' ? 11 : lw, P === 'chem' || P === 'containers' ? 3.4 : Math.min(lh, 8)), new THREE.MeshStandardMaterial({ map: panelT, roughness: .35, emissive: '#ffffff', emissiveMap: panelT, emissiveIntensity: .12 }));
  sp.position.set(sx, sy, front + .05); g.add(sp);
  // ---- wall with a gate opening at local x = 0
  g.add(tbox(19, 2.2, .4, M.wall, -13.5, 1.1, 26, 1.6), tbox(19, 2.2, .4, M.wall, 13.5, 1.1, 26, 1.6));
  for (const xx of [-4.2, 4.2]) g.add(box(.6, 4.8, .6, M.dark, xx, 2.4, 26));
  g.add(box(9, .5, .6, M.dark, 0, 4.95, 26));
  const gt = await gateSign(F, region);
  const gs = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.6), new THREE.MeshStandardMaterial({ map: gt, roughness: .4, emissive: '#ffffff', emissiveMap: gt, emissiveIntensity: .12 })); gs.position.set(0, 6.1, 26.2); g.add(gs);
  g.add(box(7.8, 1.9, .3, M.dark, 0, 6.1, 26));
  const barrier = box(3.6, .12, .12, new THREE.MeshStandardMaterial({ color: '#d93030', roughness: .5 }), -2.3, 1.1, 26.7); barrier.rotation.z = .2; g.add(barrier);
  g.add(box(.5, 1.1, .5, new THREE.MeshStandardMaterial({ color: '#f2c230' }), -4, .55, 26.7));
  g.add(tbox(5, .06, 16, M.pave, 0, .03, 18, 2.2));
  // flags
  for (const [xx, c2] of [[-6.5, F.color], [6.5, BRAND.violet]]) { g.add(cyl(.06, .08, 8, M.stainless, xx, 4, 27.4, 10)); const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: c2, side: THREE.DoubleSide, roughness: .7 })); fl.position.set(xx + .82, 7.4, 27.4); g.add(fl); anim.push(t2 => { fl.rotation.y = Math.sin(t2 * 2.4 + xx) * .25; }); }
  return g;
}
function schoolSign(region) {
  const W = 1400, H = 300, [c, x] = canvas(W, H); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = '#1e8a5a'; x.fillRect(0, H - 28, W, 28);
  x.fillStyle = '#1b2263'; x.textAlign = 'right'; x.direction = 'rtl'; x.font = '700 92px "Readex Pro"'; x.fillText('المدرسة الثانوية', W - 44, 140);
  x.fillStyle = '#5a6380'; x.font = '400 50px "Readex Pro"'; x.fillText(`${REGIONS[region].name} · نقطة انطلاق الرحلة`, W - 44, 228);
  x.fillStyle = '#1e8a5a'; x.beginPath(); x.moveTo(170, 60); x.lineTo(290, 110); x.lineTo(170, 160); x.lineTo(50, 110); x.closePath(); x.fill(); x.fillRect(95, 120, 150, 70); x.fillRect(272, 112, 8, 80);
  return toTex(c);
}
async function schoolBanner() {
  const W = 2048, H = 512, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, W, 0, [[0, BRAND.violet], [.5, BRAND.blue], [1, BRAND.navy]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 40, link: 220, color: 'rgba(255,255,255,.18)', dot: 'rgba(255,255,255,.55)', lw: 2, seed: 12 });
  const logo = await loadImg('assets/img/logo.webp'); x.fillStyle = '#fff'; x.beginPath(); x.arc(W - 260, H / 2, 200, 0, 7); x.fill();
  const r = 300 / Math.max(logo.width, logo.height); x.drawImage(logo, W - 260 - logo.width * r / 2, H / 2 - logo.height * r / 2, logo.width * r, logo.height * r);
  x.fillStyle = '#fff'; x.textAlign = 'right'; x.direction = 'rtl'; x.font = '700 120px "Readex Pro"'; x.fillText('رحلة صناعيو المستقبل', W - 520, 230);
  x.font = '400 70px "Readex Pro"'; x.fillStyle = 'rgba(255,255,255,.88)'; x.fillText('تنطلق من مدرستك إلى مصانع المملكة', W - 520, 360);
  return toTex(c);
}
async function schoolCompound(region, x, anim) {
  const M = mats(), g = new THREE.Group(); g.position.set(x, 0, -40);
  const wallM = new THREE.MeshStandardMaterial({ map: facadeStone(10, 3, 21, '#e9dcc3', '#2c5f73'), roughness: .85 });
  wallM.map.repeat.set(1, 1);
  const bld = box(46, 10, 14, wallM, 0, 5, -6); g.add(bld);
  g.add(box(46.6, .8, 14.6, new THREE.MeshStandardMaterial({ color: '#1e8a5a', roughness: .5 }), 0, 10.2, -6));
  g.add(box(12, 13, 15, new THREE.MeshStandardMaterial({ map: facadeStone(3, 4, 22, '#efe6d3', '#2c5f73'), roughness: .85 }), 0, 6.5, -5.4));
  const canopy = box(10, .4, 5, new THREE.MeshStandardMaterial({ color: '#f4f5f8', metalness: .3, roughness: .3 }), 0, 3.8, 3.8); g.add(canopy);
  for (const xx of [-4.6, 4.6]) g.add(cyl(.18, .18, 3.8, M.stainless, xx, 1.9, 6, 12));
  const bt = await schoolBanner(); const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshStandardMaterial({ map: bt, emissive: '#ffffff', emissiveMap: bt, emissiveIntensity: .15 })); banner.position.set(0, 9.4, 2.15); g.add(banner);
  // yard: running track, basketball court, trees and benches
  g.add(tbox(44, .05, 20, new THREE.MeshStandardMaterial({ color: '#b9533f', roughness: .9 }), 0, .03, 15, 4));
  const court = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: '#3d7fb8', roughness: .8 })); court.rotation.x = -Math.PI / 2; court.position.set(-12, .07, 14); g.add(court);
  const line = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const [w2, h2, xx, zz] of [[14, .1, -12, 10], [14, .1, -12, 18], [.1, 8, -19, 14], [.1, 8, -5, 14], [.1, 8, -12, 14]]) { const l2 = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), line); l2.rotation.x = -Math.PI / 2; l2.position.set(xx, .08, zz); g.add(l2); }
  for (const xx of [-18.6, -5.4]) { g.add(cyl(.08, .08, 3.2, M.dark, xx, 1.6, 14, 8)); g.add(box(.08, .9, 1.2, new THREE.MeshStandardMaterial({ color: '#ffffff' }), xx + (xx < -12 ? .25 : -.25), 3, 14)); }
  for (const [xx, zz] of [[8, 9], [16, 9], [8, 20], [16, 20]]) { const p = makePalm(5.5 + rnd(), 40 + xx + zz); p.position.set(xx, 0, zz); g.add(p); }
  const benchM = new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: .6 });
  for (const xx of [12, 20]) g.add(box(2.4, .12, .6, benchM, xx, .5, 14.5));
  // wall, gate, sign
  g.add(tbox(19, 2.2, .4, M.wall, -13.5, 1.1, 26, 1.6), tbox(19, 2.2, .4, M.wall, 13.5, 1.1, 26, 1.6));
  for (const xx of [-4.2, 4.2]) g.add(box(.6, 4.8, .6, M.dark, xx, 2.4, 26));
  g.add(box(9, .5, .6, M.dark, 0, 4.95, 26));
  const st = schoolSign(region); const sg = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.6), new THREE.MeshStandardMaterial({ map: st, roughness: .4 })); sg.position.set(0, 6.1, 26.2); g.add(sg);
  g.add(box(7.8, 1.9, .3, M.dark, 0, 6.1, 26));
  return g;
}
async function soonCompound(name, x, anim) {
  const M = mats(), g = new THREE.Group(); g.position.set(x, 0, -40);
  const steel = new THREE.MeshStandardMaterial({ color: '#e07b2a', metalness: .5, roughness: .45 });
  for (let i = -3; i <= 3; i++) for (const z of [-10, 0, 10]) g.add(box(.5, 12, .5, steel, i * 5.5, 6, z));
  for (const y of [6, 12]) { for (const z of [-10, 0, 10]) g.add(box(33.5, .45, .45, steel, 0, y, z)); for (let i = -3; i <= 3; i++) g.add(box(.45, .45, 20.5, steel, i * 5.5, y, 0)); }
  g.add(box(34, .3, 21, M.concrete, 0, .15, 0));
  const tower = new THREE.Group(); tower.position.set(14, 0, -14); g.add(tower);
  const tm = new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: .4, roughness: .5 });
  for (let y = 0; y < 30; y += 3) { tower.add(box(1.4, .15, 1.4, tm, 0, y, 0)); for (const [a, b] of [[-.65, -.65], [.65, -.65], [-.65, .65], [.65, .65]]) tower.add(box(.12, 3, .12, tm, a, y + 1.5, b)); }
  const jib = new THREE.Group(); jib.position.y = 30.5; tower.add(jib); jib.add(box(26, 1, 1, tm, -6, 0, 0)); jib.add(box(3, 2, 2, M.dark, 6, -.4, 0));
  anim.push(t2 => { jib.rotation.y = Math.sin(t2 * .15 + x) * .9; });
  // hoarding with the "coming soon" board
  g.add(box(46, 2.6, .25, new THREE.MeshStandardMaterial({ color: '#2a3590', roughness: .6 }), 0, 1.3, 26));
  const st = soonSign(name); const sb = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshStandardMaterial({ map: st, emissive: '#ffffff', emissiveMap: st, emissiveIntensity: .15 }));
  sb.position.set(0, 5.6, 26.3); g.add(sb); for (const xx of [-4, 4]) g.add(box(.25, 3.4, .25, M.dark, xx, 1.7, 26.1));
  return g;
}

/* ---------------- region scenery ---------------- */
function kingdomCentre(glass) {
  const s = new THREE.Shape();
  s.moveTo(-31, 0); s.bezierCurveTo(-31, 120, -26, 230, -12, 300); s.lineTo(12, 300); s.bezierCurveTo(26, 230, 31, 120, 31, 0); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(-22, 196); hole.bezierCurveTo(-20, 250, -8, 284, 0, 286); hole.bezierCurveTo(8, 284, 20, 250, 22, 196); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 34, bevelEnabled: true, bevelThickness: 7, bevelSize: 2.5, bevelSegments: 6, curveSegments: 48 }); g.translate(0, 0, -17);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 60, p.getY(i) / 300);
  const o = new THREE.Group(); o.add(m(g, glass, false));
  o.add(box(18, 3.5, 12, new THREE.MeshStandardMaterial({ color: '#3a4250', metalness: .7, roughness: .3 }), 0, 292, 0, false));
  return o;
}
function faisaliah(glass, gold) {
  const o = new THREE.Group();
  const body = m(new THREE.CylinderGeometry(2, 30, 245, 4, 12), glass, false); body.rotation.y = Math.PI / 4; body.position.y = 122; o.add(body);
  const ball = m(new THREE.SphereGeometry(11, 40, 30), gold, false); ball.position.y = 200; o.add(ball);
  o.add(cyl(.3, 1.2, 30, new THREE.MeshStandardMaterial({ color: '#c9c2b4', roughness: .7 }), 0, 260, 0, 8, false));
  return o;
}
function cityBlocks(scene, { n, x0, x1, z0, z1, mats, tallMats, tallP = .2, hMin = 12, hMax = 42, tMin = 60, tMax = 170, avoid = () => false }) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), tall = rnd() < tallP;
    if (avoid(x, z)) continue;
    const h = tall ? tMin + rnd() * (tMax - tMin) : hMin + rnd() * (hMax - hMin), w = tall ? 20 + rnd() * 18 : 24 + rnd() * 28, d = 20 + rnd() * 20;
    const mat = (tall ? tallMats : mats)[i % (tall ? tallMats : mats).length];
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * w / 30, uv.getY(j) * h / (tall ? 60 : 24));
    const b = m(g, mat, false); b.position.set(x, h / 2, z); scene.add(b);
  }
}
function warehouses(scene, avoidX = []) {
  const M = mats();
  const shedM = [M.clad('#e4e7ec'), M.clad('#d9d2c4')], roofM = ['#2f63a8', '#9aa3ad', '#c8ccd2'].map(c => new THREE.MeshStandardMaterial({ color: c, metalness: .4, roughness: .45 }));
  for (let i = 0; i < 64; i++) {
    const x = -620 + (i % 16) * 78 + rnd() * 14, z = -100 - Math.floor(i / 16) * 44 - rnd() * 8, w = 30 + rnd() * 14, d = 22 + rnd() * 10, h = 8 + rnd() * 6;
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, h / 2, z); worldUV(g, 2.5); scene.add(m(g, shedM[i % 2], false));
    const r = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .5, d + .4), roofM[i % 3]); r.position.set(x, h + .25, z); scene.add(r);
  }
}
/* a jagged ridgeline on the horizon (ridged noise), hazed by the fog like real distant mountains */
function ridge(scene, color, z, base, amp) {
  const W = 5200, seg = 520, g = new THREE.PlaneGeometry(W, 1, seg, 1), p = g.attributes.position;
  const oct = [[.0021, 1, rnd() * 9], [.0053, .55, rnd() * 9], [.013, .28, rnd() * 9], [.031, .12, rnd() * 9]];
  for (let i = 0; i <= seg; i++) {
    const x = -W / 2 + i * W / seg; let n = 0; for (const [f, a, ph] of oct) n += a * Math.pow(1 - Math.abs(Math.sin(x * f + ph)), 1.6);
    p.setY(i, base + amp * n / 1.95); p.setY(i + seg + 1, -30);
  }
  g.computeVertexNormals();
  const r = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color })); r.position.z = z; scene.add(r);
}
function mountains(scene, color, z) {
  ridge(scene, new THREE.Color(color).multiplyScalar(.8), z - 380, 40, 300);
  ridge(scene, color, z, 10, 190);
}
function sea(scene, anim, color = '#1f6b86') {
  const nt = new THREE.TextureLoader().load('assets/tex/waternormals.jpg'); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(90, 45);
  const wm = new THREE.MeshStandardMaterial({ color, roughness: .1, metalness: .25, normalMap: nt, normalScale: new THREE.Vector2(.55, .55), envMapIntensity: 1.2 });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000), wm); w.rotation.x = -Math.PI / 2; w.position.set(0, -1.1, 1018); w.receiveShadow = true; scene.add(w);
  anim.push((t, dt) => { nt.offset.x += dt * .004; nt.offset.y += dt * .002; });
  // corniche: wider promenade, railing, rock revetment
  const pave = mats().pave;
  scene.add(tbox(LAYOUT.ROAD, .2, 3, pave, 0, .1, 14.5, 2.2));
  const rail = new THREE.MeshStandardMaterial({ color: '#f4f4f4', metalness: .6, roughness: .3 });
  scene.add(box(LAYOUT.ROAD, .08, .08, rail, 0, 1.1, 15.9, false), box(LAYOUT.ROAD, .06, .06, rail, 0, .6, 15.9, false));
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, 1.1, .1), rail, 488), mm = new THREE.Matrix4(); for (let i = 0; i < 488; i++) { mm.makeTranslation(-650 + i * 2.67, .55, 15.9); posts.setMatrixAt(i, mm); } scene.add(posts);
  const rockM = new THREE.MeshStandardMaterial({ color: '#9c8f7d', roughness: 1, flatShading: true });
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockM, 700), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 700; i++) { const s = .7 + rnd() * .9; e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e); mm.compose(new THREE.Vector3(-650 + rnd() * 1300, -.6 + rnd() * .5, 16.6 + rnd() * 2.6), q, new THREE.Vector3(s, s * .7, s)); rocks.setMatrixAt(i, mm); }
  rocks.receiveShadow = true; scene.add(rocks);
}

/* hides the repeat of a tiled ground texture: a second, offset sample of the same map blended by
   large-scale noise, plus soft light/dark patches like wind-blown sand */
let MACRO = null;
function macroTex() {
  if (MACRO) return MACRO;
  const N = 256, [c, x] = canvas(N, N), img = x.createImageData(N, N), nz = noise2(11);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = 0, a = .5, f = 4; for (let o = 0; o < 4; o++) { v += a * nz(i / N * f + o * 17, j / N * f + o * 31); a *= .5; f *= 2; }
    const k = (j * N + i) * 4, g = Math.round(v / .9375 * 255); img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); MACRO = new THREE.CanvasTexture(c); MACRO.wrapS = MACRO.wrapT = THREE.MirroredRepeatWrapping; return MACRO; // mirrored wrap keeps it seamless
}
function breakTiling(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.macroMap = { value: macroTex() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMacro;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMacro = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMacro;\nuniform sampler2D macroMap;').replace('#include <map_fragment>', `#include <map_fragment>
      float mA = texture2D(macroMap, vMacro * 5.0).r, mB = texture2D(macroMap, vMacro * 21.0 + .37).r;
      vec4 alt = texture2D(map, vMapUv * .41 + vec2(.31, .17));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * alt.rgb, smoothstep(.38, .62, mB));
      diffuseColor.rgb *= mix(.8, 1.12, mA);`);
  };
}

/* ---------------- build ---------------- */
export async function buildRegion(renderer, key) {
  rs = 7 + key.length * 13;
  const R = REGIONS[key], T = THEMES[R.theme], scene = new THREE.Scene(), anim = [];
  // sky, light and image-based reflections taken from the same sky
  const sky = new Sky(); sky.scale.setScalar(3500); scene.add(sky);
  const su = sky.material.uniforms; su.turbidity.value = T.turb; su.rayleigh.value = T.ray; su.mieCoefficient.value = T.mie; su.mieDirectionalG.value = .8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.elev), THREE.MathUtils.degToRad(T.azim)); su.sunPosition.value.copy(sunDir);
  const envScene = new THREE.Scene(), sky2 = new Sky(); sky2.scale.setScalar(1000); for (const k in su) sky2.material.uniforms[k].value = su[k].value; envScene.add(sky2);
  envScene.add(new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: T.ground })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, .02).texture; scene.environmentIntensity = .9; pm.dispose();
  scene.fog = new THREE.FogExp2(T.fog, T.fogD);
  const sun = new THREE.DirectionalLight(T.sun, T.sunI); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 240 }); sun.shadow.bias = -.0003; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight('#ffffff', T.ground, .25));
  // ground (stops at the corniche when there is sea)
  const sand = pbr('aerial_sand', [260, 130]);
  const gm = new THREE.MeshStandardMaterial({ ...sand, color: T.ground, roughness: 1 }); breakTiling(gm);
  const ground = m(new THREE.PlaneGeometry(2400, T.sea ? 1216 : 2400), gm, false);
  ground.rotation.x = -Math.PI / 2; ground.position.z = T.sea ? -592 : 0; scene.add(ground);
  // road
  const asph = pbr('clean_asphalt', [LAYOUT.ROAD / 8, 4]);
  const road = m(new THREE.PlaneGeometry(LAYOUT.ROAD, 15.6), new THREE.MeshStandardMaterial({ ...asph, color: '#9a9a9a', roughness: .92 }), false); road.rotation.x = -Math.PI / 2; road.position.y = .02; scene.add(road);
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .6 }), yellow = new THREE.MeshStandardMaterial({ color: '#f0bf2a', roughness: .6 });
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, .14), paint, 400), mm = new THREE.Matrix4(), qf = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const L = LAYOUT.ROAD, PLACES = [LAYOUT.SCHOOL_X, ...LAYOUT.FACT_X];
  let k = 0; for (const z of [4.3, -4.3]) for (let x = -L / 2 + 5; x < L / 2; x += 9) { mm.compose(new THREE.Vector3(x, .035, z), qf, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(k++, mm); }
  dash.count = k; scene.add(dash);
  for (const z of [7.55, -7.55]) { const l = m(new THREE.PlaneGeometry(L, .16), paint, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .035, z); scene.add(l); }
  for (const z of [1.1, -1.1]) { const l = m(new THREE.PlaneGeometry(L, .14), yellow, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .035, z); scene.add(l); }
  const zebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, .5), paint, 80); k = 0;
  for (const gx of PLACES) for (let z = -7.2; z <= 7.2; z += 1) { if (Math.abs(z) < 1) continue; mm.compose(new THREE.Vector3(gx, .036, z), qf, new THREE.Vector3(1, 1, 1)); zebra.setMatrixAt(k++, mm); }
  zebra.count = k; scene.add(zebra);
  // median, curbs and sidewalks
  const curbT = curbTex(); curbT.repeat.set(L / 4, 1);
  const curbM = new THREE.MeshStandardMaterial({ map: curbT, roughness: .7 });
  for (const z of [.8, -.8]) scene.add(box(L, .25, .2, curbM, 0, .125, z));
  scene.add(box(L, .22, 1.4, new THREE.MeshStandardMaterial({ ...pbr('sand_01', [L / 4, 1]), color: '#c9a77a' }), 0, .11, 0));
  const pavM = new THREE.MeshStandardMaterial({ ...pbr('concrete_pavers', [1, 1]), color: '#e2ddd3' });
  for (const [z0, z1] of [[7.8, 13], [-13, -7.8]]) { scene.add(tbox(L, .2, z1 - z0, pavM, 0, .1, (z0 + z1) / 2, 2.2)); scene.add(box(L, .22, .22, curbM, 0, .11, z0 > 0 ? z0 : z1)); }
  // palms (one instanced grove) and street lights (instanced), leaving the crossings clear
  const nearGate = x => PLACES.some(g => Math.abs(x - g) < 6);
  const colliders = [], medPts = [], sidePts = [];
  for (let x = -L / 2 + 10; x <= L / 2 - 10; x += 13) if (!nearGate(x)) { medPts.push([x, 0]); colliders.push([x, 0, .5]); }
  for (let x = -L / 2 + 12; x <= L / 2 - 12; x += 15) if (!nearGate(x) && !nearGate(x + 7)) { sidePts.push([x, -11.4]); colliders.push([x, -11.4, .5]); }
  const med = makePalmField(medPts, { h: 7.6, shadows: true }); med.position.y = .22; scene.add(med);
  const side = makePalmField(sidePts, { h: 6.4, shadows: true }); side.position.y = .2; scene.add(side);
  const poleM = new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: .7, roughness: .35 }), ledM = new THREE.MeshStandardMaterial({ color: '#f7f9ff', emissive: '#eaf2ff', emissiveIntensity: .6 });
  const lampParts = [new THREE.CylinderGeometry(.09, .17, 11, 12).translate(0, 5.5, 0)], ledParts = [];
  for (const s2 of [-1, 1]) {
    lampParts.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 10.4, 0), new THREE.Vector3(0, 11.2, s2 * 1.4), new THREE.Vector3(0, 11.1, s2 * 2.8)), 12, .055, 6));
    lampParts.push(new RoundedBoxGeometry(.38, .12, .9, 2, .04).translate(0, 11.08, s2 * 3.1));
    ledParts.push(new THREE.PlaneGeometry(.3, .8).rotateX(Math.PI / 2).translate(0, 11.015, s2 * 3.1));
  }
  const strip = g2 => { const o = g2.index ? g2.toNonIndexed() : g2; for (const a of Object.keys(o.attributes)) if (!['position', 'normal', 'uv'].includes(a)) o.deleteAttribute(a); return o; };
  const lampG = mergeGeometries(lampParts.map(strip)), ledG = mergeGeometries(ledParts.map(strip));
  const lampX = []; for (let x = -L / 2 + 20; x <= L / 2 - 20; x += 26) if (!nearGate(x + 6.5)) lampX.push(x + 6.5);
  const lamps = new THREE.InstancedMesh(lampG, poleM, lampX.length), leds = new THREE.InstancedMesh(ledG, ledM, lampX.length);
  lampX.forEach((x, i) => { mm.makeTranslation(x, .22, 0); lamps.setMatrixAt(i, mm); leds.setMatrixAt(i, mm); colliders.push([x, 0, .3]); });
  lamps.castShadow = true; lamps.computeBoundingSphere(); leds.computeBoundingSphere(); scene.add(lamps, leds);
  // places: the school, three factories and two under construction; a bus stop for each
  const posterT = await posterTex(), tagT = stopTag(key), locs = [];
  const addStop = x => { const busX = x - LAYOUT.STOP_BACK, st = busStop(posterT, tagT); st.position.set(busX - 3, .2, 10.7); scene.add(st); colliders.push([busX - 6.3, 10.7, .25], [busX + .05, 10.9, .7]); return busX; };
  scene.add(await schoolCompound(key, LAYOUT.SCHOOL_X, anim));
  locs.push({ kind: 'school', x: LAYOUT.SCHOOL_X, name: 'المدرسة', gate: new THREE.Vector3(LAYOUT.SCHOOL_X, 0, LAYOUT.WALL_Z + .6), busX: addStop(LAYOUT.SCHOOL_X) });
  for (let i = 0; i < 3; i++) { const F = R.factories[i], x = LAYOUT.FACT_X[i]; scene.add(await compound(F, key, x, anim)); locs.push({ kind: 'factory', f: F, x, name: F.name, gate: new THREE.Vector3(x, 0, LAYOUT.WALL_Z + .6), busX: addStop(x) }); }
  for (let i = 0; i < 2; i++) scene.add(await soonCompound(R.soon[i], LAYOUT.SOON_X[i], anim));
  const b1 = billboard(await fiAd()); b1.position.set(LAYOUT.SCHOOL_X + 60, 0, T.sea ? 13.4 : 17); b1.rotation.y = Math.PI; scene.add(b1);
  const b2 = billboard(await fiAd(), 11, 5.5, 8.5); b2.position.set(LAYOUT.SOON_X[1] - 60, 0, -18); scene.add(b2);
  // ---- scenery by region
  if (R.theme === 'riyadh') {
    warehouses(scene);
    const skyGlass = new THREE.MeshPhysicalMaterial({ map: facadeGlass(14, 60, 7, [120, 150, 185]), metalness: .7, roughness: .12, clearcoat: 1 });
    const kc = kingdomCentre(skyGlass); kc.position.set(160, 0, -520); kc.rotation.y = -.25; scene.add(kc);
    const fz = faisaliah(new THREE.MeshPhysicalMaterial({ map: facadeGlass(10, 40, 9, [110, 140, 160]), metalness: .7, roughness: .12 }), new THREE.MeshStandardMaterial({ color: '#d8b46a', metalness: 1, roughness: .2 })); fz.position.set(-120, 0, -640); scene.add(fz);
    cityBlocks(scene, { n: 190, x0: -700, x1: 700, z0: -260, z1: -780, mats: [1, 2, 3].map(i => new THREE.MeshStandardMaterial({ map: facadeStone(6, 8, i), roughness: .85 })), tallMats: [3, 4, 5].map(i => new THREE.MeshPhysicalMaterial({ map: facadeGlass(8, 30, i + 10, i % 2 ? [125, 160, 190] : [150, 160, 170]), metalness: .6, roughness: .12 })), avoid: (x, z) => Math.abs(x - 160) < 50 && z < -470 || Math.abs(x + 120) < 45 && z < -590 });
  }
  if (R.theme === 'jeddah') {
    sea(scene, anim, '#1d6f8c'); warehouses(scene);
    // King Fahd's Fountain far out at sea
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 9, 260, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
    jet.position.set(-220, 129, 520); scene.add(jet);
    const spray = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .25, depthWrite: false })); spray.scale.set(1, .5, 1); spray.position.set(-220, 250, 520); scene.add(spray);
    anim.push(t => { spray.scale.set(1 + Math.sin(t * 1.3) * .06, .5, 1 + Math.cos(t * 1.1) * .06); jet.material.opacity = .5 + Math.sin(t * 2) * .05; });
    // Jeddah Tower and the old town's rawasheen houses
    const jt = m(new THREE.CylinderGeometry(1, 42, 820, 3, 20), new THREE.MeshPhysicalMaterial({ map: facadeGlass(10, 120, 11, [150, 165, 185]), metalness: .7, roughness: .1 }), false); jt.position.set(260, 410, -1100); scene.add(jt);
    cityBlocks(scene, { n: 120, x0: -520, x1: 560, z0: -250, z1: -760, mats: [1, 2, 3, 4].map(i => new THREE.MeshStandardMaterial({ map: rawasheen(i), roughness: .9 })), tallMats: [1, 2].map(i => new THREE.MeshPhysicalMaterial({ map: facadeGlass(8, 30, i + 20, [140, 170, 195]), metalness: .6, roughness: .12 })), tallP: .12, hMin: 12, hMax: 30 });
    mountains(scene, '#8a6b55', -1300);
  }
  if (R.theme === 'qassim') {
    // palm farms behind a mud wall on the near side, Najdi houses and a water tower beyond the factories
    const najdiM = new THREE.MeshStandardMaterial({ map: najdi(4), roughness: .95 });
    scene.add(tbox(LAYOUT.ROAD, 2.2, .5, najdiM, 0, 1.1, 16.2, 3));
    const pts = []; for (let z = 22; z < 120; z += 9) for (let x = -640; x < 640; x += 9) pts.push([x + (rnd() - .5) * 2, z + (rnd() - .5) * 2]);
    scene.add(makePalmField(pts, { h: 6.5, lite: true }));
    cityBlocks(scene, { n: 130, x0: -520, x1: 560, z0: -110, z1: -700, mats: [4, 5, 6].map(i => new THREE.MeshStandardMaterial({ map: najdi(i), roughness: .95 })), tallMats: [new THREE.MeshStandardMaterial({ map: facadeStone(6, 12, 9, '#e3d2b5'), roughness: .85 })], tallP: .06, hMin: 7, hMax: 16, tMin: 25, tMax: 45 });
    const wt = new THREE.Group(); wt.position.set(-150, 0, -330); scene.add(wt);
    wt.add(cyl(4, 6, 60, new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: .6 }), 0, 30, 0, 24, false));
    const bowl = m(new THREE.SphereGeometry(18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a8fc8', metalness: .3, roughness: .4 }), false); bowl.rotation.x = Math.PI; bowl.position.y = 72; wt.add(bowl);
    wt.add(cyl(18, 18, 6, new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: .5 }), 0, 75, 0, 32, false));
  }
  if (R.theme === 'eastern') {
    sea(scene, anim, '#225f7c');
    // Al Khobar water tower out in the Gulf
    const wt = new THREE.Group(); wt.position.set(120, -1, 260); scene.add(wt);
    const wtm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: .5 });
    wt.add(cyl(3.5, 6, 90, wtm, 0, 45, 0, 24, false)); const ball = m(new THREE.SphereGeometry(14, 32, 20), new THREE.MeshStandardMaterial({ color: '#3f8ac2', metalness: .3, roughness: .35 }), false); ball.position.y = 100; wt.add(ball);
    const ring = m(new THREE.TorusGeometry(16, 1.2, 8, 40), wtm, false); ring.rotation.x = Math.PI / 2; ring.position.y = 100; wt.add(ring);
    // port cranes on the shore to the east
    const cm = new THREE.MeshStandardMaterial({ color: '#d84a2a', metalness: .4, roughness: .5 });
    for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.set(260 + i * 34, 0, 70); for (const xx of [-7, 7]) for (const zz of [-6, 6]) c.add(box(1.2, 40, 1.2, cm, xx, 20, zz, false)); c.add(box(16, 2, 14, cm, 0, 40, 0, false)); c.add(box(3, 2.4, 70, cm, 0, 44, 20, false)); scene.add(c); }
    // refinery skyline behind the factories with burning flares
    const M0 = mats();
    const tankM = new THREE.MeshStandardMaterial({ color: '#e8e9eb', metalness: .4, roughness: .45 });
    for (let i = 0; i < 26; i++) { const x = -480 + i * 38 + rnd() * 10, z = -180 - rnd() * 260, r = 10 + rnd() * 12; scene.add(cyl(r, r, 10 + rnd() * 8, tankM, x, 8, z, 28, false)); }
    // stacks with red and white aviation bands at the top, distillation columns with ring platforms
    const [sc, sx] = canvas(8, 128); sx.fillStyle = '#c9ccd1'; sx.fillRect(0, 0, 8, 128); for (let b = 0; b < 6; b++) { sx.fillStyle = b % 2 ? '#f3f3f3' : '#c8452e'; sx.fillRect(0, b * 7, 8, 7); }
    const stackM = new THREE.MeshStandardMaterial({ map: toTex(sc), metalness: .3, roughness: .5 }), colM = new THREE.MeshStandardMaterial({ color: '#d5d8dc', metalness: .6, roughness: .35 });
    for (let i = 0; i < 9; i++) { const x = -380 + i * 95 + rnd() * 30, z = -300 - rnd() * 160, h = 46 + rnd() * 30; const c = cyl(3.4, 3.8, h, colM, x, h / 2, z, 20, false); scene.add(c); for (let y = 10; y < h; y += 12) { const pl = new THREE.Mesh(new THREE.TorusGeometry(4.6, .35, 6, 28), M0.dark); pl.rotation.x = Math.PI / 2; pl.position.set(x, y, z); scene.add(pl); } }
    for (let i = 0; i < 12; i++) { const x = -420 + i * 75 + rnd() * 20, z = -260 - rnd() * 200, h = 50 + rnd() * 60; scene.add(cyl(1.6 + rnd() * 1.2, 2.6 + rnd() * 1.4, h, i % 3 ? colM : stackM, x, h / 2, z, 16, false));
      if (i % 3 === 0) { const f = flame(); f.scale.set(10, 22, 1); f.position.set(x, h + 9, z); scene.add(f); anim.push(t => { const k2 = 1 + Math.sin(t * 7 + i) * .1; f.scale.set(10 * k2, 22 * (2 - k2), 1); }); } }
    cityBlocks(scene, { n: 60, x0: -520, x1: 560, z0: -480, z1: -800, mats: [1, 2].map(i => new THREE.MeshStandardMaterial({ map: facadeStone(6, 8, i + 4), roughness: .85 })), tallMats: [new THREE.MeshPhysicalMaterial({ map: facadeGlass(8, 30, 31, [140, 160, 180]), metalness: .6, roughness: .12 })] });
  }
  let t = 0;
  return {
    scene, sun, sunDir, tint: T.tint, exposure: T.exposure, colliders, sea: T.sea,
    locs, laneZ: LAYOUT.LANE_Z,
    update(dt) { t += dt; for (const f of anim) f(t, dt); },
    dispose() { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { for (const k2 in mt) if (mt[k2]?.isTexture && !mt[k2].userData.keep) mt[k2].dispose(); mt.dispose(); }); }); scene.environment?.dispose(); }
  };
}
