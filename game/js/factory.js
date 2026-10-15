import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { canvas, toTex, loadImg, pbr, BRAND } from './tex.js';

/* Inside the YORK plant: an assembly line for A/C units with three hidden safety hazards.
   Returns { scene, hazards, update(dt) }. Hazards carry an invisible hit box and a label. */
const gl = new GLTFLoader(), cache = {};
async function model(name) {
  if (!cache[name]) cache[name] = gl.loadAsync(`assets/models/${name}/${name}.gltf`).then(g => { g.scene.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return g.scene; });
  return (await cache[name]).clone(true);
}
function m(g, mat, cast = true) { const o = new THREE.Mesh(g, mat); o.castShadow = cast; o.receiveShadow = true; return o; }
function box(w, h, d, mat, x, y, z) { const o = m(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; }

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
  x.font = '600 90px "Readex Pro"'; x.direction = 'ltr'; x.textAlign = 'right'; x.fillText('EXIT', 980, 300);
  x.beginPath(); x.moveTo(90, 190); x.lineTo(260, 190); x.lineTo(260, 120); x.lineTo(380, 220); x.lineTo(260, 320); x.lineTo(260, 250); x.lineTo(90, 250); x.closePath(); x.fill();
  return toTex(c);
}
function warnTex() {
  const [c, x] = canvas(256, 256); x.fillStyle = '#f5c518'; x.beginPath(); x.moveTo(128, 18); x.lineTo(240, 230); x.lineTo(16, 230); x.closePath(); x.fill();
  x.strokeStyle = '#111'; x.lineWidth = 12; x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(140, 70); x.lineTo(100, 150); x.lineTo(132, 150); x.lineTo(112, 210); x.lineTo(160, 125); x.lineTo(128, 125); x.closePath(); x.fill();
  const t = toTex(c); return t;
}
function puddleTex() {
  const [c, x] = canvas(512, 512); x.clearRect(0, 0, 512, 512);
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 250); g.addColorStop(0, 'rgba(18,14,10,1)'); g.addColorStop(.75, 'rgba(25,20,14,.95)'); g.addColorStop(1, 'rgba(25,20,14,0)');
  x.fillStyle = g; x.beginPath();
  for (let a = 0; a <= Math.PI * 2 + .01; a += .15) { const r = 170 + Math.sin(a * 3) * 40 + Math.sin(a * 7 + 1) * 22; x.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r * .8); }
  x.fill(); return toTex(c);
}
function beltTex() { const [c, x] = canvas(64, 256); x.fillStyle = '#23262c'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#2e3239'; for (let i = 0; i < 256; i += 16) x.fillRect(0, i, 64, 6); const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 24); return t; }
function grilleTex() { const [c, x] = canvas(256, 256); x.fillStyle = '#e9ecf1'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#7d8592'; x.lineWidth = 6; for (let r = 20; r < 120; r += 16) { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); } x.fillStyle = '#5a6270'; x.beginPath(); x.arc(128, 128, 18, 0, 7); x.fill(); return toTex(c); }

function juiceTex() {
  const [c, x] = canvas(512, 384); x.fillStyle = '#0b7a35'; x.fillRect(0, 0, 512, 384);
  x.fillStyle = '#ffffff'; x.fillRect(0, 250, 512, 134);
  for (let i = 0; i < 3; i++) { x.fillStyle = '#f39c12'; x.beginPath(); x.arc(110 + i * 70, 150, 52, 0, 7); x.fill(); x.fillStyle = '#58b947'; x.beginPath(); x.ellipse(122 + i * 70, 96, 22, 10, -.5, 0, 7); x.fill(); }
  x.fillStyle = '#ffffff'; x.font = '700 64px "Readex Pro"'; x.textAlign = 'right'; x.direction = 'rtl'; x.fillText('الربيع', 490, 120); x.font = '500 40px "Readex Pro"'; x.fillText('عصير برتقال', 490, 190);
  x.fillStyle = '#0b7a35'; x.font = '600 44px "Readex Pro"'; x.fillText('100% طبيعي', 490, 330);
  return toTex(c);
}
function juicePack(tex) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .5 });
  for (const [dx, dz] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) { const b = m(new RoundedBoxGeometry(.3, .5, .3, 2, .03), mat); b.position.set(dx, 0, dz); g.add(b); }
  const film = m(new RoundedBoxGeometry(.7, .54, .7, 2, .05), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .14, roughness: .1, clearcoat: 1 }), false); g.add(film);
  return g;
}
function acUnit(grille) {
  const g = new THREE.Group();
  g.add(m(new RoundedBoxGeometry(.9, .7, .45, 3, .04), new THREE.MeshStandardMaterial({ color: '#eef0f4', roughness: .4, metalness: .2 })));
  const f = new THREE.Mesh(new THREE.CircleGeometry(.27, 32), new THREE.MeshStandardMaterial({ map: grille, roughness: .5 })); f.position.set(-.13, 0, .226); g.add(f);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(.22, .05), new THREE.MeshBasicMaterial({ color: '#1f5fae' })); logo.position.set(.28, .25, .226); g.add(logo);
  return g;
}
function robotArm(color = '#f28c28') {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: .4, metalness: .3 }), dark = new THREE.MeshStandardMaterial({ color: '#2b2f37', roughness: .5, metalness: .5 });
  const base = new THREE.Group();
  base.add(m(new THREE.CylinderGeometry(.45, .55, .4, 32), dark));
  const turret = new THREE.Group(); turret.position.y = .2; base.add(turret);
  turret.add(m(new THREE.CylinderGeometry(.35, .38, .5, 32), mat)).position.y = .25;
  const sh = new THREE.Group(); sh.position.y = .5; turret.add(sh);
  const a1 = m(new RoundedBoxGeometry(.28, 1.4, .28, 3, .08), mat); a1.position.y = .7; sh.add(a1);
  const el = new THREE.Group(); el.position.y = 1.4; sh.add(el);
  el.add(m(new THREE.SphereGeometry(.2, 24, 16), dark));
  const a2 = m(new RoundedBoxGeometry(.22, 1.1, .22, 3, .07), mat); a2.position.y = .55; el.add(a2);
  const wr = new THREE.Group(); wr.position.y = 1.1; el.add(wr);
  wr.add(m(new THREE.CylinderGeometry(.1, .1, .2, 16), dark));
  for (const s of [-1, 1]) { const f = m(new THREE.BoxGeometry(.04, .2, .08), dark); f.position.set(s * .07, -.15, 0); wr.add(f); }
  sh.rotation.z = .5; el.rotation.z = 1.2; wr.rotation.z = .6;
  return { base, turret, sh, el };
}

export async function buildFactory(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfd6e2');
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7;
  scene.fog = new THREE.Fog('#cfd6e2', 30, 70);
  const W = 40, D = 26, H = 9;
  // floor: polished concrete with painted walkways
  const floorT = pbr('brushed_concrete', [W / 4, D / 4]);
  const floor = m(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ ...floorT, color: '#b9bcc2', roughness: .55 }), false); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const yellow = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: .5 }), green = new THREE.MeshStandardMaterial({ color: '#5aa36a', roughness: .6 });
  for (const z of [3.2, 6.2]) { const l = m(new THREE.PlaneGeometry(W - 2, .14), yellow, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .01, z); scene.add(l); }
  const walk = m(new THREE.PlaneGeometry(W - 2, 2.86), green, false); walk.rotation.x = -Math.PI / 2; walk.position.set(0, .006, 4.7); walk.material.transparent = true; walk.material.opacity = .35; scene.add(walk);
  // walls + roof
  const clad = pbr('box_profile_metal_sheet', [W / 2.5, H / 2.5]);
  const wallM = new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, roughnessMap: clad.roughnessMap, color: '#e3e7ed', metalness: .35, roughness: .5, side: THREE.BackSide });
  const shell = m(new THREE.BoxGeometry(W, H, D), wallM, false); shell.position.y = H / 2 - .06; shell.receiveShadow = true; scene.add(shell);
  const dado = new THREE.MeshStandardMaterial({ color: '#0b7a35', roughness: .45 });
  scene.add(box(W - .1, 1.2, .1, dado, 0, .6, -D / 2 + .06), box(.1, 1.2, D - .1, dado, -W / 2 + .06, .6, 0), box(.1, 1.2, D - .1, dado, W / 2 - .06, .6, 0));
  const truss = new THREE.MeshStandardMaterial({ color: '#7d8592', metalness: .7, roughness: .35 });
  for (let x = -W / 2 + 4; x < W / 2; x += 6) { scene.add(box(.25, .5, D, truss, x, H - .6, 0)); }
  const skyM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.2 });
  for (let x = -W / 2 + 7; x < W / 2; x += 6) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, D - 4), skyM); s.rotation.x = Math.PI / 2; s.position.set(x, H - .02, 0); scene.add(s); }
  const lampM = new THREE.MeshStandardMaterial({ color: '#2b2f37', metalness: .6, roughness: .4 }), bulbM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6e0', emissiveIntensity: 2 });
  for (let x = -15; x <= 15; x += 6) for (const z of [-6, 2]) { const sh = m(new THREE.ConeGeometry(.55, .45, 24, 1, true), lampM, false); sh.position.set(x, 6.4, z); scene.add(sh); const b = new THREE.Mesh(new THREE.CircleGeometry(.45, 24), bulbM); b.rotation.x = Math.PI / 2; b.position.set(x, 6.18, z); scene.add(b); scene.add(box(.03, 2.3, .03, lampM, x, 7.6, z)); }
  // light
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 1.4));
  const key = new THREE.DirectionalLight('#fff8ee', 1.8); key.position.set(6, 16, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 40 }); key.shadow.bias = -.0004; key.shadow.normalBias = .03; scene.add(key);
  // branding on the back wall
  const york = await loadImg('assets/img/r-alrabie.webp');
  { const [c, x] = canvas(1024, 300); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 300); const r = Math.min(900 / york.width, 230 / york.height); x.drawImage(york, 512 - york.width * r / 2, 150 - york.height * r / 2, york.width * r, york.height * r);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); b.position.set(-6, 5.6, -D / 2 + .08); scene.add(b); }
  const safe = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: signTex(['السلامة أولاً', 'ارتدِ معدات الوقاية · حافظ على الممرات نظيفة'], { bg: '#ffffff', fg: '#1b2263', stripe: '#f2c230' }), roughness: .5 }));
  safe.position.set(-W / 2 + .08, 5.2, -4); safe.rotation.y = Math.PI / 2; scene.add(safe);
  const fi = await loadImg('assets/img/logo.webp');
  { const [c, x] = canvas(512, 512); x.fillStyle = '#fff'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill(); const r = 380 / Math.max(fi.width, fi.height); x.drawImage(fi, 256 - fi.width * r / 2, 256 - fi.height * r / 2, fi.width * r, fi.height * r);
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .5 })); p.position.set(W / 2 - .08, 5.4, -4); p.rotation.y = -Math.PI / 2; scene.add(p); }

  // ---------- assembly line ----------
  const belt = beltTex(), grille = grilleTex();
  const frameM = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: .7, roughness: .3 });
  const line = new THREE.Group(); scene.add(line);
  line.add(box(30, .12, 1.4, new THREE.MeshStandardMaterial({ map: belt, roughness: .8 }), 0, .95, 0));
  line.add(box(30, .25, .12, frameM, 0, .85, .76), box(30, .25, .12, frameM, 0, .85, -.76));
  for (let x = -14; x <= 14; x += 2) for (const z of [-.7, .7]) line.add(box(.1, .85, .1, frameM, x, .42, z));
  const units = [];
  const jt = juiceTex(); for (let i = 0; i < 12; i++) { const u = juicePack(jt); u.position.set(-14 + i * 2.55, 1.28, 0); line.add(u); units.push(u); }
  const robots = [];
  for (const [x, z, ry] of [[-6, -1.8, 0], [4, -1.8, 0], [-1, 1.9, Math.PI]]) { const r = robotArm(); r.base.position.set(x, 0, z); r.base.rotation.y = ry; scene.add(r.base); robots.push(r); }
  // stations with screens
  const stM = new THREE.MeshStandardMaterial({ color: '#dfe3e9', metalness: .4, roughness: .4 });
  const scr = (txt) => { const [c, x] = canvas(512, 320); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 512, 320); x.fillStyle = '#4fd1a5'; x.font = '600 44px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(txt, 256, 120); x.fillStyle = '#7fb2ff'; for (let i = 0; i < 6; i++) x.fillRect(60 + i * 66, 290 - (40 + i * 23 % 120), 40, 40 + i * 23 % 120); return toTex(c); };
  for (const [x, t] of [[-11, 'تعبئة العصير'], [10, 'فحص الجودة']]) {
    const s = box(2.2, 1.8, 1.2, stM, x, .9, -3.2); scene.add(s);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .8), new THREE.MeshStandardMaterial({ map: scr(t), emissive: '#ffffff', emissiveMap: scr(t), emissiveIntensity: .8 })); sc.position.set(x, 1.35, -2.59); scene.add(sc);
  }
  // stainless mixing tanks with pipework
  const steel = new THREE.MeshStandardMaterial({ color: '#d7dbe1', metalness: .95, roughness: .22 });
  for (let i = 0; i < 3; i++) { const tk = new THREE.Group(); tk.position.set(5 + i * 3.4, 0, -9.6);
    const body = m(new THREE.CylinderGeometry(1.25, 1.25, 3.6, 40), steel); body.position.y = 3; tk.add(body);
    const cone = m(new THREE.ConeGeometry(1.25, 1, 40), steel); cone.rotation.x = Math.PI; cone.position.y = .7; tk.add(cone);
    const top = m(new THREE.SphereGeometry(1.25, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel); top.scale.y = .35; top.position.y = 4.8; tk.add(top);
    for (let k = 0; k < 3; k++) { const leg = m(new THREE.CylinderGeometry(.07, .07, 1.3, 10), steel); const a = k * 2.1; leg.position.set(Math.cos(a) * 1.05, .65, Math.sin(a) * 1.05); tk.add(leg); }
    const band = m(new THREE.TorusGeometry(1.27, .05, 8, 48), new THREE.MeshStandardMaterial({ color: '#0b7a35' }), false); band.rotation.x = Math.PI / 2; band.position.y = 4.2; tk.add(band);
    scene.add(tk); }
  const pipeM = new THREE.MeshStandardMaterial({ color: '#c7ccd3', metalness: .9, roughness: .25 });
  const pipe = m(new THREE.CylinderGeometry(.09, .09, 10.2, 16), pipeM); pipe.rotation.z = Math.PI / 2; pipe.position.set(8.4, 5.4, -9.6); scene.add(pipe);
  // storage racks with boxes
  const rackM = new THREE.MeshStandardMaterial({ color: '#1f5fae', metalness: .5, roughness: .4 }), shelfM = new THREE.MeshStandardMaterial({ color: '#f28c28', metalness: .4, roughness: .45 });
  for (const x of [-15, -10]) {
    for (const xx of [-1.4, 1.4]) for (const z of [-11.6, -10.4]) scene.add(box(.1, 5, .1, rackM, x + xx, 2.5, z));
    for (const y of [.15, 1.8, 3.4]) { scene.add(box(2.9, .1, 1.3, shelfM, x, y, -11)); for (let k = 0; k < 3; k++) { const b = await model('cardboard_box_01'); b.scale.setScalar(1.6); b.position.set(x - .9 + k * .9, y + .05, -11); b.rotation.y = k * .3; scene.add(b); } }
  }
  for (let i = 0; i < 4; i++) { const c = await model('plastic_crate_03'); c.scale.setScalar(1.5); c.position.set(13 + (i % 2) * .8, (i > 1 ? .45 : 0), -10.5); scene.add(c); }
  const ht = await model('hand_truck'); ht.position.set(11, 0, -9); ht.rotation.y = .6; scene.add(ht);
  for (let i = 0; i < 3; i++) { const b = await model('Barrel_01'); b.position.set(16.5, 0, -6 + i * 1.1); scene.add(b); }
  const ic = await model('industrial_pastic_container'); ic.scale.setScalar(1.3); ic.position.set(-16.5, 0, 2); scene.add(ic);

  // ---------- hazards ----------
  const hazards = [];
  const hit = (w, h, d, x, y, z, label, key) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); o.position.set(x, y, z); scene.add(o); const hz = { key, label, mesh: o, found: false, anchor: new THREE.Vector3(x, y + h / 2 + .3, z) }; o.userData.hz = hz; hazards.push(hz); return hz; };
  // 1. oil on the green walkway, with the leaking can
  const pud = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.9), new THREE.MeshPhysicalMaterial({ map: puddleTex(), transparent: true, roughness: .04, metalness: .1, clearcoat: 1, depthWrite: false }));
  pud.rotation.x = -Math.PI / 2; pud.position.set(6.5, .015, 4.8); scene.add(pud);
  const can = m(new THREE.CylinderGeometry(.18, .18, .45, 24), new THREE.MeshStandardMaterial({ color: '#c0392b', metalness: .6, roughness: .35 })); can.rotation.z = Math.PI / 2; can.position.set(7.6, .18, 4.4); scene.add(can);
  hit(3, .6, 2.4, 6.8, .3, 4.7, 'بقعة زيت على ممر المشاة', 'oil');
  // 2. emergency exit blocked by boxes
  const door = box(2.2, 2.6, .12, new THREE.MeshStandardMaterial({ color: '#5f6b7a', metalness: .5, roughness: .4 }), W / 2 - .08, 1.3, 8); door.rotation.y = Math.PI / 2; scene.add(door);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .6), new THREE.MeshStandardMaterial({ map: exitTex(), emissive: '#ffffff', emissiveMap: exitTex(), emissiveIntensity: .9 })); ex.rotation.y = -Math.PI / 2; ex.position.set(W / 2 - .1, 3, 8); scene.add(ex);
  for (let i = 0; i < 7; i++) { const b = await model('cardboard_box_01'); b.scale.setScalar(2.2); b.position.set(W / 2 - 1.2 - (i % 2) * .7, Math.floor(i / 3) * .62, 7.2 + (i % 3) * .75); b.rotation.y = i * .7; scene.add(b); }
  hit(2.2, 3, 3, W / 2 - 1.3, 1.5, 8, 'مخرج الطوارئ مسدود بالصناديق', 'exit');
  // 3. electrical panel left open, sparking
  const pnl = new THREE.Group(); pnl.position.set(-W / 2 + .35, 0, 6); scene.add(pnl);
  const cab = box(.5, 1.9, 1.3, new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: .5, roughness: .4 }), 0, 1.45, 0); pnl.add(cab);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), new THREE.MeshStandardMaterial({ color: '#30353d' })); inner.rotation.y = Math.PI / 2; inner.position.set(.26, 1.45, 0); pnl.add(inner);
  const wireCols = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];
  for (let i = 0; i < 8; i++) { const w = box(.04, .9 + (i % 3) * .2, .04, new THREE.MeshStandardMaterial({ color: wireCols[i % 4] }), .28, 1.3, -.45 + i * .13); pnl.add(w); }
  const dr = new THREE.Group(); dr.position.set(.26, 1.45, .65); pnl.add(dr);
  const leaf = box(.04, 1.85, 1.25, new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: .5, roughness: .4 }), 0, 0, -.62); dr.add(leaf); dr.rotation.y = -1.9;
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(.45, .45), new THREE.MeshStandardMaterial({ map: warnTex(), transparent: true })); warn.rotation.y = Math.PI / 2; warn.position.set(.03, 0, -.95); dr.add(warn);
  const sparkM = new THREE.MeshBasicMaterial({ color: '#fff3a0' }); const sparks = new THREE.Group(); sparks.position.set(.32, 1.2, -.2); pnl.add(sparks);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), sparkM); sparks.add(s); }
  const sparkLight = new THREE.PointLight('#ffd27a', 0, 4); sparkLight.position.set(.5, 1.2, -.2); pnl.add(sparkLight);
  hit(1.4, 2.4, 2.2, -W / 2 + .9, 1.2, 6, 'لوحة كهرباء مفتوحة ومكشوفة', 'panel');

  let t = 0;
  function update(dt) {
    t += dt;
    for (const u of units) { u.position.x += dt * .9; if (u.position.x > 14.5) u.position.x -= 30.6; }
    robots.forEach((r, i) => { r.turret.rotation.y = Math.sin(t * .8 + i) * .7; r.sh.rotation.z = .5 + Math.sin(t * 1.1 + i) * .2; r.el.rotation.z = 1.2 + Math.sin(t * 1.3 + i * 2) * .25; });
    const on = Math.random() < .35;
    sparks.children.forEach(s => { s.visible = on; s.position.set((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3); });
    sparkLight.intensity = on ? 3 + Math.random() * 3 : 0;
  }
  return { scene, hazards, update, view: { pos: new THREE.Vector3(0, 8.5, 17), target: new THREE.Vector3(0, .8, 0) } };
}
