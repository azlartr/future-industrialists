import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { canvas, toTex, loadImg, pbr, BRAND } from './tex.js';
import { drawIcon } from './world.js';
import { makePalmField } from './palm.js';

/* A production hall dressed for each factory: its colours and logo on the walls, its products on
   the line and its own equipment. The Discoverer's safety hunt adds three hidden problems.
   Everything is procedural so a hall builds in a fraction of a second. */
function m(g, mat, cast = true) { const o = new THREE.Mesh(g, mat); o.castShadow = cast; o.receiveShadow = true; return o; }
function box(w, h, d, mat, x, y, z) { const o = m(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; }
function cyl(rt, rb, h, mat, x, y, z, seg = 24) { const o = m(new THREE.CylinderGeometry(rt, rb, h, seg), mat); o.position.set(x, y, z); return o; }
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .2, ...o });

/* ---------------- textures ---------------- */
function signTex(lines, { bg = '#ffffff', fg = BRAND.navy, w = 1024, h = 512, size = 110, stripe } = {}) {
  const [c, x] = canvas(w, h); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (stripe) { x.fillStyle = stripe; x.fillRect(0, h - 40, w, 40); }
  x.fillStyle = fg; x.textAlign = 'center'; x.direction = 'rtl';
  lines.forEach((t, i) => { x.font = `${i ? 500 : 700} ${i ? size * .55 : size}px "Readex Pro"`; x.fillText(t, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15 + size * .35); });
  return toTex(c);
}
function exitTex() {
  const [c, x] = canvas(1024, 384); x.fillStyle = '#0f9d58'; x.fillRect(0, 0, 1024, 384);
  x.fillStyle = '#fff'; x.font = '700 120px "Readex Pro"'; x.textAlign = 'right'; x.direction = 'rtl'; x.fillText('مخرج طوارئ', 980, 170);
  x.font = '600 90px "Readex Pro"'; x.direction = 'ltr'; x.fillText('EXIT', 980, 300);
  x.beginPath(); x.moveTo(90, 190); x.lineTo(260, 190); x.lineTo(260, 120); x.lineTo(380, 220); x.lineTo(260, 320); x.lineTo(260, 250); x.lineTo(90, 250); x.closePath(); x.fill();
  return toTex(c);
}
function warnTex() {
  const [c, x] = canvas(256, 256); x.fillStyle = '#f5c518'; x.beginPath(); x.moveTo(128, 18); x.lineTo(240, 230); x.lineTo(16, 230); x.closePath(); x.fill();
  x.strokeStyle = '#111'; x.lineWidth = 12; x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(140, 70); x.lineTo(100, 150); x.lineTo(132, 150); x.lineTo(112, 210); x.lineTo(160, 125); x.lineTo(128, 125); x.closePath(); x.fill();
  return toTex(c);
}
function puddleTex() {
  const [c, x] = canvas(512, 512); const g = x.createRadialGradient(256, 256, 20, 256, 256, 250); g.addColorStop(0, 'rgba(18,14,10,1)'); g.addColorStop(.75, 'rgba(25,20,14,.95)'); g.addColorStop(1, 'rgba(25,20,14,0)');
  x.fillStyle = g; x.beginPath(); for (let a = 0; a <= Math.PI * 2 + .01; a += .15) { const r = 170 + Math.sin(a * 3) * 40 + Math.sin(a * 7 + 1) * 22; x.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r * .8); } x.fill(); return toTex(c);
}
function beltTex() { const [c, x] = canvas(64, 256); x.fillStyle = '#23262c'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#2e3239'; for (let i = 0; i < 256; i += 16) x.fillRect(0, i, 64, 6); const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 24); return t; }
function cardboardTex() { const [c, x] = canvas(256, 256); x.fillStyle = '#c69c64'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(90,60,25,.25)'; x.fillRect(0, 118, 256, 20); x.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 256; i += 8) x.fillRect(i, 0, 2, 256); x.strokeStyle = '#7a5428'; x.lineWidth = 4; x.strokeRect(30, 40, 90, 60); return toTex(c); }
function labelTex(F, kind) {
  const [c, x] = canvas(512, 256); const col = F.color;
  x.fillStyle = kind === 'milk' ? '#ffffff' : col; x.fillRect(0, 0, 512, 256);
  if (kind === 'milk') { x.fillStyle = col; x.fillRect(0, 170, 512, 86); x.fillStyle = '#e94b6a'; x.beginPath(); x.arc(110, 110, 50, 0, 7); x.fill(); }
  if (kind === 'juice') { for (let i = 0; i < 3; i++) { x.fillStyle = '#f39c12'; x.beginPath(); x.arc(90 + i * 60, 140, 42, 0, 7); x.fill(); } x.fillStyle = '#ffffff'; x.fillRect(0, 200, 512, 56); }
  x.fillStyle = kind === 'milk' ? col : '#ffffff'; x.font = '700 64px "Readex Pro"'; x.textAlign = 'right'; x.direction = 'rtl'; x.fillText(F.short, 490, 100);
  x.font = '500 34px "Readex Pro"'; x.fillText({ milk: 'حليب طازج', juice: 'عصير برتقال', bottle: 'منتج سعودي', water: 'مياه نقية' }[kind] || '', 490, 150);
  return toTex(c);
}

/* ---------------- products ---------------- */
function product(F, P, T) {
  const g = new THREE.Group();
  if (P === 'juice') { const mat = new THREE.MeshStandardMaterial({ map: T.label('juice'), roughness: .5 }); for (const [dx, dz] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) g.add(m(new RoundedBoxGeometry(.3, .5, .3, 2, .03), mat).translateX(dx).translateZ(dz)); }
  else if (P === 'bottles') {
    const crate = m(new RoundedBoxGeometry(.66, .2, .44, 2, .03), std('#c4151f')); crate.position.y = -.18; g.add(crate);
    const liq = new THREE.MeshPhysicalMaterial({ color: '#2a0d06', roughness: .05, clearcoat: 1, transmission: 0 }), lab = std('#d71a28'), cap = std('#d71a28', { metalness: .6 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Group(); b.position.set(-.2 + i * .2, -.1, -.1 + j * .2); b.add(m(new THREE.LatheGeometry([[.001, 0], [.07, 0], [.075, .05], [.07, .2], [.04, .32], [.026, .4], [.028, .44], [.001, .44]].map(p => new THREE.Vector2(...p)), 16), liq)); b.add(cyl(.074, .074, .07, lab, 0, .13, 0, 16)); b.add(cyl(.03, .03, .025, cap, 0, .45, 0, 12)); g.add(b); }
  } else if (P === 'lab') {
    const pcb = std('#1b6e3a', { roughness: .6 }); g.add(m(new THREE.BoxGeometry(.7, .04, .5), pcb));
    for (let i = 0; i < 6; i++) g.add(box(.08 + (i % 2) * .06, .04, .08, std('#202428'), -.25 + (i % 3) * .22, .04, -.12 + Math.floor(i / 3) * .24));
    g.add(box(.18, .03, .18, std('#c9a640', { metalness: .8 }), .2, .04, .1));
  } else if (P === 'ac') { g.add(m(new RoundedBoxGeometry(.9, .7, .45, 3, .04), std('#eef0f4', { roughness: .4 }))); const f = new THREE.Mesh(new THREE.CircleGeometry(.27, 24), std('#9aa1ab')); f.position.set(-.13, 0, .226); g.add(f); g.add(box(.22, .05, .01, std(F.color), .28, .25, .23)); }
  else if (P === 'dairy') {
    const mat = new THREE.MeshStandardMaterial({ map: T.label('milk'), roughness: .5 });
    for (const dx of [-.18, .18]) { const c = new THREE.Group(); c.position.x = dx; c.add(m(new THREE.BoxGeometry(.26, .42, .26), mat)); const roof = m(new THREE.CylinderGeometry(.01, .19, .14, 4), std('#ffffff')); roof.rotation.y = Math.PI / 4; roof.position.y = .28; c.add(roof); g.add(c); }
  } else if (P === 'steel') {
    const st = std('#4d535c', { metalness: .85, roughness: .35 });
    for (const y of [-.1, .1]) { g.add(box(1.4, .04, .3, st, 0, y, 0)); } g.add(box(1.4, .2, .04, st, 0, 0, 0));
  } else if (P === 'dates') {
    g.add(m(new THREE.BoxGeometry(.6, .12, .42), new THREE.MeshStandardMaterial({ map: T.cardboard, roughness: .8 })));
    const dm = new THREE.MeshPhysicalMaterial({ color: '#5a2d12', roughness: .3, clearcoat: .6 }), dg = new THREE.SphereGeometry(.045, 10, 8); dg.scale(1, .75, 1.6);
    const inst = new THREE.InstancedMesh(dg, dm, 24), mm = new THREE.Matrix4(); for (let i = 0; i < 24; i++) { mm.makeRotationY(Math.random() * .6); mm.setPosition(-.24 + (i % 6) * .095, .08, -.15 + Math.floor(i / 6) * .1); inst.setMatrixAt(i, mm); } g.add(inst);
  } else if (P === 'water') {
    const pl = new THREE.MeshPhysicalMaterial({ color: '#cfeeff', transparent: true, opacity: .55, roughness: .05, clearcoat: 1 }), capM = std('#1a8fd0'), lab = new THREE.MeshStandardMaterial({ map: T.label('water'), roughness: .5 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Group(); b.position.set(-.2 + i * .2, -.2, -.1 + j * .2); b.add(cyl(.07, .07, .34, pl, 0, .17, 0, 14)); b.add(cyl(.072, .072, .1, lab, 0, .17, 0, 14)); b.add(cyl(.03, .03, .04, capM, 0, .38, 0, 10)); g.add(b); }
  } else if (P === 'sweets') {
    const bm = std('#f3e7d3', { roughness: .4 }), rib = std('#c9a24a', { metalness: .8, roughness: .3 });
    g.add(m(new RoundedBoxGeometry(.6, .22, .45, 2, .03), bm)); g.add(box(.62, .23, .06, rib, 0, 0, 0)); g.add(box(.06, .23, .47, rib, 0, 0, 0));
  } else if (P === 'chem') {
    for (const [dx, c] of [[-.2, '#1f6fc4'], [.2, '#e0a21c']]) { g.add(cyl(.18, .18, .55, std(c, { metalness: .5 }), dx, 0, 0, 20)); g.add(cyl(.185, .185, .03, std('#2b2f37'), dx, .2, 0, 20)); }
  } else if (P === 'membranes') {
    const wm = std('#f1f3f6', { roughness: .35 }); for (let i = 0; i < 3; i++) { const t = cyl(.1, .1, 1, wm, 0, -.1, -.22 + i * .22, 18); t.rotation.z = Math.PI / 2; g.add(t); }
  } else if (P === 'containers') {
    const cc = ['#c0392b', '#2471a3', '#d68910', '#1e8449'];
    g.add(box(.9, .4, .38, std(cc[Math.floor(Math.random() * 4)], { metalness: .4 }), 0, 0, 0));
  }
  return g;
}

/* ---------------- big equipment ---------------- */
function robotArm(color = '#f28c28') {
  const mat = std(color, { roughness: .4, metalness: .3 }), dark = std('#2b2f37', { roughness: .5, metalness: .5 });
  const base = new THREE.Group(); base.add(m(new THREE.CylinderGeometry(.45, .55, .4, 24), dark));
  const turret = new THREE.Group(); turret.position.y = .2; base.add(turret);
  turret.add(m(new THREE.CylinderGeometry(.35, .38, .5, 24), mat)).position.y = .25;
  const sh = new THREE.Group(); sh.position.y = .5; turret.add(sh);
  const a1 = m(new RoundedBoxGeometry(.28, 1.4, .28, 3, .08), mat); a1.position.y = .7; sh.add(a1);
  const el = new THREE.Group(); el.position.y = 1.4; sh.add(el); el.add(m(new THREE.SphereGeometry(.2, 16, 12), dark));
  const a2 = m(new RoundedBoxGeometry(.22, 1.1, .22, 3, .07), mat); a2.position.y = .55; el.add(a2);
  const wr = new THREE.Group(); wr.position.y = 1.1; el.add(wr); wr.add(m(new THREE.CylinderGeometry(.1, .1, .2, 12), dark));
  for (const s of [-1, 1]) { const f = m(new THREE.BoxGeometry(.04, .2, .08), dark); f.position.set(s * .07, -.15, 0); wr.add(f); }
  sh.rotation.z = .5; el.rotation.z = 1.2; wr.rotation.z = .6;
  return { base, turret, sh, el };
}
function tank(r, h, mat, band) {
  const g = new THREE.Group();
  g.add(cyl(r, r, h, mat, 0, h / 2 + 1, 0, 32));
  const cone = m(new THREE.ConeGeometry(r, .8, 32), mat); cone.rotation.x = Math.PI; cone.position.y = .6; g.add(cone);
  const top = m(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); top.scale.y = .35; top.position.y = h + 1; g.add(top);
  for (let k = 0; k < 3; k++) { const a = k * 2.1; g.add(cyl(.06, .06, 1.2, mat, Math.cos(a) * r * .85, .6, Math.sin(a) * r * .85, 8)); }
  const b = m(new THREE.TorusGeometry(r * 1.01, .05, 8, 40), band, false); b.rotation.x = Math.PI / 2; b.position.y = h * .8 + 1; g.add(b);
  return g;
}

/* ---------------- more textures ---------------- */
function tileTex(c1 = '#f4f7fa', c2 = '#dfe6ee') { const [c, x] = canvas(256, 256); x.fillStyle = c2; x.fillRect(0, 0, 256, 256); x.fillStyle = c1; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function corrugTex(col) { const [c, x] = canvas(256, 64); x.fillStyle = col; x.fillRect(0, 0, 256, 64); for (let i = 0; i < 256; i += 16) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 5, 64); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(i + 7, 0, 3, 64); } const t = toTex(c); t.wrapS = THREE.RepeatWrapping; return t; }
function woodTex() { const [c, x] = canvas(256, 256); x.fillStyle = '#b07a4a'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(80,45,15,${.08 + (i % 5) * .03})`; x.lineWidth = 1 + i % 3; x.beginPath(); const y = (i * 37) % 256; x.moveTo(0, y); x.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 2); x.stroke(); } const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function muralTex(kind, F) {
  const [c, x] = canvas(2048, 512);
  const fills = { juice: ['#ffe8c2', '#ffb347'], bottles: ['#c4151f', '#7a0a12'], lab: ['#0b1433', '#1d3a8f'], ac: ['#dceaf8', '#8fb6e0'], dairy: ['#eaf2ff', '#9fc0ea'], steel: ['#2a2420', '#5a3418'], dates: ['#f4e3c3', '#c8964e'], water: ['#dff3fc', '#69bfe6'], sweets: ['#fde8ef', '#f2b8cb'], chem: ['#e9edf2', '#9aa7b6'], membranes: ['#e2f2fb', '#7cbfe4'], containers: ['#dbe7f2', '#7aa0c4'] }[kind] || ['#fff', '#ddd'];
  const g = x.createLinearGradient(0, 0, 2048, 512); g.addColorStop(0, fills[0]); g.addColorStop(1, fills[1]); x.fillStyle = g; x.fillRect(0, 0, 2048, 512);
  x.globalAlpha = .9;
  if (kind === 'juice') for (let i = 0; i < 9; i++) { const cx = 140 + i * 230, cy = 256 + Math.sin(i) * 90, r = 90; x.fillStyle = '#f39c12'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(cx, cy, r * .82, 0, 7); x.fill(); x.strokeStyle = '#f39c12'; x.lineWidth = 6; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(k * Math.PI / 4) * r * .8, cy + Math.sin(k * Math.PI / 4) * r * .8); x.stroke(); } }
  if (kind === 'bottles') { x.strokeStyle = '#fff'; x.lineWidth = 26; x.beginPath(); x.moveTo(0, 330); x.bezierCurveTo(500, 140, 900, 470, 1400, 260); x.bezierCurveTo(1700, 150, 1900, 300, 2048, 230); x.stroke(); x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 197) % 2048, (i * 113) % 512, 6 + i % 14, 0, 7); x.fill(); } }
  if (kind === 'lab' || kind === 'chem') { x.strokeStyle = kind === 'lab' ? 'rgba(79,227,255,.5)' : 'rgba(42,53,144,.35)'; x.lineWidth = 3; for (let i = 0; i < 26; i++) { x.beginPath(); let px = (i * 151) % 2048, py = (i * 89) % 512; x.moveTo(px, py); for (let k = 0; k < 5; k++) { if (k % 2) px += 80 + (i * k) % 90; else py += (k % 4 ? 60 : -60); x.lineTo(px, py); } x.stroke(); x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(px, py, 8, 0, 7); x.fill(); } if (kind === 'lab') { x.fillStyle = '#fff'; for (let i = 0; i < 120; i++) { x.globalAlpha = .3 + (i % 7) / 10; x.fillRect((i * 173) % 2048, (i * 59) % 512, 3, 3); } } }
  if (kind === 'ac' || kind === 'water' || kind === 'membranes' || kind === 'dairy') { x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 14; for (let k = 0; k < 4; k++) { x.beginPath(); for (let px = 0; px <= 2048; px += 16) x.lineTo(px, 120 + k * 100 + Math.sin(px / 160 + k) * 34); x.stroke(); } }
  if (kind === 'steel') { for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,${150 + (i * 7) % 90},60,${.3 + (i % 5) / 8})`; x.fillRect((i * 97) % 2048, 300 + (i * 31) % 200, 4, 4); } x.fillStyle = 'rgba(255,120,30,.35)'; x.fillRect(0, 440, 2048, 72); }
  if (kind === 'dates' || kind === 'sweets') { const col = kind === 'dates' ? 'rgba(122,74,38,.35)' : 'rgba(201,74,120,.25)'; x.fillStyle = col; for (let i = 0; i < 2048 / 64; i++) { x.beginPath(); x.moveTo(i * 64, 512); x.lineTo(i * 64 + 32, 440); x.lineTo(i * 64 + 64, 512); x.fill(); x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 32, 72); x.lineTo(i * 64 + 64, 0); x.fill(); } }
  if (kind === 'containers') { const cc = ['#c0392b', '#2471a3', '#d68910', '#1e8449']; for (let i = 0; i < 18; i++) { x.fillStyle = cc[i % 4]; x.fillRect(60 + (i % 9) * 220, 120 + Math.floor(i / 9) * 150, 200, 120); } }
  x.globalAlpha = 1;
  x.fillStyle = ['lab', 'steel', 'bottles'].includes(kind) ? '#ffffff' : '#1b2263'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 120px "Readex Pro"'; x.fillText(F.name, 1024, 300);
  return toTex(c);
}

/* ---------------- machines ---------------- */
function rotaryFiller(liquidCol, capCol) {
  const g = new THREE.Group(), body = std('#d7dbe1', { metalness: .9, roughness: .25 });
  g.add(cyl(1.3, 1.4, 1.1, body, 0, .55, 0, 40)); g.add(cyl(.25, .25, 1.6, body, 0, 1.9, 0, 16)); g.add(cyl(1.35, 1.35, .08, std('#2b2f37'), 0, 2.7, 0, 40));
  const ring = new THREE.Group(); ring.position.y = 1.1; g.add(ring);
  const bm = new THREE.MeshPhysicalMaterial({ color: liquidCol, roughness: .08, clearcoat: 1 }), cm = std(capCol, { metalness: .5 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, b = cyl(.07, .08, .42, bm, Math.cos(a) * 1.1, .21, Math.sin(a) * 1.1, 10); ring.add(b); ring.add(cyl(.035, .035, .04, cm, Math.cos(a) * 1.1, .44, Math.sin(a) * 1.1, 8)); const v = cyl(.02, .02, 1.1, body, Math.cos(a) * 1.1, 1.05, Math.sin(a) * 1.1, 6); ring.add(v); }
  return { g, spin: ring };
}
function cartonFiller(brandM) {
  const g = new THREE.Group(), w = std('#eef1f5', { metalness: .4, roughness: .3 });
  g.add(box(2.4, 3.2, 1.8, w, 0, 1.6, 0)); g.add(box(2.42, .3, 1.82, brandM, 0, 3.05, 0));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshPhysicalMaterial({ color: '#cfe6f6', roughness: .05, transparent: true, opacity: .45 })); win.position.set(0, 1.9, .91); g.add(win);
  const inner = box(.4, .5, .4, std('#ffffff'), 0, 1.7, .4); g.add(inner);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#2fe07a', emissiveIntensity: 2 })); lamp.position.set(1, 3.35, 0); g.add(lamp);
  return { g, inner, lamp };
}
function fruitBins(n, col) {
  const g = new THREE.Group(), crate = std('#2f8a3e', { roughness: .6 }), sg = new THREE.SphereGeometry(.12, 10, 8), sm = std(col, { roughness: .55 });
  const inst = new THREE.InstancedMesh(sg, sm, n * 30), mm = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < n; i++) { const x = i * 1.5; g.add(box(1.3, .7, 1.1, crate, x, .35, 0)); for (let j = 0; j < 30; j++) { mm.makeTranslation(x - .5 + (j % 6) * .2, .74 + Math.floor(j / 18) * .1, -.4 + (Math.floor(j / 6) % 3) * .35 + (j % 2) * .05); inst.setMatrixAt(k++, mm); } }
  inst.castShadow = true; g.add(inst); return g;
}
function ovenTunnel(len) {
  const g = new THREE.Group(), shell = std('#c9ced6', { metalness: .7, roughness: .3 }), glowM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff8a2a', emissiveIntensity: 1.8 });
  g.add(box(len, 1.5, 1.9, shell, 0, 1.25, 0)); g.add(box(len + .1, .12, 2, std('#8a6a3a'), 0, 2.05, 0));
  for (let i = 0; i < Math.floor(len / 1.4); i++) { const wnd = new THREE.Mesh(new THREE.PlaneGeometry(.8, .35), glowM); wnd.position.set(-len / 2 + .9 + i * 1.4, 1.3, .96); g.add(wnd); }
  g.add(cyl(.25, .25, 3, shell, len / 2 - .8, 3.5, 0, 16)); g.add(cyl(.25, .25, 3, shell, -len / 2 + .8, 3.5, 0, 16));
  return { g, glowM };
}
function mixer() { const g = new THREE.Group(), s = std('#d7dbe1', { metalness: .9, roughness: .25 }); g.add(box(1, 2.4, 1, std('#e9e4da'), 0, 1.2, -.7)); g.add(box(1, .5, 1.6, std('#e9e4da'), 0, 2.4, 0)); const bowl = m(new THREE.CylinderGeometry(.75, .5, .8, 24, 1, true), s); bowl.position.set(0, 1, .3); g.add(bowl); const hook = new THREE.Group(); hook.position.set(0, 1.8, .3); g.add(hook); hook.add(cyl(.04, .04, 1, s, 0, -.4, 0, 8)); hook.add(box(.5, .05, .05, s, 0, -.85, 0)); const dough = m(new THREE.SphereGeometry(.5, 16, 10), std('#f0d9a8', { roughness: .9 })); dough.scale.y = .5; dough.position.set(0, .82, .3); g.add(dough); return { g, hook }; }
function pipeRack(len, z, colors) {
  const g = new THREE.Group(), post = std('#5a6270', { metalness: .6 });
  for (let x = -len / 2; x <= len / 2; x += 4) { g.add(box(.2, 5.6, .2, post, x, 2.8, z)); g.add(box(.2, .2, 1.6, post, x, 5.6, z)); }
  colors.forEach((c, i) => { const p = cyl(.16, .16, len, std(c, { metalness: .5, roughness: .4 }), 0, 3.6 + (i % 3) * .55, z - .5 + Math.floor(i / 3) * .9, 14); p.rotation.z = Math.PI / 2; g.add(p); for (let x = -len / 2 + 2; x < len / 2; x += 6) { const v = m(new THREE.TorusGeometry(.22, .03, 6, 16), std('#e0464f'), true); v.position.set(x, 3.95 + (i % 3) * .55, z - .5 + Math.floor(i / 3) * .9); v.rotation.y = Math.PI / 2; g.add(v); } });
  return g;
}
function column(r, h, mat) { const g = new THREE.Group(); g.add(cyl(r, r, h, mat, 0, h / 2, 0, 28)); const pl = std('#f2c230', { metalness: .4 }); for (let y = 2; y < h; y += 2.2) { const rg = m(new THREE.TorusGeometry(r + .35, .05, 6, 32), pl); rg.rotation.x = Math.PI / 2; rg.position.y = y; g.add(rg); } return g; }
function roRack(n) {
  const g = new THREE.Group(), fr = std('#2f6fd0', { metalness: .5 }), tube = std('#f4f6f9', { roughness: .3 }), cap = std('#1f86c9', { metalness: .4 });
  for (const x of [-3.1, 3.1]) for (const z of [-.5, .5]) g.add(box(.12, .5 + n * .55, .12, fr, x, (.5 + n * .55) / 2, z));
  for (let r = 0; r < n; r++) for (const z of [-.3, .3]) { const t = cyl(.2, .2, 6, tube, 0, .6 + r * .55, z, 18); t.rotation.z = Math.PI / 2; g.add(t); for (const x of [-3.05, 3.05]) { const c = cyl(.23, .23, .14, cap, x, .6 + r * .55, z, 18); c.rotation.z = Math.PI / 2; g.add(c); } }
  return g;
}
function pump(col) { const g = new THREE.Group(); g.add(box(1.4, .2, .8, std('#3a3f48'), 0, .1, 0)); const mo = cyl(.32, .32, .9, std(col, { metalness: .4 }), -.3, .5, 0, 20); mo.rotation.z = Math.PI / 2; g.add(mo); const hs = m(new THREE.SphereGeometry(.38, 18, 12), std('#9aa3ad', { metalness: .8 })); hs.position.set(.4, .5, 0); g.add(hs); const p = cyl(.12, .12, 1.4, std('#1f86c9', { metalness: .5 }), .4, 1.3, 0, 12); g.add(p); return g; }
function satellite() {
  const g = new THREE.Group(), gold = new THREE.MeshPhysicalMaterial({ color: '#d9b23a', metalness: .9, roughness: .35, clearcoat: .6 }), panel = std('#1d3f9f', { metalness: .5, roughness: .25 }), white = std('#f2f4f7');
  g.add(box(1.2, 1.4, 1.2, gold, 0, 0, 0));
  for (const s of [-1, 1]) { const p = box(2.4, .05, 1, panel, s * 2, 0, 0); g.add(p); g.add(box(.6, .06, .1, white, s * .9, 0, 0)); }
  const dish = m(new THREE.SphereGeometry(.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3), white); dish.rotation.x = Math.PI; dish.position.y = 1.05; g.add(dish);
  g.add(cyl(.03, .03, .5, white, 0, 1.1, 0, 6));
  return g;
}
function chamber() { const g = new THREE.Group(), s = std('#cfd5de', { metalness: .85, roughness: .25 }); const body = cyl(1.6, 1.6, 4, s, 0, 1.8, 0, 36); body.rotation.z = Math.PI / 2; g.add(body); const door = m(new THREE.TorusGeometry(1.45, .14, 10, 40), std('#2a3590', { metalness: .5 })); door.position.set(2.05, 1.8, 0); door.rotation.y = Math.PI / 2; g.add(door); g.add(box(4, .4, 2, std('#3a3f48'), 0, .2, 0)); return g; }
function gantry(len, depth, col) { const g = new THREE.Group(), y = std(col, { metalness: .4, roughness: .45 }); for (const z of [-depth / 2, depth / 2]) { const b = box(len, .5, .4, y, 0, 7.4, z); g.add(b); } const bridge = new THREE.Group(); g.add(bridge); bridge.add(box(.6, .6, depth, y, 0, 7.6, 0)); const trolley = new THREE.Group(); bridge.add(trolley); trolley.add(box(1, .5, 1, std('#2b2f37'), 0, 7.2, 0)); trolley.add(cyl(.02, .02, 3, std('#2b2f37'), 0, 5.6, 0, 6)); const hook = m(new THREE.TorusGeometry(.18, .05, 6, 14, Math.PI * 1.4), std('#e0a21c', { metalness: .6 })); hook.position.y = 4; trolley.add(hook); return { g, bridge, trolley }; }
function containerBox(col, len = 6) { const g = new THREE.Group(), t = corrugTex(col); t.repeat.set(len / 1.2, 1); const mt = new THREE.MeshStandardMaterial({ map: t, metalness: .35, roughness: .55 }); g.add(box(len, 2.6, 2.44, mt, 0, 1.3, 0)); for (const s of [-1, 1]) g.add(box(.08, 2.5, .08, std('#2b2f37'), s * len / 2, 1.3, 1.23)); return g; }
function forklift(col = '#f2a71b') {
  const g = new THREE.Group(), body = std(col, { metalness: .3, roughness: .45 }), dark = std('#2b2f37', { metalness: .4 });
  g.add(box(1.1, .9, 1.8, body, 0, .75, 0)); g.add(box(1.1, .6, .5, dark, 0, .5, -.7)); g.add(box(.9, .1, 1, dark, 0, 2.1, .1));
  for (const x of [-.48, .48]) { g.add(box(.06, 1.9, .06, dark, x, 1.25, -.75)); g.add(box(.06, 1.9, .06, dark, x, 1.25, .75)); }
  for (const [x, z] of [[-.55, .55], [.55, .55], [-.55, -.55], [.55, -.55]]) { const w = cyl(.28, .28, .22, dark, x, .28, z, 14); w.rotation.z = Math.PI / 2; g.add(w); }
  const mast = new THREE.Group(); mast.position.z = 1; g.add(mast); for (const x of [-.35, .35]) mast.add(box(.1, 2.6, .1, dark, x, 1.3, 0)); const forks = new THREE.Group(); mast.add(forks); for (const x of [-.25, .25]) forks.add(box(.1, .06, 1.1, dark, x, 0, .55)); forks.add(box(.9, .5, .06, dark, 0, .25, 0));
  return { g, forks };
}
function sacks(n) { const g = new THREE.Group(), sm = std('#c9b48a', { roughness: .95 }); for (let i = 0; i < n; i++) { const s = m(new RoundedBoxGeometry(.9, .45, .6, 3, .18), sm); s.position.set((i % 3) * .95, .23 + Math.floor(i / 3) * .44, (Math.floor(i / 3) % 2) * .1); s.rotation.y = (i % 2) * .2; g.add(s); } return g; }
function dateCrates(n) { const g = new THREE.Group(), cm = std('#2f6b3a', { roughness: .6 }), dg = new THREE.SphereGeometry(.05, 8, 6); dg.scale(1, .75, 1.6); const dm = new THREE.MeshStandardMaterial({ color: '#a95c22', roughness: .55 }), inst = new THREE.InstancedMesh(dg, dm, n * 40), mm = new THREE.Matrix4(); let k = 0; for (let i = 0; i < n; i++) { const x = (i % 3) * .75, y = Math.floor(i / 3) * .36; g.add(box(.7, .3, .5, cm, x, .15 + y, 0)); for (let j = 0; j < 40; j++) { mm.makeRotationY(j * .7); mm.setPosition(x - .28 + (j % 8) * .08, .32 + y, -.18 + Math.floor(j / 8) * .09); inst.setMatrixAt(k++, mm); } } g.add(inst); return g; }

/* ---------------- each factory's hall ----------------
   One floor plan (gear room front-left, green walkway along the front, the line down the middle, the
   supervisor's booth back-right) dressed very differently: colours, light, machines, what moves. */
const STYLE = {
  juice: { bg: '#f7efe2', wall: '#fbf6ee', floor: '#d9d2c4', hemi: ['#fff6e8', '#a89a80', 1.35], key: ['#fff1d6', 1.9], trim: 'brand', ceil: 'truss', belt: true, robots: '#0b7a35' },
  bottles: { bg: '#f2e4e4', wall: '#f6eeee', floor: '#b8aeae', hemi: ['#ffffff', '#8a7070', 1.3], key: ['#fff8ee', 1.8], trim: 'brand', ceil: 'truss', belt: true, robots: '#d71a28' },
  lab: { bg: '#0d1530', wall: '#e9eef6', floor: '#f2f5f9', hemi: ['#cfe0ff', '#3a4a7a', 1.1], key: ['#e6f0ff', 1.4], trim: '#4fe3ff', ceil: 'clean', belt: false, glow: '#4fe3ff' },
  ac: { bg: '#dfe7f1', wall: '#e8eef5', floor: '#a9b4c2', hemi: ['#eef5ff', '#7d8796', 1.35], key: ['#f2f7ff', 1.8], trim: 'brand', ceil: 'truss', belt: false, robots: '#1f5fae' },
  dairy: { bg: '#e8f0fa', wall: 'tile', floor: '#cfd9e6', hemi: ['#f4f9ff', '#8a98ad', 1.45], key: ['#f6fbff', 1.7], trim: 'brand', ceil: 'clean', belt: true, robots: '#1c4fa0' },
  steel: { bg: '#2a2622', wall: '#5d5f63', floor: '#6c6e72', hemi: ['#ffd9b0', '#2a2622', .75], key: ['#ffc78a', 1.3], trim: '#e0a21c', ceil: 'dark', belt: false, robots: '#e0a21c' },
  dates: { bg: '#f1e4cc', wall: '#efe2c7', floor: '#c9b08a', hemi: ['#fff1d8', '#9a7a50', 1.35], key: ['#ffe2b0', 1.8], trim: 'brand', ceil: 'wood', belt: true },
  water: { bg: '#e3f3fb', wall: '#eef8fd', floor: '#c4dbe8', hemi: ['#f0fbff', '#7fa6bf', 1.45], key: ['#f2fbff', 1.7], trim: 'brand', ceil: 'clean', belt: true, robots: '#1aa0c8' },
  sweets: { bg: '#fbeef0', wall: '#fdf3f1', floor: '#e2cfc4', hemi: ['#fff3f0', '#b08a7a', 1.35], key: ['#ffe9dc', 1.8], trim: '#e45b8f', ceil: 'truss', belt: true },
  chem: { bg: '#d9dee5', wall: '#cfd5dd', floor: '#8f949b', hemi: ['#f0f4f9', '#6d7480', 1.2], key: ['#fff6e6', 1.7], trim: '#f2c230', ceil: 'truss', belt: false },
  membranes: { bg: '#dcecf6', wall: '#e6f1f8', floor: '#9fb3c4', hemi: ['#eef8ff', '#6f8aa0', 1.35], key: ['#f2f9ff', 1.7], trim: '#1f86c9', ceil: 'truss', belt: false },
  containers: { bg: '#cfdbe6', wall: '#d6dde5', floor: '#8c9298', hemi: ['#eef4fa', '#6f7a86', 1.25], key: ['#fff4e4', 1.9], trim: '#f2c230', ceil: 'truss', belt: false }
};

/* ---------------- safety hazards for the Discoverer's hunt ----------------
   Each one is built where it does not clash with the hall's machines, and most of them bite. */
export const HAZARD_INFO = {
  oil: { label: 'بقعة زيت على ممر المشاة', hint: 'انظر إلى ممر المشاة الأخضر… هل هو نظيف؟' },
  exit: { label: 'مخرج الطوارئ مسدود بالصناديق', hint: 'تفقّد مخرج الطوارئ على الجدار الأيمن' },
  panel: { label: 'لوحة كهرباء مفتوحة ومكشوفة', hint: 'هل كل الأبواب على الجدار الأيسر مغلقة؟' },
  spark: { label: 'لحام بلا ستارة حماية', hint: 'من أين يتطاير الشرر نحو الممر؟' },
  forklift: { label: 'رافعة شوكية متروكة في الممر وشوكتها مرفوعة', hint: 'هل الممر الأخضر خالٍ من المركبات؟' },
  guard: { label: 'آلة تدور بلا غطاء حماية', hint: 'ابحث عن ترس يدور مكشوفاً قرب الممر' },
  cable: { label: 'سلك كهرباء ممدود عبر الممر', hint: 'انتبه لما على أرض الممر… قد تتعثر!' },
  stack: { label: 'صناديق مكدّسة ومائلة على وشك السقوط', hint: 'هل كل الصناديق مرصوصة بأمان؟' },
  extinguisher: { label: 'طفاية الحريق مفقودة من مكانها', hint: 'تفقّد الجدار الأمامي: أين طفاية الحريق؟' },
  leak: { label: 'تسرّب بخار من صمام مكسور', hint: 'استمع للصفير… من أين يخرج البخار؟' }
};

export async function buildInterior(renderer, F, M) {
  const scene = new THREE.Scene(), P = F.product, ST = STYLE[P] || STYLE.juice, anim = [], boxes = [], circles = [], solids = [];
  scene.background = new THREE.Color(ST.bg);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = P === 'steel' ? .4 : .7; pm.dispose();
  scene.fog = new THREE.Fog(ST.bg, 30, 75);
  const W = 40, D = 26, H = 9, brand = std(F.color), trim = ST.trim === 'brand' ? brand : std(ST.trim, ST.trim === '#4fe3ff' ? { emissive: '#4fe3ff', emissiveIntensity: .6 } : {});
  const T = { cardboard: cardboardTex(), _l: {}, label(k) { return this._l[k] ||= labelTex(F, k); } };
  // floor and walls
  const floorT = pbr('brushed_concrete', [W / 4, D / 4]);
  const floorM = P === 'lab' ? new THREE.MeshPhysicalMaterial({ color: ST.floor, roughness: .18, clearcoat: .8, clearcoatRoughness: .2 }) : P === 'dates' ? new THREE.MeshStandardMaterial({ ...floorT, color: ST.floor, roughness: .7 }) : new THREE.MeshStandardMaterial({ ...floorT, color: ST.floor, roughness: .55 });
  const floor = m(new THREE.PlaneGeometry(W, D), floorM, false); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const yellow = std('#f2c230', { roughness: .5 });
  for (const z of [3.2, 6.2]) { const l = m(new THREE.PlaneGeometry(W - 2, .14), yellow, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .01, z); scene.add(l); }
  const walk = m(new THREE.PlaneGeometry(W - 2, 2.86), new THREE.MeshStandardMaterial({ color: '#5aa36a', transparent: true, opacity: .35 }), false); walk.rotation.x = -Math.PI / 2; walk.position.set(0, .006, 4.7); scene.add(walk);
  let wallM;
  if (ST.wall === 'tile') { const tt = tileTex(); tt.repeat.set(W / 1.2, H / 1.2); wallM = new THREE.MeshStandardMaterial({ map: tt, roughness: .35, side: THREE.BackSide }); }
  else { const clad = pbr('box_profile_metal_sheet', [W / 2.5, H / 2.5]); wallM = new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, roughnessMap: clad.roughnessMap, color: ST.wall, metalness: P === 'lab' ? .1 : .35, roughness: .5, side: THREE.BackSide }); }
  const shell = m(new THREE.BoxGeometry(W, H, D), wallM, false); shell.position.y = H / 2 - .06; scene.add(shell);
  scene.add(box(W - .1, 1.2, .1, trim, 0, .6, -D / 2 + .06), box(.1, 1.2, D - .1, trim, -W / 2 + .06, .6, 0), box(.1, 1.2, D - .1, trim, W / 2 - .06, .6, 0));
  // a mural along the back wall, above the machines
  { const mt = muralTex(P, F), mu = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshStandardMaterial({ map: mt, roughness: .7, emissive: P === 'lab' || P === 'steel' ? '#ffffff' : '#000000', emissiveMap: P === 'lab' || P === 'steel' ? mt : null, emissiveIntensity: .35 })); mu.position.set(4, 5.6, -D / 2 + .09); scene.add(mu); }
  // ceiling: trusses with skylights, a clean panel ceiling with light strips, dark beams, or wooden beams
  if (ST.ceil === 'truss' || ST.ceil === 'dark' || ST.ceil === 'wood') {
    const truss = ST.ceil === 'wood' ? new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .7 }) : std(ST.ceil === 'dark' ? '#3a3a3e' : '#7d8592', { metalness: .7, roughness: .35 });
    for (let x = -W / 2 + 4; x < W / 2; x += 6) scene.add(box(.25, .5, D, truss, x, H - .6, 0));
    if (ST.ceil === 'wood') for (let z = -D / 2 + 2; z < D / 2; z += 3) scene.add(box(W, .18, .18, truss, 0, H - .9, z));
    const skyM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: ST.ceil === 'dark' ? '#ffcf9a' : '#f4f8ff', emissiveIntensity: ST.ceil === 'dark' ? .5 : 1.2 });
    for (let x = -W / 2 + 7; x < W / 2; x += 6) { const s = new THREE.Mesh(new THREE.PlaneGeometry(ST.ceil === 'dark' ? 1 : 2.4, D - 4), skyM); s.rotation.x = Math.PI / 2; s.position.set(x, H - .02, 0); scene.add(s); }
  } else {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(P === 'lab' ? '#f4f7fb' : '#f6f9fc')); ceil.rotation.x = Math.PI / 2; ceil.position.y = H - .05; scene.add(ceil);
    const stripM = new THREE.MeshStandardMaterial({ color: '#000', emissive: ST.glow || '#ffffff', emissiveIntensity: ST.glow ? 1.6 : 1.3 });
    for (let x = -16; x <= 16; x += 4) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.25, D - 4), stripM); s.rotation.x = Math.PI / 2; s.position.set(x, H - .07, 0); scene.add(s); }
    if (P === 'lab') anim.push(t => { stripM.emissiveIntensity = 1.4 + Math.sin(t * 1.3) * .2; });
  }
  if (ST.ceil === 'truss' || ST.ceil === 'wood') { const lampM = std('#2b2f37', { metalness: .6, roughness: .4 }), bulbM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6e0', emissiveIntensity: 2 }); for (let x = -15; x <= 15; x += 6) for (const z of [-6, 2]) { const sh = m(new THREE.ConeGeometry(.55, .45, 20, 1, true), lampM, false); sh.position.set(x, 6.4, z); scene.add(sh); const b = new THREE.Mesh(new THREE.CircleGeometry(.45, 20), bulbM); b.rotation.x = Math.PI / 2; b.position.set(x, 6.18, z); scene.add(b); scene.add(box(.03, 2.3, .03, lampM, x, 7.6, z)); } }
  scene.add(new THREE.HemisphereLight(ST.hemi[0], ST.hemi[1], ST.hemi[2]));
  const key = new THREE.DirectionalLight(ST.key[0], ST.key[1]); key.position.set(6, 16, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .03; scene.add(key);
  // branding: logo board, safety sign, the initiative's roundel
  { const [c, x] = canvas(1024, 300); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 300);
    if (F.logo) { const im = await loadImg(F.logo), r = Math.min(900 / im.width, 230 / im.height); x.drawImage(im, 512 - im.width * r / 2, 150 - im.height * r / 2, im.width * r, im.height * r); }
    else { drawIcon(x, F.icon, 900, 150, 190, F.color); x.fillStyle = '#1b2263'; x.textAlign = 'right'; x.direction = 'rtl'; let fs = 92; x.font = `700 ${fs}px "Readex Pro"`; while (x.measureText(F.name).width > 720 && fs > 40) { fs -= 4; x.font = `700 ${fs}px "Readex Pro"`; } x.fillText(F.name, 790, 150 + fs * .35); }
    const b = new THREE.Mesh(new THREE.PlaneGeometry(7, 2), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); b.position.set(-14, 6.6, -D / 2 + .1); scene.add(b); }
  const safe = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: signTex(['السلامة أولاً', 'ارتدِ معدات الوقاية · حافظ على الممرات نظيفة'], { stripe: '#f2c230' }), roughness: .5 }));
  safe.position.set(-W / 2 + .08, 5.2, -4); safe.rotation.y = Math.PI / 2; scene.add(safe);
  const fi = await loadImg('assets/img/logo.webp');
  { const [c, x] = canvas(512, 512); x.fillStyle = '#fff'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); const r = 380 / Math.max(fi.width, fi.height); x.drawImage(fi, 256 - fi.width * r / 2, 256 - fi.height * r / 2, fi.width * r, fi.height * r);
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); p.position.set(W / 2 - .08, 5.4, -4); p.rotation.y = -Math.PI / 2; scene.add(p); }

  // ---- the line: a belt with products moving along it, where the hall has one
  const units = []; let gap = 2.55, beltSpeed = .9;
  const frameM = std('#9aa3ad', { metalness: .7, roughness: .3 });
  const addBelt = (x0, x1, y = .95) => {
    const len = x1 - x0, belt = beltTex(); belt.repeat.set(1, len * .8);
    scene.add(box(len, .12, 1.4, new THREE.MeshStandardMaterial({ map: belt, roughness: .8 }), (x0 + x1) / 2, y, 0)); boxes.push([x0 - .2, -.9, x1 + .2, .9]);
    scene.add(box(len, .25, .12, frameM, (x0 + x1) / 2, y - .1, .76), box(len, .25, .12, frameM, (x0 + x1) / 2, y - .1, -.76));
    for (let x = x0 + 1; x <= x1 - 1; x += 2) for (const z of [-.7, .7]) scene.add(box(.1, y - .1, .1, frameM, x, (y - .1) / 2, z));
  };
  const lift = { juice: 1.28, bottles: 1.28, lab: 1.04, ac: 1.37, dairy: 1.24, steel: 1.16, dates: 1.08, water: 1.28, sweets: 1.13, chem: 1.3, membranes: 1.22, containers: 1.22 }[P];
  const fillUnits = (x0, x1) => { for (let x = x0; x < x1; x += gap) { const u = product(F, P, T); u.position.set(x, lift, 0); scene.add(u); units.push(u); } };
  let lineX0 = -14, lineX1 = 14;
  const robots = [];
  const addRobot = (x, z, ry, col) => { const r = robotArm(col); r.base.position.set(x, 0, z); r.base.rotation.y = ry; scene.add(r.base); robots.push(r); circles.push([x, z, .7]); };
  const screens = (names, xs = [-11, 10]) => { const scr = txt => { const [c, x] = canvas(512, 320); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#4fd1a5'; x.font = '600 44px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(txt, 256, 120); x.fillStyle = '#7fb2ff'; for (let i = 0; i < 6; i++) { const hh = 40 + (i * 23) % 120; x.fillRect(60 + i * 66, 290 - hh, 40, hh); } return toTex(c); };
    xs.forEach((x, i) => { scene.add(box(2.2, 1.8, 1.2, std('#dfe3e9', { metalness: .4, roughness: .4 }), x, .9, -3.2)); boxes.push([x - 1.15, -3.85, x + 1.15, -2.55]); const st = scr(names[i]); const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .8), new THREE.MeshStandardMaterial({ map: st, emissive: '#ffffff', emissiveMap: st, emissiveIntensity: .8 })); sc.position.set(x, 1.35, -2.59); scene.add(sc); }); };
  const steelM = std('#d7dbe1', { metalness: .95, roughness: .22 }), cbM = new THREE.MeshStandardMaterial({ map: T.cardboard, roughness: .8 });
  const tanks = (n, x0, z, r = 1.25, h = 3.6, mat = steelM) => { for (let i = 0; i < n; i++) { const tk = tank(r, h, mat, brand); tk.position.set(x0 + i * (r * 2 + .9), 0, z); scene.add(tk); circles.push([x0 + i * (r * 2 + .9), z, r + .15]); } };
  const crateStack = (x, z, n = 3) => { for (let i = 0; i < n; i++) for (let k = 0; k < 2 + (i % 2); k++) scene.add(box(1, .8, 1, cbM, x + i * 1.15, .4 + k * .82, z)); boxes.push([x - .55, z - .55, x + n * 1.15 - .6, z + .55]); };

  if (P === 'juice') {
    // fruit arrives in bins, is washed under sprays, pressed and pasteurised, then filled into cartons
    const bins = fruitBins(3, '#f39c12'); bins.position.set(-15.5, 0, -3.4); scene.add(bins); boxes.push([-16.3, -4, -11.6, -2.8]);
    const wash = new THREE.Group(); wash.position.set(-14.6, 0, 0); scene.add(wash); wash.add(box(3, 1, 1.6, steelM, 0, .5, 0)); const drops = new THREE.Group(); wash.add(drops); const dm = new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: .7 }); for (let i = 0; i < 30; i++) drops.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), dm)); wash.add(box(3, .1, .1, steelM, 0, 2, 0));
    anim.push(t => drops.children.forEach((d, i) => { const k = (t * 1.6 + i / 30) % 1; d.position.set(-1.3 + (i % 10) * .29, 1.95 - k * 1, -.3 + (i % 3) * .3); }));
    boxes.push([-16.2, -.9, -13, .9]); addBelt(-12.6, 14); lineX0 = -12; tanks(3, 4, -9.6); const pipe = cyl(.09, .09, 10.2, std('#c7ccd3', { metalness: .9, roughness: .25 }), 8.4, 5.4, -9.6, 12); pipe.rotation.z = Math.PI / 2; scene.add(pipe);
    const cf = cartonFiller(brand); cf.g.position.set(-3, 0, -2.6); scene.add(cf.g); boxes.push([-4.3, -3.6, -1.7, -1.6]); anim.push(t => { cf.inner.position.y = 1.7 + Math.sin(t * 4) * .3; });
    addRobot(6, -1.8, 0, ST.robots); screens(['البسترة', 'فحص الجودة'], [-9, 11.5]); crateStack(-6, -10.6, 3);
  } else if (P === 'bottles') {
    // a rotary filler, a labeller, red crates stacking up and a giant bottle by the logo
    addBelt(-14, 14); const rf = rotaryFiller('#2a0d06', '#d71a28'); rf.g.position.set(-6, 0, -3); scene.add(rf.g); circles.push([-6, -3, 1.5]); anim.push((t, dt) => { rf.spin.rotation.y = t * .8; });
    const lab = new THREE.Group(); lab.position.set(3, 0, -2.4); scene.add(lab); lab.add(box(2, 1.4, 1.2, std('#eef1f5', { metalness: .4 }), 0, .7, 0)); const roll = cyl(.35, .35, .3, std('#d71a28'), 0, 1.7, 0, 20); roll.rotation.x = Math.PI / 2; lab.add(roll); anim.push(t => { roll.rotation.y = t * 3; }); boxes.push([1.9, -3.1, 4.1, -1.7]);
    const crate = std('#c4151f', { roughness: .5 }); for (let i = 0; i < 4; i++) for (let k = 0; k < 4 - (i % 2); k++) scene.add(box(.7, .3, .5, crate, -16 + i * .8, .15 + k * .31, -10.8)); boxes.push([-16.5, -11.2, -12.9, -10.4]);
    const big = new THREE.Group(); big.position.set(8, 0, -10.5); scene.add(big); big.add(m(new THREE.LatheGeometry([[.001, 0], [.7, 0], [.75, .5], [.7, 2], [.4, 3.2], [.26, 4], [.28, 4.4], [.001, 4.4]].map(p => new THREE.Vector2(...p)), 32), new THREE.MeshPhysicalMaterial({ color: '#2a0d06', roughness: .05, clearcoat: 1 }))); big.add(cyl(.75, .75, .7, std('#d71a28'), 0, 1.3, 0, 32)); circles.push([8, -10.5, .9]);
    addRobot(-1, 1.6, Math.PI, ST.robots); addRobot(10, -1.8, 0, ST.robots); screens(['التكربن', 'فحص الجودة'], [-12, 12]);
  } else if (P === 'lab') {
    // a clean room: the satellite on its assembly stand, a thermal-vacuum chamber, server racks
    const stand = new THREE.Group(); stand.position.set(-2, 0, -1); scene.add(stand); stand.add(cyl(1.6, 1.8, .4, std('#e9eef6', { metalness: .3 }), 0, .2, 0, 40)); stand.add(cyl(.3, .3, 1.2, steelM, 0, .9, 0, 16)); const sat = satellite(); sat.position.y = 2.4; stand.add(sat); circles.push([-2, -1, 2]);
    anim.push(t => { sat.rotation.y = t * .25; sat.position.y = 2.4 + Math.sin(t * .8) * .08; });
    const ring = m(new THREE.TorusGeometry(2.1, .04, 8, 64), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#4fe3ff', emissiveIntensity: 1.6 }), false); ring.rotation.x = Math.PI / 2; ring.position.set(-2, .05, -1); scene.add(ring);
    const ch = chamber(); ch.position.set(8, 0, -2.5); scene.add(ch); boxes.push([5.8, -3.6, 10.2, -1.4]);
    for (let i = 0; i < 5; i++) { const rack = box(1.2, 2.4, .9, std('#1e2430', { metalness: .5 }), 3 + i * 1.5, 1.2, -11.2); scene.add(rack); boxes.push([2.3 + i * 1.5, -11.7, 3.7 + i * 1.5, -10.7]); for (let k = 0; k < 8; k++) { const led = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), new THREE.MeshBasicMaterial({ color: k % 3 ? '#4fd1a5' : '#7fb2ff' })); led.position.set(3 + i * 1.5 - .4 + (k % 4) * .25, .6 + Math.floor(k / 4) * 1.2, -10.74); scene.add(led); anim.push(t => { led.visible = Math.sin(t * (3 + k) + i) > -.3; }); } }
    // glass partitions and two robot arms working on circuit boards
    const gl = new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: .05, transparent: true, opacity: .22, depthWrite: false }); for (const x of [-9, 4]) { scene.add(mk2(new THREE.BoxGeometry(.08, 2.6, 4.4), gl, x, 1.3, -6)); boxes.push([x - .1, -8.2, x + .1, -3.8]); }
    addRobot(-12, -2.6, 0, '#e9eef6'); addRobot(-6.5, -3.2, 0, '#e9eef6'); const bench = box(4, .9, 1.4, std('#e9eef6'), -9.3, .45, -4.6); scene.add(bench); boxes.push([-11.3, -5.3, -7.3, -3.9]); for (let i = 0; i < 4; i++) { const u = product(F, P, T); u.position.set(-10.8 + i * 1, 1.0, -4.6); u.scale.setScalar(.8); scene.add(u); }
  } else if (P === 'ac') {
    // AC units ride an overhead conveyor; booths test them; welding robots flash blue
    const rail = box(30, .2, .2, std('#5a6270', { metalness: .6 }), 0, 3.6, 0); scene.add(rail); for (let x = -14; x <= 14; x += 4) scene.add(box(.15, 5.4, .15, std('#5a6270'), x, 6.3, 0));
    gap = 3.4; for (let x = -14; x < 14; x += gap) { const u = new THREE.Group(); const ac = product(F, P, T); ac.position.y = 2.6; u.add(ac); u.add(cyl(.02, .02, .8, std('#2b2f37'), 0, 3.2, 0, 6)); u.position.set(x, 0, 0); scene.add(u); units.push(u); }
    for (let i = 0; i < 3; i++) { const bx = -6 + i * 5; const booth = new THREE.Group(); booth.position.set(bx, 0, -3.4); scene.add(booth); booth.add(box(2.6, 2.4, .08, std('#cfe6ff', { transparent: true, opacity: .3 }), 0, 1.2, .8)); booth.add(box(2.6, .2, 1.8, std('#2f6fd0'), 0, 2.5, 0)); const u = product(F, P, T); u.position.set(0, .8, 0); booth.add(u); boxes.push([bx - 1.35, -4.4, bx + 1.35, -2.5]); }
    const flash = new THREE.PointLight('#7fc8ff', 0, 6); flash.position.set(-11, 1.6, -1.6); scene.add(flash); anim.push(t => { flash.intensity = Math.random() < .25 ? 4 + Math.random() * 3 : 0; });
    addRobot(-11, -1.6, 0, ST.robots); addRobot(11, -1.6, 0, ST.robots); crateStack(6, -10.8, 4); screens(['اختبار الضغط', 'فحص الجودة'], [-15, 15.6]);
  } else if (P === 'dairy') {
    // tall silos, pipes overhead, milk cartons on the belt, a tiled clean hall
    addBelt(-14, 14); tanks(4, -2, -9.8, 1.2, 5.2); for (let i = 0; i < 3; i++) { const p = cyl(.08, .08, 16, std('#c7ccd3', { metalness: .9 }), 4, 6.8 + i * .3, -7.6 - i * .4, 10); p.rotation.z = Math.PI / 2; scene.add(p); }
    const cf = cartonFiller(brand); cf.g.position.set(-8, 0, -2.6); scene.add(cf.g); boxes.push([-9.3, -3.6, -6.7, -1.6]); anim.push(t => { cf.inner.position.y = 1.7 + Math.sin(t * 4) * .3; });
    addRobot(2, -1.8, 0, ST.robots); addRobot(9, 1.7, Math.PI, ST.robots); screens(['البسترة', 'التغليف'], [-13, 12]);
  } else if (P === 'steel') {
    // the furnace glows, billets run red-hot along the rollers, the gantry crane moves over it all
    const fur = box(5, 4.2, 3.4, std('#3b3f46', { metalness: .6 }), -11, 2.1, -9.3); scene.add(fur); boxes.push([-13.6, -11.1, -8.4, -7.5]);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff6a00', emissiveIntensity: 2.4 })); mouth.position.set(-11, 1.6, -7.58); scene.add(mouth);
    const glow = new THREE.PointLight('#ff8a30', 8, 12); glow.position.set(-11, 1.8, -6.2); scene.add(glow); anim.push(t => { glow.intensity = 7 + Math.sin(t * 7) * 1.5; });
    const rollers = std('#4a4d52', { metalness: .8 }); for (let x = -14; x <= 14; x += .8) { const r = cyl(.12, .12, 1.4, rollers, x, .9, 0, 10); r.rotation.x = Math.PI / 2; scene.add(r); } scene.add(box(29, .8, .2, std('#3b3f46'), 0, .45, .75), box(29, .8, .2, std('#3b3f46'), 0, .45, -.75)); boxes.push([-14.5, -.9, 14.5, .9]);
    const hot = new THREE.MeshStandardMaterial({ color: '#7a2a08', emissive: '#ff5a10', emissiveIntensity: 1.6 }); gap = 4; beltSpeed = 1.6; for (let x = -14; x < 14; x += gap) { const b = box(2.6, .22, .22, hot, x, 1.13, 0); scene.add(b); units.push(b); }
    const gn = gantry(30, 20, '#e0a21c'); scene.add(gn.g); anim.push(t => { gn.bridge.position.x = Math.sin(t * .15) * 12; gn.trolley.position.z = Math.sin(t * .23) * 6; });
    const coil = std('#5d6573', { metalness: .9, roughness: .3 }); for (let i = 0; i < 6; i++) { const c = m(new THREE.TorusGeometry(.7, .28, 12, 24), coil); c.position.set(4 + (i % 3) * 2, .98 + Math.floor(i / 3) * 1.1, -10.6); scene.add(c); } boxes.push([2.9, -11.4, 9.1, -9.8]);
    const sparks = new THREE.Group(); scene.add(sparks); const spM = new THREE.MeshBasicMaterial({ color: '#ffcf6a' }); for (let i = 0; i < 40; i++) sparks.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 4, 3), spM));
    anim.push(t => sparks.children.forEach((s, i) => { const k = (t * 1.2 + i / 40) % 1; s.position.set(-11 + Math.sin(i * 3.3) * k * 2.4, 1.6 + k * 1.2 - k * k * 3, -7.4 + k * 1.6 + Math.cos(i) * .4); s.visible = k < .9; }));
    addRobot(4, -1.8, 0, ST.robots); screens(['الدرفلة', 'التبريد'], [-4, 12]);
  } else if (P === 'dates') {
    // sorting tables under wooden beams, crates and sacks, drying racks, potted palms
    addBelt(-12, 10); lineX0 = -12; lineX1 = 10;
    for (const x of [-9, -3, 3]) { scene.add(box(3.4, .9, 1.4, new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .7 }), x, .45, -3.2)); boxes.push([x - 1.75, -3.95, x + 1.75, -2.45]); const dc = dateCrates(3); dc.position.set(x - .8, .9, -3.2); scene.add(dc); }
    const sk = sacks(9); sk.position.set(12, 0, -10.6); scene.add(sk); boxes.push([11.4, -11.2, 15, -10]);
    const rackM = std('#8a6a3a', { roughness: .7 }); for (const x of [-15, -11]) { for (const xx of [-1.3, 1.3]) for (const z of [-11.6, -10.4]) scene.add(box(.1, 4, .1, rackM, x + xx, 2, z)); for (const y of [.6, 1.6, 2.6, 3.6]) { scene.add(box(2.7, .06, 1.3, rackM, x, y, -11)); const dc = dateCrates(1); dc.position.set(x - .6, y - .12, -11); scene.add(dc); } boxes.push([x - 1.5, -11.8, x + 1.5, -10.2]); }
    const pts = [[-6, -11.2], [0, -11.2], [6, -11.2]]; const palms = makePalmField(pts, { h: 3.4, lite: true }); scene.add(palms); for (const [x, z] of pts) { scene.add(cyl(.55, .45, .7, std('#b07a4a'), x, .35, z, 18)); circles.push([x, z, .7]); }
    screens(['الفرز', 'التعبئة'], [12.5, 7.5]);
  } else if (P === 'water') {
    // filtration vessels, a blow-moulder turning preforms into bottles, the filling carousel, wrapped packs
    addBelt(-10, 14); lineX0 = -10;
    for (let i = 0; i < 4; i++) { const v = cyl(.9, .9, 4.4, std('#2f86c9', { metalness: .4, roughness: .35 }), -15 + i * 2.2, 2.2, -9.8, 28); scene.add(v); const dome = m(new THREE.SphereGeometry(.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#2f86c9', { metalness: .4 })); dome.position.set(-15 + i * 2.2, 4.4, -9.8); scene.add(dome); circles.push([-15 + i * 2.2, -9.8, 1]); }
    const bm = new THREE.Group(); bm.position.set(-14, 0, 0); scene.add(bm); bm.add(box(3.4, 2.2, 1.8, std('#eef1f5', { metalness: .4 }), 0, 1.1, 0)); const win = new THREE.Mesh(new THREE.PlaneGeometry(2, .8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff9a4a', emissiveIntensity: .8 })); win.position.set(0, 1.4, .91); bm.add(win); boxes.push([-15.8, -.95, -12.2, .95]);
    const rf = rotaryFiller('#bfe8ff', '#1aa0c8'); rf.g.position.set(-3, 0, -3); scene.add(rf.g); circles.push([-3, -3, 1.5]); anim.push(t => { rf.spin.rotation.y = t * .9; });
    const packM = new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', roughness: .1, transmission: 0, transparent: true, opacity: .8 }); for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) scene.add(box(1, .45, .7, packM, 5 + i * 1.05, .23 + k * .46, -10.8)); boxes.push([4.4, -11.2, 11, -10.4]);
    addRobot(5, -1.8, 0, ST.robots); screens(['التعقيم', 'التعبئة'], [10, 13.5]);
  } else if (P === 'sweets') {
    // a tunnel oven glows, the mixer turns, trays of maamoul cool on racks, gift boxes wait
    addBelt(-14, 14); const ov = ovenTunnel(9); ov.g.position.set(2, 0, -3.3); scene.add(ov.g); boxes.push([-2.6, -4.3, 6.6, -2.3]); anim.push(t => { ov.glowM.emissiveIntensity = 1.6 + Math.sin(t * 3) * .3; });
    const mx = mixer(); mx.g.position.set(-11, 0, -3.4); scene.add(mx.g); boxes.push([-11.6, -4.6, -10.4, -2.3]); anim.push(t => { mx.hook.rotation.y = t * 3; });
    const trayM = std('#c9ced6', { metalness: .8 }), mm2 = std('#e9c46a', { roughness: .8 }); for (const x of [-15, -6]) { for (const xx of [-1, 1]) for (const z of [-11.4, -10.6]) scene.add(box(.08, 3.6, .08, trayM, x + xx, 1.8, z)); for (let y = .4; y < 3.4; y += .5) { scene.add(box(2, .04, .8, trayM, x, y, -11)); for (let k = 0; k < 6; k++) { const s = cyl(.12, .14, .08, mm2, x - .75 + k * .3, y + .06, -11, 12); scene.add(s); } } boxes.push([x - 1.2, -11.6, x + 1.2, -10.4]); }
    const giftM = std('#f3e7d3'), ribM = std('#c9a24a', { metalness: .8 }); for (let i = 0; i < 5; i++) { const gx = 8 + i * 1.1; scene.add(box(.9, .5, .7, giftM, gx, .25, -10.8), box(.92, .51, .1, ribM, gx, .25, -10.8)); } boxes.push([7.4, -11.3, 13.4, -10.3]);
    screens(['التشكيل', 'التغليف'], [-15.5, 12]);
  } else if (P === 'chem') {
    // tall columns to the roof, a pipe rack in the safety colours, drums and a control desk
    for (const [x, r] of [[-12, 1.1], [-8.6, .8], [6, 1.2], [10, .9]]) { const c = column(r, H - .3, std('#d5d8dc', { metalness: .6, roughness: .35 })); c.position.set(x, 0, -9.6); scene.add(c); circles.push([x, -9.6, r + .3]); }
    scene.add(pipeRack(30, -5.6, ['#f2c230', '#2fb36d', '#e0464f', '#3f8fe0', '#f2c230', '#2fb36d'])); for (let x = -15; x <= 15; x += 4) boxes.push([x - .2, -6.4, x + .2, -4.8]);
    const drum = std('#1f6fc4', { metalness: .5 }), drum2 = std('#e0a21c', { metalness: .5 }); for (let i = 0; i < 8; i++) scene.add(cyl(.32, .32, .9, i % 2 ? drum : drum2, -3 + (i % 4) * .7, .45, -10.6 - Math.floor(i / 4) * .7, 16)); boxes.push([-3.4, -11.6, -.6, -10.2]);
    const desk = box(4, 1, 1.2, std('#2b3038', { metalness: .5 }), 0, .5, -2.4); scene.add(desk); boxes.push([-2.1, -3.1, 2.1, -1.7]); for (let i = 0; i < 3; i++) { const [c, x] = canvas(256, 160); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 256, 160); x.strokeStyle = '#4fd1a5'; x.lineWidth = 3; x.beginPath(); for (let k = 0; k < 256; k += 8) x.lineTo(k, 80 + Math.sin(k / 20 + i) * 40); x.stroke(); const tx = toTex(c), sc = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .7), new THREE.MeshStandardMaterial({ map: tx, emissive: '#fff', emissiveMap: tx, emissiveIntensity: .8 })); sc.position.set(-1.3 + i * 1.3, 1.45, -1.95); scene.add(sc); }
    for (const x of [-14, 13]) { const p = pump('#2fb36d'); p.position.set(x, 0, -.5); scene.add(p); boxes.push([x - .8, -1, x + .8, 0]); }
  } else if (P === 'membranes') {
    // rows of reverse-osmosis vessels, big blue pipes, high-pressure pumps
    for (const x of [-9, 0, 9]) { const r = roRack(5); r.position.set(x, 0, -1.2); scene.add(r); boxes.push([x - 3.3, -1.9, x + 3.3, -.5]); }
    for (const z of [-5, -6]) { const p = cyl(.35, .35, 30, std('#1f86c9', { metalness: .5 }), 0, .45, z, 18); p.rotation.z = Math.PI / 2; scene.add(p); } boxes.push([-15, -6.5, 15, -4.6]);
    for (let i = 0; i < 4; i++) { const p = pump('#2f6fd0'); p.position.set(-12 + i * 6, 0, -9.6); scene.add(p); boxes.push([-12.8 + i * 6, -10.1, -11.2 + i * 6, -9.1]); }
    const tankM = std('#e9edf3', { metalness: .4 }); tanks(2, 10.4, -10, 1.3, 4, tankM);
  } else if (P === 'containers') {
    // containers stacked inside the shed, a reach stacker, and the big door open onto the quay and the sea
    const cols = ['#c0392b', '#2471a3', '#d68910', '#1e8449', '#7a4a26'];
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) { const c = containerBox(cols[(i + k * 2) % 5]); c.position.set(-14 + i * 6.6, k * 2.62, -1.2); scene.add(c); } boxes.push([-17.1, -2.5, 8.9, .1]);
    for (let i = 0; i < 2; i++) { const c = containerBox(cols[(i + 3) % 5]); c.position.set(-15 + i * 6.6, 0, -10.6); scene.add(c); } boxes.push([-18.2, -11.9, -4.6, -9.3]);
    const [sc2, sx2] = canvas(512, 256); { const g2 = sx2.createLinearGradient(0, 0, 0, 256); g2.addColorStop(0, '#8fc6ee'); g2.addColorStop(.55, '#d8efff'); g2.addColorStop(.56, '#2a7fb8'); g2.addColorStop(1, '#1d5f8f'); sx2.fillStyle = g2; sx2.fillRect(0, 0, 512, 256); sx2.fillStyle = '#e0a21c'; sx2.fillRect(300, 30, 12, 110); sx2.fillRect(240, 30, 140, 10); }
    const view = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: toTex(sc2) })); view.position.set(6, 3, -12.9); scene.add(view); scene.add(box(8.6, .4, .3, std('#f2c230'), 6, 6.2, -12.8));
    const fl = forklift('#f2a71b'); fl.g.position.set(11.6, 0, -4.4); fl.g.rotation.y = -Math.PI / 2; scene.add(fl.g); boxes.push([10.6, -5.6, 13.6, -3.2]);
    const gn = gantry(30, 18, '#24496e'); scene.add(gn.g); anim.push(t => { gn.bridge.position.x = Math.sin(t * .12) * 10; gn.trolley.position.z = Math.sin(t * .2) * 5; });
  }
  if (ST.belt) fillUnits(lineX0, lineX1);
  // a fire extinguisher by the door (unless the hunt hides it), storage racks
  const hz = M?.game === 'hazard' ? M.hazards : [];
  if (!hz.includes('extinguisher')) { const ext = new THREE.Group(); ext.position.set(3, 0, 12.75); scene.add(ext); ext.add(cyl(.17, .17, .6, std('#d7262f', { metalness: .4 }), 0, 1, 0, 14)); ext.add(box(.5, .3, .02, std('#d7262f'), 0, 1.75, .02)); }

  // ---------------- hazards for the Discoverer's safety hunt ----------------
  const hazards = []; const fx = {};
  const hit = (key2, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); o.position.set(x, y, z); scene.add(o); const hz2 = { key: key2, label: HAZARD_INFO[key2].label, hint: HAZARD_INFO[key2].hint, mesh: o, found: false, anchor: new THREE.Vector3(x, y + h / 2 + .3, z) }; hazards.push(hz2); return hz2; };
  for (const k of hz) {
    if (k === 'oil') {
      const pud = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.9), new THREE.MeshPhysicalMaterial({ map: puddleTex(), transparent: true, roughness: .04, metalness: .1, clearcoat: 1, depthWrite: false }));
      pud.rotation.x = -Math.PI / 2; pud.position.set(6.5, .015, 4.8); scene.add(pud);
      const can = cyl(.18, .18, .45, std('#c0392b', { metalness: .6 }), 7.6, .18, 4.4); can.rotation.z = Math.PI / 2; scene.add(can);
      hit('oil', 3, .6, 2.4, 6.8, .3, 4.7).fix = () => { pud.visible = false; can.position.set(7.9, .23, 2.9); can.rotation.z = 0; }; fx.oil = { x: 6.5, z: 4.8, r: 1.2 };
    } else if (k === 'exit') {
      const door = box(2.2, 2.6, .12, std('#5f6b7a', { metalness: .5 }), W / 2 - .08, 1.3, 8); door.rotation.y = Math.PI / 2; scene.add(door);
      const et = exitTex(); const ex = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .6), new THREE.MeshStandardMaterial({ map: et, emissive: '#ffffff', emissiveMap: et, emissiveIntensity: .9 })); ex.rotation.y = -Math.PI / 2; ex.position.set(W / 2 - .1, 3, 8); scene.add(ex);
      const pile = []; for (let i = 0; i < 7; i++) { const b = box(1.1, .6, .9, cbM, W / 2 - 1.2 - (i % 2) * .7, .3 + Math.floor(i / 3) * .62, 7.2 + (i % 3) * .75); b.rotation.y = i * .7; scene.add(b); pile.push(b); }
      const eb = [W / 2 - 2.6, 6.6, W / 2, 9.4]; boxes.push(eb);
      hit('exit', 2.2, 3, 3, W / 2 - 1.3, 1.5, 8).fix = () => { pile.forEach((b, i) => { b.position.set(14 + (i % 3) * 1.15, .3 + Math.floor(i / 3) * .62, 11.6); b.rotation.y = 0; }); const i = boxes.indexOf(eb); if (i >= 0) boxes.splice(i, 1); };
    } else if (k === 'panel') {
      const pnl = new THREE.Group(); pnl.position.set(-W / 2 + .35, 0, 6); scene.add(pnl);
      pnl.add(box(.5, 1.9, 1.3, std('#c9ced6', { metalness: .5 }), 0, 1.45, 0));
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), std('#30353d')); inner.rotation.y = Math.PI / 2; inner.position.set(.26, 1.45, 0); pnl.add(inner);
      const wc = ['#e53935', '#1e88e5', '#fdd835', '#43a047']; for (let i = 0; i < 8; i++) pnl.add(box(.04, .9 + (i % 3) * .2, .04, std(wc[i % 4]), .28, 1.3, -.45 + i * .13));
      const dr = new THREE.Group(); dr.position.set(.26, 1.45, .65); pnl.add(dr); dr.add(box(.04, 1.85, 1.25, std('#c9ced6', { metalness: .5 }), 0, 0, -.62)); dr.rotation.y = -1.9;
      const warn = new THREE.Mesh(new THREE.PlaneGeometry(.45, .45), new THREE.MeshStandardMaterial({ map: warnTex(), transparent: true })); warn.rotation.y = Math.PI / 2; warn.position.set(.03, 0, -.95); dr.add(warn);
      const sp = new THREE.Group(); sp.position.set(.32, 1.2, -.2); pnl.add(sp); const sm = new THREE.MeshBasicMaterial({ color: '#fff3a0' }); for (let i = 0; i < 6; i++) sp.add(new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), sm));
      const sl = new THREE.PointLight('#ffd27a', 0, 4); sl.position.set(.5, 1.2, -.2); pnl.add(sl);
      anim.push(() => { const on = Math.random() < .35; sp.children.forEach(s => { s.visible = on; s.position.set((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3); }); sl.intensity = on ? 3 + Math.random() * 3 : 0; });
      let shut = false; anim.push(() => { if (shut) { sp.children.forEach(s => s.visible = false); sl.intensity = 0; dr.rotation.y += (0 - dr.rotation.y) * .1; } });
      hit('panel', 1.4, 2.4, 2.2, -W / 2 + .9, 1.2, 6).fix = () => { shut = true; }; boxes.push([-W / 2, 5.2, -W / 2 + .7, 6.8]); fx.panel = { x: -19.1, z: 6, r: 2.4 };
    } else if (k === 'spark') {
      // a welding robot by the walkway with no curtain: sparks rain onto the path
      const r = robotArm('#e0a21c'); r.base.position.set(-3, 0, 1.9); r.base.rotation.y = Math.PI; scene.add(r.base); robots.push(r); circles.push([-3, 1.9, .7]);
      const work = box(1.2, .9, .8, std('#5d6573', { metalness: .8 }), -3, .45, 1.2); scene.add(work);
      const sp = new THREE.Group(); scene.add(sp); const spM = new THREE.MeshBasicMaterial({ color: '#ffe08a' }); for (let i = 0; i < 46; i++) sp.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 4, 3), spM));
      const fl = new THREE.PointLight('#9fd8ff', 0, 6); fl.position.set(-3, 1.4, 2); scene.add(fl);
      anim.push(t => { sp.children.forEach((s, i) => { const k2 = (t * 1.4 + i / 46) % 1, a = i * 2.39; s.position.set(-3 + Math.cos(a) * k2 * 1.6, 1.3 + k2 * .9 - k2 * k2 * 2.2, 2 + Math.abs(Math.sin(a)) * k2 * 2.6); s.visible = s.position.y > 0; }); fl.intensity = Math.random() < .4 ? 3 + Math.random() * 4 : .5; });
      hit('spark', 2, 2, 2.4, -3, 1, 2.6).fix = () => { const cur = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.MeshStandardMaterial({ color: '#c0392b', transparent: true, opacity: .75, side: THREE.DoubleSide })); cur.position.set(-3, 1.2, 2.75); scene.add(cur); }; fx.spark = { x: -3, z: 3.6, r: 1.6 };
    } else if (k === 'forklift') {
      const f2 = forklift(); f2.g.position.set(5.6, 0, 4.7); f2.g.rotation.y = Math.PI / 2; f2.forks.position.y = 1.7; scene.add(f2.g);
      const pal = box(1, .5, .9, cbM, 0, .32, .55); f2.forks.add(pal);
      const fb = [4.5, 3.9, 7, 5.5]; boxes.push(fb); hit('forklift', 2.8, 2.4, 2, 5.7, 1.2, 4.7).fix = () => { f2.forks.position.y = 0; f2.g.position.set(15.6, 0, 10.8); const i = boxes.indexOf(fb); if (i >= 0) boxes.splice(i, 1); boxes.push([14.4, 9.6, 16.8, 12]); };
    } else if (k === 'guard') {
      // the guard is off and lying on the floor: the drive gear spins in the open
      const mc = new THREE.Group(); mc.position.set(-9.5, 0, 2.1); scene.add(mc); mc.add(box(1.6, 1.2, 1, std('#5d6573', { metalness: .7 }), 0, .6, -.2));
      const gearM = std('#c9ced6', { metalness: .9, roughness: .3 }), gw = new THREE.Group(); gw.position.set(0, 1.25, .35); mc.add(gw); gw.add(m(new THREE.CylinderGeometry(.45, .45, .12, 16), gearM)); for (let i = 0; i < 12; i++) { const tth = box(.14, .12, .16, gearM, Math.cos(i / 12 * Math.PI * 2) * .5, 0, Math.sin(i / 12 * Math.PI * 2) * .5); tth.rotation.y = -i / 12 * Math.PI * 2; gw.add(tth); } gw.rotation.x = Math.PI / 2;
      anim.push((t) => { gw.rotation.y = t * 6; });
      const cover = box(1.1, .05, 1.1, std('#f2c230'), .9, .03, .8); cover.rotation.y = .5; mc.add(cover);
      boxes.push([-10.4, 1.4, -8.6, 2.5]); hit('guard', 1.8, 1.8, 1.6, -9.5, .9, 2.4).fix = () => { cover.position.set(0, 1.25, .48); cover.rotation.set(Math.PI / 2, 0, 0); cover.scale.set(1, 1, .9); }; fx.guard = { x: -9.5, z: 2.9, r: 1.5 };
    } else if (k === 'cable') {
      const curve = new THREE.CatmullRomCurve3([[9.2, .03, 2.6], [9.6, .04, 3.6], [9.3, .04, 4.7], [9.8, .04, 5.8], [9.4, .03, 7]].map(p => new THREE.Vector3(...p)));
      const cab = m(new THREE.TubeGeometry(curve, 30, .05, 6), std('#1b1d22')); scene.add(cab); const reel = cyl(.45, .45, .35, std('#f2a71b'), 9.4, .45, 7.3, 18); reel.rotation.x = Math.PI / 2; scene.add(reel); circles.push([9.4, 7.3, .5]);
      hit('cable', 1.4, .4, 4.2, 9.5, .2, 4.8).fix = () => { cab.visible = false; }; fx.cable = { x: 9.5, z: 4.7, r: .9, line: true };
    } else if (k === 'stack') {
      const st = new THREE.Group(); st.position.set(12.5, 0, 2.3); scene.add(st); for (let i = 0; i < 6; i++) { const b = box(.9, .55, .8, cbM, Math.sin(i * .9) * .12 + i * .06, .28 + i * .56, 0); b.rotation.y = i * .25; st.add(b); } st.rotation.z = -.08;
      let safeStack = false; anim.push(t => { st.rotation.z = safeStack ? 0 : -.08 + Math.sin(t * 2.2) * .02; }); boxes.push([12, 1.8, 13.2, 2.8]);
      hit('stack', 1.6, 3.4, 1.6, 12.6, 1.7, 2.4).fix = () => { safeStack = true; st.children.forEach((b, i) => { if (i > 2) b.visible = false; b.position.x = 0; b.rotation.y = 0; }); }; fx.stack = { x: 12.6, z: 3.1, r: 1.4 };
    } else if (k === 'extinguisher') {
      const brk = new THREE.Group(); brk.position.set(3, 0, 12.75); scene.add(brk); brk.add(box(.4, .05, .15, std('#2b2f37'), 0, .75, 0)); brk.add(box(.05, .6, .05, std('#2b2f37'), 0, 1.05, .05));
      const [c, x] = canvas(256, 256); x.fillStyle = '#d7262f'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#fff'; x.font = '700 46px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText('طفاية', 128, 110); x.fillText('حريق', 128, 170);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), new THREE.MeshStandardMaterial({ map: toTex(c) })); sg.position.set(0, 1.9, .02); sg.rotation.y = Math.PI; brk.add(sg);
      hit('extinguisher', 1.2, 2.2, 1, 3, 1.1, 12.2).fix = () => { brk.add(cyl(.17, .17, .6, std('#d7262f', { metalness: .4 }), 0, 1, -.05, 14)); };
    } else if (k === 'leak') {
      const p = cyl(.14, .14, 2.4, std('#9aa3ad', { metalness: .8 }), -14.5, 1.2, 2.2, 12); scene.add(p); const v = m(new THREE.TorusGeometry(.25, .05, 6, 16), std('#e0464f')); v.position.set(-14.5, 1.5, 2.45); scene.add(v);
      const steam = new THREE.Group(); scene.add(steam); const smM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, depthWrite: false }); for (let i = 0; i < 18; i++) steam.add(new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), smM));
      anim.push(t => steam.children.forEach((s, i) => { const k2 = (t * .9 + i / 18) % 1; s.position.set(-14.5 + k2 * .6, 1.55 + k2 * 1.2, 2.5 + k2 * 1.8); s.scale.setScalar(.4 + k2 * 2); }));
      circles.push([-14.5, 2.2, .3]); hit('leak', 1.6, 2.4, 2.2, -14.3, 1.2, 3).fix = () => { steam.visible = false; v.material = std('#2fb36d'); }; fx.leak = { x: -14.3, z: 3.4, r: 1.6 };
    }
  }

  let t = 0;
  return {
    scene, hazards, fx, boxes, circles,
    /* a reported hazard gets put right: the floor is cleaned, the panel shut, the guard back on */
    fixHazard(k) { const h = hazards.find(x => x.key === k); h?.fix?.(); delete fx[k]; }, bounds: { x0: -W / 2 + .5, x1: W / 2 - .5, z0: -D / 2 + .5, z1: D / 2 - .5 }, anim,
    view: { pos: new THREE.Vector3(0, 8.5, 17), target: new THREE.Vector3(0, .8, 0) },
    update(dt) {
      t += dt;
      const span = lineX1 - lineX0;
      for (const u of units) { u.position.x += dt * beltSpeed; if (u.position.x > lineX1) u.position.x -= Math.ceil(span / gap) * gap; }
      robots.forEach((r, i) => { r.turret.rotation.y = Math.sin(t * .8 + i) * .7; r.sh.rotation.z = .5 + Math.sin(t * 1.1 + i) * .2; r.el.rotation.z = 1.2 + Math.sin(t * 1.3 + i * 2) * .25; });
      for (const f of anim) f(t, dt);
    },
    dispose() { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { for (const k in mt) if (mt[k]?.isTexture) mt[k].dispose(); mt.dispose(); }); }); scene.environment?.dispose(); }
  };
}
function mk2(geo, mat, x, y, z) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); return o; }
