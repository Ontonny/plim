use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Pipeline status from GitLab API
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PipelineStatus {
    Created,
    Pending,
    Running,
    Success,
    Failed,
    Canceled,
    Skipped,
    Manual,
    Scheduled,
    #[serde(other)]
    Unknown,
}

/// Pipeline response from GitLab API
#[derive(Debug, Serialize, Deserialize)]
pub struct PipelineResponse {
    pub id: Option<u32>,
    pub iid: Option<u32>,
    pub project_id: Option<u32>,
    pub sha: Option<String>,
    #[serde(rename = "ref")]
    pub ref_name: Option<String>,
    pub status: PipelineStatus,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub web_url: Option<String>,
    pub before_sha: Option<String>,
    pub tag: Option<bool>,
    pub yaml_errors: Option<String>,
    pub user: Option<User>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub committed_at: Option<String>,
    pub duration: Option<u32>,
    pub queued_duration: Option<u32>,
    pub coverage: Option<String>,
    pub detailed_status: Option<DetailedStatus>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DetailedStatus {
    pub icon: Option<String>,
    pub text: Option<String>,
    pub label: Option<String>,
    pub group: Option<String>,
    pub tooltip: Option<String>,
    pub has_details: Option<bool>,
    pub details_path: Option<String>,
    pub illustration: Option<String>,
    pub favicon: Option<String>,
}


/// User information in GitLab responses
#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Option<u32>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub state: Option<String>,
    pub locked: Option<bool>,
    pub avatar_url: Option<String>,
    pub web_url: Option<String>,
}

/// Repository file response
#[derive(Debug, Serialize, Deserialize)]
pub struct FileResponse {
    pub file_name: Option<String>,
    pub file_path: Option<String>,
    pub size: Option<u64>,
    pub encoding: Option<String>,
    pub content: Option<String>,
    pub content_sha256: Option<String>,
    pub ref_name: Option<String>,
    pub blob_id: Option<String>,
    pub commit_id: Option<String>,
    pub last_commit_id: Option<String>,
    pub execute_filemode: Option<bool>,
}

/// Arguments for getting GitLab branches
#[derive(Debug, Clone)]
pub struct GitLabBranchesArgs {
    pub project_id: u64,
    pub token: String,
    pub search: Option<String>,
    pub regex: Option<String>,
}

/// Branch information
#[derive(Debug, Serialize, Deserialize)]
pub struct GlBranch {
    pub name: String,
    pub merged: Option<bool>,
    pub protected: Option<bool>,
    pub default: Option<bool>,
    pub developers_can_push: Option<bool>,
    pub developers_can_merge: Option<bool>,
    pub can_push: Option<bool>,
    pub web_url: Option<String>,
    pub commit: Option<Commit>,
}

/// Tag information
#[derive(Debug, Serialize, Deserialize)]
pub struct GlTag {
    pub name: String,
    pub message: Option<String>,
    pub target: Option<String>,
    pub commit: Option<Commit>,
    pub release: Option<Release>,
    pub protected: Option<bool>,
}

/// Commit information
#[derive(Debug, Serialize, Deserialize)]
pub struct Commit {
    pub id: Option<String>,
    pub short_id: Option<String>,
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub author_email: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub message: Option<String>,
}

/// Release information
#[derive(Debug, Serialize, Deserialize)]
pub struct Release {
    pub tag_name: Option<String>,
    pub description: Option<String>,
} 