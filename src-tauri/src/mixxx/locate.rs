//! Finding the Mixxx database (design D16).

use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use super::LibraryError;

pub const DB_FILE: &str = "mixxxdb.sqlite";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Os {
    MacOs,
    Linux,
    Windows,
}

impl Os {
    pub fn current() -> Self {
        if cfg!(target_os = "macos") {
            Os::MacOs
        } else if cfg!(target_os = "windows") {
            Os::Windows
        } else {
            Os::Linux
        }
    }
}

/// Default database locations for a platform, in probing order.
pub fn default_candidates(os: Os, home: &Path, local_app_data: Option<&Path>) -> Vec<PathBuf> {
    match os {
        Os::MacOs => vec![
            home.join("Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx").join(DB_FILE),
            home.join("Library/Application Support/Mixxx").join(DB_FILE),
        ],
        Os::Linux => vec![home.join(".mixxx").join(DB_FILE)],
        Os::Windows => local_app_data.map(|d| vec![d.join("Mixxx").join(DB_FILE)]).unwrap_or_default(),
    }
}

/// Whether reading `path` needs the macOS "access data from other apps" permission.
pub fn needs_app_data_permission(os: Os, path: &Path) -> bool {
    os == Os::MacOs && path.components().any(|c| c.as_os_str() == "Containers")
}

/// Returns the first readable database: the persisted manual choice first,
/// then the platform defaults.
pub fn locate(persisted: Option<&Path>, candidates: &[PathBuf]) -> Result<PathBuf, LibraryError> {
    let mut denied = None;
    for path in persisted.into_iter().chain(candidates.iter().map(PathBuf::as_path)) {
        match std::fs::File::open(path) {
            Ok(_) => return Ok(path.to_path_buf()),
            Err(e) if e.kind() == ErrorKind::PermissionDenied => {
                denied.get_or_insert_with(|| path.display().to_string());
            }
            Err(_) => {}
        }
    }
    match denied {
        Some(path) => Err(LibraryError::PermissionDenied { path }),
        None => Err(LibraryError::NotFound {
            searched: persisted
                .into_iter()
                .chain(candidates.iter().map(PathBuf::as_path))
                .map(|p| p.display().to_string())
                .collect(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::fixture::TempDir;

    #[test]
    fn macos_probes_sandboxed_location_first() {
        let c = default_candidates(Os::MacOs, Path::new("/Users/dj"), None);
        assert_eq!(
            c,
            vec![
                PathBuf::from("/Users/dj/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/mixxxdb.sqlite"),
                PathBuf::from("/Users/dj/Library/Application Support/Mixxx/mixxxdb.sqlite"),
            ]
        );
    }

    #[test]
    fn linux_and_windows_locations() {
        assert_eq!(
            default_candidates(Os::Linux, Path::new("/home/dj"), None),
            vec![PathBuf::from("/home/dj/.mixxx/mixxxdb.sqlite")]
        );
        assert_eq!(
            default_candidates(Os::Windows, Path::new("C:/Users/dj"), Some(Path::new("C:/Users/dj/AppData/Local"))),
            vec![PathBuf::from("C:/Users/dj/AppData/Local/Mixxx/mixxxdb.sqlite")]
        );
        assert!(default_candidates(Os::Windows, Path::new("C:/Users/dj"), None).is_empty());
    }

    #[test]
    fn only_the_sandbox_container_needs_permission() {
        let c = default_candidates(Os::MacOs, Path::new("/Users/dj"), None);
        assert!(needs_app_data_permission(Os::MacOs, &c[0]));
        assert!(!needs_app_data_permission(Os::MacOs, &c[1]));
        assert!(!needs_app_data_permission(Os::Linux, &c[0]));
    }

    #[test]
    fn picks_first_readable_default() {
        let dir = TempDir::new();
        let missing = dir.path().join("missing.sqlite");
        let present = dir.path().join("present.sqlite");
        std::fs::write(&present, b"x").unwrap();
        assert_eq!(locate(None, &[missing, present.clone()]).unwrap(), present);
    }

    #[test]
    fn persisted_path_takes_precedence() {
        let dir = TempDir::new();
        let default = dir.path().join("default.sqlite");
        let chosen = dir.path().join("chosen.sqlite");
        std::fs::write(&default, b"x").unwrap();
        std::fs::write(&chosen, b"x").unwrap();
        assert_eq!(locate(Some(&chosen), &[default.clone()]).unwrap(), chosen);
    }

    #[test]
    fn missing_persisted_path_falls_back_to_defaults() {
        let dir = TempDir::new();
        let default = dir.path().join("default.sqlite");
        std::fs::write(&default, b"x").unwrap();
        let gone = dir.path().join("gone.sqlite");
        assert_eq!(locate(Some(&gone), &[default.clone()]).unwrap(), default);
    }

    #[test]
    fn reports_everything_searched_when_nothing_found() {
        let dir = TempDir::new();
        let a = dir.path().join("a.sqlite");
        let b = dir.path().join("b.sqlite");
        match locate(Some(&a), &[b.clone()]) {
            Err(LibraryError::NotFound { searched }) => {
                assert_eq!(searched, vec![a.display().to_string(), b.display().to_string()])
            }
            other => panic!("unexpected {other:?}"),
        }
    }
}
