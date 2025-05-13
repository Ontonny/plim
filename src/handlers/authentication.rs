
use reqwest::StatusCode;
use crate::{jwt::Claims, state::AppState};
use axum::{extract::State, response::{IntoResponse, Response}, Json};
use serde::{Deserialize, Serialize};
use log::info;
use serde_json::json;
// use tower_cookies::Cookies;

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize, Debug)]
struct TokenResponse {
    access_token: String,
    token_type: String,
}

#[derive(Serialize, Debug)]
struct TokenResponseError {
    detail: String,
}

#[derive(Serialize, Debug)]
enum AuthenticationResponse {
    Success(TokenResponse),
    Error(TokenResponseError),
}

impl IntoResponse for AuthenticationResponse {
    fn into_response(self) -> Response {
        match self {
            AuthenticationResponse::Success(token) => (StatusCode::OK, Json(json!(token))).into_response(),
            AuthenticationResponse::Error(err) => (StatusCode::UNAUTHORIZED, Json(json!(err))).into_response(),
        }
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>) -> Response {
    info!("Received login request for username: {}", payload.username);
    if payload.username.is_empty() || payload.password.is_empty() {
        AuthenticationResponse::Error(TokenResponseError {
            detail: "Empty username or password".to_string(),
        }).into_response()
    } else {
        
        if !state.config.check_user_password_is_valid(&payload.username, &payload.password) {
            return AuthenticationResponse::Error(TokenResponseError {
                detail: "Invalid username or password".to_string(),
            }).into_response()
        }
        let user = match state.config.get_user(&payload.username) {
            Ok(user) => user,
            _ => return AuthenticationResponse::Error(TokenResponseError {
                detail: "Error getting user".to_string(),
            }).into_response()
        };
        let claims = Claims {
            username: payload.username,
            disabled: user.disabled,
            email: Some(user.email.clone()),
            full_name: Some(user.full_name.clone()),
            roles: user.groups.clone(),
            exp: None,
        };

        if user.disabled {
            return AuthenticationResponse::Error(TokenResponseError {
                detail: "User is disabled".to_string(),
            }).into_response()
        }
        
        let token = match state.jwt.generate(claims).await {
            Ok(token) => token,
            Err(e) => return AuthenticationResponse::Error(TokenResponseError {
                detail: "Token generation failed".to_string(),
            }).into_response(),
        };

        AuthenticationResponse::Success(TokenResponse {
            access_token: token,
            token_type: "bearer".to_string(),
        }).into_response()
    }
}
