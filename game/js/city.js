import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, pbr, loadImg } from './tex.js';
import { makePalmField } from './palm.js';

/* The industrial district: a grid of wide streets (two 3.5 m lanes each way, right-hand traffic)
   around six blocks. The kerb-side lane belongs to the initiative's coach; cars keep to the inner lane.
   The main avenue (z = 0) carries every gate: the school and the factories open onto it from both
   sides, and the coach stops in its own lane with its door at the kerb in front of each gate, so no
   student ever crosses a road to board. Traffic and the coach follow the lanes and turns built here. */
export const C = { XS: [-165, -55, 55, 165], ZS: [-95, 0, 95], HW: 7, SW: 6, CAR: 1.85, BUS: 5.15, CORNER: 6 };
export const WALL = C.HW + C.SW;
export const BOUNDS = { x0: C.XS[0] - WALL - 2, x1: C.XS[3] + WALL + 2, z0: C.ZS[0] - WALL - 2, z1: C.ZS[2] + WALL + 2 };
/* what stands on the avenue; side +1 = south of it (the gate faces north), -1 = north */
/* the trip starts at the school at the west end, facing the initiative's plaza across the avenue */
export const PLACES = [
  { id: 'school', kind: 'school', x: -110, side: 1 },
  { id: 'f0', kind: 'factory', i: 0, x: 0, side: 1 },
  { id: 'f2', kind: 'factory', i: 2, x: 110, side: 1 },
  { id: 'plaza', kind: 'plaza', x: -110, side: -1 },
  { id: 'f1', kind: 'factory', i: 1, x: 0, side: -1 },
  { id: 'soon0', kind: 'soon', i: 0, x: 110, side: -1 }
];
const STOP_PLACES = ['f0', 'school', 'f2', 'f1'];
/* a compound's local frame: gate at local (0, 26) facing +z; placed so the gate sits in the avenue wall line */
export function placeFrame(p) { return { x: p.x, z: p.side * (WALL + 26), rot: p.side > 0 ? Math.PI : 0 }; }
export function toWorld(p, lx, lz) { return p.side > 0 ? [p.x - lx, p.side * (WALL + 26) - lz] : [p.x + lx, -(WALL + 26) + lz]; }

const V = (x, z) => new THREE.Vector2(x, z);
const clamp = THREE.MathUtils.clamp;
const X0 = C.XS[0], X1 = C.XS[C.XS.length - 1], Z0 = C.ZS[0], Z1 = C.ZS[C.ZS.length - 1];

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

/* ---------------- the street network: one set of lanes for cars, one for the coach ---------------- */
function buildGrid() {
  const nodes = [], edges = [], NX = C.XS.length;
  C.ZS.forEach((z, j) => C.XS.forEach((x, i) => nodes.push({ id: nodes.length, i, j, x, z, arms: [] })));
  const N = (i, j) => nodes[j * NX + i];
  for (let j = 0; j < C.ZS.length; j++) for (let i = 0; i < NX - 1; i++) edges.push([N(i, j), N(i + 1, j)]);
  for (let i = 0; i < NX; i++) for (let j = 0; j < C.ZS.length - 1; j++) edges.push([N(i, j), N(i, j + 1)]);
  for (const [a, b] of edges) { a.arms.push(b); b.arms.push(a); }
  // the avenue's junctions have traffic lights and zebra crossings; the others are give-way junctions
  for (const n of nodes) { n.deg = n.arms.length; n.signal = n.deg >= 3 && n.z === 0; n.trim = n.signal ? C.HW + 6.5 : n.deg >= 3 ? C.HW + 3 : C.HW + 2; }
  return { nodes, edges };
}
function buildLanes(grid, off, bus) {
  const lanes = [], conns = [], inL = new Map(), outL = new Map();
  for (const n of grid.nodes) { inL.set(n, []); outL.set(n, []); }
  for (const [a, b] of grid.edges) {
    const pair = [];
    for (const [p, q] of [[a, b], [b, a]]) {
      const d = V(q.x - p.x, q.z - p.z).normalize(), r = V(-d.y, d.x);
      const p0 = V(p.x, p.z).addScaledVector(d, p.trim).addScaledVector(r, off), p1 = V(q.x, q.z).addScaledVector(d, -q.trim).addScaledVector(r, off);
      const L = { kind: 'lane', id: lanes.length, bus, from: p, to: q, d, r, appr: `${p.id}>${q.id}`, ...poly([p0, p1]), next: [], vmax: 13 };
      lanes.push(L); outL.get(p).push(L); inL.get(q).push(L); pair.push(L);
    }
    pair[0].twin = pair[1]; pair[1].twin = pair[0];
  }
  for (const n of grid.nodes) for (const Li of inL.get(n)) for (const Lo of outL.get(n)) {
    const a = Li.pts[1], b = Lo.pts[0], di = Li.d, dO = Lo.d, cross = di.x * dO.y - di.y * dO.x;
    const turn = Lo === Li.twin ? 'U' : Math.abs(cross) < .1 ? 'S' : cross > 0 ? 'R' : 'L';
    if (turn === 'U' && !(bus && n.signal)) continue;
    let pts;
    if (turn === 'S') pts = [a.clone(), b.clone()];
    else if (turn === 'U') {
      // a wide U-turn round the middle of the junction, kerb lane to kerb lane
      const c = V(n.x, n.z), pts2 = [a.clone()];
      for (let k = 0; k <= 16; k++) { const th = k / 16 * Math.PI; pts2.push(c.clone().addScaledVector(Li.r, off * Math.cos(th)).addScaledVector(di, off * Math.sin(th) + 1.5)); }
      pts2.push(b.clone()); pts = pts2;
    } else { const r1 = b.clone().sub(a).dot(di) * .5523, r2 = b.clone().sub(a).dot(dO) * .5523; pts = bez(a, a.clone().addScaledVector(di, r1), b.clone().addScaledVector(dO, -r2), b); }
    const c = { kind: 'conn', node: n, from: Li, to: Lo, turn, ...poly(pts), vmax: { S: 12, R: 6, L: 7.5, U: 4.5 }[turn] };
    conns.push(c); Li.next.push(c);
  }
  return { lanes, conns, inL, outL };
}
const GRID = buildGrid();
const CARS = buildLanes(GRID, C.CAR, false), BUSL = buildLanes(GRID, C.BUS, true);
for (const n of GRID.nodes) { n.inL = CARS.inL.get(n); n.outL = CARS.outL.get(n); }
/* NET: the streets and the car lanes (traffic, lights); BUSNET: the coach's kerb lanes */
export const NET = { nodes: GRID.nodes, edges: GRID.edges, lanes: CARS.lanes, conns: CARS.conns };
export const BUSNET = { lanes: BUSL.lanes, conns: BUSL.conns };

/* ---------------- the coach's stops: in its own lane, door at the kerb before each gate ---------------- */
export const BAYS = {};
for (const id of STOP_PLACES) {
  const p = PLACES.find(q => q.id === id), s = p.side;
  const lane = BUSNET.lanes.find(L => L.from.z === 0 && L.to.z === 0 && Math.sign(L.d.x) === s && Math.min(L.from.x, L.to.x) < p.x && Math.max(L.from.x, L.to.x) > p.x);
  const bx = p.x - s * 6.1, bz = s * C.BUS, at = (bx - lane.pts[0].x) * lane.d.x;
  BAYS[id] = { id, place: p, side: s, lane, at, x: bx, z: bz, yaw: s > 0 ? 0 : Math.PI, door: V(p.x - s * 3.2, s * (C.BUS + 1.95)) };
}

/* ---------------- routes for the coach: stop to stop through the streets ---------------- */
const U_COST = 70; // a U-turn is allowed at the lights, but going round the block is preferred when it is close
export function routeBus(fromId, toId) {
  const A = BAYS[fromId], B = BAYS[toId], pieces = [];
  if (A.lane === B.lane && B.at > A.at + 2) pieces.push({ P: A.lane, s0: A.at, s1: B.at, lane: A.lane });
  else {
    const dist = new Map([[A.lane, A.lane.len - A.at]]), prev = new Map(), Q = [[A.lane.len - A.at, A.lane]];
    let best = 1e9, last = null;
    while (Q.length) {
      Q.sort((a, b) => a[0] - b[0]); const [d0, L] = Q.shift();
      if (d0 > (dist.get(L) ?? 1e9) || d0 >= best) continue;
      for (const c of L.next) {
        const cost = c.len + (c.turn === 'U' ? U_COST : 0);
        if (c.to === B.lane) { const t = d0 + cost + B.at; if (t < best) { best = t; last = c; } continue; }
        const nd = d0 + cost + c.to.len; if (nd < (dist.get(c.to) ?? 1e9)) { dist.set(c.to, nd); prev.set(c.to, c); Q.push([nd, c.to]); }
      }
    }
    const chain = []; for (let c = last; c; c = c.from === A.lane ? null : prev.get(c.from)) chain.unshift(c);
    pieces.push({ P: A.lane, s0: A.at, s1: A.lane.len, lane: A.lane });
    for (const c of chain) { pieces.push({ P: c, s0: 0, s1: c.len }); pieces.push({ P: c.to, s0: 0, s1: c.to === B.lane ? B.at : c.to.len, lane: c.to }); }
  }
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
export function onRoad(x, z, m = 0) {
  const h = C.HW - m;
  if (x >= X0 - h && x <= X1 + h) for (const zz of C.ZS) if (Math.abs(z - zz) <= h) return true;
  if (z >= Z0 - h && z <= Z1 + h) for (const xx of C.XS) if (Math.abs(x - xx) <= h) return true;
  for (const xx of C.XS) for (const zz of C.ZS) { const dx = Math.abs(x - xx) - h, dz = Math.abs(z - zz) - h; if (dx < C.CORNER && dz < C.CORNER && (dx < 0 || dz < 0 || Math.hypot(C.CORNER - dx, C.CORNER - dz) > C.CORNER)) return true; }
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
/* outline of a block's sidewalk, rounded at the corners */
function blockOutline(x0, z0, x1, z1) {
  const R = C.CORNER, out = [], arc = (cx, cz, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; out.push(V(cx + Math.cos(a) * R, cz + Math.sin(a) * R)); } };
  arc(x0 + R, z0 + R, Math.PI); arc(x1 - R, z0 + R, -Math.PI / 2); arc(x1 - R, z1 - R, 0); arc(x0 + R, z1 - R, Math.PI / 2);
  return out;
}
function streetLabel(text, sub) {
  const [c, x] = canvas(1024, 256); x.fillStyle = '#1c6b3a'; x.beginPath(); x.roundRect(8, 8, 1008, 240, 26); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 8; x.beginPath(); x.roundRect(22, 22, 980, 212, 18); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 92px "Readex Pro"'; x.fillText(text, 512, 128); x.font = '500 50px "Readex Pro"'; x.direction = 'ltr'; x.fillText(sub, 512, 205);
  return toTex(c);
}
async function stopTex() {
  const [c, x] = canvas(1024, 320); x.clearRect(0, 0, 1024, 320);
  x.fillStyle = 'rgba(132,123,184,.6)'; x.fillRect(0, 0, 1024, 320);
  x.strokeStyle = '#f2c230'; x.lineWidth = 14; x.setLineDash([46, 26]); x.strokeRect(10, 10, 1004, 300); x.setLineDash([]);
  try { const lg = await loadImg('assets/img/logo_white.webp'), r = 250 / lg.height; x.globalAlpha = .9; x.drawImage(lg, 60, 35, lg.width * r, 250); x.globalAlpha = 1; } catch {}
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 86px "Readex Pro"'; x.fillText('موقف باص المبادرة', 620, 150); x.font = '600 60px "Readex Pro"'; x.direction = 'ltr'; x.fillText('BUS STOP', 620, 245);
  return toTex(c);
}
function busWordTex() {
  const [c, x] = canvas(512, 256); x.clearRect(0, 0, 512, 256); x.fillStyle = 'rgba(255,255,255,.92)'; x.textAlign = 'center'; x.font = '700 120px "Readex Pro"'; x.direction = 'rtl'; x.fillText('باص', 256, 120); x.direction = 'ltr'; x.font = '700 86px "Readex Pro"'; x.fillText('BUS', 256, 230);
  return toTex(c);
}

/* streets, sidewalks, markings, lamps and palms; returns colliders for the walking student */
export async function buildStreets(scene, { pave, curb, region }) {
  const colliders = [], anim = [];
  // asphalt: avenue and streets, and the junction squares (overlaps share world UVs, so they render identically)
  const asph = pbr('clean_asphalt', [1 / 8, 1 / 8]);
  const asphM = new THREE.MeshStandardMaterial({ ...asph, color: '#9a9a9a', roughness: .92 });
  const parts = [];
  for (const z of C.ZS) parts.push(flatGeo(rect(X0 - C.HW, z - C.HW, X1 + C.HW, z + C.HW), .02));
  for (const x of C.XS) parts.push(flatGeo(rect(x - C.HW, Z0 - C.HW, x + C.HW, Z1 + C.HW), .02));
  for (const x of C.XS) for (const z of C.ZS) parts.push(flatGeo(rect(x - C.HW - C.CORNER, z - C.HW - C.CORNER, x + C.HW + C.CORNER, z + C.HW + C.CORNER), .02));
  const road = new THREE.Mesh(mergeGeometries(parts), asphM); road.receiveShadow = true; scene.add(road);
  // the coach's lane along the avenue: a red-brown band, as bus lanes are painted
  const busM = new THREE.MeshStandardMaterial({ color: '#8a4038', roughness: .9, transparent: true, opacity: .55, depthWrite: false });
  const busParts = [];
  for (let i = 0; i < C.XS.length - 1; i++) { for (const s of [-1, 1]) busParts.push(flatGeo(rect(C.XS[i] + C.HW + 6.5, s > 0 ? C.HW / 2 + .1 : -C.HW + .15, C.XS[i + 1] - C.HW - 6.5, s > 0 ? C.HW - .15 : -C.HW / 2 - .1), .028)); }
  const busLane = new THREE.Mesh(mergeGeometries(busParts), busM); busLane.receiveShadow = true; busLane.renderOrder = 1; scene.add(busLane);
  // sidewalks: one slab per block (a ring with rounded corners) and a frame round the district
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
  // markings: double yellow centre line, dashed lane lines, stop lines, zebras
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .6 }), yellow = new THREE.MeshStandardMaterial({ color: '#f0bf2a', roughness: .6 });
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const centre = [], dashes = [], stops = [], zebras = [];
  for (const [a, b] of GRID.edges) {
    const d = V(b.x - a.x, b.z - a.z), len = d.length(); d.normalize(); const r = V(-d.y, d.x), ang = Math.atan2(d.y, d.x), s0 = a.trim, s1 = len - b.trim, mid = (s0 + s1) / 2;
    for (const k of [-.17, .17]) centre.push([a.x + d.x * mid + r.x * k, a.z + d.y * mid + r.y * k, ang, s1 - s0]);
    for (let s = s0 + 1; s < s1 - 3; s += 9) for (const k of [-C.HW / 2, C.HW / 2]) dashes.push([a.x + d.x * (s + 1.5) + r.x * k, a.z + d.y * (s + 1.5) + r.y * k, ang, 3]);
  }
  for (const L of NET.lanes) if (L.to.signal) { const p = L.pts[1], k = C.HW / 2 - C.CAR; stops.push([p.x + L.r.x * k + L.d.x * .3, p.y + L.r.y * k + L.d.y * .3, Math.atan2(L.d.y, L.d.x)]); }
  for (const n of GRID.nodes) if (n.signal) for (const arm of n.arms) {
    const d = V(arm.x - n.x, arm.z - n.z).normalize(), r = V(-d.y, d.x);
    for (let k = -C.HW + .5; k <= C.HW - .4; k += 1) zebras.push([n.x + d.x * (C.HW + 3.2) + r.x * k, n.z + d.y * (C.HW + 3.2) + r.y * k, Math.atan2(d.y, d.x)]);
  }
  const inst = (geo, mat, list, sx = false) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, z, a, l], i) => { q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -a)); mm.compose(new THREE.Vector3(x, .036, z), q, sx ? new THREE.Vector3(l, 1, 1) : one); im.setMatrixAt(i, mm); }); im.receiveShadow = true; scene.add(im); };
  inst(new THREE.PlaneGeometry(1, .12), yellow, centre, true);
  inst(new THREE.PlaneGeometry(1, .14), paint, dashes, true);
  inst(new THREE.PlaneGeometry(.45, C.HW - .3), paint, stops);
  inst(new THREE.PlaneGeometry(3.6, .5), paint, zebras);
  // the word BUS in the coach's lane, and a painted box at each of its stops
  const bw = new THREE.MeshStandardMaterial({ map: busWordTex(), transparent: true, depthWrite: false, roughness: .7 });
  for (let i = 0; i < C.XS.length - 1; i++) for (const s of [-1, 1]) for (const f of [.3, .7]) {
    const x = C.XS[i] + (C.XS[i + 1] - C.XS[i]) * f; if (Object.values(BAYS).some(b => Math.abs(b.x - x) < 14 && b.side === s)) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), bw); m.rotation.x = -Math.PI / 2; m.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.set(x, .034, s * C.BUS); m.renderOrder = 2; scene.add(m);
  }
  const st = await stopTex();
  for (const b of Object.values(BAYS)) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshStandardMaterial({ map: st, transparent: true, roughness: .7, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; if (b.side < 0) m.rotation.z = Math.PI; m.position.set(b.x, .035, b.z); m.renderOrder = 2; scene.add(m);
  }
  // street lights along the avenue (both sides) and one side of the other streets; palms between them
  const poleM = new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: .7, roughness: .35 }), ledM = new THREE.MeshStandardMaterial({ color: '#f7f9ff', emissive: '#eaf2ff', emissiveIntensity: .6 });
  const strip = g2 => { const o = g2.index ? g2.toNonIndexed() : g2; for (const a of Object.keys(o.attributes)) if (!['position', 'normal', 'uv'].includes(a)) o.deleteAttribute(a); return o; };
  const lampG = mergeGeometries([new THREE.CylinderGeometry(.09, .16, 9.5, 12).translate(0, 4.75, 0), new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 8.9, 0), new THREE.Vector3(0, 9.8, 1.4), new THREE.Vector3(0, 9.7, 3.2)), 12, .055, 6), new RoundedBoxGeometry(.38, .12, .9, 2, .04).translate(0, 9.68, 3.5)].map(strip));
  const ledG = strip(new THREE.PlaneGeometry(.3, .8).rotateX(Math.PI / 2).translate(0, 9.615, 3.5));
  const lampAt = [], palmAt = [];
  // nothing on the carriageway, at a junction, at a gate or where the coach opens its door
  const busy = (x, z) => onRoad(x, z, -1.2) || GRID.nodes.some(n => Math.abs(x - n.x) < C.HW + 9 && Math.abs(z - n.z) < C.HW + 9)
    || PLACES.some(p => Math.abs(x - p.x) < 10 && Math.abs(z) < WALL + 2) || Object.values(BAYS).some(b => Math.abs(x - b.x) < 10 && Math.sign(z) === b.side && Math.abs(z) < WALL + 1);
  for (const z of C.ZS) for (const s of [-1, 1]) {
    const inner = z === 0 || s === (z < 0 ? 1 : -1);
    if (inner) for (let x = X0 + 18; x <= X1 - 18; x += 28) { const pz = z + s * (C.HW + .7); if (!busy(x, pz)) lampAt.push([x, pz, s > 0 ? Math.PI : 0]); }
    for (let x = X0 + 10; x <= X1 - 10; x += inner ? 14 : 15) { const pz = z + s * (C.HW + C.SW - 1.8); if (!busy(x, pz) && !lampAt.some(([lx, lz]) => Math.abs(lx - x) < 4 && Math.abs(lz - pz) < 6)) palmAt.push([x, pz]); }
  }
  for (const x of C.XS) for (const s of [-1, 1]) {
    if ((x === X0 && s < 0) || (x === X1 && s > 0)) continue;
    for (let z = Z0 + 18; z <= Z1 - 18; z += 30) { const px = x + s * (C.HW + .7); if (s > 0 && !busy(px, z)) lampAt.push([px, z, -Math.PI / 2]); const pp = [x + s * (C.HW + C.SW - 1.8), z + 15]; if (s < 0 && !busy(...pp)) palmAt.push(pp); }
  }
  const lamps = new THREE.InstancedMesh(lampG, poleM, lampAt.length), leds = new THREE.InstancedMesh(ledG, ledM, lampAt.length);
  lampAt.forEach(([x, z, a], i) => { q.setFromEuler(new THREE.Euler(0, a, 0)); mm.compose(new THREE.Vector3(x, .2, z), q, one); lamps.setMatrixAt(i, mm); leds.setMatrixAt(i, mm); colliders.push([x, z, .3]); });
  lamps.castShadow = true; lamps.computeBoundingSphere(); leds.computeBoundingSphere(); scene.add(lamps, leds);
  const palms = makePalmField(palmAt, { h: 7, shadows: true }); palms.position.y = .2; scene.add(palms);
  for (const [x, z] of palmAt) colliders.push([x, z, .5]);
  // street name plates at the avenue's junctions
  const plate = streetLabel(`شارع ${region}`, 'Industrial Avenue'), plM = new THREE.MeshStandardMaterial({ map: plate, roughness: .5 });
  for (const n of GRID.nodes) if (n.signal && n.x > X0) { const g = new THREE.Group(); g.position.set(n.x - C.HW - 2.4, 0, -C.HW - 2.4); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.6, 10), poleM).translateY(1.8)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), plM); pl.position.y = 3.3; pl.rotation.y = Math.PI / 4; g.add(pl); const back = pl.clone(); back.rotation.y = Math.PI / 4 + Math.PI; back.position.y = 3.3; g.add(back); scene.add(g); colliders.push([g.position.x, g.position.z, .2]); }
  return { colliders, anim };
}
