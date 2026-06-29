use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub started_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub launch_on_startup: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_shortcut: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            launch_on_startup: Some(false),
            global_shortcut: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub version: u32,
    pub projects: Vec<Project>,
    pub sessions: Vec<Session>,
    pub settings: AppSettings,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            version: 1,
            projects: vec![],
            sessions: vec![],
            settings: AppSettings::default(),
        }
    }
}

pub fn load_or_create<P: AsRef<Path>>(path: P) -> Result<AppState, String> {
    let path = path.as_ref();
    if !path.exists() {
        let default = AppState::default();
        save_state(path, &default)?;
        return Ok(default);
    }

    let content = fs::read_to_string(path).map_err(|e| format!("read failed: {e}"))?;
    match serde_json::from_str::<AppState>(&content) {
        Ok(state) => Ok(state),
        Err(e) => {
            let backup_name = format!(
                "state.json.bak.{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
            );
            let backup_path = path.with_file_name(&backup_name);
            fs::copy(path, backup_path).map_err(|err| format!("backup failed: {err}"))?;
            let default = AppState::default();
            save_state(path, &default)?;
            eprintln!("State file corrupted, backed up to {backup_name}: {e}");
            Ok(default)
        }
    }
}

pub fn save_state<P: AsRef<Path>>(path: P, state: &AppState) -> Result<(), String> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dir failed: {e}"))?;
    }
    let content = serde_json::to_string_pretty(state).map_err(|e| format!("serialize failed: {e}"))?;
    let mut file = fs::File::create(path).map_err(|e| format!("create file failed: {e}"))?;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("write failed: {e}"))?;
    Ok(())
}
