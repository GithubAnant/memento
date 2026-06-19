//! GitHub OAuth device-flow authentication.
//!
//! Flow: the frontend calls `github_begin_device_auth`, shows the returned
//! `user_code` + `verification_uri` (and opens the browser), then polls
//! `github_poll_device_auth` once per `interval` seconds until it returns a
//! terminal status. On success the token is written to the OS keychain
//! (see `crate::github`); the frontend never sees the token.
//!
//! Polling is driven one step at a time from the frontend rather than looped
//! in the backend, so the user can cancel by simply stopping — there is no
//! backend task to tear down and no in-memory device-flow state to track.

use crate::error::AppError;
use crate::github;
use serde::{Deserialize, Serialize};

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const DEVICE_GRANT_TYPE: &str = "urn:ietf:params:oauth:grant-type:device_code";

#[derive(Serialize)]
struct DeviceCodeRequest {
    client_id: &'static str,
    scope: &'static str,
}

/// Returned to the frontend so it can display the code and open the browser.
#[derive(Debug, Deserialize, Serialize)]
pub struct DeviceAuth {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Serialize)]
struct AccessTokenRequest {
    client_id: &'static str,
    device_code: String,
    grant_type: &'static str,
}

/// Raw access-token endpoint response: either `access_token` is set, or
/// `error` carries one of the device-flow error codes.
#[derive(Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    interval: Option<u64>,
}

/// Outcome of a single poll, mirrored as a discriminated union on the
/// frontend. `interval` on `Pending` reflects a `slow_down` backoff so the
/// frontend can widen its polling gap.
#[derive(Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum PollResult {
    /// Token stored in keychain; the user is signed in.
    Authorized,
    /// User has not yet entered the code. Keep polling at `interval` seconds.
    Pending { interval: u64 },
    /// Terminal failure (expired code, denied, etc.) with a human message.
    Failed { message: String },
}

/// Start the device flow: request a device + user code from GitHub.
#[tauri::command]
pub async fn github_begin_device_auth() -> Result<DeviceAuth, AppError> {
    tauri::async_runtime::spawn_blocking(|| {
        github::oauth_post_json::<_, DeviceAuth>(
            DEVICE_CODE_URL,
            &DeviceCodeRequest {
                client_id: github::CLIENT_ID,
                scope: "repo",
            },
        )
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Poll once for the access token. Call repeatedly (respecting the returned
/// `interval`) until the result is `Authorized` or `Failed`.
#[tauri::command]
pub async fn github_poll_device_auth(device_code: String) -> Result<PollResult, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let resp = github::oauth_post_json::<_, AccessTokenResponse>(
            ACCESS_TOKEN_URL,
            &AccessTokenRequest {
                client_id: github::CLIENT_ID,
                device_code,
                grant_type: DEVICE_GRANT_TYPE,
            },
        )?;

        if let Some(token) = resp.access_token {
            github::store_token(&token)?;
            return Ok(PollResult::Authorized);
        }

        match resp.error.as_deref() {
            Some("authorization_pending") => Ok(PollResult::Pending {
                interval: resp.interval.unwrap_or(5),
            }),
            // GitHub asks us to back off; bump the interval it suggests.
            Some("slow_down") => Ok(PollResult::Pending {
                interval: resp.interval.unwrap_or(10),
            }),
            Some("expired_token") => Ok(PollResult::Failed {
                message: "The code expired before you authorized. Try again.".into(),
            }),
            Some("access_denied") => Ok(PollResult::Failed {
                message: "Authorization was denied.".into(),
            }),
            Some(other) => Ok(PollResult::Failed {
                message: format!("GitHub authorization error: {other}"),
            }),
            None => Err(AppError::GitHubAuth(
                "Unexpected empty response from GitHub".into(),
            )),
        }
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
