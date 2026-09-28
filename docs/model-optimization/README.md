# 模型精细化优化 ·  roadmap（对标 img2threejs 官方 demo 精度）

> 本文档是本次优化的总索引与决策记录。后续每个模型的 spec、评审记录、rig 报告都存放在本目录下。

## 实施规划文档（plan/，2026-09-27 编制）

详细实施规划共 7 篇，存放在 `plan/` 子目录，按编号顺序阅读：

| 文档 | 内容 |
|---|---|
| [plan/00-master-plan.md](plan/00-master-plan.md) | 总实施规划：WBS、里程碑与交付物、阶段依赖、验收总表、风险登记册、变更管理 |
| [plan/01-environment-setup.md](plan/01-environment-setup.md) | Phase 0 环境准备与工具链验证（Python 3.10+、forge 测试、插件注册、视觉适配器） |
| [plan/02-pipeline-conventions.md](plan/02-pipeline-conventions.md) | 流水线通用规范：目录命名、spec 权威原则、工厂代码约定、渲染栈、质量门、纹理产物管理 |
| [plan/03-hero-militia.md](plan/03-hero-militia.md) | Phase 1a · militia 英雄版 11 步全流程（试点，最详） |
| [plan/04-hero-swat.md](plan/04-hero-swat.md) | Phase 1b · swat 英雄版 11 步（复用 militia 经验，写差异点） |
| [plan/05-demo-integration.md](plan/05-demo-integration.md) | demo 页集成：AnimationMixer 切换、PBR+PMREM 渲染栈、无头验证、性能预算 |
| [plan/06-phase2-weapons.md](plan/06-phase2-weapons.md) | Phase 2 · AK-47 / M4A1 武器英雄版与装配接口 |

> 各篇中的决策点已于 2026-09-27 经用户拍板，全部采纳推荐方案并回写为「决策记录」章节；其中分解视图全局统一为静态 T-pose 部件分解陈列（05 篇方案 B）。

## 目标

- 人物（militia / swat）与武器（AK-47 / M4A1）重建为**展示级英雄版模型**，精细程度贴近 img2threejs 官方 showcase（sora 角色、AWP Medusa 武器）
- 每个模型配**独立 demo 页**：轨道观察、动画剪辑播放、分解/线框、参考图面板（沿用现有 demo-*.html 模式）

## 已决决策（2026-09-27 与用户确认）

| # | 决策点 | 结论 | 影响 |
|---|---|---|---|
| 1 | Python 环境 | **安装 Python 3.10+** | 解锁官方 forge 流水线全部能力（投影烘焙、确定性 gate、PBR 证据提取、rig 工具链） |
| 2 | 英雄版来源 | **分离重建** | 游戏保留现有低模（syncMesh 契约不动）；英雄版全新重建，demo 页加载英雄版 |
| 3 | 纹理路线 | **投影烘焙** | 参考图去光照后投影到 UV（官方最大保真杠杆）；产生 PNG 纹理资产。两张参考图各含正面+侧面双视图，是理想输入 |
| 4 | 骨骼动画 | **本期就上** | 走 character 插件的 `animated-character` profile：真骨骼 + 蒙皮 + 命名剪辑，demo 页用 AnimationMixer 播放（对齐 sora） |

## 分期

### Phase 1 — 人物英雄版 ×2（先行）

每个人物流程（按 img2threejs skill 的 canonical 顺序）：

1. **环境就绪**（仅首次，见下节）
2. **intake**：图像分析（正面/侧面双视图裁剪读细节）→ `probe_image` → 细节清单 `build_detail_inventory --mode grid-3x3`
3. **pre-spec assessment**：复杂度定级 + quality contract；角色走 `grimoire/character/reconstruction.md` 路由（parts → head → hair/头巾）
4. **landmark 捕获**：`extract_landmarks`（MediaPipe 适配器，可选增强）填 `preSpecAssessment.anatomy`
5. **投影准备**：`solve_camera_pose`（正面+侧面各解一个相机）→ `delight_albedo`（硬要求，去光照后才可投影）
6. **spec  authoring**：`new_sculpt_spec --domain animated-character`，featureReviewTargets 用真实身份特征
   - militia：棋盘格头巾、卡其衬衫卷袖、橄榄胸挂四联弹匣、左臂红袖章、AK-47、棕褐登山靴
   - swat：头盔+护目镜、黑面罩、战术背心+MOLLE、护膝、青色阵营识别块、M4A1、黑作战靴
7. **锁定 pass 构建**：blockout → structure → form → material（连续头部体积是重点，不再全盒体）
8. **投影烘焙**：`bake_projected_texture --mesh-id <id>`，正面+侧面两路烘焙合并 UV
9. **评审循环**：turntable 四视角 + `self_intersection` + `attachment_anchor` + 对比表 + AI 视觉打分，有界修正（3/pass，6 total）
10. **rig 轨道**（animated-character 的 9 个 Stage R 步骤）：修复 → 冻结几何 → 蒙皮（geodesic，防空隙串扰）→ identity 绑定 → parity 验证 → 剪辑设计（`anim_action_design` 目标带）→ 12 项 rig gate
    - hard rules（来自插件文档，逐条不可违反）：从 GLB 读 rig（skin joint order 是权威）；冻结后只准 ADD；attached 模式 identity 绑定，display offset 只取 mesh bounds；`updateMatrixWorld(true)` 先于 `new THREE.Skeleton`；未测量的检查不算过
    - 剪辑目标（对齐 sora demo 按钮组）：idle / walk / aim（+ 可选 death）
11. **demo 页集成**：升级现有 demo-militia.html / demo-swat.html，程序化关节驱动切换为 AnimationMixer 命名剪辑播放

**建议试点顺序**：先 militia（头巾格纹 + 双视图信息量大，投影收益最高，且身份特征最鲜明，验收好坏最易判断），跑通全流程后 swat 复用经验。动工时可再定。

### Phase 2 — 武器英雄版 ×2（后续）

- AK-47、M4A1 各自独立重建（generic profile + 投影烘焙木件/金属饰面），参考官方 AWP Medusa 的单物体展示方式
- 新建 demo-ak47.html / demo-m4.html
- 与人物的装配关系：spec 的 sockets/action anchors 定义握持点，英雄武器可挂到英雄人物手上（届时设计）

## 环境准备清单（Phase 1 前置，仅一次）

1. 安装 Python 3.10+（用户确认后执行；装完验证 `python3 --version`，注意 Windows 下可能是 `py -3`）
2. 验证 base skill 可跑：`cd C:/Users/developer/.agents/skills/img2threejs && python3 -m unittest discover -s forge/tests`
3. 验证 character 插件注册：`img2 doctor`；若 `animated-character` profile 不可用 → `img2 add img2threejs/plugin-character --ref <tag>`（按 state.py init 的提示）
4. 验证插件自身测试：`cd C:/Users/developer/.agents/skills/img2-character && python3 -m unittest discover -s tests`
5. （可选）视觉适配器：MediaPipe（人脸/姿态 landmark）、Depth Anything V2（弱深度线索）；非必需，按需启用

## 目录与文件规划

```
docs/model-optimization/          本目录：roadmap、各模型 spec、评审记录、rig 报告
js/hero_models/                   英雄版工厂（新建）：militia.js、swat.js、（后续）ak47.js、m4.js
assets/textures/hero/             投影烘焙产物：<who>-albedo-front.png、<who>-albedo-side.png 等
.img2threejs/hero-militia/        工作区：state.json、assessment、spec、shots、rig-gate-payload
.img2threejs/hero-swat/           同上
demo-militia.html / demo-swat.html  升级：模型源切到 hero_models，动画切 AnimationMixer
（Phase 2）demo-ak47.html / demo-m4.html
```

## 技术适配要点（本项目 vs 官方流水线）

- **工厂用纯 JS ES module**：官方 generator 产 TypeScript，本项目无构建步骤；工厂手写 JS，spec JSON 仍是权威数据源，重建决策不留在代码孤本里
- **渲染栈升级**：英雄版用 MeshStandardMaterial + PMREM 环境光 + ACESFilmic tone mapping（游戏版继续 MeshPhongMaterial 不动）
- **demo 页动画切换**：英雄版不再遵守 syncMesh 的 `{legL, legR, arms, head}` 程序化契约（那是游戏版接口）；demo 页按钮改播 AnimationMixer 剪辑，分解视图在蒙皮模型上的呈现方式（按骨骼组位移 or T-pose 静态分解）在 rig 阶段定
- **烘焙纹理是构建产物**：reference → de-light → bake 的 PNG 入 assets/textures/hero/，重新烘焙可复现，不手改

## 风险与已知限制

- **rig gate 现状**：插件 12 项检查中 4 项尚无 producer，gate 当前 `blocking: false`；诚实记录 verdict，不把 unevaluated 当过
- **GLB rig 参考来源**：rig 轨道要求从 GLB 读骨架（skin joint order 为权威）；英雄版是程序化建模，GLB 中间参考的来源与 UniRig 对齐方式，在 rig 阶段开始前先读插件的 `reference/animation-contract.md` 再定
- **工作量预期**：单人物 = intake + spec + 多 pass 构建 + 评审循环 + rig 12 门，是大块工作；建议一次一个人物，串行推进
- **性能**：英雄版仅供 demo 页单体展示，不进游戏场景；游戏内低模保持不变
