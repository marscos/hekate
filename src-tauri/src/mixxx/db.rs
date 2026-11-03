//! Read-only, concurrency-tolerant connection to Mixxx's database (design D2).

use std::path::Path;
use std::thread::sleep;
use std::time::Duration;

use rusqlite::{Connection, ErrorCode, OpenFlags};

use super::LibraryError;

const BUSY_TIMEOUT: Duration = Duration::from_millis(1000);
const RETRIES: u32 = 5;
const RETRY_DELAY: Duration = Duration::from_millis(100);

/// Tables and columns hekate reads. Anything missing means the file is not a
/// (compatible) Mixxx library.
const REQUIRED: &[(&str, &str)] = &[
    ("library", "id, artist, title, duration, bpm, key_id, mixxx_deleted"),
    ("crates", "id, name"),
    ("crate_tracks", "crate_id, track_id"),
    ("Playlists", "id, name, hidden"),
    ("PlaylistTracks", "playlist_id, track_id, position, pl_datetime_added"),
];

/// Opens `path` read-only. Never creates or modifies the file.
pub fn open(path: &Path) -> Result<Connection, LibraryError> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX;
    let conn = Connection::open_with_flags(path, flags).map_err(|e| read_error(path, e))?;
    conn.busy_timeout(BUSY_TIMEOUT).map_err(|e| read_error(path, e))?;
    validate(&conn, path)?;
    Ok(conn)
}

fn validate(conn: &Connection, path: &Path) -> Result<(), LibraryError> {
    for (table, columns) in REQUIRED {
        with_retry(|| conn.prepare(&format!("SELECT {columns} FROM {table} LIMIT 0")).map(|_| ())).map_err(|e| {
            match e.sqlite_error_code() {
                Some(ErrorCode::NotADatabase) | Some(ErrorCode::DatabaseCorrupt) | None => invalid(path, e.to_string()),
                Some(ErrorCode::DatabaseBusy) | Some(ErrorCode::DatabaseLocked) => read_error(path, e),
                _ => invalid(path, e.to_string()),
            }
        })?;
    }
    Ok(())
}

/// Runs `f`, retrying while Mixxx holds a lock on the database.
pub fn with_retry<T>(mut f: impl FnMut() -> rusqlite::Result<T>) -> rusqlite::Result<T> {
    let mut attempt = 0;
    loop {
        match f() {
            Err(e) if is_busy(&e) && attempt < RETRIES => {
                attempt += 1;
                sleep(RETRY_DELAY);
            }
            result => return result,
        }
    }
}

fn is_busy(e: &rusqlite::Error) -> bool {
    matches!(e.sqlite_error_code(), Some(ErrorCode::DatabaseBusy) | Some(ErrorCode::DatabaseLocked))
}

fn invalid(path: &Path, reason: String) -> LibraryError {
    LibraryError::InvalidLibrary { path: path.display().to_string(), reason }
}

pub fn read_error(path: &Path, e: rusqlite::Error) -> LibraryError {
    LibraryError::Read { path: path.display().to_string(), reason: e.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::fixture::{self, TempDir};

    #[test]
    fn opens_a_mixxx_library() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        assert!(open(&path).is_ok());
    }

    #[test]
    fn rejects_a_non_database_file() {
        let dir = TempDir::new();
        let path = dir.path().join("notes.txt");
        std::fs::write(&path, b"definitely not sqlite, just some text that is long enough").unwrap();
        assert!(matches!(open(&path), Err(LibraryError::InvalidLibrary { .. })));
    }

    #[test]
    fn rejects_a_database_without_mixxx_tables() {
        let dir = TempDir::new();
        let path = dir.path().join("other.sqlite");
        Connection::open(&path).unwrap().execute_batch("CREATE TABLE notes (id INTEGER);").unwrap();
        match open(&path) {
            Err(LibraryError::InvalidLibrary { reason, .. }) => assert!(reason.contains("library"), "{reason}"),
            other => panic!("unexpected {other:?}"),
        }
    }

    #[test]
    fn does_not_create_missing_files() {
        let dir = TempDir::new();
        let path = dir.path().join("missing.sqlite");
        assert!(open(&path).is_err());
        assert!(!path.exists());
    }
}
