//! Read-only access to a Mixxx library (design D2, D3, D16).

pub mod camelot;
pub mod db;
pub mod history;
pub mod library;
pub mod locate;

#[cfg(test)]
pub mod fixture;

use serde::Serialize;

/// Errors reported to the frontend when a library cannot be used.
#[derive(Debug, thiserror::Error, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum LibraryError {
    #[error("no Mixxx library found")]
    NotFound { searched: Vec<String> },
    #[error("permission denied reading {path}")]
    PermissionDenied { path: String },
    #[error("{path} is not a Mixxx library: {reason}")]
    InvalidLibrary { path: String, reason: String },
    #[error("could not read {path}: {reason}")]
    Read { path: String, reason: String },
}
