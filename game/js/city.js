import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, pbr, loadImg } from './tex.js';
import { makePalmField } from './palm.js';
import { tx } from './i18n.js';

/* Each region's district has its own street plan, drawn from the real city: Riyadh's spokes and ring
   road round a central roundabout, Jeddah's winding corniche, Buraydah's long farm roads, the Eastern
   Province's coast road and diagonal highway. Every road is two lanes each way (right-hand traffic);
   the kerb lane belongs to the initiative's coach, cars keep to the inner lane. Roads bend in smooth
   arcs, junctions have rounded kerbs, roundabouts carry a landmark on their island. The school and the
   factories stand far apart, each gate on a straight stretch with the coach's stop in front of it, so
   no student ever crosses a road to board. Traffic and the coach follow the lanes and turns built here. */
export const C = { HW: 7, SW: 6, CAR: 1.85, BUS: 5.15, CORNER: 6 };
export const WALL = C.HW + C.SW;

const V = (x, z) => new THREE.Vector2(x, z);
const clamp = THREE.MathUtils.clamp;

/* ---------------- the plans ----------------
   nodes: [x, z, type] with type 'round' (a roundabout), 'signal' (traffic lights) or 'give' (give way)
   roads: [from, to, vias] — each via [x, z, r] is a corner rounded with radius r
   places: on a straight stretch of a road: [road, s (metres from its start), side (+1 right, -1 left)]
   gears: golden gears on the sidewalks, boards: billboards — both [road, s, side] */
export const LAYOUTS = {
  riyadh: {
    ideas: [[1, 95, -1], [0, 225, 1], [3, 60, 1]],
    // a roundabout at the heart with the Kingdom Tower on its island, four spokes, and an oval ring road
    nodes: { R: [0, 0, 'round'], E: [270, 0, 'signal'], W: [-270, 0, 'signal'], N: [0, -200, 'signal'], S: [0, 200, 'signal'] },
    roads: [['R', 'E'], ['R', 'W'], ['R', 'N'], ['R', 'S'],
      ['E', 'N', [[270, -53.6, 400], [197.7, -146.4, 400], [72.3, -200, 400]]], ['N', 'W', [[-72.3, -200, 400], [-197.7, -146.4, 400], [-270, -53.6, 400]]],
      ['W', 'S', [[-270, 53.6, 400], [-197.7, 146.4, 400], [-72.3, 200, 400]]], ['S', 'E', [[72.3, 200, 400], [197.7, 146.4, 400], [270, 53.6, 400]]]],
    // one stop on each spoke: school west, then east, north and south
    places: { school: [1, 140, -1], plaza: [1, 140, 1], f0: [0, 150, 1], soon0: [0, 150, -1], f1: [2, 125, 1], f2: [3, 130, 1], soon1: [3, 130, -1] },
    busways: [0, 1, 2, 3], landmark: 'kingdom',
    gears: [[1, 60, 1], [0, 90, -1], [2, 60, -1], [3, 70, -1], [5, 160, -1], [6, 160, 1]],
    boards: [[4, 150, 1], [6, 120, -1], [7, 200, 1]]
  },
  makkah: {
    ideas: [[2, [0, -10], 1], [0, [-262, 40], 1], [1, [200, 160], -1]],
    // Jeddah: an inland avenue with a roundabout carrying the city's famous giant bicycle, sweeping down
    // both sides to the corniche that winds along the Red Sea; a street runs straight between them
    nodes: { R: [0, -110, 'round'], MC: [0, 182, 'signal'] },
    roads: [['R', 'MC', [[-262, -110, 90], [-262, 165, 110], [-110, 165, 70], [-55, 188, 60]]],
      ['R', 'MC', [[262, -110, 90], [262, 165, 110], [110, 165, 70], [55, 188, 60]]],
      ['R', 'MC']],
    places: { school: [0, [-140, -110], -1], plaza: [0, [-140, -110], 1], f0: [1, [150, -110], 1], soon0: [1, [150, -110], -1], f1: [1, [262, 5], 1], f2: [2, [0, 75], -1], soon1: [0, [-262, 5], -1] },
    busways: [0, 1, 2], landmark: 'bicycle', sea: 236,
    gears: [[0, [-60, -110], 1], [0, [-262, -20], 1], [0, [-200, 155], -1], [1, [262, 110], -1], [1, [60, 185], 1], [2, [0, 140], 1]],
    boards: [[0, [-200, -110], 1], [1, [262, -20], -1], [2, [0, 10], 1]]
  },
  qassim: {
    ideas: [[0, [-90, 0], 1], [2, [80, 0], 1], [3, [0, -60], -1]],
    // Buraydah: straight farm roads crossing at a roundabout with a giant dallah (coffee pot), and long
    // farm loops sweeping round the palm groves to the south and the north
    nodes: { R: [0, 0, 'round'], S: [0, 200, 'signal'], E: [262, 0, 'signal'] },
    roads: [['R', 'S', [[-262, 0, 120], [-262, 80, 90], [-190, 200, 120]]], ['R', 'S'], ['R', 'E'],
      ['R', 'E', [[0, -205, 70], [200, -205, 90], [262, -120, 90]]],
      ['S', 'E', [[190, 200, 120], [262, 80, 90]]]],
    places: { school: [0, [-140, 0], -1], plaza: [0, [-140, 0], 1], f0: [3, [0, -100], 1], soon0: [3, [0, -100], -1], f1: [3, [120, -205], 1], f2: [2, [150, 0], -1], soon1: [1, [0, 120], 1] },
    busways: [0, 2, 3], landmark: 'dallah', farms: true,
    gears: [[0, [-60, 0], 1], [2, [80, 0], 1], [1, [0, 60], -1], [3, [60, -205], -1], [0, [-262, 60], -1], [4, [262, 60], 1]],
    boards: [[0, [-210, 0], -1], [1, [0, 150], -1], [3, [262, -60], -1]]
  },
  eastern: {
    ideas: [[2, [0, 100], 1], [0, [-200, 165], -1], [1, [262, 0], -1]],
    // Dammam and Al Khobar: the coast road runs along the Gulf with the pearl monument on its roundabout,
    // sweeps inland on both sides to the industrial city, and a winding highway climbs straight up the middle
    nodes: { R: [0, 165, 'round'], NR: [40, -150, 'signal'] },
    roads: [['R', 'NR', [[-262, 165, 105], [-262, -60, 100], [-170, -150, 90]]],
      ['R', 'NR', [[262, 165, 95], [262, -80, 100], [170, -150, 80]]],
      ['R', 'NR', [[0, 60, 90], [40, -30, 90]]]],
    places: { school: [0, [-90, -150], 1], plaza: [0, [-90, -150], -1], f0: [2, [40, -95], -1], f1: [1, [140, 165], 1], soon0: [0, [-130, 165], -1], f2: [1, [262, 40], 1], soon1: [0, [-262, 20], -1] },
    busways: [0, 1, 2], landmark: 'pearl', sea: 252,
    gears: [[0, [-60, 165], 1], [1, [80, 165], -1], [2, [10, 20], 1], [0, [-262, -60], 1], [0, [-180, -150], -1], [1, [262, -10], -1]],
    boards: [[0, [-200, 165], -1], [0, [-262, 80], 1], [1, [262, 120], 1]]
  }
};

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
/* the part of a polyline between two arc lengths */
function cut(P, s0, s1) {
  const out = [polyAt(P, s0, V())];
  for (let i = 1; i < P.pts.length - 1; i++) if (P.cum[i] > s0 + .05 && P.cum[i] < s1 - .05) out.push(P.pts[i].clone());
  out.push(polyAt(P, s1, V())); return out;
}
/* a polyline shifted sideways (+ is to the right of the direction of travel) */
function offsetPts(pts, off) {
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = b.clone().sub(a).normalize(); return V(p.x - d.y * off, p.y + d.x * off); });
}
/* a centre line from node to node through rounded corners */
function centerline(a, b, vias = []) {
  const P = [V(a.x, a.z), ...vias.map(v => V(v[0], v[1])), V(b.x, b.z)], R = [0, ...vias.map(v => v[2] ?? 60), 0], out = [P[0].clone()];
  for (let i = 1; i < P.length - 1; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], d1 = p1.clone().sub(p0).normalize(), d2 = p2.clone().sub(p1).normalize();
    const ang = Math.acos(clamp(d1.dot(d2), -1, 1)); if (ang < 1e-3) { out.push(p1.clone()); continue; }
    // a corner may use most of a leg that ends at a node (minus room for the junction), half of one shared with another corner
    const l0 = p1.distanceTo(p0), l2 = p2.distanceTo(p1), tt = Math.min(R[i] * Math.tan(ang / 2), i === 1 ? Math.max(l0 * .45, l0 - 40) : l0 * .48, i === P.length - 2 ? Math.max(l2 * .45, l2 - 40) : l2 * .48), r = tt / Math.tan(ang / 2);
    const s = p1.clone().addScaledVector(d1, -tt), e = p1.clone().addScaledVector(d2, tt), cr = Math.sign(d1.x * d2.y - d1.y * d2.x);
    const c = s.clone().addScaledVector(V(-d1.y, d1.x), cr * r), a0 = Math.atan2(s.y - c.y, s.x - c.x);
    let da = Math.atan2(e.y - c.y, e.x - c.x) - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const n = Math.max(3, Math.ceil(Math.abs(da) * r / 2.5));
    for (let k = 0; k <= n; k++) { const t = a0 + da * k / n; out.push(V(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r)); }
  }
  out.push(P[P.length - 1].clone());
  return poly(out);
}
const RING = { ri: 12, ro: 22 };

/* ---------------- the city in use (set per region) ---------------- */
export let NET = null, BUSNET = null, BAYS = {}, PLACES = [], BOUNDS = null, CITY = null;
let ROADS = [], NODES = [], HASH = null, JPOLY = [], PATCH = [], RINGS = [];
const STOP_PLACES = ['school', 'f0', 'f1', 'f2'];
const U_COST = 70;

export function setCity(key) {
  const L0 = LAYOUTS[key];
  NODES = Object.entries(L0.nodes).map(([name, [x, z, type]], i) => ({ id: i, name, x, z, type, round: type === 'round', signal: type === 'signal', bend: type === 'bend', arms: [], ...(type === 'round' ? RING : {}) }));
  const byName = Object.fromEntries(NODES.map(n => [n.name, n]));
  ROADS = L0.roads.map(([a, b, vias], i) => { const A = byName[a], B = byName[b]; return { id: i, a: A, b: B, center: centerline(A, B, vias), busway: (L0.busways || []).includes(i) }; });
  // spots along a road may be given as a point near it instead of an arc length
  const at = list => (list || []).map(([ri, s, sd]) => [ri, Array.isArray(s) ? nearestS(ROADS[ri].center, V(s[0], s[1])) : s, sd]);
  const L = { ...L0, places: Object.fromEntries(Object.entries(L0.places).map(([k, v]) => [k, at([v])[0]])), gears: at(L0.gears), boards: at(L0.boards), ideas: at(L0.ideas) }; CITY = { key, ...L };
  for (const r of ROADS) {
    const p = r.center.pts, n = p.length;
    r.a.arms.push({ road: r, end: 'a', u: p[1].clone().sub(p[0]).normalize() });
    r.b.arms.push({ road: r, end: 'b', u: p[n - 2].clone().sub(p[n - 1]).normalize() });
  }
  // how far back from each node the lanes stop: roundabouts by their ring, junctions by their sharpest corner
  for (const nd of NODES) {
    nd.deg = nd.arms.length; nd.arms.sort((p, q) => Math.atan2(p.u.y, p.u.x) - Math.atan2(q.u.y, q.u.x));
    if (nd.round) { nd.trim = nd.ro + 6; nd.geo = nd.ro - 1.5; nd.walk = Math.sqrt((nd.ro + C.SW) ** 2 - WALL ** 2) + .3; continue; }
    let tmin = Math.PI * 2; nd.arms.forEach((a, i) => { const b = nd.arms[(i + 1) % nd.arms.length]; let t = Math.atan2(b.u.y, b.u.x) - Math.atan2(a.u.y, a.u.x); if (t <= 0) t += Math.PI * 2; if (nd.deg > 1) tmin = Math.min(tmin, t); });
    const base = nd.signal ? C.HW + 6.5 : nd.bend ? C.HW : C.HW + 3;
    nd.trim = tmin < Math.PI - .05 ? Math.max(base, WALL / Math.tan(tmin / 2) + .5) : base; nd.geo = nd.trim; nd.walk = nd.trim;
  }
  for (const r of ROADS) { r.sA = r.a.trim; r.sB = r.center.len - r.b.trim; r.gA = r.a.geo; r.gB = r.center.len - r.b.geo; r.wA = r.a.walk; r.wB = r.center.len - r.b.walk; }
  // lanes: one each way for cars (inner) and one each way for the coach (kerb)
  const CARS = buildLanes(C.CAR, false), BUSL = buildLanes(C.BUS, true);
  for (const nd of NODES) { nd.inL = CARS.inL.get(nd); nd.outL = CARS.outL.get(nd); }
  NET = { nodes: NODES, edges: ROADS.map(r => [r.a, r.b]), roads: ROADS, lanes: CARS.lanes, conns: CARS.conns };
  BUSNET = { lanes: BUSL.lanes, conns: BUSL.conns };
  // places: the gate on the wall line at the road point, the compound behind it
  PLACES = Object.entries(L.places).map(([id, [ri, s, side]]) => {
    const road = ROADS[ri], q = V(), d = V(); polyAt(road.center, s, q, d);
    const r = V(-d.y, d.x), dt = d.clone().multiplyScalar(side), rt = r.clone().multiplyScalar(side);
    const kind = id === 'school' ? 'school' : id === 'plaza' ? 'plaza' : id.startsWith('soon') ? 'soon' : 'factory';
    return { id, kind, i: kind === 'factory' ? +id[1] : kind === 'soon' ? +id[4] : 0, road, s, side, q, d, r, dt, rt, x: q.x, z: q.y, rot: Math.atan2(-rt.x, -rt.y) };
  });
  // the coach's stops: in its kerb lane, door at the kerb just before each gate
  BAYS = {};
  for (const id of STOP_PLACES) {
    const p = PLACES.find(q => q.id === id); if (!p) continue;
    const lane = BUSNET.lanes.find(Ln => Ln.road === p.road && Ln.dir === p.side);
    const c = p.q.clone().addScaledVector(p.dt, -6.1), at = nearestS(lane, c), pt = polyAt(lane, at, V());
    const door = p.q.clone().addScaledVector(p.dt, -3.2).addScaledVector(p.rt, C.BUS + 1.95);
    BAYS[id] = { id, place: p, side: p.side, lane, at, x: pt.x, z: pt.y, dt: p.dt, rt: p.rt, yaw: Math.atan2(-p.dt.y, p.dt.x), door };
  }
  buildShapes();
  // the playable area
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const r of ROADS) for (const p of r.center.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
  BOUNDS = { x0: x0 - WALL - 70, x1: x1 + WALL + 70, z0: z0 - WALL - 70, z1: L.sea ? L.sea - 4 : z1 + WALL + 70 };
  return CITY;
}
function nearestS(P, p) { let best = 0, bd = 1e9; for (let i = 0; i < P.pts.length - 1; i++) { const a = P.pts[i], b = P.pts[i + 1], ab = b.clone().sub(a), t = clamp(p.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1), q = a.clone().addScaledVector(ab, t), d = q.distanceTo(p); if (d < bd) { bd = d; best = P.cum[i] + t * ab.length(); } } return best; }

function buildLanes(off, bus) {
  const lanes = [], conns = [], inL = new Map(), outL = new Map();
  for (const n of NODES) { inL.set(n, []); outL.set(n, []); }
  for (const r of ROADS) {
    const mid = cut(r.center, r.sA, r.sB), pair = [];
    for (const dir of [1, -1]) {
      const base = dir > 0 ? mid : mid.slice().reverse(), pts = offsetPts(base, off), from = dir > 0 ? r.a : r.b, to = dir > 0 ? r.b : r.a, P = poly(pts);
      const d0 = pts[1].clone().sub(pts[0]).normalize(), d1 = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();
      const Ln = { kind: 'lane', id: lanes.length, bus, road: r, dir, from, to, ...P, d0, r0: V(-d0.y, d0.x), d1, r1: V(-d1.y, d1.x), d: d1, r: V(-d1.y, d1.x), appr: `${r.id}:${dir}`, next: [], vmax: 13 };
      lanes.push(Ln); outL.get(from).push(Ln); inL.get(to).push(Ln); pair.push(Ln);
    }
    pair[0].twin = pair[1]; pair[1].twin = pair[0];
  }
  for (const n of NODES) for (const Li of inL.get(n)) for (const Lo of outL.get(n)) {
    const a = Li.pts[Li.pts.length - 1], b = Lo.pts[0], di = Li.d1, dO = Lo.d0, cross = di.x * dO.y - di.y * dO.x;
    let turn = Lo === Li.twin ? 'U' : Math.abs(cross) < .35 && di.dot(dO) > 0 ? 'S' : cross > 0 ? 'R' : 'L', pts, ring = null;
    if (n.round) {
      // into the ring, round it with the island on the left, and out
      const c = V(n.x, n.z), rr = n.ri + (bus ? 7.5 : 2.5), th = p => Math.atan2(p.y - c.y, p.x - c.x), tan = f => V(Math.sin(f), -Math.cos(f));
      const fe = th(a) - .32, fx = th(b) + .32; let span = fe - fx; while (span <= .25) span += Math.PI * 2; while (span > Math.PI * 2 + .25) span -= Math.PI * 2;
      const E = V(c.x + Math.cos(fe) * rr, c.y + Math.sin(fe) * rr), X = V(c.x + Math.cos(fx) * rr, c.y + Math.sin(fx) * rr);
      const k1 = a.distanceTo(E) * .45, k2 = X.distanceTo(b) * .45;
      pts = bez(a, a.clone().addScaledVector(di, k1), E.clone().addScaledVector(tan(fe), -k1), E, 8);
      const m = Math.max(4, Math.ceil(span / .12)); for (let k = 1; k <= m; k++) { const f = fe - span * k / m; pts.push(V(c.x + Math.cos(f) * rr, c.y + Math.sin(f) * rr)); }
      pts.push(...bez(X, X.clone().addScaledVector(tan(fx), k2), b.clone().addScaledVector(dO, -k2), b, 8).slice(1));
      turn = Lo === Li.twin ? 'U' : span < 2.2 ? 'R' : span < 3.9 ? 'S' : 'L'; ring = { rr, span };
    } else if (turn === 'U') {
      if (!(bus && n.signal)) continue;
      const c = V(n.x, n.z), pts2 = [a.clone()];
      for (let k = 0; k <= 16; k++) { const t = k / 16 * Math.PI; pts2.push(c.clone().addScaledVector(Li.r1, off * Math.cos(t)).addScaledVector(di, off * Math.sin(t) + 1.5)); }
      pts2.push(b.clone()); pts = pts2;
    } else if (turn === 'S') pts = [a.clone(), b.clone()];
    else { const r1 = Math.max(2, b.clone().sub(a).dot(di)) * .5523, r2 = Math.max(2, b.clone().sub(a).dot(dO)) * .5523; pts = bez(a, a.clone().addScaledVector(di, r1), b.clone().addScaledVector(dO, -r2), b); }
    const cn = { kind: 'conn', node: n, from: Li, to: Lo, turn, ring, ...poly(pts), vmax: n.round ? (bus ? 6.5 : 7.5) : { S: 12, R: 6, L: 7.5, U: 4.5 }[turn] };
    conns.push(cn); Li.next.push(cn);
  }
  return { lanes, conns, inL, outL };
}

/* ---------------- routes for the coach: stop to stop through the streets ---------------- */
export function routeBus(fromId, toId) {
  const A = BAYS[fromId], B = BAYS[toId], pieces = [];
  if (A.lane === B.lane && B.at > A.at + 2) pieces.push({ P: A.lane, s0: A.at, s1: B.at, lane: A.lane });
  else {
    const dist = new Map([[A.lane, A.lane.len - A.at]]), prev = new Map(), Q = [[A.lane.len - A.at, A.lane]];
    let best = 1e9, last = null;
    while (Q.length) {
      Q.sort((a, b) => a[0] - b[0]); const [d0, Ln] = Q.shift();
      if (d0 > (dist.get(Ln) ?? 1e9) || d0 >= best) continue;
      for (const c of Ln.next) {
        const cost = c.len + (c.turn === 'U' && !c.ring ? U_COST : 0);
        if (c.to === B.lane) { const t = d0 + cost + B.at; if (t < best) { best = t; last = c; } continue; }
        const nd = d0 + cost + c.to.len; if (nd < (dist.get(c.to) ?? 1e9)) { dist.set(c.to, nd); prev.set(c.to, c); Q.push([nd, c.to]); }
      }
    }
    const chain = []; for (let c = last; c; c = c.from === A.lane ? null : prev.get(c.from)) chain.unshift(c);
    pieces.push({ P: A.lane, s0: A.at, s1: A.lane.len, lane: A.lane });
    for (const c of chain) { pieces.push({ P: c, s0: 0, s1: c.len, conn: c }); pieces.push({ P: c.to, s0: 0, s1: c.to === B.lane ? B.at : c.to.len, lane: c.to }); }
  }
  // one polyline, noting where each signalled stop line and each roundabout entry falls along it
  const pts = [], stops = [], yields = [];
  for (const pc of pieces) {
    const add = pc.s0 === 0 && pc.s1 === pc.P.len ? pc.P.pts : cut(pc.P, pc.s0, pc.s1);
    for (const p of add) if (!pts.length || p.distanceTo(pts[pts.length - 1]) > .05) pts.push(p.clone());
    if (pc.lane && pc.s1 === pc.lane.len && pc.lane.to.signal) stops.push({ at: poly(pts).len, lane: pc.lane, node: pc.lane.to });
    if (pc.lane && pc.s1 === pc.lane.len && pc.lane.to.round) yields.push({ at: poly(pts).len, node: pc.lane.to });
  }
  const R = poly(pts); R.stops = stops; R.yields = yields; return R;
}

/* ---------------- shapes for the queries and the meshes ---------------- */
function pip(poly2, x, z) { let c = false; for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) { const a = poly2[i], b = poly2[j]; if ((a.y > z) !== (b.y > z) && x < (b.x - a.x) * (z - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
function segDist(px, pz, a, b) { const abx = b.x - a.x, abz = b.y - a.y, t = clamp(((px - a.x) * abx + (pz - a.y) * abz) / Math.max(1e-6, abx * abx + abz * abz), 0, 1); return Math.hypot(a.x + abx * t - px, a.y + abz * t - pz); }
function polyEdgeDist(p2, x, z) { let d = 1e9; for (let i = 0, j = p2.length - 1; i < p2.length; j = i++) d = Math.min(d, segDist(x, z, p2[j], p2[i])); return d; }
function buildShapes() {
  // junction areas (with rounded kerbs) and the sidewalk patches in their corners
  JPOLY = []; PATCH = []; RINGS = [];
  for (const n of NODES) {
    if (n.round) { RINGS.push(n); continue; }
    if (n.deg < 2) continue;
    const c = V(n.x, n.z), poly2 = [], arms = n.arms, t = n.trim;
    arms.forEach((A, i) => {
      const B = arms[(i + 1) % arms.length], rA = V(-A.u.y, A.u.x), rB = V(-B.u.y, B.u.x);
      const Em = c.clone().addScaledVector(A.u, t).addScaledVector(rA, -C.HW), Ep = c.clone().addScaledVector(A.u, t).addScaledVector(rA, C.HW);
      poly2.push(Em, Ep);
      let th = Math.atan2(B.u.y, B.u.x) - Math.atan2(A.u.y, A.u.x); if (th <= 0) th += Math.PI * 2;
      const EmB = c.clone().addScaledVector(B.u, t).addScaledVector(rB, -C.HW);
      const OpA = c.clone().addScaledVector(A.u, t).addScaledVector(rA, WALL), OmB = c.clone().addScaledVector(B.u, t).addScaledVector(rB, -WALL);
      if (Math.abs(th - Math.PI) <= .05) { PATCH.push([Ep, EmB, OmB, OpA]); return; }
      // the kerb lines meet at K (behind the node on the outside of a bend)
      const K = c.clone().addScaledVector(rA, C.HW).addScaledVector(A.u, C.HW / Math.tan(th / 2)), K2 = c.clone().addScaledVector(rA, WALL).addScaledVector(A.u, WALL / Math.tan(th / 2));
      if (th > Math.PI) { poly2.push(K); PATCH.push([Ep, K, EmB, OmB, K2, OpA]); return; }
      // on the inside, round the corner with radius CORNER
      const tf = C.CORNER / Math.tan(th / 2);
      const bis = A.u.clone().add(B.u).normalize(), cc = K.clone().addScaledVector(bis, C.CORNER / Math.sin(th / 2));
      const Ti = K.clone().addScaledVector(A.u, tf), Tj = K.clone().addScaledVector(B.u, tf), a0 = Math.atan2(Ti.y - cc.y, Ti.x - cc.x);
      let da = Math.atan2(Tj.y - cc.y, Tj.x - cc.x) - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      const arc = []; for (let k = 0; k <= 8; k++) { const f = a0 + da * k / 8; arc.push(V(cc.x + Math.cos(f) * C.CORNER, cc.y + Math.sin(f) * C.CORNER)); }
      poly2.push(...arc);
      PATCH.push([Ep, ...arc, EmB, OmB, K2, OpA]);
    });
    n.poly = poly2; JPOLY.push(poly2);
  }
  // a coarse grid of road pieces for fast queries
  HASH = new Map(); const G = 24, key = (i, j) => i * 100000 + j;
  const put = (x0, z0, x1, z1, item) => { for (let i = Math.floor(x0 / G); i <= Math.floor(x1 / G); i++) for (let j = Math.floor(z0 / G); j <= Math.floor(z1 / G); j++) { const k = key(i, j); if (!HASH.has(k)) HASH.set(k, []); HASH.get(k).push(item); } };
  for (const r of ROADS) {
    r.road = cut(r.center, r.gA, r.gB); r.walkPts = cut(r.center, r.wA, r.wB);
    const s0 = Math.min(r.wA, r.gA), all = cut(r.center, s0, Math.max(r.wB, r.gB)); let sa = s0;
    for (let i = 0; i < all.length - 1; i++) { const a = all[i], b = all[i + 1], m = WALL + 1, len = a.distanceTo(b); put(Math.min(a.x, b.x) - m, Math.min(a.y, b.y) - m, Math.max(a.x, b.x) + m, Math.max(a.y, b.y) + m, { seg: [a, b], s0: sa, len, road: r }); sa += len; }
  }
  for (const n of NODES) { const m = n.round ? n.ro + C.SW + 2 : n.trim + WALL + 2; put(n.x - m, n.z - m, n.x + m, n.z + m, { node: n }); }
  for (const pt of PATCH) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pt) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); } put(x0, z0, x1, z1, { patch: pt }); }
}
const near = (x, z) => HASH?.get(Math.floor(x / 24) * 100000 + Math.floor(z / 24)) || [];
/* within w of this piece of road, between arc lengths lo and hi along the road? */
function alongSeg(it, x, z, w, lo, hi) {
  const a = it.seg[0], b = it.seg[1], abx = b.x - a.x, abz = b.y - a.y, t = clamp(((x - a.x) * abx + (z - a.y) * abz) / Math.max(1e-6, abx * abx + abz * abz), 0, 1);
  if (Math.hypot(a.x + abx * t - x, a.y + abz * t - z) > w) return false; const s = it.s0 + t * it.len; return s >= lo && s <= hi;
}

/* ---------------- where things can go ---------------- */
export function onRoad(x, z, m = 0) {
  const h = C.HW - m;
  for (const it of near(x, z)) {
    if (it.seg) { if (alongSeg(it, x, z, h, it.road.gA - .01, it.road.gB + .01)) return true; }
    else if (it.node) {
      const n = it.node, d = Math.hypot(x - n.x, z - n.z);
      if (n.round) { if (d >= n.ri + m && d <= n.ro - m) return true; }
      else if (n.poly && d < n.trim + C.HW + 2) { const inside = pip(n.poly, x, z); if (m <= 0 ? inside || polyEdgeDist(n.poly, x, z) <= -m : inside && polyEdgeDist(n.poly, x, z) >= m) return true; }
    }
  }
  return false;
}
export function groundY(x, z) {
  if (onRoad(x, z)) return .02;
  for (const it of near(x, z)) {
    if (it.seg) { if (alongSeg(it, x, z, WALL, Math.min(it.road.wA, it.road.gA) - .5, Math.max(it.road.wB, it.road.gB) + .5)) return .2; }
    else if (it.node?.round) { const n = it.node, d = Math.hypot(x - n.x, z - n.z); if (d < n.ri) return .32; if (d <= n.ro + C.SW) return .2; }
    else if (it.patch && pip(it.patch, x, z)) return .2;
  }
  return 0;
}

/* ---------------- geometry helpers ---------------- */
function flatGeo(shapePts, y) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(shapePts.map(p => new THREE.Vector2(p.x, -p.y))));
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  return g;
}
/* a flat band along a polyline between two side offsets, UVs in world metres, facing up */
function ribbon(pts, o0, o1, y) {
  const a = offsetPts(pts, o0), b = offsetPts(pts, o1), pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i < pts.length; i++) { pos.push(a[i].x, y, a[i].y, b[i].x, y, b[i].y); uv.push(a[i].x, a[i].y, b[i].x, b[i].y); nor.push(0, 1, 0, 0, 1, 0); }
  for (let i = 0; i < pts.length - 1; i++) {
    const k = i * 2, ax = a[i + 1].x - a[i].x, az = a[i + 1].y - a[i].y, bx = b[i].x - a[i].x, bz = b[i].y - a[i].y;
    // keep the winding counter-clockwise seen from above so the band faces up
    if (ax * bz - az * bx > 0) idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); else idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
/* a raised slab (sidewalk) from an outline, kerb faces included */
function slab(outline, depth = .17) {
  // the outline must wind one way for the extrusion's faces to point outwards
  let area = 0; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) area += (outline[j].x - outline[i].x) * (outline[j].y + outline[i].y);
  const pts = area < 0 ? outline.slice().reverse() : outline;
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, -p.y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .05, bevelSegments: 1, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) > .5) uv.setXY(i, p.getX(i) / 2.2, p.getZ(i) / 2.2);
  return g;
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
  // the logo on the left, the words in the space to its right, each sized to fit its column
  let lx1 = 60;
  try { const lg = await loadImg('assets/img/logo_white.webp'), r = Math.min(220 / lg.height, 340 / lg.width); x.globalAlpha = .9; x.drawImage(lg, 50, 160 - lg.height * r / 2, lg.width * r, lg.height * r); x.globalAlpha = 1; lx1 = 50 + lg.width * r; } catch {}
  const cx0 = lx1 + 40, cw = 1000 - cx0, mid = cx0 + cw / 2, fit = (t, size, w, weight) => { let f = size; x.font = `${weight} ${f}px "Readex Pro"`; while (x.measureText(t).width > w && f > 30) { f -= 3; x.font = `${weight} ${f}px "Readex Pro"`; } };
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; fit(tx('موقف باص المبادرة', 'Future Industrialists'), 80, cw, 700); x.fillText(tx('موقف باص المبادرة', 'Future Industrialists'), mid, 128);
  x.direction = 'ltr'; fit('BUS STOP', 64, cw * .8, 600); x.fillText('BUS STOP', mid, 222);
  return toTex(c);
}
function busWordTex() {
  const [c, x] = canvas(512, 256); x.clearRect(0, 0, 512, 256); x.fillStyle = 'rgba(255,255,255,.92)'; x.textAlign = 'center'; x.font = '700 120px "Readex Pro"'; x.direction = 'rtl'; x.fillText(tx('باص', ''), 256, 120); x.direction = 'ltr'; x.font = '700 86px "Readex Pro"'; x.fillText('BUS', 256, 230);
  return toTex(c);
}
/* a plane lying flat on the road, its local +x along heading h (radians, map angle), at height y */
function flat(geo, mat, x, z, h, y) { const o = new THREE.Mesh(geo, mat); o.rotation.order = 'YXZ'; o.rotation.set(-Math.PI / 2, -h, 0); o.position.set(x, y, z); return o; }

/* streets, sidewalks, markings, lamps and palms; returns colliders for the walking student */
export async function buildStreets(scene, { pave, curb, region }) {
  const colliders = [], anim = [];
  // asphalt: road bands, junction areas, roundabout rings (overlaps share world UVs, so they render identically)
  const asph = pbr('clean_asphalt', [1 / 8, 1 / 8]);
  const asphM = new THREE.MeshStandardMaterial({ ...asph, color: '#9a9a9a', roughness: .92 });
  const parts = [];
  for (const r of ROADS) parts.push(ribbon(r.road, -C.HW, C.HW, .02));
  for (const pg of JPOLY) parts.push(flatGeo(pg, .02));
  for (const n of RINGS) { const g = new THREE.RingGeometry(n.ri, n.ro, 72, 1); g.rotateX(-Math.PI / 2); g.translate(n.x, .02, n.z); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); parts.push(g); }
  const road = new THREE.Mesh(mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)), asphM); road.receiveShadow = true; scene.add(road);
  // the coach's kerb lane on the main roads: a red-brown band, as bus lanes are painted
  const busM = new THREE.MeshStandardMaterial({ color: '#8a4038', roughness: .9, transparent: true, opacity: .55, depthWrite: false });
  const busParts = [];
  for (const r of ROADS) if (r.busway) { const mid = cut(r.center, r.sA + 2, r.sB - 2); busParts.push(ribbon(mid, C.HW / 2 + .1, C.HW - .15, .028), ribbon(mid, -C.HW + .15, -C.HW / 2 - .1, .028)); }
  if (busParts.length) { const busLane = new THREE.Mesh(mergeGeometries(busParts), busM); busLane.receiveShadow = true; busLane.renderOrder = 1; scene.add(busLane); }
  // sidewalks: a slab along each side of every road, patches in the junction corners, rings round the roundabouts
  const swGeo = [];
  for (const r of ROADS) for (const sd of [1, -1]) { const a = offsetPts(r.walkPts, sd * C.HW), b = offsetPts(r.walkPts, sd * WALL); swGeo.push(slab([...a, ...b.reverse()])); }
  for (const pt of PATCH) swGeo.push(slab(pt));
  for (const n of RINGS) {
    // sectors between the arms, from the ring's outer edge to the sidewalk's outer edge
    const c = V(n.x, n.z), ang = a => Math.atan2(a.u.y, a.u.x), arms = n.arms, ai = Math.asin(C.HW / n.ro), ao = Math.asin(WALL / (n.ro + C.SW));
    arms.forEach((A, i) => {
      const B = arms[(i + 1) % arms.length]; let a0 = ang(A), a1 = ang(B); if (a1 <= a0) a1 += Math.PI * 2;
      const inner = [], outer = [];
      for (let k = 0; k <= 16; k++) { const f = a0 + ai + (a1 - a0 - 2 * ai) * k / 16; inner.push(V(c.x + Math.cos(f) * n.ro, c.y + Math.sin(f) * n.ro)); }
      for (let k = 16; k >= 0; k--) { const f = a0 + ao + (a1 - a0 - 2 * ao) * k / 16; outer.push(V(c.x + Math.cos(f) * (n.ro + C.SW), c.y + Math.sin(f) * (n.ro + C.SW))); }
      const rA = V(-A.u.y, A.u.x), rB = V(-B.u.y, B.u.x), w = n.walk;
      const pA1 = c.clone().addScaledVector(A.u, w).addScaledVector(rA, C.HW), pA2 = c.clone().addScaledVector(A.u, w).addScaledVector(rA, WALL);
      const pB1 = c.clone().addScaledVector(B.u, w).addScaledVector(rB, -C.HW), pB2 = c.clone().addScaledVector(B.u, w).addScaledVector(rB, -WALL);
      swGeo.push(slab([pA1, ...inner, pB1, pB2, ...outer, pA2]));
    });
  }
  for (const g of swGeo) { const sw = new THREE.Mesh(g, [pave, curb]); sw.position.y = .03; sw.receiveShadow = true; scene.add(sw); }
  // the roundabouts' islands: a raised lawn inside a kerb; the landmark goes on top (world.js)
  const lawnM = new THREE.MeshStandardMaterial({ color: '#6aa04a', roughness: .95 }), kerbM = new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: .7 });
  for (const n of RINGS) { const k = new THREE.Mesh(new THREE.CylinderGeometry(n.ri, n.ri + .1, .32, 64), kerbM); k.position.set(n.x, .16, n.z); k.receiveShadow = true; scene.add(k); const l = new THREE.Mesh(new THREE.CircleGeometry(n.ri - .5, 64), lawnM); l.rotation.x = -Math.PI / 2; l.position.set(n.x, .325, n.z); l.receiveShadow = true; scene.add(l); colliders.push([n.x, n.z, n.ri + .2]); }
  // markings: double yellow centre line, dashed lane lines, stop lines, zebras, the roundabouts' lane ring
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .6 }), yellow = new THREE.MeshStandardMaterial({ color: '#f0bf2a', roughness: .6 });
  const yel = [], wht = [];
  for (const r of ROADS) {
    const mid = cut(r.center, r.sA, r.sB); yel.push(ribbon(mid, -.23, -.11, .034), ribbon(mid, .11, .23, .034));
    const P = poly(mid); for (let s = 1; s < P.len - 4; s += 9) { const piece = cut(P, s, s + 3); for (const o of [-C.HW / 2, C.HW / 2]) wht.push(ribbon(piece, o - .07, o + .07, .035)); }
  }
  for (const n of RINGS) for (let k = 0; k < 44; k += 2) { const pts = []; for (let j = 0; j <= 3; j++) { const f = (k + j / 3) / 44 * Math.PI * 2; pts.push(V(n.x + Math.cos(f) * (n.ri + 5), n.z + Math.sin(f) * (n.ri + 5))); } wht.push(ribbon(pts, -.07, .07, .035)); }
  scene.add(new THREE.Mesh(mergeGeometries(yel), yellow), new THREE.Mesh(mergeGeometries(wht), paint));
  const stopG = new THREE.PlaneGeometry(.45, C.HW - .3), zebG = new THREE.PlaneGeometry(.5, 3.6), toothG = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, -.22), new THREE.Vector2(.6, 0), new THREE.Vector2(0, .22)])), marks = new THREE.Group();
  for (const L of NET.lanes) {
    const p = L.pts[L.pts.length - 1], k = C.HW / 2 - C.CAR, h = Math.atan2(L.d1.y, L.d1.x);
    if (L.to.signal) marks.add(flat(stopG, paint, p.x + L.r1.x * k + L.d1.x * .3, p.y + L.r1.y * k + L.d1.y * .3, h, .036));
    if (L.to.round) for (let j = -3; j <= 3; j++) marks.add(flat(toothG, paint, p.x + L.r1.x * (k + j * .5) + L.d1.x * .3, p.y + L.r1.y * (k + j * .5) + L.d1.y * .3, h + Math.PI, .036));
  }
  for (const n of NODES) if (n.signal) for (const A of n.arms) { const r = V(-A.u.y, A.u.x), dz = n.trim - 3.3; for (let k = -C.HW + .5; k <= C.HW - .4; k += 1) marks.add(flat(zebG, paint, n.x + A.u.x * dz + r.x * k, n.z + A.u.y * dz + r.y * k, Math.atan2(r.y, r.x), .036)); }
  // one mesh for all of them
  marks.updateMatrixWorld(true); const mg = []; marks.children.forEach(o => { const g = o.geometry.clone().applyMatrix4(o.matrixWorld); for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); mg.push(g.index ? g.toNonIndexed() : g); });
  if (mg.length) { const all = new THREE.Mesh(mergeGeometries(mg), paint); all.receiveShadow = true; scene.add(all); }
  // the word BUS in the coach's lane, and a painted box at each of its stops
  const bw = new THREE.MeshStandardMaterial({ map: busWordTex(), transparent: true, depthWrite: false, roughness: .7 }), bwG = new THREE.PlaneGeometry(3, 1.5);
  for (const L of BUSNET.lanes) if (L.road.busway) for (let s = 30; s < L.len - 30; s += 70) {
    const p = V(), d = V(); polyAt(L, s, p, d); if (Object.values(BAYS).some(b => Math.hypot(b.x - p.x, b.z - p.y) < 18)) continue;
    const m2 = flat(bwG, bw, p.x, p.y, Math.atan2(d.y, d.x) + Math.PI / 2, .034); m2.renderOrder = 2; scene.add(m2);
  }
  const st = await stopTex(), stM = new THREE.MeshStandardMaterial({ map: st, transparent: true, roughness: .7, depthWrite: false });
  for (const b of Object.values(BAYS)) { const m2 = flat(new THREE.PlaneGeometry(13, 3.2), stM, b.x, b.z, Math.atan2(b.dt.y, b.dt.x), .035); m2.renderOrder = 2; scene.add(m2); }
  // street lights and palms along the sidewalks
  const poleM = new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: .7, roughness: .35 }), ledM = new THREE.MeshStandardMaterial({ color: '#f7f9ff', emissive: '#eaf2ff', emissiveIntensity: .6 });
  const strip = g2 => { const o = g2.index ? g2.toNonIndexed() : g2; for (const a of Object.keys(o.attributes)) if (!['position', 'normal', 'uv'].includes(a)) o.deleteAttribute(a); return o; };
  const lampG = mergeGeometries([new THREE.CylinderGeometry(.09, .16, 9.5, 12).translate(0, 4.75, 0), new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 8.9, 0), new THREE.Vector3(0, 9.8, 1.4), new THREE.Vector3(0, 9.7, 3.2)), 12, .055, 6), new RoundedBoxGeometry(.38, .12, .9, 2, .04).translate(0, 9.68, 3.5)].map(strip));
  const ledG = strip(new THREE.PlaneGeometry(.3, .8).rotateX(Math.PI / 2).translate(0, 9.615, 3.5));
  const lampAt = [], palmAt = [], mm = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  // nothing at a junction, at a gate or where the coach opens its door
  const busy = (x, z) => onRoad(x, z, -1.2) || NODES.some(n => Math.hypot(x - n.x, z - n.z) < (n.round ? n.ro + 14 : n.trim + 8))
    || PLACES.some(p => Math.abs((x - p.x) * p.d.x + (z - p.z) * p.d.y) < 12 && Math.hypot(x - p.x, z - p.z) < WALL + 14) || Object.values(BAYS).some(b => Math.hypot(x - b.x, z - b.z) < 14);
  for (const r of ROADS) {
    const W = poly(r.walkPts);
    for (let s = 14; s < W.len - 14; s += 30) for (const sd of [1, -1]) { const p = V(), d = V(); polyAt(W, s, p, d); const rx = -d.y * sd, rz = d.x * sd, x = p.x + rx * (C.HW + .7), z = p.y + rz * (C.HW + .7); if (!busy(x, z)) lampAt.push([x, z, Math.atan2(-rx, -rz)]); }
    for (let s = 9; s < W.len - 9; s += 21) for (const sd of [1, -1]) { const p = V(), d = V(); polyAt(W, s, p, d); const rx = -d.y * sd, rz = d.x * sd, x = p.x + rx * (WALL - 1.8), z = p.y + rz * (WALL - 1.8); if (!busy(x, z) && !lampAt.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 5)) palmAt.push([x, z]); }
  }
  const lamps = new THREE.InstancedMesh(lampG, poleM, lampAt.length), leds = new THREE.InstancedMesh(ledG, ledM, lampAt.length);
  lampAt.forEach(([x, z, a], i) => { q.setFromEuler(new THREE.Euler(0, a, 0)); mm.compose(new THREE.Vector3(x, .2, z), q, one); lamps.setMatrixAt(i, mm); leds.setMatrixAt(i, mm); colliders.push([x, z, .3]); });
  lamps.castShadow = true; lamps.computeBoundingSphere(); leds.computeBoundingSphere(); scene.add(lamps, leds);
  const palms = makePalmField(palmAt, { h: 7, shadows: true }); palms.position.y = .2; scene.add(palms);
  for (const [x, z] of palmAt) colliders.push([x, z, .5]);
  // street name plates at the signalled junctions
  const plate = streetLabel(tx(`شارع ${region}`, `${region} Street`), 'Industrial Avenue'), plM = new THREE.MeshStandardMaterial({ map: plate, roughness: .5 });
  for (const n of NODES) if (n.signal) { const A = n.arms[0], B = n.arms[1 % n.arms.length], dir = A.u.clone().add(B.u).normalize(), x = n.x + dir.x * (n.trim + 3), z = n.z + dir.y * (n.trim + 3); if (onRoad(x, z, -.5)) continue; const g = new THREE.Group(); g.position.set(x, 0, z); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.6, 10), poleM).translateY(1.8)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), plM); pl.position.y = 3.3; pl.rotation.y = Math.atan2(dir.x, dir.y) + Math.PI / 2; g.add(pl); const back = pl.clone(); back.rotation.y += Math.PI; g.add(back); scene.add(g); colliders.push([x, z, .2]); }
  return { colliders, anim };
}

/* a compound's local frame: gate at local (0, 26) facing +z, toward its road */
export function placeFrame(p) { const c = p.q.clone().addScaledVector(p.rt, WALL + 26); return { x: c.x, z: c.y, rot: p.rot }; }
export function toWorld(p, lx, lz) { const f = placeFrame(p), cs = Math.cos(f.rot), sn = Math.sin(f.rot); return [f.x + lx * cs + lz * sn, f.z - lx * sn + lz * cs]; }
/* a point beside road ri at s on side sd, off metres from the centre line; with the heading that faces the road */
export function roadPoint(ri, s, sd, off = C.HW + C.SW / 2) { const r = ROADS[ri], p = V(), d = V(); polyAt(r.center, s, p, d); return [p.x - d.y * off * sd, p.y + d.x * off * sd, Math.atan2(d.y * sd, -d.x * sd)]; }
export const roads = () => ROADS;
