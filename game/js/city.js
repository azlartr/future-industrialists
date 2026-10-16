import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, pbr, loadImg, BRAND } from './tex.js';
import { makePalmField } from './palm.js';

/* The industrial district: a grid of two-lane streets (one 4.5 m lane each way, right-hand traffic)
   around six blocks. The main avenue (z = 0) carries every gate: the school and the factories open
   onto it from both sides, and in front of each gate the sidewalk steps back into a bay where the
   initiative's own coach pulls in with its door at the gate, so no student ever crosses a road to
   board. Traffic and the coach follow the lanes and turning curves built here. */
export const C = { XS: [-165, -55, 55, 165], ZS: [-95, 0, 95], HW: 4.5, SW: 6, LANE: 2.25, BAY_D: 3.9, BAY_L: 12, BAY_T: 10, CORNER: 5 };
export const WALL = C.HW + C.SW;
export const BOUNDS = { x0: C.XS[0] - WALL - 2, x1: C.XS[3] + WALL + 2, z0: C.ZS[0] - WALL - 2, z1: C.ZS[2] + WALL + 2 };
/* what stands on the avenue; side +1 = south of it (the gate faces north), -1 = north */
export const PLACES = [
  { id: 'f0', kind: 'factory', i: 0, x: -110, side: 1 },
  { id: 'school', kind: 'school', x: 0, side: 1 },
  { id: 'f2', kind: 'factory', i: 2, x: 110, side: 1 },
  { id: 'soon0', kind: 'soon', i: 0, x: -110, side: -1 },
  { id: 'f1', kind: 'factory', i: 1, x: 0, side: -1 },
  { id: 'plaza', kind: 'plaza', x: 110, side: -1 }
];
const BAY_PLACES = ['f0', 'school', 'f2', 'f1'];
/* a compound's local frame: gate at local (0, 26) facing +z; placed so the gate sits in the avenue wall line */
export function placeFrame(p) { return { x: p.x, z: p.side * (WALL + 26), rot: p.side > 0 ? Math.PI : 0 }; }
export function toWorld(p, lx, lz) { return p.side > 0 ? [p.x - lx, p.side * (WALL + 26) - lz] : [p.x + lx, -(WALL + 26) + lz]; }

const V = (x, z) => new THREE.Vector2(x, z);
const clamp = THREE.MathUtils.clamp;

/* ---------------- polylines: points with cumulative lengths ---------------- */
function poly(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, len: cum[cum.length - 1] }; }
export function polyAt(P, s, out, dir) {
  const { pts, cum } = P; s = clamp(s, 0, P.len);
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  out.lerpVectors(pts[lo], pts[hi], t); if (dir) dir.subVectors(pts[hi], pts[lo]).normalize();
  return out;
}
function bez(a, b, c, d, n = 14) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push(V(u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y)); } return out; }

/* ---------------- the street network ---------------- */
function buildNet() {
  const nodes = [], edges = [], lanes = [], conns = [], NX = C.XS.length;
  C.ZS.forEach((z, j) => C.XS.forEach((x, i) => nodes.push({ id: nodes.length, i, j, x, z, arms: [], inL: [], outL: [] })));
  const N = (i, j) => nodes[j * NX + i];
  for (let j = 0; j < C.ZS.length; j++) for (let i = 0; i < NX - 1; i++) edges.push([N(i, j), N(i + 1, j)]);
  for (let i = 0; i < NX; i++) for (let j = 0; j < C.ZS.length - 1; j++) edges.push([N(i, j), N(i, j + 1)]);
  for (const [a, b] of edges) { a.arms.push(b); b.arms.push(a); }
  // the avenue's junctions have traffic lights and zebra crossings; the others are give-way junctions
  for (const n of nodes) { n.deg = n.arms.length; n.signal = n.deg >= 3 && n.z === 0; n.trim = n.signal ? 10.5 : n.deg >= 3 ? 8 : 7; }
  for (const [a, b] of edges) {
    const pair = [];
    for (const [p, q] of [[a, b], [b, a]]) {
      const d = V(q.x - p.x, q.z - p.z).normalize(), r = V(-d.y, d.x);
      const p0 = V(p.x, p.z).addScaledVector(d, p.trim).addScaledVector(r, C.LANE), p1 = V(q.x, q.z).addScaledVector(d, -q.trim).addScaledVector(r, C.LANE);
      const L = { kind: 'lane', id: lanes.length, from: p, to: q, d, r, ...poly([p0, p1]), next: [], vmax: 13 };
      lanes.push(L); p.outL.push(L); q.inL.push(L); pair.push(L);
    }
    pair[0].twin = pair[1]; pair[1].twin = pair[0];
  }
  for (const n of nodes) for (const Li of n.inL) for (const Lo of n.outL) {
    const a = Li.pts[1], b = Lo.pts[0], di = Li.d, dO = Lo.d, cross = di.x * dO.y - di.y * dO.x;
    const turn = Lo === Li.twin ? 'U' : Math.abs(cross) < .1 ? 'S' : cross > 0 ? 'R' : 'L';
    if (turn === 'U' && !n.signal) continue;
    let pts;
    if (turn === 'S') pts = [a.clone(), b.clone()];
    else if (turn === 'U') pts = bez(a, a.clone().addScaledVector(di, 9), b.clone().addScaledVector(di, 9), b, 18);
    else { const r1 = b.clone().sub(a).dot(di) * .5523, r2 = b.clone().sub(a).dot(dO) * .5523; pts = bez(a, a.clone().addScaledVector(di, r1), b.clone().addScaledVector(dO, -r2), b); }
    const c = { kind: 'conn', node: n, from: Li, to: Lo, turn, ...poly(pts), vmax: { S: 12, R: 5.5, L: 7, U: 4 }[turn] };
    conns.push(c); Li.next.push(c);
  }
  return { nodes, edges, lanes, conns, N };
}
export const NET = buildNet();

/* ---------------- bus bays at the gates ---------------- */
export const BAYS = {};
for (const id of BAY_PLACES) {
  const p = PLACES.find(q => q.id === id), s = p.side;
  const lane = NET.lanes.find(L => L.from.z === 0 && L.to.z === 0 && Math.sign(L.d.x) === s && Math.min(L.from.x, L.to.x) < p.x && Math.max(L.from.x, L.to.x) > p.x);
  // the coach stops with its door a few steps short of the gate
  const door = V(p.x - s * 3.2, s * (C.HW + 1.95 + 1.75)), bx = p.x - s * 3.2 - s * 2.9, bz = s * (C.HW + 1.95);
  const at = (bx - lane.pts[0].x) * lane.d.x, c = V(bx, bz), d = lane.d;
  const lp = k => polyAt(lane, k, V());
  const into = poly(bez(lp(at - 26), lp(at - 26).addScaledVector(d, 11), c.clone().addScaledVector(d, -11), c));
  const out = poly(bez(c, c.clone().addScaledVector(d, 11), lp(at + 24).addScaledVector(d, -11), lp(at + 24)));
  BAYS[id] = { id, place: p, side: s, lane, at, x: bx, z: bz, yaw: s > 0 ? 0 : Math.PI, door, into, out, inAt: at - 26, outAt: at + 24 };
}

/* ---------------- routes for the coach: bay to bay through the streets ---------------- */
export function routeBus(fromId, toId) {
  const A = BAYS[fromId], B = BAYS[toId], pieces = [{ P: A.out, s0: 0, s1: A.out.len }];
  if (A.lane === B.lane && B.inAt > A.outAt + 2) pieces.push({ P: A.lane, s0: A.outAt, s1: B.inAt, lane: A.lane });
  else {
    // shortest way over the lanes (U-turns allowed at the lights); a lane costs the distance driven on it
    const dist = new Map([[A.lane, A.lane.len - A.outAt]]), prev = new Map(), Q = [[A.lane.len - A.outAt, A.lane]];
    let best = 1e9, last = null;
    while (Q.length) {
      Q.sort((a, b) => a[0] - b[0]); const [d0, L] = Q.shift();
      if (d0 > (dist.get(L) ?? 1e9) || d0 >= best) continue;
      for (const c of L.next) {
        if (c.to === B.lane) { const t = d0 + c.len + B.inAt; if (t < best) { best = t; last = c; } continue; }
        const nd = d0 + c.len + c.to.len; if (nd < (dist.get(c.to) ?? 1e9)) { dist.set(c.to, nd); prev.set(c.to, c); Q.push([nd, c.to]); }
      }
    }
    const chain = []; for (let c = last; c; c = c.from === A.lane ? null : prev.get(c.from)) chain.unshift(c);
    pieces.push({ P: A.lane, s0: A.outAt, s1: A.lane.len, lane: A.lane });
    for (const c of chain) { pieces.push({ P: c, s0: 0, s1: c.len }); pieces.push({ P: c.to, s0: 0, s1: c.to === B.lane ? B.inAt : c.to.len, lane: c.to }); }
  }
  pieces.push({ P: B.into, s0: 0, s1: B.into.len });
  // one polyline, noting where each signalled stop line falls along it
  const pts = [], stops = [];
  for (const pc of pieces) {
    const add = pc.s0 === 0 && pc.s1 === pc.P.len ? pc.P.pts : [polyAt(pc.P, pc.s0, V()), polyAt(pc.P, pc.s1, V())];
    for (const p of add) if (!pts.length || p.distanceTo(pts[pts.length - 1]) > .05) pts.push(p.clone());
    if (pc.lane && pc.s1 === pc.lane.len && pc.lane.to.signal) stops.push({ at: poly(pts).len, lane: pc.lane, node: pc.lane.to });
  }
  const R = poly(pts); R.stops = stops; return R;
}

/* ---------------- where things can go ---------------- */
const X0 = C.XS[0], X1 = C.XS[C.XS.length - 1], Z0 = C.ZS[0], Z1 = C.ZS[C.ZS.length - 1];
export function onRoad(x, z, m = 0) {
  const h = C.HW - m;
  if (x >= X0 - h && x <= X1 + h) for (const zz of C.ZS) if (Math.abs(z - zz) <= h) return true;
  if (z >= Z0 - h && z <= Z1 + h) for (const xx of C.XS) if (Math.abs(x - xx) <= h) return true;
  for (const xx of C.XS) for (const zz of C.ZS) if (Math.abs(x - xx) <= h + C.CORNER * .55 && Math.abs(z - zz) <= h + C.CORNER * .55) return true;
  for (const b of Object.values(BAYS)) { const dx = Math.abs(x - b.x), depth = C.BAY_D * clamp(1 - (dx - C.BAY_L / 2) / C.BAY_T, 0, 1); if (dx < C.BAY_L / 2 + C.BAY_T && z * b.side >= C.HW - 1 && z * b.side <= C.HW + depth - m) return true; }
  return false;
}
export function groundY(x, z) {
  if (onRoad(x, z)) return .02;
  // sidewalks: the ring round each block, and the outer frame
  for (let i = 0; i < C.XS.length - 1; i++) for (let j = 0; j < C.ZS.length - 1; j++) {
    const a = C.XS[i] + C.HW, b = C.XS[i + 1] - C.HW, c = C.ZS[j] + C.HW, d = C.ZS[j + 1] - C.HW;
    if (x >= a && x <= b && z >= c && z <= d) return (x < a + C.SW || x > b - C.SW || z < c + C.SW || z > d - C.SW) ? .2 : 0;
  }
  if (x >= X0 - WALL && x <= X1 + WALL && z >= Z0 - WALL && z <= Z1 + WALL) return .2;
  return 0;
}

/* ---------------- geometry ---------------- */
function flatGeo(shapePts, y) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(shapePts.map(p => new THREE.Vector2(p.x, -p.y))));
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  return g;
}
const rect = (x0, z0, x1, z1) => [V(x0, z0), V(x1, z0), V(x1, z1), V(x0, z1)];
/* outline of a block's sidewalk, rounded at the corners, stepping back where a bus bay is cut in */
function blockOutline(x0, z0, x1, z1) {
  const R = C.CORNER, out = [], arc = (cx, cz, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; out.push(V(cx + Math.cos(a) * R, cz + Math.sin(a) * R)); } };
  const bays = Object.values(BAYS).filter(b => b.x > x0 && b.x < x1);
  const notch = (zEdge, s, dir) => { // walk the avenue edge in x direction `dir`, cutting each bay in
    const list = bays.filter(b => b.side === s).sort((a, b) => (a.x - b.x) * dir);
    for (const b of list) for (const [dx, dd] of (dir > 0 ? [[-1, 0], [-.6, .5], [-.35, 1], [.35, 1], [.6, .5], [1, 0]] : [[1, 0], [.6, .5], [.35, 1], [-.35, 1], [-.6, .5], [-1, 0]])) {
      const half = C.BAY_L / 2 + C.BAY_T, x = b.x + dx * half, k = Math.abs(dx) <= .35 ? 1 : dd;
      const xx = Math.abs(dx) === .35 ? b.x + Math.sign(dx) * C.BAY_L / 2 : x;
      out.push(V(xx, zEdge + s * C.BAY_D * k));
    }
  };
  // clockwise in (x, z) starting at the north-west corner: north edge (x up), east edge, south edge (x down), west edge
  arc(x0 + R, z0 + R, Math.PI); if (z0 === C.HW) notch(z0, 1, 1);
  arc(x1 - R, z0 + R, -Math.PI / 2); arc(x1 - R, z1 - R, 0); if (z1 === -C.HW) notch(z1, -1, -1);
  arc(x0 + R, z1 - R, Math.PI / 2);
  return out;
}
function streetLabel(text, sub) {
  const [c, x] = canvas(1024, 256); x.fillStyle = '#1c6b3a'; x.beginPath(); x.roundRect(8, 8, 1008, 240, 26); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 8; x.beginPath(); x.roundRect(22, 22, 980, 212, 18); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 92px "Readex Pro"'; x.fillText(text, 512, 128); x.font = '500 50px "Readex Pro"'; x.direction = 'ltr'; x.fillText(sub, 512, 205);
  return toTex(c);
}
async function bayTex() {
  const [c, x] = canvas(1024, 384); x.clearRect(0, 0, 1024, 384);
  x.fillStyle = 'rgba(132,123,184,.55)'; x.fillRect(0, 0, 1024, 384);
  x.strokeStyle = '#f2c230'; x.lineWidth = 16; x.setLineDash([46, 26]); x.strokeRect(10, 10, 1004, 364); x.setLineDash([]);
  try { const lg = await loadImg('assets/img/logo_white.webp'), r = 300 / lg.height; x.globalAlpha = .9; x.drawImage(lg, 60, 42, lg.width * r, 300); x.globalAlpha = 1; } catch {}
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 92px "Readex Pro"'; x.fillText('باص المبادرة', 640, 170); x.font = '600 70px "Readex Pro"'; x.direction = 'ltr'; x.fillText('BUS ONLY', 640, 280);
  return toTex(c);
}

/* streets, sidewalks, markings, lamps and palms; returns colliders for the walking student */
export async function buildStreets(scene, { pave, curb, region }) {
  const colliders = [], anim = [];
  // asphalt: avenue and streets, intersection squares, bays (overlaps share world UVs, so they render identically)
  const asph = pbr('clean_asphalt', [1 / 8, 1 / 8]);
  const asphM = new THREE.MeshStandardMaterial({ ...asph, color: '#9a9a9a', roughness: .92 });
  const parts = [];
  for (const z of C.ZS) parts.push(flatGeo(rect(X0 - C.HW, z - C.HW, X1 + C.HW, z + C.HW), .02));
  for (const x of C.XS) parts.push(flatGeo(rect(x - C.HW, Z0 - C.HW, x + C.HW, Z1 + C.HW), .02));
  for (const x of C.XS) for (const z of C.ZS) parts.push(flatGeo(rect(x - C.HW - C.CORNER, z - C.HW - C.CORNER, x + C.HW + C.CORNER, z + C.HW + C.CORNER), .02));
  for (const b of Object.values(BAYS)) parts.push(flatGeo(rect(b.x - C.BAY_L / 2 - C.BAY_T, b.side > 0 ? C.HW - .1 : -C.HW - C.BAY_D, b.x + C.BAY_L / 2 + C.BAY_T, b.side > 0 ? C.HW + C.BAY_D : -C.HW + .1), .02));
  const road = new THREE.Mesh(mergeGeometries(parts), asphM); road.receiveShadow = true; scene.add(road);
  // sidewalks: one slab per block (a ring with rounded corners and the bays cut in) and a frame round the district
  const swGeo = [];
  for (let i = 0; i < C.XS.length - 1; i++) for (let j = 0; j < C.ZS.length - 1; j++) {
    const x0 = C.XS[i] + C.HW, x1 = C.XS[i + 1] - C.HW, z0 = C.ZS[j] + C.HW, z1 = C.ZS[j + 1] - C.HW;
    const sh = new THREE.Shape(blockOutline(x0, z0, x1, z1).map(p => new THREE.Vector2(p.x, -p.y)));
    sh.holes.push(new THREE.Path(rect(x0 + C.SW, z0 + C.SW, x1 - C.SW, z1 - C.SW).reverse().map(p => new THREE.Vector2(p.x, -p.y))));
    swGeo.push(new THREE.ExtrudeGeometry(sh, { depth: .17, bevelEnabled: true, bevelThickness: .03, bevelSize: .05, bevelSegments: 1, curveSegments: 4 }));
  }
  { const sh = new THREE.Shape(rect(X0 - WALL, Z0 - WALL, X1 + WALL, Z1 + WALL).map(p => new THREE.Vector2(p.x, -p.y)));
    const hole = []; const R = C.CORNER;
    for (const [cx, cz, a0] of [[X0 - C.HW + R, Z0 - C.HW + R, Math.PI], [X1 + C.HW - R, Z0 - C.HW + R, -Math.PI / 2], [X1 + C.HW - R, Z1 + C.HW - R, 0], [X0 - C.HW + R, Z1 + C.HW - R, Math.PI / 2]]) for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; hole.push(new THREE.Vector2(cx + Math.cos(a) * R, -(cz + Math.sin(a) * R))); }
    sh.holes.push(new THREE.Path(hole.reverse()));
    swGeo.push(new THREE.ExtrudeGeometry(sh, { depth: .17, bevelEnabled: true, bevelThickness: .03, bevelSize: .05, bevelSegments: 1, curveSegments: 4 })); }
  for (const g of swGeo) { g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) > .5) uv.setXY(i, p.getX(i) / 2.2, p.getZ(i) / 2.2); }
  for (const g of swGeo) { const sw = new THREE.Mesh(g, [pave, curb]); sw.position.y = .03; sw.receiveShadow = true; scene.add(sw); }
  // markings
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .6 }), yellow = new THREE.MeshStandardMaterial({ color: '#f0bf2a', roughness: .6 });
  const qf = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const dashes = [], stops = [], zebras = [];
  for (const [a, b] of NET.edges) {
    const d = V(b.x - a.x, b.z - a.z), len = d.length(); d.normalize();
    for (let s = a.trim + 2; s < len - b.trim - 2; s += 8) dashes.push([a.x + d.x * (s + 1.5), a.z + d.y * (s + 1.5), Math.atan2(d.y, d.x)]);
  }
  for (const L of NET.lanes) if (L.to.signal) { const p = L.pts[1], r = L.r; stops.push([p.x - r.x * (C.LANE - C.HW / 2) + L.d.x * .3, p.y - r.y * (C.LANE - C.HW / 2) + L.d.y * .3, Math.atan2(L.d.y, L.d.x)]); }
  for (const n of NET.nodes) if (n.signal) for (const arm of n.arms) {
    const d = V(arm.x - n.x, arm.z - n.z).normalize(), r = V(-d.y, d.x);
    for (let k = -C.HW + .5; k <= C.HW - .4; k += 1) zebras.push([n.x + d.x * 7.4 + r.x * k, n.z + d.y * 7.4 + r.y * k, Math.atan2(d.y, d.x)]);
  }
  const inst = (geo, mat, list) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, z, a], i) => { q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -a)); mm.compose(new THREE.Vector3(x, .035, z), q, one); im.setMatrixAt(i, mm); }); im.receiveShadow = true; scene.add(im); };
  inst(new THREE.PlaneGeometry(3, .15), yellow, dashes);
  inst(new THREE.PlaneGeometry(.45, C.HW - .2), paint, stops);
  inst(new THREE.PlaneGeometry(3.6, .5), paint, zebras);
  // the bays: painted in the initiative's violet with its name
  const bt = await bayTex();
  for (const b of Object.values(BAYS)) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(C.BAY_L + 6, C.BAY_D - .2), new THREE.MeshStandardMaterial({ map: bt, transparent: true, roughness: .7, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; if (b.side < 0) m.rotation.z = Math.PI; m.position.set(b.x, .033, b.side * (C.HW + C.BAY_D / 2)); m.renderOrder = 1; scene.add(m);
  }
  // street lights along the avenue (both sides) and one side of the other streets; palms between them
  const poleM = new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: .7, roughness: .35 }), ledM = new THREE.MeshStandardMaterial({ color: '#f7f9ff', emissive: '#eaf2ff', emissiveIntensity: .6 });
  const strip = g2 => { const o = g2.index ? g2.toNonIndexed() : g2; for (const a of Object.keys(o.attributes)) if (!['position', 'normal', 'uv'].includes(a)) o.deleteAttribute(a); return o; };
  const lampG = mergeGeometries([new THREE.CylinderGeometry(.09, .16, 9, 12).translate(0, 4.5, 0), new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 8.4, 0), new THREE.Vector3(0, 9.2, 1.2), new THREE.Vector3(0, 9.1, 2.6)), 12, .055, 6), new RoundedBoxGeometry(.38, .12, .9, 2, .04).translate(0, 9.08, 2.9)].map(strip));
  const ledG = strip(new THREE.PlaneGeometry(.3, .8).rotateX(Math.PI / 2).translate(0, 9.015, 2.9));
  const lampAt = [], palmAt = [];
  const busy = (x, z) => Object.values(BAYS).some(b => Math.abs(x - b.x) < C.BAY_L / 2 + C.BAY_T + 2 && Math.sign(z) === b.side && Math.abs(z) < 14)
    || PLACES.some(p => Math.abs(x - p.x) < 9 && Math.abs(z) < 14) || NET.nodes.some(n => Math.abs(x - n.x) < 14 && Math.abs(z - n.z) < 14);
  for (const z of C.ZS) for (const s of z === 0 ? [-1, 1] : [1, -1]) {
    if (z !== 0 && s !== (z < 0 ? 1 : -1)) { // the outer streets get lights on their inner side and palms outside
      for (let x = X0 + 6; x <= X1 - 6; x += 15) { const pz = z + s * (C.HW + C.SW - 1.6); if (!busy(x, pz)) palmAt.push([x, pz]); }
      continue;
    }
    for (let x = X0 + 18; x <= X1 - 18; x += 28) { const pz = z + s * (C.HW + .7); if (!busy(x, pz)) lampAt.push([x, pz, s > 0 ? Math.PI : 0]); }
    for (let x = X0 + 30; x <= X1 - 30; x += 14) { const pz = z + s * (C.HW + C.SW - 1.8); if (!busy(x, pz) && !lampAt.some(([lx, lz]) => Math.abs(lx - x) < 4 && Math.abs(lz - pz) < 6)) palmAt.push([x, pz]); }
  }
  for (const x of C.XS) for (const s of [-1, 1]) for (let z = Z0 + 18; z <= Z1 - 18; z += 30) { const px = x + s * (C.HW + .7); if (Math.abs(z) < 16 || (x === X0 && s < 0) || (x === X1 && s > 0)) continue; if (s > 0) lampAt.push([px, z, -Math.PI / 2]); else palmAt.push([x + s * (C.HW + C.SW - 1.8), z + 15]); }
  const lamps = new THREE.InstancedMesh(lampG, poleM, lampAt.length), leds = new THREE.InstancedMesh(ledG, ledM, lampAt.length);
  lampAt.forEach(([x, z, a], i) => { q.setFromEuler(new THREE.Euler(0, a, 0)); mm.compose(new THREE.Vector3(x, .2, z), q, one); lamps.setMatrixAt(i, mm); leds.setMatrixAt(i, mm); colliders.push([x, z, .3]); });
  lamps.castShadow = true; lamps.computeBoundingSphere(); leds.computeBoundingSphere(); scene.add(lamps, leds);
  const palms = makePalmField(palmAt, { h: 7, shadows: true }); palms.position.y = .2; scene.add(palms);
  for (const [x, z] of palmAt) colliders.push([x, z, .5]);
  // street name plates at the avenue's junctions
  const plate = streetLabel(`شارع ${region}`, 'Industrial Avenue'), plM = new THREE.MeshStandardMaterial({ map: plate, roughness: .5 });
  for (const n of NET.nodes) if (n.signal && n.x > X0) { const g = new THREE.Group(); g.position.set(n.x - C.HW - 2.2, 0, -C.HW - 2.2); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.6, 10), poleM).translateY(1.8)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), plM); pl.position.y = 3.3; pl.rotation.y = Math.PI / 4; g.add(pl); const back = pl.clone(); back.rotation.y = Math.PI / 4 + Math.PI; back.position.y = 3.3; g.add(back); scene.add(g); colliders.push([g.position.x, g.position.z, .2]); }
  return { colliders, anim };
}
