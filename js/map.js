// ===== 运输船地图：甲板、集装箱、基地、路点网格 =====
// 坐标系: X = 左舷(-)/右舷(+), Z = 船头(-)/船尾(+), 甲板面 y=0
import * as THREE from 'three';
import { makeAABB, rayAABB, segmentClear, rand, pick } from './utils.js';

const CONTAINER_COLORS = [
  ['#a03d2e', 'HORIZON'], ['#2e5aa0', 'PACIFIC'], ['#3d7a3d', 'EVERGREEN'],
  ['#b06a28', 'GLOBAL'], ['#68707a', 'SEALAND'], ['#7a4a3a', 'OCEANIC'],
];

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}

function containerTexture(color, label) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    // 波纹板
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 5, h);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 8, 0, 3, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, h - 26, w, 26);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'bold 52px Arial'; g.textAlign = 'center';
    g.fillText(label, w / 2, h / 2 + 10);
    g.font = 'bold 20px Arial';
    g.fillText('MAX GROSS 30480 KG', w / 2, h / 2 + 44);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    g.strokeRect(30, 24, w - 60, h - 60);
    // 锈迹
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(60,30,15,${rand(0.08, 0.25)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), rand(6, 30), 0, 7);
      g.fill();
    }
  });
}

export function buildWorld(scene) {
  const colliders = [];
  const minimap = [];   // {x,z,w,d,h}
  const dynamic = { t: 0 };

  const world = {
    colliders, minimap,
    spawns: { A: [], B: [] },
    waypoints: { nodes: [] },
    deckBounds: { x: 12, z: 42 },
    update, nearestNode,
  };

  // ---------- 材质 ----------
  const texDeck = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#4a5158'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rand(20, 70)},${rand(25, 70)},${rand(30, 75)},0.25)`;
      g.fillRect(rand(0, w), rand(0, h), rand(1, 4), rand(1, 4));
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(220,180,60,0.5)';
    g.fillRect(w / 2 - 4, 0, 8, h);
  }, [6, 20]);

  const texMetal = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5c6670'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(0,0,0,${rand(0.03, 0.12)})`;
      g.fillRect(rand(0, w), rand(0, h), rand(2, 20), rand(1, 3));
    }
    g.fillStyle = 'rgba(140,200,235,0.75)';
    for (let x = 18; x < w - 30; x += 44) g.fillRect(x, 70, 28, 34); // 舷窗带
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h - 20, w, 20);
  });

  const texWood = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8a6a42'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 36) {
      g.fillStyle = `rgba(0,0,0,${rand(0.1, 0.25)})`; g.fillRect(0, y, w, 3);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = `rgba(${rand(90, 130)},${rand(60, 90)},${rand(30, 50)},0.35)`;
        g.fillRect(rand(0, w), y + 4, rand(10, 60), 30);
      }
    }
    g.strokeStyle = 'rgba(40,25,10,0.8)'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  });

  const texWater = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#0d2a3d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${rand(60, 120)},${rand(140, 190)},${rand(180, 220)},${rand(0.06, 0.22)})`;
      g.lineWidth = rand(1, 2.5);
      g.beginPath();
      const y = rand(0, h), x = rand(-40, w);
      g.moveTo(x, y);
      g.bezierCurveTo(x + 30, y - rand(2, 7), x + 60, y + rand(2, 7), x + rand(80, 130), y);
      g.stroke();
    }
  }, [24, 24]);

  const matDeck = new THREE.MeshPhongMaterial({ map: texDeck, shininess: 8 });
  const matMetal = new THREE.MeshPhongMaterial({ map: texMetal, shininess: 30 });
  const matWood = new THREE.MeshPhongMaterial({ map: texWood, shininess: 5 });
  const matDark = new THREE.MeshPhongMaterial({ color: 0x33393f, shininess: 12 });
  const matHull = new THREE.MeshPhongMaterial({ color: 0x3a2f2a, shininess: 20 });
  const matRust = new THREE.MeshPhongMaterial({ color: 0x6b4a35, shininess: 8 });
  const matWhite = new THREE.MeshPhongMaterial({ color: 0xd8d4c8, shininess: 25 });
  const containerMats = CONTAINER_COLORS.map(([c, l]) =>
    new THREE.MeshPhongMaterial({ map: containerTexture(c, l), shininess: 14 }));

  // ---------- 基础工具 ----------
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  function box(x, y, z, w, h, d, mat, opt = {}) {
    const { collide = true, mini = true, cast = true, receive = true } = opt;
    const m = new THREE.Mesh(geoBox, mat);
    m.position.set(x, y + h / 2, z);
    m.scale.set(w, h, d);
    m.castShadow = cast; m.receiveShadow = receive;
    scene.add(m);
    if (collide) colliders.push(makeAABB(x, y + h / 2, z, w, h, d));
    if (mini) minimap.push({ x, z, w, d, h: y + h });
    return m;
  }
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  function cylinder(x, y, z, r, h, mat, opt = {}) {
    const m = new THREE.Mesh(cyl, mat);
    m.position.set(x, y + h / 2, z);
    m.scale.set(r, h, r);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    if (opt.collide !== false) colliders.push(makeAABB(x, y + h / 2, z, r * 1.7, h, r * 1.7));
    if (opt.mini !== false) minimap.push({ x, z, w: r * 2, d: r * 2, h: y + h });
    return m;
  }

  // ---------- 天空 / 太阳 / 雾 ----------
  scene.fog = new THREE.FogExp2(0x27384a, 0.0042);
  const texSky = canvasTexture(1024, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#16283f'); grad.addColorStop(0.42, '#2c5379');
    grad.addColorStop(0.62, '#5d7086'); grad.addColorStop(0.72, '#e09a52');
    grad.addColorStop(0.8, '#4a4a5c'); grad.addColorStop(1, '#1a2430');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const sx = w * 0.28, sy = h * 0.68;
    const sun = g.createRadialGradient(sx, sy, 0, sx, sy, 130);
    sun.addColorStop(0, 'rgba(255,230,170,0.95)'); sun.addColorStop(0.25, 'rgba(255,180,90,0.5)');
    sun.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(sx, sy, 130, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { // 云
      g.fillStyle = `rgba(${rand(30, 60)},${rand(35, 60)},${rand(50, 75)},${rand(0.12, 0.3)})`;
      g.beginPath();
      g.ellipse(rand(0, w), rand(h * 0.08, h * 0.5), rand(40, 150), rand(8, 22), 0, 0, 7);
      g.fill();
    }
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(780, 24, 16),
    new THREE.MeshBasicMaterial({ map: texSky, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  // 独立动态云层球（半透明漂移云层）
  const texClouds = canvasTexture(1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) {
      const alpha = rand(0.15, 0.32);
      const gray = Math.floor(rand(200, 245));
      g.fillStyle = `rgba(${gray},${gray},${Math.min(255, gray + 8)},${alpha})`;
      const cx = rand(0, w);
      const cy = rand(h * 0.08, h * 0.5);
      const rx = rand(50, 150);
      const ry = rand(10, 26);
      const drawCloud = (x) => {
        g.beginPath();
        g.ellipse(x, cy, rx, ry, 0, 0, 7);
        g.fill();
      };
      drawCloud(cx);
      if (cx - rx < 0) drawCloud(cx + w);
      if (cx + rx > w) drawCloud(cx - w);
    }
  });
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.MeshBasicMaterial({
      map: texClouds,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  scene.add(clouds);
  dynamic.clouds = clouds;

  // 海面
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshPhongMaterial({ map: texWater, color: 0x9fb8c8, shininess: 50, specular: 0x33495a })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -4.2;
  scene.add(water);

  // ---------- 灯光 ----------
  const sun = new THREE.DirectionalLight(0xffd9a8, 3.4);
  sun.position.set(-45, 60, -70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
  sun.shadow.camera.far = 240; sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fb8d0, 0x3a352c, 1.3));
  world.sun = sun;

  // ---------- 船体 ----------
  // ---------- 甲板（中央整块 + 两侧地道带分段镂空，兼作地道顶） ----------
  const STRIP_X = 9.4, HULL_X = 12.6;        // 地道带 x 范围 [±9.4, ±12.6]
  const TUN_Z = 24.0, STAIR_Z = 28.0;        // 地道贯通段 |z|≤24 / 阶梯井口 |z|∈[24,28]
  const TUN_FLOOR = -3.4, DECK_B = -1.2;     // 地道地面 / 甲板底(地道顶)，净高 2.2m
  box(0, DECK_B, 0, STRIP_X * 2, 1.2, 85.2, matDark, { mini: false, cast: false });
  const deckSegs = [[-42.6, -STAIR_Z], [-TUN_Z, TUN_Z], [STAIR_Z, 42.6]];
  for (const sx of [-1, 1]) {
    const cx = sx * (STRIP_X + HULL_X) / 2;  // ±11
    for (const [z0, z1] of deckSegs) {
      box(cx, DECK_B, (z0 + z1) / 2, HULL_X - STRIP_X, 1.2, z1 - z0, matDark, { mini: false, cast: false });
    }
  }
  // 甲板视觉面按碰撞分段铺设（克隆纹理并换算 repeat/offset，保持黄中线在 x=0）
  const deckPiece = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0;
    const t = texDeck.clone();
    t.needsUpdate = true;
    t.repeat.set(6 * w / 25.2, 20 * d / 85.2);
    t.offset.set(6 * (x0 + 12.6) / 25.2, 20 * (42.6 - z1) / 85.2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshPhongMaterial({ map: t, shininess: 8 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
    m.receiveShadow = true;
    scene.add(m);
  };
  deckPiece(-STRIP_X, STRIP_X, -42.6, 42.6);
  for (const sx of [-1, 1]) for (const [z0, z1] of deckSegs) {
    deckPiece(Math.min(sx * STRIP_X, sx * HULL_X), Math.max(sx * STRIP_X, sx * HULL_X), z0, z1);
  }

  // ---------- 两侧地道：在侧面集装箱附近出入口，快速穿插偷袭 ----------
  const matLamp = new THREE.MeshBasicMaterial({ color: 0xffd9a8 });
  for (const sx of [-1, 1]) {
    const cx = sx * (STRIP_X + HULL_X) / 2;          // ±11
    const w = HULL_X - STRIP_X;                      // 3.2
    // 地面 / 内壁 / 外壁（墙体从 y=-3.9 封到甲板底，覆盖阶梯井口段 |z|≤28）
    // 台阶段长度 3.05m，井口脚下留 0.95m 平地缓冲，避免登第一级台阶时头顶被甲板沿挡回
    const STAIR_RUN = 3.05;
    box(cx, TUN_FLOOR - 0.5, 0, w, 0.5, (STAIR_Z - STAIR_RUN) * 2, matDark, { mini: false, cast: false });
    box(sx * (STRIP_X + 0.15), -3.9, 0, 0.3, DECK_B + 3.9, STAIR_Z * 2, matMetal, { mini: false, cast: false });
    box(sx * (HULL_X - 0.15), -3.9, 0, 0.3, DECK_B + 3.9, STAIR_Z * 2, matMetal, { mini: false, cast: false });
    // 两端阶梯井：6 级实心台阶从甲板(y=0)下到地道(y=-3.4)，级高≈0.486 可直接走上
    const STEPS = 6, riseH = -TUN_FLOOR / 7, run = STAIR_RUN / STEPS;
    for (const sz of [-1, 1]) {
      for (let i = 0; i < STEPS; i++) {
        const top = -(STEPS - i) * riseH;
        box(cx, -3.9, sz * (STAIR_Z - STAIR_RUN + (i + 0.5) * run), w, top + 3.9, run + 0.02, matMetal, { mini: false, cast: false });
      }
      // 井口末端封口墙（甲板下方）
      box(cx, -3.9, sz * STAIR_Z, w, DECK_B + 3.9, 0.3, matMetal, { mini: false, cast: false });
    }
    // 地道照明灯带（视觉）+ 点光源
    for (const lz of [-16, 0, 16]) {
      box(cx, DECK_B - 0.06, lz, 0.5, 0.06, 1.6, matLamp, { collide: false, mini: false, cast: false, receive: false });
    }
    for (const lz of [-12, 12]) {
      const pl = new THREE.PointLight(0xffc98a, 5, 18, 1.8);
      pl.position.set(cx, -1.6, lz);
      scene.add(pl);
    }
  }
  box(0, -4.9, 0, 27.5, 4.0, 87.5, matHull, { collide: false, mini: false, cast: false }); // 船体水线
  // 船头楔形
  const bow = new THREE.Mesh(geoBox, matHull);
  bow.scale.set(18, 4, 14); bow.position.set(0, -1.6, -48); bow.rotation.y = Math.PI / 4;
  scene.add(bow);

  // 隐形围墙（防止落水）
  colliders.push(makeAABB(-12.35, 2, 0, 0.6, 5, 86));
  colliders.push(makeAABB(12.35, 2, 0, 0.6, 5, 86));
  colliders.push(makeAABB(0, 2, -41.9, 26, 5, 0.6));
  colliders.push(makeAABB(0, 2, 41.9, 26, 5, 0.6));

  // 栏杆
  const railMat = matWhite;
  for (const sx of [-12.1, 12.1]) {
    for (let z = -40; z <= 40; z += 4) {
      box(sx, 0, z, 0.09, 1.08, 0.09, railMat, { collide: false, mini: false, cast: false });
    }
    box(sx, 1.02, 0, 0.1, 0.08, 82, railMat, { collide: false, mini: false, cast: false });
  }

  // ---------- 集装箱 ----------
  const CW = 2.44, CH = 2.59;
  function container(cx, cz, along, len = 6.06, yOff = 0, colorIdx = -1) {
    const mat = colorIdx >= 0 ? containerMats[colorIdx] : pick(containerMats);
    const w = along === 'x' ? len : CW;
    const d = along === 'x' ? CW : len;
    const m = box(cx, yOff, cz, w, CH, d, mat);
    if (along === 'x') m.rotation.y = 0;
    return m;
  }
  function crate(x, z, s = 1.15, yOff = 0) { box(x, yOff, z, s, s, s, matWood); }
  function barrel(x, z) { cylinder(x, 0, z, 0.42, 1.05, matRust); }

  // 台阶式坡道（沿 z 方向爬升，dir=+1 表示从 +z 侧上坡）
  function rampZ(cx, zTop, dir, topH = CH, width = 3.2) {
    const steps = 5, run = 1.9;
    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * (topH / steps);
      const z = zTop + dir * (run - (i + 0.5) * (run / steps));
      box(cx, 0, z, width, h, run / steps + 0.02, matWood);
    }
  }

  // ---------- 基地（船尾 = 保卫者 A / 船头 = 潜伏者 B，点对称） ----------
  for (const s of [1, -1]) {
    const zs = (v) => v * s;
    // 舰桥楼
    box(0, 0, zs(40.5), 18, 5.2, 3, matMetal);
    box(0, 5.2, zs(40.8), 10, 2.6, 2.4, matWhite);
    // 桅杆 + 雷达
    cylinder(0, 7.8, zs(41), 0.18, 4.5, matDark, { mini: false });
    const radar = box(0, 10.6, zs(41), 2.6, 0.5, 0.4, matWhite, { collide: false, mini: false });
    (dynamic.radars ||= []).push(radar);
    // 烟囱（靠舷尾端，避开两侧地道阶梯井口）
    cylinder(-10.5, 0, zs(41.5), 1.1, 7, matRust);
    cylinder(10.5, 0, zs(41.5), 1.1, 7, matRust);
    // 基地掩体墙 W1（三段集装箱，两个 4m 缺口）
    container(-9, zs(33.5), 'x', 5);
    container(0, zs(33.5), 'x', 5);
    container(9, zs(33.5), 'x', 5);
    // 出生点
    const sp = s > 0 ? world.spawns.A : world.spawns.B;
    for (const [sx, sz] of [[-8, 36.4], [-4, 37.6], [0, 36.6], [4, 37.6], [8, 36.4], [-2, 38.4], [2, 38.4]]) {
      sp.push(new THREE.Vector3(sx, 0, zs(sz)));
    }
  }

  // ---------- 中场 ----------
  // 中路双箱（沿 z，长 10）
  container(-4.5, 0, 'z', 10, 0, 0);
  container(4.5, 0, 'z', 10, 0, 1);
  // 中央高台（横向集装箱 + 双侧坡道）
  container(0, 0, 'x', 6, 0, 4);
  rampZ(0, 1.22, 1);
  rampZ(0, -1.22, -1);
  crate(-1.8, 0, 0.85, CH);   // 台上掩体木箱
  crate(1.8, 0, 0.85, CH);
  minimap.push({ x: 0, z: 0, w: 6, d: 2.44, h: CH });

  // z=±12 横向隔断墙（交错）
  container(-6.5, 12, 'x', 6, 0, 2);
  container(6.5, 12, 'x', 6, 0, 3);
  container(6.5, -12, 'x', 6, 0, 2);
  container(-6.5, -12, 'x', 6, 0, 3);

  // z=±22 纵向侧墙
  container(-8, 22, 'z', 6, 0, 5);
  container(8, 22, 'z', 6, 0, 0);
  container(8, -22, 'z', 6, 0, 5);
  container(-8, -22, 'z', 6, 0, 0);

  // 木箱掩体群（三档规格，点对称布局）：
  // 1. 矮箱（宽深 1.15m、高 0.8m）：低于跳跃极限约 0.97m（jump=5.4、gravity=15），玩家可直接跳上作为射击平台
  // 2. 中箱（宽深 1.15m、高 1.45m）：大于 0.97m 跳跃极限无法直接跳上，高于蹲姿(1.28m)提供蹲伏掩护；在 x=±9 处与旁边矮箱衔接构成 0.8m→1.45m 阶梯
  // 3. 高箱（宽深 1.35m、高 2.1m）：高于站立身高(1.75m)提供完全掩护；取代原双层堆叠箱
  const lowCrates = [
    [-10.4, 6], [10.4, -6],
    [-2.2, 8.6], [2.2, -8.6],
    [-6.8, 17.5], [6.8, -17.5],
  ];
  for (const [x, z] of lowCrates) box(x, 0, z, 1.15, 0.8, 1.15, matWood);

  const midCrates = [
    [-9.1, 6.2], [9.1, -6.2],
  ];
  for (const [x, z] of midCrates) box(x, 0, z, 1.15, 1.45, 1.15, matWood);

  const highCrates = [
    [-10.2, -4.5], [10.2, 4.5],
    [0.6, 18.5], [-0.6, -18.5],
  ];
  for (const [x, z] of highCrates) box(x, 0, z, 1.35, 2.1, 1.35, matWood);

  // 四处井口外侧留出 0.75m 通路，再由矮箱→中箱→高箱跃上侧面集装箱
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(sx * 7.5, 0, sz * 30.1, 1.3, 0.8, 1.3, matWood);
    box(sx * 7.5, 0, sz * 28, 1.3, 1.45, 1.3, matWood);
    box(sx * 7.5, 0, sz * 26, 1.4, 2.1, 1.4, matWood);
    box(sx * 12, 0, sz * 29.15, 0.65, 1.35, 0.55, matMetal);
    box(sx * 8, CH, sz * 21.3, 1.85, 0.85, 0.25, matMetal);
  }

  // 油桶
  for (const [x, z] of [[-11.2, -14], [-10.4, -13.4], [-11, -12.8], [11.2, 14], [10.4, 13.4], [11, 12.8],
                        [5.2, 28.5], [-5.2, -28.5], [-9.5, 30], [9.5, -30]]) barrel(x, z);

  // 甲板系缆桩
  for (const z of [-36, -18, 0.01, 18, 36]) {
    cylinder(-12.2, 0, z, 0.22, 0.55, matDark, { mini: false });
    cylinder(12.2, 0, z, 0.22, 0.55, matDark, { mini: false });
  }

  // 旗帜（桅顶，动画）
  const flagGeo = new THREE.PlaneGeometry(1.6, 1, 8, 5);
  const texFlag = canvasTexture(128, 80, (g, w, h) => {
    g.fillStyle = '#b03030'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8b64c'; g.font = 'bold 34px Arial'; g.textAlign = 'center';
    g.fillText('★', w / 2, h / 2 + 12);
  });
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshPhongMaterial({ map: texFlag, side: THREE.DoubleSide }));
  flag.position.set(0.85, 11.6, 41);
  scene.add(flag);
  dynamic.flag = flag;

  // ---------- 路点网格 ----------
  buildWaypoints(world);

  // ---------- 动画 ----------
  function update(dt) {
    dynamic.t += dt;
    texWater.offset.set(dynamic.t * 0.008, dynamic.t * 0.013);
    if (dynamic.flag) {
      const pos = dynamic.flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(x * 3.5 + dynamic.t * 6) * 0.09 * (x + 0.8));
      }
      pos.needsUpdate = true;
    }
    if (dynamic.radars) for (const r of dynamic.radars) r.rotation.y += dt * 0.8;
    if (dynamic.clouds) dynamic.clouds.rotation.y += dt * 0.005;

    // 太阳光照与位置缓慢起伏
    dynamic.sunT = (dynamic.sunT || 0) + dt;
    sun.position.set(-45 + Math.sin(dynamic.sunT * 0.02) * 10, 60, -70 + Math.cos(dynamic.sunT * 0.014) * 8);
    sun.intensity = 3.4 + Math.sin(dynamic.sunT * 0.05) * 0.35;
  }

  return world;
}

// ===== 路点：网格 + 可站立检测 + 视线连边 =====
function buildWaypoints(world) {
  const { colliders } = world;
  const nodes = [];
  const grid = new Map();
  const STEP = 2;
  const down = new THREE.Vector3(0, -1, 0);
  const o = new THREE.Vector3();

  function groundTopAt(x, z) {
    o.set(x, 5.3, z);
    let best = null;
    for (const c of colliders) {
      const t = rayAABB(o, down, c, 9);
      if (t >= 0) {
        const y = 5.3 - t;
        if (best === null || y > best) best = y;
      }
    }
    return best;
  }

  const bodyBox = { min: new THREE.Vector3(), max: new THREE.Vector3() };
  function standable(x, y, z) {
    if (y < -0.2 || y > 3.0) return false;
    bodyBox.min.set(x - 0.33, y + 0.05, z - 0.33);
    bodyBox.max.set(x + 0.33, y + 1.7, z + 0.33);
    for (const c of colliders) {
      if (bodyBox.min.x < c.max.x && bodyBox.max.x > c.min.x &&
          bodyBox.min.y < c.max.y && bodyBox.max.y > c.min.y &&
          bodyBox.min.z < c.max.z && bodyBox.max.z > c.min.z) return false;
    }
    return true;
  }

  for (let gx = -11; gx <= 11; gx += STEP) {
    for (let gz = -38; gz <= 38; gz += STEP) {
      const gy = groundTopAt(gx, gz);
      if (gy === null || !standable(gx, gy, gz)) continue;
      const idx = nodes.length;
      nodes.push({ pos: new THREE.Vector3(gx, gy, gz), edges: [] });
      grid.set(`${gx},${gz}`, idx);
    }
  }

  // 连边：八方向，高差≤0.58，胸口视线通畅
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const [key, idx] of grid) {
    const [gx, gz] = key.split(',').map(Number);
    const n1 = nodes[idx];
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [2, -2], [-2, 2], [-2, -2]]) {
      const j = grid.get(`${gx + dx},${gz + dz}`);
      if (j === undefined) continue;
      const n2 = nodes[j];
      const dy = Math.abs(n1.pos.y - n2.pos.y);
      if (dy > 0.58) continue;
      a.copy(n1.pos); a.y += 1.15;
      b.copy(n2.pos); b.y += 1.15;
      if (!segmentClear(a, b, colliders)) continue;
      const cost = n1.pos.distanceTo(n2.pos);
      n1.edges.push({ to: j, cost });
    }
  }

  world.waypoints.nodes = nodes;
}

function nearestNode(pos) {
  const nodes = this.waypoints.nodes;
  let best = -1, bd = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const d = nodes[i].pos.distanceToSquared(pos);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
