# Agent Notes: Kimi CLI Project Manager

## Project Overview

Tauri v2 + React 18 + TypeScript + Tailwind CSS + Zustand desktop app for managing Kimi Code CLI projects.

## Repository Layout

- `src/` — React frontend
- `src-tauri/src/` — Rust backend
- `src-tauri/src/state.rs` — JSON persistence
- `src-tauri/src/commands.rs` — Tauri IPC commands (gated behind `tauri` feature)
- `src-tauri/src/terminal.rs` — External terminal launch helpers
- `tests/` — Vitest component tests

## Build Requirements

- Rust toolchain: `x86_64-pc-windows-gnu` (this workspace)
- Node.js + npm
- MinGW `windres` from Strawberry Perl: `C:/Strawberry/c/bin/windres.exe`

### Important: PATH for Windows GNU builds

The Windows GNU linker can pick up the wrong `windres` from Chocolatey/Processing and fail with:

```text
windres.exe: Can't detect target endianness and architecture.
```

Always prepend the Strawberry Perl MinGW bin directory when running Tauri builds:

```bash
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:build
PATH="/c/Strawberry/c/bin:$HOME/.cargo/bin:$PATH" npm run tauri:dev
```

`cargo test` only needs Rust on PATH:

```bash
PATH="$HOME/.cargo/bin:$PATH" cargo test
```

## Cargo Features

Tauri and its plugins are gated behind the optional `tauri` feature so that `cargo test` can run without linking the Tauri runtime.

- `cargo test` — runs Rust unit tests only (no Tauri runtime)
- `cargo build --features tauri` — builds the Tauri binary
- `npm run tauri:build` — production frontend + Rust + bundle
- `npm run tauri:dev` — dev server with Tauri

## Frontend Tests

```bash
npm test -- --run
```

## Release Artifacts

After a successful `npm run tauri:build`, bundles appear in:

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

## Runtime State

App state is persisted to:

- Windows: `%APPDATA%/com.kimicliprojectmanager.desktop/state.json`
- macOS: `~/Library/Application Support/com.kimicliprojectmanager.desktop/state.json`
- Linux: `~/.local/share/com.kimicliprojectmanager.desktop/state.json`

## Known Quirks

- `crate-type = ["rlib"]` is used because MinGW fails with "export ordinal too large" when building `cdylib`/`staticlib` for Tauri v2. The binary links the rlib directly via `src-tauri/src/main.rs`.
- `cargo test` emits a `function open_kimi_in_terminal is never used` warning because `terminal.rs` is only invoked by the feature-gated `commands.rs`. This is expected.
- The app launches `kimi` in an external terminal. If the `kimi` command is not on the user's PATH, the launch will fail and surface an error toast.
