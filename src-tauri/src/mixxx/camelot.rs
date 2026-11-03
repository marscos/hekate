//! Canonical key → Camelot code (design D3).
//!
//! Mixxx stores a canonical `key_id` (1–12 = C…B major, 13–24 = Cm…Bm,
//! 0 = unknown) next to a `key` text whose notation depends on the user's
//! settings at analysis time. Only `key_id` is trusted.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum Letter {
    /// Minor keys.
    A,
    /// Major keys.
    B,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Camelot {
    pub num: u8,
    pub letter: Letter,
}

/// Maps a Mixxx `key_id` to its Camelot code, or `None` for unknown keys.
pub fn from_key_id(key_id: i64) -> Option<Camelot> {
    // Steps of a fifth (7 semitones) move one Camelot number; C major is 8B and
    // C minor is 5A.
    match key_id {
        1..=12 => Some(Camelot { num: (((key_id - 1) * 7 + 7) % 12 + 1) as u8, letter: Letter::B }),
        13..=24 => Some(Camelot { num: (((key_id - 13) * 7 + 4) % 12 + 1) as u8, letter: Letter::A }),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(key_id: i64) -> String {
        let c = from_key_id(key_id).unwrap();
        format!("{}{:?}", c.num, c.letter)
    }

    #[test]
    fn maps_all_24_keys() {
        // Major: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B
        let major = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
        // Minor: Cm, C#m, Dm, Ebm, Em, Fm, F#m, Gm, G#m, Am, Bbm, Bm
        let minor = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];
        for (i, expected) in major.iter().enumerate() {
            assert_eq!(code(i as i64 + 1), *expected, "key_id {}", i + 1);
        }
        for (i, expected) in minor.iter().enumerate() {
            assert_eq!(code(i as i64 + 13), *expected, "key_id {}", i + 13);
        }
    }

    #[test]
    fn unknown_keys_have_no_code() {
        assert_eq!(from_key_id(0), None);
        assert_eq!(from_key_id(25), None);
        assert_eq!(from_key_id(-1), None);
    }
}
