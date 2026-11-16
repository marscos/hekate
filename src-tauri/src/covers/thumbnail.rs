//! Cover thumbnails: cache, then file, then thumbnail (design D3).
//!
//! Audio and image files are only ever opened read-only. The only files this
//! module writes are thumbnails in hekate's own cache folder.

use std::fs::{self, File};
use std::io::{self, BufReader};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::DynamicImage;
use lofty::config::ParseOptions;
use lofty::file::TaggedFileExt;
use lofty::picture::PictureType;
use lofty::probe::Probe;

use super::{CoverKind, CoverSource};

/// Thumbnails fit in a square this many pixels wide: 2× the largest place a
/// cover is drawn (the 64 px details card).
pub const SIZE: u32 = 128;
const QUALITY: u8 = 85;

#[derive(Debug, thiserror::Error)]
pub enum CoverError {
    /// Not found, permission denied, drive unplugged…
    #[error("reading {path}: {source}")]
    Io { path: PathBuf, source: io::Error },
    #[error("reading tags of {path}: {reason}")]
    Tags { path: PathBuf, reason: String },
    #[error("{0} has no embedded picture")]
    NoPicture(PathBuf),
    #[error("decoding cover: {0}")]
    Decode(String),
    #[error("encoding thumbnail: {0}")]
    Encode(String),
}

impl CoverError {
    #[cfg(test)]
    pub fn io_kind(&self) -> Option<io::ErrorKind> {
        match self {
            CoverError::Io { source, .. } => Some(source.kind()),
            _ => None,
        }
    }
}

fn io_error(path: &Path) -> impl FnOnce(io::Error) -> CoverError + '_ {
    move |source| CoverError::Io { path: path.to_path_buf(), source }
}

/// Where the thumbnail for a cover key is cached.
pub fn cache_path(cache_dir: &Path, key: &str) -> PathBuf {
    cache_dir.join(format!("{key}-{SIZE}.jpg"))
}

/// The cover's JPEG thumbnail. A cached thumbnail is returned without touching
/// the audio file, so it works with the track's drive unplugged.
pub fn thumbnail(source: &CoverSource, cache_dir: &Path) -> Result<Vec<u8>, CoverError> {
    match fs::read(cache_path(cache_dir, &source.key)) {
        Ok(jpeg) => Ok(jpeg),
        Err(_) => refresh(source, cache_dir),
    }
}

/// Reads the cover from its file and (re)writes its cached thumbnail, ignoring
/// any cached copy. A failure to write the cache still returns the thumbnail.
pub fn refresh(source: &CoverSource, cache_dir: &Path) -> Result<Vec<u8>, CoverError> {
    let jpeg = shrink(&read_image(source)?)?;
    if let Err(_e) = store(cache_dir, &source.key, &jpeg) {
        #[cfg(debug_assertions)]
        eprintln!("covers: could not cache {}: {_e}", source.key);
    }
    Ok(jpeg)
}

fn read_image(source: &CoverSource) -> Result<Vec<u8>, CoverError> {
    match &source.kind {
        CoverKind::Embedded => embedded_picture(&source.audio_path),
        CoverKind::File(path) => fs::read(path).map_err(io_error(path)),
    }
}

/// The front cover in the file's tags, or else its first picture.
fn embedded_picture(path: &Path) -> Result<Vec<u8>, CoverError> {
    // `File::open` is read-only. Opening it ourselves keeps I/O errors (missing,
    // denied) apart from tag parsing errors.
    let file = File::open(path).map_err(io_error(path))?;
    let tagged = Probe::new(BufReader::new(file))
        .options(ParseOptions::new().read_properties(false))
        .guess_file_type()
        .map_err(io_error(path))?
        .read()
        .map_err(|e| CoverError::Tags { path: path.to_path_buf(), reason: e.to_string() })?;
    let pictures = || tagged.tags().iter().flat_map(|t| t.pictures());
    pictures()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .or_else(|| pictures().next())
        .map(|p| p.data().to_vec())
        .ok_or_else(|| CoverError::NoPicture(path.to_path_buf()))
}

/// Decodes `bytes`, shrinks it to fit `SIZE`×`SIZE` and encodes it as JPEG.
fn shrink(bytes: &[u8]) -> Result<Vec<u8>, CoverError> {
    let image = image::load_from_memory(bytes).map_err(|e| CoverError::Decode(e.to_string()))?;
    let image = if image.width() > SIZE || image.height() > SIZE {
        image.resize(SIZE, SIZE, FilterType::Triangle)
    } else {
        image
    };
    let mut jpeg = Vec::new();
    DynamicImage::ImageRgb8(image.to_rgb8())
        .write_with_encoder(JpegEncoder::new_with_quality(&mut jpeg, QUALITY))
        .map_err(|e| CoverError::Encode(e.to_string()))?;
    Ok(jpeg)
}

/// Writes to a temporary file and renames it into place, so a half-written
/// thumbnail is never read as a cache hit.
fn store(cache_dir: &Path, key: &str, jpeg: &[u8]) -> io::Result<()> {
    static COUNTER: AtomicUsize = AtomicUsize::new(0);
    fs::create_dir_all(cache_dir)?;
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let tmp = cache_dir.join(format!(".{key}-{}-{n}.tmp", std::process::id()));
    fs::write(&tmp, jpeg)?;
    fs::rename(&tmp, cache_path(cache_dir, key)).inspect_err(|_| {
        let _ = fs::remove_file(&tmp);
    })
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::mixxx::fixture::TempDir;
    use std::collections::BTreeMap;

    pub fn fixtures() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/covers")
    }

    /// Copies a fixture into `dir` so a test can delete or inspect it.
    pub fn copy_fixture(name: &str, dir: &Path) -> PathBuf {
        let to = dir.join(name);
        fs::copy(fixtures().join(name), &to).unwrap();
        to
    }

    fn embedded(audio_path: PathBuf, key: &str) -> CoverSource {
        CoverSource { kind: CoverKind::Embedded, audio_path, key: key.into() }
    }

    fn dimensions(jpeg: &[u8]) -> (u32, u32) {
        let img = image::load_from_memory_with_format(jpeg, image::ImageFormat::Jpeg).expect("a JPEG");
        (img.width(), img.height())
    }

    fn snapshot(dir: &Path) -> BTreeMap<String, Vec<u8>> {
        fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| p.is_file())
            .map(|p| (p.file_name().unwrap().to_string_lossy().into_owned(), fs::read(&p).unwrap()))
            .collect()
    }

    #[test]
    fn embedded_covers_become_small_jpegs() {
        let cache = TempDir::new();
        for (name, key) in [("embedded.mp3", "mp3"), ("embedded.flac", "flac")] {
            let jpeg = thumbnail(&embedded(fixtures().join(name), key), cache.path()).unwrap();
            // The 300×200 picture fits 128 px wide, keeping its shape.
            assert_eq!(dimensions(&jpeg), (128, 85), "{name}");
            assert!(cache_path(cache.path(), key).exists());
        }
    }

    #[test]
    fn cover_image_files_become_small_jpegs() {
        let cache = TempDir::new();
        let source = CoverSource {
            kind: CoverKind::File(fixtures().join("folder.jpg")),
            audio_path: fixtures().join("missing.mp3"),
            key: "folder".into(),
        };
        assert_eq!(dimensions(&thumbnail(&source, cache.path()).unwrap()), (85, 128));
    }

    #[test]
    fn a_cached_cover_is_shown_without_its_audio_file() {
        let music = TempDir::new();
        let cache = TempDir::new();
        let source = embedded(copy_fixture("embedded.mp3", music.path()), "abc");
        let first = thumbnail(&source, cache.path()).unwrap();
        fs::remove_file(&source.audio_path).unwrap();
        assert_eq!(thumbnail(&source, cache.path()).unwrap(), first);
    }

    #[test]
    fn a_new_digest_misses_the_cache() {
        let music = TempDir::new();
        let cache = TempDir::new();
        let audio = copy_fixture("embedded.mp3", music.path());
        thumbnail(&embedded(audio.clone(), "old"), cache.path()).unwrap();
        fs::remove_file(&audio).unwrap();
        let err = thumbnail(&embedded(audio, "new"), cache.path()).unwrap_err();
        assert_eq!(err.io_kind(), Some(io::ErrorKind::NotFound));
    }

    #[test]
    fn corrupt_and_missing_covers_are_errors() {
        let cache = TempDir::new();
        let corrupt = thumbnail(&embedded(fixtures().join("corrupt.mp3"), "corrupt"), cache.path());
        assert!(matches!(corrupt, Err(CoverError::Decode(_))), "{corrupt:?}");
        let missing = thumbnail(&embedded(fixtures().join("nope.mp3"), "nope"), cache.path());
        assert_eq!(missing.unwrap_err().io_kind(), Some(io::ErrorKind::NotFound));
        // A file with no tags at all.
        let untagged = thumbnail(&embedded(fixtures().join("generate.sh"), "untagged"), cache.path());
        assert!(matches!(untagged, Err(CoverError::Tags { .. } | CoverError::NoPicture(_))), "{untagged:?}");
        assert_eq!(fs::read_dir(cache.path()).unwrap().count(), 0, "nothing cached for failures");
    }

    #[test]
    fn a_cache_write_failure_still_returns_the_cover() {
        let dir = TempDir::new();
        let not_a_dir = dir.path().join("file");
        fs::write(&not_a_dir, b"").unwrap();
        assert!(thumbnail(&embedded(fixtures().join("embedded.mp3"), "k"), &not_a_dir).is_ok());
    }

    #[test]
    fn audio_files_and_their_folder_are_untouched() {
        let music = TempDir::new();
        for name in ["embedded.mp3", "embedded.flac", "corrupt.mp3", "folder.jpg"] {
            copy_fixture(name, music.path());
        }
        let before = snapshot(music.path());
        let modified: Vec<_> = fs::read_dir(music.path()).unwrap().map(|e| e.unwrap().metadata().unwrap().modified().unwrap()).collect();
        let cache = TempDir::new();
        for (i, name) in ["embedded.mp3", "embedded.flac", "corrupt.mp3"].iter().enumerate() {
            let _ = refresh(&embedded(music.path().join(name), &i.to_string()), cache.path());
        }
        let file = CoverSource { kind: CoverKind::File(music.path().join("folder.jpg")), audio_path: music.path().join("x"), key: "f".into() };
        refresh(&file, cache.path()).unwrap();
        assert_eq!(snapshot(music.path()), before);
        let after: Vec<_> = fs::read_dir(music.path()).unwrap().map(|e| e.unwrap().metadata().unwrap().modified().unwrap()).collect();
        assert_eq!(after, modified);
        // And the checked-in fixtures are what the generator wrote.
        assert_eq!(fs::read(fixtures().join("embedded.mp3")).unwrap(), before["embedded.mp3"]);
    }
}
