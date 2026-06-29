use crate::state::{AppState, Project, Session};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

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
