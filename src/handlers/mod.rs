use std::collections::HashMap;
use axum::{extract::{Path, State}, response::{IntoResponse, Response}, Extension, Json};
use reqwest::StatusCode;
use serde::Deserialize;
use serde::Serialize;
use base64::prelude::*;
use crate::AppState;
use crate::handlers;
use serde_json::{json, Value};
use log::{error, info};
pub use gitlab::trigger_gitlab_pipeline;
pub use gitlab::trigger_gitlab_pipeline_by_webhook;
use anyhow::{Error, Context};
use thiserror::Error;

pub mod users;
pub mod plans;
pub mod gitlab;
pub mod ansible;
pub mod authentication;
pub mod admin_tools;
pub mod etcd;


#[derive(Debug, Error)]
pub enum PlimErrorKind {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Internal server error: {0}")]
    InternalServerError(String),
}

impl PlimErrorKind {
    pub fn not_found(msg: impl Into<String>) -> PlimErrorKind {
        PlimErrorKind::NotFound(msg.into())
    }
    pub fn unauthorized(msg: impl Into<String>) -> PlimErrorKind {
        PlimErrorKind::Unauthorized(msg.into())
    }
    pub fn validation(msg: impl Into<String>) -> PlimErrorKind {
        PlimErrorKind::Validation(msg.into())
    }
    pub fn internal_server_error(msg: impl Into<String>) -> PlimErrorKind {
        PlimErrorKind::InternalServerError(msg.into())
    }
}

impl From<PlimErrorKind> for PlimApiError {
    fn from(kind: PlimErrorKind) -> Self {
        match kind {
            PlimErrorKind::InternalServerError(_) => PlimApiError::new(kind, StatusCode::INTERNAL_SERVER_ERROR),
            PlimErrorKind::NotFound(_) => PlimApiError::new(kind, StatusCode::NOT_FOUND),
            PlimErrorKind::Unauthorized(_) => PlimApiError::new(kind, StatusCode::UNAUTHORIZED),
            PlimErrorKind::Validation(_) => PlimApiError::new(kind, StatusCode::BAD_REQUEST),
        }
    }
}

#[derive(Debug)]
pub struct PlimApiError {
    inner: Error,
    status: StatusCode,
}

impl PlimApiError {
    pub fn new(error: impl Into<Error>, status: StatusCode) -> Self {
        Self {
            inner: error.into(),
            status,
        }
    }
}

impl IntoResponse for PlimApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({
                "error": format!("{}", self.inner),
            })),
        ).into_response()
    }
}

type HandlerResult = (StatusCode, Json<Value>);
pub fn json_response<T: serde::Serialize>(data: T) -> HandlerResult {
    match serde_json::to_value(data) {
        Ok(json) => (StatusCode::OK, Json(json)),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to serialize data"})),
        ),
    }
}


#[derive(Debug, Serialize, Deserialize)]
struct Payload {
    json_data: HashMap<String, String>,
    ansible_data: HashMap<String, String>,
}

pub async fn health_checker_handler() -> impl IntoResponse {
    let json_response = serde_json::json!({
        "status": "healthy",
    });

    Json(json_response)
}

pub async fn ok_response_msg(msg: String) -> impl IntoResponse {
    let data = json!({
        "message": msg,
    });
    (StatusCode::OK, Json(data))
}
