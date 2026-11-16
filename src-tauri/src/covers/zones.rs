//! Reading one file per macOS permission zone after a library load, so any
//! file-access prompt appears while the DJ sets up (design D6).
//!
//! macOS asks once per protected category (removable or network volume,
//! Desktop, Documents, Downloads, iCloud Drive), the first time a file in it
//! is opened. One read per mounted volume and per top-level home folder
//! triggers every prompt the library can cause.

use std::collections::{BTreeMap, HashSet};
use std::fs::File;
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use super::{thumbnail, TrackFiles};

pub const VOLUMES: &str = "/Volumes";
/// iCloud Drive, protected separately from the rest of `~/Library`.
const ICLOUD: &str = "Library/Mobile Documents";
/// Tracks tried per zone when files are missing.
pub const TRIES_PER_ZONE: usize = 3;

/// A location macOS may protect separately.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Zone {
    /// A mounted volume under `/Volumes`, by name.
    Volume(String),
    /// A top-level folder in the user's home folder, such as `Music` or
    /// `Library/Mobile Documents`.
    HomeFolder(String),
    /// Anywhere else on the startup disk.
    BootDisk,
}

/// The zone holding `path`. Looks only at the path, never at the disk.
// The check itself goes through `zone_in`, whose volume root tests replace.
#[cfg_attr(not(test), allow(dead_code))]
pub fn zone_of(path: &Path, home: &Path) -> Zone {
    zone_in(path, Path::new(VOLUMES), home)
}

fn zone_in(path: &Path, volumes: &Path, home: &Path) -> Zone {
    // A file directly in a folder isn't inside one of its subfolders.
    let first_folder = |rest: &Path| match (rest.components().next(), rest.components().nth(1)) {
        (Some(Component::Normal(first)), Some(_)) => Some(first.to_string_lossy().into_owned()),
        _ => None,
    };
    if let Some(name) = path.strip_prefix(volumes).ok().and_then(first_folder) {
        return Zone::Volume(name);
    }
    if let Ok(rest) = path.strip_prefix(home) {
        if rest.starts_with(ICLOUD) && rest.components().count() > 2 {
            return Zone::HomeFolder(ICLOUD.into());
        }
        if let Some(name) = first_folder(rest) {
            return Zone::HomeFolder(name);
        }
    }
    Zone::BootDisk
}

/// Track ids per zone, both in a stable order (zones sorted, ids ascending).
pub fn by_zone(paths: &BTreeMap<i64, PathBuf>, volumes: &Path, home: &Path) -> BTreeMap<Zone, Vec<i64>> {
    let mut zones: BTreeMap<Zone, Vec<i64>> = BTreeMap::new();
    for (&id, path) in paths {
        zones.entry(zone_in(path, volumes, home)).or_default().push(id);
    }
    zones
}

/// Zones checked this session. Checks run one at a time, so macOS shows at
/// most one prompt at once.
#[derive(Default)]
pub struct CheckedZones {
    done: Mutex<HashSet<Zone>>,
    running: Mutex<()>,
}

pub type Opener = Arc<dyn Fn(&Path) -> io::Result<()> + Send + Sync>;

pub struct ZoneCheck {
    pub volumes: PathBuf,
    pub home: PathBuf,
    pub cache_dir: PathBuf,
    /// Opens a track file read-only; replaced in tests.
    pub open: Opener,
}

/// Opens the file read-only and reads its first 4 KB, which is what makes
/// macOS ask for access.
fn open_and_read(path: &Path) -> io::Result<()> {
    let mut buf = [0u8; 4096];
    File::open(path)?.read(&mut buf).map(|_| ())
}

impl ZoneCheck {
    pub fn new(home: PathBuf, cache_dir: PathBuf) -> Self {
        ZoneCheck { volumes: VOLUMES.into(), home, cache_dir, open: Arc::new(open_and_read) }
    }

    /// Reads one track file in each zone not yet checked this session and
    /// returns the zones it checked. A volume that isn't mounted is left for a
    /// later load. A track with a cover also warms the cover cache.
    pub fn run(&self, files: &TrackFiles, checked: &CheckedZones) -> Vec<Zone> {
        let _one_at_a_time = checked.running.lock().unwrap();
        let mut newly = Vec::new();
        for (zone, ids) in by_zone(&files.paths, &self.volumes, &self.home) {
            if checked.done.lock().unwrap().contains(&zone) {
                continue;
            }
            if let Zone::Volume(name) = &zone
                && !self.volumes.join(name).is_dir()
            {
                continue;
            }
            for id in ids.iter().take(TRIES_PER_ZONE) {
                match (self.open)(&files.paths[id]) {
                    Err(e) if e.kind() == io::ErrorKind::NotFound => continue,
                    Err(_denied_or_other) => break,
                    Ok(()) => {
                        if let Some(source) = files.covers.get(id) {
                            let _ = thumbnail::refresh(source, &self.cache_dir);
                        }
                        break;
                    }
                }
            }
            // Whatever the outcome: allowed, denied or missing.
            checked.done.lock().unwrap().insert(zone.clone());
            newly.push(zone);
        }
        newly
    }

    /// Runs the check on a background thread, so nothing waits on it.
    pub fn spawn(self, files: TrackFiles, checked: Arc<CheckedZones>) -> JoinHandle<Vec<Zone>> {
        std::thread::spawn(move || self.run(&files, &checked))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::covers::thumbnail::tests::copy_fixture;
    use crate::covers::{CoverKind, CoverSource};
    use crate::mixxx::fixture::TempDir;
    use std::fs;
    use std::sync::mpsc;
    use std::time::Duration;

    const HOME: &str = "/Users/dj";

    fn zone(path: &str) -> Zone {
        zone_of(Path::new(path), Path::new(HOME))
    }

    #[test]
    fn zones_follow_volumes_and_home_folders() {
        assert_eq!(zone("/Volumes/REDRAGON/a/b.flac"), Zone::Volume("REDRAGON".into()));
        assert_eq!(zone("/Users/dj/Music/x.mp3"), Zone::HomeFolder("Music".into()));
        assert_eq!(zone("/Users/dj/Music/y/z.mp3"), Zone::HomeFolder("Music".into()));
        assert_eq!(
            zone("/Users/dj/Library/Mobile Documents/com~apple~CloudDocs/set/a.mp3"),
            Zone::HomeFolder("Library/Mobile Documents".into())
        );
        assert_eq!(zone("/Users/dj/Library/Audio/a.mp3"), Zone::HomeFolder("Library".into()));
        assert_eq!(zone("/opt/music/a.mp3"), Zone::BootDisk);
        assert_eq!(zone("/Users/dj/loose.mp3"), Zone::BootDisk);
        assert_eq!(zone("/Users/djane/Music/a.mp3"), Zone::BootDisk, "another user's home");
    }

    #[test]
    fn a_library_in_many_folders_on_one_volume_is_one_zone() {
        let paths: BTreeMap<i64, PathBuf> =
            (0..344).map(|i| (i, PathBuf::from(format!("/Volumes/REDRAGON/Album {i}/01.flac")))).collect();
        let zones = by_zone(&paths, Path::new(VOLUMES), Path::new(HOME));
        assert_eq!(zones.len(), 1);
        assert_eq!(zones[&Zone::Volume("REDRAGON".into())].len(), 344);
    }

    #[test]
    fn tracks_are_grouped_in_id_order() {
        let paths = BTreeMap::from([
            (3, PathBuf::from("/Users/dj/Music/c.mp3")),
            (1, PathBuf::from("/Users/dj/Downloads/a.mp3")),
            (2, PathBuf::from("/Users/dj/Music/b.mp3")),
        ]);
        let zones = by_zone(&paths, Path::new(VOLUMES), Path::new(HOME));
        assert_eq!(zones[&Zone::HomeFolder("Music".into())], [2, 3]);
        assert_eq!(zones[&Zone::HomeFolder("Downloads".into())], [1]);
    }

    /// A temporary machine: `vols/` stands in for `/Volumes`, `home/` for `~`.
    struct Machine {
        root: TempDir,
        opened: Arc<Mutex<Vec<PathBuf>>>,
    }

    impl Machine {
        fn new() -> Self {
            let root = TempDir::new();
            fs::create_dir_all(root.path().join("vols")).unwrap();
            fs::create_dir_all(root.path().join("home")).unwrap();
            Machine { root, opened: Arc::default() }
        }

        fn path(&self, rel: &str) -> PathBuf {
            self.root.path().join(rel)
        }

        fn put(&self, rel: &str) -> PathBuf {
            let path = self.path(rel);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::copy(crate::covers::thumbnail::tests::fixtures().join("embedded.mp3"), &path).unwrap();
            path
        }

        fn check(&self) -> ZoneCheck {
            let opened = self.opened.clone();
            ZoneCheck {
                volumes: self.path("vols"),
                home: self.path("home"),
                cache_dir: self.path("cache"),
                open: Arc::new(move |p| {
                    opened.lock().unwrap().push(p.to_path_buf());
                    open_and_read(p)
                }),
            }
        }

        fn opened(&self) -> Vec<PathBuf> {
            std::mem::take(&mut self.opened.lock().unwrap())
        }
    }

    fn files(paths: &[(i64, PathBuf)]) -> TrackFiles {
        TrackFiles { paths: paths.iter().cloned().collect(), ..Default::default() }
    }

    #[test]
    fn one_file_per_zone_once_per_session() {
        let m = Machine::new();
        let lib = files(&[
            (1, m.put("home/Music/a/1.mp3")),
            (2, m.put("home/Music/b/2.mp3")),
            (3, m.put("home/Downloads/3.mp3")),
            (4, m.put("vols/USB/x/4.mp3")),
            (5, m.put("vols/USB/y/5.mp3")),
        ]);
        let checked = CheckedZones::default();
        let zones = m.check().run(&lib, &checked);
        assert_eq!(zones.len(), 3);
        let mut opened = m.opened();
        opened.sort();
        let mut expected = [lib.paths[&1].clone(), lib.paths[&3].clone(), lib.paths[&4].clone()];
        expected.sort();
        assert_eq!(opened, expected);

        assert!(m.check().run(&lib, &checked).is_empty(), "a reload checks nothing new");
        assert!(m.opened().is_empty());
    }

    #[test]
    fn an_unmounted_volume_is_checked_once_it_appears() {
        let m = Machine::new();
        let usb = m.path("vols/USB/a/1.mp3");
        let lib = files(&[(1, usb.clone()), (2, m.put("home/Music/2.mp3"))]);
        let checked = CheckedZones::default();
        assert_eq!(m.check().run(&lib, &checked), [Zone::HomeFolder("Music".into())]);
        m.opened();

        m.put("vols/USB/a/1.mp3");
        assert_eq!(m.check().run(&lib, &checked), [Zone::Volume("USB".into())]);
        assert_eq!(m.opened(), [usb]);
    }

    #[test]
    fn a_missing_file_falls_through_to_the_next_track() {
        let m = Machine::new();
        let second = m.put("home/Music/2.mp3");
        let mut lib = files(&[
            (1, m.path("home/Music/gone.mp3")),
            (2, second.clone()),
            (3, m.put("home/Music/3.mp3")),
        ]);
        lib.covers.insert(2, CoverSource { kind: CoverKind::Embedded, audio_path: second.clone(), key: "two".into() });
        let checked = CheckedZones::default();
        m.check().run(&lib, &checked);
        assert_eq!(m.opened(), [m.path("home/Music/gone.mp3"), second]);
        assert!(thumbnail::cache_path(&m.path("cache"), "two").exists(), "the check warms the cache");
    }

    #[test]
    fn a_zone_with_only_missing_files_is_marked_after_three_tries() {
        let m = Machine::new();
        let lib = files(&(1..=5).map(|i| (i, m.path(&format!("home/Music/{i}.mp3")))).collect::<Vec<_>>());
        let checked = CheckedZones::default();
        assert_eq!(m.check().run(&lib, &checked).len(), 1);
        assert_eq!(m.opened().len(), TRIES_PER_ZONE);
        assert!(m.check().run(&lib, &checked).is_empty());
    }

    #[test]
    fn the_check_refreshes_a_cached_cover() {
        let m = Machine::new();
        let audio = copy_fixture("embedded.mp3", &{
            fs::create_dir_all(m.path("home/Music")).unwrap();
            m.path("home/Music")
        });
        let mut lib = files(&[(1, audio.clone())]);
        lib.covers.insert(1, CoverSource { kind: CoverKind::Embedded, audio_path: audio, key: "k".into() });
        let cached = thumbnail::cache_path(&m.path("cache"), "k");
        fs::create_dir_all(cached.parent().unwrap()).unwrap();
        fs::write(&cached, b"stale").unwrap();
        m.check().run(&lib, &CheckedZones::default());
        assert_ne!(fs::read(&cached).unwrap(), b"stale");
    }

    #[test]
    fn spawning_returns_before_the_check_finishes() {
        let m = Machine::new();
        let lib = files(&[(1, m.put("home/Music/1.mp3"))]);
        let (release, wait) = mpsc::channel::<()>();
        let wait = Mutex::new(wait);
        let mut check = m.check();
        check.open = Arc::new(move |_| {
            wait.lock().unwrap().recv_timeout(Duration::from_secs(5)).unwrap();
            Ok(())
        });
        let handle = check.spawn(lib, Arc::default());
        std::thread::sleep(Duration::from_millis(50));
        assert!(!handle.is_finished(), "still waiting on the open (as on a macOS prompt)");
        release.send(()).unwrap();
        assert_eq!(handle.join().unwrap().len(), 1);
    }
}
