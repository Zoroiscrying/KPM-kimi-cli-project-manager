use crate::state::{AppState, Project, Session};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct AppStateWrapper {
    pub state: Mutex<AppState>,
    pub state_path: PathBuf,
}

impl AppStateWrapper {
    pub fn save(&self) -> Result<(), String> {
        let guard = self.state.lock().map_err(|e| e.to_string())?;
        crate::state::save_state(&self.state_path, &guard)
    }
}

#[tauri::command]
pub fn get_state(state: State<'_, AppStateWrapper>) -> Result<AppState, String> {
    let guard = state.state.lock().map_err(|e| e.to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn add_project(
    state: State<'_, AppStateWrapper>,
    project: Project,
) -> Result<AppState, String> {
    {
        let mut guard = state.state.lock().map_err(|e| e.to_string())?;
        guard.projects.push(project);
    }
    state.save()?;
    get_state(state)
}

#[tauri::command]
pub fn update_project(
    state: State<'_, AppStateWrapper>,
    project: Project,
) -> Result<AppState, String> {
    {
        let mut guard = state.state.lock().map_err(|e| e.to_string())?;
        let existing = guard
            .projects
            .iter_mut()
            .find(|p| p.id == project.id)
            .ok_or_else(|| format!("project not found: {}", project.id))?;
        *existing = project;
    }
    state.save()?;
    get_state(state)
}

#[tauri::command]
pub fn delete_project(
    state: State<'_, AppStateWrapper>,
    id: String,
) -> Result<AppState, String> {
    {
        let mut guard = state.state.lock().map_err(|e| e.to_string())?;
        guard.projects.retain(|p| p.id != id);
        guard.sessions.retain(|s| s.project_id != id);
    }
    state.save()?;
    get_state(state)
}

#[tauri::command]
pub fn record_session(
    state: State<'_, AppStateWrapper>,
    session: Session,
) -> Result<AppState, String> {
    {
        let mut guard = state.state.lock().map_err(|e| e.to_string())?;
        guard.sessions.push(session);
    }
    state.save()?;
    get_state(state)
}

#[tauri::command]
pub fn open_kimi(project_path: String) -> Result<(), String> {
    crate::terminal::open_kimi_in_terminal(&project_path)
}

#[tauri::command]
pub fn start_terminal(
    state: State<'_, crate::pty::PtyManager>,
    app_handle: AppHandle,
    session_id: String,
    cwd: String,
) -> Result<(), String> {
    let event_session_id = session_id.clone();
    state.start(session_id, cwd, move |data| {
        let _ = app_handle.emit(
            "terminal-output",
            TerminalOutputEvent {
                session_id: event_session_id.clone(),
                data,
            },
        );
    })
}

#[tauri::command]
pub fn write_terminal(
    state: State<'_, crate::pty::PtyManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.write(&session_id, &data)
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, crate::pty::PtyManager>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state.resize(&session_id, rows, cols)
}

#[tauri::command]
pub fn stop_terminal(
    state: State<'_, crate::pty::PtyManager>,
    session_id: String,
) -> Result<(), String> {
    state.stop(&session_id)
}

#[tauri::command]
pub fn refresh_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .eval(
                r#"
                (function () {
                    const body = document.body;
                    void body.offsetHeight;
                    body.style.transform = 'translateZ(0)';
                    requestAnimationFrame(function () {
                        body.style.transform = '';
                    });
                    window.dispatchEvent(new Event('resize'));
                })();
                "#,
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Clone, serde::Serialize)]
struct TerminalOutputEvent {
    session_id: String,
    data: String,
}

#[tauri::command]
pub fn import_kimi_projects(
    state: State<'_, AppStateWrapper>,
    app_handle: AppHandle,
) -> Result<AppState, String> {
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("failed to resolve home dir: {e}"))?;
    let kimi_dir = home.join(".kimi-code");
    let index_path = kimi_dir.join("session_index.jsonl");

    let content = std::fs::read_to_string(&index_path).map_err(|e| {
        format!(
            "failed to read Kimi session index at {}: {e}",
            index_path.display()
        )
    })?;

    let work_dirs = crate::kimi_import::parse_kimi_work_dirs(&content, &kimi_dir);

    {
        let mut guard = state.state.lock().map_err(|e| e.to_string())?;
        let existing_paths: HashSet<String> =
            guard.projects.iter().map(|p| p.path.clone()).collect();
        let now = chrono::Utc::now().to_rfc3339();

        for path in work_dirs {
            let path_str = path.to_string_lossy().to_string();
            if existing_paths.contains(&path_str) {
                continue;
            }
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Imported Project")
                .to_string();
            guard.projects.push(Project {
                id: uuid::Uuid::new_v4().to_string(),
                name,
                path: path_str,
                description: Some("Imported from Kimi CLI history".to_string()),
                tags: None,
                created_at: now.clone(),
                updated_at: now.clone(),
            });
        }
    }

    state.save()?;
    get_state(state)
}


