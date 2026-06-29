use std::path::Path;
use std::process::Command;

pub fn open_kimi_in_terminal(project_path: &str) -> Result<(), String> {
    let path = Path::new(project_path);
    if !path.exists() {
        return Err(format!("project path does not exist: {project_path}"));
    }

    let canonical = path.canonicalize().map_err(|e| format!("canonicalize failed: {e}"))?;
    let canonical_str = canonical.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let ps_command = format!("cd \"{}\"; kim", canonical_str);
        Command::new("powershell.exe")
            .args(["-NoExit", "-Command", &ps_command])
            .spawn()
            .map_err(|e| format!("failed to start terminal: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!("cd '{}' && clear && kimi", canonical_str.replace("'", "'\\''"));
        Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"{}\"", script),
                "-e",
                "tell application \"Terminal\" to activate",
            ])
            .spawn()
            .map_err(|e| format!("failed to start terminal: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        let script = format!("cd \"{}\" && kim", canonical_str);
        Command::new("x-terminal-emulator")
            .args(["-e", "bash", "-c", &script])
            .spawn()
            .or_else(|_| {
                Command::new("gnome-terminal")
                    .args(["--", "bash", "-c", &script])
                    .spawn()
            })
            .map_err(|e| format!("failed to start terminal: {e}"))?;
    }

    Ok(())
}

pub fn command_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}
