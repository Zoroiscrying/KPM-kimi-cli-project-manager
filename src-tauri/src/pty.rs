use portable_pty::{Child, ChildKiller, MasterPty, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Box<dyn Child + Send>>>,
    killer: Arc<Mutex<Box<dyn ChildKiller + Send + Sync>>>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
    pty_system: Box<dyn PtySystem + Send + Sync>,
}

impl PtyManager {
    pub fn new() -> Result<Self, String> {
        let pty_system = Box::new(NativePtySystem::default());
        Ok(Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            pty_system,
        })
    }

    pub fn start(
        &self,
        session_id: String,
        cwd: String,
        on_output: impl Fn(String) + Send + 'static,
    ) -> Result<(), String> {
        let pair = self
            .pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let kimi_session = home_dir().and_then(|home| {
            let index_path = home.join(".kimi-code").join("session_index.jsonl");
            let content = std::fs::read_to_string(&index_path).ok()?;
            crate::kimi_import::find_latest_kimi_session(&content, &cwd)
        });

        let mut cmd = portable_pty::CommandBuilder::new("kimi");
        cmd.cwd(&cwd);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("FORCE_COLOR", "1");
        if let Some(id) = kimi_session.as_ref() {
            cmd.arg("-S");
            cmd.arg(id);
        }

        let child: Box<dyn Child + Send> =
            pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        let killer = child.clone_killer();
        let master = pair.master;
        let writer = master.take_writer().map_err(|e| e.to_string())?;
        drop(pair.slave);

        let mut reader = master.try_clone_reader().map_err(|e| e.to_string())?;
        let sessions = self.sessions.clone();
        let session_id_for_thread = session_id.clone();

        let child_arc = Arc::new(Mutex::new(child));
        let child_for_thread = child_arc.clone();
        let writer_arc = Arc::new(Mutex::new(writer));

        thread::spawn(move || {
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        on_output(text);
                    }
                    Err(_) => break,
                }
            }
            // Do not remove the session just because the reader returned an
            // error; on Windows the PTY pipe can spuriously fail while the
            // child process is still alive. Wait for the actual process exit
            // before cleaning up the map so that writes/resizes keep working.
            let _ = child_for_thread.lock().unwrap().wait();
            sessions.lock().unwrap().remove(&session_id_for_thread);
        });

        self.sessions.lock().unwrap().insert(
            session_id.clone(),
            PtySession {
                master,
                writer: writer_arc,
                child: child_arc,
                killer: Arc::new(Mutex::new(killer)),
            },
        );

        Ok(())
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| "terminal session not found".to_string())?;
        let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn resize(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| "terminal session not found".to_string())?;
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    pub fn stop(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.remove(session_id) {
            let mut killer = session.killer.lock().map_err(|e| e.to_string())?;
            let _ = killer.kill();
        }
        Ok(())
    }

    pub fn is_running(&self, session_id: &str) -> Result<bool, String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let running = if let Some(session) = sessions.get(session_id) {
            let mut child = session.child.lock().map_err(|e| e.to_string())?;
            match child.try_wait() {
                Ok(None) => true,
                Ok(Some(_)) => false,
                // If we cannot determine the state, do NOT remove the session;
                // the reader thread will clean it up once the process really
                // exits. Report it as not-running so the UI does not get stuck.
                Err(_) => false,
            }
        } else {
            false
        };
        if !running {
            sessions.remove(session_id);
        }
        Ok(running)
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new().expect("failed to create pty manager")
    }
}

fn home_dir() -> Option<PathBuf> {
    if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    } else {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}
