//! Shared GitHub primitives: OAuth client id, keychain token storage, and the
//! HTTP helpers used by both `commands::github_auth` and
//! `commands::github_sync`.
//!
//! The OAuth token is the single source of truth for "is the user signed in".
//! It lives only in the OS keychain (never the settings store or any plaintext
//! file) and is read on demand — there is no in-memory cache to keep coherent.

use crate::error::AppError;

/// GitHub OAuth app client id. Public by design (device flow has no client
/// secret). Injected at build time via `GITHUB_CLIENT_ID`; falls back to a
/// placeholder so debug builds compile before the OAuth app is registered.
pub const CLIENT_ID: &str = match option_env!("GITHUB_CLIENT_ID") {
    Some(id) => id,
    None => "GITHUB_CLIENT_ID_NOT_SET",
};

/// Keychain coordinates for the OAuth token.
const KEYCHAIN_SERVICE: &str = "com.memento.github";
const KEYCHAIN_ACCOUNT: &str = "oauth-token";

const ACCEPT_JSON: &str = "application/json";
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

/// POST a urlencoded-style JSON body to a `github.com` OAuth endpoint and
/// deserialize the JSON response. (Device-flow endpoints accept a JSON body
/// when `Accept: application/json` is set.)
pub fn oauth_post_json<B: serde::Serialize, T: serde::de::DeserializeOwned>(
    url: &str,
    body: &B,
) -> Result<T, AppError> {
    ureq::post(url)
        .header("Accept", ACCEPT_JSON)
        .header("User-Agent", USER_AGENT)
        .send_json(body)
        .map_err(|e| AppError::Http(e.to_string()))?
        .body_mut()
        .read_json::<T>()
        .map_err(|e| AppError::Http(e.to_string()))
}
