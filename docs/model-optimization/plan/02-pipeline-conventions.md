# 流水线通用规范（Pipeline Conventions）

> 本文档是 fps-demo 模型精细化优化规划文档集（`docs/model-optimization/plan/`）的通用规范篇，由 `03-hero-militia.md`、`04-hero-swat.md`、`05-demo-integration.md` 及 `06-phase2-weapons.md` 共同引用，确立所有英雄版模型构建、纹理生成、质量门禁、代码交付与版本管理共用的唯一准则。

---

## 1. 目标与范围

- **目标**：为 Phase 1 角色英雄版（militia / swat）与 Phase 2 武器英雄版（AK-47 / M4A1）的重建提供标准化、可验证、可复现的统一规范，消除各实施阶段与多人/多智能体协作中的歧义。
- **范围**：
  - 工作区目录层级、命名法则及资产流转契约；
  - Spec JSON 单一真理来源（SSOT）原则与变更流程；
  - 英雄版工厂代码规范（纯原生 ES Module、确定性约束、工厂函数签名）；
  - 双轨渲染栈划分与游戏版低模兼容性绝对隔离；
  - 质量门禁体系（Blocking 阻断门 vs Advisory 建议门）、评审循环（3/pass, 6 total）执行与终止策略；
  - 投影纹理烘焙管线与资产免手改覆盖准则；
  - 评审归档与 Rig 报告的标准化文档模板；
  - 原子化 Git 提交粒度与 Commit Message 规范。

---

## 2. 前置依赖

1. **总规划契约**：遵照 `docs/model-optimization/plan/00-master-plan.md` 的阶段拆分与里程碑；严格继承 `docs/model-optimization/README.md` 中 2026-09-27 确认的 4 项核心决策（安装 Python 3.10+、分离重建、投影烘焙、骨骼动画）。
2. **环境准备就绪**：依赖 `docs/model-optimization/plan/01-environment-setup.md` 完成 Python 3.10+ 安装、img2threejs 核心单元测试以及 img2-character 插件安装与注册验证。
3. **接口兼容契约**：严格遵循 `.img2threejs/STATE-NOTE.md` 中对现有游戏主干 `syncMesh` 契约与 `MeshPhongMaterial` 的冻结声明。

---

## 3. 通用规范与实施细则

### 3.1 目录与命名约定

所有英雄版资产与过程产物严格按照如下统一结构与命名规范存放，禁止随意更改目录层级。

#### 1) 局部工作区命名（`.img2threejs/hero-<who>/`）
每个模型拥有独立工作空间，`<who>` 统一使用小写命名：`militia`、`swat`、`ak47`、`m4a1`。内部结构如下：

```text
.img2threejs/hero-<who>/
├── state.json                     # forge 流水线状态清单（由 state.py init/mark 维护）
├── assessment.json                # 阶段 1 复杂度评级与解剖分析产物
├── spec.json                      # 权威几何与材质规格定义（单一事实来源）
├── camera-front.json              # 正面虚拟投影相机姿态（solve_camera_pose.py 产出）
├── camera-side.json               # 侧面虚拟投影相机姿态（solve_camera_pose.py 产出）
├── delight-front.png              # 正面去光照漫反射图（delight_albedo.py 产出）
├── delight-side.png               # 侧面去光照漫反射图（delight_albedo.py 产出）
├── bake-descriptor.json           # UV 烘焙任务描述符（bake_projected_texture.py 产出）
├── rig-gate-payload.json          # Stage R6 骨骼与动画门禁度量数据包
└── shots/                         # 评审与度量渲染截图归档目录
    ├── round-0-front.png          # 第 0 轮（基线）四视角渲染截图
    ├── round-0-right.png
    ├── round-0-back.png
    ├── round-0-left.png
    ├── comparison-round-<N>.png   # 第 N 轮对比图表（make_comparison_sheet.py 产出）
    └── turntable-round-<N>.png    # 转台连续视角拼图
```

#### 2) 工厂代码路径与命名
- 英雄版工厂源码存放于：`js/hero_models/<who>.js`
  - 角色：`js/hero_models/militia.js`、`js/hero_models/swat.js`
  - 武器：`js/hero_models/ak47.js`、`js/hero_models/m4a1.js`
- 游戏现有低模路径保持不动：`js/soldier_models/militia.js`、`js/soldier_models/swat.js`、`js/soldier_models/common.js`。

#### 3) 烘焙纹理资产命名（`assets/textures/hero/`）
纹理产物一律输出至 `assets/textures/hero/`，分辨率标准统一为 1024×1024（武器或特写部件可选 2048×2048）：
- `<who>-albedo-front.png`：正面去光照投影烘焙反照率贴图
- `<who>-albedo-side.png`：侧面去光照投影烘焙反照率贴图
- `<who>-combined-albedo.png`：正侧双视图融合与 UV 缝合后的最终基础色贴图（主漫反射贴图）
- `<who>-normal.png`：（可选）由 PBR 证据或高模烘焙生成的切线空间法线贴图
- `<who>-roughness.png`：（可选）粗糙度/金属度遮罩贴图

#### 4) 评审与门禁截图命名规约
四视角截图严格按照世界坐标逆时针方位角进行命名（0° 正视、90° 右侧视、180° 后视、270° 左侧视）：
- `shots/round-<N>-front.png`（正视，Camera at +Z facing -Z）
- `shots/round-<N>-right.png`（右侧视，Camera at +X facing -X）
- `shots/round-<N>-back.png`（后视，Camera at -Z facing +Z）
- `shots/round-<N>-left.png`（左侧视，Camera at -X facing +X）
- 动画门禁扫描快照（G10 扫描，共 176 帧）：命名按 `shots/sweep-<clip>-t<time>-side<0|1>-az<0|1>.png` 归档。

---

### 3.2 Spec JSON 权威原则

#### 1) 核心原则：数据权威，代码从属
- **重建决策只存 `spec.json`，不存代码孤本**。
- 部件层级、比例尺寸、顶点拓扑、材质 PBR 参数（色值、粗糙度、金属度）、参考图特征Review目标（`featureReviewTargets`）、骨骼绑定结构、关键锚点位置，均必须首先完整声明在 `.img2threejs/hero-<who>/spec.json` 中。
- `js/hero_models/<who>.js` 只是 `spec.json` 的代码实现与执行器，禁止在 JS 代码中硬编码未经 Spec 声明的私有魔法数字或结构调整。

#### 2) Spec 变更流程（闭环四步法）
任何模型造型、尺寸、特征或材质的调整，必须遵守以下执行流程：
1. **编辑 Spec**：在 `.img2threejs/hero-<who>/spec.json` 中修改对应属性（或运行 `new_sculpt_spec.py` 增量更新）；
2. **格式与质量校验**：
   ```bash
   # Windows Git Bash（支持 python3 或 py -3 回退）
   python3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage2_spec/validate_sculpt_spec.py" \
     .img2threejs/hero-<who>/spec.json --strict-quality || \
   py -3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage2_spec/validate_sculpt_spec.py" \
     .img2threejs/hero-<who>/spec.json --strict-quality
   ```
   **Pass 标准**：终端输出 `PASS`，且无任何 `strict quality failure` 阻断错误。
3. **同步实现**：依据验证通过的 Spec，同步更新 `js/hero_models/<who>.js` 中的网格装配逻辑；
4. **版本同步提交**：在 Git 提交中同时包含 `spec.json` 与 `js/hero_models/<who>.js`，确保代码与规范版本永不脱节。

---

### 3.3 英雄版工厂代码规范

#### 1) 纯 JS ES Module 与无构建环境约束
- **零编译构建**：本项目无 Webpack/Vite/Rollup 或 Babel/TypeScript 编译流水线，工厂文件必须是标准浏览器原生支持的 ES Module。
- **依赖导入规范**：统一通过原生 `importmap` 导入 Three.js，绝对路径与包名按项目现有范式保持一致：
  ```javascript
  import * as THREE from 'three';
  ```
  严禁直接引入 Node.js 运行时内置模块（如 `path`、`fs`）或项目根目录 `package.json` 未在前端映射的第三方库。

#### 2) 确定性生成法则（Deterministic Generation）
- **严格禁用 `Math.random()`**。
- 英雄版模型在相同参数下必须产生百分之百字节级一致的几何网格与 UV 拓扑。若需要程序化扰动（例如布料微褶皱、表面微噪点），必须采用固定种子（Seed）的伪随机算法（PRNG）或纯基于顶点坐标与正余弦的数学解析式。

#### 3) 工厂函数导出签名标准
工厂模块统一导出**唯一**异步构建函数 `buildHero<Who>(options)`（人物：`buildHeroMilitia` / `buildHeroSwat`；武器：`buildHeroAK47` / `buildHeroM4`），返回开箱即用的完整展示对象。**禁止** `createHero<Who>`、`buildHero<Who>Mesh(T)`、`buildHero<Who>Mesh(THREE)` 等其他命名。

```javascript
/**
 * @typedef {Object} HeroModelOptions
 * @property {string} [texturePath]       - 自定义反照率贴图路径
 * @property {boolean} [wireframe=false]   - 是否开启线框模式
 * @property {boolean} [castShadow=true]  - 是否产生投影
 * @property {boolean} [receiveShadow=true]- 是否接收投影
 */

/**
 * 构建并返回英雄版模型全套运行时对象
 * @param {HeroModelOptions} [options={}]
 * @returns {Promise<{
 *   group: THREE.Group,
 *   skinnedMesh: THREE.SkinnedMesh,
 *   skeleton: THREE.Skeleton,
 *   mixer: THREE.AnimationMixer,
 *   clips: Object<string, THREE.AnimationClip>,
 *   anchors: Object<string, THREE.Object3D>,
 *   dispose: () => void
 * }>}
 */
export async function buildHeroMilitia(options = {}) {  // buildHeroSwat / buildHeroAK47 / buildHeroM4 同构
  // 1. 读取并应用 options 配置
  // 2. 异步加载烘焙贴图并设置 colorSpace = THREE.SRGBColorSpace
  // 3. 构建几何体并计算确定性顶点属性
  // 4. 构建骨骼 Armature，执行 updateMatrixWorld(true)
  // 5. 绑定 SkinnedMesh：mesh.bind(skeleton, new THREE.Matrix4())
  // 6. 初始化 AnimationMixer 并绑定命名剪辑 (idle, walk, aim 等)
  // 7. 导出结构与资源释放器 dispose()
}
```

> **接口补充约定**：`clips` 为普通对象字典 `Object<string, THREE.AnimationClip>`（键 `idle` / `walk` / `aim`，可选 `death`），**不是 `Map`**（禁止 `clips.get(...)` 调用）。武器工厂（无骨骼蒙皮）返回 `Promise<{ group, parts, sockets, materials, actions, dispose }>`。

> **【已确认 2026-09-27：工厂函数签名与动画解耦设计】**
> - **执行方案（采纳推荐）**：工厂函数作为单一门面，统一采用返回包含几何 `SkinnedMesh`、骨骼 `Skeleton`、`AnimationMixer`、剪辑字典 `clips`、关键锚点 `anchors` 及释放器 `dispose` 的开箱即用对象 `{ group, skinnedMesh, skeleton, mixer, clips, anchors, dispose }`，外部调用端一行代码即可完成挂载与播放；
> - **备选方案（备选，未采纳）**：工厂函数仅同步返回几何与骨骼 `{ group, skinnedMesh, skeleton }`，动画数据由独立的 `js/hero_models/animator.js` 异步加载并挂载。
> - *采纳理由*：该方案符合 demo 页轻量接入需求，避免 demo 页面产生过多组装样板代码。

---

### 3.4 渲染栈规范（英雄版 vs 游戏版）

本项目采取**双轨渲染栈隔离原则**：英雄展示栈全面迈向次时代物理渲染（PBR），而现有游戏运行栈保持绝对冻结。

```
                     ┌───────────────────────────────────────────────┐
                     │              fps-demo 项目渲染架构            │
                     └──────────────────────┬────────────────────────┘
                                            │
               ┌────────────────────────────┴───────────────────────────┐
               ▼                                                        ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│   游戏版低模管线（运行时）   │                         │    英雄版高精管线（展示级）  │
├──────────────────────────────┤                         ├──────────────────────────────┤
│ 页面：index.html             │                         │ 页面：demo-*.html, 评审台     │
│ 模型：js/soldier_models/*.js │                         │ 模型：js/hero_models/*.js    │
│ 材质：MeshPhongMaterial      │                         │ 材质：MeshStandardMaterial   │
│ 贴图：基础色 / 纯色调色板    │                         │ 贴图：投影烘焙 sRGB PBR 贴图 │
│ 光照：方向光 + 简单环境光    │                         │ 光照：PMREM 环境探针 + 三点光│
│ 色调：常规 Gamma 空间        │                         │ 色调：ACESFilmicToneMapping  │
│ 契约：syncMesh 六元组(绝对冻结)│                        │ 契约：真骨骼 + SkinnedMesh   │
└──────────────────────────────┘                         └──────────────────────────────┘
```

#### 1) 游戏版低模与 `syncMesh` 契约绝对冻结声明
依据 `.img2threejs/STATE-NOTE.md`，游戏主程序依赖的低模接口严禁触碰：
- **返回值结构**：必须严格维持 `{ group, legL, legR, arms, head, gunTip }` 字段；
- **固定锚点与原点约定**：
  - `legL / legR`：原点位于髋部 `(±0.12, 0.82, 0)`，驱动属性为 `rotation.x`；
  - `arms`：原点位于肩线 `(0, 1.32, 0)`，驱动属性为 `rotation.x`（俯仰），枪口朝向 `-Z`，`gunTip` 位于枪口；
  - `head`：作为 torso 子节点，位于 `(0, 0.58, 0)`，驱动属性为 `rotation.x = pitch * 0.45`；
  - 空间朝向：角色面向 `-Z`，自身右为 `+X`，站姿全高约 `1.72m ~ 1.75m`；
- **材质约束**：必须继续使用 `THREE.MeshPhongMaterial`，禁止注入 PBR 材质或阴影开销过大的渲染特性。

#### 2) 英雄版 / Demo 页渲染栈规范
展示页面（`demo-militia.html`、`demo-swat.html`、`model-review.html`）统一按如下标准配置：
- **材质类型**：全面采用 `THREE.MeshStandardMaterial`，参数配置：
  - `map`：分配烘焙反照率贴图，且显式指定 `texture.colorSpace = THREE.SRGBColorSpace;`；
  - `roughness`：按 Spec 设定（通常织物 `0.8~0.9`，金属 `0.3~0.4`，皮肤 `0.6`）；
  - `metalness`：按部件特性明确分离（金属机匣/枪管 `0.85~1.0`，布料/皮肤 `0.0`）；
- **色调映射（Tone Mapping）**：
  ```javascript
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  ```
- **阴影设置**：启用 `THREE.PCFSoftShadowMap`，主光（Key Light）阴影贴图分辨率不少于 `2048×2048`，配置微小偏移 `bias = -0.0005` 防阴影自刺；
- **环境照明**：采用 `PMREMGenerator` 处理的高保真 Studio 环境探针，配合冷暖补光（Fill Light）与边缘轮廓光（Rim Light）。

#### 3) 模型分解视图（Exploded View）呈现规范
展示页面（`demo-militia.html`、`demo-swat.html` 等）的部件分解视图遵循以下统一规范：
- **触发与复位机制**：触发分解时动画平滑暂停、模型归位标准姿态（T-pose）；再次触发时部件精准复位，无缝恢复动画播放；
- **分件位移逻辑**：独立装具（头巾、插板、弹匣袋、挂包、护膝、武器等独立 Mesh）按规划的法向或轴向向量向外平移展开；
- **连续蒙皮防破皮约束**：连续蒙皮本体（身体、四肢躯干）绝对不做骨骼位移拉扯，从原理上消除蒙皮面条状拉伸变形与破皮空洞。

> **【已确认 2026-09-27：模型分解视图呈现方案（结论翻转）】**
> - **采纳方案（全局统一，翻转为静态 T-pose 分解陈列）**：采用【静态 T-pose 部件分解陈列】方案。触发分解时动画平滑暂停、模型归位标准姿态，独立装具（头巾/插板/弹匣袋/挂包/护膝/武器等）按规划向量向外平移展开，复位后恢复动画；连续蒙皮本体不做骨骼位移拉扯（避免蒙皮面条状破皮）。
> - **原推荐方案（骨骼位移驱动，未采纳）**：为骨骼应用临时径向位置偏移驱动分解。经论证，单体连续蒙皮网格在骨骼位移拉扯下会产生严重的面条状畸变与破皮破坏，无法达到工业级资产展示要求，故推翻否决。
> - *确认依据*：2026-09-27 用户决策，全局统一采用 `05-demo-integration.md` 方案 B。

#### 4) 性能预算总表（全项目唯一权威）

以下预算为全项目统一口径，`00-master-plan.md` 与 `03/04/05/06` 各篇一律引用本节，不得另行定义冲突数值：

| 统计范围 | 三角面上限 | 说明 |
|---|---|---|
| 角色本体（连续蒙皮网格：皮肤 + 基础服装） | ≤ 15,000 | 不含独立装具与武器 |
| 独立装具（头巾/头盔/胸挂/护膝/弹匣袋等分离 Mesh） | ≤ 7,000 | 参与静态 T-pose 分解陈列的部件 |
| 随附武器（Phase 1 一体化展示版 AK-47 / M4A1） | ≤ 6,000 | 挂 `socket_right_hand`，不参与蒙皮 |
| **角色完整合计**（本体 + 装具 + 随附武器） | **≤ 28,000** | 人物 demo 页主体 |
| **人物 demo 页总量**（角色完整 + 展台 + 光环 + 网格辅助） | **≤ 30,000** | `05-demo-integration.md` 步骤 9 口径 |
| Phase 2 武器单体（武器专属 demo 页） | AK-47 ≤ 15,000；M4A1 ≤ 18,000；网格 ≤ 80 | 仅 `demo-ak47.html` / `demo-m4.html` |

- **骨骼预算**：主体人形骨架 ≤ 32 根（不含手指骨，手部为固定握持姿态）；次级动态骨骼（头巾/弹匣袋等）≤ 12 根；demo 页骨骼总数 ≤ 44 根。
- **其余预算**：Draw Calls ≤ 16（demo 页）；材质数 ≤ 5；人物 albedo 单张 ≤ 2048×2048；运行时显存 ≤ 120 MB。

---

### 3.5 质量门体系（Quality Gates）与执行口径

为防止低劣或静默失效模型流出，建立分级门禁体系，涵盖 Stage 3/4 静态造型与 Stage 5 动态 Rig。

#### 1) 质量门禁清单（三级判定性质）

门禁判定性质分为三级（2026-09-27 统一口径，全项目以此为准）：
- **Blocking（离线阻断门）**：有离线 producer、可从 `rig-gate-payload.json` 静态判定，必须 `PASS`，不接受 `unevaluated`；任一 `FAIL` 即阻断交付。
- **采样门（非阻断）**：G1/G2/G3/G10 需宿主浏览器运行时采样，缺少离线 producer。Phase 1 由 demo 页轻量监控采集数据填充 payload：采到数据 → 如实记录实测数值与 verdict；缺数据 → 记 `status: "unevaluated"` 并注明原因，**不算通过、不阻断交付**，严禁伪造 `pass`。其中 G1（防静默死亡）以 demo 页自检（剪辑存在性 + 播放时顶点位移监控，见 `05-demo-integration.md` 步骤 8）为必检证据，该自检本身属 demo 页验收的 Blocking 项。
- **Advisory（建议门）**：记录结果、提示风险，不阻断交付。

> 门禁编号说明：G1~G10 为 `img2-character` 插件原生 R6 门禁；G11（Mesh Parity，`rig_mesh_parity.py`）与 G12（Rig Reference，`glb_rig_reference.py`）为本项目纳入的扩展门禁，合称 12 项。本项目骨架的权威 joint order 为 `js/hero_models/common-rig.js` 中的程序化 Humanoid 骨骼字典（对齐 UniRig 命名，见 `00-master-plan.md` 决策记录 1），不引入外部 GLB 参考骨架。

| 阶段 | 门禁 ID | 检查工具 / 脚本 | 判定性质 | 判定通过标准（Pass Criterion） | 防范的核心缺陷 |
|---|---|---|---|---|---|
| **造型** | M-TURNTABLE | `stage4_review/turntable_gate.py` | **Blocking** | 4 视角无非预期背景内包空洞，轮廓面积无塌陷 | 贴纸式扁平化、穿脑破洞、悬空零件 |
| **造型** | M-INTERSECT | `stage4_review/self_intersection.py` | **Blocking** | 自相交体积比率低于 0.5% 阈值 | 肢体严重自穿模、枪械插入胸腔 |
| **造型** | M-ANCHOR | `stage4_review/attachment_anchor.py` | **Blocking** | 挂件（胸挂/枪/头巾）锚定偏移 ≤ 0.005H | 武器脱手、装备浮空漂移 |
| **造型** | M-VLM | `stage4_review/vlm_gate.py` | Advisory | 视觉保真度打分 Fidelity ≥ 0.85 | 关键身份特征漏损、服装配色严重失真 |
| **造型** | M-MATERIAL | `stage4_review/material_gate.py` | Advisory | PBR 参数完全落在对应材质先验区间内 | 塑料感发亮、金属布料粗糙度颠倒 |
| **骨骼** | **G1** | `stage5_rig/rig_gates.py` | 采样门（非阻断） | `maxSampledBindingDelta <= 2⁻²³`，覆盖 ≥5 采样点 × 全部剪辑；demo 页自检（剪辑存在性 + 顶点位移）为必检证据 | **静默失效（Clip 存在但完全不驱动网格）** |
| **骨骼** | **G2** | `stage5_rig/rig_gates.py` | 采样门（非阻断） | `applyBoneTransform` ≥64 顶点/网格/帧，全部有限值 | 权重含 NaN/Inf、骨骼索引越界崩溃 |
| **骨骼** | **G3** | `stage5_rig/rig_gates.py` | 采样门（非阻断） | `stop()` 停止动作后 `maxBindRestoreDelta <= 1e-12` | 动作播放完毕后姿态残留/变形污染 |
| **骨骼** | **G4** | `stage5_rig/rig_gates.py` | **Blocking** | 蒙皮权重归一化 `\|1 - sum(w)\| <= 2e-7`（所有顶点） | 肢体运动时异常膨胀或缩水坍塌 |
| **骨骼** | **G5** | `stage5_rig/rig_gates.py` | **Blocking** | `maxSkinIndex <= 骨骼数 - 1` | 顶点索引溢出飞向无穷远 |
| **骨骼** | **G6** | `stage5_rig/rig_gates.py` | **Blocking** | `skinRequiredMeshCount == visibleSkinnedMeshCount`（仅统计 spec 声明 `skinning: "required"` 的网格，刚性挂载件不计入，见表下说明） | 部件遗漏未绑定（如头巾/靴子脱离身体） |
| **骨骼** | **G7** | `stage5_rig/rig_gates.py` | **Blocking** | `leftAnchor.x > 0 > rightAnchor.x`（解剖中轴） | 骨架左右镜像反向绑定 |
| **骨骼** | **G8** | `stage5_rig/rig_gates.py` | **Blocking** | 支撑相脚底滑移 `footSlide <= 0.01H` | 角色行走动作严重滑步溜冰 |
| **骨骼** | **G9** | `stage5_rig/rig_gates.py` | **Blocking** | `scaleDelta == 0`（除非模型源显式声明） | 关节缩放破坏 Stage R2 权重混合 |
| **骨骼** | **G10** | `stage5_rig/rig_gates.py` | 采样门（非阻断） | 176 帧全空间扫描，破面与折痕独立统计上报 | 剧烈肢体动作下蒙皮开裂与背景穿透 |
| **骨骼** | **G11** | `stage5_rig/rig_gates.py` | **Blocking** | 冻结几何缓冲区在绑定前后逐字节完全一致 | Rig 过程非法擅自重写底层几何网格 |
| **骨骼** | **G12** | `stage5_rig/rig_gates.py` | **Blocking** | 动作通道寻址指向合法的参考骨骼层级 | 剪辑通道与实际骨架不对应导致错位 |

> **G6 统计范围说明**：G6 计数仅覆盖 spec 中声明 `skinning: "required"` 的网格（连续蒙皮本体及需蒙皮的衣物层）。刚性挂载件——随附武器（挂 `socket_right_hand`）与声明 `skinning: "none"` 的独立装具——**不计入** `visibleMeshCount` 分母，改为按 spec 刚性部件清单逐件核对存在性与父子挂接关系，缺件或脱挂即 `FAIL`。

#### 2) 评审循环（Correction Loop）执行口径与终止策略
依据 `stage4_review/correction_loop.py` 的有界停机状态机，严格控制迭代成本：
- **循环次数硬约束**：单个 Pass 内部修复最多迭代 **3 轮**（`max_per_pass = 3`），全流程累计修复最多 **6 轮**（`max_total = 6`）；
- **终止触发条件（优先序）**：
  1. **达标退出（Target Reached）**：保真度得分 `Fidelity ≥ 0.85` 且所有 Blocking 门禁 100% Pass；
  2. **平台期退出（Plateau Stop）**：连续 2 轮迭代得分提升 `Delta < 0.02`，且无未解决的 Blocking 阻断门；
  3. **硬天花板停机（Hard Ceiling）**：当前轮次达到单 pass 3 次或总计 6 次上限，强制停止自动迭代，转入人工评估；
  4. **负收益回退（Auto Revert）**：若某轮修正导致得分下降，必须自动 Revert 本轮修改，保留上一轮最优代码。

#### 3) 证据留存格式与命名
每次评审与门禁判定必须完整留存可追溯证据：
- 渲染原图：归档于 `.img2threejs/hero-<who>/shots/`；
- 对比表：`shots/comparison-round-<N>.png`（由参考图正/侧、当前渲染正/侧拼接）；
- 评审 JSON 记录：存放于 `.img2threejs/hero-<who>/review-round-<N>.json`，包含轮次、评分、缺陷标签、门禁 verdict 结果。

---

### 3.6 纹理产物管理与可复现性

#### 1) 纹理生成流水线
纹理生成采用纯确定性的投影烘焙流水线，全过程由脚本调度：
1. **去光照（De-lighting）**：
   ```bash
   python3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/delight_albedo.py" \
     assets/concepts/<who>-v1.png \
     --out .img2threejs/hero-<who>/delight-front.png \
     --strength 0.85 \
     --report .img2threejs/hero-<who>/delight-report.json || \
   py -3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/delight_albedo.py" \
     assets/concepts/<who>-v1.png \
     --out .img2threejs/hero-<who>/delight-front.png \
     --strength 0.85 \
     --report .img2threejs/hero-<who>/delight-report.json
   ```
2. **投影解算（Camera Pose Fitting）**：
   ```bash
   python3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/solve_camera_pose.py" \
     assets/concepts/<who>-v1.png \
     --out .img2threejs/hero-<who>/camera-front.json || \
   py -3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage1_intake/solve_camera_pose.py" \
     assets/concepts/<who>-v1.png \
     --out .img2threejs/hero-<who>/camera-front.json
   ```
3. **生成烘焙描述符**：
   ```bash
   python3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage3_build/bake_projected_texture.py" \
     --reference-image assets/concepts/<who>-v1.png \
     --delit-image .img2threejs/hero-<who>/delight-front.png \
     --camera .img2threejs/hero-<who>/camera-front.json \
     --unseen-strategy mirror-symmetry \
     --texture-size 1024 > .img2threejs/hero-<who>/bake-descriptor.json || \
   py -3 "C:/Users/developer/.agents/skills/img2threejs/forge/stage3_build/bake_projected_texture.py" \
     --reference-image assets/concepts/<who>-v1.png \
     --delit-image .img2threejs/hero-<who>/delight-front.png \
     --camera .img2threejs/hero-<who>/camera-front.json \
     --unseen-strategy mirror-symmetry \
     --texture-size 1024 > .img2threejs/hero-<who>/bake-descriptor.json
   ```

#### 2) PNG 产物免手改准则（No Manual Edits）
- `assets/textures/hero/*.png` 属于**编译生成的衍生二进制资产**；
- **严禁手工进入图像处理软件进行修图**。任何颜色、接缝、亮度的不协调，必须通过调整 `delight_albedo.py` 的 `--strength` / `--blur-radius` 或重算相机投影矩阵来解决；
- 重新运行烘焙命令必须保证**无缝幂等覆盖**原 PNG，保证全流水线 100% 可代码化重现。

> **【已确认 2026-09-27：投影烘焙执行器实现方案】**
> - **执行方案（方案 A，采纳推荐）**：采用并复用项目现有的无头 Chrome 基础设施（`chrome.exe --headless --dump-dom`）加载专用烘焙 Runner 页（`bake-runner.html`），在浏览器原生 WebGL 环境中渲染相机投影 ShaderMaterial 并导出 PNG，不引入额外 Python 原生图像扩展；
> - **备选方案（方案 B，备选，未采纳）**：编写纯 Python 离线 UV 投影烘焙脚本（需在 Python 环境额外安装 `numpy`, `pillow`, `scipy`）。
> - *采纳理由*：方案 A 沿用项目已验证的 Chrome 无头自动化链路，不增加 Python 原生扩展包依赖与环境维护成本。

---

### 3.7 评审记录与 Rig 报告文档模板

评审记录与 Rig 验证报告统一存放在 `docs/model-optimization/` 下的子目录中，格式标准化。

- **评审记录存放路径**：`docs/model-optimization/reviews/<who>-review-pass<N>.md`
- **Rig 报告存放路径**：`docs/model-optimization/rig-reports/<who>-rig-report.md`

#### 模板 1：模型评审记录模板（`<who>-review-pass<N>.md`）
```markdown
# 模型评审记录 · <模型名称> (Pass <N>)

- **评审日期**：YYYY-MM-DD
- **评估对象**：`.img2threejs/hero-<who>/spec.json` & `js/hero_models/<who>.js`
- **当前迭代轮次**：第 N 轮 / 单 Pass 上限 3 轮 / 累计上限 6 轮
- **评审状态**：[PASS / NEED_REVISION / CEILING_STOP]

## 1. 视觉评估与门禁判定
| 门禁项 | 类型 | 判定标准 | 实测结果 | 结论 |
|---|---|---|---|---|
| M-TURNTABLE | Blocking | 4 视角无内包背景洞 | 空洞像素数: 0 | PASS |
| M-INTERSECT | Blocking | 自穿插比率 < 0.5% | 穿插体积比: 0.12% | PASS |
| M-ANCHOR    | Blocking | 锚点偏移 ≤ 0.005H | 最大位移: 0.002H | PASS |
| M-VLM       | Advisory | 保真度得分 ≥ 0.85 | 得分: 0.88 | PASS |
| M-MATERIAL  | Advisory | PBR 区间符合先验 | 粗糙度/金属度正常 | PASS |

## 2. 四视角渲染对比图
- **正面 (0°)**: `shots/round-<N>-front.png`
- **右侧 (90°)**: `shots/round-<N>-right.png`
- **背面 (180°)**: `shots/round-<N>-back.png`
- **左侧 (270°)**: `shots/round-<N>-left.png`
- **对比表**: `shots/comparison-round-<N>.png`

## 3. 关键身份特征核对表（Feature Review Targets）
- [x] 特征 1（如格纹头巾）：纹理清晰度达标，边缘贴合面部
- [x] 特征 2（如左臂红袖章）：正负半轴方向正确（-X 侧）
- [ ] 特征 3（如胸挂弹匣袋）：[记录具体偏离或合格情况]

## 4. 改进措施与下步决策
- **发现缺陷**：[列出具体 Defect Tags]
- **处置方案**：[修改 Spec 对应字段或调整投影矩阵]
```

#### 模板 2：Rig 骨骼与动画报告模板（`<who>-rig-report.md`）
```markdown
# Rig 骨骼与动画验证报告 · <模型名称>

- **评估日期**：YYYY-MM-DD
- **模型文件**：`js/hero_models/<who>.js`
- **综合判定**：[ALL_PASS / BLOCKED]

## 1. Stage R6 门禁判定汇总表（G1 ~ G12）
| 门禁 ID | 门禁名称 | 判定性质 | 阈值标准 | 实际测得数据 | Verdict |
|---|---|---|---|---|---|
| G1 | Binding Reaches Node | 采样门（非阻断） | maxDelta ≤ 2⁻²³ (≥5 samples) | delta: 1.1e-16 (samples: 15，demo 页轻量监控实测) | PASS |
| G2 | Deformation Finite   | 采样门（非阻断） | applyBoneTransform 有限值 | NaN 计数: 0, 顶点数: 256（demo 页轻量监控实测) | PASS |
| G3 | Bind Restore        | 采样门（非阻断） | stop() 后 delta ≤ 1e-12 | delta: 0.0（demo 页轻量监控实测) | PASS |
| G4 | Weights Normalised  | Blocking | \|1 - sum(w)\| ≤ 2e-7 | 最大偏差: 4.2e-8 | PASS |
| G5 | Indices in Range    | Blocking | maxIndex ≤ bones - 1 | maxIndex: 18, 骨骼数: 19 | PASS |
| G6 | Every Mesh Bound    | Blocking | visibleMesh == skinnedMesh | 5 == 5 | PASS |
| G7 | Medial / Lateral    | Blocking | left.x > 0 > right.x | 左右中轴正常 | PASS |
| G8 | Foot Contact        | Blocking | footSlide ≤ 0.01H (stance) | 最大滑移: 0.004H | PASS |
| G9 | No Joint Scale      | Blocking | scaleDelta == 0 | 0 (无非法缩放) | PASS |
| G10| Skin Integrity Sweep| 采样门（非阻断） | 176 帧破面与折痕扫描 | 破面: 0, 折痕: 12 | PASS |
| G11| Mesh Parity         | Blocking | 冻结几何字节级一致 | byte-identical | PASS |
| G12| Rig Reference       | Blocking | 骨骼层级映射合法 | 完全对齐 common-rig.js 骨骼字典 | PASS |

## 2. 剪辑动力学测量表
| 剪辑名称 | 帧率/时长 | 循环判定 (poseReturn ≤ 0.5°) | 步幅位移 | 状态 |
|---|---|---|---|---|
| idle | 30fps / 2.0s | 0.12° (PASS) | 0.00H | VALID |
| walk | 30fps / 1.2s | 0.28° (PASS) | 0.95H | VALID |
| aim  | 30fps / 1.0s | 0.05° (PASS) | 0.00H | VALID |

## 3. 验收结论
所有离线阻断门（G4~G9、G11、G12）全部 PASS；采样门 G1/G2/G3/G10 均已实测记录（或附原因的 unevaluated）；模型动画运行时无撕裂、无静默动作失效。
```

> **【已确认 2026-09-27：文档归档组织方式】**
> - **执行方案（方案 A，采纳推荐）**：采用分目录管理规范（`docs/model-optimization/reviews/<who>-review-pass<N>.md` 与 `docs/model-optimization/rig-reports/<who>-rig-report.md`），随着 Pass 增加保持项目结构清晰；
> - **备选方案（方案 B，备选，未采纳）**：扁平化集中存放在 `docs/model-optimization/` 根目录下（如 `<who>-review.md` 与 `<who>-rig.md`）。
> - *采纳理由*：方案 A 结构清晰规范，便于多轮迭代与多模型并行时的文档检索与长期维护。

---

### 3.8 Git 提交粒度与 Commit Message 规范

为保证工程历史清晰可追溯，禁止“大乱炖式”一次性提交数千行代码与贴图。每个模型必须按流水线阶段进行**原子化提交**：

```text
阶段 1: feat(spec): 完成 <who> 英雄版重建规格定义 spec.json
阶段 2: feat(texture): 烘焙生成 <who> 正/侧投影贴图与去光照反照率
阶段 3: feat(model): 实现 <who> 英雄版高精网格构建工厂 js/hero_models/<who>.js
阶段 4: test(review): 记录 <who> 造型评审证据与四视角对比表
阶段 5: feat(rig): 完成 <who> 骨骼绑定与命名动画剪辑 (idle, walk, aim)
阶段 6: test(rig-gates): 运行 Stage R6 G1-G12 自动化门禁测试并生成报告
阶段 7: chore(demo): 集成 <who> 英雄版至 demo 展示页并升级 PBR 渲染栈
```

#### Commit Message 格式规范
```text
<type>(<scope>): <subject>

[可选 body：说明变更原因、涉及的具体门禁或 Spec 编号]
[可选 footer：关联的验收或确认项]
```
- **Type 约束**：`feat`（新功能/新模型）、`fix`（缺陷修复）、`test`（门禁测试/评审数据归档）、`chore`（页面接入/工具链脚本更新）、`docs`（规划与实施文档）。
- **Scope 约束**：`spec`、`texture`、`hero-militia`、`hero-swat`、`rig`、`demo`。

---

## 4. 产出物清单

当任何英雄版模型执行本流水线时，必须产出且仅产出以下清单文件：

| 类别 | 相对文件路径 | 责任方 / 工具 |
|---|---|---|
| **配置状态** | `.img2threejs/hero-<who>/state.json` | `forge/state.py` |
| **规格定义** | `.img2threejs/hero-<who>/spec.json` | `stage2_spec/new_sculpt_spec.py` |
| **纹理资产** | `assets/textures/hero/<who>-combined-albedo.png` | 投影烘焙执行器 |
| **工厂代码** | `js/hero_models/<who>.js` | 模型生成工厂 |
| **评审记录** | `docs/model-optimization/reviews/<who>-review-pass<N>.md` | 评审人员 / 视觉 Agent |
| **Rig 报告** | `docs/model-optimization/rig-reports/<who>-rig-report.md` | `stage5_rig/rig_gates.py` |
| **展示页面** | `demo-<who>.html`（升级版） | Demo 集成开发 |

---

## 5. 验收标准

实施过程必须逐项通过以下验收检查表（Checklist）：

- [ ] **目录与命名合规**：工作区位于 `.img2threejs/hero-<who>/`，工厂代码位于 `js/hero_models/<who>.js`，贴图位于 `assets/textures/hero/`。
- [ ] **Spec 权威性生效**：所有模型尺寸、材质参数均有 `spec.json` 依据，并通过 `validate_sculpt_spec.py --strict-quality` 验证（返回 `PASS`）。
- [ ] **代码确定性与规范**：工厂代码为纯 JS ES Module，不包含 `Math.random()`，Three.js 统一由 `importmap` 导入。
- [ ] **游戏版完全隔离**：`js/soldier_models/` 源码未受任何修改，游戏主程序 `index.html` 运行无报错，`syncMesh` 六元组完整无损。
- [ ] **门禁阻断策略执行**：M-TURNTABLE、M-INTERSECT、M-ANCHOR 及离线阻断门 G4~G9、G11、G12 均无 `FAIL` 或 `unevaluated`；采样门 G1/G2/G3/G10 均有实测记录或注明原因的 `unevaluated`。
- [ ] **评审循环收敛**：单 pass 循环不超过 3 轮，全过程不超过 6 轮，终止状态记录完备。
- [ ] **纹理可复现**：PNG 资产由流水线自动输出，无人工修改痕迹，重跑流程可无缝覆盖。
- [ ] **文档与记录完整**：按标准化模板在 `docs/model-optimization/` 归档评审记录与 Rig 报告。
- [ ] **Git 提交原子化**：遵循规范的 Commit Message 前缀与分阶段粒度。

---

## 6. 风险与回退策略

| 风险场景 | 影响范围 | 触发指征 | 回退 / 应对方案 |
|---|---|---|---|
| **Python 依赖执行异常** | 门禁与投影解算不可用 | 运行脚本报错缺少模块或 Python 解释器异常 | 优先使用 `py -3` 回退命令；若仍失败，参照 `01-environment-setup.md` 重新安装或修复 Python 环境。 |
| **投影纹理在接缝处拉伸拉花** | 模型背面/侧面视觉瑕疵 | 四视角截图评审发现明显拉伸条纹 | 修改 `bake_projected_texture.py` 的 `--unseen-strategy` 为 `palette-continue` 或调整侧面相机俯仰角；严禁手动用画笔涂抹修图。 |
| **G1 门禁报告静默失效** | 动画有 Clip 但角色模型不动 | G1 判定 `status: fail` 或 `unevaluated` | 检查 `mesh.bind(skeleton, new THREE.Matrix4())` 是否使用了恒等变换；检查 `updateMatrixWorld(true)` 是否在 `Skeleton` 创建前调用。 |
| **评审循环达到 6 轮硬上限仍未达标** | 开发周期可能失控 | `correction_loop.py` 触发 `HARD_CEILING` | 强制终止自动修正；将当前最佳轮次暂存为候选版本，输出缺陷分析并提交人工复核决定是否降级放行。 |

---

## 7. 决策记录（2026-09-27 用户确认）

2026-09-27 用户已拍板确认全部技术方案决策，各实施环节严格按以下已确认方案执行：

1. **工厂函数返回签名设计（见 3.3 节）**：【已确认 2026-09-27】
   - *执行方案（采纳推荐）*：工厂函数统一返回包含几何、骨骼、动画混合器与剪辑的开箱即用对象 `{ group, skinnedMesh, skeleton, mixer, clips, anchors, dispose }`，外部调用端一行代码即可完成挂载与播放；
   - *备选方案（备选，未采纳）*：工厂函数仅同步返回几何与骨骼 `{ group, skinnedMesh, skeleton }`，动画由外部运行时装配。
2. **投影烘焙运行时实现途径（见 3.6 节）**：【已确认 2026-09-27】
   - *执行方案（采纳推荐）*：复用项目成熟的 Chrome Headless WebGL 渲染机制（通过本地服务加载烘焙页面抽取像素写出 PNG），不增加额外 Python 原生图像库；
   - *备选方案（备选，未采纳）*：采用纯 Python 离线脚本结合 `trimesh` / `pillow` 进行投影栅格化。
3. **评审记录与 Rig 报告归档目录架构（见 3.7 节）**：【已确认 2026-09-27】
   - *执行方案（采纳推荐）*：采用专用子目录组织结构：`docs/model-optimization/reviews/<who>-review-pass<N>.md` 与 `docs/model-optimization/rig-reports/<who>-rig-report.md`；
   - *备选方案（备选，未采纳）*：统一扁平存放在 `docs/model-optimization/` 根目录下。
4. **模型分解视图（Exploded View）在蒙皮模型上的表现方式（见 3.4 节）**：【已确认 2026-09-27，结论翻转】
   - *执行方案（全局统一，翻转为静态 T-pose 部件分解陈列）*：静态 T-pose 部件分解陈列。触发分解时动画平滑暂停、模型归位标准姿态，独立装具（头巾/插板/弹匣袋/挂包/护膝/武器等）按规划向量向外平移，复位后恢复动画；连续蒙皮本体不做骨骼位移拉扯，避免蒙皮面条状破皮；
   - *原建议方案（骨骼位移驱动，未采纳）*：骨骼位移驱动分解——为骨骼应用临时径向位置偏移，同时保持蒙皮形变正常计算（存在连续蒙皮网格拉扯畸变与破皮破坏风险，已否决）。
