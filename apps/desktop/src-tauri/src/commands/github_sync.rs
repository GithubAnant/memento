//! GitHub repo sync over embedded libgit2 (`git2`).
//!
//! Clones the memory repo to `~/Desktop/Memento/<repo>/`, keeps it fresh via
//! fast-forward fetch, and pushes the user's occasional edits. Transport is
//! token-authenticated HTTPS; the token is read from the keychain on demand
//! (`crate::github`), never embedded in `.git/config`.
//!
//! ## Use model (single author, agent-primary)
//! The Poke agent is the primary writer; the user mostly reads + occasionally
//! edits. So fetch is expected to fast-forward and push to succeed (or need
//! one fetch-retry). The only divergence we handle is "cannot fast-forward"
//! (remote moved *and* there are local commits/edits): we stop and surface a
//! push-or-discard choice rather than ever silently clobbering local work.
//!
//! ## Why no file-watcher coupling
//! Git's working-tree writes during fetch are deliberately *not* suppressed:
//! - Push is a manual button, never auto-fired, so pulled writes cannot start
//!   a push loop.
//! - The dirty count comes from `git status` (working tree vs HEAD), not from
//!   watcher events, so fetched files never inflate it.
//! - We *want* a fetched change to fire `fs:file-changed` so an open editor
//!   tab reloads the fresh remote content. A fast-forward only runs when the
//!   tree is clean (see `do_fetch`), so there is no in-progress edit to lose.

use crate::error::AppError;
use crate::github;
use git2::{
    build::CheckoutBuilder, Cred, FetchOptions, PushOptions, RemoteCallbacks, Repository,
    ResetType, Signature, StatusOptions,
};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::path::PathBuf;
use tauri::Manager;

const COMMIT_AUTHOR: &str = "Memento";
const COMMIT_EMAIL: &str = "memento@users.noreply.github.com";

/// A repo the signed-in user can pick as their memory vault.
#[derive(Debug, Deserialize, Serialize)]
pub struct RepoInfo {
    pub full_name: String,
    pub private: bool,
    #[serde(default)]
    pub default_branch: String,
    #[serde(rename = "updated_at", default)]
    pub updated_at: String,
}

/// Result of a clone: the local path the frontend should open as a workspace.
#[derive(Serialize)]
pub struct CloneResult {
    pub path: String,
}

/// Working-tree sync state, surfaced by the status-bar control.
#[derive(Serialize)]
pub struct SyncStatus {
    pub branch: String,
    pub dirty_count: usize,
}

/// Outcome of a fetch. `diverged` means the local branch could not
/// fast-forward (remote moved with local commits/edits present).
#[derive(Serialize)]
pub struct FetchResult {
    pub changed: bool,
    pub diverged: bool,
}

// ---------------------------------------------------------------------------
// git2 helpers (pure; operate on a path + token)
// ---------------------------------------------------------------------------

/// Build remote callbacks that authenticate with the OAuth token. GitHub
/// accepts the token as the username with an empty password over HTTPS.
fn auth_callbacks(token: &str) -> RemoteCallbacks<'_> {
    let mut cb = RemoteCallbacks::new();
    cb.credentials(move |_url, _username, _allowed| Cred::userpass_plaintext(token, ""));
    cb
}

/// Current local branch short name (e.g. `main`), from HEAD.
fn current_branch(repo: &Repository) -> Result<String, AppError> {
    let head = repo.head()?;
    let name = head.shorthand()?;
    Ok(name.to_string())
}

/// Count entries that differ from HEAD (working tree or index, incl.
/// untracked). This is the source of truth for "files to push".
fn dirty_count(repo: &Repository) -> Result<usize, AppError> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true).include_ignored(false);
    let statuses = repo.statuses(Some(&mut opts))?;
    let count = statuses
        .iter()
        .filter(|e| !e.status().is_ignored() && e.status() != git2::Status::CURRENT)
        .count();
    Ok(count)
}

fn open_repo(path: &str) -> Result<Repository, AppError> {
    Repository::open(path).map_err(|e| AppError::Git(e.to_string()))
}

/// Fetch `origin` and fast-forward the current branch when possible.
///
/// Returns `diverged = true` (without mutating the tree) when the branch
/// cannot fast-forward, OR when a fast-forward is available but the working
/// tree has uncommitted changes — in both cases advancing would risk losing
/// local work, so we defer to the user (push-or-discard banner).
fn do_fetch(repo: &Repository, token: &str) -> Result<FetchResult, AppError> {
    let branch = current_branch(repo)?;

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(auth_callbacks(token));
    repo.find_remote("origin")?
        .fetch(&[&branch], Some(&mut fetch_opts), None)?;

    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let target = repo.reference_to_annotated_commit(&fetch_head)?;
    let (analysis, _) = repo.merge_analysis(&[&target])?;

    if analysis.is_up_to_date() {
        return Ok(FetchResult {
            changed: false,
            diverged: false,
        });
    }

    if analysis.is_fast_forward() {
        // Refuse to fast-forward over uncommitted local edits — treat as a
        // divergence the user must resolve, never a silent overwrite.
        if dirty_count(repo)? > 0 {
            return Ok(FetchResult {
                changed: false,
                diverged: true,
            });
        }

        let refname = format!("refs/heads/{branch}");
        let mut reference = repo.find_reference(&refname)?;
        reference.set_target(target.id(), "memento: fast-forward")?;
        repo.set_head(&refname)?;
        // Safe checkout (no force): updates clean files, errors rather than
        // clobbering if anything unexpected is locally modified.
        repo.checkout_head(Some(CheckoutBuilder::new().safe()))?;
        return Ok(FetchResult {
            changed: true,
            diverged: false,
        });
    }

    // Normal merge required (both sides have commits) → diverged.
    Ok(FetchResult {
        changed: false,
        diverged: true,
    })
}

/// Stage all changes, commit (if anything changed), and push to origin.
/// Returns `Ok(false)` if there was nothing to commit or push.
fn do_commit_and_push(repo: &Repository, token: &str, message: &str) -> Result<bool, AppError> {
    let branch = current_branch(repo)?;

    // Stage everything (new, modified, deleted).
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    let tree_oid = index.write_tree()?;
    let tree = repo.find_tree(tree_oid)?;

    let head_commit = repo.head()?.peel_to_commit()?;
    let tree_changed = head_commit.tree()?.id() != tree_oid;

    if tree_changed {
        let sig = Signature::now(COMMIT_AUTHOR, COMMIT_EMAIL)?;
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&head_commit])?;
    }

    // Push. Capture per-ref rejection (remote moved → non-fast-forward).
    let rejection: RefCell<Option<String>> = RefCell::new(None);
    let pushed = {
        let mut cb = auth_callbacks(token);
        cb.push_update_reference(|_refname, status| {
            if let Some(msg) = status {
                *rejection.borrow_mut() = Some(msg.to_string());
            }
            Ok(())
        });
        let mut push_opts = PushOptions::new();
        push_opts.remote_callbacks(cb);
        let refspec = format!("refs/heads/{branch}:refs/heads/{branch}");
        repo.find_remote("origin")?
            .push(&[&refspec], Some(&mut push_opts))?;
        rejection.borrow().is_none()
    };

    if !pushed {
        // Remote rejected the update (it moved since our last fetch).
        return Err(AppError::Diverged);
    }

    Ok(tree_changed)
}

/// Hard-reset the working tree to `origin/<branch>`, discarding local changes.
/// The one destructive op; only ever called from the explicit discard action.
fn do_discard_local(repo: &Repository, token: &str) -> Result<(), AppError> {
    let branch = current_branch(repo)?;

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(auth_callbacks(token));
    repo.find_remote("origin")?
        .fetch(&[&branch], Some(&mut fetch_opts), None)?;

    // Reset to FETCH_HEAD (the just-fetched tip), not refs/remotes/origin/*:
    // a bare-refspec fetch only reliably updates FETCH_HEAD, so reading the
    // remote-tracking ref could hard-reset to a stale commit.
    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let remote_commit = fetch_head.peel_to_commit()?;
    repo.reset(
        remote_commit.as_object(),
        ResetType::Hard,
        Some(CheckoutBuilder::new().force()),
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Pointer file (~/.memento/state.json) for agent discovery
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
struct PointerFile {
    #[serde(rename = "memoryPath")]
    memory_path: String,
    repo: String,
}

fn pointer_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let home = app
        .path()
        .home_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    let dir = home.join(".memento");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("state.json"))
}

/// Record the active memory clone path so external agents (Poke, Claude Code,
/// scripts) can resolve the vault without git or a token.
fn write_pointer(app: &tauri::AppHandle, memory_path: &str, repo: &str) -> Result<(), AppError> {
    let pointer = PointerFile {
        memory_path: memory_path.to_string(),
        repo: repo.to_string(),
    };
    let data = serde_json::to_string_pretty(&pointer).map_err(|e| AppError::Io(e.to_string()))?;
    std::fs::write(pointer_path(app)?, data)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------

/// List repos the signed-in user can access (private included), most recently
/// updated first, so the user can pick their memory vault.
#[tauri::command]
pub async fn github_list_repos() -> Result<Vec<RepoInfo>, AppError> {
    tauri::async_runtime::spawn_blocking(|| {
        let token = github::require_token()?;
        let mut all = Vec::new();
        // Paginate; GitHub caps per_page at 100.
        for page in 1..=10 {
            let url = format!(
                "https://api.github.com/user/repos?per_page=100&page={page}&sort=updated&affiliation=owner,collaborator"
            );
            let batch: Vec<RepoInfo> = github::api_get_json(&url, &token)?;
            let done = batch.len() < 100;
            all.extend(batch);
            if done {
                break;
            }
        }
        Ok(all)
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Clone `full_name` (e.g. `owner/repo`) to `~/Desktop/Memento/<repo>/`,
/// write the agent pointer file, and return the local path for the frontend
/// to open as a workspace.
#[tauri::command]
pub async fn github_clone_repo(
    full_name: String,
    app: tauri::AppHandle,
) -> Result<CloneResult, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = github::require_token()?;

        let repo_name = full_name
            .rsplit('/')
            .next()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| AppError::GitHubAuth(format!("Invalid repo name: {full_name}")))?
            .to_string();

        let home = app
            .path()
            .home_dir()
            .map_err(|e| AppError::Io(e.to_string()))?;
        let dest = home.join("Desktop").join("Memento").join(&repo_name);

        if dest.exists() {
            return Err(AppError::AlreadyExists(dest.to_string_lossy().to_string()));
        }
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let url = format!("https://github.com/{full_name}.git");
        let mut fetch_opts = FetchOptions::new();
        fetch_opts.remote_callbacks(auth_callbacks(&token));
        let mut builder = git2::build::RepoBuilder::new();
        builder.fetch_options(fetch_opts);
        builder
            .clone(&url, &dest)
            .map_err(|e| AppError::Git(e.to_string()))?;

        let path = dest.to_string_lossy().to_string();
        write_pointer(&app, &path, &full_name)?;
        Ok(CloneResult { path })
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Current sync status (branch + count of files differing from HEAD).
#[tauri::command]
pub async fn github_sync_status(workspace_path: String) -> Result<SyncStatus, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let repo = open_repo(&workspace_path)?;
        Ok(SyncStatus {
            branch: current_branch(&repo)?,
            dirty_count: dirty_count(&repo)?,
        })
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Fetch origin and fast-forward when possible. See `do_fetch`.
#[tauri::command]
pub async fn github_fetch(workspace_path: String) -> Result<FetchResult, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = github::require_token()?;
        let repo = open_repo(&workspace_path)?;
        do_fetch(&repo, &token)
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Commit all dirty files and push. If the remote rejects the push because it
/// moved (non-fast-forward), fetch once: if that fast-forwards, retry the
/// push; otherwise surface `Diverged` for the push-or-discard banner.
#[tauri::command]
pub async fn github_push(workspace_path: String, message: String) -> Result<SyncStatus, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = github::require_token()?;
        let repo = open_repo(&workspace_path)?;

        match do_commit_and_push(&repo, &token, &message) {
            Ok(_) => {}
            Err(AppError::Diverged) => {
                // Remote moved. Try to reconcile by fast-forwarding, then
                // push again. If the tree diverged for real, give up.
                let fetched = do_fetch(&repo, &token)?;
                if fetched.diverged {
                    return Err(AppError::Diverged);
                }
                do_commit_and_push(&repo, &token, &message)?;
            }
            Err(e) => return Err(e),
        }

        Ok(SyncStatus {
            branch: current_branch(&repo)?,
            dirty_count: dirty_count(&repo)?,
        })
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}

/// Discard local changes by hard-resetting to `origin/<branch>`. Destructive;
/// the frontend only calls this after explicit user confirmation.
#[tauri::command]
pub async fn github_discard_local(workspace_path: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = github::require_token()?;
        let repo = open_repo(&workspace_path)?;
        do_discard_local(&repo, &token)
    })
    .await
    .map_err(|e| AppError::Io(e.to_string()))?
}
