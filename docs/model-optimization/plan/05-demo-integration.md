# 05-demo-integration.md —— Demo 页集成与渲染栈升级计划

> 本文档为 fps-demo 模型精细化优化规划文档集第 5 篇。  
> 关联文档：`00-master-plan.md`（总规划）、`01-environment-setup.md`（环境准备）、`02-pipeline-conventions.md`（通用规范）、`03-hero-militia.md`（民兵实施）、`04-hero-swat.md`（特警实施）、`06-phase2-weapons.md`（武器规划）。

---

## 1. 目标与范围 (Goal & Scope)

### 1.1 核心目标
将现有的角色展示页面（`demo-militia.html`、`demo-swat.html`）升级为适配次世代英雄版模型的**高保真展示舞台**：
1. **模型源解耦升级**：展示页模型加载源从现有低模（`js/soldier_models/`）彻底切换为英雄版工厂（`js/hero_models/`），主游戏页面 `index.html` 完全隔离保持不变。
2. **动画系统换代**：废弃逐帧硬编码三角函数的 `syncMesh` 驱动方式，接入标准 `THREE.AnimationMixer` 与骨骼蒙皮动画剪辑驱动。
3. **渲染栈全 PBR 化**：引入 `PMREMGenerator` 环境光照（IBL）、`MeshStandardMaterial` 材质系统与校准后的影棚三点布光，全面激活投影烘焙贴图质感。
4. **交互体验演进**：平滑升级分解检视（Explode View）、线框模式（Wireframe）与检视转盘（Turntable），补全高模维度的技术档案与贴图溯源侧栏。
5. **自动化测试加固**：保持无头测试 `DEMO_OK` 信号契约，增加骨骼剪辑加载自检与防静默失效机制。
6. **武器展示模板奠基**：抽离通用的 Showcase 交互与渲染模式，为 Phase 2 武器展示页（`demo-ak47.html`、`demo-m4.html`）提供直接复用的脚手架。

### 1.2 边界与隔离规则
- **严格隔离游戏主场景**：`index.html`、`js/game.js`、`js/soldier_models/` 继续维持现有轻量低模及程序化摆腿逻辑，零改动，零回归风险。
- **纯 ES Module 无构建步骤**：严格遵守项目的原生 ES Module 规范，通过 `importmap` 引用 `./js/vendor/three.module.js`，不引入 Node 构建打包器。
- **只读引用外部规范**：本计划严格对齐 `docs/model-optimization/README.md` 与官方 character 插件的 `reference/animation-contract.md` 契约。

---

## 2. 前置依赖 (Prerequisites)

在开始执行本篇计划前，必须确保以下前置条件达成：

| 前置项 | 来源文档 / 资源 | 交付物判定标准 |
|---|---|---|
| **执行环境就绪** | `01-environment-setup.md` | 本地 Python 3.10+ 可用，`img2threejs` 与 `img2-character` 单元测试通过，Chrome 无头可用 |
| **通用规范冻结** | `02-pipeline-conventions.md` | 英雄模型工厂统一导出接口 `{ group, mixer, clips, rootBone, bounds }` 规范已确立 |
| **英雄模型产出 (Militia)** | `03-hero-militia.md` | `js/hero_models/militia.js` 已生成，烘焙贴图位于 `assets/textures/hero/` |
| **英雄模型产出 (SWAT)** | `04-hero-swat.md` | `js/hero_models/swat.js` 已生成，烘焙贴图位于 `assets/textures/hero/` |
| **常驻 HTTP 服务** | 项目约定 | `http://localhost:8080` 常驻运行中（严禁重启或杀进程） |

---

## 3. 现状架构摘要 (Current Architecture Summary)

在改造前，对现有展示页代码（`demo-militia.html`、`js/demo/militia-demo.js`、`demo-swat.html`、`js/demo/swat-demo.js`）的核心设计与短板进行摸底梳理：

### 3.1 动画契约现状（`syncMesh` 程序化硬算）
- **实现方式**：模型工厂返回 `{ group, legL, legR, arms, head, gunTip }` 六个独立局部节点。
- **驱动逻辑**：Demo 脚本在 `animate()` 循环中调用 `updateAnimation(dt)`，通过 `Math.sin(time)` 和 `walkPhase` 直接计算 `legL.rotation.x`、`head.rotation.y`、`torso.position.y` 等数值，并以 `blend = dt * 10.0` 进行线性平滑。
- **局限性**：无法支持复杂蒙皮形变、骨骼权重、手部手指弯曲或真实走姿，部件间容易产生拉伸缝隙或穿插。

### 3.2 URL 参数契约现状
现有 Demo 页面均支持以下 4 个标准查询参数，用于自动化巡检和直链定位：
- `anim=idle|walk|aim`：指定初始化姿态（默认 `idle`）。
- `explode=1`：初始化进入部件分解视图（默认 `0`）。
- `wire=1`：初始化开启全模型线框模式（默认 `0`）。
- `turntable=1`：初始化开启全台自动匀速旋转（默认 `0`）。

### 3.3 无头验证信号契约
- 页面在 `requestAnimationFrame` 循环中记录有效帧数 `frames`。
- **成功信号**：连续渲染满 5 帧且未捕获到全局 JS 异常时，触发 `document.title = 'DEMO_OK'` 与 `window.__ready = true`。
- **失败信号**：监听 `window.error` 与 `unhandledrejection`，一旦报错则在 `#err` 框填充错误栈，并将 `document.title = 'DEMO_ERR'`。

### 3.4 侧栏与控制坞 UI 结构
- **顶部 Header**：展示阵营 Badge（`TEAM A` / `TEAM B`）与角色英文名子标题。
- **右侧 Info Sidebar**：包含概念参考图预览（`ref-card`）、阵营与规格参数列表（`meta-list`）、操作指引（`guide-box`）。可通过右上角悬浮按钮收起与展开。
- **底部 Control Dock**：悬浮毛玻璃胶囊控制坞，包含三个独立按钮组：
  1. 动作状态组：`待机 Idle`、`行走 Walk`、`瞄准 Aim`。
  2. 模式切换组：`转盘 Turntable`、`分解 Explode`、`线框 Wireframe`。
  3. 视图重置组：`重置视角`。

### 3.5 现有灯光与色调映射现状
- 启用了 `THREE.ACESFilmicToneMapping` 与 `renderer.toneMappingExposure = 1.1`。
- 采用冷暖分离的影棚三点平行光（Key 1.25 / Fill 0.40~0.45 / Rim 0.65）及半球光（HemisphereLight 0.85~0.90）。
- **短板**：完全缺少环境贴图反射（IBL / PMREM）。现有材质以 `MeshPhongMaterial` 为主，高光缺乏环境各向同性反射，金属度与粗糙度无真实物理响应。

---

## 4. 详细实施步骤 (Implementation Steps)

### 步骤 1：模型源解耦与英雄版工厂导入
展示页模型加载层全面重构，废弃 `../soldier_models/*.js`，对接 `../hero_models/*.js`。

#### 1.1 依赖导入与工厂接口适配
在 `js/demo/militia-demo.js` 与 `js/demo/swat-demo.js` 中替换导入：
```javascript
// 旧代码：import { buildMilitiaMesh } from '../soldier_models/militia.js';
// 新代码：
import { buildHeroMilitia } from '../hero_models/militia.js';
```

#### 1.2 英雄版数据输出契约
英雄版工厂统一返回标准数据结构（权威签名以 `02-pipeline-conventions.md` 3.3 节为准）：
```javascript
/**
 * 英雄模型构建契约定义
 * @typedef {Object} HeroModelPayload
 * @property {THREE.Group} group - 模型显示根节点（包含 SkinnedMesh 与 Bone 节点）
 * @property {THREE.SkinnedMesh} skinnedMesh - 主蒙皮网格
 * @property {THREE.Skeleton} skeleton - 骨骼实例
 * @property {THREE.AnimationMixer} mixer - 绑定的动画混合器实例
 * @property {Object<string, THREE.AnimationClip>} clips - 命名动作剪辑字典（普通对象，键 idle / walk / aim，可选 death；非 Map）
 * @property {Object<string, THREE.Object3D>} anchors - 关键锚点（rootBone、socket_right_hand 等）
 * @property {() => void} dispose - 资源释放器
 * @property {THREE.Box3} [bounds] - 初始 T-pose 下的模型包围盒（可选扩展，用于机位对焦与展示偏移）
 * @property {Array<THREE.Mesh|THREE.SkinnedMesh>} [parts] - 结构分件清单（可选扩展，用于分解视图控制）
 */
const hero = await buildHeroMilitia({ teamColor: TEAM.B.color });
scene.add(hero.group);
```

> **本节验收标准**：
> - [ ] 控制台无模块加载 404 或命名导入未匹配错误。
> - [ ] `hero.group` 成功挂载至 `modelRoot`，模型包围盒高度落在 `1.72m ~ 1.76m` 之间，朝向严格为 `-Z`。

---

### 步骤 2：动画系统升级为 AnimationMixer 架构
全面移除基于 `curPose` 的每帧手动插值计算，全面切换到 Three.js 标准骨骼剪辑体系。

#### 2.1 状态机与 Crossfade 过渡策略
设计统一的动作切换器，保证在不同动作间平滑混合，彻底杜绝动作瞬跳：
```javascript
let currentAction = null;
const FADE_DURATION = 0.28; // 标准过渡时长 0.28s（兼顾平滑感与响应速度）

function playAction(clipName) {
  const clip = hero.clips[clipName];
  if (!clip) {
    console.warn(`[Animation] 剪辑 "${clipName}" 不存在，执行降级逻辑`);
    fallbackToDefaultAction();
    return;
  }

  const nextAction = hero.mixer.clipAction(clip);
  if (currentAction === nextAction) return;

  nextAction.reset();
  nextAction.enabled = true;
  nextAction.setEffectiveTimeScale(1);
  nextAction.setEffectiveWeight(1);

  if (currentAction) {
    currentAction.crossFadeTo(nextAction, FADE_DURATION, true);
  }
  nextAction.play();
  currentAction = nextAction;
}
```

#### 2.2 动作缺失降级保护机制
按照 `img2-character` 插件规范，为防止构建过程中的半成品或特定动作剪辑缺失导致整体验收报错：
1. **降级优先级**：若目标剪辑缺失，优先尝试回退至 `idle`；若 `idle` 亦缺失，回退至 `clips` 的第一个可用剪辑；若剪辑集为空，模型静止于绑定 T-pose。
2. **错误记录而非崩溃**：控制台输出醒目 Warning，并在自检机制中标记状态，但不触发 `window.onerror` 崩溃，保障基础渲染与视口检视畅通。

#### 2.3 按钮组事件绑定与状态同步
```javascript
const animButtons = document.querySelectorAll('#anim-group .ctrl-btn');
function setAnim(name) {
  currentAnim = name;
  animButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.anim === name);
  });
  playAction(name);
}
```

> **本节验收标准**：
> - [ ] 点击 `待机 Idle`、`行走 Walk`、`瞄准 Aim` 按钮时动作平滑切换，无骨骼位移跳变或破皮。
> - [ ] 动作循环播放（LoopRepeat）正常，行走动作左右脚交替着地，瞄准动作双手持枪平稳指向 `-Z`。

---

### 步骤 3：分解视图（Explode View）方案论证与落地【已确认 2026-09-27】

在单体蒙皮模型（SkinnedMesh）上实现分解视图存在技术冲突：如果模型是单一体网格，直接平移骨骼会导致网格被极端拉扯形成畸变破坏。对此，规划两个方案并已完成决策（2026-09-27 用户确认采纳方案 B 作为全局统一基准）：

#### 方案对比与实现要点

| 维度 | 方案 A：按骨骼层级组位移 (Bone Offset)（备选，未采纳） | 方案 B：静态分件 T-Pose 陈列 (Explode Pieces) 【已确认 2026-09-27】 |
|---|---|---|
| **核心机制** | 在骨架计算层，沿骨骼局部轴向施加平移偏移向量（如肩、颈、髋向外推出） | 点击分解时暂停动画混音器，模型归位为标准检视姿态，外层装具/武器/部件沿法向平移分离 |
| **视觉呈现** | 动画在分解状态下**保持播放**，四肢分离舞动 | 模型变为**静态高精度结构剖析台**，装具与分件整齐悬浮陈列 |
| **技术前置** | 必须采用**多网格离散蒙皮**结构，否则单一体蒙皮网格会出现面条状拉伸撕裂 | 英雄模型在构建时保留结构分件独立的 Mesh 清单（`hero.parts`） |
| **优劣势** | 优势：动态感强；劣势：关节连接处露出内部空腔，破坏工业级严谨感 | 优势：高度严谨、贴合军事/战术装具分解图审美，绝不破皮；劣势：无法边走边分解 |
| **实现难度** | 中等偏高（需修正骨骼逆变换） | 低至中等（基于独立零件的本地坐标平移缓动） |

#### 实施方案与落地逻辑（方案 B【已确认 2026-09-27】）
> **【已确认 2026-09-27】采纳方案 B（静态 T-pose 部件分解陈列，作为全局统一基准）**。  
> 战术角色展示的核心诉求是严谨检视头巾、战术背心、插板、MOLLE 弹匣袋、护膝等装备细节，静态分解图符合工业级 3D 资产 Showcase 的业界通用规范。触发分解时动画平滑暂停、模型归位标准姿态，独立装具（头巾/插板/弹匣袋/挂包/护膝/武器等）按规划向量向外平移，复位后恢复动画；连续蒙皮本体不做骨骼位移拉扯（避免蒙皮面条状破皮）。

**实现代码设计**：
```javascript
let isExploded = false;
let explodeProgress = 0.0;

function updateExplode(dt) {
  const targetExp = isExploded ? 1.0 : 0.0;
  explodeProgress += (targetExp - explodeProgress) * Math.min(1.0, dt * 6.0);

  // 当分解进度大于 0.01 时，逐步减弱骨骼动画权重，防止动画摆动与分解干涉
  if (hero.mixer) {
    hero.mixer.timeScale = 1.0 - Math.min(1.0, explodeProgress * 1.2);
  }

  // 对英雄模型的独立装具部件施加位移
  hero.parts.forEach((part) => {
    if (part.userData.explodeVector) {
      part.position.copy(part.userData.basePosition).addScaledVector(
        part.userData.explodeVector,
        explodeProgress
      );
    }
  });
}
```

> **本节验收标准**：
> - [ ] 点击 `分解 Explode` 按钮，各战术部件平滑向外分离，缓动时长约 0.3s~0.5s，无穿模或突跳。
> - [ ] 再次点击 `分解 Explode`，部件精准复位到基准位置，动画播放无缝恢复。

---

### 步骤 4：线框模式（Wireframe）在蒙皮+纹理模型上的行为定义

在带有 PBR 贴图和多重材质的英雄模型上，直接修改 `material.wireframe = true` 会导致黑色暗部与纹理高光混杂，视觉混乱且失去对网格拓扑的清晰判断。

#### 4.1 规范行为定义
1. **纯几何布线检视**：线框模式开启时，**暂时禁用颜色贴图（map）的暗色干扰**，赋予统一的半透明高对比度中性底色（如科技暗灰 `0x2a303c`），表面覆以清晰的高亮青色/白线框（`0x64b5f6`）。
2. **深度自穿透防护**：采用带深度偏移（`polygonOffset: true`）的双通道渲染，或在材质上保留表面光照的同时呈现线框，确保前后遮挡关系清晰，不产生杂乱的透视 X-Ray 干扰。

#### 4.2 具体实现方案
在 Demo 脚本中建立材质状态管理器：
```javascript
const originalMaterials = new Map();

function setWireframeMode(enabled) {
  hero.group.traverse((child) => {
    if (child.isMesh || child.isSkinnedMesh) {
      if (enabled) {
        if (!originalMaterials.has(child)) {
          originalMaterials.set(child, child.material);
        }
        // 创建或复用统一的线框检测材质（保留蒙皮支持）
        child.material = new THREE.MeshStandardMaterial({
          color: 0x303642,
          wireframe: true,
          roughness: 0.6,
          metalness: 0.1,
          skinning: !!child.isSkinnedMesh // 严格匹配蒙皮属性
        });
      } else {
        if (originalMaterials.has(child)) {
          child.material = originalMaterials.get(child);
        }
      }
    }
  });
}
```

> **本节验收标准**：
> - [ ] 点击 `线框 Wireframe` 按钮，全模型立即呈现规整的拓扑网格线条，蒙皮运动保持正常（若是动态状态）。
> - [ ] 切回常规模式时，所有 PBR 贴图（Albedo, Normal, Roughness）与原有材质完全复原，无内存泄漏与材质丢件。

---

### 步骤 5：渲染栈全 PBR 化与 PMREM 环境光升级

#### 5.1 Three.js r160 现实约束与环境光方案决策【已确认 2026-09-27】
- **事实依据**：项目 `js/vendor/three.module.js` 为 Three.js r160 核心包，内含 `THREE.PMREMGenerator`，但**未打包** `RoomEnvironment` 扩展组件。
- **方案决策**：
  - *方案 A（备选，未采纳）*：外部下载并引入 `RoomEnvironment.js`。缺陷：需额外增加文件依赖与 importmap 映射。
  - *方案 B【已确认 2026-09-27】*：**纯 JS 代码化构建轻量中性工作室环境（Neutral Studio Environment）**，作为**默认内置兜底**。在 demo 脚本内或轻量 helper 中用 Three.js 原生几何体与面光源拼装一个极简白灰影棚 Box，调用 `pmremGenerator.fromScene(studioScene).texture` 烘焙为 IBL。无外部文件依赖，性能极高（一次性生成仅耗时数毫秒）。
  - *方案 C【已确认 2026-09-27】*：通过 Polyhaven 下载 1K 室内 HDRI（如 `studio_small_08_1k.hdr`）配合 `RGBELoader`，作为**后续可选高保真切换**。画质最高，保留作为后续可选扩展。

> **【已确认 2026-09-27】采用方案 B 作为默认内置兜底，方案 C 作为后续可选高保真切换**。

#### 5.2 落地执行方案 B 代码实现（纯代码 Neutral Studio PMREM）
```javascript
function createNeutralEnvironment(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const studioScene = new THREE.Scene();
  studioScene.background = new THREE.Color(0x20242a);

  // 顶置主扩散软光源
  const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
  topLight.position.set(0, 10, 0);
  studioScene.add(topLight);

  // 侧边冷暖反光板模拟（给予金属表面丰富冷暖层次）
  const fillPanel = new THREE.DirectionalLight(0xa0c4ff, 1.2);
  fillPanel.position.set(-6, 3, 4);
  studioScene.add(fillPanel);

  const warmPanel = new THREE.DirectionalLight(0xffd166, 0.8);
  warmPanel.position.set(6, 2, -4);
  studioScene.add(warmPanel);

  const envMap = pmremGenerator.fromScene(studioScene, 0.04).texture;
  pmremGenerator.dispose();
  return envMap;
}

// 应用到主场景
const envTexture = createNeutralEnvironment(renderer);
scene.environment = envTexture;
```

#### 5.3 影棚灯光参数随 PBR 重平衡
引入 IBL 后，原有的平行光强度若维持不变会导致模型高光过曝、衣服发白。必须调低平行光强，让环境漫反射接管暗部：
- **Key Light (主平行光)**：强度从 `1.25` 下调至 `0.85`，投射高质量柔和阴影（`shadow.bias = -0.0003`）。
- **Fill Light (冷色补光)**：强度从 `0.45` 削减至 `0.20`，微调为主体补光。
- **Rim Light (暖色轮廓光)**：强度保持 `0.60`，严格勾勒肩部与头盔轮廓。
- **HemisphereLight**：强度削减至 `0.25`，避免洗淡 PBR 固有色。
- **色调映射微调**：`renderer.toneMappingExposure = 1.0`，确保纯黑布料与金属细节清晰可辨。

> **本节验收标准**：
> - [ ] 场景 `scene.environment` 正确生效，模型金属部件（机匣、搭扣）清晰倒映环境渐变高光。
> - [ ] 衣服高光不过曝、暗部不死黑，整体色彩饱和度贴近原画设计稿。

---

### 步骤 6：参考图面板与技术信息侧栏内容更新

右侧折叠面板（`#info-sidebar`）从单纯的文本说明升级为**高模资产档案台**：

#### 6.1 概念参考图与烘焙产物联动
- 原画展示卡片支持双图切换：`assets/concepts/militia-v3.png`（设计原稿）与 `assets/textures/hero/militia-albedo-front.png`（去光照投影烘焙图）。
- 标注图像尺寸与烘焙时间戳，向评审者证明贴图来源的合法性与纯粹性。

#### 6.2 实时技术指标采集显示
在 Demo 脚本中加入实时几何剖析逻辑，在侧栏中自动渲染关键指标：
```javascript
function collectModelStats(rootGroup) {
  let triangles = 0;
  let drawCalls = 0;
  let bonesCount = 0;
  const materials = new Set();

  rootGroup.traverse((obj) => {
    if (obj.isMesh || obj.isSkinnedMesh) {
      drawCalls++;
      if (obj.geometry) {
        triangles += obj.geometry.index 
          ? obj.geometry.index.count / 3 
          : obj.geometry.attributes.position.count / 3;
      }
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => materials.add(m));
      } else if (obj.material) {
        materials.add(obj.material);
      }
    }
    if (obj.isBone) {
      bonesCount++;
    }
  });

  return { triangles: Math.round(triangles), drawCalls, bonesCount, materials: materials.size };
}
```

更新 sidebar DOM 元素：
- **三角面数 (Tris)**：如 `24,520`。
- **骨骼数 (Bones)**：如 `40`（统一预算：主体 ≤ 32 + 次级 ≤ 12，总数 ≤ 44，见 `02-pipeline-conventions.md` 3.4 节）。
- **材质数 (Materials)**：如 `4`（遵循图集化收敛标准）。
- **动画剪辑数 (Clips)**：展示 `idle`, `walk`, `aim` 及其时长。

> **本节验收标准**：
> - [ ] 侧栏信息与真实英雄模型参数完全吻合，动态计算更新无误。
> - [ ] 原画卡片与烘焙产物预览清晰完整，支持一键放大/对比。

---

### 步骤 7：URL 参数契约的保持与扩展决策

#### 7.1 向后兼容保证
现有自动化脚本与文档直链完全兼容，原有 4 个核心参数语义完全保留：
- `?anim=walk`：准确触发 `playAction('walk')`。
- `?explode=1`：初始即呈现分解展开形态。
- `?wire=1`：初始即加载线框模式。
- `?turntable=1`：初始开启转盘匀速自转。

#### 7.2 新增扩展调试与对比参数【已确认 2026-09-27】
在保留原有 `anim`、`explode`、`wire`、`turntable` 四项标准参数的基础上，新增以下调试与降级对比参数：
- `?debug=1`：在场景中附加 `THREE.SkeletonHelper(hero.group)` 骨骼连线辅助，并在左上角打印实时 FPS 与渲染耗时。
- `?hero=0`【已确认 2026-09-27】：一键加载 `../soldier_models/*.js` 旧版低模，用于新旧同屏对比及紧急降级验证。

> **本节验收标准**：
> - [ ] 访问 `demo-militia.html?anim=walk&turntable=1` 能立即以行走动作自转启动。
> - [ ] 访问 `demo-swat.html?wire=1&explode=1` 能立即呈现线框分解态。

---

### 步骤 8：无头验证（Headless Chrome）方案加固

现有的无头验证仅检测“渲染 5 帧不抛 JS 异常”，存在致命盲区——如果动画剪辑不存在或未绑定到骨架，模型定格不动（即 `animation-contract.md` 警告的“G1 静默失效”），现有的测试仍会盲目打出 `DEMO_OK`。因此必须全面加固自检逻辑。

#### 8.1 自检逻辑增强实现
在第 3 帧采样蒙皮顶点基准位置，第 5 帧触发验证前执行强一致性健康体检：
```javascript
// —— G1 轻量采样：播放时顶点位移（防静默死亡断路器）——
// 采样蒙皮后顶点局部坐标（applyBoneTransform 不含物体世界变换，故不受转盘旋转干扰）
let vertexSampleT0 = null;
function sampleSkinnedVertexPosition() {
  let target = null;
  hero.group.traverse((o) => { if (!target && o.isSkinnedMesh) target = o; });
  if (!target) return null;
  return target.applyBoneTransform(0, new THREE.Vector3()); // r160 方法名（旧名 boneTransform）
}

function performSelfDiagnosis() {
  const issues = [];
  
  // 1. 检查英雄模型根节点与骨架
  if (!hero || !hero.group) issues.push('Hero model root is null');
  if (!hero.mixer) issues.push('AnimationMixer is missing');
  
  // 2. 检查必需动画剪辑集（clips 为普通对象字典，按键名读取，非 Map）
  const REQUIRED_CLIPS = ['idle', 'walk', 'aim'];
  for (const name of REQUIRED_CLIPS) {
    const clip = hero.clips?.[name];
    if (!clip) {
      issues.push(`Mandatory clip "${name}" is missing`);
    } else if (clip.duration <= 0) {
      issues.push(`Clip "${name}" has invalid duration <= 0`);
    }
  }

  // 3. 检查蒙皮网格与绑定骨架
  let skinnedMeshFound = false;
  hero.group.traverse((obj) => {
    if (obj.isSkinnedMesh) {
      skinnedMeshFound = true;
      if (!obj.skeleton || obj.skeleton.bones.length === 0) {
        issues.push(`SkinnedMesh "${obj.name}" has no bound bones`);
      }
    }
  });
  if (!skinnedMeshFound) issues.push('No SkinnedMesh found in hero model hierarchy');

  // 4. G1 顶点位移采样对比（第 3 帧 vs 第 5 帧）：剪辑存在但网格不动即静默死亡
  //    阈值 1e-6 只判定"绝对静止"，不评估动画质量
  if (!vertexSampleT0) {
    issues.push('Vertex sample at frame 3 missing (sampling not wired)');
  } else {
    const p1 = sampleSkinnedVertexPosition();
    const delta = p1 ? p1.distanceTo(vertexSampleT0) : 0;
    if (!Number.isFinite(delta) || delta <= 1e-6) {
      issues.push(`G1 silent-death tripwire: skinned vertex displacement = ${delta}（剪辑存在但未驱动网格）`);
    }
  }

  return issues;
}
```

在主循环第 3/5 帧接入采样与判定：
```javascript
if (++frames === 3) {
  vertexSampleT0 = sampleSkinnedVertexPosition(); // 动画已开始播放时的基准采样
}
if (frames === 5) {
  const diagnosisErrors = performSelfDiagnosis();
  if (diagnosisErrors.length === 0) {
    document.title = 'DEMO_OK';
    window.__ready = true;
  } else {
    reportError('SelfDiagnosis Failed:\n' + diagnosisErrors.join('\n'));
    document.title = 'DEMO_ERR';
  }
}
```

#### 8.2 自动化无头执行命令（Windows 适配）
```bash
# 检查民兵 Demo 默认状态（cmd / git bash 通用）
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --dump-dom "http://localhost:8080/demo-militia.html" | grep "<title>"

# 检查 SWAT Demo 行走动画与转盘模式
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --dump-dom "http://localhost:8080/demo-swat.html?anim=walk&turntable=1" | grep "<title>"
```
*判定规则*：输出必须包含 `<title>DEMO_OK</title>`，若为 `DEMO_ERR` 或包含异常堆栈即判定构建不合格。

> **本节验收标准**：
> - [ ] 正常情况下 Chrome 无头 dump-dom 稳定输出 `<title>DEMO_OK</title>`。
> - [ ] 人为破坏一个动作剪辑名称时，无头 dump-dom 必须精准捕获并输出 `<title>DEMO_ERR</title>`，杜绝假阳性。
> - [ ] 人为解除剪辑与骨架的绑定（模拟静默死亡）时，G1 顶点位移断路器必须触发并输出 `<title>DEMO_ERR</title>`，不得误报 `DEMO_OK`。

---

### 步骤 9：英雄版展示性能预算 (Showcase Performance Budget)

英雄版模型专为**单体近距离特写展示台**服务，不承担游戏同屏 10 人激烈对战负担，但必须保证主流笔记本核显（如 Intel Iris Xe / AMD Radeon 680M）在 1080P 下稳定运行于 60 FPS：

| 性能维度 | 建议预算上限 | 底线预警阈值 | 优化控制策略 |
|---|---|---|---|
| **三角形面数 (Triangles)** | **页面总量 ≤ 30,000 tris** | > 45,000 tris | 分层口径（权威总表见 `02-pipeline-conventions.md` 3.4 节）：角色本体 ≤ 15,000 + 独立装具 ≤ 7,000 + 随附武器 ≤ 6,000，完整合计 ≤ 28,000 |
| **材质数 (Materials)** | **≤ 5 个** | > 8 个 | 角色身体主材质 (1) + 头部头巾/头盔 (1) + 武器 (1) + 配件/透明件 (1~2) |
| **贴图分辨率上限** | **2048×2048 (2K)** | > 4096×4096 (4K) | 主身体/头部 2K Albedo/Normal，装具与小物件通道打包至 1K |
| **Draw Calls** | **≤ 16 次** | > 25 次 | 相同材质网格尽量合并 Geometry，严禁碎片化拼装过多零散 Mesh |
| **骨骼总数 (Bones)** | **≤ 44 根** | > 60 根 | 主体人形骨架 ≤ 32 根（不含手指骨，手部固定握持姿态）+ 头巾/弹药袋次级动态骨骼 ≤ 12 根 |
| **运行时显存占用** | **≤ 120 MB** | > 200 MB | 及时释放 PMREM 生成器中间临时纹理 |

> **本节验收标准**：
> - [ ] 打开浏览器 Performance 面板，全屏运行 Demo 5 秒内，帧率稳定在 58~60 FPS，无持续内存泄漏。
> - [ ] 侧栏采集到的 Triangles 与 Draw Calls 严格位于上述预算范围内。

---

### 步骤 10：Phase 2 武器专属展示页（demo-ak47 / demo-m4）骨架规划

为后续 Phase 2 武器英雄版重构（`06-phase2-weapons.md`）制定统一的页面继承与演化范式，对标官方 AWP Medusa 级工艺：

#### 10.1 新增文件规划
- 潜伏者主武器：`demo-ak47.html` + `js/demo/ak47-demo.js`
- 保卫者主武器：`demo-m4.html` + `js/demo/m4-demo.js`

#### 10.2 骨架架构继承与特化调整
1. **完全复用本篇成果**：
   - 继承相同的 UI 布局样式（顶部 Header、右侧 Sidebar、底部 Control Dock）。
   - 继承 `createNeutralEnvironment` PMREM IBL 环境光与影棚布光。
   - 继承 `DEMO_OK` / `DEMO_ERR` 自动化无头检测机制。
2. **武器专属交互与动作状态机特化**：
   - 将角色动作按钮（idle/walk/aim）改造为武器专属交互状态：
     * `检视 Inspect`：枪身斜置转动 45° 检视枪机铭文与侧面涂装细节。
     * `换弹 Reload`：弹匣抽出下落、新弹匣插回、拉机柄复进动作（关键帧动画）。
     * `射击 Fire`：枪机后坐、枪口瞬时火光（Particle/Sprite）、抛壳窗联动。
3. **特写部件分解视图 (Explode View)**：
   - 沿枪管中心轴向展开：机匣盖向上弹开、机框与复进簧向后拉出、导气箍与护木向前分离、弹匣向下脱出。展现极度真实的枪械结构美感。
4. **角色挂载 Socket 锚点预留**：
   - 武器展示模型必须标记标准握持锚点（`RightHandGrip`）与辅助握持锚点（`LeftHandGuard`），并在导出对象中附带 `socketOffsets`，为未来将英雄武器组装至英雄人物手部提供数据支撑。

---

## 5. 产出物清单 (Deliverables)

| 文件路径 | 类型 | 核心职责 |
|---|---|---|
| `demo-militia.html` | HTML 页面 | 潜伏者英雄版展示舞台入口，更新标题、侧栏结构与样式 |
| `demo-swat.html` | HTML 页面 | 保卫者英雄版展示舞台入口，对齐相同的交互框架与视口结构 |
| `js/demo/militia-demo.js` | ES Module 脚本 | 潜伏者 Demo 逻辑：PBR/IBL 渲染、Mixer 动画调度、分解/线框/转盘交互、无头自检 |
| `js/demo/swat-demo.js` | ES Module 脚本 | 保卫者 Demo 逻辑：结构与 militia-demo 一致，阵营青色主题与参数特化 |
| `js/demo/demo-common.js`（建议抽离） | ES Module 共享库 | 沉淀通用的 PMREM 环境光生成、PBR 影棚三点光、侧栏指标统计与自检辅助函数 |

---

## 6. 验收标准与检查清单 (Acceptance Checklist)

执行改造后，必须逐项进行物理检查并打勾确认：

### 6.1 渲染栈与光影表现
- [ ] `scene.environment` 成功注入 IBL 贴图，金属零件具备环境渐变反光。
- [ ] `renderer.toneMapping` 为 `ACESFilmicToneMapping`，曝光值在 `1.0` 左右，高光柔和无截断溢出。
- [ ] 地面具有清晰柔和的接触阴影（Contact Shadow），地面与暗红/青色边圈装饰与角色阵营契合。

### 6.2 动画与骨骼控制
- [ ] 初始化加载默认播放 `idle` 动作，角色呼吸自然，服饰自然下垂。
- [ ] 切换至 `walk` 步态平稳自然，双脚着地不穿透地面（Foot Slide ≤ 0.01H）。
- [ ] 切换至 `aim` 枪口水平对准 `-Z` 视线方向，头部微俯贴腮。
- [ ] 连续高频点击动作按钮，Crossfade 平滑过渡，绝不出现卡死或模型变形崩塌。

### 6.3 特效模式与交互
- [ ] 点击 `转盘 Turntable`，模型底座与角色以约 0.5 rad/s 均匀转动，再次点击平滑停顿。
- [ ] 点击 `分解 Explode`，装备与结构按规划向量整齐外移，无破皮面条现象；复位严丝合缝。
- [ ] 点击 `线框 Wireframe`，网格线呈现均匀拓扑分布，切回正常模式贴图材质完整复位。
- [ ] 鼠标左键轨道旋转、右键平移、滚轮缩放手感线性平滑，重置视角精准对焦。

### 6.4 自动化无头回归
- [ ] 运行 Headless Chrome dump-dom，`demo-militia.html` 输出包含 `DEMO_OK`。
- [ ] 运行 Headless Chrome dump-dom，`demo-swat.html` 输出包含 `DEMO_OK`。
- [ ] 人为测试异常场景（如故意请求非法剪辑名），`document.title` 正确输出 `DEMO_ERR`。

---

## 7. 风险评估与回退预案 (Risks & Rollback)

### 7.1 识别风险与应对策略

| 风险点 | 影响程度 | 表现症状 | 应对与缓解方案 |
|---|---|---|---|
| **骨骼动画静默失效** | 高 | 画面正常渲染，但角色变成静态木桩，Console 零报错 | 执行步骤 8 中的自检逻辑，严密校验剪辑时长与骨骼绑定关系，发现即报错拦截 |
| **单一体网格分解破皮** | 中 | 开启分解视图后，四肢被拉成面条或网格空洞暴露 | 严格执行方案 B（静态部件分离陈列），对非独立部件不施加硬拉伸偏移 |
| **无构建环境加载 RoomEnv 失败** | 中 | `import` 外部扩展文件报 404 或语法错误 | 严格使用步骤 5.2 提供的纯 JS 内联 Neutral Studio 发生器，彻底规避文件外引 |
| **PBR 高光全白过曝** | 低 | 角色泛白，暗部细节丢失，像塑料玩具 | 及时削减三点平行光与半球光强度，依靠微弱环境遮挡（AO）与菲涅尔拉开层次 |

### 7.2 回退操作指南
由于 Demo 页面与游戏主干完全解耦，若升级过程中出现不可调和的重大渲染或动画缺陷：
1. **单文件 Git 回退**：
   ```bash
   git checkout HEAD -- demo-militia.html js/demo/militia-demo.js demo-swat.html js/demo/swat-demo.js
   ```
2. **快速参数降级验证**：通过 `?hero=0` 查询参数直接将模型加载器切换回 `js/soldier_models/` 旧低模工厂，保障日常业务评审和演示不中断。
