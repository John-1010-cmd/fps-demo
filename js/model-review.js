// ===== 模型评审台：参考图 + 四视角转盘渲染，供截图评审 =====
// 用法：model-review.html?who=swat|militia  （&ref=0 隐藏参考图面板）
// 角色面向 -Z（枪口朝 -Z）。四视角：正面 / 左侧(角色左手边) / 背面 / 右侧。
import * as THREE from 'three';
import { TEAM } from './config.js';
import { buildSwatMesh } from './soldier_models/swat.js';
import { buildMilitiaMesh } from './soldier_models/militia.js';

const params = new URLSearchParams(location.search);
const who = params.get('who') || 'swat';
const errBox = document.getElementById('err');
addEventListener('error', (e) => { errBox.textContent += e.message + '\n'; document.title = 'REVIEW_ERR'; });

const REF = { swat: 'assets/concepts/swat-v1.png', militia: 'assets/concepts/militia-v3.png' };
if (params.get('ref') === '0') document.getElementById('ref').style.display = 'none';
else document.getElementById('ref-img').src = REF[who] || REF.swat;

const T = TEAM[who === 'swat' ? 'A' : 'B'];
const built = (who === 'swat' ? buildSwatMesh : buildMilitiaMesh)(T);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d8d8);
scene.add(new THREE.HemisphereLight(0xffffff, 0x777788, 0.85));
const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(2.2, 3.8, -2.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
key.shadow.camera.right = key.shadow.camera.top = 2.5;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(-2, 2, 2.5);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 48),
  new THREE.MeshPhongMaterial({ color: 0xc8c8c8 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
scene.add(built.group);

// 2x2 视角布局（角色面向 -Z，自身右 = +X）
const VIEWS = [
  { label: '正面', pos: [0, 1.0, -3.6] },
  { label: '左侧', pos: [-3.6, 1.0, 0] },
  { label: '背面', pos: [0, 1.0, 3.6] },
  { label: '右侧', pos: [3.6, 1.0, 0] },
];
const lookAt = new THREE.Vector3(0, 0.9, 0);
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

const stage = document.getElementById('stage');
const labels = VIEWS.map(v => {
  const d = document.createElement('div');
  d.className = 'vlabel'; d.textContent = v.label;
  stage.appendChild(d); return d;
});

function render() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false);
  const vw = Math.floor(w / 2), vh = Math.floor(h / 2);
  renderer.setScissorTest(true);
  VIEWS.forEach((v, i) => {
    const col = i % 2, row = (i / 2) | 0;         // row0=上排(正/左) row1=下排(背/右)
    const x = col * vw, y = (1 - row) * vh;       // WebGL 视口 y 自下而上
    renderer.setViewport(x, y, vw, vh);
    renderer.setScissor(x, y, vw, vh);
    cam.aspect = vw / vh;
    cam.position.set(...v.pos);
    cam.lookAt(lookAt);
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    labels[i].style.left = (col * vw + 8) + 'px';
    labels[i].style.top = (row * vh + 6) + 'px';
  });
}

let frames = 0;
function loop() {
  render();
  if (++frames === 3) { document.title = 'REVIEW_OK'; window.__ready = true; }
  requestAnimationFrame(loop);
}
loop();
