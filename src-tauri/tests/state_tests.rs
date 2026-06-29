use std::fs;
use std::path::PathBuf;
use kimi_project_desktop::state::{load_or_create, save_state, AppState};

#[test]
fn test_load_or_create_creates_default_when_missing() {
    let dir = tempfile::tempdir().unwrap();
    let path: PathBuf = dir.path().join("state.json");
    assert!(!path.exists());

    let state = load_or_create(&path).unwrap();
    assert_eq!(state.version, 1);
    assert!(state.projects.is_empty());
    assert!(path.exists());
}

#[test]
fn test_save_and_load_roundtrip() {
    let dir = tempfile::tempdir().unwrap();
    let path: PathBuf = dir.path().join("state.json");

    let mut state = AppState::default();
    state.projects.push(kimi_project_desktop::state::Project {
        id: "p1".to_string(),
        name: "demo".to_string(),
        path: "/tmp/demo".to_string(),
        description: None,
        tags: None,
        created_at: "2026-06-29T00:00:00Z".to_string(),
        updated_at: "2026-06-29T00:00:00Z".to_string(),
    });

    save_state(&path, &state).unwrap();
    let loaded = load_or_create(&path).unwrap();
    assert_eq!(loaded.projects.len(), 1);
    assert_eq!(loaded.projects[0].name, "demo");
}

#[test]
fn test_load_or_create_backups_corrupted_file() {
    let dir = tempfile::tempdir().unwrap();
    let path: PathBuf = dir.path().join("state.json");
    fs::write(&path, "not json").unwrap();

    let state = load_or_create(&path).unwrap();
    assert_eq!(state.version, 1);

    let backups: Vec<_> = fs::read_dir(dir.path())
        .unwrap()
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|n| n.starts_with("state.json.bak"))
        .collect();
    assert_eq!(backups.len(), 1);
}
