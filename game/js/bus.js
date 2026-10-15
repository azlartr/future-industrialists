import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, loadImg, BRAND, network, grad } from './tex.js';

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
async function livery(side) {
  const w = 4096, h = 640, [c, x] = canvas(w, h); x.clearRect(0, 0, w, h);
  // long sweeping swooshes: navy and blue from the rear, a violet ribbon above them
  const sweep = (y0, y1, thick, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(w * .3, y0 - 40, w * .55, y1 + 20, w, y1); x.lineTo(w, y1 + thick); x.bezierCurveTo(w * .55, y1 + 20 + thick * 1.3, w * .3, y0 + thick * .6, 0, y0 + thick * 1.6); x.closePath(); x.fill(); };
  sweep(170, 470, 120, BRAND.navy);
  sweep(250, 380, 95, BRAND.blue);
  sweep(110, 300, 46, BRAND.violet);
  sweep(80, 250, 14, '#b9b2e3');
  x.save(); x.globalAlpha = .35; x.beginPath(); x.rect(0, 150, w * .5, 490); x.clip(); network(x, w * .5, h, { n: 40, link: 220, color: 'rgba(255,255,255,.5)', dot: 'rgba(255,255,255,.8)', lw: 2.2, seed: 5 }); x.restore();
  const logo = await loadImg('assets/img/logo-mark.webp'), lh = 230, lw = lh * logo.width / logo.height;
  const right = w * .9; x.drawImage(logo, right - lw, 40, lw, lh);
  x.fillStyle = BRAND.navy; x.textAlign = 'right'; x.direction = 'rtl'; x.font = '700 150px "Readex Pro"'; x.fillText('صناعيو المستقبل', right - lw - 40, 190);
  x.fillStyle = BRAND.violet; x.font = '500 54px "Readex Pro"'; x.direction = 'ltr'; x.fillText('FUTURE INDUSTRIALISTS · 2026', right - lw - 44, 270);
  const t = toTex(c); if (side < 0) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; } return t;
}
function destSign() {
  const [c, x] = canvas(1024, 128); x.fillStyle = '#05060a'; x.fillRect(0, 0, 1024, 128);
  x.fillStyle = '#ffb547'; x.shadowColor = '#ffb547'; x.shadowBlur = 14; x.font = '600 70px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText('رحلة صناعيو المستقبل', 512, 90);
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
  for (const s of [1, -1]) { const w = m(win, glass, false); w.position.z = s * zs; if (s < 0) { w.scale.z = -1; w.rotation.y = 0; w.material = glass.clone(); w.material.side = THREE.BackSide; } g.add(w); }
  const door = m(new RoundedBoxGeometry(1.0, 2.6, .03, 3, .05), glass, false); door.position.set(4.82, 1.78, zs + .004); g.add(door);
  const seam = m(new THREE.BoxGeometry(.02, 2.55, .01), black, false); seam.position.set(4.82, 1.78, zs + .02); g.add(seam);
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
    for (const s of [-1, 1]) { const wh = wheel(s, tyreM, rimM, darkM); wh.position.set(ax, .52, s * (Wd / 2 - .2)); g.add(wh); }
  }
  // roof pod + lower skirt trim
  const pod = m(new RoundedBoxGeometry(3.4, .22, 1.7, 6, .1), paint); pod.position.set(-1.6, 3.66, 0); g.add(pod);
  for (const s of [-1, 1]) { const trim = m(new THREE.BoxGeometry(11.5, .06, .02), chrome, false); trim.position.set(-.1, 1.92, s * (zs + .01)); g.add(trim); }
  return g;
}
