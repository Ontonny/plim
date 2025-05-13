use std::collections::HashMap;

use anyhow::Error;
use reqwest::{Client, Method};
// Re-export the modules
pub mod pipeline;
pub mod repository;
pub mod responses;

/// Main Gitlab client implementation
#[derive(Debug)]
pub struct GitlabClient {
    http: Client,
    api_endpoint: String,
}

impl GitlabClient {
    /// Create a new GitLab client instance
    pub fn new(api_endpoint: &str) -> Result<Self, Error> {
        let client = Client::builder().build()?;
        Ok(Self {
            http: client,
            api_endpoint: api_endpoint.to_owned()
        })
    }

    /// Helper method to create authenticated request
    pub(crate) fn authenticated_request(&self, method: Method, url: &str, token: &str) -> reqwest::RequestBuilder {
        self.http.request(method, url)
            .header("PRIVATE-TOKEN", token)
    }

    pub(crate) async fn get(&self, url: &str, params: &HashMap<String, String>) -> Result<reqwest::Response, Error> {
        let response = self.http.get(url)
            .query(params)
            .send()
            .await?;
        Ok(response)
    }
}
