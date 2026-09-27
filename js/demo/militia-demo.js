// ===== 潜伏者 · 沙漠民兵 (Militia) 展示 Demo =====
import * as THREE from 'three';
import { TEAM } from '../config.js';
import { buildMilitiaMesh } from '../soldier_models/militia.js';

// ---------- 健壮性：全局错误捕获 ----------
const errBox = document.getElementById('err');
function reportError(msg) {
  if (errBox) {
    errBox.textContent += msg + '\n';
  }
  document.title = 'DEMO_ERR';
}
window.addEventListener('error', (e) => reportError(e.message || String(e)));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason?.message || String(e.reason)));

// ---------- URL 参数解析 ----------
const params = new URLSearchParams(window.location.search);
let currentAnim = params.get('anim') || 'idle';
if (!['idle', 'walk', 'aim'].includes(currentAnim)) currentAnim = 'idle';
let isExploded = params.get('explode') === '1';
let isWireframe = params.get('wire') === '1';
let isTurntable = params.get('turntable') === '1';

// ---------- Three.js 核心初始化 ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16181d);
scene.fog = new THREE.FogExp2(0x16181d, 0.035);

// ---------- 影棚灯光系统 ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 0.9));

// Key Light（主平行光，产生阴影）
const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
keyLight.position.set(2.4, 4.0, -2.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -2.5;
keyLight.shadow.camera.right = 2.5;
keyLight.shadow.camera.top = 2.5;
keyLight.shadow.camera.bottom = -2.5;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 15;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

// Fill Light（冷调补光，照亮背光面细节）
const fillLight = new THREE.DirectionalLight(0x8cb6e8, 0.45);
fillLight.position.set(-2.5, 2.0, 2.5);
scene.add(fillLight);

// Rim Light（暖色轮廓光，勾勒肩部、头巾与后背）
const rimLight = new THREE.DirectionalLight(0xffeedd, 0.65);
rimLight.position.set(-0.5, 3.0, 3.2);
scene.add(rimLight);

// ---------- 展示台地面 ----------
const stageRadius = 2.4;
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(stageRadius, 64),
  new THREE.MeshStandardMaterial({
    color: 0x1f2229,
    roughness: 0.85,
    metalness: 0.15,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 装饰光环（潜伏者暗红）
const ring = new THREE.Mesh(
  new THREE.RingGeometry(stageRadius - 0.03, stageRadius, 64),
  new THREE.MeshBasicMaterial({ color: 0xff5a4d, opacity: 0.4, transparent: true, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(ring);

// 细线地面辅助网格
const grid = new THREE.GridHelper(stageRadius * 2, 16, 0x363b48, 0x222630);
grid.position.y = 0.001;
scene.add(grid);

// ---------- 角色模型加载 ----------
const T = TEAM.B;
const militia = buildMilitiaMesh(T);

// 模型总父节点（用于转盘自动旋转）
const modelRoot = new THREE.Group();
modelRoot.add(militia.group);
scene.add(modelRoot);

// 缓存关键部件节点
const parts = {
  torso: militia.head.parent,
  head: militia.head,
  arms: militia.arms,
  legL: militia.legL,
  legR: militia.legR,
};

// 缓存原始基准位置（未发生偏移与动画时的坐标）
const basePos = {
  torso: parts.torso.position.clone(),
  head: parts.head.position.clone(),
  arms: parts.arms.position.clone(),
  legL: parts.legL.position.clone(),
  legR: parts.legR.position.clone(),
};

// 分解视图（爆炸图）各部件位移向量（远离机体中心）
const explodeVec = {
  torso: new THREE.Vector3(0, 0.06, 0.30),   // 躯干向后微退并微抬
  head:  new THREE.Vector3(0, 0.32, 0.04),   // 头部向上拉开适度距离
  arms:  new THREE.Vector3(0, 0.20, -0.60),  // 双臂持枪向前推出
  legL:  new THREE.Vector3(-0.38, -0.22, 0), // 左腿向左下移
  legR:  new THREE.Vector3(0.38, -0.22, 0),  // 右腿向右下移
};

// ---------- 相机与极简轨道控制 ----------
const DEFAULT_RADIUS = 3.6;
const DEFAULT_THETA = 1.35;        // 约 77 度，略微俯视
const DEFAULT_PHI = Math.PI - 0.45; // 正面在 -Z (phi=Math.PI)，-0.45 即正面 3/4 偏右侧观察位
const DEFAULT_TARGET = new THREE.Vector3(0, 0.9, 0); // 居中看胸腹部

let radius = DEFAULT_RADIUS, targetRadius = DEFAULT_RADIUS;
let theta = DEFAULT_THETA, targetTheta = DEFAULT_THETA;
let phi = DEFAULT_PHI, targetPhi = DEFAULT_PHI;
const target = DEFAULT_TARGET.clone();
const targetTarget = DEFAULT_TARGET.clone();

const cam = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);

function updateCamera() {
  radius += (targetRadius - radius) * 0.12;
  theta += (targetTheta - theta) * 0.12;
  phi += (targetPhi - phi) * 0.12;
  target.lerp(targetTarget, 0.12);

  const sinTheta = Math.sin(theta);
  cam.position.x = target.x + radius * sinTheta * Math.sin(phi);
  cam.position.y = target.y + radius * Math.cos(theta);
  cam.position.z = target.z + radius * sinTheta * Math.cos(phi);
  cam.lookAt(target);
}

// 尺寸自适应
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// 自定义轨道控制事件监听
let isDragging = false;
let dragButton = 0; // 0: 左键旋转, 2: 右键平移
let prevX = 0, prevY = 0;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  dragButton = e.button;
  prevX = e.clientX;
  prevY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  if (dragButton === 0) {
    // 左键轨道旋转
    targetPhi -= dx * 0.007;
    targetTheta = Math.max(0.12, Math.min(Math.PI * 0.9, targetTheta - dy * 0.007));
  } else if (dragButton === 2) {
    // 右键视野平移
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
    const rightX = cosPhi, rightZ = -sinPhi;
    const factor = radius * 0.0015;
    targetTarget.x -= rightX * dx * factor;
    targetTarget.z -= rightZ * dx * factor;
    targetTarget.y += dy * factor;
  }
});

const stopDrag = (e) => {
  if (isDragging) {
    isDragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
};
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetRadius = Math.max(1.4, Math.min(7.5, targetRadius + e.deltaY * 0.0035));
}, { passive: false });

// ---------- 动画状态机与平滑过渡 ----------
// 平滑当前姿态
const curPose = {
  torsoY: 0,
  torsoRotX: 0,
  torsoRotY: 0,
  headRotX: 0,
  headRotY: 0,
  armsRotX: 0,
  armsRotZ: 0,
  armsY: 0,
  legLRotX: 0,
  legRRotX: 0,
};

// 若以行走模式初始化，赋予利于分辨迈步的初始相位
let walkPhase = currentAnim === 'walk' ? Math.PI * 0.45 : 0;
let explodeProgress = isExploded ? 1.0 : 0.0;
const clock = new THREE.Clock();

function updateAnimation(dt) {
  const time = clock.getElapsedTime();
  const targetPose = {
    torsoY: 0,
    torsoRotX: 0,
    torsoRotY: 0,
    headRotX: 0,
    headRotY: 0,
    armsRotX: 0,
    armsRotZ: 0,
    armsY: 0,
    legLRotX: 0,
    legRRotX: 0,
  };

  // 根据当前动作状态计算期望目标姿态
  if (currentAnim === 'idle') {
    // 待机状态：柔和呼吸起伏 + 头部微动观察
    targetPose.torsoY = Math.sin(time * 2.2) * 0.012;
    targetPose.headRotY = Math.sin(time * 1.1) * 0.06;
    targetPose.headRotX = Math.sin(time * 2.2) * 0.025;
    targetPose.armsY = Math.sin(time * 2.2) * 0.008;
  } else if (currentAnim === 'walk') {
    // 行走状态：双腿反相大摆动 + 身体前倾与颠簸 + 躯干微扭 + 双臂反相摆动
    walkPhase += dt * 5.6;
    targetPose.legLRotX = Math.sin(walkPhase) * 0.78;
    targetPose.legRRotX = -Math.sin(walkPhase) * 0.78;
    targetPose.torsoY = -Math.abs(Math.sin(walkPhase)) * 0.04;
    targetPose.torsoRotX = 0.08; // 行进前倾
    targetPose.torsoRotY = Math.sin(walkPhase) * 0.07; // 跨步躯干微扭
    targetPose.armsRotX = Math.sin(walkPhase) * 0.18;
    targetPose.armsRotZ = Math.cos(walkPhase) * 0.03;
    targetPose.headRotY = Math.sin(walkPhase * 0.5) * 0.05;
  } else if (currentAnim === 'aim') {
    // 瞄准状态：双臂抬平托举 AK-47 指向 -Z 水平线 + 头部跟随俯仰 + 姿态收紧微屈膝
    targetPose.armsRotX = -0.08 + Math.sin(time * 2.0) * 0.01;
    targetPose.armsRotZ = 0.015;
    targetPose.headRotX = targetPose.armsRotX * 0.45;
    targetPose.torsoY = -0.018;
    targetPose.torsoRotX = 0.03;
    targetPose.legLRotX = 0.08;
    targetPose.legRRotX = -0.08;
  }

  // 关节平滑缓动插值（平滑过渡，无任何突跳）
  const blend = Math.min(1.0, dt * 10.0);
  for (const k in curPose) {
    curPose[k] += (targetPose[k] - curPose[k]) * blend;
  }

  // 分解视图（爆炸图）平滑缓动
  const targetExp = isExploded ? 1.0 : 0.0;
  explodeProgress += (targetExp - explodeProgress) * Math.min(1.0, dt * 6.0);

  // 应用位置与旋转到各部件
  parts.torso.position.set(
    basePos.torso.x + explodeVec.torso.x * explodeProgress,
    basePos.torso.y + explodeVec.torso.y * explodeProgress + curPose.torsoY,
    basePos.torso.z + explodeVec.torso.z * explodeProgress
  );
  parts.torso.rotation.set(curPose.torsoRotX, curPose.torsoRotY, 0);

  parts.head.position.set(
    basePos.head.x + explodeVec.head.x * explodeProgress,
    basePos.head.y + explodeVec.head.y * explodeProgress,
    basePos.head.z + explodeVec.head.z * explodeProgress
  );
  parts.head.rotation.set(curPose.headRotX, curPose.headRotY, 0);

  parts.arms.position.set(
    basePos.arms.x + explodeVec.arms.x * explodeProgress,
    basePos.arms.y + explodeVec.arms.y * explodeProgress + curPose.armsY,
    basePos.arms.z + explodeVec.arms.z * explodeProgress
  );
  parts.arms.rotation.set(curPose.armsRotX, 0, curPose.armsRotZ);

  parts.legL.position.set(
    basePos.legL.x + explodeVec.legL.x * explodeProgress,
    basePos.legL.y + explodeVec.legL.y * explodeProgress,
    basePos.legL.z + explodeVec.legL.z * explodeProgress
  );
  parts.legL.rotation.x = curPose.legLRotX;

  parts.legR.position.set(
    basePos.legR.x + explodeVec.legR.x * explodeProgress,
    basePos.legR.y + explodeVec.legR.y * explodeProgress,
    basePos.legR.z + explodeVec.legR.z * explodeProgress
  );
  parts.legR.rotation.x = curPose.legRRotX;

  // 转盘旋转更新
  if (isTurntable) {
    modelRoot.rotation.y += dt * 0.6;
  } else {
    modelRoot.rotation.y += (0 - modelRoot.rotation.y) * Math.min(1.0, dt * 5.0);
  }
}

// ---------- 线框模式切换 ----------
function setWireframe(enabled) {
  militia.group.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.wireframe = !!enabled;
    }
  });
}
if (isWireframe) setWireframe(true);

// ---------- UI 状态同步与交互绑定 ----------
// 动画按钮组
const animButtons = document.querySelectorAll('#anim-group .ctrl-btn');
function setAnim(name) {
  currentAnim = name;
  animButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.anim === name);
  });
}
animButtons.forEach((btn) => {
  btn.addEventListener('click', () => setAnim(btn.dataset.anim));
});
setAnim(currentAnim);

// 转盘按钮
const btnTurntable = document.getElementById('btn-turntable');
btnTurntable.classList.toggle('active', isTurntable);
btnTurntable.addEventListener('click', () => {
  isTurntable = !isTurntable;
  btnTurntable.classList.toggle('active', isTurntable);
});

// 分解视图按钮
const btnExplode = document.getElementById('btn-explode');
btnExplode.classList.toggle('active', isExploded);
btnExplode.addEventListener('click', () => {
  isExploded = !isExploded;
  btnExplode.classList.toggle('active', isExploded);
});

// 线框按钮
const btnWire = document.getElementById('btn-wire');
btnWire.classList.toggle('active', isWireframe);
btnWire.addEventListener('click', () => {
  isWireframe = !isWireframe;
  btnWire.classList.toggle('active', isWireframe);
  setWireframe(isWireframe);
});

// 视角重置按钮
const btnResetCam = document.getElementById('btn-reset-cam');
btnResetCam.addEventListener('click', () => {
  targetRadius = DEFAULT_RADIUS;
  targetTheta = DEFAULT_THETA;
  targetPhi = DEFAULT_PHI;
  targetTarget.copy(DEFAULT_TARGET);
});

// 信息侧栏折叠/展开
const sidebar = document.getElementById('info-sidebar');
const btnCloseSidebar = document.getElementById('close-sidebar-btn');
const btnToggleSidebar = document.getElementById('toggle-sidebar-btn');

btnCloseSidebar.addEventListener('click', () => {
  sidebar.classList.add('collapsed');
});
btnToggleSidebar.addEventListener('click', () => {
  sidebar.classList.remove('collapsed');
});

// ---------- 主渲染循环与 DEMO_OK 信号 ----------
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  updateCamera();
  updateAnimation(dt);
  renderer.render(scene, cam);

  // 正常渲染满 5 帧后，设置 document.title = 'DEMO_OK'，作为无头验证依据
  if (++frames === 5) {
    document.title = 'DEMO_OK';
    window.__ready = true;
  }
}
animate();
