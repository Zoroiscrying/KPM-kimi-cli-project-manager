<p align="center">
  <img src="docs/images/icon.png" alt="Kimi CLI Project Manager icon" width="96" />
</p>

<h1 align="center">Kimi CLI Project Manager</h1>

<p align="center">
  A desktop home for your Kimi Code CLI projects — multi-tab embedded terminals, session restore,<br/>
  and a workspace that keeps every project one click away.
</p>

<p align="center">
  <img src="docs/images/app-screenshot.png" alt="Kimi CLI Project Manager screenshot" />
</p>

[English](README.md) | [中文](README.zh.md) | [Website](https://zoroiscrying.github.io/KPM-kimi-cli-project-manager/)

A desktop app for managing [Kimi Code CLI](https://github.com/moonshotai/kimi-code) projects. Inspired by OpenAI Codex Desktop, it brings project listing, embedded terminals, and session management into a single native window.

## Features

- **Project management**: add, edit, and delete frequently used projects; import projects from Kimi CLI history.
- **Multi-tab terminals**: each project runs Kimi CLI in its own embedded terminal; switching tabs keeps sessions alive.
- **Session restore**: when opening a project, the app automatically resumes the most recent Kimi session for that project.
- **Environment panel**: project details, recent sessions, and handy tools (open folder, copy path) on the right.
- **Local persistence**: project list and session records are stored in a local JSON file.

## Layout

```
┌─────────────┬─────────────────────────────┬──────────────┐
│ Project     │      Terminal tabs          │  Project     │
│ list        │  ┌─────┬─────┬─────┐        │  info        │
│             │  │ A   │ B   │ C × │        │  Recents     │
│  + Add      │  └─────┴─────┴─────┘        │  Tools       │
│  Import     │                             │              │
│  from Kimi  │      Embedded Kimi CLI      │              │
│             │                             │              │
└─────────────┴─────────────────────────────┴──────────────┘
```

## Installation

Download the installer for your platform from the [Releases](https://github.com/Zoroiscrying/KPM-kimi-cli-project-manager/releases) page:

- Windows: `kimi-cli-project-manager_0.1.0_x64-setup.exe` or `.msi`

After installation, run `Kimi CLI Project Manager`. The app will create the state file automatically on first launch.

### Prerequisites

- [Kimi Code CLI](https://github.com/moonshotai/kimi-code) installed and `kimi` available on your system PATH.
- Windows: WebView2 runtime (usually pre-installed on Windows 10/11).

## Usage

1. Click **+ Add Project** on the left to add a project directory.
2. Or click **Import from Kimi** to import projects from your Kimi CLI history.
3. Click a project to open a terminal tab; the app will start `kimi` and try to restore the latest session for that project.
4. With multiple projects open, each one has its own terminal tab; switching tabs does not stop the previous Kimi CLI.
5. Type directly in the terminal — every keystroke goes straight to the embedded Kimi CLI.
6. Closing a tab is what actually terminates that project's Kimi process.

## Development

### Tech stack

- Frontend: React 18 + TypeScript + Tailwind CSS + Zustand
- Backend: Rust + Tauri v2
- Terminal: xterm.js + Canvas Addon + portable-pty

### Requirements

- Rust toolchain
- Node.js + npm
- Windows GNU builds also need Strawberry Perl's MinGW `windres` (see PATH note below)

### Common commands

```bash
# Install dependencies
npm install

# Dev mode
npm run tauri:dev

# Frontend tests
npm test -- --run

# Rust tests
cd src-tauri && cargo test

# Production build (Windows GNU needs correct PATH)
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:build
```

### Windows GNU build note

If you use the `x86_64-pc-windows-gnu` toolchain, you may see:

```text
windres.exe: Can't detect target endianness and architecture.
```

This happens because another `windres` is found first in PATH. Prepend Strawberry Perl's MinGW bin directory before building:

```bash
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:build
```

## Project structure

```
.
├── src/                          # React frontend
│   ├── components/               # UI components
│   ├── store/useAppStore.ts      # Zustand state management
│   └── types.ts                  # Shared types
├── src-tauri/                    # Rust + Tauri backend
│   ├── src/
│   │   ├── commands.rs           # Tauri IPC commands
│   │   ├── pty.rs                # PTY / embedded terminal
│   │   ├── state.rs              # JSON persistence
│   │   └── kimi_import.rs        # Kimi CLI history parser
│   └── Cargo.toml
├── tests/                        # Vitest component tests
└── docs/                         # Design documents
```

## Data storage

App state is persisted to:

- Windows: `%APPDATA%/com.kimicliprojectmanager.desktop/state.json`
- macOS: `~/Library/Application Support/com.kimicliprojectmanager.desktop/state.json`
- Linux: `~/.local/share/com.kimicliprojectmanager.desktop/state.json`

## Known limitations

- Primary testing and build paths are Windows; macOS/Linux terminal commands are adapted but not fully tested.
- `kimi` CLI must be on the system PATH, otherwise the embedded terminal will report an error.
- The same project can only be opened in one tab at a time.

## License

MIT
