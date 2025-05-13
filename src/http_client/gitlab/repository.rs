use std::collections::HashMap;

use super::GitlabClient;
use super::responses::{FileResponse, GlBranch, GlTag, GitLabBranchesArgs};
use urlencoding::encode;
use log::{info, trace};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("Failed to parse repository response: {0}")]
    ParseError(#[from] serde_json::Error),
    #[error("API request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("Invalid file path: {0}")]
    InvalidFilePath(String),
    #[error("Invalid reference: {0}")]
    InvalidReference(String),
}

impl RepositoryError {
    pub fn invalid_file_path(message: &str) -> Self {
        RepositoryError::InvalidFilePath(message.to_string())
    }
}

impl GitlabClient {
    /// Get a file from the repository
    pub async fn get_gitlab_file(&self, project_id: u64, file_path: &str, ref_name: &str, token: &str) -> Result<FileResponse, RepositoryError> {
        if file_path.is_empty() {
            return Err(RepositoryError::invalid_file_path("File path cannot be empty"));
        }
        if ref_name.is_empty() {
            return Err(RepositoryError::InvalidReference("Reference cannot be empty".to_string()));
        }
        let file_path =  encode(file_path);
        let api_endpoint = &self.api_endpoint;
        let url = format!("{api_endpoint}/projects/{project_id}/repository/files/{file_path}?ref={ref_name}");
        info!("Getting file: {} from project: {}", file_path, project_id);
        trace!("URL: {}", url);
        trace!("Token: {}", token);
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, token)
            .send()
            .await?;
        trace!("Response: {:?}", response);
        // TODO: add error handling for file not found 404/401
        let file = response.json::<FileResponse>().await?;
        trace!("File: {:?}", file);
        Ok(file)
    }

    /// Get all branches for a project with search
    // Attribute	Type	Required	Description
    // id	integer or string	yes	ID or URL-encoded path of the project.
    // search	string	no	Return list of branches containing the search string. Use ^term to find branches that begin with term, and term$ to find branches that end with term.
    // regex	string	no	Return list of branches with names matching a re2 regular expression.
    pub async fn get_gitlab_branches(&self, args: GitLabBranchesArgs) -> Result<Vec<GlBranch>, RepositoryError> {
        let api_endpoint = &self.api_endpoint;
        let mut url = format!("{api_endpoint}/projects/{}/repository/branches", args.project_id);
        // add search and regex to the url if they are provided
        if let Some(search) = args.search {
            url = format!("{}?search={}", url, search);
        }
        if let Some(regex) = args.regex {
            url = format!("{}?regex={}", url, regex);
        }
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, &args.token)
            .send()
            .await?;
            
        let branches = response.json::<Vec<GlBranch>>().await?;
        info!("Got {} branches for project: {}", branches.len(), args.project_id);
        Ok(branches)
    }

    /// Get all tags for a project
    // id	integer or string	yes	The ID or URL-encoded path of the project.
    // order_by	string	no	Return tags ordered by name, updated, or version. Default is updated.
    // sort	string	no	Return tags sorted in asc or desc order. Default is desc.
    // search	string	no	Return a list of tags matching the search criteria. You can use ^term and term$ to find tags that begin and end with term. No other regular expressions are supported.
    pub async fn get_gitlab_tags(&self, project_id: u64, token: &str, order_by: Option<String>, search: Option<String>) -> Result<Vec<GlTag>, RepositoryError> {
        let api_endpoint = &self.api_endpoint;
        let url = format!("{api_endpoint}/projects/{project_id}/repository/tags");
        let mut params = HashMap::new();
        // add order_by, sort, and search to the url if they are provided
        if let Some(order_by) = order_by {
            params.insert("order_by".to_string(), order_by);
        }
        if let Some(search) = search {
            params.insert("search".to_string(), search);
        }
        info!("Getting tags for project: {}", project_id);
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, token)
            .send()
            .await?;
            
        let tags = response.json::<Vec<GlTag>>().await?;
        Ok(tags)
    }
} 