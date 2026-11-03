//! Small persisted settings owned by the Rust side (the chosen library path).

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const FILE_NAME: &str = "settings.json";

#[derive(Debug, Default, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Database file the user picked manually; probed before the defaults.
    pub library_path: Option<PathBuf>,
}

/// Reads settings, falling back to defaults when the file is missing or unreadable.
pub fn read(file: &Path) -> Settings {
    std::fs::read(file).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
}

pub fn write(file: &Path, settings: &Settings) -> std::io::Result<()> {
    if let Some(dir) = file.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(file, serde_json::to_vec_pretty(settings)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::fixture::TempDir;

    #[test]
    fn round_trips_and_defaults_when_missing() {
        let dir = TempDir::new();
        let file = dir.path().join("nested").join(FILE_NAME);
        assert_eq!(read(&file), Settings::default());
        let s = Settings { library_path: Some(PathBuf::from("/music/mixxxdb.sqlite")) };
        write(&file, &s).unwrap();
        assert_eq!(read(&file), s);
    }

    #[test]
    fn corrupt_file_reads_as_defaults() {
        let dir = TempDir::new();
        let file = dir.path().join(FILE_NAME);
        std::fs::write(&file, b"{not json").unwrap();
        assert_eq!(read(&file), Settings::default());
    }
}
