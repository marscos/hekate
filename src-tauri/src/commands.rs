//! Tauri commands for loading the Mixxx library (design D1, D16).

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::mixxx::library::{self, Library};
use crate::mixxx::locate::{self, Os};
use crate::mixxx::LibraryError;
use crate::settings;

/// The library currently in use, shared with the now-playing poller.
#[derive(Default)]
pub struct AppState {
    pub library_path: Mutex<Option<PathBuf>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessInfo {
    /// The next automatic load may read Mixxx's sandboxed folder, which makes
    /// macOS ask for "access data from other apps" permission.
    pub needs_app_data_permission: bool,
}

struct Paths {
    settings_file: PathBuf,
    candidates: Vec<PathBuf>,
}

fn paths(app: &AppHandle) -> Result<Paths, LibraryError> {
    let unavailable = |e: tauri::Error| LibraryError::Read { path: String::new(), reason: e.to_string() };
    let resolver = app.path();
    let home = resolver.home_dir().map_err(unavailable)?;
    let local_app_data = resolver.local_data_dir().ok();
    Ok(Paths {
        settings_file: resolver.app_config_dir().map_err(unavailable)?.join(settings::FILE_NAME),
        candidates: locate::default_candidates(Os::current(), &home, local_app_data.as_deref()),
    })
}

/// Locates the library (persisted choice first, then defaults) and loads it.
fn load_located(settings_file: &Path, candidates: &[PathBuf]) -> Result<Library, LibraryError> {
    let persisted = settings::read(settings_file).library_path;
    let path = locate::locate(persisted.as_deref(), candidates)?;
    library::load(&path)
}

/// Loads a user-chosen file and remembers it only if it is a valid library.
fn load_chosen(settings_file: &Path, path: &Path) -> Result<Library, LibraryError> {
    let lib = library::load(path)?;
    let saved = settings::write(settings_file, &settings::Settings { library_path: Some(path.to_path_buf()) });
    saved.map_err(|e| LibraryError::Read { path: settings_file.display().to_string(), reason: e.to_string() })?;
    Ok(lib)
}

fn remember(state: &AppState, lib: &Library) {
    *state.library_path.lock().unwrap() = Some(PathBuf::from(&lib.path));
}

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> T {
    tauri::async_runtime::spawn_blocking(f).await.expect("library task panicked")
}

#[tauri::command]
pub fn library_access_info(app: AppHandle) -> Result<AccessInfo, LibraryError> {
    let p = paths(&app)?;
    let persisted = settings::read(&p.settings_file).library_path;
    let next = persisted.as_ref().or(p.candidates.first());
    Ok(AccessInfo {
        needs_app_data_permission: next.is_some_and(|path| locate::needs_app_data_permission(Os::current(), path)),
    })
}

#[tauri::command]
pub async fn load_library(app: AppHandle, state: State<'_, AppState>) -> Result<Library, LibraryError> {
    let p = paths(&app)?;
    let lib = blocking(move || load_located(&p.settings_file, &p.candidates)).await?;
    remember(&state, &lib);
    Ok(lib)
}

#[tauri::command]
pub async fn reload_library(app: AppHandle, state: State<'_, AppState>) -> Result<Library, LibraryError> {
    let current = state.library_path.lock().unwrap().clone();
    match current {
        Some(path) => blocking(move || library::load(&path)).await,
        None => load_library(app, state).await,
    }
}

#[tauri::command]
pub async fn set_library_path(app: AppHandle, state: State<'_, AppState>, path: PathBuf) -> Result<Library, LibraryError> {
    let p = paths(&app)?;
    let lib = blocking(move || load_chosen(&p.settings_file, &path)).await?;
    remember(&state, &lib);
    Ok(lib)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::fixture::{self, TempDir};

    #[test]
    fn chosen_library_is_loaded_and_remembered() {
        let dir = TempDir::new();
        let db = fixture::create(dir.path());
        let settings_file = dir.path().join("config").join(settings::FILE_NAME);
        let lib = load_chosen(&settings_file, &db).unwrap();
        assert_eq!(lib.tracks.len(), 5);
        assert_eq!(settings::read(&settings_file).library_path, Some(db.clone()));
        // The next automatic load uses the remembered file even with no defaults.
        assert_eq!(load_located(&settings_file, &[]).unwrap().path, db.display().to_string());
    }

    #[test]
    fn invalid_choice_is_rejected_and_not_remembered() {
        let dir = TempDir::new();
        let db = fixture::create(dir.path());
        let settings_file = dir.path().join(settings::FILE_NAME);
        load_chosen(&settings_file, &db).unwrap();

        let bogus = dir.path().join("playlist.m3u");
        std::fs::write(&bogus, b"#EXTM3U\nsong.mp3\n and more text to fill a page header").unwrap();
        match load_chosen(&settings_file, &bogus) {
            Err(LibraryError::InvalidLibrary { path, .. }) => assert_eq!(path, bogus.display().to_string()),
            other => panic!("unexpected {other:?}"),
        }
        assert_eq!(settings::read(&settings_file).library_path, Some(db));
    }

    #[test]
    fn nothing_found_reports_searched_locations() {
        let dir = TempDir::new();
        let settings_file = dir.path().join(settings::FILE_NAME);
        let missing = dir.path().join("mixxxdb.sqlite");
        assert!(matches!(load_located(&settings_file, &[missing]), Err(LibraryError::NotFound { .. })));
    }

    #[test]
    fn errors_serialize_with_a_kind_tag() {
        let e = LibraryError::InvalidLibrary { path: "/x".into(), reason: "nope".into() };
        assert_eq!(serde_json::to_value(&e).unwrap(), serde_json::json!({"kind": "invalidLibrary", "path": "/x", "reason": "nope"}));
    }
}
