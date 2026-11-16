//! Album covers: where each track's cover is, thumbnails and their cache, and
//! the macOS permission-zone check (cover-art spec, design D1, D3, D6).

use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;

/// Where Mixxx says a track's cover is.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoverKind {
    /// In the audio file's tags.
    Embedded,
    /// An image file, already resolved to an absolute path.
    File(PathBuf),
}

/// A track's cover, kept on the Rust side only: the frontend never sees paths.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverSource {
    pub kind: CoverKind,
    pub audio_path: PathBuf,
    /// Cache key: hex of Mixxx's cover digest (or hash). Changes with the image.
    pub key: String,
}

/// Per-track file information from a library load.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct TrackFiles {
    /// Audio file of every track that has one, in id order.
    pub paths: BTreeMap<i64, PathBuf>,
    pub covers: HashMap<i64, CoverSource>,
}

pub mod thumbnail;
pub mod zones;

pub use thumbnail::thumbnail;

/// A `data:` URI for a JPEG, which the CSP already allows (`img-src data:`).
pub fn jpeg_data_uri(jpeg: &[u8]) -> String {
    format!("data:image/jpeg;base64,{}", base64(jpeg))
}

fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = chunk.iter().enumerate().fold(0u32, |n, (i, &b)| n | (b as u32) << (16 - 8 * i));
        for i in 0..4 {
            out.push(if i <= chunk.len() { ALPHABET[(n >> (18 - 6 * i) & 63) as usize] as char } else { '=' });
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_matches_the_standard_alphabet_and_padding() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"foobar"), "Zm9vYmFy");
        assert_eq!(base64(&[0xff, 0xfe, 0xfd]), "//79");
        assert_eq!(jpeg_data_uri(b"hi"), "data:image/jpeg;base64,aGk=");
    }
}
