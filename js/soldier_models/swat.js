// ===== 保卫者（A）模型：SWAT 制式装具 =====
// 参考设计稿：assets/concepts/swat-v1.png
// 接口契约：必须返回 { group, legL, legR, arms, head, weapon, gunTip }，syncMesh 动画依赖这套接口：
//   legL/legR 原点在髋部（rotation.x 走路摆动）；arms 原点在肩线（rotation.x = 俯仰）；
//   weapon 是 arms 下独立枪组（死亡时隐藏）；head 挂在 torso 下（rotation.x = 俯仰*0.45）；
//   gunTip 是 weapon 下的枪口世界位（曳光/枪口焰起点）。
// 构建顺序：blockout(大比例) → structure(装备结构) → form(细节) → material(颜色高光)。
// 全部件确定性生成（无 Math.random），共 80 个 mesh（预算 ≤90）。
import * as THREE from 'three';
import { sMat, addBox } from './common.js';

// 可旋转盒件：addBox 后追加欧拉角（袖口前倾、弹匣弯曲、握把后倾等）
function part(parent, mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  const m = addBox(parent, mat, x, y, z, w, h, d);
  if (rx) m.rotation.x = rx;
  if (ry) m.rotation.y = ry;
  if (rz) m.rotation.z = rz;
  return m;
}

export function buildSwatMesh(T) {
  // ---- material：全部 MeshPhongMaterial；识别色/肤色取自 T ----
  const cloth   = sMat(0x3d5080, 12);  // 中深藏青作战服（参考图主色）
  const clothD  = sMat(0x33436c, 10);  // 作战裤/深色层
  const facet   = sMat(0x4e6296, 10);  // 浅钢蓝多边形迷彩贴片
  const helmetM = sMat(0x2b3a58, 14);  // 头盔（深藏青盔罩）
  const helmetD = sMat(0x232f49, 10);  // 盔檐裙
  const gear    = sMat(0x22262d, 16);  // 装具黑（背心/肩带/腰带）
  const gearL   = sMat(0x323842, 20);  // 装具亮面（弹匣袋/挂包/护膝壳）
  const bootM   = sMat(0x1b1e23, 12);  // 作战靴
  const soleM   = sMat(0x14161a, 8);   // 靴厚底
  const maskM   = sMat(0x1e2126, 10);  // 黑面罩/护耳
  const gunM    = sMat(0x1c1f25, 22);  // 枪体黑
  const gunL    = sMat(0x2a3038, 26);  // 枪体亮面
  const glass   = sMat(0x3a4a66, 60);  // 护目镜片（高光）
  const skin    = sMat(T.skin, 15);
  const accent  = sMat(T.color, 30);   // 青色阵营识别
  const g = new THREE.Group();

  // ---- blockout：腿（原点在髋部，便于摆动）----
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.12, 0.82, 0); legR.position.set(0.12, 0.82, 0);
  for (const side of [-1, 1]) {
    const leg = side < 0 ? legL : legR;
    // 裤腿大比例：大腿 → 小腿 → 靴（互相搭接，摆动不露缝）
    addBox(leg, clothD, 0, -0.19, 0, 0.21, 0.38, 0.22);            // 大腿
    addBox(leg, clothD, 0, -0.505, 0, 0.18, 0.23, 0.20);           // 小腿
    // form：浅蓝多边形迷彩贴片（参考图裤腿上的浅色面）
    addBox(leg, facet, side * 0.105, -0.20, 0, 0.02, 0.20, 0.15);  // 大腿外侧
    addBox(leg, facet, 0.02 * side, -0.19, -0.11, 0.12, 0.16, 0.02); // 大腿前
    // structure+form：大号棱角护膝（壳+盖，参考图标志性装备）
    addBox(leg, gearL, 0, -0.42, -0.10, 0.22, 0.24, 0.10);         // 护膝壳
    addBox(leg, gear,  0, -0.42, -0.16, 0.14, 0.15, 0.03);         // 护膝盖
    // structure：黑色作战靴（筒/面/厚底，底缘齐地）
    addBox(leg, bootM, 0, -0.655, 0.01, 0.18, 0.14, 0.21);         // 靴筒
    addBox(leg, bootM, 0, -0.745, -0.04, 0.175, 0.07, 0.30);       // 靴面
    addBox(leg, soleM, 0, -0.795, -0.05, 0.19, 0.05, 0.33);        // 靴底
    // structure：大腿战术挂包（挂带+包体，随腿摆动）
    addBox(leg, gear,  0, -0.30, 0, 0.225, 0.045, 0.235);          // 挂带
    addBox(leg, gearL, side * 0.14, -0.34, 0.01, 0.10, 0.21, 0.15); // 挂包
  }
  g.add(legL, legR);

  // ---- blockout：躯干大比例（胯/腹/胸/颈）----
  const torso = new THREE.Group(); torso.position.y = 0.82;
  addBox(torso, clothD, 0, 0.07, 0, 0.40, 0.18, 0.26);             // 胯
  addBox(torso, cloth, 0, 0.235, 0, 0.42, 0.19, 0.25);             // 腹
  addBox(torso, cloth, 0, 0.415, 0, 0.46, 0.21, 0.27);             // 胸
  addBox(torso, maskM, 0, 0.545, 0, 0.16, 0.09, 0.17);             // 颈（面罩延续）

  // ---- structure：插板背心（参考图核心装具）----
  addBox(torso, gear, 0, 0.30, -0.135, 0.40, 0.42, 0.07);          // 前插板
  addBox(torso, gear, 0, 0.30, 0.135, 0.38, 0.42, 0.07);           // 背板
  addBox(torso, gear, -0.215, 0.29, 0, 0.05, 0.30, 0.22);          // 侧板 L
  addBox(torso, gear, 0.215, 0.29, 0, 0.05, 0.30, 0.22);           // 侧板 R
  addBox(torso, gear, -0.145, 0.505, -0.01, 0.11, 0.06, 0.28);     // 肩带 L
  addBox(torso, gear, 0.145, 0.505, -0.01, 0.11, 0.06, 0.28);      // 肩带 R
  addBox(torso, gearL, -0.145, 0.525, -0.02, 0.135, 0.045, 0.19);  // 肩带垫 L
  addBox(torso, gearL, 0.145, 0.525, -0.02, 0.135, 0.045, 0.19);   // 肩带垫 R
  addBox(torso, gear, 0, 0.135, 0, 0.43, 0.075, 0.28);             // 腰带
  // form：正面 MOLLE 行 + 3 弹匣袋（带盖）+ 板下小包 + 胸前电台
  addBox(torso, gearL, 0, 0.455, -0.175, 0.36, 0.03, 0.015);       // MOLLE 行
  for (let i = -1; i <= 1; i++) {
    addBox(torso, gearL, i * 0.125, 0.285, -0.185, 0.105, 0.16, 0.06); // 弹匣袋
    addBox(torso, gear,  i * 0.125, 0.345, -0.19, 0.11, 0.035, 0.065); // 袋盖
  }
  addBox(torso, gear, 0, 0.145, -0.18, 0.13, 0.09, 0.05);          // 板下小包
  addBox(torso, gear, -0.155, 0.43, -0.175, 0.085, 0.10, 0.045);   // 电台（左胸）
  addBox(torso, gear, -0.15, 0.535, -0.155, 0.014, 0.13, 0.014);   // 电台天线
  // form：腰侧挂包 + 背部小包（侧视图可见）+ 背部青色识别块
  addBox(torso, gearL, -0.225, 0.10, 0.03, 0.09, 0.13, 0.14);      // 腰包 L
  addBox(torso, gearL, 0.225, 0.115, 0.02, 0.08, 0.11, 0.12);      // 腰包 R
  addBox(torso, gear, 0, 0.31, 0.225, 0.30, 0.36, 0.13);           // 背包
  addBox(torso, gear, 0, 0.51, 0.225, 0.26, 0.09, 0.15);           // 包顶卷
  addBox(torso, accent, 0, 0.30, 0.295, 0.11, 0.15, 0.015);        // 背部识别块

  // ---- 头（随俯仰微转；坐标相对于 torso 组）----
  const head = new THREE.Group(); head.position.set(0, 0.58, 0);
  // blockout：面部 + 黑面罩（遮下半脸只露眼部，参考图身份特征）
  addBox(head, skin, 0, 0.085, 0, 0.22, 0.23, 0.22);               // 面部（肤色带）
  addBox(head, maskM, 0, 0.03, -0.005, 0.235, 0.15, 0.235);        // 面罩（遮鼻口颌）
  addBox(head, maskM, 0, 0.14, 0.06, 0.235, 0.10, 0.12);           // 面罩后片（包后脑）
  addBox(head, maskM, 0, 0.132, -0.112, 0.17, 0.032, 0.015);       // 眉眼线
  // structure：深色头盔（盔体/檐裙/顶盖）
  addBox(head, helmetM, 0, 0.225, 0.005, 0.27, 0.14, 0.29);        // 盔体
  addBox(head, helmetD, 0, 0.1725, 0.005, 0.285, 0.065, 0.305);    // 盔檐裙
  addBox(head, helmetM, 0, 0.30, 0.01, 0.24, 0.05, 0.26);          // 盔顶盖
  // form：盔顶前置护目镜（架在盔上不罩眼）+ 镜带 + 护耳杯
  addBox(head, maskM, 0, 0.215, -0.155, 0.25, 0.08, 0.05);         // 护目镜框
  addBox(head, glass, 0, 0.21, -0.182, 0.21, 0.052, 0.012);        // 护目镜片
  addBox(head, maskM, 0, 0.225, 0.005, 0.275, 0.03, 0.295);        // 镜带
  addBox(head, maskM, -0.145, 0.075, 0.01, 0.06, 0.11, 0.14);      // 护耳 L
  addBox(head, maskM, 0.145, 0.075, 0.01, 0.06, 0.11, 0.14);       // 护耳 R
  torso.add(head);

  // ---- 手臂 + 枪（随俯仰转动）：持枪前指姿态，枪指 -Z ----
  const arms = new THREE.Group(); arms.position.set(0, 1.32, 0);
  // blockout：上臂袖（肩→肘，下倾 45° 溜肩线）+ 前臂袖（L 前伸扶护木 / R 收回握把）+ 全指手套
  part(arms, cloth, -0.26, -0.11, -0.085, 0.15, 0.16, 0.26, -0.55); // 上臂 L
  part(arms, cloth, 0.26, -0.11, -0.085, 0.15, 0.16, 0.26, -0.55);  // 上臂 R
  part(arms, cloth, -0.165, -0.172, -0.375, 0.13, 0.14, 0.39, -0.06, -0.47); // 前臂 L
  part(arms, cloth, 0.165, -0.172, -0.25, 0.13, 0.14, 0.22, -0.12, 1.06);    // 前臂 R
  addBox(arms, maskM, -0.075, -0.16, -0.57, 0.11, 0.11, 0.13);     // 手套 L（扶护木）
  addBox(arms, maskM, 0.075, -0.16, -0.30, 0.11, 0.11, 0.13);      // 手套 R（握把）
  // form：青色识别章贴上臂外侧（参考图双臂外侧均可见）+ 前缘小块（正面可辨阵营）
  part(arms, accent, -0.347, -0.095, -0.075, 0.02, 0.11, 0.15, -0.55); // 臂章 L
  part(arms, accent, 0.347, -0.095, -0.075, 0.02, 0.11, 0.15, -0.55);  // 臂章 R
  part(arms, accent, -0.30, -0.165, -0.205, 0.075, 0.10, 0.02, -0.55); // 臂章前缘 L
  part(arms, accent, 0.30, -0.165, -0.205, 0.075, 0.10, 0.02, -0.55);  // 臂章前缘 R

  // ---- structure+form：M4 系卡宾枪（全黑，机匣/导轨/弯弹匣/伸缩托）----
  const weapon = new THREE.Group();
  arms.add(weapon);
  addBox(weapon, gunM, 0, -0.115, -0.36, 0.06, 0.10, 0.30);          // 机匣
  addBox(weapon, gunL, 0, -0.056, -0.52, 0.035, 0.018, 0.56);        // 顶导轨
  addBox(weapon, gunL, 0, -0.035, -0.33, 0.05, 0.05, 0.10);          // 瞄具
  addBox(weapon, gunL, 0, -0.115, -0.655, 0.07, 0.08, 0.29);         // 导轨护木
  addBox(weapon, gunL, 0, -0.075, -0.79, 0.028, 0.055, 0.03);        // 准星
  part(weapon, gunM, 0, -0.19, -0.40, 0.05, 0.09, 0.075, 0.12);      // 弹匣上
  part(weapon, gunM, 0, -0.255, -0.385, 0.048, 0.09, 0.07, 0.30);    // 弹匣下（弯）
  part(weapon, gunM, 0, -0.20, -0.27, 0.045, 0.10, 0.06, -0.35);     // 握把（后倾）
  addBox(weapon, gunM, 0, -0.10, -0.13, 0.04, 0.05, 0.18);           // 托芯
  addBox(weapon, gunM, 0, -0.115, -0.02, 0.06, 0.115, 0.10);         // 托垫
  addBox(weapon, gunL, 0, -0.185, -0.63, 0.04, 0.075, 0.05);         // 前握把
  // 枪管：唯一自建圆柱（盒件以外的几何体）
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), gunL);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.115, -0.92);
  barrel.castShadow = true;
  weapon.add(barrel);
  addBox(weapon, gunM, 0, -0.115, -1.03, 0.04, 0.045, 0.07);         // 枪口装置
  const gunTip = new THREE.Object3D();
  gunTip.position.set(0, -0.115, -1.07);                           // 真实枪口尖端
  weapon.add(gunTip);

  g.add(torso, arms);
  return { group: g, legL, legR, arms, head, weapon, gunTip };
}
