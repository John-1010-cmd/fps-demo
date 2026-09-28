# 潜伏者·沙漠民兵（Militia）英雄版实施计划

> **文档定位**：本文档属于 `fps-demo` 模型精细化优化实施规划集，编号 `03`。作为 Phase 1 试点角色，本文档详细规划从参考图到高质量可动画英雄模型的完整 11 步工程落地流程。后续 SWAT 实施计划（`04-hero-swat.md`）将复用本篇确立的标准范式。

---

## 1. 目标与范围

### 1.1 核心目标
- **展示级英雄模型构建**：以设计原画 `assets/concepts/militia-v3.png` 为唯一输入基准，借助 `img2threejs` 官方 forge 完整工具链与 `animated-character` profile，为潜伏者·沙漠民兵全新构建高精度、带真实骨骼与蒙皮动画的英雄版模型。
- **独立展示 Demo 升级**：产出独立模型工程序列 `js/hero_models/militia.js`，升级 `demo-militia.html`，以基于物理的渲染（MeshStandardMaterial + ACESFilmic 色调映射 + 影棚光照）和 `AnimationMixer` 动作剪辑，对标官方 demo（sora 角色）的展示质感。
- **全流程试点验证**：跑通 Python 3.10+ 环境下的多角度投影烘焙、去光照（delight）、几何冻结、测地线蒙皮（geodesic skinning）与 12 项 Rig Gates 校验，固化执行参数。

### 1.2 边界与范围
- **包含**：
  - 参考图 intake、双视图裁剪、探测与细节清单（9 个区域分块）；
  - 解剖比例与 Landmark 捕获（7.5 HU 比例基准）；
  - 双相机位姿估计与参考图去光照（Delight）；
  - Spec 规格编制（锁定 5 项 Critical 身份特征）与严格质量校验；
  - 4 个锁定构建 Pass（Blockout → Structure → Form → Material）；
  - 投影贴图烘焙与 UV 合并；
  - 4 视角转盘审查与有界修正循环（3次/pass，上限6次）；
  - 骨骼装配（Stage R 9步法）、动作设计（Idle / Walk / Aim）与 12 门 Rig Gates；
  - Demo 页渲染栈与控制面板集成。
- **不包含**：
  - 游戏运行时低模替换：现有 `js/soldier_models/militia.js` 及其 `syncMesh` 接口严格保持不变，英雄模型仅在 `demo-militia.html` 加载。
  - 独立超精细武器拆分：AK-47 在本阶段作为角色随附武器一体化构建，其独立拆分英雄版与展台属于 Phase 2（`06-phase2-weapons.md`）。

---

## 2. 前置依赖

| 依赖项 | 对应文档 / 资产路径 | 状态要求与判定标准 |
|---|---|---|
| 环境准备 | `docs/model-optimization/plan/01-environment-setup.md` | Python 3.10+ 可用，`img2 doctor` 报告 `animated-character` profile 注册成功，测试套件全部通过 |
| 流水线规范 | `docs/model-optimization/plan/02-pipeline-conventions.md` | 工作区路径约定、状态机门禁规则、坐标系（左=+X，前=-Z）与评审落盘规范已明确 |
| 输入原画 | `assets/concepts/militia-v3.png` | 分辨率 1312×1199，包含正视与右侧视双视角，图像完整无缺损 |
| 历史规格 | `.img2threejs/spec-militia.md` | 5 大身份特征清单、关键比例和材质色彩基准定义 |
| 本地服务器 | `http://localhost:8080` | 用户常驻服务正常响应，不重启、不杀进程 |

---

## 3. 详细实施步骤

### 步骤 1：输入确认与身份特征固化
1. **原画核验**：使用图像读取工具确认 `assets/concepts/militia-v3.png`。该图左侧为标准正视立姿，右侧为朝向右方的 90° 侧视立姿，具有高对比度低多边形切面、中东战术民兵装束。
2. **身份特征清单继承与固化**：
   - **Critical 特征（≤5 条，不可妥协）**：
     1. `shemagh-wrap-pattern`：深橄榄黑 × 浅卡其棋盘格头巾，全包头顶与额头，两侧垂布贴脸，下巴围裹，后脑宽平尾布垂至肩胛骨高度。
     2. `face-mask-eye-band`：深橄榄绿面罩遮口鼻颈，露出细窄眼部肤色条带及深色眼线。
     3. `red-armband-left`：左上臂（-X 轴方向）单侧环绕鲜艳红色宽布臂章（潜伏者专属身份标识，严禁镜像到右臂）。
     4. `chest-rig-magazines`：橄榄绿战术胸挂前面板横排 4 联弹匣袋，袋口露出黑色弹匣端头，配黑色 H 型肩带与扣具。
     5. `ak47-rifle-stance`：双手持握经典 AK-47（橙棕木质枪托/护木/握把 + 深黑机匣 + 弧形弹匣），枪口指向 -Z。
   - **Important 特征**：
     6. 卡其长袖衬衫卷袖，露出浅色袖口折边（cuff）与小臂肤色。
     7. 橄榄绿工装裤大腿外侧带盖立体 cargo 口袋。
     8. 棕褐色高帮登山靴配深色凸纹厚底。
     9. 黑色战术露指手套（手背配浅卡其补强贴块，指根露肤）。
     10. 衬衫长下摆罩过胯部上沿。
3. **验收标准**：特征清单全量同步到工作区元数据中，无遗漏项。

---

### 步骤 2：Intake 阶段（双视图裁剪、探测与细节清单）
1. **双视图裁剪**：从原始复合参考图切出正视与侧视两路独立参考图，存入工作区：
   - 正面裁剪：`assets/concepts/militia-front.png`（归一化区域：x 0.05~0.55, y 0.0~1.0）
   - 侧面裁剪：`assets/concepts/militia-side.png`（归一化区域：x 0.55~0.95, y 0.0~1.0）
2. **执行图像探测（probe_image）**：
   - **执行路径**：`C:/Users/developer/.agents/skills/img2threejs`
   - **执行命令**：
     ```bash
     python3 forge/stage1_intake/probe_image.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/probe.json
     # Windows 回退命令:
     py -3 forge/stage1_intake/probe_image.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/probe.json
     ```
   - **产出文件**：`.img2threejs/hero-militia/probe.json`
   - **验证标准**：`technicalSuitability` 字段为 `"pass"`，分辨率 ≥ 1024，无极端宽高比阻断。
3. **扫描 3×3 细节网格（build_detail_inventory）**：
   - **执行路径**：`C:/Users/developer/.agents/skills/img2threejs`
   - **执行命令**：
     ```bash
     python3 forge/stage1_intake/build_detail_inventory.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --mode grid-3x3 --complexity complex --out-dir C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/zones --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/detail-inventory.json --force
     # Windows 回退命令:
     py -3 forge/stage1_intake/build_detail_inventory.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --mode grid-3x3 --complexity complex --out-dir C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/zones --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/detail-inventory.json --force
     ```
   - **产出文件**：`.img2threejs/hero-militia/zones/`（9 个局部裁剪 PNG）、`.img2threejs/hero-militia/detail-inventory.json`
   - **验证标准**：提取并填补不少于 10 项细部特征存根，每项均绑定到具体的部件及材质重载属性。

---

### 步骤 3：Pre-spec Assessment（复杂度定级与角色路由）
1. **复杂度评估**：
   - 定级为 `complex`（多层战术披挂、胸前 4 联立体包具、非对称红臂章、卷袖与露指手套、骨骼蒙皮动画要求）。
   - 面数预算（分层口径，权威总表见 `02-pipeline-conventions.md` 3.4 节）：角色本体 `targetTriangles` ≤ 15,000 三角面；完整合计（本体+装具+随附 AK-47）≤ 28,000 三角面。
2. **角色路由选择**：
   - 严格执行 `grimoire/character/reconstruction.md` 规范：结构分解（Parts）→ 头部基底（Head）→ 头巾包覆层（Hair/Wrap）。
   - 比例系统锁定：写实风格 7.5 头身（Head-Units, HU），总高标准定义为 1.75m。
3. **执行命令**：
   ```bash
   python3 forge/stage2_spec/new_pre_spec_assessment.py "MilitiaHero" --image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --complexity complex --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/assessment.json --force
   # Windows 回退:
   py -3 forge/stage2_spec/new_pre_spec_assessment.py "MilitiaHero" --image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --complexity complex --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/assessment.json --force
   ```
4. **产出与验证**：`.img2threejs/hero-militia/assessment.json` 写入，`objectClass.primaryDomain` 确认为 `"character"`，`qualityContract` 完备。

---

### 步骤 4：Landmark 捕获与解剖数据填充
1. **生成解剖引导网格与提取骨架关键点**：
   - **执行命令**：
     ```bash
     python3 forge/stage1_intake/extract_landmarks.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-front.png --style-heads 7.5 --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-anatomy.json --overlay C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-landmarks.png --force
     # Windows 回退:
     py -3 forge/stage1_intake/extract_landmarks.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-front.png --style-heads 7.5 --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-anatomy.json --overlay C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-landmarks.png --force
     ```
2. **MediaPipe 适配器启用判定准则**：
   - **条件评估**：Militia 佩戴深色面罩包裹全下半脸，头巾压低至眉毛上方，仅露狭窄眼缝。通用人脸识别网格（Face Mesh）极易丢失或产生畸变。
   - **执行分支**：
     - 若安装了 MediaPipe，尝试运行 `run_vision_adapter.py landmarks`；
     - 若人脸特征点置信度 `< 0.60`，**果断回退**至人工视觉校准：直接在生成的 `militia-landmarks.png` 引导线图上量取眼线（eyeLine ≈ 0.52）、头顶（crown）、肩线（shoulderY ≈ 0.78）、髋部（hipY ≈ 0.47）和膝踝位置，回填至 `assessment.json` 的 `anatomy` 结构块中。
3. **验证标准**：`assessment.json` 中 `anatomy.applies = true` 且关键比例参数全部具备测量证据支撑。

---

### 步骤 5：投影准备（双相机位姿估计与去光照）
1. **双相机位姿估计（solve_camera_pose）**：
   - 分别对正面和侧面视图求解相机视场与观察位姿：
     ```bash
     # 正视相机求解
     python3 forge/stage1_intake/solve_camera_pose.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-front.png --fov-degrees 36 --yaw 0 --pitch 2 --distance 3.6 --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/camera-front.json
     # 侧视相机求解（右侧视，Yaw 约 90°）
     python3 forge/stage1_intake/solve_camera_pose.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-side.png --fov-degrees 36 --yaw 90 --pitch 2 --distance 3.6 --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/camera-side.json
     ```
2. **参考图去光照（delight_albedo）**：
   - **硬性约束**：原画自带前上方直射光与右侧面冷光，未去光照直接投影会导致阴影和高光被永久烘死在漫反射贴图上，破坏 PBR 动态光影。必须先行去光照。
   - **执行命令**：
     ```bash
     # 正面去光照
     python3 forge/stage1_intake/delight_albedo.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-front.png --strength 0.60 --report C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-front-report.json C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-front.png
     # 侧面去光照
     python3 forge/stage1_intake/delight_albedo.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-side.png --strength 0.60 --report C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-side-report.json C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-side.png
     ```
   - **验证标准**：生成的报告中 `confidence ≥ 0.70`，人工核对图片确保面部明暗交界线被均匀拉平且无反相黑边。

---

### 步骤 6：Spec 编制与严格校验（animated-character Profile）
1. **初始化流水线状态并生成 Spec 基础框架**：
   ```bash
   python3 forge/state.py init --state C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/state.json --reference C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --profile animated-character --spec C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-sculpt-spec.json
   python3 forge/stage2_spec/new_sculpt_spec.py "MilitiaHero" --image C:/hzc/GitRepo/John-1010-cmd/fps-demo/assets/concepts/militia-v3.png --assessment C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/assessment.json --domain animated-character --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-sculpt-spec.json --force
   ```
2. **人工细化 Spec 内容**：
   - 替换泛型 `featureReviewTargets` 为步骤 1 固化的 5 项真实特征。
   - 拓扑分类：明确标记头巾与面罩为连续外壳（`shell`），身体为分段流线几何体，严禁声明为独立立方体堆叠（box soup）。
   - 明确声明左臂红臂章的不对称属性（`chirality.asymmetric = true`，附着于 `arm.l`，坐标在 -X 侧）。
3. **严格质量校验**：
   ```bash
   python3 forge/stage2_spec/validate_sculpt_spec.py C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/militia-sculpt-spec.json --strict-quality
   ```
   - **验证标准**：通过校验，退出码为 0，无任何降级错误。

---

### 步骤 7：锁定 Pass 构建（四 Pass 递进与连续头部体积重构）
代码实现落地于 `js/hero_models/militia.js`，按官方规范实施四个锁定构建阶段：

| 构建阶段 | 目标与实现内容 | 拓扑要求与完成判定 |
|---|---|---|
| **Pass 1: Blockout** | 建立 7.5 HU 比例骨架空间与整体体积；确立面向 -Z、左=+X 坐标系 | **重点突破**：头部采用连续网格（平滑截顶蛋形或雕刻球体多边形）打底，彻底废除盒子拼头；躯干四肢比例定型 |
| **Pass 2: Structure** | 细分层叠结构：胸挂基座、4 联弹匣包槽位、卷袖袖口、工装裤双侧口袋、登山靴大底分层 | 部件包含明确的装配父子关系，允许独立解构与爆炸展开（Explode） |
| **Pass 3: Form** | 细节轮廓流线化：头巾折叠皱褶、面罩贴合边缘、露指手套指节、AK-47 枪身与弧形弯弹匣 | 经 `joint_loops.py` 检查各关节弯曲处具备足够经纬回环，无几何悬空 |
| **Pass 4: Material** | 全面升级为 `MeshStandardMaterial`，配置粗糙度/金属度通道与投影贴图挂载槽 | 满足 PBR 渲染管线，贴图通道绑定完成 |

- **门禁控制**：每个 Pass 开始前执行 `orchestrate_passes.py status`，完成后经评审执行 `sync --in-place`。

---

### 步骤 8：投影烘焙（双路烘焙合并 UV）
1. **生成投影烘焙计划文件**：
   ```bash
   # 正面投影计划
   python3 forge/stage3_build/bake_projected_texture.py --reference-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-front.png --camera C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/camera-front.json --mesh-id militia_hero_mesh --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/bake-plan-front.json
   # 侧面投影计划
   python3 forge/stage3_build/bake_projected_texture.py --reference-image C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/delight-side.png --camera C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/camera-side.json --mesh-id militia_hero_mesh --out C:/hzc/GitRepo/John-1010-cmd/fps-demo/.img2threejs/hero-militia/bake-plan-side.json
   ```
2. **投影贴图产物生成、离线合并与落盘**：
   - 正面投影重点覆盖：棋盘格头巾正面、面罩眼缝、胸挂正面 4 联弹匣袋、躯干与双腿前侧。
   - 侧面投影重点补充：右臂卷袖、头巾侧垂布、胸挂侧袋、靴子侧面轮廓。
   - 离线合并执行策略（【已确认 2026-09-27】）：正侧两路投影在离线预构建阶段合并烘焙为单张 2048×2048 贴图，在 Three.js 材质中统一通过单个贴图通道加载，减少运行时显存和绘制调用。
   - 产出纹理文件：
     - 最终交付贴图：`assets/textures/hero/militia-albedo.png`（2048×2048，单贴图通道加载）
     - 过程烘焙贴图：`assets/textures/hero/militia-albedo-front.png`、`assets/textures/hero/militia-albedo-side.png`
3. **验证标准**：最终合并贴图 `militia-albedo.png` 在 UV 接缝处过渡平滑，无拉伸黑缝；不可见区域（如腋下、背板深处）具备合理的调色板扩散底色（palette-continue）。

---

### 步骤 9：评审循环与自纠错（有界修正）
1. **四视角 Turntable 捕获与门禁**：
   - 捕获 0°（正）、90°（右）、180°（背）、270°（左）渲染截图至 `shots/` 目录；
   - 运行离轴门禁：
     ```bash
     python3 forge/stage4_review/turntable_gate.py --capture 0=shots/militia-pass-front.png --capture 90=shots/militia-pass-right.png --capture 180=shots/militia-pass-rear.png --capture 270=shots/militia-pass-left.png --json
     ```
   - 验证无异常离轴孔洞（hole detection pass）。
2. **几何交叉与装配检测**：
   - 导出运行时网格：`node runtime/scripts/export_mesh_geometry.mjs --url http://localhost:8080/demo-militia.html --out .img2threejs/hero-militia/meshes.json`
   - 自穿插检测：`python3 forge/stage4_review/self_intersection.py .img2threejs/hero-militia/meshes.json --json`
   - 挂载检测：`python3 forge/stage4_review/attachment_anchor.py .img2threejs/hero-militia/militia-sculpt-spec.json --json`
3. **AI 视觉比对与有界修正记录**：
   - 合成比对表：
     ```bash
     python3 forge/stage4_review/make_comparison_sheet.py --reference assets/concepts/militia-v3.png --render shots/militia-pass-front.png --out shots/cmp-militia.png --json
     ```
   - 执行 `append_review.py`，评审记录追加至 `docs/model-optimization/review-militia.md`。
   - **严格执行有界修正限制**：每个 pass 最多修正 3 次，全流程最多 6 次。若达到上限仍未达标，触发硬停止（Stop），报告原因供决策。

---

### 步骤 10：Rig 轨道与 12 项 Rig Gate（animated-character Stage R）

> **必读准则**：动工前严格核对 `C:/Users/developer/.agents/skills/img2-character/reference/animation-contract.md`。

#### 10.1 核心不可违反原则（Hard Rules）
1. **从权威骨骼字典读取**：本项目骨架为纯程序化生成，以 `js/hero_models/common-rig.js` 中固化的标准 Humanoid 骨骼字典（对齐 UniRig 命名）为唯一权威 joint order——即插件契约 `skin.joints` 概念在本项目的等价物（见 `00-master-plan.md` 决策记录 1），不引入外部 GLB，不得自行更改关节数组顺序。
2. **先修复、后冻结，冻结后只准 ADD**：几何经修复并通过 `mesh_parity.py` 冻结后，Rigging 阶段仅被允许向顶点流中增量添加 `skeleton`, `skinIndex`, `skinWeight`。若顶点位置或 UV 改变导致 parity 失败，必须撤销重做，严禁重新冻结作弊。
3. **Attached 绑定模式强制 Identity 绑定**：`mesh.bind(skeleton, new THREE.Matrix4())`。严禁在绑定矩阵中累加 Armature 变换，否则双重计数产生画面崩塌。
4. **Display Offset 仅从网格包围盒计算**：显示偏移量直接取 `(-center.x, -min.y, -center.z)` 确保双脚着地，严禁附加 Armature 平移。
5. **构建顺序严格保障**：必须 `updateMatrixWorld(true)` 先行，之后才能执行 `new THREE.Skeleton`；否则逆矩阵捕获单位矩阵，模型将呈现僵死形变。
6. **未测量的检查绝不算通过**：缺少 producer 的检查项如实记录为 `unevaluated`。

#### 10.2 Stage R 9 步实施流程
- **R0（骨架摄取与节点分类）**：区分变形关节（Deform Joints）与技术节点（Technical Nodes），仅将 `skin.joints` 中的节点构建为 `THREE.Bone`。运行 `validate_rig_payload.py`。
- **R1（绑定空间设定）**：执行 Identity 绑定，校验 G1 门禁（`maxSampledBindingDelta ≤ 2^-23`），确认动画指令真正能到达每个骨骼节点。
- **R2（测地线蒙皮与权重调和）**：
  - 调用 `geodesic_skinning.py` 计算内部测地线距离权重，防止手臂与躯干由于空间贴近而发生空隙穿透串扰；
  - 调用 `skin_conditioning.py` 进行重叠缝隙权重混合（设定搜索半径 `R = 0.006H`），坦诚权衡微小褶皱换取背景不漏光缝隙。
- **R3（剪辑特征识别与命名）**：使用 `clip_features.py`，根据运动速度、根骨骼位移比率与 `poseReturn ≤ 0.5°` 判定动作类型与循环性。
- **R4（动作设计 action_design）**：
  - 核心剪辑目标：
    1. `idle`：待机呼吸起伏（`travel < 0.02H, rise < 0.02H`），带头部微动与胸腔轻微起伏；
    2. `walk`：行进步态（`0.30H/s ≤ speed < 0.60H/s`），反向摆臂摆腿，满足 `footSlide ≤ 0.01H`（支撑脚防滑步约束）；
    3. `aim`：平举 AK-47 战术瞄准姿态，双臂内收托枪，身体微收腹屈膝；
    4. `death`（进阶可选目标）：中弹倒地后姿态静止（【已确认 2026-09-27】：`idle`、`walk`、`aim` 三剪辑为必选交付范围；`death` 作为进阶可选目标，在核心 3 动作通过 12 门 Rig Gates 后按余量推进，详见第 8 节决策记录）。
- **R5（运行时装配）**：控制器封装（`play`, `stop`, `seek`, `advance`），确保切换动画前恢复绑定姿态，避免姿态残留污染。
- **R6（12 项 Rig Gates 全检）**：生成 `.img2threejs/hero-militia/rig-gate-payload.json`，运行检查套件，记录 G1~G10 及扩展门禁结果。

---

### 步骤 11：Demo 页集成与衔接点
本步骤聚焦 Militia 专属接入，全局渲染栈升级细节遵循 `05-demo-integration.md`：
1. **模型源替换**：将 `demo-militia.html` 中的模型构建入口替换为 `js/hero_models/militia.js` 的 `await buildHeroMilitia({ teamColor: TEAM.B.color })`（异步工厂，签名与返回结构以 `02-pipeline-conventions.md` 3.3 节为准）。
2. **动画系统切换**：
   - 彻底移除原有在 `animate()` 中通过数学正弦波手工调整 `arms.rotation.x` 和 `legL.rotation.x` 的逻辑；
   - 接入 Three.js 原生 `THREE.AnimationMixer` 与各动作剪辑，UI 控制坞的“待机/行走/瞄准”按钮绑定到对应 Action 的平滑渐变切换（CrossFade）。
3. **解构视图（Explode）改造**：
   - 全局统一采用【静态 T-pose 部件分解陈列】方案（【已确认 2026-09-27】，对齐 `05-demo-integration.md` 方案 B）：触发分解时动画平滑暂停、模型归位标准 T-pose 姿态，独立装具（棋盘格头巾外层、胸挂前面板与 4 联弹匣袋、卷袖折边、工装口袋、随附 AK-47 等）按规划向量向外平移展开，复位后恢复动画播放；连续蒙皮本体不做骨骼位移拉扯，避免蒙皮网格发生拉扯破皮撕裂。
4. **无头自动化验证契约**：
   - 保留前 5 帧正常渲染后更新 `document.title = 'DEMO_OK'` 的机制，确保 Chrome 无头验证能够稳定检出。

---

## 4. Militia 特有难点与技术对策

| 特有技术难点 | 形成原因与风险表现 | 针对性技术解决方案 |
|---|---|---|
| **1. 头巾棋盘格图案投影对位与接缝** | 棋盘格具有高频、规整的几何纹理特征。正视与侧视两路投影在耳际与后枕部过渡处极易发生错位、拉伸或断纹，导致第一视觉焦点穿帮 | ① 头巾采用连续壳体展开，主 UV 图集分配高分辨率保护区；<br>② 正侧投影重叠带采用渐变权重点云融合；<br>③ 后枕部背光非直视区，使用程序化 Canvas 棋盘格贴图进行对称性纹理对齐与缝合。 |
| **2. 面罩眼部狭窄肤色带与眼线** | 眼部露肤区域垂直高度仅约 5cm，被面罩与头巾紧密夹持。多边形拓扑若不工整，烘焙投影易产生颜色溢出污染 | 在头部基底模型上划定专用的眼眶经纬环线（Eye-Loop），设置独立的 `localOverrides` 材质属性，保证眼线对比度和肤色边缘锐利，不被面罩深绿色晕染。 |
| **3. 红色宽臂章单侧绝对性校验** | 传统对称建模常使用 `(-x, y, z)` 自动生成双侧四肢。若发生对称镜像，右臂会出现违背原画的红袖章 | ① Spec 中明确将左臂红臂章标记为单侧独立挂载件（`chirality.asymmetric = true`，挂载点为 `arm.l`，位于 -X 侧）；<br>② 在装配校验阶段通过 `CHARACTER_LEFT_SIGN` 硬性比对，右臂只保留卷袖折边，杜绝臂章右移或双侧存在。 |
| **4. 双手持枪姿态与战术胸挂 4 联弹匣包的空间穿插** | 射击姿势下，左手前伸托护木、右手内收握握把，两臂与胸前凸出的 4 联弹匣袋空间极为狭窄，动画摆动极易发生模型穿插 | ① 通过 `pairwise_penetration.py` 设定胸挂与小臂的白名单容差；<br>② 适当压薄胸挂前面板厚度（控制在 0.05m 内），弹匣袋向外做 3° 倒角倾斜，为右臂内收留出解剖运动安全通道。 |

---

## 5. 产出物清单

### 5.1 规划与元数据产物
- `.img2threejs/hero-militia/state.json`：流水线步骤跟踪权威状态机文件
- `.img2threejs/hero-militia/probe.json`：输入原画尺寸与技术有效性报告
- `.img2threejs/hero-militia/detail-inventory.json`：9 分块区域细节清单
- `.img2threejs/hero-militia/assessment.json`：复杂度定级与 7.5 HU 解剖结构骨架
- `.img2threejs/hero-militia/camera-front.json`、`camera-side.json`：正视与侧视估计相机
- `.img2threejs/hero-militia/militia-sculpt-spec.json`：最终经过严格质量验证的雕刻规范

### 5.2 模型与纹理资产
- `js/hero_models/militia.js`：潜伏者民兵英雄模型独立工厂源码（纯 JS ES Module，包含骨架定义与蒙皮网格创建）
- `assets/textures/hero/militia-albedo.png`：正侧两路投影离线合并漫反射贴图（2048×2048，单贴图通道加载）【已确认 2026-09-27】
- `assets/textures/hero/militia-albedo-front.png`、`assets/textures/hero/militia-albedo-side.png`：正侧两路过程投影贴图（离线合并源）

### 5.3 评审与验证报告
- `docs/model-optimization/review-militia.md`：4 视角评审、AI 视觉对比与修正循环台账
- `.img2threejs/hero-militia/rig-gate-payload.json`：12 门 Rig Gates 完整检验数据载荷包
- `shots/cmp-militia.png`：最终 Pass 与原画对比检视表

---

## 6. 验收标准清单

执行完成后，逐项复核以下验收标准：

- [ ] **输入与特征完整性**：
  - [ ] 5 项 Critical 身份特征（棋盘格头巾、深色面罩、左臂红袖章、4 联胸挂、AK-47）在最终模型中全部清晰可见且位置准确。
  - [ ] 红色臂章仅出现在左臂（-X 侧），右臂完全正常无色块残留。
- [ ] **几何与拓扑质量**：
  - [ ] 总面数控制在分层预算内：角色本体 ≤ 15,000 三角面，完整合计（本体+装具+随附 AK-47）≤ 28,000 三角面（权威总表见 `02-pipeline-conventions.md` 3.4 节）。
  - [ ] 头部为平滑连续曲面网格，无分离漂浮的盒体面片。
  - [ ] 经 `self_intersection.py` 检验无几何自穿插面。
- [ ] **纹理与渲染质感**：
  - [ ] 漫反射贴图完成正侧两路离线合并为单张 2048×2048 `militia-albedo.png` 并以单贴图通道加载，无原画残留阴影与高光光斑。
  - [ ] 头巾棋盘格纹理在正侧过渡处无明显断层或拉伸畸变。
  - [ ] 渲染材质全面接入 `MeshStandardMaterial`，光影符合 PBR 物理规律。
- [ ] **骨骼绑定与动画表现**：
  - [ ] G1 门禁（采样门，非阻断）：demo 页剪辑存在性 + 顶点位移自检通过；payload 如实记录 `maxSampledBindingDelta` 实测值或带原因的 `unevaluated`，无虚假挂载。
  - [ ] G4 门禁达成：所有顶点蒙皮权重归一化 `|1 − Σw| ≤ 2e-7`。
  - [ ] 行走动画（Walk）触地防滑步门禁通过：`footSlide ≤ 0.01H`。
  - [ ] AnimationMixer 成功播放 `idle`、`walk`、`aim` 剪辑，过渡无突跳。
- [ ] **Demo 集成与自动化验证**：
  - [ ] `demo-militia.html` 控制台无任何报错或未处理警告。
  - [ ] 渲染满 5 帧后设置 `document.title = 'DEMO_OK'`，Chrome 无头验证通过。

---

## 7. 风险与回退方案

| 潜在风险场景 | 影响程度 | 规避与回退应急预案 |
|---|---|---|
| **Python 环境命令执行受限** | 高 | ① 同时提供 `python3` 与 `py -3` 回退前缀；<br>② 若脚本存在未知路径依赖，优先使用相对路径并指定明确的 `cwd`；<br>③ 必要时手工维护 JSON Spec，保持数据与流水线一致。 |
| **正侧面投影在后脑产生明显重影与接缝** | 中 | 采用双路投影加权混合通道：正视相机负责 0°~60° 锥角，侧视相机负责 60°~120° 锥角，中间带使用余弦平滑过渡；若依然拉伸，后脑区域采用程序化 Canvas 纹理局部补全。 |
| **MediaPipe 在面罩人脸上解析崩溃** | 低 | 不阻塞流程，按步骤 4 确立的规程直接回退至基于 `extract_landmarks.py` 叠加图的人工解剖比例测量与赋值。 |
| **蒙皮在极值姿态下产生破面漏光（裂缝）** | 中 | 严格执行 Stage R2 的 `skin_conditioning.py` 邻近权重平滑（R = 0.006H），接受轻微褶皱（Crease）以彻底阻断穿透背景漏光的孔洞（Holes）。 |

---

## 8. 决策记录（2026-09-27 用户确认）

2026-09-27 用户已拍板审定，以下决策点全部采纳推荐方案执行；全局交互“分解视图”统一采用 `05-demo-integration.md` 方案 B（静态 T-pose 部件分解陈列）：

- [x] **决策项 1：AK-47 在角色英雄模型中的装配方式** 【已确认 2026-09-27】
  - **执行方案**：在 Phase 1 本阶段，militia 英雄模型随附一组满足展示级精度的一体化 AK-47（包含精细木纹、弧形弹匣与枪口准星护圈），挂载于右手骨骼节点；待 Phase 2 武器专题（`06-phase2-weapons.md`）完成后，通过标准化武器挂接点（Socket Anchor）热替换为独立高模。该方案确保 Phase 1 角色展示效果立即可用。
  - **备选方案（备选，未采纳）**：Phase 1 仅构建空手民兵模型，AK-47 暂缓装配，待 Phase 2 完成后再统一挂接。劣势是 Phase 1 验收时姿态缺乏视觉重心。
- [x] **决策项 2：动画剪辑集合的交付范围（Death 动作是否列入本期必选）** 【已确认 2026-09-27】
  - **执行方案**：本期必选交付 3 套核心循环动作——`idle`（待机呼吸）、`walk`（循环行进）、`aim`（举枪瞄准）；`death`（倒地死亡）因涉及地面布娃娃碰撞模拟或多段硬着陆骨骼关键帧，作为进阶可选目标，在核心 3 动作通过 12 门 Rig Gates 后按余量推进。
  - **备选方案（备选，未采纳）**：将 `death` 强制纳入本期必须交付范围。劣势是增加约 30% 的骨骼动作调试工作量，可能拉长试点周期。
- [x] **决策项 3：烘焙贴图文件的最终物理合并策略** 【已确认 2026-09-27】
  - **执行方案**：正侧两路投影在离线预构建阶段合并烘焙为单张 2048×2048 的 `assets/textures/hero/militia-albedo.png`，在 Three.js 材质中使用单个贴图通道加载，减少运行时显存和绘制调用。
  - **备选方案（备选，未采纳）**：保留 `militia-albedo-front.png` 与 `militia-albedo-side.png` 两张文件，在自定义着色器中依据顶点法线动态混合。劣势是增加着色器复杂度与 Demo 页维护负担。
