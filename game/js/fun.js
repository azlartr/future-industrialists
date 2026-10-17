import * as THREE from 'three';

/* Things to play with while walking the city: a football and a goal on the plaza, pigeons that scatter
   when the student runs at them, and glowing idea bulbs: walk into one and a problem from the city
   asks for an invention, which goes into the hackathon notebook. */
export const IDEAS = {
  riyadh: [
    { ic: '☀️', p: 'شمس الرياض حارّة على من ينتظر الباص.', o: ['مظلة بألواح شمسية تشغّل مروحة رذاذ', 'مقعد يبرّد نفسه بأنابيب ماء', 'شاشة تعرض وقت وصول الباص وحرارة الجو'] },
    { ic: '🚦', p: 'السيارات تنتظر طويلاً عند الإشارات.', o: ['إشارة ذكية تعدّ السيارات بالكاميرا', 'تطبيق يقترح طريقاً أقل زحمة', 'مسارات خاصة لباصات أكثر'] },
    { ic: '🧃', p: 'عبوات العصير الفارغة تملأ سلال المدرسة بعد الفسحة.', o: ['آلة تسترجع العبوات وتعطي نقاطاً', 'عبوة تُطوى وتصغر بعد الشرب', 'حاوية تفرز البلاستيك والكرتون وحدها'] }
  ],
  makkah: [
    { ic: '💦', p: 'هواء جدة رطب جداً.', o: ['جهاز يحوّل رطوبة الهواء إلى ماء شرب', 'مكيّف يبرّد بماء البحر', 'قماش يمتص العرق ويجف بسرعة'] },
    { ic: '🚲', p: 'نركب السيارة حتى للمسافات القصيرة.', o: ['دراجات مشتركة بمحطات شمسية', 'ممرات مشي مظللة بالنخيل', 'سكوتر كهربائي يُشحن من الشمس'] },
    { ic: '🥛', p: 'الحليب يحتاج تبريداً طوال الطريق إلى البقالة.', o: ['عبوة يتغير لونها إذا سخن الحليب', 'شاحنة تبريد تعمل بالطاقة الشمسية', 'ملصق ذكي يرسل حرارة العبوة للهاتف'] }
  ],
  qassim: [
    { ic: '🌴', p: 'سعف النخيل اليابس يُرمى كل موسم.', o: ['ألواح خشبية مضغوطة من السعف', 'أثاث وسلال عصرية من السعف', 'سماد عضوي يعيد الحياة للتربة'] },
    { ic: '💧', p: 'المزارع تستهلك ماءً كثيراً.', o: ['ري بالتنقيط تتحكم فيه حساسات', 'تطبيق يقيس رطوبة التربة', 'إعادة استخدام ماء غسيل التمور'] },
    { ic: '🍬', p: 'الحلويات تفسد بسرعة في الرطوبة.', o: ['علبة بطبقة تمتص الرطوبة', 'تاريخ صلاحية يتغير لونه', 'تغليف قابل للأكل من عجينة التمر'] }
  ],
  eastern: [
    { ic: '🏖️', p: 'البلاستيك المستعمل يصل إلى الشاطئ.', o: ['روبوت صغير ينظف الشاطئ', 'خيوط طباعة ثلاثية الأبعاد من البلاستيك', 'مكافأة لكل من يعيد عبوة'] },
    { ic: '⚓', p: 'الحاويات تنتظر طويلاً في الميناء.', o: ['ذكاء اصطناعي يرتّب الحاويات', 'رافعات ذاتية القيادة', 'تتبع كل حاوية لحظة بلحظة'] },
    { ic: '🔥', p: 'الشعلة تحرق الغاز الزائد في المصفاة.', o: ['تحويل الغاز الزائد إلى كهرباء', 'حبس الكربون وصنع طوب منه', 'حساسات تكشف التسرب مبكراً'] }
  ]
};

export function makeFun(scene, { region, plazaAt, ideaSpots = [], heightAt, colliders = [], boxes = [], done = {} }) {
  const anim = [];
  // ---- the football and the goal on the plaza
  let ball = null, goal = null;
  if (plazaAt) {
    const [c, x] = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; return [cv, cv.getContext('2d')]; })();
    x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#1b2263'; for (let i = 0; i < 12; i++) { x.beginPath(); const cx = (i * 83) % 256, cy = (i * 59) % 256; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.lineTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); } x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: .45 })); mesh.castShadow = true; scene.add(mesh);
    const [bx, bz] = plazaAt(-14, -2); ball = { mesh, p: new THREE.Vector3(bx, 1, bz), v: new THREE.Vector3(), home: new THREE.Vector3(bx, 1, bz) };
    // a small goal at the side of the plaza, facing in
    const [gx, gz] = plazaAt(-34, -6), [gx2, gz2] = plazaAt(-30, -6), gd = new THREE.Vector2(gx2 - gx, gz2 - gz).normalize(), yaw = Math.atan2(gd.x, gd.y);
    const post = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .4 }), g = new THREE.Group(); g.position.set(gx, .2, gz); g.rotation.y = yaw; scene.add(g);
    for (const s of [-1.8, 1.8]) { const pp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 10), post); pp.position.set(s, .8, 0); pp.castShadow = true; g.add(pp); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.7, 10), post); bar.rotation.z = Math.PI / 2; bar.position.y = 1.6; g.add(bar);
    const net = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 1.2), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .22, wireframe: true })); net.position.set(0, .8, -.6); g.add(net);
    goal = { x: gx, z: gz, fwd: gd, side: new THREE.Vector2(gd.y, -gd.x), cool: 0 };
    for (const s of [-1.8, 1.8]) colliders.push([gx + goal.side.x * s, gz + goal.side.y * s, .12]);
  }
  // ---- pigeons: a flock on the plaza, another near the school
  const flocks = [];
  const birdG = new THREE.SphereGeometry(.09, 8, 6).scale(1, .8, 1.6), wingG = new THREE.PlaneGeometry(.26, .12).translate(.13, 0, 0);
  const birdM = new THREE.MeshStandardMaterial({ color: '#8f96a3', roughness: .8 }), wingM = new THREE.MeshStandardMaterial({ color: '#6f7683', roughness: .8, side: THREE.DoubleSide });
  const addFlock = (x0, z0, n) => {
    const birds = []; for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); b.add(new THREE.Mesh(birdG, birdM)); const wl = new THREE.Mesh(wingG, wingM), wr = new THREE.Mesh(wingG, wingM); wr.rotation.y = Math.PI; b.add(wl, wr);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), birdM); head.position.set(0, .07, .13); b.add(head); scene.add(b);
      const hx = x0 + (Math.random() - .5) * 5, hz = z0 + (Math.random() - .5) * 5;
      birds.push({ b, wl, wr, head, home: new THREE.Vector3(hx, 0, hz), p: new THREE.Vector3(hx, heightAt(hx, hz) + .09, hz), v: new THREE.Vector3(), state: 'ground', t: Math.random() * 5, yaw: Math.random() * 7 });
    }
    flocks.push({ x: x0, z: z0, birds });
  };
  if (plazaAt) { const [fx, fz] = plazaAt(18, 8); addFlock(fx, fz, 8); }
  for (const [x, z] of ideaSpots.slice(0, 1)) addFlock(x + 6, z + 3, 6);
  // ---- idea bulbs
  const bulbs = [], list = IDEAS[region] || [];
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#ffd23f', emissive: '#ff9f0a', emissiveIntensity: .7, roughness: .15, transparent: true, opacity: .88 }), capM = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: .8, roughness: .3 });
  // a warm glow round the glass and a bright filament inside it
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const x = gc.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,90,.9)'); gr.addColorStop(.35, 'rgba(255,180,40,.35)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
  const glowM = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), filM = new THREE.MeshBasicMaterial({ color: '#fff4c4' });
  ideaSpots.slice(0, list.length).forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(.32, 20, 14).scale(1, 1.15, 1), glassM); glass.position.y = 2.2; g.add(glass);
    const fil = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 6, 16, Math.PI * 1.4), filM); fil.rotation.z = Math.PI * .8; glass.add(fil);
    const glow = new THREE.Sprite(glowM); glow.scale.setScalar(1.9); glass.add(glow);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, .22, 14), capM); cap.position.y = 1.86; g.add(cap);
    const halo = new THREE.Mesh(new THREE.RingGeometry(.45, .7, 32), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = .25; g.add(halo);
    const id = `idea-${region}-${i}`; g.visible = !done[id];
    bulbs.push({ g, glass, halo, x, z, i, id, idea: list[i] });
  });
  let t = 0;
  return {
    bulbs, get ball() { return ball; }, goal,
    /* the bulb within reach, if any */
    nearBulb(p) { return bulbs.find(b => b.g.visible && Math.hypot(p.x - b.x, p.z - b.z) < 1.6) || null; },
    take(b) { b.g.visible = false; },
    update(dt, p, speed, yaw, onGoal) {
      t += dt;
      // the ball: kicked by walking into it, rolls with friction, bounces off posts and walls
      if (ball) {
        const B = ball, dx = B.p.x - p.x, dz = B.p.z - p.z, d = Math.hypot(dx, dz);
        if (d < .6 && B.p.y < .2 + heightAt(B.p.x, B.p.z) + .4) { const k = speed > 3 ? 9 : 5.5, fx = Math.sin(yaw), fz = Math.cos(yaw); B.v.set(fx * k + dx / (d || 1) * 1.5, speed > 3 ? 3.2 : 1.6, fz * k + dz / (d || 1) * 1.5); }
        B.v.y -= 14 * dt; B.p.addScaledVector(B.v, dt);
        const gy = heightAt(B.p.x, B.p.z) + .22; if (B.p.y < gy) { B.p.y = gy; B.v.y = Math.abs(B.v.y) > 1.5 ? -B.v.y * .45 : 0; B.v.x *= .985; B.v.z *= .985; }
        const fr = Math.pow(.55, dt); B.v.x *= B.p.y <= gy + .01 ? fr : 1; B.v.z *= B.p.y <= gy + .01 ? fr : 1;
        for (const [cx, cz, cr] of colliders) { const ex = B.p.x - cx, ez = B.p.z - cz, ed = Math.hypot(ex, ez), m = cr + .22; if (ed < m && ed > 1e-4) { B.p.x = cx + ex / ed * m; B.p.z = cz + ez / ed * m; const nx = ex / ed, nz = ez / ed, vn = B.v.x * nx + B.v.z * nz; if (vn < 0) { B.v.x -= 1.7 * vn * nx; B.v.z -= 1.7 * vn * nz; } } }
        for (const [x0, z0, x1, z1] of boxes) { if (B.p.x > x0 - .22 && B.p.x < x1 + .22 && B.p.z > z0 - .22 && B.p.z < z1 + .22) { const m = Math.min(B.p.x - x0, x1 - B.p.x, B.p.z - z0, z1 - B.p.z); if (m === B.p.x - x0 || m === x1 - B.p.x) { B.v.x *= -.6; B.p.x = m === B.p.x - x0 ? x0 - .23 : x1 + .23; } else { B.v.z *= -.6; B.p.z = m === B.p.z - z0 ? z0 - .23 : z1 + .23; } } }
        const sp = Math.hypot(B.v.x, B.v.z); if (sp > .01) { B.mesh.rotation.x += B.v.z * dt / .22; B.mesh.rotation.z -= B.v.x * dt / .22; }
        B.mesh.position.copy(B.p);
        // a goal: behind the goal line, between the posts, under the bar
        if (goal) { goal.cool -= dt; const rx = B.p.x - goal.x, rz = B.p.z - goal.z, along = rx * goal.fwd.x + rz * goal.fwd.y, across = rx * goal.side.x + rz * goal.side.y;
          if (goal.cool <= 0 && along < -.05 && along > -1.2 && Math.abs(across) < 1.7 && B.p.y < 1.8) { goal.cool = 3; onGoal?.(); setTimeout(() => { B.p.copy(B.home); B.v.set(0, 0, 0); }, 1600); } }
        if (Math.hypot(B.p.x - B.home.x, B.p.z - B.home.z) > 90) { B.p.copy(B.home); B.v.set(0, 0, 0); }
      }
      // pigeons: peck about, take off when someone comes close, circle, and land again
      for (const f of flocks) for (const b of f.birds) {
        b.t -= dt; const dp = Math.hypot(p.x - b.p.x, p.z - b.p.z);
        if (b.state === 'ground') {
          b.head.position.y = .07 - (Math.sin(t * 9 + b.yaw * 3) > .6 ? .05 : 0); b.wl.rotation.z = .1; b.wr.rotation.z = -.1;
          if (b.t < 0) { b.t = 1 + Math.random() * 3; b.yaw += (Math.random() - .5) * 2; }
          if (dp < (speed > 3 ? 5.5 : 3.2)) { b.state = 'fly'; b.t = 4 + Math.random() * 3; const ax = (b.p.x - p.x) / (dp || 1), az = (b.p.z - p.z) / (dp || 1); b.v.set(ax * 4 + (Math.random() - .5) * 2, 4 + Math.random() * 2, az * 4 + (Math.random() - .5) * 2); }
        } else if (b.state === 'fly') {
          b.v.y -= dt * 1.2; b.p.addScaledVector(b.v, dt); const flap = Math.sin(t * 28 + b.yaw) * .9; b.wl.rotation.z = flap; b.wr.rotation.z = -flap; b.yaw = Math.atan2(b.v.x, b.v.z);
          if (b.t < 0) { b.state = 'land'; b.t = 6; }
        } else {
          const to = b.home.clone(); to.y = heightAt(to.x, to.z) + .09; const d = to.clone().sub(b.p), L = d.length();
          b.p.addScaledVector(d, Math.min(1, dt * 1.6 / Math.max(.5, L / 6))); const flap = Math.sin(t * 22 + b.yaw) * .7; b.wl.rotation.z = flap; b.wr.rotation.z = -flap; if (L > .2) b.yaw = Math.atan2(d.x, d.z);
          if (L < .15 || b.t < -6) { b.state = 'ground'; b.p.copy(to); }
          if (dp < 3 && L < 3) { b.state = 'fly'; b.t = 3; b.v.set((Math.random() - .5) * 4, 4, (Math.random() - .5) * 4); }
        }
        b.b.position.copy(b.p); b.b.rotation.y = b.yaw;
      }
      // bulbs bob and glow
      for (const b of bulbs) if (b.g.visible) { b.glass.position.y = 2.2 + Math.sin(t * 2 + b.i) * .12; b.glass.rotation.y = t; b.halo.material.opacity = .25 + Math.sin(t * 3 + b.i) * .12; b.halo.scale.setScalar(1 + Math.sin(t * 3 + b.i) * .1); }
    }
  };
}
