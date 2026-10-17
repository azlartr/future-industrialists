import * as THREE from 'three';
import { C, NET, BAYS } from './city.js';

/* People on the sidewalks: men in white thobes with ghutras and agals, women in black abayas, workers in
   blue coveralls and yellow hard hats. Each walks one stretch of sidewalk and turns round at its end or
   before a bus stop, swings its arms, and waits when the student is in the way. Everyone shares a few
   instanced meshes, so a crowd costs a handful of draw calls. */
const V = (x, z) => new THREE.Vector2(x, z);
const KINDS = [['man', 5], ['woman', 4], ['worker', 2], ['boy', 1.2]];
const SKIN = ['#e9c39b', '#d9a77c', '#c68e63', '#a8744e', '#f0d2b0'];
function pick(list) { const t = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * t; for (const [k, w] of list) if ((r -= w) <= 0) return k; return list[0][0]; }
function offsetPts(pts, off) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = b.clone().sub(a).normalize(); return V(p.x - d.y * off, p.y + d.x * off); }); }
function poly(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, len: cum[cum.length - 1] }; }
function at(P, s, out, dir) { const { pts, cum } = P; s = Math.max(0, Math.min(P.len, s)); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]); out.lerpVectors(pts[lo], pts[hi], t); dir.subVectors(pts[hi], pts[lo]).normalize(); return out; }

export function makePeople(scene, { count = 40 } = {}) {
  const group = new THREE.Group(); group.name = 'people'; scene.add(group);
  // the walkable lines: the middle of every sidewalk, cut where the bus stops are
  const lines = [];
  for (const r of NET.roads) for (const sd of [1, -1]) {
    const P = poly(offsetPts(r.walkPts, sd * (C.HW + 3))); if (P.len < 30) continue;
    const blocked = []; for (const b of Object.values(BAYS)) for (let s = 0; s <= P.len; s += 4) { const p = at(P, s, V(), V()); if (Math.hypot(p.x - b.x, p.y - b.z) < 20) blocked.push(s); }
    let s0 = 4; const cuts = [...blocked, P.len - 4];
    for (const c of cuts) { if (c - s0 > 25) lines.push({ P, s0, s1: c - 4 }); s0 = Math.max(s0, c + 4); }
  }
  const total = lines.reduce((a, l) => a + l.s1 - l.s0, 0);
  // the parts, each an instanced mesh with per-person colours
  const mat = new THREE.MeshStandardMaterial({ roughness: .75 }), mat2 = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .1 });
  const robeG = new THREE.LatheGeometry([[.001, 0], [.27, 0], [.26, .5], [.23, 1.05], [.21, 1.3], [.17, 1.42], [.08, 1.47], [.001, 1.49]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const suitG = new THREE.CylinderGeometry(.19, .2, .62, 12).translate(0, 1.12, 0);
  const legG = new THREE.CapsuleGeometry(.075, .58, 3, 8).translate(0, -.37, 0);
  const headG = new THREE.SphereGeometry(.115, 14, 10).translate(0, 1.6, 0);
  const ghutraG = new THREE.LatheGeometry([[.001, 1.79], [.1, 1.76], [.14, 1.66], [.16, 1.5], [.22, 1.36], [.18, 1.35], [.13, 1.48], [.12, 1.62], [.001, 1.64]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const agalG = new THREE.TorusGeometry(.115, .018, 6, 18).rotateX(Math.PI / 2).translate(0, 1.72, 0);
  const hijabG = new THREE.SphereGeometry(.135, 14, 10).scale(1, 1.12, 1.02).translate(0, 1.61, -.012);
  const faceG = new THREE.SphereGeometry(.085, 12, 8).scale(1, 1.15, .6).translate(0, 1.6, .075);
  const helmetG = new THREE.SphereGeometry(.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.66, 0);
  const armG = new THREE.CapsuleGeometry(.045, .44, 3, 8).translate(0, -.27, 0);
  const people = [], parts = { robe: [], suit: [], leg: [], head: [], ghutra: [], agal: [], hijab: [], face: [], helmet: [], arm: [] };
  for (let i = 0; i < count && lines.length; i++) {
    let r = Math.random() * total, L = lines[0]; for (const l of lines) { if ((r -= l.s1 - l.s0) <= 0) { L = l; break; } }
    const kind = pick(KINDS), sc = kind === 'boy' ? .72 : .95 + Math.random() * .1, skin = SKIN[Math.random() * SKIN.length | 0];
    const p = { kind, L, s: L.s0 + Math.random() * (L.s1 - L.s0), dir: Math.random() < .5 ? 1 : -1, v: kind === 'boy' ? 1.5 : 1.05 + Math.random() * .35, ph: Math.random() * 7, sc, x: 0, z: 0, yaw: 0, wait: 0, idx: {} };
    const add = (part, col) => { p.idx[part] = p.idx[part] || []; p.idx[part].push(parts[part].length); parts[part].push({ p, col }); };
    if (kind === 'man' || kind === 'boy') { add('robe', '#f6f6f2'); add('head', skin); add('ghutra', kind === 'boy' ? '#ffffff' : Math.random() < .55 ? '#c8383b' : '#ffffff'); if (kind === 'man') add('agal', '#16181c'); add('arm', '#f6f6f2'); add('arm', '#f6f6f2'); }
    else if (kind === 'woman') { add('robe', '#141418'); add('hijab', '#141418'); add('face', skin); add('arm', '#141418'); add('arm', '#141418'); }
    else { add('suit', '#2f5f9e'); add('leg', '#2f5f9e'); add('leg', '#2f5f9e'); add('head', skin); add('helmet', '#f2c230'); add('arm', '#2f5f9e'); add('arm', '#2f5f9e'); }
    people.push(p);
  }
  const meshes = {};
  const G = { robe: robeG, suit: suitG, leg: legG, head: headG, ghutra: ghutraG, agal: agalG, hijab: hijabG, face: faceG, helmet: helmetG, arm: armG };
  for (const k in parts) {
    if (!parts[k].length) continue;
    const im = new THREE.InstancedMesh(G[k], k === 'helmet' || k === 'agal' ? mat2 : mat, parts[k].length); im.castShadow = true; im.frustumCulled = false;
    parts[k].forEach(({ col }, i) => im.setColorAt(i, new THREE.Color(col)));
    group.add(im); meshes[k] = im;
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), P = V(), D = V(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const base = new THREE.Matrix4(), local = new THREE.Matrix4();
  return {
    group, people,
    /* is (x, z) inside someone? (the walking student can't pass through people) */
    hit(x, z) { for (const p of people) if (Math.abs(p.x - x) < .5 && Math.abs(p.z - z) < .5 && Math.hypot(p.x - x, p.z - z) < .42) return true; return false; },
    update(dt, player, cam) {
      for (const p of people) {
        // wait for the student in the way, otherwise walk on and turn round at the end of the stretch
        at(p.L.P, p.s, P, D); const fx = D.x * p.dir, fz = D.y * p.dir;
        const blockedBy = player && ((player.x - P.x) * fx + (player.z - P.y) * fz) > 0 && Math.hypot(player.x - P.x, player.z - P.y) < 1.7;
        const go = blockedBy ? 0 : p.v; p.s += go * p.dir * dt; if (p.s > p.L.s1) { p.s = p.L.s1; p.dir = -1; } if (p.s < p.L.s0) { p.s = p.L.s0; p.dir = 1; }
        p.ph += go * dt * 3.4; p.x = P.x; p.z = P.y;
        const want = Math.atan2(fx, fz); p.yaw += Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw)) * Math.min(1, dt * 6);
        const far = cam && (cam.x - p.x) ** 2 + (cam.z - p.z) ** 2 > 140 * 140;
        const bob = Math.abs(Math.sin(p.ph)) * .035 * (go > 0 ? 1 : 0), sway = Math.sin(p.ph) * .04 * (go > 0 ? 1 : 0);
        e.set(0, p.yaw, sway); q.setFromEuler(e); pos.set(p.x, .2 + bob, p.z); scl.setScalar(p.sc); base.compose(pos, q, scl);
        for (const k in p.idx) {
          const ids = p.idx[k], im = meshes[k];
          ids.forEach((id, j) => {
            if (far) { im.setMatrixAt(id, hide); return; }
            if (k === 'arm' || k === 'leg') {
              const side = j ? 1 : -1, swing = Math.sin(p.ph + (j ? Math.PI : 0)) * (k === 'leg' ? .55 : .6) * (go > 0 ? 1 : .08);
              e.set(swing, 0, k === 'arm' ? side * .1 : 0); q.setFromEuler(e); pos.set(side * (k === 'arm' ? .23 : .1), k === 'arm' ? 1.36 : .8, 0); scl.set(1, 1, 1); local.compose(pos, q, scl);
              im.setMatrixAt(id, m4.multiplyMatrices(base, local));
            } else im.setMatrixAt(id, base);
          });
        }
      }
      for (const k in meshes) meshes[k].instanceMatrix.needsUpdate = true;
    }
  };
}
