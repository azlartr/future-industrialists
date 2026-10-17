import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { canvas, toTex, loadImg, BRAND, network, grad } from './tex.js';
import { tx } from './i18n.js';

/* A modern touring coach in the initiative's livery: sculpted side profile with a sloping,
   wrap-around windscreen, frameless panoramic glazing, purple/blue swooshes, rabbit-ear mirrors.
   Faces +x, door on the +z (curb) side, wheels on y = 0. */
const L = 12.2, Wd = 2.5, BT = .12;
const AX = [3.55, -2.75, -4.15];
function m(g, mat, cast = true) { const o = new THREE.Mesh(g, mat); o.castShadow = cast; o.receiveShadow = true; return o; }

function profile() {
  const s = new THREE.Shape(), y0 = .42, r = .68;
  s.moveTo(-6.1, .75);
  s.lineTo(-6.1, 3.2); s.quadraticCurveTo(-6.1, 3.56, -5.72, 3.56);
  s.lineTo(4.6, 3.58); s.bezierCurveTo(5.45, 3.58, 5.85, 3.3, 5.98, 2.86);
  s.bezierCurveTo(6.16, 2.2, 6.2, 1.5, 6.18, 1.05);
  s.lineTo(6.12, .62); s.quadraticCurveTo(6.06, y0, 5.82, y0);
  s.lineTo(AX[0] + r, y0); s.absarc(AX[0], y0, r, 0, Math.PI, false);
  s.lineTo(AX[1] + r, y0); s.absarc(AX[1], y0, r, 0, Math.PI, false);
  s.absarc(AX[2], y0, r, 0, Math.PI, false);
  s.lineTo(-5.8, y0); s.quadraticCurveTo(-6.1, y0, -6.1, .75);
  return s;
}
/* split the extruded body into paint and windscreen glass by triangle position */
function bodyGeometry() {
  const g = new THREE.ExtrudeGeometry(profile(), { depth: Wd - BT * 2, bevelEnabled: true, bevelThickness: BT, bevelSize: .1, bevelSegments: 5, curveSegments: 40, steps: 1 });
  g.translate(0, 0, -(Wd - BT * 2) / 2);
  const ng = g.toNonIndexed(), p = ng.attributes.position, idxPaint = [], idxGlass = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const glass = cx > 5.55 && cy > 1.32 && cy < 3.1 && Math.abs(cz) < Wd / 2 - .05;
    (glass ? idxGlass : idxPaint).push(i, i + 1, i + 2);
  }
  ng.setIndex([...idxPaint, ...idxGlass]); ng.clearGroups(); ng.addGroup(0, idxPaint.length, 0); ng.addGroup(idxPaint.length, idxGlass.length, 1);
  ng.computeVertexNormals(); return ng;
}
/* the panoramic side window band (side view), following the roof and the windscreen */
function windowShape() {
  const s = new THREE.Shape();
  s.moveTo(-5.75, 1.95); s.lineTo(-5.75, 3.12); s.quadraticCurveTo(-5.75, 3.3, -5.55, 3.3);
  s.lineTo(4.55, 3.33); s.bezierCurveTo(5.25, 3.33, 5.62, 3.1, 5.72, 2.72);
  s.lineTo(5.86, 1.95); s.closePath(); return s;
}
const PX = 4096 / 11.9;
/* side > 0: the curb side, canvas runs rear→front. side < 0: canvas runs front→rear, so the
   artwork is mirrored but the lettering is drawn normally and still sits towards the front. */
async function livery(side) {
  const w = 4096, h = 640, [c, x] = canvas(w, h); x.clearRect(0, 0, w, h);
  const cx = wx => side > 0 ? (wx + 5.95) * PX : (5.95 - wx) * PX;
  x.save(); if (side < 0) { x.translate(w, 0); x.scale(-1, 1); }
  // long sweeping swooshes from the rear towards the front
  const sweep = (y0, y1, thick, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(w * .3, y0 - 40, w * .55, y1 + 20, w, y1); x.lineTo(w, y1 + thick); x.bezierCurveTo(w * .55, y1 + 20 + thick * 1.3, w * .3, y0 + thick * .6, 0, y0 + thick * 1.6); x.closePath(); x.fill(); };
  sweep(300, 520, 110, BRAND.navy);
  sweep(360, 440, 80, BRAND.blue);
  sweep(270, 400, 40, BRAND.violet);
  sweep(250, 365, 12, '#b9b2e3');
  x.save(); x.globalAlpha = .35; x.beginPath(); x.rect(0, 150, w * .5, 490); x.clip(); network(x, w * .5, h, { n: 40, link: 220, color: 'rgba(255,255,255,.5)', dot: 'rgba(255,255,255,.8)', lw: 2.2, seed: 5 }); x.restore();
  x.restore();
  // logo + name mid-body, logo towards the front, clear of the door
  const logo = await loadImg('assets/img/logo-mark.webp'), lh = 220, lw = lh * logo.width / logo.height;
  const front = cx(3.0);
  x.direction = 'rtl'; x.font = '700 140px "Readex Pro"'; const nameW = x.measureText(tx('صناعيو المستقبل', 'Future Industrialists')).width;
  if (side > 0) {
    x.drawImage(logo, front - lw, 24, lw, lh);
    x.fillStyle = BRAND.navy; x.textAlign = 'right'; x.fillText(tx('صناعيو المستقبل', 'Future Industrialists'), front - lw - 36, 170);
    x.fillStyle = BRAND.blue; x.font = '600 52px "Readex Pro"'; x.direction = 'ltr'; x.textAlign = 'right'; x.fillText(tx('FUTURE INDUSTRIALISTS · 2026', 'TOURING COACH · 2026'), front - lw - 40, 242);
  } else {
    x.drawImage(logo, front, 24, lw, lh);
    x.fillStyle = BRAND.navy; x.textAlign = 'right'; x.fillText(tx('صناعيو المستقبل', 'Future Industrialists'), front + lw + 36 + nameW, 170);
    x.fillStyle = BRAND.blue; x.font = '600 52px "Readex Pro"'; x.direction = 'ltr'; x.textAlign = 'left'; x.fillText(tx('FUTURE INDUSTRIALISTS · 2026', 'TOURING COACH · 2026'), front + lw + 40, 242);
  }
  // wheel arches: nothing painted over the wheels
  x.globalCompositeOperation = 'destination-out';
  for (const ax of AX) { x.beginPath(); x.arc(cx(ax), (1.99 - .42) * PX, .74 * PX, 0, Math.PI * 2); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  return toTex(c);
}
function destSign() {
  const [c, x] = canvas(1024, 128); x.fillStyle = '#05060a'; x.fillRect(0, 0, 1024, 128);
  x.fillStyle = '#ffb547'; x.shadowColor = '#ffb547'; x.shadowBlur = 14; x.font = tx('600 70px "Readex Pro"', '600 56px "Readex Pro"'); x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(tx('رحلة صناعيو المستقبل', 'Future Industrialists Tour'), 512, 90);
  return toTex(c);
}
function plate() {
  const [c, x] = canvas(256, 128); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 122);
  x.fillStyle = '#111'; x.font = '600 44px "Readex Pro"'; x.textAlign = 'center'; x.fillText('٢٠٢٦ ص م', 100, 56); x.fillText('2026 FIA', 100, 112); x.fillStyle = '#0a6b3a'; x.fillRect(200, 6, 50, 116);
  return toTex(c);
}
function wheel(side, tyreM, rimM, darkM) {
  const g = new THREE.Group();
  const tyre = m(new THREE.CylinderGeometry(.52, .52, .34, 48), tyreM); tyre.rotation.x = Math.PI / 2; g.add(tyre);
  const wall = m(new THREE.TorusGeometry(.44, .1, 16, 48), tyreM); wall.position.z = side * .15; g.add(wall);
  const dish = m(new THREE.CylinderGeometry(.34, .36, .04, 40), darkM); dish.rotation.x = Math.PI / 2; dish.position.z = side * .155; g.add(dish);
  for (let k = 0; k < 10; k++) { const sp = m(new THREE.BoxGeometry(.06, .3, .03), rimM, false); const a = k / 10 * Math.PI * 2; sp.position.set(Math.cos(a) * .18, Math.sin(a) * .18, side * .175); sp.rotation.z = a - Math.PI / 2; g.add(sp); }
  const ring = m(new THREE.TorusGeometry(.33, .025, 8, 48), rimM, false); ring.position.z = side * .175; g.add(ring);
  const hub = m(new THREE.CylinderGeometry(.09, .11, .06, 24), rimM); hub.rotation.x = Math.PI / 2; hub.position.z = side * .19; g.add(hub);
  return g;
}

export async function makeBus() {
  const g = new THREE.Group(); g.name = 'bus';
  const paint = new THREE.MeshPhysicalMaterial({ color: '#f6f7fa', roughness: .22, metalness: .05, clearcoat: 1, clearcoatRoughness: .05 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0a0f1c', roughness: .04, metalness: .2, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.1 });
  const black = new THREE.MeshStandardMaterial({ color: '#0b0c10', roughness: .5 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#dfe3ea', metalness: 1, roughness: .15 });
  const screen = new THREE.MeshPhysicalMaterial({ color: '#04070d', roughness: .03, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: .55 });
  g.add(m(bodyGeometry(), [paint, screen]));
  const zs = Wd / 2 + .006;
  // side glazing + door
  const win = new THREE.ShapeGeometry(windowShape(), 24);
  const glass2 = glass.clone(); glass2.side = THREE.DoubleSide;
  for (const s of [1, -1]) { const w = m(win, s > 0 ? glass : glass2, false); w.position.z = s * zs; g.add(w); }
  const doorFrame = m(new THREE.BoxGeometry(1.06, 2.66, .01), black, false); doorFrame.position.set(4.82, 1.78, zs + .001); g.add(doorFrame);
  const leaves = [];
  for (const k of [-1, 1]) { const lf = m(new RoundedBoxGeometry(.49, 2.58, .04, 3, .04), glass, false); lf.position.set(4.82 + k * .25, 1.78, zs + .02); g.add(lf); leaves.push({ m: lf, k, x0: 4.82 + k * .25 }); }
  g.userData.door = t => { for (const l of leaves) { l.m.position.x = l.x0 + l.k * .42 * t; l.m.position.z = zs + .02 + .12 * Math.sin(Math.min(1, t * 2) * Math.PI / 2); } };
  g.userData.doorPos = new THREE.Vector3(4.82, 0, Wd / 2 + .4);
  g.userData.halfLen = L / 2 + .2; g.userData.halfWid = Wd / 2 + .25;
  g.userData.roll = d => { for (const w of g.userData.wheels) w.rotation.z -= d / .52; };
  // livery decals on both flanks, below the glazing
  for (const s of [1, -1]) {
    const t = await livery(s);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(11.9, 1.86), new THREE.MeshPhysicalMaterial({ map: t, transparent: true, roughness: .22, clearcoat: 1, clearcoatRoughness: .05, polygonOffset: true, polygonOffsetFactor: -2 }));
    d.position.set(0, 1.06, s * (zs + .002)); if (s < 0) d.rotation.y = Math.PI; d.receiveShadow = true; g.add(d);
  }
  // front: grille, LED light bars, logo, plate, destination display
  const grille = m(new RoundedBoxGeometry(.08, .32, 1.5, 3, .05), black); grille.position.set(6.14, .78, 0); g.add(grille);
  const ledM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#eaf4ff', emissiveIntensity: 2.4 });
  for (const s of [-1, 1]) {
    const hl = m(new RoundedBoxGeometry(.06, .16, .6, 3, .05), new THREE.MeshPhysicalMaterial({ color: '#141821', roughness: .05, clearcoat: 1 })); hl.position.set(6.16, 1.1, s * .85); hl.rotation.x = s * -.12; g.add(hl);
    const led = m(new THREE.BoxGeometry(.02, .03, .55), ledM, false); led.position.set(6.2, 1.16, s * .85); led.rotation.x = s * -.12; g.add(led);
    const fog = m(new THREE.CylinderGeometry(.05, .05, .03, 20), ledM, false); fog.rotation.z = Math.PI / 2; fog.position.set(6.17, .58, s * 1); g.add(fog);
    const tl = m(new RoundedBoxGeometry(.05, 1.3, .14, 3, .04), new THREE.MeshStandardMaterial({ color: '#7a0b12', emissive: '#ff2030', emissiveIntensity: .9 })); tl.position.set(-6.13, 1.6, s * 1.08); g.add(tl);
    // rabbit-ear mirrors
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(5.2, 3.45, s * 1.15), new THREE.Vector3(5.85, 3.5, s * 1.32), new THREE.Vector3(6.35, 3.05, s * 1.42), new THREE.Vector3(6.42, 2.55, s * 1.42)]);
    g.add(m(new THREE.TubeGeometry(arm, 24, .03, 8), black));
    const mir = m(new RoundedBoxGeometry(.1, .5, .24, 3, .05), black); mir.position.set(6.42, 2.3, s * 1.42); g.add(mir);
  }
  const logo = await loadImg('assets/img/logo-mark.webp'); { const [c, x] = canvas(256, 256); const r = 230 / Math.max(logo.width, logo.height); x.drawImage(logo, 128 - logo.width * r / 2, 128 - logo.height * r / 2, logo.width * r, logo.height * r);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), new THREE.MeshStandardMaterial({ map: toTex(c), transparent: true, roughness: .3 })); lp.rotation.y = Math.PI / 2; lp.position.set(6.2, 1.02, 0); lp.rotation.z = -.02; g.add(lp); }
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(.52, .26), new THREE.MeshStandardMaterial({ map: plate(), roughness: .4 })); pl.rotation.y = Math.PI / 2; pl.position.set(6.19, .55, 0); g.add(pl);
  const ds = destSign(); const dest = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .2), new THREE.MeshStandardMaterial({ map: ds, emissive: '#ffffff', emissiveMap: ds, emissiveIntensity: 1.3 }));
  dest.rotation.y = Math.PI / 2; dest.rotation.x = -.35; dest.position.set(5.93, 2.98, 0); g.add(dest);
  // rear: window, violet band, light bar
  const rw = m(new RoundedBoxGeometry(.04, .85, 1.9, 3, .06), glass); rw.position.set(-6.12, 2.75, 0); g.add(rw);
  const rb = m(new THREE.BoxGeometry(.03, .26, 2.2), new THREE.MeshStandardMaterial({ color: BRAND.violet, roughness: .3 })); rb.position.set(-6.13, 1.05, 0); g.add(rb);
  // wheels in dark arches
  const tyreM = new THREE.MeshStandardMaterial({ color: '#141518', roughness: .85 }), rimM = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: .95, roughness: .2 }), darkM = new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: .6, roughness: .35 });
  for (const ax of AX) {
    const well = m(new THREE.CylinderGeometry(.67, .67, Wd - .1, 40, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#08090c', roughness: .95, side: THREE.BackSide }), false);
    well.rotation.x = Math.PI / 2; well.position.set(ax, .42, 0); g.add(well);
    for (const s of [-1, 1]) { const wh = wheel(s, tyreM, rimM, darkM); wh.position.set(ax, .52, s * (Wd / 2 - .2)); g.add(wh); (g.userData.wheels ||= []).push(wh); }
  }
  // roof pod + lower skirt trim
  const pod = m(new RoundedBoxGeometry(3.4, .22, 1.7, 6, .1), paint); pod.position.set(-1.6, 3.66, 0); g.add(pod);
  for (const s of [-1, 1]) { const trim = m(new THREE.BoxGeometry(11.5, .06, .02), chrome, false); trim.position.set(-.1, 1.92, s * (zs + .01)); g.add(trim); }
  return g;
}

/* The team's coach model (assets/models/bus.glb), used as made: one unit long, front towards -z, door on +x.
   It is turned to face +x with the door on the +z (curb) side and scaled to a 7.6 m coach. Spinning
   wheels sit over the modelled ones and a two-leaf door opens over the modelled door. Same interface as makeBus(). */
const GB = { file: 'assets/models/bus.glb', S: 7.6, ground: .249, axles: [[-.261, -.192], [.141, -.191], [.268, -.191]], r: .0595, xOut: .2125,
  door: { z0: -.432, z1: -.332, y0: -.206, y1: .092, x: .2205 } };
function rimTexture() {
  const [c, x] = canvas(256, 256); x.translate(128, 128);
  x.fillStyle = '#17181c'; x.beginPath(); x.arc(0, 0, 128, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 3; for (let i = 0; i < 36; i++) { x.rotate(Math.PI / 18); x.beginPath(); x.moveTo(104, 0); x.lineTo(122, 0); x.stroke(); }
  const g = x.createRadialGradient(-20, -20, 10, 0, 0, 80); g.addColorStop(0, '#f4f6f9'); g.addColorStop(1, '#9aa1ad');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, 80, 0, 7); x.fill();
  x.fillStyle = '#2b2f37'; for (let i = 0; i < 10; i++) { x.rotate(Math.PI / 5); x.beginPath(); x.ellipse(52, 0, 16, 9, 0, 0, 7); x.fill(); }
  x.fillStyle = '#5d6470'; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill();
  x.fillStyle = '#d7dbe2'; for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); x.beginPath(); x.arc(17, 0, 3.5, 0, 7); x.fill(); }
  x.fillStyle = '#1d2027'; x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill();
  return toTex(c);
}
export async function makeBusGLB() {
  const gltf = await new GLTFLoader().loadAsync(GB.file), S = GB.S;
  const g = new THREE.Group(); g.name = 'bus';
  const m = new THREE.Group(); m.rotation.y = -Math.PI / 2; m.scale.setScalar(S); m.position.y = GB.ground * S; g.add(m); m.add(gltf.scene);
  gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // wheels: a tyre and a turning rim face over each modelled wheel
  const tyreM = new THREE.MeshStandardMaterial({ color: '#141518', roughness: .9 }), rimM = new THREE.MeshStandardMaterial({ map: rimTexture(), metalness: .55, roughness: .35, polygonOffset: true, polygonOffsetFactor: -2 });
  const tyreG = new THREE.CylinderGeometry(GB.r, GB.r, .07, 40).rotateZ(Math.PI / 2), faceG = new THREE.CircleGeometry(GB.r * .985, 40);
  const wheels = [];
  for (const [z, y] of GB.axles) for (const side of [1, -1]) {
    const w = new THREE.Group(); w.position.set(side * (GB.xOut - .035), y, z); m.add(w);
    const tyre = new THREE.Mesh(tyreG, tyreM); tyre.castShadow = true; w.add(tyre);
    const face = new THREE.Mesh(faceG, rimM); face.rotation.y = side * Math.PI / 2; face.position.x = side * .0355; w.add(face);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.roll = d => { for (const w of wheels) w.rotation.x -= d / (GB.r * S); };
  // the door: a dark doorway and two glass leaves that swing out from their hinges
  const D = GB.door, dh = D.y1 - D.y0, lw = (D.z1 - D.z0) / 2, dy = (D.y0 + D.y1) / 2;
  const way = new THREE.Mesh(new THREE.PlaneGeometry(D.z1 - D.z0, dh), new THREE.MeshStandardMaterial({ color: '#15171c', roughness: .9, polygonOffset: true, polygonOffsetFactor: -3 }));
  way.rotation.y = Math.PI / 2; way.position.set(D.x, dy, (D.z0 + D.z1) / 2); way.visible = false; m.add(way);
  // each leaf: tinted glass in a slim white frame, like the coach's own door
  const leafM = new THREE.MeshPhysicalMaterial({ color: '#5d7286', roughness: .05, metalness: .1, transparent: true, opacity: .55, clearcoat: 1, depthWrite: false }), frameM = new THREE.MeshStandardMaterial({ color: '#eef0f3', roughness: .35 });
  const leaves = [[D.z0, 1], [D.z1, -1]].map(([zh, dir]) => {
    const h = new THREE.Group(); h.position.set(D.x + .002, dy, zh); h.visible = false; m.add(h);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(.002, dh * .94, lw * .9), leafM); pane.position.z = dir * lw / 2; h.add(pane);
    for (const [zz, hh, ww] of [[lw * .02, dh, .004], [lw * .98, dh, .004], [lw / 2, .005, lw], [lw / 2, .005, lw]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(.004, hh, ww), frameM); b.position.z = dir * zz; h.add(b); b.castShadow = true;
    }
    h.children[3].position.y = dh / 2 - .0025; h.children[4].position.y = -dh / 2 + .0025;
    return { h, dir };
  });
  g.userData.door = t => { const open = t > .01; way.visible = open; for (const l of leaves) { l.h.visible = open; l.h.rotation.y = l.dir * t * 1.45; } };
  g.userData.doorPos = new THREE.Vector3(-(D.z0 + D.z1) / 2 * S, 0, (D.x + .01) * S);
  g.userData.halfLen = .5 * S + .15; g.userData.halfWid = .24 * S + .15;
  return g;
}
