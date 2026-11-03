//! Loading tracks, crates and history from a Mixxx database.

use std::path::Path;

use rusqlite::Connection;
use serde::Serialize;

use super::camelot::{self, Camelot};
use super::db::{self, with_retry};
use super::LibraryError;

/// Mixxx marks history (session log) playlists with `hidden = 2`.
pub const HISTORY_HIDDEN: i64 = 2;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    pub artist: String,
    pub title: String,
    pub duration: f64,
    pub bpm: f64,
    pub key_id: i64,
    pub camelot: Option<Camelot>,
    /// Has a known key and a positive BPM, so it can take part in suggestions,
    /// the compass and routing.
    pub usable: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Crate {
    pub id: i64,
    pub name: String,
    pub track_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub track_id: i64,
    pub position: i64,
    pub played_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub playlist_id: i64,
    pub name: String,
    /// In play order.
    pub entries: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub path: String,
    /// Every non-deleted track.
    pub tracks: Vec<Track>,
    /// Tracks without a key or a positive BPM.
    pub excluded_count: usize,
    pub crates: Vec<Crate>,
    /// History playlists, newest first.
    pub histories: Vec<History>,
}

pub fn load(path: &Path) -> Result<Library, LibraryError> {
    let conn = db::open(path)?;
    let err = |e| db::read_error(path, e);
    let tracks = with_retry(|| load_tracks(&conn)).map_err(err)?;
    let crates = with_retry(|| load_crates(&conn)).map_err(err)?;
    let histories = with_retry(|| load_histories(&conn)).map_err(err)?;
    Ok(Library {
        path: path.display().to_string(),
        excluded_count: tracks.iter().filter(|t| !t.usable).count(),
        tracks,
        crates,
        histories,
    })
}

fn load_tracks(conn: &Connection) -> rusqlite::Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT id, COALESCE(artist, ''), COALESCE(title, ''), COALESCE(duration, 0), COALESCE(bpm, 0), COALESCE(key_id, 0)
         FROM library WHERE COALESCE(mixxx_deleted, 0) = 0 ORDER BY id",
    )?;
    let rows = stmt.query_map([], |r| {
        let bpm: f64 = r.get(4)?;
        let key_id: i64 = r.get(5)?;
        let camelot = camelot::from_key_id(key_id);
        Ok(Track {
            id: r.get(0)?,
            artist: r.get(1)?,
            title: r.get(2)?,
            duration: r.get(3)?,
            bpm,
            key_id,
            camelot,
            usable: camelot.is_some() && bpm > 0.0,
        })
    })?;
    rows.collect()
}

fn load_crates(conn: &Connection) -> rusqlite::Result<Vec<Crate>> {
    let mut crates: Vec<Crate> = conn
        .prepare("SELECT id, name FROM crates ORDER BY name COLLATE NOCASE")?
        .query_map([], |r| Ok(Crate { id: r.get(0)?, name: r.get(1)?, track_ids: Vec::new() }))?
        .collect::<rusqlite::Result<_>>()?;
    let mut stmt = conn.prepare(
        "SELECT ct.track_id FROM crate_tracks ct JOIN library l ON l.id = ct.track_id
         WHERE ct.crate_id = ?1 AND COALESCE(l.mixxx_deleted, 0) = 0 ORDER BY ct.track_id",
    )?;
    for c in &mut crates {
        c.track_ids = stmt.query_map([c.id], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    }
    Ok(crates)
}

fn load_histories(conn: &Connection) -> rusqlite::Result<Vec<History>> {
    let mut histories: Vec<History> = conn
        .prepare("SELECT id, COALESCE(name, '') FROM Playlists WHERE hidden = ?1 ORDER BY id DESC")?
        .query_map([HISTORY_HIDDEN], |r| Ok(History { playlist_id: r.get(0)?, name: r.get(1)?, entries: Vec::new() }))?
        .collect::<rusqlite::Result<_>>()?;
    for h in &mut histories {
        h.entries = history_entries(conn, h.playlist_id)?;
    }
    Ok(histories)
}

pub fn history_entries(conn: &Connection, playlist_id: i64) -> rusqlite::Result<Vec<HistoryEntry>> {
    conn.prepare(
        "SELECT track_id, position, COALESCE(pl_datetime_added, '') FROM PlaylistTracks
         WHERE playlist_id = ?1 ORDER BY position",
    )?
    .query_map([playlist_id], |r| Ok(HistoryEntry { track_id: r.get(0)?, position: r.get(1)?, played_at: r.get(2)? }))?
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::camelot::Letter;
    use crate::mixxx::fixture::{self, TempDir};
    use std::time::Duration;

    fn loaded() -> (TempDir, Library) {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let lib = load(&path).unwrap();
        (dir, lib)
    }

    fn track(lib: &Library, id: i64) -> Option<&Track> {
        lib.tracks.iter().find(|t| t.id == id)
    }

    #[test]
    fn camelot_comes_from_key_id_not_key_text() {
        let (_dir, lib) = loaded();
        // Track 2 stores "C", track 3 stores "8B"; both are key_id 1.
        let expected = Some(Camelot { num: 8, letter: Letter::B });
        assert_eq!(track(&lib, 2).unwrap().camelot, expected);
        assert_eq!(track(&lib, 3).unwrap().camelot, expected);
        assert_eq!(track(&lib, 1).unwrap().camelot, Some(Camelot { num: 8, letter: Letter::A }));
    }

    #[test]
    fn deleted_tracks_are_not_loaded() {
        let (_dir, lib) = loaded();
        assert!(track(&lib, 4).is_none());
        assert_eq!(lib.tracks.len(), 5);
    }

    #[test]
    fn unanalysed_tracks_are_loaded_but_excluded() {
        let (_dir, lib) = loaded();
        assert!(!track(&lib, 5).unwrap().usable, "no key");
        assert!(!track(&lib, 6).unwrap().usable, "no BPM");
        assert!(track(&lib, 1).unwrap().usable);
        assert_eq!(lib.excluded_count, 2);
    }

    #[test]
    fn missing_text_fields_become_empty() {
        let (_dir, lib) = loaded();
        assert_eq!(track(&lib, 3).unwrap().artist, "");
    }

    #[test]
    fn crates_with_live_members() {
        let (_dir, lib) = loaded();
        let names: Vec<_> = lib.crates.iter().map(|c| c.name.as_str()).collect();
        assert_eq!(names, ["D", "E", "Empty"]);
        assert_eq!(lib.crates[0].track_ids, [1, 2]);
        // Track 4 is deleted, so it is left out of crate E.
        assert_eq!(lib.crates[1].track_ids, [2, 3]);
        assert!(lib.crates[2].track_ids.is_empty());
    }

    #[test]
    fn history_playlists_newest_first_in_play_order() {
        let (_dir, lib) = loaded();
        let ids: Vec<_> = lib.histories.iter().map(|h| h.playlist_id).collect();
        assert_eq!(ids, [5, 3]);
        let latest: Vec<_> = lib.histories[0].entries.iter().map(|e| (e.track_id, e.played_at.as_str())).collect();
        assert_eq!(latest, [(3, "2026-10-16 21:00:10"), (1, "2026-10-16 21:04:30")]);
    }

    #[test]
    fn loading_leaves_the_library_untouched() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let before = std::fs::read(&path).unwrap();
        let modified = std::fs::metadata(&path).unwrap().modified().unwrap();
        for _ in 0..3 {
            load(&path).unwrap();
        }
        assert_eq!(std::fs::read(&path).unwrap(), before);
        assert_eq!(std::fs::metadata(&path).unwrap().modified().unwrap(), modified);
        let files: Vec<_> = std::fs::read_dir(dir.path()).unwrap().map(|e| e.unwrap().file_name()).collect();
        assert_eq!(files, ["mixxxdb.sqlite"]);
    }

    #[test]
    fn reloading_sees_changes_made_in_mixxx() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        assert_eq!(load(&path).unwrap().crates[2].track_ids, Vec::<i64>::new());
        Connection::open(&path).unwrap().execute("INSERT INTO crate_tracks (crate_id, track_id) VALUES (3, 1)", []).unwrap();
        assert_eq!(load(&path).unwrap().crates[2].track_ids, [1]);
    }

    #[test]
    fn waits_for_a_write_lock_to_be_released() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let writer = Connection::open(&path).unwrap();
        writer.execute_batch("BEGIN EXCLUSIVE;").unwrap();
        let release = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(400));
            writer.execute_batch("COMMIT;").unwrap();
        });
        let lib = load(&path).unwrap();
        release.join().unwrap();
        assert_eq!(lib.tracks.len(), 5);
    }
}
