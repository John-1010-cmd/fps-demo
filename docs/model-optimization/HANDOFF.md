# HANDOFF · 模型精细化优化实施交接（2026-09-28）

> **一句话状态**：Phase 0 环境就绪已全部验收通过（8/8）；Phase 1a militia 英雄版推进到 11 步中的**步骤 6（Spec 编制）收尾阶段**——spec 已通过绝大部分严格校验，仅剩材质证据回填（colorMaterialRecipe / referencePbr）一个环节，对应脚本 bug 已修复待重跑。
> 实施目标与验收标准见 `plan/00-master-plan.md`；当前暂停中，恢复方式见文末。

---

## 1. 文档地图（先读这些）

| 优先级 | 文档 | 作用 |
|---|---|---|
| 必读 | `docs/model-optimization/README.md` | 总 roadmap + 4 项已决决策 + 风险 |
| 必读 | `docs/model-optimization/plan/00-master-plan.md` | WBS、里程碑、验收总表、风险登记册、决策记录 |
| 必读 | `docs/model-optimization/plan/02-pipeline-conventions.md` | **口径权威**：目录命名、工厂签名、性能预算总表（3.4）、门禁分层（3.5）、纹理产物铁律 |
| 当前执行 | `docs/model-optimization/plan/03-hero-militia.md` | militia 11 步详细计划（当前执行到步骤 6） |
| 已完成 | `docs/model-optimization/plan/01-environment-setup.md` | Phase 0 环境计划；第 8 节有实机验收证据签字 |
| 后续 | `04-hero-swat.md` / `05-demo-integration.md` / `06-phase2-weapons.md` | swat / demo 页 / 武器（未开始） |

## 2. 已完成工作

### 2.1 Phase 0 · 环境就绪（✅ 全部通过，2026-09-27）
- Python 3.13.12（复用 uv 缓存 `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`），经 `~/.local/bin/` 的 `python3`/`python`/`py`/`img2` shim 调用；
- `PYTHONUTF8=1` + `PYTHONIOENCODING=utf-8` 已写入 `~/.bashrc` 和 Windows 用户环境变量；
- 测试证据：forge `test_pipeline.py` 57/57 OK；geodesic_skinning+rig_gates 56/56 OK；img2-character 235/235 OK；`img2 doctor: ok`；
- CRLF 哈希漂移（插件两份 reference 文档）已按预案转 LF 归零；
- **详细证据**：`plan/01-environment-setup.md` 第 8 节"执行记录"。

### 2.2 Phase 1a · militia 进度（步骤 1~5 完成，步骤 6 进行中）

| 步骤 | 状态 | 产出物 |
|---|---|---|
| 1. 输入确认与身份特征固化 | ✅ | 5 Critical + 4 Important 特征清单（在 spec `featureReviewTargets`） |
| 2. Intake（裁剪/probe/细节清单） | ✅ | `assets/concepts/militia-front.png`（656×1199）、`militia-side.png`（525×1199）；`probe.json`（technicalSuitability=pass）；`zones/` 9 宫格 + `detail-inventory.json` |
| 3. Pre-spec Assessment | ✅ | `assessment.json`（complex、7.5 HU 路由） |
| 4. Landmark 捕获 | ✅（人工量取） | `militia-anatomy.json` + `militia-landmarks.png` overlay；`anatomy.applies=true`，confidence=0.75（MediaPipe 未启用，人工量取，值见文件） |
| 5. 投影准备 | ✅ | `camera-front.json` / `camera-side.json`；`delight-front.png` / `delight-side.png`（**置信度 0.598/0.599 < 计划阈值 0.70，已人工核对并记录偏差，见 spec assumptions**） |
| 6. Spec 编制与严格校验 | 🔶 **进行中** | `militia-sculpt-spec.json`（39 组件 / 13 材质 / 13 评审目标）；校验器从 101 错误收敛到**仅剩 2 类提取型错误**（见 §5 待办 T1） |
| 7~11. 构建/烘焙/评审/rig/demo | ⬜ 未开始 | — |

## 3. 已确认决策（执行时必须遵守）

全部规划决策已于 2026-09-27 用户拍板（各篇"决策记录"章节），另有两项实施中新决策：

1. **坐标系决策（实施中新定，2026-09-28）**：英雄版模型局部空间采用 img2-character 插件约定——**left=+X、front=+Z**（插件 chirality 校验与 G7 硬性要求 `leftAnchor.x > 0`）。与游戏低模（面向 -Z）相反，**demo 展示层以根节点 `rotation.y = π` 呈现面向 -Z**。红臂章在模型局部 **+X**（解剖学左臂不变）。侧视参考图为角色**左侧**（+X 侧）。⚠️ **文档债**：`02` 篇坐标系表述、`03` 篇验收"朝向 -Z"、`04` 篇 M4A1"枪口 -Z"等待回写统一（目前以 spec `coordinateFrame` 与本文件为准）。
2. **delight 参数**：strength=0.60 维持（1.0 过度拉平丢失固有色分离）；置信度低于阈值系工具对宽亮度范围图像自申封顶，已人工核对通过。
3. 其他关键项：分解视图=静态 T-pose 部件陈列；烘焙合并单张 2048² `militia-albedo.png`；idle/walk/aim 必选、death 可选；Python 复用 uv 3.13；纯程序化骨骼字典（`js/hero_models/common-rig.js`，**不引入外部 GLB**）；工厂签名 `async buildHeroMilitia(options)` 返回 `{group, skinnedMesh, skeleton, mixer, clips(普通对象非Map), anchors, dispose}`；性能分层预算（本体≤15k/装具≤7k/随附武器≤6k/完整≤28k/页面≤30k，骨骼≤44）；门禁分层（离线阻断 G4~G9/G11/G12 必须 PASS；采样门 G1/G2/G3/G10 实测或 unevaluated，G1 以 demo 页顶点位移自检为必检证据）。

## 4. 环境使用规约（每次 Bash 调用都要注意）

- Bash 工具每次调用是新 shell，**不自动加载 ~/.bashrc**；命令前缀：`export PATH="$HOME/.local/bin:$PATH"`，Python 调用前加 `PYTHONUTF8=1`。
- 该 Python 是 PEP 668 externally-managed——**不要用全局 pip 装包**；视觉适配器等扩展走 `uv sync`（见 01 篇步骤 6）。
- 工具链 cwd 约定：forge 脚本在 `C:/Users/developer/.agents/skills/img2threejs` 下执行；插件测试在 `C:/Users/developer/.agents/skills/img2-character` 下执行。
- 用户常驻服务器 `http://localhost:8080`：**不重启、不杀进程**。
- 无头验证：`"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --dump-dom <url>`，5 帧后 `document.title` 应为 `DEMO_OK`（出错为 `DEMO_ERR`）。

## 5. 待办（按顺序执行）

### T1 · 收尾步骤 6（spec 校验清零）
**现状**：`validate_sculpt_spec.py --strict-quality` 仅剩 2 类错误：39× 组件缺 `colorMaterialRecipe`、13× 材质缺 `referencePbr`。
**已修复待重跑**：`.img2threejs/hero-militia/extract_materials.py`（材质区域分析脚本）。此前两轮失败原因：① manifest 缺注册表 `materialId`（assignment=request-input）；② 脚本每轮重写 manifest 把手工注入的 materialId 冲掉——**已在脚本内固化为 `FAMILY_MATERIAL_ID` 映射，直接重跑即可**：
```bash
export PATH="$HOME/.local/bin:$PATH"
PYTHONUTF8=1 python3 .img2threejs/hero-militia/extract_materials.py   # 约 5~7 分钟，建议 run_in_background
```
跑完后脚本会自动执行 `apply_material_analysis.py --in-place` 回填 spec。然后复验：
```bash
cd C:/Users/developer/.agents/skills/img2threejs
PYTHONUTF8=1 python3 forge/stage2_spec/validate_sculpt_spec.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-sculpt-spec.json --strict-quality   # 期望退出码 0
```
**若 apply 后 colorMaterialRecipe 仍缺**：改用 `forge/stage1_intake/extract_part_color_recipe.py <crop> --component-id <id> --spec <spec> --in-place` 逐组件提取（区域裁剪图已生成在 `.img2threejs/hero-militia/material-regions/` 下，文件名带组件名）。
**注意**：analysis 状态可能仍为 `probe`（部分区域低置信度）——检查 `material-analysis.json` 各 region 的 `assignment.status`；`probe` 不阻断 `--allow-probe` 回填，但要抽看 2~3 个区域的 `referencePbr` 数值合理性（如 armband 应偏红 #FF5A4D 附近）。

### T2 · 步骤 7：锁定 Pass 构建（最大工作量）
按 03 篇步骤 7 表执行 blockout→structure→form→material 四 pass，产出 `js/hero_models/militia.js`（异步工厂 `buildHeroMilitia`，签名见 02 篇 3.3）。要点：连续头部体积（禁盒体拼接）、确定性生成（禁 Math.random）、红臂章仅 +X、胸挂前面板 ≤0.05m。每 pass 前 `orchestrate_passes.py status`，完成后 `sync --in-place`。

### T3 · 步骤 8：投影烘焙
先生成 bake 计划（`bake_projected_texture.py`，正/侧两路），烘焙经 Chrome Headless WebGL 执行（02 篇已确认方案），正侧合并为单张 `assets/textures/hero/militia-albedo.png`（2048²）。`--mesh-id` 需与工厂网格 id 一致（`militia_hero_mesh`）。

### T4 · 步骤 9：评审循环
turntable 四视角截图 + `self_intersection` + `attachment_anchor` + 对比表 + AI 视觉打分；修正上限 3/pass、6 total；记录归档 `docs/model-optimization/reviews/militia-review-pass<N>.md`。

### T5 · 步骤 10：rig 轨道（R0~R6）
先读 `C:/Users/developer/.agents/skills/img2-character/reference/animation-contract.md`。骨架=程序化 `common-rig.js` 字典（权威 joint order）；hard rules 见 03 篇 10.1（恒等绑定、updateMatrixWorld 先于 Skeleton、冻结后只准 ADD 等 6 条）。剪辑 idle/walk/aim（death 可选）。门禁按分层口径执行。

### T6 · 步骤 11：demo 页集成
升级 `demo-militia.html` + `js/demo/militia-demo.js`：模型源切 hero_models、AnimationMixer crossfade 0.28s、PMREM Neutral Studio（05 篇步骤 5 方案 B）、分解=静态 T-pose 部件陈列、自检含 G1 顶点位移断路器（05 篇步骤 8）、保留 `DEMO_OK` 契约与 URL 参数、新增 `?hero=0` 降级。

## 6. 工作区文件状态（`.img2threejs/hero-militia/`）

| 文件 | 状态 |
|---|---|
| `state.json` | ✅ 已 init（profile=animated-character） |
| `probe.json` / `detail-inventory.json` / `zones/` | ✅ |
| `assessment.json` | ✅（anatomy 已回填实测值） |
| `militia-anatomy.json` / `militia-landmarks.png` | ✅ |
| `camera-front.json` / `camera-side.json` | ✅ |
| `delight-front.png` / `delight-side.png` + reports | ✅（置信度偏差已记录） |
| `militia-sculpt-spec.json` | 🔶 待 T1 清零校验 |
| `material-regions.json` / `material-analysis.json` / `material-regions/` | 🔶 第二轮仍是 probe（脚本 bug 已修，待重跑） |
| `crop_views.py` / `fill_anatomy.py` / `refine_spec*.py` / `extract_materials.py` | 工作区工具脚本，可复跑 |
| `tmp/` | delight 参数试拍临时产物，可删 |

## 7. 教训与坑（避免重蹈）

1. **子代理派发曾整批 403**（"Verify your account"）：第三轮 swarm 全挂，后由主会话直接完成。若再派发先单点试探。
2. `delight_albedo.py` 输出参数是 `--out <path>`（不是位置参数）。
3. Windows 下 Python 不接受 Git Bash 的 `/tmp` 路径——用工作区 `tmp/`。
4. `validate_sculpt_spec.py --strict-quality` 极其严格但错误信息精确 actionable；attachment 需 `parentSocket/localStart/localEnd/contactType/overlap/gapTolerance` 全套。
5. 材质分析流水线必须给 manifest 区域提供注册表 `materialId`（如 `fabric.woven-matte`），且注意脚本是否重写 manifest。
6. 插件约定 **left=+X**（与游戏低模相反），红臂章在 hero 模型局部 +X。
7. `pip install` 会撞 PEP 668；forge 零依赖，无需装包。

## 8. 恢复实施的方式

- 会话目标（goal）当前为**暂停**状态，目标内容：完成 Phase 0（已达成）+ Phase 1a militia 交付（03 篇验收清单全过、demo 页 DEMO_OK）。
- 恢复：对 Kimi Code 说"继续实施"或使用 `/goal resume`；接手者从 **§5 T1** 开始。
- Git 提示：本阶段新增/修改均未提交（docs/plan、`.img2threejs/hero-militia/`、`assets/concepts/militia-front|side.png`、`assets/textures/hero/` 空目录）。提交粒度见 02 篇 3.8 节，建议 T1 通过后做一次 `feat(spec)` 提交。
