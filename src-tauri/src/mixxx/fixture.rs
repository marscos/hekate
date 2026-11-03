//! Test-only builder for a minimal Mixxx-schema SQLite database.
//!
//! The tables and columns mirror the subset of Mixxx's schema hekate reads.
//! The contents cover mixed key notations, a deleted track, unanalysed tracks,
//! crates, a regular playlist and two history playlists.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

use rusqlite::Connection;

const SCHEMA: &str = r#"
CREATE TABLE track_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location varchar(512) UNIQUE,
    filename varchar(512),
    directory varchar(512),
    filesize INTEGER,
    fs_deleted INTEGER,
    needs_verification INTEGER);
CREATE TABLE library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist varchar(64),
    title varchar(64),
    location INTEGER REFERENCES track_locations(location),
    duration FLOAT,
    bpm FLOAT,
    mixxx_deleted INTEGER,
    key varchar(8) DEFAULT '',
    key_id INTEGER DEFAULT 0,
    last_played_at DATETIME DEFAULT NULL);
CREATE TABLE crates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name varchar(48) UNIQUE NOT NULL,
    count INTEGER DEFAULT 0,
    show INTEGER DEFAULT 1, locked INTEGER DEFAULT 0, autodj_source INTEGER DEFAULT 0);
CREATE TABLE crate_tracks (
    crate_id INTEGER NOT NULL REFERENCES crates(id),
    track_id INTEGER NOT NULL REFERENCES library(id),
    UNIQUE (crate_id, track_id));
CREATE TABLE Playlists (
    id INTEGER PRIMARY KEY,
    name varchar(48),
    position INTEGER,
    hidden INTEGER DEFAULT 0 NOT NULL,
    date_created datetime,
    date_modified datetime, locked INTEGER DEFAULT 0);
CREATE TABLE PlaylistTracks (
    id INTEGER PRIMARY KEY,
    playlist_id INTEGER REFERENCES Playlists(id),
    track_id INTEGER REFERENCES library(id),
    position INTEGER, pl_datetime_added);
"#;

const DATA: &str = r#"
INSERT INTO library (id, artist, title, duration, bpm, mixxx_deleted, key, key_id) VALUES
    (1, 'Artist One', 'Alpha',   240.0, 125.0, 0, '8A', 22),
    (2, 'Artist Two', 'Bravo',   200.5, 128.0, 0, 'C',  1),
    (3, NULL,         'Charlie', 180.0, 126.0, 0, '8B', 1),
    (4, 'Gone',       'Deleted', 210.0, 124.0, 1, '8A', 22),
    (5, 'Raw',        'No key',  190.0, 0.0,   0, '',   0),
    (6, 'Raw',        'No BPM',  190.0, 0.0,   0, '5B', 4);
INSERT INTO crates (id, name) VALUES (1, 'D'), (2, 'E'), (3, 'Empty');
INSERT INTO crate_tracks (crate_id, track_id) VALUES (1, 1), (1, 2), (2, 2), (2, 3), (2, 4);
INSERT INTO Playlists (id, name, position, hidden, date_created) VALUES
    (1, 'Auto DJ',    0, 1, '2026-10-01 10:00:00'),
    (2, 'Warmup',     1, 0, '2026-10-01 10:00:00'),
    (3, '2026-10-14', 2, 2, '2026-10-14 20:00:00'),
    (5, '2026-10-16', 3, 2, '2026-10-16 21:00:00');
INSERT INTO PlaylistTracks (playlist_id, track_id, position, pl_datetime_added) VALUES
    (2, 2, 1, '2026-10-01 10:00:00'),
    (3, 2, 1, '2026-10-14 20:01:00'),
    (5, 3, 1, '2026-10-16 21:00:10'),
    (5, 1, 2, '2026-10-16 21:04:30');
"#;

/// A temporary directory removed on drop.
pub struct TempDir(PathBuf);

impl TempDir {
    pub fn new() -> Self {
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let dir = std::env::temp_dir().join(format!(
            "hekate-test-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        std::fs::create_dir_all(&dir).unwrap();
        TempDir(dir)
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// Writes the fixture database to `dir/mixxxdb.sqlite` and returns its path.
pub fn create(dir: &Path) -> PathBuf {
    let path = dir.join("mixxxdb.sqlite");
    let conn = Connection::open(&path).unwrap();
    conn.execute_batch(SCHEMA).unwrap();
    conn.execute_batch(DATA).unwrap();
    path
}

/// Appends a history row to the latest history playlist (as Mixxx does when a track starts).
pub fn append_history(path: &Path, track_id: i64, played_at: &str) {
    let conn = Connection::open(path).unwrap();
    conn.execute(
        "INSERT INTO PlaylistTracks (playlist_id, track_id, position, pl_datetime_added)
         SELECT 5, ?1, COALESCE(MAX(position), 0) + 1, ?2 FROM PlaylistTracks WHERE playlist_id = 5",
        rusqlite::params![track_id, played_at],
    )
    .unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_smoke_test() {
        let dir = TempDir::new();
        let path = create(dir.path());
        let conn = Connection::open(&path).unwrap();
        let tracks: i64 = conn.query_row("SELECT COUNT(*) FROM library", [], |r| r.get(0)).unwrap();
        assert_eq!(tracks, 6);
    }
}
