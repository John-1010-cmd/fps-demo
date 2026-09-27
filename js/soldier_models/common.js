// ===== 士兵模型共享工具 =====
// 两个阵营的 builder（swat.js / militia.js）共用这套公共件；
// 阵营特有的小工具请写在各自模块内，不要改本文件（多人并行改模型时避免冲突）。
import * as THREE from 'three';

// 共享单位盒：所有方块部件缩放复用同一几何体，避免重复分配
export const unitBox = new THREE.BoxGeometry(1, 1, 1);

export function sMat(color, shininess = 8) {
  return new THREE.MeshPhongMaterial({ color, shininess });
}

export function addBox(parent, mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(unitBox, mat);
  m.position.set(x, y, z); m.scale.set(w, h, d);
  m.castShadow = true;
  parent.add(m); return m;
}

// 头巾格纹（canvas 程序化纹理，与 makeNameTag 同一套路）
export function shemaghTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g2 = c.getContext('2d');
  const n = 8, s = 64 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g2.fillStyle = (x + y) % 2 ? '#b3a488' : '#7d6f52';
    g2.fillRect(x * s, y * s, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
