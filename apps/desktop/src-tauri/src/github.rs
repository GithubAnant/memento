//! Shared GitHub primitives: keychain token storage and the HTTP helper used
//! by both `commands::github_auth` and `commands::github_sync`.
//!
//! The Personal Access Token is the single source of truth for "is the user
//! signed in". It lives only in the OS keychain (never the settings store or
//! any plaintext file) and is read on demand — there is no in-memory cache to
//! keep coherent.

use crate::error::AppError;

/// Keychain coordinates for the access token.
const KEYCHAIN_SERVICE: &str = "com.memento.github";
const KEYCHAIN_ACCOUNT: &str = "oauth-token";

const GITHUB_API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "Memento";

fn keychain_entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
        .map_err(|e| AppError::Keyring(e.to_string()))
}

/// Persist the OAuth token to the OS keychain.
pub fn store_token(token: &str) -> Result<(), AppError> {
    keychain_entry()?
        .set_password(token)
        .map_err(|e| AppError::Keyring(e.to_string()))
}

/// Read the OAuth token from the keychain. `Ok(None)` means no token is
/// stored (signed out); `Err` is a real keychain failure.
pub fn load_token() -> Result<Option<String>, AppError> {
    match keychain_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Keyring(e.to_string())),
    }
}

/// Read the token or fail with a clear "not authenticated" error. Used by
/// every command that needs to talk to GitHub.
pub fn require_token() -> Result<String, AppError> {
    load_token()?.ok_or_else(|| AppError::GitHubAuth("Not signed in to GitHub".into()))
}

/// Delete the token from the keychain. Idempotent: a missing entry is success.
pub fn delete_token() -> Result<(), AppError> {
    match keychain_entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Keyring(e.to_string())),
    }
}

/// GET a GitHub REST endpoint and deserialize the JSON response.
pub fn api_get_json<T: serde::de::DeserializeOwned>(url: &str, token: &str) -> Result<T, AppError> {
    ureq::get(url)
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", &format!("Bearer {token}"))
        .header("X-GitHub-Api-Version", GITHUB_API_VERSION)
        .header("User-Agent", USER_AGENT)
        .call()
        .map_err(|e| AppError::Http(e.to_string()))?
        .body_mut()
        .read_json::<T>()
        .map_err(|e| AppError::Http(e.to_string()))
}
