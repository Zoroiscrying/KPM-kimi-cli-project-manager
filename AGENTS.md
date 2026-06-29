# Agent Notes for Kimi Project Desktop

## Development Environment

This is a Tauri v2 + React + TypeScript desktop application.

### Windows GNU Toolchain Quirks

The Windows environment uses the GNU Rust toolchain (`x86_64-pc-windows-gnu`). Building Tauri v2 with this toolchain requires a working MinGW `windres` resource compiler. The system `PATH` may contain a broken `windres.exe` (for example, from a Chocolatey Processing package) that fails with:

```
windres.exe: Can't detect target endianness and architecture.
```

To build successfully, prepend the Strawberry Perl MinGW `windres` directory to `PATH`:

```bash
export PATH="/c/Strawberry/c/bin:$PATH"
export PATH="/c/Users/zoroiscrying/.cargo/bin:$PATH"
cargo build --features tauri
```

### Crate Type

Because the MinGW linker fails with "export ordinal too large" when building Tauri v2 as `cdylib`/`staticlib`, `src-tauri/Cargo.toml` uses `crate-type = ["rlib"]`. This is sufficient for the desktop target because `main.rs` links the library directly. Mobile bundling is not supported in this configuration.

### Tauri Feature Flag

The `tauri` dependency is behind an optional Cargo feature so that `cargo test` can run on Windows without linking the Tauri runtime. The desktop binary requires the feature to be enabled.

- `cargo test` — runs library and integration tests (Tauri disabled)
- `cargo build --features tauri` — builds the desktop binary
- `cargo run --features tauri` — runs the desktop app

### Useful Commands

```bash
# Install dependencies and build the Rust binary
npm install
cargo build --features tauri

# Run dev server (requires correct PATH for windres)
npm run tauri:dev

# Run frontend tests
npm test -- --run

# Run Rust tests
cargo test

# Build production bundle
npm run build
npm run tauri:build
```
