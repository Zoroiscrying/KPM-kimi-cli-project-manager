pub mod state;
pub mod terminal;

#[cfg(feature = "tauri")]
pub mod commands;

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
        .setup(|app| {
            let path = app_state_path(app.app_handle());
            let initial = load_or_create(&path).map_err(|e| e.to_string())?;
            app.manage(AppStateWrapper {
                state: Mutex::new(initial),
                state_path: path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::add_project,
            commands::update_project,
            commands::delete_project,
            commands::record_session,
            commands::open_kimi,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
