pub mod state;
mod terminal;
pub mod kimi_import;

#[cfg(feature = "tauri")]
pub mod commands;
#[cfg(feature = "tauri")]
pub mod pty;

#[cfg(feature = "tauri")]
use commands::AppStateWrapper;
#[cfg(feature = "tauri")]
use state::load_or_create;
#[cfg(feature = "tauri")]
use std::path::PathBuf;
#[cfg(feature = "tauri")]
use std::sync::Mutex;
#[cfg(feature = "tauri")]
use tauri::Manager;

#[cfg(feature = "tauri")]
pub fn app_state_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("state.json")
}

#[cfg(feature = "tauri")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let path = app_state_path(app.app_handle());
            let initial = load_or_create(&path).map_err(|e| e.to_string())?;
            app.manage(AppStateWrapper {
                state: Mutex::new(initial),
                state_path: path,
            });
            app.manage(pty::PtyManager::new().map_err(|e| e.to_string())?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::add_project,
            commands::update_project,
            commands::delete_project,
            commands::record_session,
            commands::open_kimi,
            commands::import_kimi_projects,
            commands::start_terminal,
            commands::write_terminal,
            commands::resize_terminal,
            commands::stop_terminal,
            commands::refresh_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
