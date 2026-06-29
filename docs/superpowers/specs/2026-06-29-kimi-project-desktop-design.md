# Kimi Project Desktop 设计文档

> 一个面向 Kimi Code CLI 的多项目管理桌面工具，参考 Codex Desktop 的交互体验，让用户无需每次都手动 cd 到项目目录再启动 Kimi。

## 目标

- 集中管理多个 Kimi 工作项目
- 一键在指定项目目录启动 Kimi CLI
- 记录每个项目的最近 Kimi 会话，方便快速回到上下文
- 通过全局快捷键快速唤起项目选择
- 远期支持应用内嵌终端，实现一体化体验

## 非目标

- 不替代 Kimi Code CLI 本身，仅作为启动器和管理器
- 不做聊天内容的存储、同步或展示（Kimi CLI 自行管理）
- 不做多用户、权限、云端同步
- 不做复杂的插件系统或主题市场

## 技术架构

- **桌面壳层：** Tauri v2（Rust + 系统 WebView）
- **前端：** React 18 + TypeScript
- **样式：** Tailwind CSS（推荐）或原生的 CSS Modules
- **状态管理：** Zustand 或 React Context（优先选择 Zustand 以保持简洁）
- **本地持久化：** Tauri FS API 读写 JSON 文件
- **外部终端启动：** Tauri Command，根据平台调用系统终端并执行 `cd <path> && kimi`
- **全局快捷键：** Tauri Global Shortcut API（二期）
- **内嵌终端：** xterm.js + Tauri Command 启动伪终端子进程（三期）

## 数据模型

### Project（项目）

```typescript
interface Project {
  id: string;            // UUID
  name: string;          // 显示名称
  path: string;          // 绝对路径
  description?: string;  // 可选描述
  tags?: string[];       // 可选标签，用于分组/过滤
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

### Session（会话记录）

```typescript
interface Session {
  id: string;            // UUID
  projectId: string;     // 关联项目 ID
  startedAt: string;     // ISO 8601
  summary?: string;      // 用户可填写的简短说明
  command?: string;      // 启动时使用的命令，例如 "kimi"
}
```

### AppState（持久化文件）

```typescript
interface AppState {
  version: number;       // 数据格式版本，便于未来迁移
  projects: Project[];
  sessions: Session[];
  settings: {
    theme: 'dark' | 'light' | 'system';
    launchOnStartup?: boolean;
    globalShortcut?: string;
  };
}
```

持久化文件位置：
- Windows: `%APPDATA%/com.kimiproject.desktop/state.json`
- macOS: `~/Library/Application Support/com.kimiproject.desktop/state.json`
- Linux: `~/.config/com.kimiproject.desktop/state.json`

## UI 设计

### 整体布局

- 左侧边栏：项目列表 + 搜索/过滤 + 添加项目按钮
- 右侧主区域：选中项目的详情 + 操作按钮 + 最近会话列表
- 顶部标题栏：应用名称 + 窗口控制（Tauri 提供）
- 深色主题为主，支持跟随系统/手动切换

参考布局已作为 brainstorming 产物保存在 `.superpowers/brainstorm/260-1782733623/content/layout-overview.html`。

### 主要视图

1. **项目列表视图**
   - 项目卡片/行：名称 + 路径 + 标签
   - 搜索框：按名称/路径/标签过滤
   - 右键菜单：编辑、删除、在文件管理器中打开
   - 添加项目按钮：弹出对话框选择目录

2. **项目详情视图**
   - 项目名称和路径
   - "Open in Kimi" 按钮：打开外部终端
   - "Open Embedded Terminal" 按钮：三期启用
   - 最近会话列表：时间 + 摘要
   - 编辑/删除项目入口

3. **全局快捷键唤起面板**（二期）
   - 类似 Raycast 的搜索面板
   - 输入项目名快速过滤
   - 回车直接启动 Kimi

## 数据流

1. 应用启动时，前端通过 Tauri Command `load_state()` 读取本地 JSON 到 Zustand store。
2. 用户在 UI 中操作（添加项目、启动会话、编辑项目）。
3. 写操作通过 Tauri Command（如 `save_project`、`delete_project`、`record_session`）交给 Rust 端。
4. Rust 端更新 JSON 文件后返回最新状态，前端同步更新 store。
5. 启动 Kimi 时，前端调用 `open_kimi(projectId, terminalType)`，Rust 端：
   - 校验项目路径存在
   - 根据当前平台选择终端程序
   - 执行 `cd <path> && kimi`
   - 成功后记录一条 Session

## 平台终端调用策略

| 平台 | 默认终端 | 调用方式 |
|------|---------|---------|
| Windows | PowerShell / CMD | `start powershell -NoExit -Command "cd <path>; kimi"` |
| macOS | Terminal | `open -a Terminal <path>` 后发送 `kimi` 命令 |
| Linux | 默认终端 | `xdg-terminal-exec --working-directory=<path> -- kimi` 或 distro 特定命令 |

> 初始实现以 Windows 为主，macOS/Linux 后续补齐并允许用户在设置中指定终端路径。

## 错误处理

| 场景 | 处理策略 |
|------|---------|
| `state.json` 不存在 | 自动创建默认空状态 |
| `state.json` 损坏 | 备份为 `state.json.bak.<timestamp>`，重建空状态并提示用户 |
| 项目路径不存在 | 在项目卡片上显示警告图标，详情页提示路径无效 |
| `kimi` 命令未找到 | 弹出错误通知，引导用户检查 Kimi CLI 安装 |
| 启动终端失败 | 显示错误通知，记录错误日志 |
| 读写文件权限不足 | 显示错误通知，建议检查应用权限 |

## 阶段规划

### Phase 1：MVP（本期实现）

- [ ] Tauri + React + TypeScript 项目脚手架
- [ ] 本地 JSON 持久化（AppState 读写）
- [ ] 项目 CRUD（添加、编辑、删除、列表展示）
- [ ] 项目搜索/过滤
- [ ] 外部终端启动 Kimi（Windows 优先）
- [ ] 最近会话记录展示
- [ ] 深色主题基础界面
- [ ] 基础错误处理

### Phase 2：效率增强

- [ ] 全局快捷键唤起项目选择面板
- [ ] 应用开机自启设置
- [ ] 最近会话手动添加摘要
- [ ] 项目标签与分组

### Phase 3：内嵌终端

- [ ] Tauri sidecar 或伪终端子进程
- [ ] 前端 xterm.js 终端组件
- [ ] 内嵌终端中直接运行 `kimi`
- [ ] 会话与内嵌终端状态关联

## 测试策略

- **Rust 单元测试：** JSON 序列化/反序列化、路径校验、状态迁移逻辑
- **前端组件测试：** React Testing Library 测试项目列表、添加项目表单、详情页
- **Tauri Command 集成测试：** 使用 `@tauri-apps/api` mock 验证调用
- **E2E 测试（可选）：** Playwright 或 Tauri 原生测试覆盖添加项目和启动 Kimi 的完整流程

## 已做决策

- 形式：桌面应用
- 技术栈：Tauri + React + TypeScript
- 持久化：本地 JSON 文件
- 启动方式：先外部终端，后内嵌终端
- 界面风格：类似 Codex Desktop 的简洁深色列表
- 交付方式：渐进式，分三个阶段

## 待后续决策

- 具体 UI 组件库（Shadcn/ui、Radix、Headless UI 等）
- 状态管理库最终选择（Zustand vs React Context）
- 是否引入日志文件及日志级别
- macOS/Linux 终端调用的默认策略
