# SWAT 英雄版模型实施计划（保卫者 Team A）

> **文档定位**：本项目模型精细化优化计划第 4 篇。本篇在 `03-hero-militia.md` 全流程验证通过的前提下启动，全面继承并复用其跑通的脚本模板、相机解算参数、delight 经验与评审基线，重点攻坚 SWAT 特警特有的刚性头盔、战术护目镜、MOLLE 战术背心织带与 M4A1 卡宾枪工艺。

---

## 1. 目标与范围

- **目标**：
  - 基于官方 `img2threejs` 规范与 `img2-character` 动画契约，将保卫者 SWAT 重建为具备真实 PBR 材质、烘焙漫反射细节与骨骼动画的展示级英雄版（Hero Tier）模型。
  - 模型精度与交互对标 img2threejs 官方 showcase（sora 角色），在分层性能预算内达最佳平衡（角色本体 ≤ 15,000 三角面、完整合计 ≤ 28,000，权威总表见 `02-pipeline-conventions.md` 3.4 节），杜绝低模盒体拼接感。
  - 完成独立展示页 `demo-swat.html` 的全面升级，支持多视角轨道观察、AnimationMixer 骨骼动画切换（idle / walk / aim）、线框布线与战术装具分解视图。
- **范围与边界**：
  - **包含**：`js/hero_models/swat.js` 纯 ES Module 工厂实现、`assets/textures/hero/swat-*.png` 烘焙纹理资产生成、`demo-swat.html` 与 `js/demo/swat-demo.js` 升级集成。
  - **不包含**：游戏运行时 `js/soldier_models/swat.js` 低模（保持现有轻量化实现与 `syncMesh` 契约不变，实现游戏运行与展台观赏彻底解耦）。

---

## 2. 前置依赖

本计划严格依赖以下文档和前期产出，执行前必须确认就绪：
- `docs/model-optimization/plan/00-master-plan.md`：总实施规划与拓扑次序。
- `docs/model-optimization/plan/01-environment-setup.md`：Python 3.10+ 运行时环境就绪，`img2threejs` 与 `img2-character` 单元测试全部 Pass。
- `docs/model-optimization/plan/02-pipeline-conventions.md`：流水线通用命名规范、数据字典与坐标系契约。
- `docs/model-optimization/plan/03-hero-militia.md`：**【阻塞性前置】** 潜伏者（Militia）英雄版全流程 11 步必须全部跑通并完成验收。SWAT 直接复用其建立的标准工作流、自动化脚本包装与 demo 架构。

---

## 3. 参考图选定与资产确认

### 3.1 候选参考图对比分析

通过检查 `assets/concepts/` 历史记录与实图像素信息：

| 资产文件 | 尺寸 / 视图构成 | 视觉特征与优缺点 | 结论与选定状态 |
|---|---|---|---|
| `assets/concepts/swat-v1.png` | 1312×1199<br>正视 + **左前 3/4 视角** | 装备层次丰富、藏青色调饱和、MOLLE 与护膝细节清晰；但右图为 45° 侧前倾斜视，缺少纯 90° 侧剪影，导致侧向相机解算误差大。 | 上轮纯代码建模使用；本次作为**备选参考**。 |
| `assets/concepts/swat-final.png` | 1374×1145<br>正视 + 90° 正侧视 | 虽然补齐了 90° 侧视，但纯文本重新生成导致战术背心退化为平围兜、青色肩章缩水发灰、面部细节丢失，已被历史评审明确否决。 | **废弃淘汰**，不得选用。 |
| `assets/concepts/swat-v3.png` | 1312×1199<br>正视 + **90° 严格正侧视** | 以 `--ref swat-v1.png` 垫图生成，完美继承 v1 的高饱和藏青、丰富装具层次、青色肩部护甲与大号护膝，同时右图为严格 90° Profile 侧视，背包厚度与纵深极其清晰。 | **【已确认 2026-09-27】选定为官方基准输入** |

### 3.2 决策点 1：参考图选定【已确认 2026-09-27】

- **采纳方案【已确认 2026-09-27】**：执行选定 `assets/concepts/swat-v3.png` 作为 Stage 1~Stage 4 的唯一基准参考图输入。严格 90° 侧向轮廓提供准确的 Z 轴厚度约束，完全满足 `solve_camera_pose.py` 双相机解算与正侧投影纹理缝合的硬性数学要求。
- **备选方案（备选，未采纳）**：继续沿用 `assets/concepts/swat-v1.png`。若沿用 v1 的正视双手下垂持枪姿势，侧向投影阶段需手动在相机参数中施加 `--yaw 45` 补偿角，背部及侧后区域需依赖三平面插值（triplanar fallback）补齐。

---

## 4. 身份特征定义与工艺差异重点

### 4.1 核心身份特征定义（≤5 关键系统 + 标志配件）

从 `.img2threejs/spec-swat.md` 继承并核对 `swat-v3.png`，锁定以下 5 项不可简化的关键身份特征系统：
1. **深色战术头盔 + 盔顶前置风镜 + 侧耳降噪通讯套件**：头部首要剪影。硬质弧形盔壳，防风镜架在盔檐前上方（不遮挡眼部），黑色弹力镜带环绕盔体，左右两侧配备厚实通讯耳罩。
2. **黑色战术护目面罩（Balaclava）**：遮盖口鼻、下颌与颈部，仅露出水平眼部窄缝肤色区域，带深邃眉眼阴影。
3. **重型防弹插板背心（Plate Carrier）+ MOLLE 织带矩阵 + 战术胸挂**：前胸插板外挂 3 联弹匣快拔袋、下腹部多功能杂物包、胸侧手持电台配长天线、加宽肩带缓震垫、背部一体化突击水袋包。
4. **青色阵营识别色契约（Team Blue Accent）**：左右双肩外侧六边形青色发光臂章（`#4da3ff`）、背心前肩带固定扣青色标记、背部中央青色防误伤识别板，全角度提供鲜明敌我识别。
5. **棱角硬质防暴护膝 + 黑色重型作战靴 + 腿部快拔枪套**：六边形倒角硬质护膝外壳、深黑重齿防滑厚底绑带作战靴、大腿外侧战术下坠式快拔手枪套。
6. **制式主武器 M4A1 卡宾枪**：全黑金属涂装、四向皮卡汀尼导轨护木、垂直前握把、内红点战术瞄具、30 发 STANAG 弧度弹匣、多档伸缩枪托。

### 4.2 与 Militia 的工艺差异深度对比

| 工艺对比项 | 潜伏者（Militia 方案） | 保卫者（SWAT 本方案重点攻坚） | 工艺差异与实现策略 |
|---|---|---|---|
| **头部形态（Head Form）** | 柔软布料包裹（Shemagh 头巾），下垂布褶与系绳。 | **刚性曲面装具组件**：复合球台盔壳 + 独立盔檐 + 侧耳凹槽 + 框架风镜。 | 在 Form 阶段采用连续多段球壳与微倒角圆角，盔体外壳向外浮空微距（stand-proud ≥ 4mm），杜绝刚体与内层头颅网格穿插。 |
| **风镜材质（Goggles Lens）** | 无风镜，仅有织物网格纹理。 | **透明/半透高光微反光材质**。 | 见下文决策点 2。采用 MeshStandardMaterial 高光透明配置，模拟军规聚碳酸酯镜片质感。 |
| **胸挂结构（Chest Rig）** | 帆布多袋软质胸挂，带下垂布边。 | **精密阵列式 MOLLE/PALS 织带**。 | 见下文决策点 3。采用模块化程序化阵列生成横向织带条，保证缝线间隔精度与硬挺度。 |
| **阵营识别色（Team Color）** | 潜伏者红色袖章（深红 `#a83232`，低饱和度）。 | **保卫者青色发光识别块**（`#4da3ff`，高饱和带微自发光）。 | 材质使用 `emissive: 0x1d5ca8, emissiveIntensity: 0.4`，确保暗光场景下依然清晰可辨且不产生光污染。 |
| **手套与袖口** | 卷袖露前臂肌肉，无指露掌。 | **长袖战术作战服完全入套 + 全指防割战术手套**。 | 手腕处具备束口收紧护垫，手背带防撞硬壳保护块，避免皮肤暴露。 |

### 4.3 武器差异：AK-47 vs M4A1 形态学实现

- **材质与分色**：Militia AK-47 重点在于冲压钢机匣与深红木纹枪托/护木的双材质对比；SWAT M4A1 为**全黑战术涂层系统**，主要依靠金属度与粗糙度差异区分部件：
  - 机匣与枪管：阳极氧化铝合金（`color: 0x1c1f25, metalness: 0.85, roughness: 0.35`）
  - 导轨护木、伸缩托、前握把：工程强化聚合物（`color: 0x22262d, metalness: 0.15, roughness: 0.75`）
- **拓扑特征系统**：
  - 顶部与四向 RIS 导轨：程序化小棱齿阵列。
  - 瞄具：Aimpoint T1 风格圆筒微型红点镜，镜身附带遮光罩。
  - 弹匣：标准 STANAG 5.56 毫米弹匣，顶部直入、中下段 8 度微曲率过渡，表面带垂直防滑加强筋。
  - 枪口与挂点：A2 鸟笼型消焰器，`gunTip` 锚点精确绑定在枪口截面中心 `(0, -0.115, -1.07)`。

### 4.4 工艺决策记录（2026-09-27 用户确认）

#### 决策点 2：护目镜材质参数方案【已确认 2026-09-27】
- **采纳方案【已确认 2026-09-27】（平衡度最高）**：采用 `MeshStandardMaterial` 配合传统透明管线：
  ```javascript
  {
    color: 0x2a384f,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  }
  ```
  优点：完全兼容现有渲染管线，性能极高，配合 ACESFilmic 色调映射呈现通透的反光质感。
- **备选方案（备选，未采纳，物理逼真）**：启用 Three.js 物理透射属性：
  ```javascript
  {
    color: 0xffffff,
    roughness: 0.05,
    transmission: 0.7,
    ior: 1.5,
    thickness: 0.02,
    transparent: true
  }
  ```
  优点：折射真实；缺点：对 PMREM 环境贴图依赖极强，低性能设备有一定帧率开销。

#### 决策点 3：MOLLE 织带构建方案【已确认 2026-09-27】
- **采纳方案【已确认 2026-09-27】（程序化几何薄条）**：采用程序化几何薄条阵列，在背心插板前侧利用循环生成 4 行×6 列轻量薄片 Quad 带（厚度 2mm，宽 25mm，间距 25mm），总面数增加约 120 面。
  优点：在侧光与近距离观察下具有真实的 3D 阴影起伏，彻底消除贴图拉伸感。
- **备选方案（备选，未采纳，纯法线凹凸贴图）**：在烘焙纹理上增加 Normal Map 生成步骤，插板表面保持平整。
  优点：零几何增量；缺点：大角度掠射视角下缺乏凹凸剪影。

---

## 5. 复用 Militia 经验资产清单

本计划直接继承 `03-hero-militia.md` 验证确认的成熟参数，避免重复试错：

```
+---------------------------------------------------------------------------------------+
|                                MILITIA 经验复用清单                                   |
+------------------------------------+--------------------------------------------------+
| 复用领域                           | 具体复用参数 / 代码模块 / 规则                   |
+------------------------------------+--------------------------------------------------+
| 1. 相机解算参数 (Camera Pose)      | • 正视 FOV: 32.0°, 距离: 4.2m, 标高 Y: 0.95m    |
|                                    | • 侧视 FOV: 32.0°, 距离: 4.2m, Yaw: 90.0°        |
|                                    | • 投影平面剪裁与纵横比自适应逻辑                 |
+------------------------------------+--------------------------------------------------+
| 2. 去光照参数 (Delight Albedo)     | • delight_albedo.py: strength=0.65, blur=24      |
|                                    | • 暗部百分位截断 5%, 亮部截断 95% 保护规则       |
|                                    | • 针对藏青色特有的深色区色阶提亮防死黑校正      |
+------------------------------------+--------------------------------------------------+
| 3. 评审打分与 Gate 基线            | • 权重体系: 剪影 0.25 / 结构 0.25 / 形体 0.20    |
|                                    |   材质 0.15 / 相机 0.15                          |
|                                    | • 准入硬门槛: 综合 ≥ 0.85, 核心身份特征 ≥ 0.90   |
|                                    | • 穿插容差: self_intersection < 0.002            |
+------------------------------------+--------------------------------------------------+
| 4. 骨骼与动画系统 (Stage R)        | • 程序化骨骼字典(common-rig.js)权威 joint order |
|                                    | • identity 绑定与 mesh bounds 偏移对齐算法       |
|                                    | • AnimationMixer 3 状态（idle/walk/aim）状态机   |
+------------------------------------+--------------------------------------------------+
| 5. Demo 页渲染脚手架               | • PMREMGenerator + ACESFilmicToneMapping 配置    |
|                                    | • 无头 Chrome 自动化测试 (DEMO_OK / DEMO_ERR)    |
+------------------------------------+--------------------------------------------------+
```

---

## 6. 详细实施步骤（11 步）

### 步骤 01：环境就绪与工作区初始化

- **做什么**：检查 Python 3.10+ 环境，初始化 SWAT 专属构建与证据存储目录。
- **怎么做**：
  ```bash
  # 验证 Python 环境（支持 python3 或 py -3 回退）
  python3 --version || py -3 --version
  
  # 创建专属工作区目录
  mkdir -p .img2threejs/hero-swat
  mkdir -p assets/textures/hero
  ```
- **产出物**：
  - 目录 `.img2threejs/hero-swat/`
  - 目录 `assets/textures/hero/`
- **验收标准**：
  - [ ] Python 版本输出 ≥ 3.10.0。
  - [ ] 工作区目录成功建立且具备写权限。

---

### 步骤 02：Intake 图像裁剪与特征清单提取

- **做什么**：读取选定的参考图（`assets/concepts/swat-v3.png`），自动提取元数据，裁剪出高分辨率正视图与侧视图，运行网格化细节清单提取。
- **怎么做**：
  在 `C:/Users/developer/.agents/skills/img2threejs` 目录下执行：
  ```bash
  # 图像元数据探测
  python3 forge/stage1_intake/probe_image.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png
  
  # 提取 3x3 空间网格细节清单
  python3 forge/stage1_intake/build_detail_inventory.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --mode grid-3x3 \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/detail-inventory.json
  ```
- **产出物**：
  - `.img2threejs/hero-swat/detail-inventory.json`
- **验收标准**：
  - [ ] probe 输出有效图像宽度 1312、高度 1199、RGB 色彩空间。
  - [ ] inventory 准确记录头盔、风镜、MOLLE 背心、青色肩章、护膝、M4A1 的区域网格坐标。

---

### 步骤 03：Pre-spec 评估与战术角色质量契约确立

- **做什么**：定义 SWAT 模型的复杂度定级，锁定拓扑指标与质量契约（Quality Contract）。
- **怎么做**：
  ```bash
  python3 forge/stage2_spec/new_pre_spec_assessment.py "Hero-SWAT" \
    --image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --complexity complex \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/assessment.json \
    --force
  ```
- **产出物**：
  - `.img2threejs/hero-swat/assessment.json`
- **验收标准**：
  - [ ] `complexity` 明确记录为 `complex`（多件刚硬装具叠加）。
  - [ ] `qualityContract` 载明分层三角面预算（角色本体 ≤ 15,000、完整合计 ≤ 28,000，权威总表见 `02-pipeline-conventions.md` 3.4 节），宏观部件 ≥ 12，微观配件 ≥ 20。

---

### 步骤 04：Landmark 关键点捕获与刚性附件锚点

- **做什么**：捕获人体关键解剖点（Anatomy Landmarks）及 SWAT 专有刚性附件挂载点（头盔顶、面罩眼线、胸挂插板中心、腰带挂点、枪套锚点）。
- **怎么做**：
  ```bash
  python3 forge/stage1_intake/extract_landmarks.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --domain animated-character \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/landmarks.json
  ```
- **产出物**：
  - `.img2threejs/hero-swat/landmarks.json`
- **验收标准**：
  - [ ] 头部、双肩、双肘、双手腕、双髋、双膝、双踝 14 处主要骨骼对齐点全部存在且坐标归一化在 [0, 1] 区间内。
  - [ ] 标注 M4A1 持握主手（右手）与托护木副手（左手）空间位置。

---

### 步骤 05：投影准备（相机位姿求解与去光照处理）

- **做什么**：解算正视图与 90° 侧视图的双相机位姿参数；对参考图执行低频亮度归一化去光照（De-light），提取无高光反光的纯净 Albedo 底图。
- **怎么做**：
  ```bash
  # 求解正向相机位姿
  python3 forge/stage1_intake/solve_camera_pose.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --fov-degrees 32.0 --yaw 0.0 --pitch 0.0 --distance 4.2 --height-offset 0.95 \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/camera-front.json

  # 求解侧向相机位姿（右侧视，Yaw=90°）
  python3 forge/stage1_intake/solve_camera_pose.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --fov-degrees 32.0 --yaw 90.0 --pitch 0.0 --distance 4.2 --height-offset 0.95 \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/camera-side.json

  # 图像去光照处理（针对藏青与装具黑优化：strength 0.65，blur 24）
  python3 forge/stage1_intake/delight_albedo.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --strength 0.65 \
    --blur-radius 24 \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/textures/hero/swat-delit.png \
    --report C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/delight-report.json
  ```
- **产出物**：
  - `.img2threejs/hero-swat/camera-front.json`
  - `.img2threejs/hero-swat/camera-side.json`
  - `assets/textures/hero/swat-delit.png`
  - `.img2threejs/hero-swat/delight-report.json`
- **验收标准**：
  - [ ] 两个相机位姿配置文件生成无误，参数严格对应正视与 90° 侧视。
  - [ ] `swat-delit.png` 中头盔与肩部高光明显平抑，同时深色暗部细节未产生过曝噪点，置信度 confidence ≥ 0.80。

---

### 步骤 06：Sculpt Spec 规格编写与严格质量校验

- **做什么**：生成并完善 SWAT 的 `ObjectSculptSpec`（包含完整的层次结构、PBR 材质定义、附件挂载约束与 5 大身份特征审查目标），并通过 `--strict-quality` 严格模式验证。
- **怎么做**：
  ```bash
  # 生成初始 Spec
  python3 forge/stage2_spec/new_sculpt_spec.py "Hero-SWAT" \
    --image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --assessment C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/assessment.json \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-sculpt-spec.json \
    --force

  # 手工或脚本补全组件树与特征审查目标（头盔系统、风镜、MOLLE 背心、青色臂章、M4A1）后，执行严格校验：
  python3 forge/stage2_spec/validate_sculpt_spec.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-sculpt-spec.json \
    --strict-quality --json
  ```
- **产出物**：
  - `.img2threejs/hero-swat/swat-sculpt-spec.json`
- **验收标准**：
  - [ ] 校验命令返回退出码 0，控制台无任何 `ERROR` 或阻断性 `WARNING`。
  - [ ] `featureReviewTargets` 明确绑定 5 个核心身份特征，非通用占位符。

---

### 步骤 07：分阶段锁定 Pass 构建（Blockout → Structure → Form → Material）

- **做什么**：在 `js/hero_models/swat.js` 中实施程序化装配逻辑。通过 `orchestrate_passes.py` 控制构建状态流转，逐步落实大体块、结构拆解、刚性头盔/风镜/MOLLE 细节塑形，以及 PBR 材质赋予。
- **怎么做**：
  1. **Pass 1: Blockout** —— 搭建总体比例框架（总高 1.75m、肩线 1.32m、髋部 0.82m）。
  2. **Pass 2: Structure** —— 拆分头部、躯干（内胆+插板背心）、四肢、战术靴骨架。
  3. **Pass 3: Form** —— 重点雕刻刚性曲面头盔、透明风镜框架、MOLLE 织带矩阵、硬质护膝、以及 M4A1 导轨机匣与瞄具。
  4. **Pass 4: Material** —— 全面赋予 `MeshStandardMaterial`，设置金属度、粗糙度、风镜透明度与青色自发光属性。
  每次流转时通过命令同步状态：
  ```bash
  python3 forge/stage3_build/orchestrate_passes.py status \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-sculpt-spec.json
  ```
- **产出物**：
  - 核心构建源码：`js/hero_models/swat.js`（导出异步工厂 `buildHeroSwat(options)`，签名与返回结构以 `02-pipeline-conventions.md` 3.3 节为准）
- **验收标准**：
  - [ ] 代码遵循 ES Module 规范，import 统一走 `three`（匹配项目 importmap）。
  - [ ] 无全局状态污染，无 `Math.random()` 随机因子，模型构建纯确定性。

---

### 步骤 08：投影烘焙与双视角 UV 融合

- **做什么**：执行正视与侧视两路投影烘焙规划，生成 UV 烘焙描述符，并将去光照纹理投影烘焙到人物装备表面，输出资产贴图。
- **怎么做**：
  ```bash
  # 生成正向投影贴图计划描述符
  python3 forge/stage3_build/bake_projected_texture.py \
    --reference-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --delit-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/textures/hero/swat-delit.png \
    --camera C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/camera-front.json \
    --mesh-id hero-swat-body \
    --texture-size 1024 \
    --unseen-strategy mirror-symmetry \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/bake-plan-front.json

  # 生成侧向投影贴图计划描述符
  python3 forge/stage3_build/bake_projected_texture.py \
    --reference-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --delit-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/textures/hero/swat-delit.png \
    --camera C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/camera-side.json \
    --mesh-id hero-swat-body \
    --texture-size 1024 \
    --unseen-strategy palette-continue \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/bake-plan-side.json
  ```
  在 Three.js 中完成投影渲染与纹理拼接，输出最终 PBR 贴图。
- **产出物**：
  - `assets/textures/hero/swat-albedo-front.png`
  - `assets/textures/hero/swat-albedo-side.png`
  - `assets/textures/hero/swat-bake-atlas.png`
- **验收标准**：
  - [ ] 烘焙贴图分辨率达到 1024×1024，UV 无重叠反转。
  - [ ] 战术背心织带、臂章识别块与裤管迷彩肌理清晰映射，侧向无严重拉伸模糊。

---

### 步骤 09：多视角闭环评审与有界修正

- **做什么**：运行四视角转盘审查（Turntable Gate）、模型自穿插几何检测、附件装配锚点检查，生成并排对比表，执行 AI 视觉多维度打分，实施严格有界修正（单 pass 最多 3 轮，总计不超过 6 轮）。
- **怎么做**：
  ```bash
  # 1. 导出模型几何数据以供结构检测
  node C:/Users/developer/.agents/skills/img2threejs/runtime/scripts/export_mesh_geometry.mjs \
    --url http://localhost:8080/demo-swat.html \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-meshes.json

  # 2. 检查自穿插与内外折叠（严格防止背心陷入躯干、头盔压扁）
  python3 forge/stage4_review/self_intersection.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-meshes.json --json

  # 3. 检查附件挂载关系（风镜贴头盔、电台贴背心、枪套贴大腿）
  python3 forge/stage4_review/attachment_anchor.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-sculpt-spec.json --json

  # 4. 生成多角度转盘截图并运行 Turntable Gate (0, 90, 180, 270)
  python3 forge/stage4_review/turntable_gate.py \
    --capture 0=shots/swat-front.png \
    --capture 90=shots/swat-right.png \
    --capture 180=shots/swat-back.png \
    --capture 270=shots/swat-left.png --json

  # 5. 生成对比表并追加评审记录
  python3 forge/stage4_review/make_comparison_sheet.py \
    --reference C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/swat-v3.png \
    --render shots/swat-front.png \
    --out .img2threejs/hero-swat/swat-cmp.png

  python3 forge/stage4_review/append_review.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-sculpt-spec.json \
    --pass-id form-refinement \
    --fidelity 0.88 \
    --action continue \
    --summary "SWAT 刚性头盔、风镜高光与 MOLLE 织带层次达到英雄级精度" \
    --in-place
  ```
- **产出物**：
  - `.img2threejs/hero-swat/swat-meshes.json`
  - `.img2threejs/hero-swat/swat-cmp.png`
  - 更新后的 `.img2threejs/hero-swat/swat-sculpt-spec.json`（含完整 `reviewHistory`）
- **验收标准**：
  - [ ] `self_intersection.py` 报错为 0（无严重内部穿插折叠）。
  - [ ] `turntable_gate.py` 四角度全部通过，无镂空破洞。
  - [ ] AI 视觉各层打分：剪影 ≥ 0.85，结构 ≥ 0.85，形体 ≥ 0.85，材质 ≥ 0.85，5 项关键身份特征各 ≥ 0.90。

---

### 步骤 10：Stage R 骨骼蒙皮与动作剪辑设计

- **做什么**：基于 `img2-character` 插件规范，以 `js/hero_models/common-rig.js` 中固化的标准 Humanoid 骨骼字典为权威 joint order（即插件契约 `skin.joints` 概念在本项目的等价物；`00-master-plan.md` 决策记录 1 已确认纯程序化路线，不引入外部 GLB 参考骨架），实施测地线蒙皮权重分配（Geodesic Skinning），实施 Attached Identity 绑定，设计 idle / walk / aim 动作剪辑，并通过 12 项 Rig Gates。
- **怎么做**：
  在 `C:/Users/developer/.agents/skills/img2-character` 目录下执行：
  ```bash
  # 1. 验证 Rig Payload 数据完整性 (Stage R0)
  python3 forge/stage5_rig/validate_rig_payload.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/rig-payload.json

  # 2. 测地线距离权重分配（防止双臂与躯干、左右大腿内侧串扰）
  python3 forge/stage5_rig/geodesic_skinning.py \
    C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/swat-meshes.json \
    --bones C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/bones.json \
    --json

  # 3. 动作剪辑目标带设计与验证 (idle, walk, aim)
  python3 forge/stage5_rig/action_design.py \
    --config C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/action-config.json \
    --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat/clips.json

  # 4. 执行 Rig Gates 自动化门禁检验
  python3 tools/gate_rigging.py \
    --workspace C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-swat
  ```
  **不可违反的 Rig 硬规则**：
  - 骨骼绑定完全使用 `mesh.bind(skeleton, new THREE.Matrix4())`（Identity 变换，禁止二次累加 Armature 矩阵）。
  - `updateMatrixWorld(true)` 必须严格先于 `new THREE.Skeleton` 实例化执行。
  - 武器 M4A1 挂载在手部骨骼节点 `hand_R` 的专用 Socket 下，不随手臂网格发生柔性变形。
- **产出物**：
  - `.img2threejs/hero-swat/rig-payload.json`
  - `.img2threejs/hero-swat/clips.json`
  - 骨骼绑定与剪辑嵌入后的 `js/hero_models/swat.js`
- **验收标准**：
  - [ ] 门禁分层达标（口径见 `02-pipeline-conventions.md` 3.5 节）：离线阻断门 G4~G9、G11、G12 全部 PASS（含索引在有效范围内、权重和为 1.0 误差 ≤ 2e-7）；采样门 G1/G2/G3/G10 经 demo 页轻量监控实测记录（绑定到达节点、形变有限等缺数据项记 `unevaluated` 并注明原因，不算过不阻断，严禁伪造）。
  - [ ] 动作剪辑在 Three.js 中通过 `AnimationMixer` 驱动，idle 呼吸平稳，walk 迈步无滑步，aim 举枪姿势平稳对准视线中心。

---

### 步骤 11：Demo 展示页集成与端到端回归

- **做什么**：将新版英雄模型与动画管线接入 `demo-swat.html` 与 `js/demo/swat-demo.js`。升级场景渲染环境（PBR 点光源 + 环境光贴图 + ACESFilmic 色调映射），重写分解视图与动画按钮逻辑，完成无头 Chrome 自动化回归。
- **怎么做**：
  1. 更新 `demo-swat.html`：参考图预览同步指向 `assets/concepts/swat-v3.png`，更新技术档案中的面数统计与材质说明。
  2. 更新 `js/demo/swat-demo.js`：从 `./hero_models/swat.js` 导入模型工厂，接入 `THREE.AnimationMixer` 播放剪辑。
  3. **决策点 4：分解视图呈现模式【已确认 2026-09-27】**：
     - **采纳方案【已确认 2026-09-27，结论翻转】**：全局统一采用 `05-demo-integration.md` 方案 B【静态 T-pose 部件分解陈列】。触发分解时动画平滑暂停（`hero.mixer.timeScale` 渐降并暂停）、模型归位标准 T-pose 姿态；连续蒙皮本体不做骨骼位移拉扯（彻底避免蒙皮面条状破皮畸变）；独立战术装具（战术背心插板、头盔、风镜、3 联弹匣快拔袋、多功能杂物包、硬质护膝、M4A1 卡宾枪等）按规划向量（`userData.explodeVector`）平滑向外平移悬浮陈列；取消分解复位后各部件精准归位，无缝恢复骨骼动画播放。
     - **原推荐方案（备选，未采纳）**：装具与骨骼联动径向爆炸分离（动画播放中沿骨骼中心向外位移）。存在非独立蒙皮拉扯与空腔穿帮破坏严谨感的缺陷，已废弃不采纳。
  4. 自动化回归测试（无头 Chrome 模式）：
  ```bash
  # 启动无头 Chrome 探测页面状态，抓取 5 帧后的标题输出
  chrome --headless=new --dump-dom http://localhost:8080/demo-swat.html | grep -E "DEMO_OK|DEMO_ERR"
  ```
- **产出物**：
  - 升级后的 `demo-swat.html`
  - 升级后的 `js/demo/swat-demo.js`
- **验收标准**：
  - [ ] 页面在 5 帧渲染后将 `document.title` 成功置为包含 `DEMO_OK` 的字符串，无任何 JS 异常抛出。
  - [ ] 界面点击“待机”、“行走”、“瞄准”按钮可无缝跨淡入淡出（cross-fade）切换动作。
  - [ ] 点击“分解”按钮，动画平滑暂停并归位 T-pose，战术背心与头盔装具平滑向外平移悬浮陈列；复位后无缝恢复动画；点击“线框”按钮，正确高亮显示几何拓扑。

---

## 7. 产出物清单

| 产出物类别 | 相对路径 | 说明 |
|---|---|---|
| **代码文件** | `js/hero_models/swat.js` | SWAT 英雄版纯 ES Module 工厂函数与动画剪辑 |
| **页面与逻辑** | `demo-swat.html`<br>`js/demo/swat-demo.js` | 升级后的保卫者英雄模型专属 Showcase 展示页及交互脚本 |
| **纹理资产** | `assets/textures/hero/swat-albedo-front.png`<br>`assets/textures/hero/swat-albedo-side.png`<br>`assets/textures/hero/swat-bake-atlas.png` | 1024×1024 投影烘焙 Albedo 纹理图集 |
| **过程与规格** | `.img2threejs/hero-swat/swat-sculpt-spec.json`<br>`.img2threejs/hero-swat/assessment.json`<br>`.img2threejs/hero-swat/landmarks.json`<br>`.img2threejs/hero-swat/rig-payload.json` | 官方 forge 流水线全套规格、特征审查与骨骼元数据 |
| **评审与证据** | `.img2threejs/hero-swat/swat-cmp.png`<br>`.img2threejs/hero-swat/swat-meshes.json`<br>`docs/model-optimization/hero-swat-review.md` | 四视角截图、对比表与各 Pass 审查记录归档 |

---

## 8. 验收标准（Checklist）

### 8.1 视觉呈现与还原度验收
- [ ] **头部剪影**：战术头盔呈现圆滑刚性曲面，护目镜稳固架在盔檐上方且具有通透微反光质感，黑面罩眼部露肤自然。
- [ ] **装具层次**：插板背心与胸前 MOLLE 织带矩阵立体感明显，弹匣袋与胸侧电台天线无悬空飘浮。
- [ ] **阵营识别**：双臂青色六边形臂章（`#4da3ff`）与背部识别块在全方位视角下鲜明可见，带自发光微光。
- [ ] **下身装备**：大腿战术枪套贴合大腿外侧，棱角护膝压实膝前，黑色作战靴鞋带与防滑厚底轮廓清晰。
- [ ] **主手武器**：M4A1 具备四向皮卡汀尼导轨、垂直前握把、Aimpoint 瞄具与弯弹匣，枪口指向严格对齐 -Z 轴。

### 8.2 结构与技术规范验收
- [ ] **三角面预算**：分层口径达标——角色本体 ≤ 15,000 三角面，整装完整合计（本体+装具+随附 M4A1）≤ 28,000 三角面，demo 页总量 ≤ 30,000（权威总表见 `02-pipeline-conventions.md` 3.4 节）。
- [ ] **几何完整性**：`self_intersection` 门禁与 `attachment_anchor` 门禁均为 0 违规，各部件连接搭接 ≥ 5mm。
- [ ] **PBR 材质栈**：全面基于 `MeshStandardMaterial`，在 PMREM 环境光下高光与粗糙度过渡平滑，无过曝死白或死黑。

### 8.3 动画与交互验收
- [ ] **骨骼门禁**：离线阻断门 G4~G9、G11、G12 全绿 PASS；采样门 G1/G2/G3/G10 实测记录或带原因的 `unevaluated`；demo 页剪辑存在性 + 顶点位移自检通过，不存在静默失效（Silent Death）剪辑。
- [ ] **动作播放**：Idle / Walk / Aim 动作剪辑通过 `AnimationMixer` 正常流畅循环播放，迈步无明显滑步（footSlide ≤ 0.01H）。
- [ ] **展示台功能**：`demo-swat.html` 无头运行 5 帧后输出 `DEMO_OK`，转盘观察、线框模式、装具分解交互无错误。

---

## 9. 风险与回退方案

| 潜在风险 / 意外状况 | 触发条件与影响 | 预防措施与处置策略 | 回退预案 |
|---|---|---|---|
| **护目镜双层透明深度排序冲突（Z-Fighting / Sorting Bug）** | 透明镜片与后方面罩、头盔边缘在某些旋转角度下出现前后穿透翻转。 | 镜片材质设置 `depthWrite: false`，并将风镜组件 `renderOrder` 显式设置为 `10`，确保晚于不透明几何体渲染。 | 若排序仍异常，将镜片不透明度提升至 `0.95`（微透明暗色防弹镜片），规避复杂深度排序。 |
| **侧视投影在后背与腋下产生拉伸伪影** | swat-v3 虽然具备 90° 侧视，但背包与手臂遮挡了背部和肋下区域。 | 烘焙脚本使用 `--unseen-strategy palette-continue`，并对遮挡盲区应用纯深藏青/战术黑基础色补全。 | 局部切换为程序化三平面贴图（Triplanar Mapping）混合，掩盖拉伸瑕疵。 |
| **测地线蒙皮计算较慢或手部骨骼串扰** | M4A1 枪械部件与手套网格顶点距离过近，导致枪身被软化蒙皮带动变形。 | 枪械严格作为刚体独立 Group 挂载于 `hand_R` 骨骼 Socket 下，不参与主网格蒙皮权重分配。 | 强制锁定枪械所有顶点的 `skinWeight` 为单一骨骼 1.0。 |
| **分解视图在蒙皮网格上引发拓扑撕裂** | SkinnedMesh 在受到分解偏移时，顶点被多个骨骼权重拉扯变形。 | 采用已确认的“静态 T-pose 部件分解陈列”方案：触发分解时平滑暂停动画并归位 T-pose，连续蒙皮本体不做骨骼位移拉扯，仅对独立挂载装具（插板、头盔、风镜、挂包、护膝、枪套等）沿规划向量向外平移。 | 若特定部件复位产生位置偏移，重置回 basePosition 并重启动画混合器。 |
