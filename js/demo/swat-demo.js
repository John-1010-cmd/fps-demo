// ===== 保卫者 · SWAT 特警 独立展示 DEMO =====
import * as THREE from 'three';
import { TEAM } from '../config.js';
import { buildSwatMesh } from '../soldier_models/swat.js';

// 错误捕获
const errBox = document.getElementById('err');
function reportError(msg) {
  if (errBox) {
    errBox.textContent += msg + '\n';
    errBox.style.display = 'block';
  }
  document.title = 'DEMO_ERR';
}
window.addEventListener('error', (e) => reportError(e.message || String(e)));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason?.message || String(e.reason)));

// URL 参数解析
const params = new URLSearchParams(window.location.search);
const animParam = params.get('anim'); // 'walk' | 'aim' | 'idle'
const explodeParam = params.get('explode') === '1' || params.get('explode') === 'true';
const wireParam = params.get('wire') === '1' || params.get('wire') === 'true';
const turntableParam = params.get('turntable') === '1' || params.get('turntable') === 'true';

// 画布与渲染器
const canvas = document.getElementById('gl');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 场景与环境
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16181d);
scene.fog = new THREE.FogExp2(0x16181d, 0.04);

// 灯光配置（照抄并微调 model-review.js）
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x556075, 0.85);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
keyLight.position.set(2.2, 3.8, -2.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -2.5;
keyLight.shadow.camera.right = 2.5;
keyLight.shadow.camera.top = 2.5;
keyLight.shadow.camera.bottom = -2.5;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 10;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.40);
fillLight.position.set(-2, 2, 2.5);
scene.add(fillLight);

// 影棚展示地台
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.35, 64),
  new THREE.MeshPhongMaterial({
    color: 0x222630,
    specular: 0x3d5080,
    shininess: 15,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 地台边圈微光
const rimMesh = new THREE.Mesh(
  new THREE.RingGeometry(2.33, 2.36, 64),
  new THREE.MeshBasicMaterial({ color: 0x4da3ff, side: THREE.DoubleSide })
);
rimMesh.rotation.x = -Math.PI / 2;
rimMesh.position.y = 0.001;
scene.add(rimMesh);

// 构建 SWAT 角色模型
const T = TEAM.A;
const built = buildSwatMesh(T);
scene.add(built.group);

// 提取各顶级部件用于动画与爆炸图
const { legL, legR, arms, head } = built;
const torso = head.parent; // head 在 swat.js 中挂在 torso 下

// 原始坐标备份
const BASE = {
  legL: { x: -0.12, y: 0.82, z: 0 },
  legR: { x: 0.12, y: 0.82, z: 0 },
  torso: { x: 0, y: 0.82, z: 0 },
  head: { x: 0, y: 0.58, z: 0 },
  arms: { x: 0, y: 1.32, z: 0 },
};

// 爆炸图偏移目标（沿质心向外远离中心，保持在视口完整构图内）
const EXPLODE_DIR = {
  legL: { x: -0.30, y: -0.18, z: 0 },
  legR: { x: 0.30, y: -0.18, z: 0 },
  torso: { x: 0, y: 0.08, z: 0.26 },
  head: { x: 0, y: 0.20, z: 0 },
  arms: { x: 0, y: 0.12, z: -0.32 },
};

// 状态控制
let actionState = animParam === 'walk' ? 'walk' : (animParam === 'aim' ? 'aim' : 'idle');
let turntableActive = turntableParam;
let isWireframe = wireParam;
let targetExplode = explodeParam ? 1.0 : 0.0;
let curExplodeFactor = explodeParam ? 1.0 : 0.0;

// 动态关节插值变量（保证切换无瞬跳）
let curTorsoY = 0;
let curHeadPitch = 0, curHeadYaw = 0;
let curArmsPitch = 0, curArmsYaw = 0;
let curLegLPitch = 0, curLegRPitch = 0;
let walkPhase = animParam === 'walk' ? 1.2 : 0;

// 应用线框
function updateWireframe(enable) {
  isWireframe = enable;
  built.group.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => { m.wireframe = enable; });
      } else {
        obj.material.wireframe = enable;
      }
    }
  });
}
if (isWireframe) updateWireframe(true);

// 极简自研轨道控制器 (Orbit Controller)
// 角色面向 -Z，正面在 -Z 一侧。初始机位为正面 3/4 英雄视角。
const INITIAL_THETA = 2.65; // 约 152° (正面 3/4 偏右前视角)
const INITIAL_PHI = 1.35;   // 稍俯视
const INITIAL_RADIUS = 3.6; // 观察距离，完整覆盖全身与分解图
const INITIAL_TARGET = new THREE.Vector3(0, 0.92, 0);

let targetTheta = INITIAL_THETA;
let targetPhi = INITIAL_PHI;
let targetRadius = INITIAL_RADIUS;
const targetPos = INITIAL_TARGET.clone();

let curTheta = INITIAL_THETA;
let curPhi = INITIAL_PHI;
let curRadius = INITIAL_RADIUS;
const curPos = INITIAL_TARGET.clone();

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);

// 交互事件监听
let isDragging = false;
let dragButton = 0; // 0=左键, 2=右键
let lastMouseX = 0, lastMouseY = 0;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  dragButton = e.button;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  if (dragButton === 0) {
    // 左键轨道旋转
    targetTheta -= dx * 0.005;
    targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, targetPhi - dy * 0.005));
  } else if (dragButton === 2) {
    // 右键平移
    targetPos.y += dy * 0.002;
    targetPos.x -= dx * 0.002 * Math.cos(curTheta);
    targetPos.z += dx * 0.002 * Math.sin(curTheta);
    targetPos.y = Math.max(0.2, Math.min(2.0, targetPos.y));
  }
});

canvas.addEventListener('pointerup', (e) => {
  isDragging = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetRadius = Math.max(1.2, Math.min(7.0, targetRadius + e.deltaY * 0.0025));
}, { passive: false });

// UI 按钮绑定
const btnIdle = document.getElementById('btn-idle');
const btnWalk = document.getElementById('btn-walk');
const btnAim = document.getElementById('btn-aim');
const btnTurntable = document.getElementById('btn-turntable');
const btnExplode = document.getElementById('btn-explode');
const btnWire = document.getElementById('btn-wire');
const btnReset = document.getElementById('btn-reset');

function setActiveAction(action) {
  actionState = action;
  [btnIdle, btnWalk, btnAim].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.action === action);
  });
}

btnIdle?.addEventListener('click', () => setActiveAction('idle'));
btnWalk?.addEventListener('click', () => setActiveAction('walk'));
btnAim?.addEventListener('click', () => setActiveAction('aim'));

btnTurntable?.addEventListener('click', () => {
  turntableActive = !turntableActive;
  btnTurntable.classList.toggle('active', turntableActive);
});

btnExplode?.addEventListener('click', () => {
  targetExplode = targetExplode > 0.5 ? 0.0 : 1.0;
  btnExplode.classList.toggle('active', targetExplode > 0.5);
});

btnWire?.addEventListener('click', () => {
  updateWireframe(!isWireframe);
  btnWire.classList.toggle('active', isWireframe);
});

btnReset?.addEventListener('click', () => {
  targetTheta = INITIAL_THETA;
  targetPhi = INITIAL_PHI;
  targetRadius = INITIAL_RADIUS;
  targetPos.copy(INITIAL_TARGET);
});

// 初始化 UI 按钮状态
if (actionState !== 'idle') {
  setActiveAction(actionState);
}
if (turntableActive) btnTurntable?.classList.add('active');
if (targetExplode > 0.5) btnExplode?.classList.add('active');
if (isWireframe) btnWire?.classList.add('active');

// 侧边栏折叠交互
const sidebar = document.getElementById('info-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const openSidebarBtn = document.getElementById('open-sidebar-btn');

closeSidebarBtn?.addEventListener('click', () => {
  sidebar?.classList.add('collapsed');
  if (openSidebarBtn) openSidebarBtn.style.display = 'flex';
});

openSidebarBtn?.addEventListener('click', () => {
  sidebar?.classList.remove('collapsed');
  if (openSidebarBtn) openSidebarBtn.style.display = 'none';
});

// 自适应窗口大小
function handleResize() {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', handleResize);
handleResize();

// 时钟与主循环
const clock = new THREE.Clock();
let frames = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  handleResize();

  // 转盘旋转
  if (turntableActive) {
    targetTheta += dt * 0.45;
  }

  // 平滑相机轨道
  const camBlend = 1 - Math.exp(-12 * dt);
  curTheta += (targetTheta - curTheta) * camBlend;
  curPhi += (targetPhi - curPhi) * camBlend;
  curRadius += (targetRadius - curRadius) * camBlend;
  curPos.lerp(targetPos, camBlend);

  const sinPhi = Math.sin(curPhi);
  camera.position.x = curPos.x + curRadius * sinPhi * Math.sin(curTheta);
  camera.position.y = curPos.y + curRadius * Math.cos(curPhi);
  camera.position.z = curPos.z + curRadius * sinPhi * Math.cos(curTheta);
  camera.lookAt(curPos);

  // 爆炸图进度平滑过渡
  const explodeBlend = 1 - Math.exp(-8 * dt);
  curExplodeFactor += (targetExplode - curExplodeFactor) * explodeBlend;

  // 计算目标关节角度 (根据状态机)
  let targetTorsoY = 0;
  let targetHeadPitch = 0, targetHeadYaw = 0;
  let targetArmsPitch = 0, targetArmsYaw = 0;
  let targetLegLPitch = 0, targetLegRPitch = 0;

  if (actionState === 'idle') {
    // 待机：呼吸起伏 + 头部微动 + 手臂轻微松弛
    targetTorsoY = Math.sin(t * 2.2) * 0.008;
    targetHeadPitch = Math.sin(t * 1.5) * 0.04;
    targetHeadYaw = Math.sin(t * 0.8) * 0.03;
    targetArmsPitch = 0.20 + Math.sin(t * 2.2) * 0.015;
    targetArmsYaw = 0;
    targetLegLPitch = 0;
    targetLegRPitch = 0;
  } else if (actionState === 'walk') {
    // 行走：反相迈步 + 身体 bobbing + 步枪摆动
    walkPhase += dt * 6.5;
    targetLegLPitch = Math.sin(walkPhase) * 0.58;
    targetLegRPitch = -Math.sin(walkPhase) * 0.58;
    targetTorsoY = Math.abs(Math.sin(walkPhase)) * 0.028 - 0.012;
    targetArmsPitch = 0.12 - Math.sin(walkPhase) * 0.10;
    targetArmsYaw = Math.cos(walkPhase) * 0.04;
    targetHeadPitch = Math.sin(walkPhase * 2.0) * 0.02;
    targetHeadYaw = 0;
  } else if (actionState === 'aim') {
    // 瞄准：手臂抬平 + 枪口指向 -Z 水平 + 战术微动 + 头部跟随俯仰
    const aimPitch = Math.sin(t * 1.4) * 0.18;
    targetArmsPitch = aimPitch;
    targetHeadPitch = aimPitch * 0.45; // 按照 swat.js 规范：head.rotation.x = pitch * 0.45
    targetArmsYaw = Math.sin(t * 0.9) * 0.12;
    targetHeadYaw = targetArmsYaw * 0.4;
    targetLegLPitch = 0.12; // 战术弓步
    targetLegRPitch = -0.12;
    targetTorsoY = 0;
  }

  // 关节平滑插值（任何切换均缓动到位，无瞬跳）
  const jointBlend = 1 - Math.exp(-12 * dt);
  curTorsoY += (targetTorsoY - curTorsoY) * jointBlend;
  curHeadPitch += (targetHeadPitch - curHeadPitch) * jointBlend;
  curHeadYaw += (targetHeadYaw - curHeadYaw) * jointBlend;
  curArmsPitch += (targetArmsPitch - curArmsPitch) * jointBlend;
  curArmsYaw += (targetArmsYaw - curArmsYaw) * jointBlend;
  curLegLPitch += (targetLegLPitch - curLegLPitch) * jointBlend;
  curLegRPitch += (targetLegRPitch - curLegRPitch) * jointBlend;

  // 应用位姿及爆炸分解偏移
  const f = curExplodeFactor;

  // 躯干 (包含挂载在上面的头部)
  torso.position.set(
    BASE.torso.x + EXPLODE_DIR.torso.x * f,
    BASE.torso.y + curTorsoY + EXPLODE_DIR.torso.y * f,
    BASE.torso.z + EXPLODE_DIR.torso.z * f
  );

  // 头部 (相对于 torso)
  head.position.set(
    BASE.head.x + EXPLODE_DIR.head.x * f,
    BASE.head.y + EXPLODE_DIR.head.y * f,
    BASE.head.z + EXPLODE_DIR.head.z * f
  );
  head.rotation.set(curHeadPitch, curHeadYaw, 0);

  // 手臂与武器
  arms.position.set(
    BASE.arms.x + EXPLODE_DIR.arms.x * f,
    BASE.arms.y + EXPLODE_DIR.arms.y * f,
    BASE.arms.z + EXPLODE_DIR.arms.z * f
  );
  arms.rotation.set(curArmsPitch, curArmsYaw, 0);

  // 左腿
  legL.position.set(
    BASE.legL.x + EXPLODE_DIR.legL.x * f,
    BASE.legL.y + EXPLODE_DIR.legL.y * f,
    BASE.legL.z + EXPLODE_DIR.legL.z * f
  );
  legL.rotation.set(curLegLPitch, 0, 0);

  // 右腿
  legR.position.set(
    BASE.legR.x + EXPLODE_DIR.legR.x * f,
    BASE.legR.y + EXPLODE_DIR.legR.y * f,
    BASE.legR.z + EXPLODE_DIR.legR.z * f
  );
  legR.rotation.set(curLegRPitch, 0, 0);

  // 渲染
  renderer.render(scene, camera);

  // 帧计数与自动化无头判定
  frames++;
  if (frames === 5) {
    document.title = 'DEMO_OK';
    window.__ready = true;
  }
}

animate();
