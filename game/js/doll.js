import * as THREE from 'three';

/* Paper-doll rig built from the concept art: body, two arms (pivot at the shoulder) and two shoes,
   one rig for the front view and one for the back. The group always turns to face the camera. */
let RIG = null;
const tl = new THREE.TextureLoader();
const load = u => new Promise((res, rej) => tl.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
export const DOLL_H = 1.55;

function part(tex, w, h, mat0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat0.clone()); m.material.map = tex; return m;
}

export async function makeDoll(kind, { tint = '#ffffff' } = {}) {
  RIG ||= await (await fetch('assets/rig/rig.json')).json();
  const root = new THREE.Group(), views = {};
  const base = new THREE.MeshBasicMaterial({ color: tint, transparent: true, alphaTest: .04, depthWrite: false, side: THREE.DoubleSide });
  for (const v of ['front', 'back']) {
    const key = `${kind}_${v}`, R = RIG[key], k = DOLL_H / R.h;
    const W = (px, py) => new THREE.Vector3((px - R.w / 2) * k, (R.h - py) * k, 0);
    const [bodyT, aL, aR, fL, fR] = await Promise.all(['body', 'armL', 'armR', 'footL', 'footR'].map(p => load(`assets/rig/${key}_${p}.webp`)));
    const g = new THREE.Group(); g.visible = v === 'back';
    const bodyPivot = new THREE.Group(); g.add(bodyPivot);
    const body = part(bodyT, R.w * k, R.h * k, base); body.position.set(0, R.h * k / 2, 0); body.renderOrder = 11; bodyPivot.add(body);
    const mk = (tex, info, order, z, parent) => {
      const [x0, y0, x1, y1] = info.box, pv = W(...info.pivot), c = W((x0 + x1) / 2, (y0 + y1) / 2);
      const piv = new THREE.Group(); piv.position.copy(pv).setZ(z); parent.add(piv);
      const mesh = part(tex, (x1 - x0) * k, (y1 - y0) * k, base); mesh.position.copy(c.sub(pv)).setZ(0); mesh.renderOrder = order; piv.add(mesh);
      return piv;
    };
    // arms ride on the body so they bob with it; shoes stay on the ground
    const armL = mk(aL, R.armL, 12, .004, bodyPivot), armR = mk(aR, R.armR, 12, .004, bodyPivot);
    const footL = mk(fL, R.footL, 10, -.004, g), footR = mk(fR, R.footR, 10, -.004, g);
    root.add(g);
    views[v] = { g, bodyPivot, armL, armR, footL, footR };
  }
  return { root, views, face: 'back', phase: 0, t: 0 };
}

/* speed in m/s; face 'front' | 'back'; camPos used to turn the doll towards the camera */
export function animateDoll(d, dt, speed, face, camPos, worldPos) {
  if (face && face !== d.face) { d.views[d.face].g.visible = false; d.face = face; d.views[face].g.visible = true; }
  d.root.rotation.y = Math.atan2(camPos.x - worldPos.x, camPos.z - worldPos.z);
  const v = d.views[d.face], k = Math.min(1, speed / 3);
  d.t += dt; d.phase += dt * (speed > .2 ? 3.2 + speed * 1.6 : 0);
  const s = Math.sin(d.phase), c = Math.cos(d.phase);
  // body: a bounce on every step, a slight lean from foot to foot, breathing at rest
  v.bodyPivot.position.y = Math.abs(s) * .045 * k + Math.sin(d.t * 2.1) * .004 * (1 - k);
  v.bodyPivot.rotation.z = s * .025 * k;
  v.bodyPivot.scale.y = 1 + Math.sin(d.t * 2.1) * .004 * (1 - k);
  // arms swing against the legs, as in a natural walk: while the left foot steps, the right arm comes
  // forward (foreshortened, the hand rising towards the middle) and the left arm swings back, then the reverse
  const idle = Math.sin(d.t * 1.6) * .02 * (1 - k), fwdL = Math.max(0, -s), fwdR = Math.max(0, s);
  v.armL.rotation.z = (fwdL * .1 - fwdR * .09) * k - .02 + idle; v.armR.rotation.z = (fwdL * .09 - fwdR * .1) * k + .02 - idle;
  v.armL.scale.y = 1 - fwdL * .17 * k + fwdR * .03 * k; v.armR.scale.y = 1 - fwdR * .17 * k + fwdL * .03 * k;
  // shoes: the stepping foot lifts and comes towards the viewer
  const lift = .055 * k, fwd = d.face === 'front' ? 1 : -1;
  const l = Math.max(0, s), r = Math.max(0, -s);
  v.footL.position.y = v.footL.userData.y0 ??= v.footL.position.y; v.footR.userData.y0 ??= v.footR.position.y;
  v.footL.position.y = v.footL.userData.y0 + l * lift; v.footR.position.y = v.footR.userData.y0 + r * lift;
  v.footL.scale.setScalar(1 + l * .07 * k * fwd); v.footR.scale.setScalar(1 + r * .07 * k * fwd);
  v.footL.rotation.z = -l * .08 * k; v.footR.rotation.z = r * .08 * k;
  return c;
}
