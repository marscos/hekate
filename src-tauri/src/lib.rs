mod commands;
mod mixxx;
mod settings;

use std::time::Duration;

use tauri::{Emitter, Manager};

const POLL_INTERVAL: Duration = Duration::from_secs(1);

/// Polls Mixxx's history for the library in use and emits changes (design D4).
fn spawn_now_playing_poller(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut poller = mixxx::history::Poller::default();
        loop {
            let path = app.state::<commands::AppState>().library_path.lock().unwrap().clone();
            if let Some(snapshot) = path.and_then(|p| poller.poll(&p)) {
                let _ = app.emit(mixxx::history::EVENT, snapshot);
            }
            std::thread::sleep(POLL_INTERVAL);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::AppState::default())
        .setup(|app| {
            spawn_now_playing_poller(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library_access_info,
            commands::load_library,
            commands::reload_library,
            commands::set_library_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
