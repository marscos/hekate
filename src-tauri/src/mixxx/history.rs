//! Following Mixxx's latest history playlist (design D4).
//!
//! Mixxx appends a row to the current history playlist when a track starts
//! playing. Polling that playlist gives now-playing (its newest row) and the
//! tracks played tonight (all of its rows).

use std::path::{Path, PathBuf};

use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;

use super::db::{self, with_retry};
use super::library::{history_entries, HistoryEntry, HISTORY_HIDDEN};

pub const EVENT: &str = "now-playing";

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistorySnapshot {
    pub playlist_id: i64,
    /// In play order; the last entry is now-playing.
    pub entries: Vec<HistoryEntry>,
}

/// Remembers what it last reported so it only reports changes.
#[derive(Default)]
pub struct Poller {
    conn: Option<(PathBuf, Connection)>,
    /// (playlist id, newest position, row count) of the last report.
    last: Option<(i64, i64, usize)>,
}

impl Poller {
    /// Reads the latest history playlist and returns it if it changed since
    /// the last call. Errors (locked, missing, unreadable) report nothing.
    pub fn poll(&mut self, path: &Path) -> Option<HistorySnapshot> {
        match self.read(path) {
            Ok(Some(snapshot)) => {
                let key = (
                    snapshot.playlist_id,
                    snapshot.entries.last().map_or(0, |e| e.position),
                    snapshot.entries.len(),
                );
                (self.last != Some(key)).then(|| {
                    self.last = Some(key);
                    snapshot
                })
            }
            Ok(None) => None,
            Err(_) => {
                // Reconnect next time; the file may have been replaced.
                self.conn = None;
                None
            }
        }
    }

    fn read(&mut self, path: &Path) -> Result<Option<HistorySnapshot>, ()> {
        if self.conn.as_ref().is_none_or(|(p, _)| p != path) {
            let conn = db::open(path).map_err(|_| ())?;
            self.conn = Some((path.to_path_buf(), conn));
            self.last = None;
        }
        let conn = &self.conn.as_ref().unwrap().1;
        with_retry(|| {
            let latest: Option<i64> = conn
                .query_row("SELECT id FROM Playlists WHERE hidden = ?1 ORDER BY id DESC LIMIT 1", [HISTORY_HIDDEN], |r| r.get(0))
                .optional()?;
            latest
                .map(|playlist_id| Ok(HistorySnapshot { playlist_id, entries: history_entries(conn, playlist_id)? }))
                .transpose()
        })
        .map_err(|_| ())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mixxx::fixture::{self, TempDir};
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    #[test]
    fn reports_the_latest_history_once() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let mut poller = Poller::default();
        let first = poller.poll(&path).unwrap();
        assert_eq!(first.playlist_id, 5);
        assert_eq!(first.entries.last().unwrap().track_id, 1);
        assert_eq!(poller.poll(&path), None, "no change, no report");
    }

    #[test]
    fn reports_a_newly_played_track() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let mut poller = Poller::default();
        poller.poll(&path);
        fixture::append_history(&path, 2, "2026-10-16 21:08:00");
        let next = poller.poll(&path).unwrap();
        assert_eq!(next.entries.last().unwrap().track_id, 2);
        assert_eq!(next.entries.len(), 3);
    }

    #[test]
    fn unreadable_library_reports_nothing() {
        let dir = TempDir::new();
        let mut poller = Poller::default();
        assert_eq!(poller.poll(&dir.path().join("missing.sqlite")), None);
    }

    #[test]
    fn a_polling_loop_sees_a_new_track_within_two_seconds() {
        let dir = TempDir::new();
        let path = fixture::create(dir.path());
        let (tx, rx) = mpsc::channel();
        let loop_path = path.clone();
        std::thread::spawn(move || {
            let mut poller = Poller::default();
            let start = Instant::now();
            while start.elapsed() < Duration::from_secs(5) {
                if let Some(s) = poller.poll(&loop_path) {
                    if tx.send(s).is_err() {
                        return;
                    }
                }
                std::thread::sleep(Duration::from_secs(1));
            }
        });
        rx.recv_timeout(Duration::from_secs(2)).unwrap(); // initial snapshot
        let played = Instant::now();
        fixture::append_history(&path, 2, "2026-10-16 21:08:00");
        let next = rx.recv_timeout(Duration::from_secs(2)).expect("new track reported within 2 s");
        assert!(played.elapsed() < Duration::from_secs(2));
        assert_eq!(next.entries.last().unwrap().track_id, 2);
    }
}
