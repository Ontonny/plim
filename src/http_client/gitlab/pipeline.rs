use super::GitlabClient;
use super::responses::PipelineResponse;
use serde_json::Value;
use log::{info, trace, error};
use thiserror::Error;
use reqwest::StatusCode;

#[derive(Error, Debug)]
pub enum PipelineError {
    #[error("Failed to parse pipeline response: {0}")]
    ParseError(#[from] serde_json::Error),
    #[error("API request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("GitLab API error: {0}")]
    GitLabError(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}

impl GitlabClient {
    /// Trigger a GitLab pipeline
    /// https://docs.gitlab.com/ci/triggers/#trigger-a-pipeline
    pub async fn trigger_gitlab_pipeline(&self, project_id: u64, data: &Value, token: &str) -> Result<PipelineResponse, PipelineError> {
        let url = format!("{}/projects/{}/trigger/pipeline", self.api_endpoint, project_id);
        info!("Triggering pipeline for project: {}", project_id);
        
        let response = self.authenticated_request(reqwest::Method::POST, &url, token)
            .form(data)
            .send()
            .await?;
            
        let pipeline = response.json::<PipelineResponse>().await?;
        Ok(pipeline)
    }

    /// Create a new GitLab pipeline
    /// https://docs.gitlab.com/api/pipelines/#create-a-new-pipeline
    pub async fn create_gitlab_pipeline(&self, project_id: u64, data: &Value, token: &str) -> Result<PipelineResponse, PipelineError> {
        let url = format!("{}/projects/{}/pipeline", self.api_endpoint, project_id);
        info!("Creating pipeline for project: {}", project_id);
        
        let response = self.authenticated_request(reqwest::Method::POST, &url, token)
            .json(data)
            .send()
            .await?;
        
        // Check response status
        match response.status() {
            StatusCode::UNAUTHORIZED => {
                let error_msg = response.text().await.map_err(PipelineError::RequestError)?;
                error!("Unauthorized access: {}", error_msg);
                Err(PipelineError::Unauthorized(error_msg))
            },
            status if status.is_client_error() || status.is_server_error() => {
                let error_msg = response.text().await.map_err(PipelineError::RequestError)?;
                error!("GitLab API error: {}", error_msg);
                Err(PipelineError::GitLabError(error_msg))
            },
            _ => {
                let pipeline_responce = response.json::<PipelineResponse>().await?;
                trace!("Pipeline response: {:?}", pipeline_responce);
                Ok(pipeline_responce)
            }
        }
    }

    /// Get all pipelines for a project
    pub async fn get_gitlab_pipelines(&self, project_id: u64, token: &str) -> Result<Vec<PipelineResponse>, PipelineError> {
        let url = format!("{}/projects/{}/pipelines", self.api_endpoint, project_id);
        info!("Getting pipelines for project: {}", project_id);
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, token)
            .send()
            .await?;
            
        let pipelines = response.json::<Vec<PipelineResponse>>().await?;
        Ok(pipelines)
    }

    /// Get a specific pipeline
    pub async fn get_gitlab_pipeline(&self, project_id: u64, pipeline_id: u64, token: &str) -> Result<PipelineResponse, PipelineError> {
        let url = format!("{}/projects/{}/pipelines/{}", self.api_endpoint, project_id, pipeline_id);
        info!("Getting pipeline: {} for project: {}", pipeline_id, project_id);
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, token)
            .send()
            .await?;
            
        let pipeline = response.json::<PipelineResponse>().await?;
        Ok(pipeline)
    }

    /// Get the latest pipeline
    pub async fn get_gitlab_pipeline_latest(&self, project_id: u64, token: &str) -> Result<PipelineResponse, PipelineError> {
        let url = format!("{}/projects/{}/pipelines/latest", self.api_endpoint, project_id);
        info!("Getting latest pipeline for project: {}", project_id);
        
        let response = self.authenticated_request(reqwest::Method::GET, &url, token)
            .send()
            .await?;
            
        let pipeline = response.json::<PipelineResponse>().await?;
        Ok(pipeline)
    }
} 