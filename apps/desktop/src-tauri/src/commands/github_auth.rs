//! GitHub authentication via Personal Access Token (PAT).
//!
//! The user creates a classic PAT with the `repo` scope on GitHub and pastes
//! it into the connect dialog. `github_save_token` validates it against
//! `GET /user` before persisting — an invalid token is rejected with a clear
//! message and never written. On success the token goes to the OS keychain
//! (see `crate::github`) and is the single source of truth for "signed in".
//! The keychain holds the only copy; the frontend keeps the token just long
//! enough to submit it.

use crate::error::AppError;
use crate::github;
use serde::{Deserialize, Serialize};

const USER_URL: &str = "https://api.github.com/user";

/// The authenticated user, returned so the UI can confirm who connected.
#[derive(Debug, Deserialize, Serialize)]
pub struct GitHubUser {
    pub login: String,
}

/// Validate a PAT and, if it works, store it in the keychain.
///
/// Validation is a `GET /user` with the token: a 401 (or any HTTP error)
/// surfaces as a failure and nothing is stored, so we never persist a token
/// we couldn't authenticate with.
#[tauri::command]
pub async fn github_save_token(token: String) -> Result<GitHubUser, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = token.trim().to_string();
        if token.is_empty() {
            return Err(AppError::GitHubAuth("Token is empty.".into()));
        }

        // Validate before storing. Map the opaque HTTP error to a friendly
        // hint — the overwhelmingly common cause is a bad/expired token or a
        // missing `repo` scope.
        let user = github::api_get_json::<GitHubUser>(USER_URL, &token).map_err(|_| {
            AppError::GitHubAuth(
                "That token didn't work. Make sure it's a valid GitHub token with the `repo` scope."
                    .into(),
            )
        })?;

        github::store_token(&token)?;
        Ok(user)
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// True if a token is present in the keychain (i.e. the user is signed in).
#[tauri::command]
pub async fn github_signed_in() -> Result<bool, AppError> {
    tauri::async_runtime::spawn_blocking(|| Ok(github::load_token()?.is_some()))
        .await
        .map_err(|e| AppError::Io(e.to_string()))?
}

/// Sign out: remove the token from the keychain.
#[tauri::command]
pub async fn github_sign_out() -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(github::delete_token)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?
}
