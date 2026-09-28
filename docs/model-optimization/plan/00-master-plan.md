# 模型精细化优化 · 实施总规划（Master Implementation Plan）

> **文档版本**：v1.0.0  
> **编制日期**：2026-09-27  
> **对应规划**：`docs/model-optimization/plan/00-master-plan.md`  
> **执行依据**：`docs/model-optimization/README.md` 与用户决策结论  

---

## 0. 文档总览与执行导引

本文档是 fps-demo 项目模型精细化优化工程的顶层实施总规划，旨在为全流程执行者提供清晰、可验证、无歧义的落地指导。本次优化以 img2threejs 官方 showcase（sora 人物角色与 AWP Medusa 武器）为精度标杆，彻底解决前期无 Python 环境下的手工替代局限，全面激活官方 forge 完整流水线。规划采用"环境就绪 → 单兵试点 → 经验复制 → 武器攻坚"的严密串行 WBS，确保每个资产具备独立版本化的数据规格（spec JSON）、去光照投影烘焙贴图、标准骨骼蒙皮动画与自动化门禁验证。所有英雄版模型完全独立于游戏战斗低模，在专用 demo 页面通过现代 PBR 渲染栈与 AnimationMixer 呈现顶级视觉质量。

---

## 1. 目标与范围（Goals & Scope）

### 1.1 总体目标与精度对标
1. **角色模型重建**：
   - 将潜伏者（militia·沙漠民兵）与保卫者（swat·特警）重构为展示级英雄版模型（Hero Models），对标 img2threejs 官方 `sora` 角色的细节丰富度与解剖比例。
   - 摆脱全盒体堆叠（box-only）拼接，引入连续头部几何体积、精细装备扣件、立体悬挂以及高保真面料皱褶。
2. **武器模型重建（Phase 2）**：
   - 将 AK-47 与 M4A1 突击步枪独立重建为展示级机械模型，对标官方 `AWP Medusa` 级别的机匣刻线、木纹/战术涂装与导轨细节。
3. **展示平台升级**：
   - 沿用并重构 `demo-militia.html` 与 `demo-swat.html`，新建 `demo-ak47.html` 与 `demo-m4.html`。
   - 标配交互：360° 轨道检视、AnimationMixer 骨骼剪辑平滑切换（idle/walk/aim）、部件分解（Explode）、拓扑线框（Wireframe）、转盘匀速巡检以及原始参考图并排对照面板。

### 1.2 四项已决执行前提（转述自 README）
本规划严格继承 2026-09-27 确认的四项核心决策，作为后续所有实施步骤的前提约束：
1. **安装 Python 3.10+ 运行时**：彻底解锁官方 forge 流水线全量工具链（包含 intake 分析、去光照投影烘焙、PBR 证据提取、确定性门禁及 Stage R 骨骼工具链）。
2. **分离重建原则**：游戏主战场继续保留现有低模，维持 `syncMesh` 程序化关节动画契约（`{ legL, legR, arms, head }`）不动；英雄版全新重构并输出至 `js/hero_models/`，仅由 demo 页面加载，绝不侵入游戏主战场，保障射击帧率与兼容性。
3. **投影烘焙纹理路线**：确立参考图投影为最高优先级保真手段。针对 `assets/concepts/` 下的正面与侧面高分辨率参考图，执行 `delight_albedo` 去除烘焙固有光照，再经 `bake_projected_texture` 投影合并到模型 UV，生成标准 PNG 贴图入库 `assets/textures/hero/`，彻底取代程序化单色块材质。
4. **本期全量上线骨骼动画**：全面启用 character 插件的 `animated-character` profile，构建真骨骼（THREE.Skeleton）与加权蒙皮（THREE.SkinnedMesh），输出标准化剪辑（idle / walk / aim），在 demo 页通过 `THREE.AnimationMixer` 驱动播放。

---

## 2. 工作分解结构（WBS）

### 2.1 阶段划分
整个实施过程划分为三个核心阶段与一个贯穿交付轨道：

```
[Phase 0: 环境准备与工具链验证] (01-environment-setup.md)
              │
              ▼
[Phase 1a: militia 英雄版试点攻坚] (03-hero-militia.md)
              │ (沉淀投影烘焙、骨骼绑定与门禁闭环经验)
              ▼
[Phase 1b: swat 英雄版经验复制] (04-hero-swat.md)
              │
              ├──────────► [贯穿阶段: Demo 集成与渲染栈升级] (05-demo-integration.md)
              ▼
[Phase 2: 武器英雄版 AK-47 & M4A1] (06-phase2-weapons.md)
```

### 2.2 串行推进的工程理由
1. **单人物工程体量庞大**：单个英雄人物涉及图像 intake、预规格评估、spec 编制、四级锁定 pass 构建（blockout→structure→form→material）、双视图去光照投影烘焙、turntable 四向评审循环，以及 Stage R（R0~R6）九个骨骼构建步骤与 12 项 rig gates，任务链路极长。
2. **试点先行消除管线摩擦**：militia 的参考图具备极鲜明的棋盘格头巾纹理与高质量正侧双视图，投影烘焙收益立竿见影，身份特征（红臂章、胸挂）验收判定明确。将其作为第一试点，能够以最低成本踩通 Python 工具链、UV 展开、骨骼加权与 demo 渲染桥接的所有潜在障碍。
3. **经验模板化赋能后续资产**：militia 试点跑通后，其生成的 `state.json` 结构、材质着色器模板、骨骼配置映射（UniRig 对应关系）将直接沉淀为标准化资产，swat 模型与 Phase 2 武器可直接套用成熟模式，大幅缩短后续工期。

---

## 3. 里程碑与交付物总表（Milestones & Deliverables）

| 里程碑编号 | 里程碑名称 | 核心目标与交付内容 | 交付物文件路径 / 产出形态 | 验证方式与通过标准 |
|---|---|---|---|---|
| **M0** | 工具链基线就绪 | 完成 Python 3.10+ 安装，验证 base skill 与 character 插件自测绿灯 | `docs/model-optimization/plan/01-environment-setup.md` 记录；`img2 doctor` 输出 | 单元测试 100% 通过（`forge/tests` 与 `img2-character/tests` 绿灯） |
| **M1a** | militia 英雄版全流程交付 | 完成潜伏者从 intake 到 12 门 rig gate 全流程，生成高保真骨骼模型与贴图 | `.img2threejs/hero-militia/state.json`<br>`docs/model-optimization/spec-hero-militia.json`<br>`assets/textures/hero/militia-albedo-*.png`<br>`js/hero_models/militia.js` | 状态机 `status=complete`；Pass review 全部 `continue`；Rig 门禁 G1~G12 报告生成；无头 Chrome 校验 `DEMO_OK` |
| **M1b** | swat 英雄版全流程交付 | 复用试点经验，完成保卫者英雄版重建，输出藏青作战服与战术装具高保真模型 | `.img2threejs/hero-swat/state.json`<br>`docs/model-optimization/spec-hero-swat.json`<br>`assets/textures/hero/swat-albedo-*.png`<br>`js/hero_models/swat.js` | 同 M1a 标准，且头盔护目镜与战术背心 MOLLE 结构通过 AI 视觉评审（≥0.85） |
| **M1-Demo** | 渲染栈与 Demo 页面升级 | 升级 demo 页面渲染管线（PBR + ACESFilmic + PMREM），接入 AnimationMixer 动画机 | `demo-militia.html`<br>`demo-swat.html`<br>`js/demo/hero-militia-demo.js`<br>`js/demo/hero-swat-demo.js` | 浏览器 5 帧正常渲染输出 `document.title = 'DEMO_OK'`；控制坞按钮可自由切播 idle/walk/aim 剪辑 |
| **M2** | 武器英雄版交付 | 重建 AK-47 与 M4A1 独立英雄高模，支持机匣导轨特写与角色手部插槽挂载 | `js/hero_models/ak47.js`<br>`js/hero_models/m4.js`<br>`demo-ak47.html`<br>`demo-m4.html` | 单体 demo 正常运行；武器预留标准挂载点（action anchors），支持手部 socket 绑定 |

---

## 4. 阶段间依赖关系与数据流（Dependencies & Data Flow）

### 4.1 逻辑依赖关系图
```
[Phase 0: 01-environment-setup.md]
  │ (提供运行环境: Python 3.10+ / forge CLI / img2-character)
  ▼
[规范定义: 02-pipeline-conventions.md]
  │ (定义数据契约: 命名空间、PBR渲染栈、坐标系约定、门禁阈值)
  ├─────────────────────────────────────────────────┐
  ▼                                                 ▼
[Phase 1a: 03-hero-militia.md]              [Phase 05: 05-demo-integration.md]
  │ (产出: militia 英雄版模型 + 烘焙贴图)            │ (提供: 双模 demo 页面与动画机框架)
  ▼                                                 │
[Phase 1b: 04-hero-swat.md] ◄───────────────────────┘
  │ (产出: swat 英雄版模型 + 烘焙贴图)
  ▼
[Phase 2: 06-phase2-weapons.md]
  (产出: AK-47 & M4A1 英雄版 + 骨骼插槽装配)
```

### 4.2 资产与数据流向表
| 步骤序号 | 发起阶段 | 产生数据/资产 | 消费阶段 | 消费目的与约束 |
|---|---|---|---|---|
| D-01 | Phase 0 | Python 3.10+ 与插件 CLI 环境 | 全阶段 | 支撑所有 Python 辅助脚本、投影烘焙与自动化门禁计算 |
| D-02 | Phase 1a | `militia-v3.png` 正侧裁剪与去光照贴图 | Phase 1a / Build | 投影映射到 UV，生成 `assets/textures/hero/militia-albedo-*.png` |
| D-03 | Phase 1a | `spec-hero-militia.json` | Phase 1a / 工厂代码 | 充当英雄版 militia 工厂唯一结构事实源，约束组件层级与材质参数 |
| D-04 | Phase 1a | `js/hero_models/militia.js` (含骨骼与剪辑) | Phase 1a / Demo | 接入 `demo-militia.html`，由 `AnimationMixer` 驱动播放 |
| D-05 | Phase 1a | 试点复盘总结与骨骼映射配置 | Phase 1b | 指导 swat 规避 Stage R 绑定错误，加速 swat 的 spec 编制与权重平滑 |
| D-06 | Phase 1b | `js/hero_models/swat.js` | Phase 1b / Demo | 接入 `demo-swat.html`，完成保卫者英雄模型上线 |
| D-07 | Phase 1 | 人物手上预留的 `socket_right_hand` 坐标 | Phase 2 | 作为 Phase 2 武器与人物骨骼装配的物理锚点 |

---

## 5. 总体实施步骤（逐步指引）

执行者在开展具体工程时，须遵循以下由浅入深的标准作业步骤：

### 步骤 1：基础环境准备与工具链自检（对应 `01-environment-setup.md`）
1. 安装 Python 3.10+，并确认可在终端正常调用：
   ```bash
   python3 --version || py -3 --version
   ```
2. 执行 base skill 与 character 插件单元测试，确保无环境缺失：
   ```bash
   # 1. 验证 base skill
   cd C:/Users/developer/.agents/skills/img2threejs
   python3 -m unittest discover -s forge/tests || py -3 -m unittest discover -s forge/tests

   # 2. 验证 character 插件
   cd C:/Users/developer/.agents/skills/img2-character
   python3 -m unittest discover -s tests || py -3 -m unittest discover -s tests
   ```
3. 验证通过后方可开放后续模型流水线。

### 步骤 2：建立工作区与初始化状态门禁（对应 `02-pipeline-conventions.md`）
1. 为每个待重建模型在 `.img2threejs/` 下设立专属隔离工作区（例如 `.img2threejs/hero-militia/`）。
2. 使用 `forge/state.py` 初始化工作流状态，强制要求指定 `animated-character` profile：
   ```bash
   cd C:/Users/developer/.agents/skills/img2threejs
   python3 forge/state.py init \
     --state C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/state.json \
     --reference C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png \
     --profile animated-character \
     --spec C:/hzc/GitRepo/John-1010-cmd/fps-demo/docs/model-optimization/spec-hero-militia.json
   ```
3. 每步操作前严格执行 `python3 forge/next.py` 获取下一步指令，严禁跳过门禁步骤。

### 步骤 3：执行阶段试点 militia 英雄版全生命周期（对应 `03-hero-militia.md`）
1. **Intake & Assessment**：执行图像特征提取，测量解剖比例与正侧双视角对齐参数。
2. **Spec Authoring**：编写 `spec-hero-militia.json`，严格定义 5 大身份特征、网格拓扑、PBR 参数与骨骼锚点。
3. **Locked Build Passes**：分阶段构建几何体，严禁跨越未解锁 pass。
4. **Projection Baking**：执行去光照（delight）后投影烘焙，产出真实纹理并合并 UV。
5. **Stage R Rigging**：执行 R0~R6 骨骼与动画流程，绑定骨骼并测量 G1~G12 门禁指标。
6. **代码沉淀**：编写 ES Module 工厂 `js/hero_models/militia.js`。

### 步骤 4：经验复用与 swat 英雄版推进（对应 `04-hero-swat.md`）
1. 继承 militia 阶段沉淀的标准化骨架数据结构与材质模板。
2. 重点攻克 swat 的深藏青战术服迷彩、棱角分明的护膝、战术背心 MOLLE 编织带与头盔护目镜。
3. 完成 swat 的 Stage R 骨骼动画绑定与工厂封装 `js/hero_models/swat.js`。

### 步骤 5：渲染栈升级与 Demo 页面交付（对应 `05-demo-integration.md`）
1. 重构 `demo-militia.html` 与 `demo-swat.html`，建立现代 WebGL 影棚光照环境（ACESFilmic 色调映射 + PCF 软阴影 + PMREM 环境贴图）。
2. 将传统逐帧驱动函数重构为 `THREE.AnimationMixer` 状态机，无缝过渡待机、迈步与瞄准动作。
3. 实现部件分解、线框渲染、转盘旋转与双重视图（参考图 vs 渲染模型）联动。

### 步骤 6：Phase 2 武器高模独立攻坚（对应 `06-phase2-weapons.md`）
1. 提取 AK-47 与 M4A1 参考特征，建立独立武器工厂。
2. 烘焙金属机匣、导轨槽与木质纹理。
3. 建立武器与角色骨骼手部挂载插槽（Sockets）的连接契约。

---

## 6. 总验收标准汇总表（Acceptance Criteria Checklist）

执行者在交付前必须对照下表进行逐项勾选，全部达成方可判定工程交付完成：

### 6.1 环境与工具链验收
- [ ] 本地已安装 Python 3.10+，执行 `python3 --version` 或 `py -3 --version` 正常返回。
- [ ] `img2threejs` 仓库 `forge/tests` 单元测试全部通过（0 failure / 0 error）。
- [ ] `img2-character` 插件 `tests` 单元测试全部通过。
- [ ] `img2 doctor` 诊断报告中核心依赖均为 OK。

### 6.2 模型规格与几何拓扑验收
- [ ] `spec-hero-militia.json` 与 `spec-hero-swat.json` 完整存在并通过 `--strict-quality` 校验。
- [ ] 头部结构摆脱单一盒体，呈现连续立体结构与包裹头巾/头盔面罩。
- [ ] 关键身份特征全部呈现且与参考图高度拟合（militia 格纹头巾、左臂红袖章、四联胸挂；swat 顶置护目镜、MOLLE 插板背心、双臂青色章）。
- [ ] 所有左右对称部件遵循手性镜像契约（基于局部坐标系 $X \to -X$ 镜像），无面法线颠倒（winding order 正常）。
- [ ] 静态模型通过自穿插检查（`self_intersection.py` 报告无严重贯穿重叠）。

### 6.3 纹理与材质渲染验收
- [ ] 投影贴图严格经过 `delight_albedo.py` 去光照处理，杜绝双重阴影烘焙瑕疵。
- [ ] 贴图资产完整输出为 PNG 格式并存放于 `assets/textures/hero/` 目录下。
- [ ] 英雄版工厂采用 `MeshStandardMaterial`，正确设置 `roughness` 与 `metalness` 标量。
- [ ] 渲染器启用 `ACESFilmicToneMapping` 与软阴影，模型在影棚灯光下具备真实体积感与边缘高光。

### 6.4 骨骼与动画系统验收（Stage R & Gates）
- [ ] 骨架符合标准层级，严格遵循权威 joint order（`js/hero_models/common-rig.js` 程序化 Humanoid 骨骼字典，即本项目 `skin.joints` 等价物），无孤立非骨骼节点混入骨骼索引空间。
- [ ] 绑定在 attached 模式下执行恒等绑定（identity bind），位移偏移量严格取自网格包围盒。
- [ ] 蒙皮权重经由距离加权平滑（skin conditioning），动作极限拉伸下无恶性破皮穿透。
- [ ] 具备完整的 `idle`（待机呼吸）、`walk`（战术迈步）、`aim`（持枪瞄准）三个动画剪辑。
- [ ] 骨骼动画门禁执行并输出报告（分层口径以 `02-pipeline-conventions.md` 3.5 节为准）：
  - 离线阻断门必须全部 PASS，不接受 `unevaluated`：
    - G4（权重归一化）：每个顶点权重和 $|1 - \sum w| \le 2\times 10^{-7}$ 严格达标。
    - G5（骨骼索引越界检查）：$\max(skinIndex) \le bones - 1$ 严格达标。
    - G7（左右链手性锚点）：$leftAnchor.x > 0 > rightAnchor.x$ 严格通过。
    - G8（足部滑动约束）：站立步态下足部滑移量 $\le 0.01H$。
  - 采样门 G1/G2/G3/G10（非阻断）：由 demo 页轻量监控实测并如实记录；缺数据记 `unevaluated` 并注明原因，不算通过、不阻断交付。其中 G1（防静默假播放）以 demo 页剪辑存在性 + 顶点位移自检为必检证据。

### 6.5 Demo 展示页面与自动化验证验收
- [ ] 用户常驻服务 `http://localhost:8080` 下访问 `demo-militia.html` 与 `demo-swat.html` 无脚本报错。
- [ ] 无头 Chrome 验证通过（控制台执行无异常退出，页面加载 5 帧后 `document.title` 正确变为 `DEMO_OK`）：
  ```bash
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --dump-dom "http://localhost:8080/demo-militia.html" | grep "DEMO_OK"
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --dump-dom "http://localhost:8080/demo-swat.html" | grep "DEMO_OK"
  ```
- [ ] 页面交互功能健全：自由轨道旋转、缩放、平移平滑响应；动画按钮无缝切换剪辑；线框模式可观察真实三角面拓扑；分解视图支持静态 T-pose 部件分解陈列（独立装具平滑外移，动画平滑暂停/恢复，连续蒙皮本体不拉扯破皮）。

---

## 7. 风险登记册与缓解策略（Risk Register）

| 风险编号 | 风险描述 | 影响等级 | 缓解策略与技术应对方案 | 责任人 |
|---|---|---|---|---|
| **R-01** | **Rig Gate 12 项中 4 项无原生 producer 且当前 `blocking: false`**<br>插件针对 G1（驱动采样）、G2（形变采样）、G3（位姿还原）、G10（扫掠撕裂）需宿主浏览器采样，当前缺少现成生成器脚本。 | 高 | 1. 严格遵守"诚实上报规则"：缺少输入项的门禁明确标注 `status: "unevaluated"` 并注明原因，严禁伪造 `pass`。<br>2. 执行轻量化监控方案（见第 8 节决策记录 3），依托 Demo 页面在浏览器环境提取并填充 `rig-gate-payload.json`。<br>3. 门禁分层执行（口径详见 `02-pipeline-conventions.md` 3.5 节）：离线阻断门 G4~G9、G11、G12 必须全部 PASS；采样门 G1/G2/G3/G10 非阻断但强制实测记录，G1 以 demo 页剪辑存在性 + 顶点位移自检为必检证据。 | 执行者 |
| **R-02** | **程序化 UniRig 骨架与 Stage R 门禁对齐**<br>Stage R 理论上要求自标准 GLB 提取参考骨架，但本项目模型为纯手写程序化 ES 模块，缺少现成 GLB 中间件。 | 中 | 1. 执行已确认方案（见第 8 节决策记录 1）：在 `js/hero_models/common-rig.js` 中固化一套标准的 Humanoid 骨骼层级常量与命名字典（完全对齐 UniRig 标准骨骼命名），纯程序化构建骨架并导出测试 payload。<br>2. 彻底免除外部参考 GLB 依赖，无需维护 `assets/rigs/reference-humanoid.glb` 中间件。 | 执行者 |
| **R-03** | **单人物实施链路漫长引发的阶段脱节**<br>单个角色包含 12 步流水线与 9 步骨骼流程，一旦中途断点容易丢失进度。 | 中 | 1. 强制依赖 `.img2threejs/hero-*/state.json` 记录所有 step 执行状态与 evidence 路径。<br>2. 实行"一角色一分支/一检查点"，严格遵守 WBS 串行原则，militia 未达成全部交付物前绝不擅自启动 swat。 | 执行者 |
| **R-04** | **英雄版高保真模型导致的潜在性能边界失控**<br>高面数网格与复杂 PBR 贴图可能引入渲染卡顿或被误用于游戏主场景。 | 中 | 1. 物理隔离：英雄版代码放入 `js/hero_models/`，游戏主逻辑 `js/game.js` 严禁 import 该目录。<br>2. 严格执行分层性能预算（权威口径见 `02-pipeline-conventions.md` 3.4 节性能预算总表）：角色本体 ≤ 15,000 三角面、完整合计（本体+装具+随附武器）≤ 28,000、demo 页总量 ≤ 30,000；主体人形骨架 ≤ 32 根、次级动态骨骼 ≤ 12 根（总数 ≤ 44 根），完全满足单体 demo 在 60 FPS 流畅运行。 | 执行者 |
| **R-05** | **概念参考图分辨率与视角遮挡限制**<br>`militia-v3.png` 与 `swat-v1.png` 虽有双视角，但背部挂件与鞋底等区域仍存在视觉盲区。 | 低 | 1. 遵守解剖学与军事常识补全盲区（背部依据战术背心标准背板与水袋包规制）。<br>2. 投影贴图在盲区应用通用材质过渡或对称镜像，并记录在评估文档中；AI 视觉打分时对不可见区域设合理容差。 | 执行者 |

---

## 8. 决策记录（2026-09-27 用户确认）

为杜绝实施过程中的开放式空白与返工，针对实施规划中的关键技术决策点，2026-09-27 用户已完成审定并全量确认以下执行方案（全部采纳推荐方案，其中分解视图全局统一采纳静态 T-pose 部件分解陈列方案）：

### 决策点 1：Stage R 骨骼系统的数据源载体与 UniRig 对齐路线
- **执行方案**：采用**纯代码程序化 UniRig 骨骼字典**路线。在 `js/hero_models/` 中建立标准骨骼生成器，直接构建标准 Humanoid 骨骼层级（Hips, Spine, Chest, Neck, Head, Shoulders, Arms, Hands, Thighs, Calves, Feet），并在生成时导出符合规范的 `rig-gate-payload.json` 供门禁脚本直接验证。不引入外部第三方 GLB 转换环节。
- **备选方案（备选，未采纳）**：引入一个标准的开源低模人形绑定 GLB 文件（如通用 CC0 格式 T-pose 骨骼文件）作为权威外部输入，由 `glb_rig_reference.py` 解析后映射到程序化网格。
- **状态**：【已确认 2026-09-27】采纳推荐方案：采用纯程序化 UniRig 骨骼字典，不引入外部 GLB。

### 决策点 2：英雄版模型在 Demo 页分解视图（Explode）的呈现形态
- **执行方案**：采用**静态 T-pose 部件分解陈列**（全局统一决策，对齐 `05-demo-integration.md` 方案 B）。触发分解时动画平滑暂停、模型归位标准 T-pose 姿态，独立装具（头巾/插板/弹匣袋/挂包/护膝/武器等）按规划向量向外平移陈列；连续蒙皮本体不做骨骼位移拉扯（彻底避免蒙皮面条状拉伸与破皮畸变）；再次点击复位后部件平滑归位并恢复动画播放。
- **原推荐方案（备选，未采纳）**：骨骼组质心位移驱动。令骨骼关键父节点（如头部骨、四肢根骨骼、武器插槽）沿质心外向缓动偏移。因英雄版为连续蒙皮网格，骨骼位移拉扯会导致关节处出现严重的面条状拉伸变形与破皮，已被全局决策否决。
- **状态**：【已确认 2026-09-27】结论翻转：采纳静态 T-pose 部件分解陈列方案，否决骨骼组位移方案。

### 决策点 3：无原生 Producer 的 Rig Gates（G1/G2/G3/G10）验证深度
- **执行方案**：**维持 `blocking: false` 并实施核心门禁实测与轻量监控**。在 Phase 1 阶段，离线阻断门 G4（权重归一化）、G5（索引合法）、G6（全部可见网格已绑定）、G7（手性）、G8（脚滑）、G9（无关节缩放）、G11（冻结几何一致）、G12（骨骼层级映射）必须全部通过自动化门禁测试；采样门 G1/G2/G3/G10 在 demo 页面挂载轻量监控函数（剪辑存在性、播放时网格顶点位移、stop 后姿态还原、176 帧扫描）实测并如实向报告记录数值，确实缺数据的项严格诚实记录为 `unevaluated` 并注明原因，不算通过、不阻断交付，严禁伪造数据。统一分层口径以 `02-pipeline-conventions.md` 3.5 节为准。
- **备选方案（备选，未采纳）**：为 Node.js 编写专用的无头 Playwright/Puppeteer 采样测试脚本，完整模拟 176 帧动画播放并抽取顶点缓冲区，强制填满 G1~G12 全部 producer 数据，将 `blocking` 设为 `true`。
- **状态**：【已确认 2026-09-27】采纳推荐方案：维持 `blocking: false`，采用轻量监控+诚实记录 `unevaluated`。

### 决策点 4：Phase 2 英雄武器与角色的挂载装配方式
- **执行方案**：采用**独立武器模型 + `socket_right_hand` 动态插槽挂载（Socket Attachment）**。AK-47 / M4A1 作为完全独立的网格模型开发，拥有独立的尺寸与坐标系，在右手手掌骨骼节点下绑定一个名为 `socket_right_hand` 的 Object3D 锚点，将武器作为子节点动态挂载，兼顾独立展示与随手动作协同。
- **备选方案（备选，未采纳）**：**一体化蒙皮网格（Integrated Skinned Mesh）**。武器与士兵网格合并为一个大几何体，武器机匣与弹匣直接赋予右手骨骼顶点权重。
- **状态**：【已确认 2026-09-27】采纳推荐方案：独立武器模型 + `socket_right_hand` 动态插槽挂载。

---

## 9. 变更管理与执行规则（Change Management）

为确保多人或多会话跨度下项目的确定性与可维护性，确立以下不可违反的变更规则：

1. **Spec JSON 为唯一事实源（Single Source of Truth）**：
   - 所有的几何尺寸、材质参数、配色、骨骼名称与关键特征描述，必须首先写入 `docs/model-optimization/spec-*.json`，严禁直接在 JS 代码中写死未在 spec 中定义的私有魔数。
   - 每次代码微调（如手部内收角度、肩膀宽度）必须反向同步写入 spec JSON，保证文档与代码一致。
2. **烘焙贴图为受管构建产物（Derived Artifacts）**：
   - `assets/textures/hero/` 下的所有 PNG 贴图必须是由参考图经由 `delight_albedo` 与 `bake_projected_texture` 脚本计算生成的不可变产物。
   - 严禁使用图像处理软件手工涂抹修改 PNG 贴图；任何贴图效果修正必须通过重新调整去光照参数、投影相机参数或重跑烘焙脚本实现。
3. **规划文档集协同更新机制**：
   - 若在实施过程中发现不可抗力或经由用户决策变更了路线（如某个门禁规则调整），必须第一时间更新 `docs/model-optimization/plan/` 下对应的子文档，并在本总规划文件的版本变更记录中登记。
   - 状态记录以 `.img2threejs/hero-*/state.json` 为准，不得依赖上下文记忆推进。

---

## 10. 文档集导航与指引（Documentation Navigation）

本项目规划文档集按功能严密解耦，执行者应按如下导引阅读并执行：

```
docs/model-optimization/plan/
├── 00-master-plan.md          [当前文档] 总实施规划、WBS、里程碑与总验收
├── 01-environment-setup.md    Phase 0: Python 3.10+ 环境安装与全量工具链自检指南
├── 02-pipeline-conventions.md 全局规范: 数据结构、PBR渲染栈、坐标系与门禁标准
├── 03-hero-militia.md         Phase 1a: militia 英雄版试点全生命周期实操手册
├── 04-hero-swat.md            Phase 1b: swat 英雄版经验复制与攻坚手册
├── 05-demo-integration.md     贯穿任务: 独立 Demo 页面集成与 Modern Three.js 渲染栈重构
└── 06-phase2-weapons.md       Phase 2: AK-47 与 M4A1 独立武器英雄版实施计划
```

### 各分篇核心职责索引：
- **查阅环境部署与工具验证命令** ── 请转阅 `01-environment-setup.md`
- **查阅材质/色彩/骨骼/状态机契约标准** ── 请转阅 `02-pipeline-conventions.md`
- **执行潜伏者（militia）第一阶段重建** ── 请转阅 `03-hero-militia.md`
- **执行保卫者（swat）第二阶段重建** ── 请转阅 `04-hero-swat.md`
- **集成 Demo 舞台、光照环境与动画切换机** ── 请转阅 `05-demo-integration.md`
- **执行枪械高模与插槽挂载** ── 请转阅 `06-phase2-weapons.md`
