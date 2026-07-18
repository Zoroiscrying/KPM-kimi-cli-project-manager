<p align="center">
  <img src="docs/images/icon.png" alt="Kimi CLI Project Manager 图标" width="96" />
</p>

<h1 align="center">Kimi CLI Project Manager</h1>

<p align="center">
  Kimi Code CLI 项目的桌面工作台 —— 多标签内嵌终端、会话自动恢复，<br/>
  让每个项目都只差一次点击。
</p>

<p align="center">
  <img src="docs/images/app-screenshot.png" alt="Kimi CLI Project Manager 截图" />
</p>

[English](README.md) | [中文](README.zh.md)

一个用于管理 [Kimi Code CLI](https://github.com/moonshotai/kimi-code) 项目的桌面应用。受 OpenAI Codex Desktop 启发，把项目列表、内嵌终端和会话管理整合到一个原生窗口里。

## 功能

- **项目管理**：添加、编辑、删除常用项目，支持从 Kimi CLI 历史自动导入。
- **多标签页终端**：每个项目在独立的内嵌终端中运行 Kimi CLI，切换标签页不会中断会话。
- **会话恢复**：打开项目时自动查找并恢复该项目的最近一次 Kimi 会话。
- **环境面板**：右侧展示项目详情、最近会话和常用工具（打开文件夹、复制路径）。
- **本地持久化**：项目列表和会话记录保存在本地 JSON 文件中。

## 界面布局

```
┌─────────────┬─────────────────────────────┬──────────────┐
│  项目列表   │      终端标签页             │   项目信息   │
│             │  ┌─────┬─────┬─────┐        │   最近会话   │
│  + Add      │  │ A   │ B   │ C × │        │   工具       │
│  Import     │  └─────┴─────┴─────┘        │              │
│  from Kimi  │                             │              │
│             │      内嵌 Kimi CLI          │              │
│             │                             │              │
└─────────────┴─────────────────────────────┴──────────────┘
```

## 安装

从 [Release 页面](https://github.com/Zoroiscrying/kimi-cli-project-manager/releases) 下载对应平台的安装包：

- Windows：`kimi-cli-project-manager_0.1.0_x64-setup.exe` 或 `.msi`

安装后运行 `Kimi CLI Project Manager`，首次启动会自动创建状态文件。

### 前提条件

- 已安装 [Kimi Code CLI](https://github.com/moonshotai/kimi-code) 并确保 `kimi` 命令在系统 PATH 中。
- Windows 需要 WebView2 运行时（Windows 10/11 通常已内置）。

## 使用说明

1. 点击左侧 **+ Add Project** 添加项目目录。
2. 或点击 **Import from Kimi** 自动导入 Kimi CLI 历史中使用过的项目。
3. 点击项目打开一个终端标签页，应用会自动启动 `kimi` 并尝试恢复该项目的历史会话。
4. 打开多个项目时，每个项目拥有独立的终端标签页，切换标签页不会关闭之前的 Kimi CLI。
5. 直接在终端里输入即可，所有按键都会原样转发给内嵌的 Kimi CLI。
6. 关闭标签页才会真正结束该项目的 Kimi 进程。

## 开发

### 技术栈

- 前端：React 18 + TypeScript + Tailwind CSS + Zustand
- 后端：Rust + Tauri v2
- 终端：xterm.js + Canvas Addon + portable-pty

### 环境要求

- Rust toolchain
- Node.js + npm
- Windows GNU 构建还需要 Strawberry Perl 的 MinGW `windres`（见下方 PATH 说明）

### 常用命令

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 前端测试
npm test -- --run

# Rust 测试
cd src-tauri && cargo test

# 生产构建（Windows GNU 需要正确 PATH）
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:build
```

### Windows GNU 构建注意

如果你使用 `x86_64-pc-windows-gnu` 工具链，构建时可能会遇到：

```text
windres.exe: Can't detect target endianness and architecture.
```

这是因为系统 PATH 中另一个 `windres` 被优先找到。构建前把 Strawberry Perl 的 MinGW bin 目录放到 PATH 最前面：

```bash
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:build
```

## 项目结构

```
.
├── src/                          # React 前端
│   ├── components/               # UI 组件
│   ├── store/useAppStore.ts      # Zustand 状态管理
│   └── types.ts                  # 共享类型
├── src-tauri/                    # Rust + Tauri 后端
│   ├── src/
│   │   ├── commands.rs           # Tauri IPC 命令
│   │   ├── pty.rs                # PTY / 内嵌终端
│   │   ├── state.rs              # JSON 持久化
│   │   └── kimi_import.rs        # Kimi CLI 历史解析
│   └── Cargo.toml
├── tests/                        # Vitest 组件测试
└── docs/                         # 设计文档
```

## 数据存储

应用状态保存在：

- Windows：`%APPDATA%/com.kimicliprojectmanager.desktop/state.json`
- macOS：`~/Library/Application Support/com.kimicliprojectmanager.desktop/state.json`
- Linux：`~/.local/share/com.kimicliprojectmanager.desktop/state.json`

## 已知限制

- 当前仅支持 Windows 平台的主要测试和构建路径；macOS/Linux 的终端命令已做基本适配，但未经充分测试。
- `kimi` CLI 必须在系统 PATH 中，否则内嵌终端会报错。
- 同一个项目目前只能打开一个标签页。

## License

MIT
