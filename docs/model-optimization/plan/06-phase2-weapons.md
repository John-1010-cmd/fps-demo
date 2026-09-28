# 06-phase2-weapons.md —— Phase 2 武器英雄版实施计划（AK-47 / M4A1）

> 本文档为 fps-demo 模型精细化优化规划文档集第 6 篇。  
> 关联文档：`00-master-plan.md`（总规划）、`01-environment-setup.md`（环境准备）、`02-pipeline-conventions.md`（通用规范）、`03-hero-militia.md`（民兵实施）、`04-hero-swat.md`（特警实施）、`05-demo-integration.md`（Demo 集成与渲染栈）。

---

## 1. 目标与范围 (Goal & Scope)

### 1.1 核心目标
本阶段（Phase 2）承接 Phase 1 角色英雄版的成熟工具链与 PBR 渲染底座，将游戏内的两款核心主武器重构成**单物体展示级英雄版模型（Hero Weapon）**，对标官方 AWP Medusa 的高保真工业与材质精度：
1. **AK-47（潜伏者主武器）独立重构**：还原冲压机匣、导气系统、前弯弧形弹匣、斜切防跳器及高质感实木护木/枪托。
2. **M4A1（保卫者主武器）独立重构**：还原平顶导轨上机匣、四面皮卡汀尼导轨护木、微型红点瞄具、鸟笼消焰器及战术伸缩枪托。
3. **独立工厂产出**：输出原生纯 JavaScript ES Module 工厂文件 `js/hero_models/ak47.js` 与 `js/hero_models/m4.js`。
4. **单物体专属展示舞台**：新建独立展示页面 `demo-ak47.html`（及 `js/demo/ak47-demo.js`）与 `demo-m4.html`（及 `js/demo/m4-demo.js`），支持检视、换弹演示、机械分解（Explode View）与线框检视。
5. **装配挂载点预留（Sockets/Action Anchors）**：在武器模型中标准化定义主手握把、副手护木、枪托贴肩点与枪口端点，为后续英雄版角色与武器的完整合体留出精准接口。

### 1.2 边界与隔离规则
- **游戏主场景隔离**：`index.html`、`js/game.js`、`js/soldier_models/` 现有低模继续保留原样运行，零改动，零回归风险。
- **英雄版独立运行**：英雄版武器直接服务于专属 Demo 页，不向游戏主循环导出沉重的高面数网格与大尺寸贴图。
- **纯原生 ES Module 规范**：无前端构建打包流程，严格通过 `importmap` 引用 `./js/vendor/three.module.js`。

---

## 2. 前置依赖 (Prerequisites)

进入 Phase 2 执行前，必须确认以下前置条件全部就绪：

| 前置项 | 来源文档 / 资源 | 交付物判定标准 |
|---|---|---|
| **Python 执行环境** | `01-environment-setup.md` | 本地 Python 3.10+ 就绪，`python3 -m unittest discover -s forge/tests` 全部通过 |
| **流水线规范冻结** | `02-pipeline-conventions.md` | `js/hero_models/` 导出签名、纹理命名及 PBR 参数规范已确立 |
| **Phase 1 至少跑通首个角色** | `03-hero-militia.md` | 沙漠民兵全流程打通，验证了 `delight_albedo`、投影烘焙与 PBR 渲染效果 |
| **Demo 渲染栈与脚手架** | `05-demo-integration.md` | PMREM IBL 环境光、影棚三点布光、无头 `DEMO_OK` 信号自检已在角色页稳定运行 |
| **武器高清单体参考图** | 用户/制作侧提供（方案 B） | `assets/concepts/weapon-ak47-ref.png` 与 `weapon-m4-ref.png` 横置高清单体正交图就绪（已确认前置条件） |
| **常驻 HTTP 服务** | 项目约定 | `http://localhost:8080` 常驻运行中（严禁重启或杀进程） |

---

## 3. 参考来源决策点：武器参考图从何而来

### 3.1 现状分析（基于 `assets/concepts/` 现有图片）
在上一轮角色概念图 `assets/concepts/militia-v3.png` 与 `assets/concepts/swat-v3.png`（尺寸均为 1312×1199）中，虽然角色手持 AK-47 与 M4A1，但存在严重局限：
1. **大面积遮挡**：角色双手全指手套紧握护木与握把，胸挂弹匣袋与战术背心贴紧枪身内侧，遮挡超过 50% 的枪体结构。
2. **斜向透视缩短**：武器处于胸前 35°~45° 倾斜指向，非水平正交视角，极难用于无畸变的 UV 投影烘焙。
3. **有效像素过低**：枪体在全图中的裁切尺寸仅约 350×480 像素，无法看清抛壳窗、拉机柄导轨、表尺刻度与皮轨卡齿等关键工业特征。
4. **侧面完全残缺**：角色的侧视图中，武器被前臂和身体完全挡住，无法解算出侧面投影相机。

### 3.2 方案对比与决策【已确认 2026-09-27】

| 方案 | 做法 | 优势 | 劣势 | 决策状态 |
|---|---|---|---|---|
| **方案 A（备选，未采纳）：裁剪现有角色图** | 从 `militia-v3.png` 和 `swat-v3.png` 强行抠取斜角武器区域 | 零新增素材依赖 | 存在严重拉伸畸变；手套与背心阴影会被错误烘焙进枪身；精度无法达到 Medusa 级 | 未采纳（★★☆☆☆） |
| **方案 B：引入独立正交参考图** | 单独准备 AK-47 与 M4A1 的纯净横置高清单体概念参考图（正侧视 + 45° 特写，浅灰底） | 结构无遮挡、正交无透视形变、高分辨率（2048×2048），完美适配官方 `bake_projected_texture` | 需额外准备两张概念图资产 | 【已确认 2026-09-27】（★★★★★） |

> 📌 **决策项 1（武器参考图来源）【已确认 2026-09-27】**：  
> **采用方案 B**：Phase 2 启动前新增两张纯净横置高清单体参考图 `assets/concepts/weapon-ak47-ref.png` 与 `weapon-m4-ref.png`（由用户/制作侧提供，列为 Phase 2 启动前置条件）作为武器标准输入图，确保烘焙无遮挡、高分辨率且无透视畸变。  
> *备选方案（备选，未采纳）*：裁剪现有角色图（方案 A），仅作为极端断供时的应急备选回退。

---

## 4. 流水线差异：Generic Profile 适配

武器作为硬表面机械道具，与 Phase 1 角色流水线存在显著差异：

```
角色流水线 (animated-character profile):
  Intake -> Landmarks (人脸/肢体) -> Spec -> Build Passes -> Review -> Stage 5 Rig (骨骼蒙皮/12项Rig Gates)

武器流水线 (generic profile):
  Intake -> Detail Inventory -> Spec -> Build Passes -> Delight & 分区域烘焙 -> Review (机械特化)
  (跳过: extract_landmarks, UniRig 骨骼绑定, geodesic_skinning)
```

### 4.1 核心差异说明
1. **Profile 定位**：状态文件初始化使用 `profile: generic`（硬表面机械模式），不加载 `img2-character` 插件。
2. **跳过人体 Landmark 捕获**：不调用 `extract_landmarks.py`，不引入 MediaPipe，直接由 `build_detail_inventory.py` 提取机械零件结构树。
3. **无骨骼蒙皮（No SkinnedMesh）**：枪身为硬表面刚体分层树（Rigid Group Hierarchy），通过局部父子变换实现拉栓、弹匣装卸与后坐位移，免除顶点权重串扰风险。
4. **分材质区投影烘焙（Material Partitioning）**：
   - 突击步枪属于**复合材质系统**（木质/金属/聚合物/光学玻璃）。
   - 必须通过 `delight_albedo.py` 消除环境光照后，按部件掩码执行差异化投影烘焙。

---

## 5. AK-47 与 M4A1 核心 Spec 与解剖结构设计

对标 `img2-cs2` 插件权威解剖规范（`rifles.md`）及 AWP Medusa 级工艺，定义两款武器的组件分解与 PBR 参数：

### 5.1 AK-47 英雄版规格规范

```
AK-47 组件层级树 (目标网格数 45~60，三角形预算 ≤15,000)
group (原点位于机匣/握把结合部，枪管指向 -Z，提枪水平姿态)
├─ receiverGroup (机匣总成)
│   ├─ lowerReceiver (冲压下机匣 + 弹匣井)
│   ├─ dustCover (弧形冲压机匣盖)
│   ├─ boltCarrier (机框 + 拉机柄，可沿 Z 轴后移)
│   ├─ selectorLever (右侧快慢机/保险拨片)
│   └─ triggerGroup (扳机 + 弧形扳机护圈)
├─ barrelSystem (枪管与导气总成)
│   ├─ mainBarrel (阶梯外枪管，圆柱几何体)
│   ├─ gasTube (上方导气管，与枪管平行)
│   ├─ gasBlock (导气箍，倾斜固定基座)
│   └─ muzzleBrake (AKM 风格 45° 斜切防跳制退器)
├─ furniture (家具总成 - 实木部件)
│   ├─ upperHandguard (上护木，半圆柱包裹导气管)
│   ├─ lowerHandguard (下护木，两侧带防滑握槽)
│   ├─ buttstock (经典下倾流线型木枪托 + 钢制底板)
│   └─ pistolGrip (人体工学木质小握把)
├─ sights (瞄准系统)
│   ├─ frontSightBase (准星基座 + 准星柱)
│   ├─ frontSightHood (圆形包裹式准星护圈)
│   └─ rearSight (弧形标尺座 + 可调滑块)
└─ magazine (供弹系统 - 可分离节点)
    └─ bananaMag (30发 7.62mm 弧形弯弹匣，带冲压加强凹凸筋)
```

#### AK-47 材质矩阵

| 部件分类 | 对应组件 | 材质类型 | 核心 PBR 参数 | 纹理资产 |
|---|---|---|---|---|
| **木质家具** | 枪托、上/下护木、握把 | `MeshStandardMaterial` | `color: 0x8a4518`, `roughness: 0.58`, `metalness: 0.04` | 烘焙纹理 `ak47-wood-albedo.png`（木纹走向顺应枪身轴线） |
| **冲压钢机匣** | 机匣、机匣盖、弹匣 | `MeshStandardMaterial` | `color: 0x22252a`, `roughness: 0.35`, `metalness: 0.88` | 烘焙纹理 `ak47-metal-albedo.png`（含轻微边缘微磨损） |
| **机械活动件** | 枪栓、拉机柄、导轨槽 | `MeshStandardMaterial` | `color: 0x585d66`, `roughness: 0.22`, `metalness: 0.95` | 高反光裸钢质感，表现摩擦高光 |

---

### 5.2 M4A1 英雄版规格规范

```
M4A1 组件层级树 (目标网格数 50~68，三角形预算 ≤18,000)
group (原点位于机匣/握把结合部，枪管指向 -Z，提枪水平姿态)
├─ receiverGroup (机匣总成)
│   ├─ upperReceiver (平顶 Upper，顶部贯通皮卡汀尼导轨)
│   ├─ lowerReceiver (Lower 机匣 + 倾斜弹匣井)
│   ├─ chargingHandle (T 字形双耳拉机柄，机匣顶部)
│   ├─ forwardAssist (右侧 45° 辅助推机柄圆柱)
│   ├─ brassDeflector (抛壳偏向挡块)
│   └─ dustCoverDoor (侧面可开闭抛壳窗防尘盖)
├─ handguardSystem (四面导轨护木总成)
│   ├─ quadRail (RIS/RAS 四面皮卡汀尼导轨铝合金护木)
│   ├─ barrelNut (护木固定星形枪管螺母)
│   └─ foregrip (下导轨附着战术垂直前握把)
├─ barrelSystem (枪管与消焰总成)
│   ├─ carbineBarrel (14.5 英寸外枪管)
│   └─ a2FlashHider (经典 A2 鸟笼形消焰器，带排气开槽)
├─ buttstockSystem (伸缩枪托总成)
│   ├─ bufferTube (圆柱形缓冲管/托芯)
│   └─ craneStock (战术伸缩托套件 + 橡胶防滑底托)
├─ opticsSystem (战术光学瞄准)
│   ├─ microRDS (微型红点瞄具基座与镜身)
│   ├─ opticLens (前后光学透镜片)
│   └─ reticleDot (内部悬浮微发光红点)
└─ magazine (供弹系统 - 可分离节点)
    └─ stanagMag (STANAG 30 发金属弹匣，直插后微弯)
```

#### M4A1 材质矩阵

| 部件分类 | 对应组件 | 材质类型 | 核心 PBR 参数 | 表现要点 |
|---|---|---|---|---|
| **阳极氧化铝** | 上/下机匣、导轨护木 | `MeshStandardMaterial` | `color: 0x1c1e22`, `roughness: 0.46`, `metalness: 0.78` | 哑光炭灰黑，导轨齿牙边缘呈现锐利冷光 |
| **磷化碳钢** | 枪管、消焰器、螺钉 | `MeshStandardMaterial` | `color: 0x16181b`, `roughness: 0.28`, `metalness: 0.92` | 深沉金属光泽，消焰器开槽反光通透 |
| **增强聚合物** | 伸缩托、小握把、垂直前握把 | `MeshStandardMaterial` | `color: 0x18191c`, `roughness: 0.72`, `metalness: 0.08` | 高粗糙度无金属感，表现微磨砂手感 |
| **光学透镜** | 红点镜片 | `MeshPhysicalMaterial` | `color: 0x223544`, `roughness: 0.05`, `metalness: 0.1`, `transmission: 0.85`, `transparent: true`, `opacity: 0.7` | 真实玻璃透射感与环境高光反光 |

---

## 6. 工厂落盘与纹理产物命名规范

严格遵守 `02-pipeline-conventions.md` 的代码命名与资产落盘约定：

### 6.1 工厂脚本落盘路径
- **AK-47 英雄工厂**：`js/hero_models/ak47.js`
- **M4A1 英雄工厂**：`js/hero_models/m4.js`

### 6.2 工厂统一对外接口规范
两款武器工厂均必须导出唯一的统一构建函数（签名规范以 `02-pipeline-conventions.md` 3.3 节为准），与人物工厂统一为**异步**签名（需异步加载烘焙纹理），返回标准契约对象：

```javascript
/**
 * 构建高保真英雄版武器模型
 * @param {Object} options 构造配置（如 loadHighResTextures, skinVariant 等）
 * @returns {Promise<Object>} 武器契约对象
 */
export async function buildHeroAK47(options = {}) {  // m4.js 同构导出 buildHeroM4
  // ... 构造过程 ...
  return {
    group,          // THREE.Group: 武器根节点（面向 -Z，握把原点位于 (0,0,0)）
    parts: {        // 具名可分解部件字典（供 Explode View 分解动画使用）
      receiver,
      barrel,
      handguard,
      stock,
      magazine,
      bolt,
      optics,
    },
    sockets: {      // 预定义装配锚点字典（精确世界/局部坐标点）
      rightHandGrip,
      leftHandGuard,
      stockShoulder,
      muzzleTip,
      ejectionPort,
      magWell,
    },
    materials: {},   // 材质引用字典（用于线框模式、高亮或透明度控制）
    bounds: {},      // 包围盒尺寸 (长/宽/高及几何中心)
    actions: {       // 武器程序化动力学动作（换弹、拉栓、开火后坐）
      playReload: (progress) => { /* 0.0 ~ 1.0 */ },
      playInspect: (t) => { /* 检视摆动 */ },
      playRecoil: (kick) => { /* 枪机后坐 */ },
    },
    dispose: () => {}, // 资源释放器：释放几何体、材质与纹理
  };
}
```

### 6.3 纹理资产产物命名（`assets/textures/hero/`）
投影烘焙阶段输出的标准纹理必须命名如下：
- `assets/textures/hero/ak47-wood-albedo.png`（木质护木/枪托漫反射贴图）
- `assets/textures/hero/ak47-metal-albedo.png`（冲压钢机匣与弹匣漫反射贴图）
- `assets/textures/hero/ak47-metal-roughness.png`（机匣磨损微表面粗糙度贴图）
- `assets/textures/hero/m4-receiver-albedo.png`（M4 机匣与导轨漫反射贴图）
- `assets/textures/hero/m4-polymer-albedo.png`（M4 伸缩托与握把磨砂漫反射贴图）

---

## 7. Sockets / Action Anchors 装配接口设计

为实现后续英雄角色与武器的无缝装配，在武器 Spec 中冻结标准 Socket 坐标规范。

### 7.1 坐标系与度量衡约定
- **坐标系**：标准 Three.js 右手坐标系（`+Y` 垂直向上，`+X` 朝向射手右侧，`-Z` 沿枪管指向前方目标）。
- **度量单位**：国际标准米（meters）。
- **基准原点 `(0, 0, 0)`**：位于**射手主手虎口贴合握把处（Grip Tang Point）**，使得武器挂接至角色手部骨骼时，位置偏移极小甚至为零。

### 7.2 核心 Socket 字段定义表

| Socket 字段名 | 类型 | 局部坐标 (X, Y, Z 约值/米) | 用途与对接目标 |
|---|---|---|---|
| `socket_right_hand_grip` | `THREE.Object3D` | `(0.000, 0.000, 0.000)` | 主手握持点，对接角色右手手骨 `bone_hand_r` |
| `socket_left_hand_guard` | `THREE.Object3D` | `(0.000, 0.025, -0.380)` (AK)<br>`(0.000, -0.060, -0.320)` (M4 前握把) | 副手托举/握持点，对接角色左手手骨 `bone_hand_l` |
| `socket_stock_shoulder` | `THREE.Object3D` | `(0.000, 0.030, +0.310)` (AK)<br>`(0.000, 0.020, +0.280)` (M4) | 贴肩支撑点，对齐角色右胸窝贴腮瞄准姿态 |
| `socket_barrel_tip` (`gunTip`) | `THREE.Object3D` | `(0.000, 0.040, -0.580)` (AK)<br>`(0.000, 0.030, -0.540)` (M4) | 枪口尖端，发射弹道、火光粒子及烟雾起点 |
| `socket_ejection_port` | `THREE.Object3D` | `(+0.025, 0.035, -0.110)` | 抛壳口，抛出带自旋黄铜弹壳粒子的发射点 |
| `socket_mag_well` | `THREE.Object3D` | `(0.000, -0.050, -0.160)` | 弹匣卡口，定义换弹动画中弹匣沿局部轴脱出的导轨向量 |

> 📌 **架构备忘**：  
> 『详细装配与手部 IK/骨骼约束在人物与武器均完成且验收通过后，在专门的装配阶段另行设计』。本阶段核心保证上述 6 个 Socket 节点作为静态锚点被正确挂载在武器几何体中。

---

## 8. 武器专属展示页规划（demo-ak47 / demo-m4）

完全继承 `05-demo-integration.md` 步骤 10 的单物体骨架方案，新建两套独立页面。

### 8.1 页面文件矩阵
1. **AK-47 展示台**：`demo-ak47.html` + `js/demo/ak47-demo.js`
2. **M4A1 展示台**：`demo-m4.html` + `js/demo/m4-demo.js`

### 8.2 视觉与布光方案
- **环境光**：复用 `demo-common.js` 的 `createNeutralEnvironment` 生成高动态中性灰影棚 IBL。
- **三点光影配置**：
  * **Key Light**：俯角 45° 侧前方投射，强度 `1.4`，生成清晰硬朗的枪身结构投影。
  * **Fill Light**：弱冷色补充（`0x9bb7d4`，强度 `0.5`），充分照亮抛壳窗、快慢机和弹匣卡榫细节。
  * **Rim Light**：背上方暖白逆光（强度 `0.8`），完美勾勒枪管顶轮廓线与护木上沿。
- **展示展台**：深灰微磨砂台面，AK-47 配潜伏者暗红发光环（`#ff5a4d`），M4A1 配保卫者青蓝发光环（`#4da3ff`）。

### 8.3 交互与状态控制坞 (Control Dock)

```
+---------------------------------------------------------------------------------+
| [检视 Inspect]  [开火 Fire]  [换弹 Reload] | [转盘 Turntable]  [分解 Explode]  [线框 Wire] | [重置视角] |
+---------------------------------------------------------------------------------+
```

> 📌 **交互优先级规范【已确认 2026-09-27】**：单物体展示页优先交付**静态检视（Inspect）+ 机械结构分解（Explode）**，确保核心高保真工业解剖特征与爆炸图完整展示；换弹动画（Reload）与开火后坐（Fire）作为次级交互平滑交付。

1. **检视 Inspect**：枪身以手把为轴心，沿 X/Y 轴缓缓倾斜 35°~45°，多角度展示上机匣铭文与侧面涂装。
2. **开火 Fire**：次级交付交互，触发单发击发效果：枪机后坐 15mm 瞬间回弹、枪口闪现透明火光片、抛壳窗弹出一枚黄铜弹壳。
3. **换弹 Reload**：次级交付交互，弹匣沿插槽向量平滑向下滑出脱离、新弹匣推入锁死（伴随微震）、拉机柄向后拉出后复进。
4. **分解 Explode【已确认 2026-09-27 方案 B】**：**静态部件机械分解陈列（核心亮点）**：
   - 严格遵循全局统一的静态部件分解陈列规范（05 方案 B）：触发分解时，若当前正在播放检视、换弹或开火动画，平滑暂停动作并将武器归位至标准水平基准姿态（硬表面刚体分层树无骨骼拉扯破皮问题）；
   - 各独立机械部件沿规划拆卸向量平滑向外平移展开（缓动时长约 0.3s~0.5s，无穿模或突跳）：
     * 弹匣向下方脱落位移 `-0.25m`；
     * 机匣盖沿铰链向上翻转或向后上方飞起 `+0.15m`；
     * 机框与复进簧向后方拉出 `+0.20m`；
     * 护木向左/右两侧分开 `±0.10m`；
     * 消焰器向前脱开 `-0.15m`；
   - 再次点击 `分解 Explode` 时，部件精准复位到基准闭合位置，平滑恢复交互动画控制。
5. **线框 Wireframe**：一键切换高密拓扑线框，展示高精度多边形布线美感。
6. **无头自检**：连续渲染 5 帧无抛错触发 `document.title = 'DEMO_OK'`；报错则显示 `DEMO_ERR`。

---

## 9. 详细实施步骤 (Implementation Steps)

### 步骤 1：状态初始化与工作区建立
在项目根目录启动针对 AK-47 与 M4A1 的独立流水线工作区：

```bash
# 激活 Python 3.10+ 环境（支持 Windows 回退）
python3 -c "import sys; print(sys.version)" || py -3 -c "import sys; print(sys.version)"

# 建立 AK-47 工作区
python3 C:/Users/developer/.agents/skills/img2threejs/forge/state.py init \
  --workspace .img2threejs/hero-ak47 \
  --input assets/concepts/weapon-ak47-ref.png \
  --profile generic

# 建立 M4A1 工作区
python3 C:/Users/developer/.agents/skills/img2threejs/forge/state.py init \
  --workspace .img2threejs/hero-m4 \
  --input assets/concepts/weapon-m4-ref.png \
  --profile generic
```

### 步骤 2：Intake 与机械特征清单生成
执行图像探测与 3x3 细节矩阵分析：

```bash
# 提取细节特征清单与硬表面切分建议
python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/probe_image.py \
  --workspace .img2threejs/hero-ak47

python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/build_detail_inventory.py \
  --workspace .img2threejs/hero-ak47 \
  --mode grid-3x3
```

### 步骤 3：相机姿态求解与漫反射去光照（De-light）
为后续投影烘焙提供纯净漫反射输入：

```bash
# 解算正交视角相机
python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/solve_camera_pose.py \
  --workspace .img2threejs/hero-ak47 \
  --views front,side

# 漫反射光照剥离（硬性要求：去光照后方可投影）
python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/delight_albedo.py \
  --workspace .img2threejs/hero-ak47 \
  --output .img2threejs/hero-ak47/delighted-albedo.png
```

### 步骤 4：分层 Spec 编制与参数冻结
执行 `new_sculpt_spec.py` 固化解剖结构树，定义各个组件尺寸、倒角与材质分区，写入 `.img2threejs/hero-ak47/spec.json` 与 `.img2threejs/hero-m4/spec.json`。

### 步骤 5：程序化多 Pass 构建（Blockout → Structure → Form → Material）
依据 Spec 规范，在 `js/hero_models/ak47.js` 与 `js/hero_models/m4.js` 中编写原生 ES Module 代码：
- **Pass 1 (Blockout)**：以基本柱体与盒体构建机匣、枪管、枪托、弹匣的基础大比例轮廓。
- **Pass 2 (Structure)**：细化切削导气管、斜切消焰器、皮轨护木槽、握把倾角。
- **Pass 3 (Form)**：添加扳机护圈、准星护圈、冲压机匣盖加强筋、弹匣肋条等微观形体。
- **Pass 4 (Material)**：分配高精度 PBR 材质（Standard/Physical），配置环境光与粗糙度。

### 步骤 6：分材质区投影烘焙（Texture Projection Baking）
对木质件与金属机匣执行定向投影烘焙，产物自动导出至 `assets/textures/hero/`：

```bash
# 执行 AK-47 木件烘焙
python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage3_build/bake_projected_texture.py \
  --workspace .img2threejs/hero-ak47 \
  --part-mask furniture \
  --out assets/textures/hero/ak47-wood-albedo.png

# 执行 AK-47 金属机匣烘焙
python3 C:/Users/developer/.agents/skills/img2threejs/forge/stage3_build/bake_projected_texture.py \
  --workspace .img2threejs/hero-ak47 \
  --part-mask receiver \
  --out assets/textures/hero/ak47-metal-albedo.png
```

### 步骤 7：Demo 页面搭建与交互集成
新建 `demo-ak47.html` / `js/demo/ak47-demo.js` 及 `demo-m4.html` / `js/demo/m4-demo.js`：
- 加载 `../hero_models/ak47.js` 与 `../hero_models/m4.js`；
- 对接 `demo-common.js` 的影棚布光与 IBL；
- 优先交付静态检视 Inspect 与静态部件机械分解 Explode（方案 B），换弹 Reload 作为次级交互平滑接入；
- 编写 `Explode` 机械分解（静态基准姿态展开/复位缓动）与 `Inspect` 检视插值器；
- 挂载 5 帧 `DEMO_OK` 信号。

### 步骤 8：自动化无头验证与回归巡检
使用 Headless Chrome 执行自动化验收：

```bash
# 验证 AK-47 展示页
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless --dump-dom \
  "http://localhost:8080/demo-ak47.html" | grep "<title>"

# 验证 M4A1 展示页
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless --dump-dom \
  "http://localhost:8080/demo-m4.html" | grep "<title>"
```

---

## 10. 评审与验收标准 (Review & Acceptance)

### 10.1 武器特有解剖细节对照清单

#### AK-47 特殊核查清单
- [ ] **弯弹匣曲率（Banana Curve）**：严格呈现 7.62×39mm 标志性大曲率圆弧，弹匣表面具备清晰的冲压加强垂直肋条。
- [ ] **准星护圈（Front Sight Hood）**：准星基座上方为完整环形护圈，准星柱位于正中央，无几何断口。
- [ ] **导气管与枪管双层平行结构**：上方导气管（包裹上护木）与下方主枪管间隙明确，在导气箍处正确汇聚，绝非单粗圆柱。
- [ ] **斜切防跳器（Slanted Muzzle Brake）**：枪口末端具备鲜明的 45° 倾斜截面，方向指向射手右上方。
- [ ] **木件与金属材质分离**：枪托/护木的橙红木纹与机匣的暗黑金属交界清晰，无串色与拉伸。

#### M4A1 特殊核查清单
- [ ] **皮卡汀尼导轨连续性**：平顶上机匣导轨与护木上导轨高度平齐、齿宽均匀，形成贯通瞄准基线。
- [ ] **A2 鸟笼消焰器**：枪口圆柱开槽结构清晰，消焰器前端留有明显出弹口孔洞。
- [ ] **伸缩托与缓冲管嵌套**：枪托套筒与内部缓冲管（Buffer Tube）分件明确，展现活动机械层级感。
- [ ] **微型红点瞄准镜**：前后镜片透光度适中，红色十字/圆点准确悬浮于镜腔中央，不受视差畸变影响。
- [ ] **辅助推机柄（Forward Assist）**：右后方 45° 突出圆柱结构准确，弹壳偏向块（Deflector）棱角分明。

### 10.2 AI 视觉评审打分维度（四视角 Turntable 截图，满分 20 分，≥ 18 分为 PASS）

| 评审维度 | 权重 | 判定准则 |
|---|---|---|
| **1. 剪影与工业比例 (Proportions)** | 5 分 | 枪管长度、枪托比例、机匣厚度与弹匣弯曲角度与真实枪械图纸严格相符，无大头枪或玩具感。 |
| **2. 机械结构辨识度 (Mechanics)** | 5 分 | 抛壳窗、拉机柄、快慢机、准星、照门等 CS2 核心枪械解剖部件齐全且位置正确。 |
| **3. PBR 材质与饰面分离 (Materials)** | 5 分 | 金属具备冷硬高光与环境反射；木质呈现细腻纹理与哑光清漆质感；聚合物高粗糙度无塑料油腻感。 |
| **4. 微观刻线与倒角精细度 (Details)** | 5 分 | 倒角接缝柔和，导轨齿牙、防滑纹路与弹匣加强筋层次丰富，近景特写无穿帮破面。 |

---

## 11. 产出物清单 (Deliverables)

| 产出物路径 | 类型 | 说明 |
|---|---|---|
| `docs/model-optimization/plan/06-phase2-weapons.md` | Markdown | 本实施规划文档 |
| `js/hero_models/ak47.js` | ES Module | 潜伏者 AK-47 英雄版工厂 |
| `js/hero_models/m4.js` | ES Module | 保卫者 M4A1 英雄版工厂 |
| `demo-ak47.html` | HTML | AK-47 独立高保真展示舞台 |
| `demo-m4.html` | HTML | M4A1 独立高保真展示舞台 |
| `js/demo/ak47-demo.js` | ES Module | AK-47 展示交互逻辑（检视/换弹/分解/无头测试） |
| `js/demo/m4-demo.js` | ES Module | M4A1 展示交互逻辑（检视/换弹/分解/无头测试） |
| `assets/textures/hero/ak47-*.png` | PNG 图像 | AK-47 烘焙贴图集（木纹、金属、粗糙度） |
| `assets/textures/hero/m4-*.png` | PNG 图像 | M4A1 烘焙贴图集（机匣、聚合物） |
| `.img2threejs/hero-ak47/` | 目录 | AK-47 forge 流水线状态数据与评审报告 |
| `.img2threejs/hero-m4/` | 目录 | M4A1 forge 流水线状态数据与评审报告 |

---

## 12. 风险与回退方案 (Risks & Fallbacks)

1. **参考图质量与遮挡风险**：
   - *风险*：若无法引入独立正交参考图，强行使用角色图会导致烘焙贴图包含手套和阴影污渍。
   - *回退*：采用程序化 Canvas 纹理生成器合成高质量木纹（对齐 `militiaShemaghTex` 模式），辅以标准金属材质微噪点，确保零污渍纯净质感。
2. **分解视图穿插与错位风险**：
   - *风险*：机械分解（Explode View）时，活动零件如果未按真实拆卸路径（如 AK 机匣盖翻起、M4 托芯后退）位移，会产生反直觉的视觉穿插。
   - *回退*：严格按照本方案 8.3 节规定的轴向位移向量实施（静态部件分解方案 B），并在 Spec 中锁定每个 Part 的局部拆解导向矩阵。
3. **性能与网格预算膨胀风险**：
   - *风险*：皮卡汀尼导轨过多的微小齿牙可能导致单把武器顶点数暴增（超过 30,000 面）。
   - *回退*：采用法线/凹凸贴图表达细密导轨齿，网格几何体控制在 80 个部件以内，三角形总数严格执行 15,000~18,000 面上限预算（已确认预算标准）。

---

## 13. 决策记录（2026-09-27 用户确认） (Decision Log)

2026-09-27 用户已完成 Phase 2 实施规划决策评审，全部采纳推荐方案，结论冻结如下：

1. **武器参考图来源【已确认 2026-09-27】**：采纳推荐方案 B。Phase 2 启动前新增两张纯净横置高清单体参考图 `assets/concepts/weapon-ak47-ref.png` 与 `weapon-m4-ref.png`（由用户/制作侧提供，列为 Phase 2 启动前置条件），彻底规避现有角色图大面积遮挡、斜向透视畸变及投影烘焙污渍问题。（方案 A 裁剪现有角色图作为备选，未采纳）。
2. **动作交互复杂度【已确认 2026-09-27】**：采纳推荐方案。单物体展示页优先交付"静态检视（Inspect）+ 机械结构分解（Explode）"，确保高精度工业结构与爆炸图细节完整展现；换弹动画（Reload）与开火后坐（Fire）作为次级交互平滑交付。机械分解全局统一采用 05 方案 B（静态部件分解陈列：触发分解时动画平滑暂停、武器归位基准姿态，独立部件按规划向量向外展开，复位后恢复原位并恢复动画控制）。
3. **面数预算标准【已确认 2026-09-27】**：采纳推荐方案。武器英雄版单体三角形面数上限严格执行 15,000~18,000 三角形（AK-47 控制在 ≤15,000 面，M4A1 控制在 ≤18,000 面），网格数 ≤80，兼顾 WebGL 实时 60FPS 运行性能与特写级工业几何细节。**统计范围说明**：本预算仅适用于武器专属展示页（`demo-ak47.html` / `demo-m4.html`）的单体特写展示，与 `02-pipeline-conventions.md` 3.4 节性能预算总表中「Phase 2 武器单体」行一致；当武器作为人物 demo 页的随附挂载件时，适用该表「随附武器 ≤ 6,000 三角面」口径。
