use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Already exists: {0}")]
    AlreadyExists(String),
    #[error("No workspace is open")]
    NoWorkspace,
    #[error("GitHub authentication failed: {0}")]
    GitHubAuth(String),
    #[error("Git operation failed: {0}")]
    Git(String),
    #[error("HTTP request failed: {0}")]
    Http(String),
    #[error("Keychain error: {0}")]
    Keyring(String),
    /// Local working tree diverged from the remote and cannot fast-forward.
    /// Surfaced to the frontend as the push-or-discard banner.
    #[error("Local changes diverged from the remote")]
    Diverged,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<git2::Error> for AppError {
    fn from(err: git2::Error) -> Self {
        AppError::Git(err.to_string())
    }
}
