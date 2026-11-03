//! Loading tracks, crates and history from a Mixxx database.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use rusqlite::types::ValueRef;
use rusqlite::{Connection, Row};
use serde::Serialize;

use super::camelot::{self, Camelot};
use crate::covers::{CoverKind, CoverSource, TrackFiles};
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
    /// The cover's dominant colour as `#rrggbb`, when Mixxx recorded a cover.
    pub cover_color: Option<String>,
    /// Identifies the cover image; `None` when there's no cover hekate can read.
    pub cover_digest: Option<String>,
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
    /// File locations and cover sources. Never sent to the frontend.
    #[serde(skip)]
    pub files: TrackFiles,
}

pub fn load(path: &Path) -> Result<Library, LibraryError> {
    let conn = db::open(path)?;
    let err = |e| db::read_error(path, e);
    let (tracks, files) = with_retry(|| load_tracks(&conn)).map_err(err)?;
    let crates = with_retry(|| load_crates(&conn)).map_err(err)?;
    let histories = with_retry(|| load_histories(&conn)).map_err(err)?;
    Ok(Library {
        path: path.display().to_string(),
        excluded_count: tracks.iter().filter(|t| !t.usable).count(),
        tracks,
        crates,
        histories,
        files,
    })
}

/// Mixxx's cover columns, read only when present (design D2).
const COVER_COLUMNS: [&str; 5] = ["coverart_type", "coverart_location", "coverart_hash", "coverart_digest", "coverart_color"];
const COVER_EMBEDDED: i64 = 1;
const COVER_FILE: i64 = 2;

fn column_names(conn: &Connection, table: &str) -> rusqlite::Result<HashSet<String>> {
    conn.prepare(&format!("PRAGMA table_info({table})"))?.query_map([], |r| r.get(1))?.collect()
}

fn load_tracks(conn: &Connection) -> rusqlite::Result<(Vec<Track>, TrackFiles)> {
    let library = column_names(conn, "library")?;
    let locations = column_names(conn, "track_locations")?;
    let cover = |c: &str| if library.contains(c) { format!("l.{c}") } else { "NULL".into() };
    let joined = library.contains("location") && locations.contains("location");
    let (location, directory, from) = if joined {
        let directory = if locations.contains("directory") { "tl.directory" } else { "NULL" };
        ("tl.location", directory, "library l LEFT JOIN track_locations tl ON tl.id = l.location")
    } else {
        ("NULL", "NULL", "library l")
    };
    let sql = format!(
        "SELECT l.id, COALESCE(l.artist, ''), COALESCE(l.title, ''), COALESCE(l.duration, 0), COALESCE(l.bpm, 0),
                COALESCE(l.key_id, 0), {}, {location}, {directory}
         FROM {from} WHERE COALESCE(l.mixxx_deleted, 0) = 0 ORDER BY l.id",
        COVER_COLUMNS.map(cover).join(", "),
    );
    let mut files = TrackFiles::default();
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query([])?;
    let mut tracks = Vec::new();
    while let Some(r) = rows.next()? {
        let id: i64 = r.get(0)?;
        let bpm: f64 = r.get(4)?;
        let key_id: i64 = r.get(5)?;
        let camelot = camelot::from_key_id(key_id);
        let audio_path = text(r, 11).filter(|p| !p.is_empty()).map(PathBuf::from);
        let (cover_color, source) = cover_of(r, audio_path.as_deref());
        let cover_digest = source.as_ref().map(|s| s.key.clone());
        if let Some(path) = audio_path {
            files.paths.insert(id, path);
        }
        if let Some(source) = source {
            files.covers.insert(id, source);
        }
        tracks.push(Track {
            id,
            artist: r.get(1)?,
            title: r.get(2)?,
            duration: r.get(3)?,
            bpm,
            key_id,
            camelot,
            usable: camelot.is_some() && bpm > 0.0,
            cover_color,
            cover_digest,
        });
    }
    Ok((tracks, files))
}

// Cover columns are decorative, so a value of an unexpected type reads as
// missing instead of failing the load.
fn int(r: &Row, i: usize) -> Option<i64> {
    r.get_ref(i).ok()?.as_i64_or_null().ok().flatten()
}

fn text(r: &Row, i: usize) -> Option<String> {
    r.get_ref(i).ok()?.as_str_or_null().ok().flatten().map(str::to_owned)
}

fn bytes(r: &Row, i: usize) -> Option<Vec<u8>> {
    match r.get_ref(i).ok()? {
        ValueRef::Blob(b) | ValueRef::Text(b) if !b.is_empty() => Some(b.to_vec()),
        _ => None,
    }
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// The cover colour and source from columns 6–10 and the track's directory (column 12) (design D1).
fn cover_of(r: &Row, audio_path: Option<&Path>) -> (Option<String>, Option<CoverSource>) {
    let kind = int(r, 6).unwrap_or(0);
    if kind != COVER_EMBEDDED && kind != COVER_FILE {
        return (None, None);
    }
    let color = int(r, 10).map(|c| format!("#{:06x}", c & 0xff_ffff));
    let key = bytes(r, 9).map(|d| hex(&d)).or_else(|| int(r, 8).filter(|&h| h != 0).map(|h| format!("{h:x}")));
    let source = audio_path.zip(key).and_then(|(audio, key)| {
        let kind = if kind == COVER_EMBEDDED {
            CoverKind::Embedded
        } else {
            let location = text(r, 7).filter(|l| !l.is_empty())?;
            let directory = text(r, 12).map(PathBuf::from).or_else(|| audio.parent().map(Path::to_path_buf))?;
            CoverKind::File(directory.join(location))
        };
        Some(CoverSource { kind, audio_path: audio.to_path_buf(), key })
    });
    (color, source)
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
    fn cover_colour_and_digest_are_formatted() {
        let (_dir, lib) = loaded();
        let alpha = track(&lib, 1).unwrap();
        assert_eq!(alpha.cover_color.as_deref(), Some("#123456"));
        assert_eq!(alpha.cover_digest.as_deref(), Some("00ff10ab"));
        assert_eq!(track(&lib, 2).unwrap().cover_color.as_deref(), Some("#0000ff"));
    }

    #[test]
    fn hash_is_used_when_the_digest_is_null() {
        let (_dir, lib) = loaded();
        assert_eq!(track(&lib, 3).unwrap().cover_digest.as_deref(), Some("3039"));
    }

    #[test]
    fn no_cover_or_no_location_gives_none() {
        let (_dir, lib) = loaded();
        let none = track(&lib, 6).unwrap();
        assert_eq!((none.cover_color.as_deref(), none.cover_digest.as_deref()), (None, None));
        assert!(!lib.files.covers.contains_key(&6));
        assert!(lib.files.paths.contains_key(&6), "the audio file is still known");
        // Embedded cover recorded, but no file to read it from: colour only.
        let unplaced = track(&lib, 5).unwrap();
        assert_eq!(unplaced.cover_color.as_deref(), Some("#00ff00"));
        assert_eq!(unplaced.cover_digest, None);
        assert!(!lib.files.paths.contains_key(&5));
    }

    #[test]
    fn cover_sources_resolve_embedded_relative_and_absolute() {
        let (_dir, lib) = loaded();
        let covers = &lib.files.covers;
        assert_eq!(
            covers[&1],
            CoverSource { kind: CoverKind::Embedded, audio_path: "/music/Alpha/alpha.mp3".into(), key: "00ff10ab".into() }
        );
        assert_eq!(covers[&2].kind, CoverKind::File("/music/Bravo/cover.jpg".into()));
        assert_eq!(covers[&2].audio_path, PathBuf::from("/music/Bravo/bravo.flac"));
        assert_eq!(covers[&3].kind, CoverKind::File("/art/charlie.png".into()));
        assert_eq!(covers.len(), 3);
    }

    #[test]
    fn library_without_cover_columns_has_no_covers() {
        let dir = TempDir::new();
        let lib = load(&fixture::create_without_covers(dir.path())).unwrap();
        assert_eq!(lib.tracks.len(), 5);
        assert!(lib.tracks.iter().all(|t| t.cover_color.is_none() && t.cover_digest.is_none()));
        assert!(lib.files.covers.is_empty());
        assert_eq!(lib.files.paths.len(), 4);
    }

    #[test]
    fn file_details_are_not_serialized() {
        let (_dir, lib) = loaded();
        let json = serde_json::to_value(&lib).unwrap();
        assert!(json.get("files").is_none());
        assert_eq!(json["tracks"][0]["coverDigest"], "00ff10ab");
        assert!(!json.to_string().contains("/music/"));
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
