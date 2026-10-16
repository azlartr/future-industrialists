import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { canvas, toTex, loadImg, pbr, BRAND } from './tex.js';
import { drawIcon } from './world.js';

/* A production hall dressed for each factory: its colours and logo on the walls, its products on
   the line and its own equipment. The hazard mission adds three hidden safety problems.
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

export async function buildInterior(renderer, F) {
  const scene = new THREE.Scene(), P = F.product, anim = [], boxes = [], circles = [];
  scene.background = new THREE.Color('#cfd6e2');
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose();
  scene.fog = new THREE.Fog('#cfd6e2', 30, 70);
  const W = 40, D = 26, H = 9, brand = std(F.color);
  const T = { cardboard: cardboardTex(), _l: {}, label(k) { return this._l[k] ||= labelTex(F, k); } };
  // floor, walkway, walls, roof trusses, skylights, lamps
  const floorT = pbr('brushed_concrete', [W / 4, D / 4]);
  const floor = m(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ ...floorT, color: P === 'steel' ? '#8f9196' : '#b9bcc2', roughness: .55 }), false); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const yellow = std('#f2c230', { roughness: .5 });
  for (const z of [3.2, 6.2]) { const l = m(new THREE.PlaneGeometry(W - 2, .14), yellow, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .01, z); scene.add(l); }
  const walk = m(new THREE.PlaneGeometry(W - 2, 2.86), new THREE.MeshStandardMaterial({ color: '#5aa36a', transparent: true, opacity: .35 }), false); walk.rotation.x = -Math.PI / 2; walk.position.set(0, .006, 4.7); scene.add(walk);
  const clad = pbr('box_profile_metal_sheet', [W / 2.5, H / 2.5]);
  const shell = m(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, roughnessMap: clad.roughnessMap, color: P === 'steel' ? '#c6cad1' : '#e3e7ed', metalness: .35, roughness: .5, side: THREE.BackSide }), false); shell.position.y = H / 2 - .06; scene.add(shell);
  scene.add(box(W - .1, 1.2, .1, brand, 0, .6, -D / 2 + .06), box(.1, 1.2, D - .1, brand, -W / 2 + .06, .6, 0), box(.1, 1.2, D - .1, brand, W / 2 - .06, .6, 0));
  const truss = std('#7d8592', { metalness: .7, roughness: .35 });
  for (let x = -W / 2 + 4; x < W / 2; x += 6) scene.add(box(.25, .5, D, truss, x, H - .6, 0));
  const skyM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.2 });
  for (let x = -W / 2 + 7; x < W / 2; x += 6) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, D - 4), skyM); s.rotation.x = Math.PI / 2; s.position.set(x, H - .02, 0); scene.add(s); }
  const lampM = std('#2b2f37', { metalness: .6, roughness: .4 }), bulbM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6e0', emissiveIntensity: 2 });
  for (let x = -15; x <= 15; x += 6) for (const z of [-6, 2]) { const sh = m(new THREE.ConeGeometry(.55, .45, 20, 1, true), lampM, false); sh.position.set(x, 6.4, z); scene.add(sh); const b = new THREE.Mesh(new THREE.CircleGeometry(.45, 20), bulbM); b.rotation.x = Math.PI / 2; b.position.set(x, 6.18, z); scene.add(b); scene.add(box(.03, 2.3, .03, lampM, x, 7.6, z)); }
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 1.4));
  const key = new THREE.DirectionalLight('#fff8ee', 1.8); key.position.set(6, 16, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .03; scene.add(key);
  // branding: logo board, safety sign, the initiative's roundel
  { const [c, x] = canvas(1024, 300); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 300);
    if (F.logo) { const im = await loadImg(F.logo), r = Math.min(900 / im.width, 230 / im.height); x.drawImage(im, 512 - im.width * r / 2, 150 - im.height * r / 2, im.width * r, im.height * r); }
    else { drawIcon(x, F.icon, 900, 150, 190, F.color); x.fillStyle = '#1b2263'; x.textAlign = 'right'; x.direction = 'rtl'; let fs = 92; x.font = `700 ${fs}px "Readex Pro"`; while (x.measureText(F.name).width > 720 && fs > 40) { fs -= 4; x.font = `700 ${fs}px "Readex Pro"`; } x.fillText(F.name, 790, 150 + fs * .35); }
    const b = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); b.position.set(-6, 5.6, -D / 2 + .08); scene.add(b); }
  const safe = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: signTex(['السلامة أولاً', 'ارتدِ معدات الوقاية · حافظ على الممرات نظيفة'], { stripe: '#f2c230' }), roughness: .5 }));
  safe.position.set(-W / 2 + .08, 5.2, -4); safe.rotation.y = Math.PI / 2; scene.add(safe);
  const fi = await loadImg('assets/img/logo.webp');
  { const [c, x] = canvas(512, 512); x.fillStyle = '#fff'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); const r = 380 / Math.max(fi.width, fi.height); x.drawImage(fi, 256 - fi.width * r / 2, 256 - fi.height * r / 2, fi.width * r, fi.height * r);
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); p.position.set(W / 2 - .08, 5.4, -4); p.rotation.y = -Math.PI / 2; scene.add(p); }
  // ---- the line
  const belt = beltTex(), frameM = std('#9aa3ad', { metalness: .7, roughness: .3 });
  scene.add(box(30, .12, 1.4, new THREE.MeshStandardMaterial({ map: belt, roughness: .8 }), 0, .95, 0)); boxes.push([-15.2, -.9, 15.2, .9]);
  scene.add(box(30, .25, .12, frameM, 0, .85, .76), box(30, .25, .12, frameM, 0, .85, -.76));
  for (let x = -14; x <= 14; x += 2) for (const z of [-.7, .7]) scene.add(box(.1, .85, .1, frameM, x, .42, z));
  const units = [], gap = P === 'steel' ? 3 : P === 'ac' ? 3.4 : 2.55, lift = { juice: 1.28, bottles: 1.28, lab: 1.04, ac: 1.37, dairy: 1.24, steel: 1.16, dates: 1.08, water: 1.28, sweets: 1.13, chem: 1.3, membranes: 1.22, containers: 1.22 }[P];
  for (let x = -14; x < 14; x += gap) { const u = product(F, P, T); u.position.set(x, lift, 0); scene.add(u); units.push(u); }
  // stations with screens
  const scr = txt => { const [c, x] = canvas(512, 320); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#4fd1a5'; x.font = '600 44px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(txt, 256, 120); x.fillStyle = '#7fb2ff'; for (let i = 0; i < 6; i++) { const hh = 40 + (i * 23) % 120; x.fillRect(60 + i * 66, 290 - hh, 40, hh); } return toTex(c); };
  const stationNames = { juice: ['تعبئة العصير', 'فحص الجودة'], bottles: ['تعبئة العبوات', 'فحص الجودة'], lab: ['المختبر', 'الاختبارات'], ac: ['اختبار الضغط', 'فحص الجودة'], dairy: ['البسترة', 'التغليف'], steel: ['الدرفلة', 'التبريد'], dates: ['الفرز', 'التعبئة'], water: ['التعقيم', 'التعبئة'], sweets: ['التشكيل', 'التغليف'], chem: ['غرفة التحكم', 'المختبر'], membranes: ['الترشيح', 'التحكم'], containers: ['الشحن', 'التخليص'] }[P];
  for (const [x, t] of [[-11, stationNames[0]], [10, stationNames[1]]]) {
    scene.add(box(2.2, 1.8, 1.2, std('#dfe3e9', { metalness: .4, roughness: .4 }), x, .9, -3.2)); boxes.push([x - 1.15, -3.85, x + 1.15, -2.55]);
    const st = scr(t); const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .8), new THREE.MeshStandardMaterial({ map: st, emissive: '#ffffff', emissiveMap: st, emissiveIntensity: .8 })); sc.position.set(x, 1.35, -2.59); scene.add(sc);
  }
  const robots = [];
  for (const [x, z, ry] of [[-6, -1.8, 0], [4, -1.8, 0], [-1, 1.9, Math.PI]]) { const r = robotArm(P === 'steel' ? '#e0a21c' : '#f28c28'); r.base.position.set(x, 0, z); r.base.rotation.y = ry; scene.add(r.base); robots.push(r); circles.push([x, z, .7]); }
  // ---- equipment by product along the back wall
  const steel = std('#d7dbe1', { metalness: .95, roughness: .22 });
  if (['juice', 'dairy', 'water', 'chem', 'bottles'].includes(P)) for (let i = 0; i < 3; i++) { const tk = tank(1.25, 3.6, P === 'chem' ? std('#eef0f3', { metalness: .6 }) : steel, brand); tk.position.set(5 + i * 3.4, 0, -9.6); scene.add(tk); circles.push([5 + i * 3.4, -9.6, 1.4]); }
  if (['juice', 'dairy', 'water', 'chem', 'bottles'].includes(P)) { const pipe = cyl(.09, .09, 10.2, std('#c7ccd3', { metalness: .9, roughness: .25 }), 8.4, 5.4, -9.6, 12); pipe.rotation.z = Math.PI / 2; scene.add(pipe); }
  if (P === 'lab') for (let i = 0; i < 5; i++) { const rack = box(1.2, 2.4, .9, std('#1e2430', { metalness: .5 }), 4 + i * 1.5, 1.2, -11.2); scene.add(rack); boxes.push([3.3 + i * 1.5, -11.7, 4.7 + i * 1.5, -10.7]); for (let k = 0; k < 8; k++) { const led = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), new THREE.MeshBasicMaterial({ color: k % 3 ? '#4fd1a5' : '#7fb2ff' })); led.position.set(4 + i * 1.5 - .4 + (k % 4) * .25, .6 + Math.floor(k / 4) * 1.2, -10.74); scene.add(led); anim.push(t => { led.visible = Math.sin(t * (3 + k) + i) > -.3; }); } }
  if (P === 'steel') { const fur = box(4, 3.2, 3, std('#3b3f46', { metalness: .6 }), 9, 1.6, -9.5); scene.add(fur); boxes.push([6.9, -11.1, 11.1, -7.9]); const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff6a00', emissiveIntensity: 2 })); mouth.position.set(9, 1.4, -7.99); scene.add(mouth); const glow = new THREE.PointLight('#ff8a30', 6, 9); glow.position.set(9, 1.6, -6.8); scene.add(glow); anim.push(t => { glow.intensity = 5 + Math.sin(t * 7) * 1.2; }); }
  if (P === 'dates' || P === 'sweets' || P === 'membranes' || P === 'containers' || P === 'ac') boxes.push([5.4, -11.4, 10.8, -10.2]);
  if (P === 'dates' || P === 'sweets' || P === 'membranes' || P === 'containers' || P === 'ac') for (let i = 0; i < 4; i++) for (let k = 0; k < 2 + (i % 2); k++) scene.add(box(1, .8, 1, new THREE.MeshStandardMaterial({ map: T.cardboard, roughness: .8 }), 6 + i * 1.15, .4 + k * .82, -10.8));
  // storage racks with boxes
  const rackM = std(F.color, { metalness: .5, roughness: .4 }), shelfM = std('#f28c28', { metalness: .4 }), cbM = new THREE.MeshStandardMaterial({ map: T.cardboard, roughness: .8 });
  for (const x of [-15, -10]) {
    boxes.push([x - 1.6, -11.8, x + 1.6, -10.2]);
    for (const xx of [-1.4, 1.4]) for (const z of [-11.6, -10.4]) scene.add(box(.1, 5, .1, rackM, x + xx, 2.5, z));
    for (const y of [.15, 1.8, 3.4]) { scene.add(box(2.9, .1, 1.3, shelfM, x, y, -11)); for (let k = 0; k < 3; k++) { const b = box(.8, .6, .8, cbM, x - .9 + k * .9, y + .36, -11); b.rotation.y = k * .3; scene.add(b); } }
  }
  for (let i = 0; i < 3; i++) scene.add(cyl(.3, .3, .9, std('#c0392b', { metalness: .5 }), 16.5, .45, -6 + i * .8, 16)); boxes.push([16.1, -6.4, 16.9, -4]);

  // ---------------- hazards (only for the safety mission) ----------------
  const hazards = []; let sparks = null, sparkLight = null;
  if (F.game === 'hazard') {
    const hit = (w, h, d, x, y, z, label, key2) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); o.position.set(x, y, z); scene.add(o); const hz = { key: key2, label, mesh: o, found: false, anchor: new THREE.Vector3(x, y + h / 2 + .3, z) }; o.userData.hz = hz; hazards.push(hz); return hz; };
    const pud = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.9), new THREE.MeshPhysicalMaterial({ map: puddleTex(), transparent: true, roughness: .04, metalness: .1, clearcoat: 1, depthWrite: false }));
    pud.rotation.x = -Math.PI / 2; pud.position.set(6.5, .015, 4.8); scene.add(pud);
    const can = cyl(.18, .18, .45, std('#c0392b', { metalness: .6 }), 7.6, .18, 4.4); can.rotation.z = Math.PI / 2; scene.add(can);
    hit(3, .6, 2.4, 6.8, .3, 4.7, 'بقعة زيت على ممر المشاة', 'oil');
    const door = box(2.2, 2.6, .12, std('#5f6b7a', { metalness: .5 }), W / 2 - .08, 1.3, 8); door.rotation.y = Math.PI / 2; scene.add(door);
    const et = exitTex(); const ex = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .6), new THREE.MeshStandardMaterial({ map: et, emissive: '#ffffff', emissiveMap: et, emissiveIntensity: .9 })); ex.rotation.y = -Math.PI / 2; ex.position.set(W / 2 - .1, 3, 8); scene.add(ex);
    for (let i = 0; i < 7; i++) { const b = box(1.1, .6, .9, cbM, W / 2 - 1.2 - (i % 2) * .7, .3 + Math.floor(i / 3) * .62, 7.2 + (i % 3) * .75); b.rotation.y = i * .7; scene.add(b); }
    hit(2.2, 3, 3, W / 2 - 1.3, 1.5, 8, 'مخرج الطوارئ مسدود بالصناديق', 'exit'); boxes.push([W / 2 - 2.6, 6.6, W / 2, 9.4]);
    const pnl = new THREE.Group(); pnl.position.set(-W / 2 + .35, 0, 6); scene.add(pnl);
    pnl.add(box(.5, 1.9, 1.3, std('#c9ced6', { metalness: .5 }), 0, 1.45, 0));
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), std('#30353d')); inner.rotation.y = Math.PI / 2; inner.position.set(.26, 1.45, 0); pnl.add(inner);
    const wc = ['#e53935', '#1e88e5', '#fdd835', '#43a047']; for (let i = 0; i < 8; i++) pnl.add(box(.04, .9 + (i % 3) * .2, .04, std(wc[i % 4]), .28, 1.3, -.45 + i * .13));
    const dr = new THREE.Group(); dr.position.set(.26, 1.45, .65); pnl.add(dr); dr.add(box(.04, 1.85, 1.25, std('#c9ced6', { metalness: .5 }), 0, 0, -.62)); dr.rotation.y = -1.9;
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(.45, .45), new THREE.MeshStandardMaterial({ map: warnTex(), transparent: true })); warn.rotation.y = Math.PI / 2; warn.position.set(.03, 0, -.95); dr.add(warn);
    sparks = new THREE.Group(); sparks.position.set(.32, 1.2, -.2); pnl.add(sparks); const sm = new THREE.MeshBasicMaterial({ color: '#fff3a0' }); for (let i = 0; i < 6; i++) sparks.add(new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), sm));
    sparkLight = new THREE.PointLight('#ffd27a', 0, 4); sparkLight.position.set(.5, 1.2, -.2); pnl.add(sparkLight);
    hit(1.4, 2.4, 2.2, -W / 2 + .9, 1.2, 6, 'لوحة كهرباء مفتوحة ومكشوفة', 'panel'); boxes.push([-W / 2, 5.2, -W / 2 + .7, 6.8]);
  }

  let t = 0;
  return {
    scene, hazards, boxes, circles, bounds: { x0: -W / 2 + .5, x1: W / 2 - .5, z0: -D / 2 + .5, z1: D / 2 - .5 }, anim,
    view: { pos: new THREE.Vector3(0, 8.5, 17), target: new THREE.Vector3(0, .8, 0) },
    update(dt) {
      t += dt;
      for (const u of units) { u.position.x += dt * .9; if (u.position.x > 14) u.position.x -= units.length * gap; }
      robots.forEach((r, i) => { r.turret.rotation.y = Math.sin(t * .8 + i) * .7; r.sh.rotation.z = .5 + Math.sin(t * 1.1 + i) * .2; r.el.rotation.z = 1.2 + Math.sin(t * 1.3 + i * 2) * .25; });
      for (const f of anim) f(t);
      if (sparks) { const on = Math.random() < .35; sparks.children.forEach(s => { s.visible = on; s.position.set((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3); }); sparkLight.intensity = on ? 3 + Math.random() * 3 : 0; }
    },
    dispose() { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { for (const k in mt) if (mt[k]?.isTexture) mt[k].dispose(); mt.dispose(); }); }); scene.environment?.dispose(); }
  };
}
