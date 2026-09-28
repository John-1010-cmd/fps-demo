# 环境准备与工具链验证计划（Environment Setup & Verification Plan）

> **文档版本**：v1.0.0  
> **编制日期**：2026-09-27  
> **对应规划**：`docs/model-optimization/plan/01-environment-setup.md`  
> **执行依据**：`docs/model-optimization/README.md` 与总规划 `00-master-plan.md`  
> **前置依赖**：无（本篇为全项目 Phase 0 基础设施首发篇）  
> **下游引用**：`00-master-plan.md`、`02-pipeline-conventions.md`、`03-hero-militia.md`、`04-hero-swat.md`

---

## 1. 目标与范围（Goals & Scope）

### 1.1 总体目标
为 fps-demo 模型精细化优化工程构建稳健、可重现、纯原生且零平台歧义的 Python 3.10+ 运行时环境，全面解锁官方 `img2threejs` forge 流水线（intake 分析、去光照投影烘焙、PBR 证据提取、确定性门禁及 Stage R 骨骼工具链）与 `img2-character` 动画插件。通过端到端的系统自检与单元测试套件，确立 Phase 0（里程碑 M0）就绪基线，杜绝因环境缺失引发的手工替代与质量打折。

### 1.2 范围定义
- **纳入范围**：
  1. Windows 环境下 Python 3.10+（采用复用本机 uv 缓存的 CPython 3.13.12）运行时的注册、环境配置与路径优先级对齐；
  2. `python3`、`py -3` 与 `python` 命令在 Windows Git Bash / CMD / PowerShell 中的统一步骤与回退规约（通过 `~/.local/bin` Shim 与 `~/.bashrc`）；
  3. `PYTHONUTF8=1` 核心环境变量配置（彻底根除 Windows 中文系统 CP936/GBK 导致的编码崩溃）；
  4. `img2threejs` base skill 的 forge 依赖核验与 1400+ 单元测试运行验证；
  5. `img2` 插件线控器体检（`img2 doctor`）与 `animated-character` profile 连通性测试；
  6. `img2-character` 插件自身 235 项测试套件运行、Windows CRLF 换行符哈希漂移定位与归零；
  7. （可选）本地视觉辅助适配器（MediaPipe / Depth Anything V2）按需启用判定标准与沙箱安装指导。
- **排除范围**：
  - 不修改游戏现有前端主代码（`js/soldier_models/`、`js/game.js` 等）；
  - 不篡改既有低模运行契约与服务器常驻端口（`http://localhost:8080`）；
  - 不进行英雄版模型的实际 spec 编写与网格构建（移交 `03-hero-militia.md` 与 `04-hero-swat.md`）。

### 1.3 核心设计原则
1. **最小侵入与标准库优先**：forge 流水线本身采用 100% Python 标准库实现（0 第三方 pip 库），最大限度降低环境污染。
2. **确定性与平台隔离**：明确区分 Windows 系统差异（路径反斜杠、符号链接特权、CRLF 换行符、GBK 编码），提供经过真实机测验证的绕行与消除方案。
3. **回退具备完全确定性**：所有执行命令均提供 `python3` 与 `py -3` 双轨语法，并附带针对代理受限、权限缺失的降级预案。

---

## 2. 前置依赖与环境基线（Prerequisites & Baseline）

### 2.1 文档依赖
- `docs/model-optimization/README.md`：核心四项已决决策（安装 Python 3.10+、分离重建、投影烘焙、骨骼动画）。
- `docs/model-optimization/plan/00-master-plan.md`：M0 里程碑准入与准出定义。
- `.img2threejs/STATE-NOTE.md`：前序无 Python 环境下的限制记录。

### 2.2 本机当前基线事实（实机探查核实）
- **操作系统**：Microsoft Windows 10/11 Pro (x64)
- **Shell 环境**：Git Bash（路径 `C:\Program Files\Git\bin\bash.exe`）
- **Node.js 运行时**：已安装 `v24.14.0`（位于 `/c/Program Files/nodejs`，全局可用）
- **包管理器 / Python 现状**：
  - 当前 PATH 暂未暴露全局 `python` / `python3` / `py`；
  - 本机已安装现代化包管理器 `uv`（版本 `0.10.12`，位于 `C:\Users\developer\.local\bin\uv.exe`）；
  - 本机用户缓存已下载独立的 CPython 运行时：
    - `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`（Python 3.13.12）
    - `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.14-windows-x86_64-none\python.exe`（Python 3.14.3）
- **Skill 物理路径**：
  - Base Skill：`C:/Users/developer/.agents/skills/img2threejs`
  - Character 插件：`C:/Users/developer/.agents/skills/img2-character`
  - img2 控制器缓存：`C:/Users/developer/.img2`（核心入口 `C:/Users/developer/.img2/harness/bin/img2.mjs`）

---

## 3. 详细实施步骤（Step-by-Step Execution）

```
[Step 1: Python 3.10+ 运行时安装/注册]
                 │
                 ▼
[Step 2: forge 零依赖核验与 pip 镜像配置]
                 │
                 ▼
[Step 3: Base Skill (img2threejs) 核心测试验证]
                 │
                 ▼
[Step 4: Character 插件注册与 Profile 连通性测试]
                 │
                 ▼
[Step 5: Character 插件 235 项测试与 CRLF 消除]
                 │
                 ▼
[Step 6: 可选视觉适配器 (MediaPipe/Depth) 评估]
```

---

### Step 1: 安装与配置 Python 3.10+ 运行时

#### 1.1 运行时启用与首选执行路径【已确认 2026-09-27：采纳方案 B】
执行路径已确定采纳**方案 B**（复用本机已有 uv CPython 3.13.12 运行时），实现零网络消耗秒级就绪；方案 A 与方案 C 保留作为回退备选记录。

##### 首选执行路径（已确认方案 B）：激活本机已有 uv Python 3.13.12
实机已存在 `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`，直接建立用户级 Shim 注入 PATH：
```bash
# 在 Git Bash 中为当前用户创建统一 shim 别名
mkdir -p "$HOME/.local/bin"
cat << 'EOF' > "$HOME/.local/bin/python3"
#!/bin/sh
exec "C:/Users/developer/AppData/Roaming/uv/python/cpython-3.13-windows-x86_64-none/python.exe" "$@"
EOF
chmod +x "$HOME/.local/bin/python3"
cp "$HOME/.local/bin/python3" "$HOME/.local/bin/python"
cp "$HOME/.local/bin/python3" "$HOME/.local/bin/py"
```

##### 方案 A（备选，未采纳）：通过 Windows winget 安装系统全局 Python 3.12
```powershell
# 在 PowerShell 或 CMD (管理员权限优先) 中执行：
winget install --id Python.Python.3.12 -e --source winget --override "/passive InstallAllUsers=1 PrependPath=1 Include_test=0"
```

##### 方案 C（备选，未采纳）：下载 Embeddable Zip 便携版
1. 从 `https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip` 下载；
2. 解压至 `C:\Python312`；
3. 将该目录追加至用户 `PATH` 环境变量。

#### 1.2 命令执行与 Windows 回退规约
后续文档及脚本全面遵循如下调用与回退规约：
- **首选命令**：`python3 <script.py> [args]`
- **第一备选（Windows 标准启动器）**：`py -3 <script.py> [args]`
- **第二备选（全局 python）**：`python <script.py> [args]`
- **绝对路径回退（保底）**：`"C:/Users/developer/AppData/Roaming/uv/python/cpython-3.13-windows-x86_64-none/python.exe" <script.py> [args]`

#### 1.3 核心环境配置：统一 PATH 与强制开启 UTF-8 模式【已确认 2026-09-27】
> **严重警告**：Windows 中文语言环境默认代码页为 CP936（GBK）。`img2threejs` 中的 spec JSON、拓扑分析及文档含大量 UTF-8 字符（如 `đ`、`—`、`✓`）。若不显式指定 UTF-8，Python 标准库 `read_text()` 会抛出 `UnicodeDecodeError: 'gbk' codec can't decode byte`，导致流水线全盘瘫痪！

必须在全局或用户环境设置 `PYTHONUTF8=1`，并在 Git Bash 中统一引入 Shim 路径：
```bash
# Git Bash 环境持久化配置（写入 ~/.bashrc，引入 ~/.local/bin 并开启 UTF-8）：
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
echo 'export PYTHONUTF8=1' >> ~/.bashrc
echo 'export PYTHONIOENCODING=utf-8' >> ~/.bashrc
source ~/.bashrc

# Windows 用户环境变量注册（PowerShell）：
[System.Environment]::SetEnvironmentVariable('PYTHONUTF8', '1', 'User')
[System.Environment]::SetEnvironmentVariable('PYTHONIOENCODING', 'utf-8', 'User')
```

#### 1.4 预期输出
运行环境探测命令：
```bash
python3 --version || py -3 --version
python3 -c "import sys; print('UTF-8 mode:', sys.flags.utf8_mode)"
```
**期望返回**：
```text
Python 3.12.x 或 Python 3.13.x (版本 >= 3.10.0)
UTF-8 mode: 1
```

#### 1.5 失败分支排查
- **现象**：`bash: python3: command not found`
  - **排查**：检查 `echo $PATH` 中是否包含 Python 安装目录或 `~/.local/bin`；执行 `hash -r` 刷新 Bash 命令缓存。
- **现象**：Windows 应用商店劫持弹出打开商店页面
  - **排查**：进入 Windows "设置" -> "应用执行别名"（Manage app execution aliases），关闭 `python.exe` 与 `python3.exe` 的 App Installer 别名。

#### 1.6 完成状态勾选
- [ ] Python 3.10+ 版本验证通过（输出符合预期）
- [ ] `PYTHONUTF8=1` 环境变量生效（`sys.flags.utf8_mode == 1`）
- [ ] `python3` 或 `py -3` 回退别名就绪

---

### Step 2: 验证并安装 forge 依赖

#### 2.1 依赖契约事实核验
首先查验 `C:/Users/developer/.agents/skills/img2threejs/forge/requirements.txt`：
```text
# Three.js Object Sculptor scripts have NO third-party dependencies.
# Everything uses the Python 3.10+ standard library only (json, argparse, struct,
# zlib, pathlib, math, subprocess). PNG maps and comparison sheets are written with
# struct/zlib directly — no Pillow/numpy/OpenCV/Playwright required.
# Requires: python >= 3.10
```
**技术事实**：forge 核心纯属 Python 3.10+ 标准库实现，**零第三方库强依赖**！PNG 编码直接基于 `struct` 与 `zlib` 二进制流生成，完全脱离 Pillow、OpenCV 或 NumPy。

#### 2.2 pip 依赖安装命令与环境校验
尽管为零第三方依赖，仍需执行 pip 校验确保标准库与基础打包环境完备：
```bash
# 验证 pip 可用性并检查依赖描述
python3 -m pip install -r "C:/Users/developer/.agents/skills/img2threejs/forge/requirements.txt" || \
py -3 -m pip install -r "C:/Users/developer/.agents/skills/img2threejs/forge/requirements.txt"
```

#### 2.3 网络受限与公司代理处理方案
若后续扩展插件或在受限网络环境下需要下载包，按如下命令配置国内合规镜像源：
```bash
# 配置清华大学 PyPI 镜像源
python3 -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 若存在企业网络代理，显式传入代理参数：
# export HTTP_PROXY="http://proxy.internal:8080"
# export HTTPS_PROXY="http://proxy.internal:8080"
```

#### 2.4 预期输出
```text
Requirement already satisfied: ... (或 0 installed, requirement clean)
```

#### 2.5 失败分支排查
- **现象**：`No module named pip`
  - **排查**：执行 `python3 -m ensurepip --upgrade` 安装基础 pip 套件。

#### 2.6 完成状态勾选
- [ ] `forge/requirements.txt` 读取与零依赖契约核准无误
- [ ] pip 环境可正常自省并完成扫描

---

### Step 3: 验证 Base Skill 核心流水线能力

#### 3.1 运行目录与测试命令
在开启 `PYTHONUTF8=1` 的前提下，进入 `img2threejs` 仓库运行单元测试集：
```bash
cd "C:/Users/developer/.agents/skills/img2threejs"

# 1. 运行核心流水线端到端测试（黄金通行套件）
PYTHONUTF8=1 python3 -m unittest forge/tests/test_pipeline.py || \
PYTHONUTF8=1 py -3 -m unittest forge/tests/test_pipeline.py

# 2. 运行 Stage R 骨骼蒙皮核心测试
PYTHONUTF8=1 python3 -m unittest forge/tests/test_geodesic_skinning.py forge/tests/test_rig_gates.py || \
PYTHONUTF8=1 py -3 -m unittest forge/tests/test_geodesic_skinning.py forge/tests/test_rig_gates.py
```

#### 3.2 预期输出指标与平台已知差异说明
- **核心套件通过指标**：
  - `test_pipeline.py`：**57/57 100% OK**（耗时约 30~35s），验证生成器、材质通道、去光照、颜色量化全流程闭环；
  - `test_geodesic_skinning.py` 与 `test_rig_gates.py`：**全部 OK**，验证骨骼权重分配与门禁逻辑完备。
- **全量测试（1416 项）在 Windows 下的平台预期差异说明**：
  若执行全量 `discover -s forge/tests`，实测耗时约 240s。由于 Windows 平台原生特性，允许存在如下 2 类已知平台偏离，**不属于功能缺陷**：
  1. `[WinError 1314] 客户端没有所需的特权`：Windows 下非管理员创建目录软链接受限（涉及 `test_search_specs.py` 的 3 个缓存测试）；
  2. `[WinError 2] 系统找不到指定的文件`：`test_emit_target.py` 中的 4 个子进程测试预期调用 POSIX `echo`，在 Windows 无宿主包装时报错。
- **准出判定**：只要核心流水线 `test_pipeline.py` 与 Stage R 套件全绿，即判定 Base Skill 核心就绪。

#### 3.3 预期输出样例
```text
.........................................................
----------------------------------------------------------------------
Ran 57 tests in 32.524s

OK
```

#### 3.4 失败分支排查
- **现象**：出现 `UnicodeDecodeError: 'gbk' codec can't decode...`
  - **排查**：未带 `PYTHONUTF8=1` 环境变量，请务必前置 `PYTHONUTF8=1 python3 ...`。

#### 3.5 完成状态勾选
- [ ] `test_pipeline.py` 57 项核心测试 100% PASS
- [ ] `test_geodesic_skinning.py` 与 `test_rig_gates.py` 骨骼测试 PASS
- [ ] 掌握 Windows 平台软链接与子进程已知差异，无异常阻断

---

### Step 4: 验证与配置 character 插件注册

#### 4.1 img2 命令行工具架构与调用方式
`img2` 是官方轻量级无依赖插件管理器（Node.js launcher + Python 核心）。
本机实机位置为：`C:/Users/developer/.img2/harness/bin/img2.mjs`。

为实现全局统一调用，执行配置 Wrapper 脚本并注入 `~/.local/bin/`【已确认 2026-09-27】：
```bash
# 在 Git Bash 中建立 img2 执行 shim
cat << 'EOF' > "$HOME/.local/bin/img2"
#!/bin/sh
exec node "C:/Users/developer/.img2/harness/bin/img2.mjs" "$@"
EOF
chmod +x "$HOME/.local/bin/img2"
```

#### 4.2 执行 img2 doctor 体检
```bash
img2 doctor || node "C:/Users/developer/.img2/harness/bin/img2.mjs" doctor
```
**预期输出**：
```text
WARN  character   multi-capability provider: declares 2 capabilities; each edge resolves independently via `img2 capabilities`
doctor: ok (4 plugin(s), 1 warning(s))
```
*(注：4 个已识别插件应包含 `cs2`、`character`、`img2glb`、`hello-cube`，状态报告 `doctor: ok`)*

#### 4.3 animated-character Profile 缺失时的恢复命令
若在非标准环境中 `img2 doctor` 提示 `character` 插件缺失，执行标准恢复命令：
```bash
img2 add img2threejs/plugin-character --ref v0.2.0
```

#### 4.4 状态机 state.py init 连通性测试
在临时目录测试状态机是否已正确识别 `animated-character` profile：
```bash
python3 "C:/Users/developer/.agents/skills/img2threejs/forge/state.py" init --help | grep "animated-character"
```
**期望输出**：
命令行选项的 `--profile` 参数列表中必须包含 `{generic,animated-character,character,cs2}`。

#### 4.5 失败分支排查
- **现象**：`img2 doctor` 报告 `no plugins.json found`
  - **排查**：确认 `C:/Users/developer/.img2/plugins.json` 是否存在。若损坏，以当前实机备份恢复版本格式（包含 `cs2`, `character` 等四项）。

#### 4.6 完成状态勾选
- [ ] `img2 doctor` 运行通过，报告 `doctor: ok` 且插件列表包含 `character`
- [ ] `state.py init --help` 中确认包含 `animated-character` profile 候选值

---

### Step 5: 验证 character 插件自身测试套件

#### 5.1 运行目录与测试命令
进入 `img2-character` 插件目录执行单元测试：
```bash
cd "C:/Users/developer/.agents/skills/img2-character"

PYTHONUTF8=1 python3 -m unittest discover -s tests || \
PYTHONUTF8=1 py -3 -m unittest discover -s tests
```

#### 5.2 预期输出指标与 235 项测试覆盖
- 运行测试总计 **235 tests**；
- 覆盖：`anim_action_design`、`anim_clip_features`、`anim_emit_runtime`、`rig_geodesic_skinning`、`gate_rigging`（G1~G10）、`rig_mesh_parity`；
- 功能性逻辑测试 **100% 通过**。

#### 5.3 Windows CRLF 换行符哈希漂移深度排查与归零方案
实测中可能会触发 1 项特定的文档哈希断言失败：
```text
FAIL: test_reference_docs_match_their_recorded_hashes
AssertionError: 'fc03f548... != 'c1c2c931...
: reference/animation-contract.md drifted; re-record deliberately
```
- **原因剖析**：Windows 下 Git 默认 `core.autocrlf=true` 将换行符检出为 `\r\n`，导致 SHA-256 哈希计算与 Linux/LF 基准（`c1c2c931...`）产生差异。
- **验证与消除指令**：
```bash
# 验证去除 \r 后哈希与官方基线完全一致：
tr -d '\r' < reference/animation-contract.md | sha256sum
# 输出必为：c1c2c931e602854b8dba696dd6d1b7779290ac5b86c9d96e2c24ab784b453118

# 消除漂移（针对该文件强制 LF 检出，不影响代码）：
git config core.autocrlf false
git checkout reference/animation-contract.md
```
重新执行测试后将达到全绿状态。

#### 5.4 失败分支排查
- **现象**：`ModuleNotFoundError: No module named 'tools'`
  - **排查**：确认当前位于 `img2-character` 根目录执行 `discover -s tests`，该插件自带 `_img2_local.py` 会将 `tools/` 注入 `sys.path`。

#### 5.5 完成状态勾选
- [ ] 235 项测试执行完毕，所有核心算法与动画剪辑逻辑验证通过
- [ ] 查明并消除换行符漂移问题，确认 `reference/animation-contract.md` 真实哈希合规

---

### Step 6: 可选视觉适配器配置（MediaPipe / Depth Anything V2）【已确认 2026-09-27：Phase 0 不安装，Phase 1 按需启用】

#### 6.1 启用判定标准（Strict Criteria）
遵循"**默认不装、按需引入、客观判定**"原则【已确认 2026-09-27】。在 Phase 0 中**明确不安装**该重型环境（其包含 PyTorch / HuggingFace 模型权重约 2~4GB），以维持环境精简；进入 Phase 1 后按需启用。

**进入 Phase 1 时，仅当满足以下任一条件才允许启用**：
1. **Anatomy 提取置信度低下**：在 Phase 1 `extract_landmarks.py` 执行后，角色正面/侧面关键骨相点（颅顶、双眼、肩线、股骨大转子）偏移超过角色身高的 5%（`>0.05H`），人工校准耗时过长；
2. **战术装具深度遮挡严重**：swat 特警战术背心与厚重防弹衣阻断了躯干厚度判断，单凭肉眼难以解算侧视相机焦距与投影姿态。

#### 6.2 安装与预拉取命令（仅当触发上述标准时执行）
使用 `uv` 隔离环境安装，不污染全局 Python：
```bash
cd "C:/Users/developer/.agents/skills/img2threejs"

# 1. 依托 uv 建立隔离的 Python 3.11 视觉环境
uv sync --project integrations/vision --python 3.11

# 2. 预先拉取预训练权重至 runtime/ 缓存
PYTHONUTF8=1 python3 forge/stage1_intake/run_vision_adapter.py prefetch
```

#### 6.3 适配器健康状态检查
```bash
PYTHONUTF8=1 python3 forge/stage1_intake/run_vision_adapter.py health
```
**预期输出**：
```text
adapter: sam2 [ok]
adapter: depth_anything_v2 [ok]
adapter: mediapipe_face [ok]
adapter: mediapipe_pose [ok]
health: ready
```

#### 6.4 失败分支排查与网络回退
- 若因境内网络无法连接 Hugging Face，系统自动回退至 `extract_landmarks.py` 内置的标准解剖网格（3x3 规则三等分线与标准头长比尺），依靠子智能体多视角人工视觉标注继续推进，不构成流程阻断。

#### 6.5 完成状态勾选
- [ ] 明确视觉适配器非阻断性准入标准（已确认 Phase 0 不安装，Phase 1 按需启用）
- [ ] 记录备用安装与健康检查指令

---

## 4. 产出物清单（Artifacts Manifest）

完成 Phase 0 环境准备后，系统中将形成如下受控资产与环境配置：

| 资产类型 | 物理路径 / 注册位置 | 规格与说明 | 状态与用途 |
|---|---|---|---|
| **Python 运行时** | `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe` | CPython 3.13.12 x64，集成标准库 | 全流水线解释执行器 |
| **执行别名 / Shim** | `~/.local/bin/python3`、`py`、`python` 与 `img2` | Bash / Shell 执行脚本包装（已引入 ~/.bashrc） | 统一跨平台调用入口 |
| **环境变量** | 用户级环境变量 `PYTHONUTF8=1` 与 `PYTHONIOENCODING=utf-8` | 强制标准 I/O 与文件读写为 UTF-8 | 杜绝 Windows 中文乱码 |
| **测试基准记录** | `docs/model-optimization/plan/01-environment-setup.md` | 本文档附录中的验收签字 | M0 准出证明 |

---

## 5. 决策记录（2026-09-27 用户确认）

2026-09-27 用户已拍板确认，全部采纳以下推荐方案作为确定性执行路径：

### 决策点 1：Python 3.10+ 安装方式定夺
- **已采纳方案**：**执行方案 B（复用本机 uv 缓存的 CPython 3.13.12）**。实机路径 `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`，直接创建 Shim 投入使用，耗时 < 5 秒，零网络下载，零管理员权限要求。
- **备选方案（备选，未采纳）**：通过 `winget` 或官方安装器安装系统全局 Python 3.12。
- **状态**：【已确认 2026-09-27】采纳方案 B

### 决策点 2：Git Bash 下命令调用统一方式
- **已采纳方案**：**在 `~/.local/bin/` 下建立 `python3`、`py` 与 `img2` 的执行 Shim 并引入 `~/.bashrc`**，保证 `~/.local/bin` 处于 PATH 首位。既不修改全局系统环境，又能彻底抹平跨平台与子进程调用差异。
- **备选方案（备选，未采纳）**：每次手动输入完整绝对路径或仅使用 `py -3`。
- **状态**：【已确认 2026-09-27】在 ~/.local/bin/ 建立 shim 并引入 ~/.bashrc

### 决策点 3：MediaPipe / Depth 视觉适配器安装时序
- **已采纳方案**：**Phase 0 不安装视觉扩展，保持环境最轻量；Phase 1 按需启用**。待进入 Phase 1 militia 试点阶段，若发现头巾与面部 landmark 提取确有困难且符合触发标准时，再按需通过 `uv sync` 一键拉取。
- **备选方案（备选，未采纳）**：在 Phase 0 一次性全部下载（需约 2~4GB 磁盘空间与外网连接）。
- **状态**：【已确认 2026-09-27】Phase 0 不安装，Phase 1 按需启用

---

## 6. 风险评估与应急回退机制（Risk & Fallback）

| 风险场景 | 影响评级 | 预防与排查措施 | 应急回退路径 |
|---|---|---|---|
| **Windows 默认代码页 (GBK) 冲突** | **高危** | 全局环境变量必须注入 `PYTHONUTF8=1`。在运行命令前置环境声明。 | 若脚本仍然报错，在调用时追加 `-X utf8` 参数：`python3 -X utf8 script.py`。 |
| **Git 换行符 CRLF 污染哈希** | **中危** | 涉及 SHA 校验与测试的文件（如 `reference/`、`tests/fixtures/`）禁用 CRLF 转换。 | 执行 `git config core.autocrlf false` 并用 `dos2unix` 或 `tr -d '\r'` 恢复文件纯 LF 状态。 |
| **网络受限无法拉取 pip / uv 包** | **中危** | forge 核心零依赖不依赖网络；扩展库配置国内合规 PyPI 镜像源。 | 回退至标准库纯离线流水线，解剖数据采用手工标注补充。 |
| **多版本 Python 路径冲突** | **低危** | 显式使用全路径 Shim，并在验证脚本中输出 `sys.executable` 确保单一事实。 | 在各阶段脚本中指明固定解释器绝对路径。 |

---

## 7. 环境就绪总验收清单（Final Sign-off Checklist）

> **阻断门（Blocking Gate G0）**：以下 8 项检查项全部打勾通过（`[x]`），方可正式宣告 Phase 0（里程碑 M0）达成，并获准启动 Phase 1（`03-hero-militia.md`）的研发工作！

| 检查项编号 | 验证目标 | 验证命令 / 检查依据 | 预期通过标准 | 验收状态 |
|---|---|---|---|---|
| **CHK-01** | Python 解释器就绪 | `python3 --version` 或 `py -3 --version` | 输出版本号 `>= 3.10.0` | [x] ✅ 2026-09-27 |
| **CHK-02** | UTF-8 运行时模式 | `python3 -c "import sys; print(sys.flags.utf8_mode)"` | 明确输出 `1` | [x] ✅ 2026-09-27 |
| **CHK-03** | forge 零第三方依赖核查 | 阅读查验 `forge/requirements.txt` | 确认仅依赖标准库，pip 检查无告警 | [x] ✅ 2026-09-27 |
| **CHK-04** | Base Skill 核心流水线 | `python3 -m unittest forge/tests/test_pipeline.py` | 57 项端到端流水线测试全部 PASS | [x] ✅ 2026-09-27 |
| **CHK-05** | Base Skill 骨骼算法门禁 | `python3 -m unittest forge/tests/test_geodesic_skinning.py` | 测地蒙皮算法单元测试全部 PASS | [x] ✅ 2026-09-27 |
| **CHK-06** | img2 插件线控器状态 | `img2 doctor` | 输出 `doctor: ok`，4 个插件识别正常 | [x] ✅ 2026-09-27 |
| **CHK-07** | animated-character 注册 | `python3 forge/state.py init --help` | profile 候选集包含 `animated-character` | [x] ✅ 2026-09-27 |
| **CHK-08** | Character 插件自测绿灯 | `python3 -m unittest discover -s tests` (in img2-character) | 235 项测试全量通过，无功能阻断 | [x] ✅ 2026-09-27 |

**验收结论**：`[x] 全部通过，正式准入 Phase 1`（2026-09-27 签署）~~`[ ] 未通过，阻断修复中`~~

---

## 8. 执行记录（2026-09-27 实机验收证据）

- **运行时**：`python3 --version` → `Python 3.13.12`（`C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`）；`sys.flags.utf8_mode = 1`。
- **Shim 与持久化**：`~/.local/bin/` 已建立 `python3` / `python` / `py` / `img2` 四个 shim；`~/.bashrc` 经 `$HOME/.local/bin/env` 注入 PATH，并追加 `PYTHONUTF8=1`、`PYTHONIOENCODING=utf-8`；Windows 用户级环境变量同名注册完成。
- **pip**：26.0.1 可用；`forge/requirements.txt` 确认纯标准库零依赖（注：该 uv Python 为 PEP 668 externally-managed，未来装包一律走 `uv sync` 沙箱，不用全局 pip）。
- **Base skill 测试**：`test_pipeline.py` 57/57 OK（19.2s）；`test_geodesic_skinning.py` + `test_rig_gates.py` 56/56 OK。
- **img2 doctor**：`doctor: ok (4 plugin(s), 1 warning(s))`（warning 为 character 多能力声明提示，非故障）；`state.py init --help` 确认 profile 含 `animated-character`。
- **character 插件测试**：235 项 OK（skipped=14 为平台/可选项预期跳过）。
- **CRLF 漂移处置**：`reference/animation-contract.md` 与 `reference/character-rigging-animation-1.5.2.md` 两份钉扎文档因 CRLF 检出导致哈希漂移，经 `tr -d '\r'` 验证去 CR 后与基线哈希（`c1c2c931…` / `fb1aa7c4…`）完全一致，已原地转为 LF 并在该仓库设置 `core.autocrlf false`；处置后测试全绿。
