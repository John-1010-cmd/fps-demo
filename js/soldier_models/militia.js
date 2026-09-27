// ===== 潜伏者（B）模型：沙漠民兵 =====
// 参考设计稿：assets/concepts/militia-v3.png
// 接口契约：必须返回 { group, legL, legR, arms, head, weapon, gunTip }，syncMesh 动画依赖这套接口：
//   legL/legR 原点在髋部（rotation.x 走路摆动）；arms 原点在肩线（rotation.x = 俯仰）；
//   weapon 是 arms 下独立枪组（死亡时隐藏）；head 挂在 torso 下（rotation.x = 俯仰*0.45）；
//   gunTip 是 weapon 下的枪口世界位（曳光/枪口焰起点）。
import * as THREE from 'three';
import { sMat, addBox } from './common.js';

// 头巾格纹：参考图是高对比棋盘格（深橄榄黑 × 卡其），比 common.shemaghTex 对比更强
function militiaShemaghTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g2 = c.getContext('2d');
  const n = 8, s = 64 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g2.fillStyle = (x + y) % 2 ? '#b3a383' : '#3e3b2a';
    g2.fillRect(x * s, y * s, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function buildMilitiaMesh(T) {
  // ---------- 材质 ----------
  const shirt  = sMat(0xa89060, 10);   // 卡其衬衫
  const cuff   = sMat(0xb59f6e, 10);   // 卷起的袖口（浅一号）
  const pants  = sMat(0x60623c, 8);    // 橄榄工装裤（比胸挂浅一号）
  const rig    = sMat(0x4c4e2c, 12);   // 橄榄绿胸挂
  const web    = sMat(0x23231c, 16);   // 织带 / 弹匣头（近黑）
  const mask   = sMat(0x353a2c, 8);    // 深色面罩
  const wood   = sMat(0x7a4a26, 14);   // AK 木件（橙棕）
  const metal  = sMat(0x1e2022, 30);   // AK 金属（黑）
  const bootM  = sMat(0x7d6540, 10);   // 棕褐登山靴
  const sole   = sMat(0x38332a, 6);    // 深色鞋底
  const skin   = sMat(T.skin, 12);     // 肤色（契约：必须用 T 值）
  const red    = sMat(T.color, 30);    // 红臂章（契约：必须用 T 值）
  const wrap   = new THREE.MeshPhongMaterial({ map: militiaShemaghTex(), shininess: 6 });
  const g = new THREE.Group();

  // ---------- Blockout：腿（工装裤两段锥度 + 登山靴） ----------
  const mkLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.82, 0);
    addBox(leg, pants, 0, -0.20, 0, 0.19, 0.40, 0.21);          // 大腿
    addBox(leg, pants, 0, -0.55, 0, 0.165, 0.32, 0.185);       // 小腿
    // Structure：大腿外侧 cargo 口袋 + 袋盖
    addBox(leg, pants, side * 0.115, -0.24, 0, 0.06, 0.17, 0.17);
    addBox(leg, rig,   side * 0.115, -0.145, 0, 0.07, 0.05, 0.18);
    // Form：登山靴 + 凸纹鞋底
    addBox(leg, bootM, 0, -0.745, -0.02, 0.19, 0.13, 0.28);
    addBox(leg, sole,  0, -0.795, -0.02, 0.20, 0.05, 0.30);
    return leg;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  g.add(legL, legR);

  // ---------- Blockout：躯干（长下摆卡其衬衫） ----------
  const torso = new THREE.Group(); torso.position.y = 0.82;
  addBox(torso, shirt, 0, 0.30, 0, 0.46, 0.52, 0.27);          // 衬衫主体
  addBox(torso, shirt, 0, 0.02, 0, 0.48, 0.16, 0.29);          // 下摆（盖过胯部）
  addBox(torso, mask,  0, 0.57, 0, 0.14, 0.06, 0.14);          // 领口/颈（面罩延伸）

  // ---------- Structure：橄榄绿胸挂 ----------
  addBox(torso, rig, 0, 0.30, -0.155, 0.40, 0.30, 0.06);       // 前面板
  for (let i = 0; i < 4; i++) {                                 // 弹匣袋×4 横排
    const x = -0.15 + i * 0.10;
    addBox(torso, rig, x, 0.25, -0.20, 0.095, 0.20, 0.07);
    addBox(torso, web, x, 0.375, -0.195, 0.06, 0.05, 0.05);    // 袋口黑色弹匣头
  }
  addBox(torso, web, -0.16, 0.47, -0.15, 0.07, 0.18, 0.04);    // 肩带 L
  addBox(torso, web,  0.16, 0.47, -0.15, 0.07, 0.18, 0.04);    // 肩带 R
  addBox(torso, web, -0.16, 0.415, -0.175, 0.05, 0.05, 0.03);  // 插扣 L
  addBox(torso, web,  0.16, 0.415, -0.175, 0.05, 0.05, 0.03);  // 插扣 R
  addBox(torso, rig, -0.245, 0.22, 0, 0.08, 0.16, 0.15);       // 侧挂包 L
  addBox(torso, rig,  0.245, 0.22, 0, 0.08, 0.16, 0.15);       // 侧挂包 R
  addBox(torso, rig, 0, 0.32, 0.15, 0.38, 0.26, 0.05);         // 背板
  addBox(torso, web, 0, 0.40, 0.155, 0.30, 0.06, 0.04);        // 背部横带

  // ---------- 头：面罩 + 眼部 + 格纹头巾 ----------
  const head = new THREE.Group(); head.position.set(0, 0.58, 0);
  addBox(head, mask, 0, 0.055, -0.005, 0.23, 0.17, 0.23);      // 面罩（遮鼻口下巴）
  addBox(head, skin, 0, 0.150, -0.121, 0.16, 0.05, 0.014);     // 眼部肤色条
  addBox(head, web,  0, 0.172, -0.126, 0.14, 0.016, 0.006);    // 眉眼线
  addBox(head, wrap, 0, 0.25, 0, 0.27, 0.14, 0.27);            // 头巾顶（压到眉上）
  addBox(head, wrap, -0.125, 0.10, 0.01, 0.05, 0.24, 0.24);    // 侧垂布 L
  addBox(head, wrap,  0.125, 0.10, 0.01, 0.05, 0.24, 0.24);    // 侧垂布 R
  addBox(head, wrap, 0, -0.03, -0.02, 0.25, 0.10, 0.18);       // 颏颈围布
  addBox(head, wrap, 0, 0.13, 0.145, 0.26, 0.22, 0.05);        // 尾布上段
  addBox(head, wrap, 0, -0.08, 0.15, 0.22, 0.22, 0.04);        // 尾布下段（收窄，垂到肩胛）
  torso.add(head);

  // ---------- 手臂：卷袖露小臂 + 红臂章 + 露指手套，双手持枪 ----------
  // 持枪姿态：枪贴在身体右侧（+X），右手在握把，左手前伸托护木
  const arms = new THREE.Group(); arms.position.set(0, 1.32, 0);
  for (const side of [-1, 1]) {
    addBox(arms, shirt, side * 0.27, -0.06, -0.14, 0.14, 0.16, 0.26); // 上臂袖
    addBox(arms, cuff,  side * 0.27, -0.10, -0.27, 0.15, 0.13, 0.07); // 卷袖折边
  }
  // 小臂内收指向枪身（肘→手一条直线）
  const foreR = addBox(arms, skin, 0.175, -0.13, -0.345, 0.11, 0.11, 0.26);
  foreR.rotation.y = 0.90;                                     // 右小臂 → 握把
  const foreL = addBox(arms, skin, -0.115, -0.135, -0.485, 0.11, 0.11, 0.54);
  foreL.rotation.y = -0.63;                                    // 左小臂 → 护木
  addBox(arms, web,  0.08, -0.165, -0.42, 0.10, 0.12, 0.13);   // 手套 R（握把）
  addBox(arms, web,  0.04, -0.17, -0.70, 0.10, 0.12, 0.13);    // 手套 L（护木）
  addBox(arms, cuff, 0.08, -0.10, -0.42, 0.06, 0.02, 0.07);    // 手背贴块 R
  addBox(arms, cuff, 0.04, -0.105, -0.70, 0.06, 0.02, 0.07);   // 手背贴块 L
  addBox(arms, skin, 0.08, -0.22, -0.45, 0.09, 0.04, 0.10);    // 露出的指根 R
  addBox(arms, skin, 0.04, -0.225, -0.70, 0.09, 0.04, 0.10);   // 露出的指根 L
  addBox(arms, red, -0.27, -0.06, -0.13, 0.16, 0.17, 0.15);    // 红臂章（左上臂，-X）

  // ---------- AK-47：木枪托/护木/握把 + 黑机匣 + 弯弹匣 + 准星 ----------
  const weapon = new THREE.Group();
  arms.add(weapon);
  addBox(weapon, wood,  0.05, -0.145, -0.22, 0.065, 0.13, 0.18); // 木枪托
  addBox(weapon, metal, 0.05, -0.11, -0.44, 0.06, 0.10, 0.30);   // 机匣
  const grip = addBox(weapon, wood, 0.08, -0.245, -0.42, 0.05, 0.13, 0.06); // 木握把
  grip.rotation.x = 0.25;
  addBox(weapon, wood,  0.05, -0.11, -0.70, 0.075, 0.095, 0.22); // 木护木
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.05, -0.10, -0.92); barrel.castShadow = true;
  weapon.add(barrel);                                            // 枪管
  const magU = addBox(weapon, metal, 0.05, -0.20, -0.505, 0.045, 0.14, 0.065);
  magU.rotation.x = 0.25;                                      // 弯弹匣上段
  const magL = addBox(weapon, metal, 0.05, -0.285, -0.46, 0.045, 0.12, 0.055);
  magL.rotation.x = 0.8;                                       // 弯弹匣下段（前弯）
  addBox(weapon, metal, 0.05, -0.055, -0.86, 0.014, 0.05, 0.014); // 准星柱
  addBox(weapon, metal, 0.05, -0.045, -0.86, 0.032, 0.028, 0.02); // 准星护圈
  addBox(weapon, metal, 0.05, -0.05, -0.55, 0.035, 0.02, 0.04);  // 表尺
  addBox(weapon, metal, 0.05, -0.10, -1.045, 0.03, 0.035, 0.03); // 枪口
  const gunTip = new THREE.Object3D();
  gunTip.position.set(0.05, -0.10, -1.06);
  weapon.add(gunTip);

  g.add(torso, arms);
  return { group: g, legL, legR, arms, head, weapon, gunTip };
}
