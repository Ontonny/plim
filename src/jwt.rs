use anyhow::Context;
use axum::http::{HeaderMap, StatusCode};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use jsonwebtoken::Algorithm;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub exp: Option<usize>,   // Expiration time in UNIX format
    pub username: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub disabled: bool,
    pub roles: Vec<String>,
} 

pub struct JwtKey {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
    pub validation: Validation,
    pub token_duration_hours: i64,
}

impl JwtKey {
    pub fn init(secret: &str, token_duration_hours: i64) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret.as_bytes()),
            decoding: DecodingKey::from_secret(secret.as_bytes()),
            validation: Validation::new(Algorithm::HS256),
            token_duration_hours,
        }
    }
    pub async fn generate(&self, mut claims: Claims) -> Result<String, StatusCode>  {
        claims.exp = Some(Utc::now()
            .checked_add_signed(Duration::hours(self.token_duration_hours))
            .context("valid timestamp")
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .timestamp() as usize);
    
            // TODO: log failed to encode token
            let token = encode(&Header::default(), &claims, &self.encoding)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(token)
    }
    pub async fn validate_jwt(&self, headers: &HeaderMap) -> Result<Claims, StatusCode> {
        let auth_header = headers
            .get("Authorization")
            .and_then(|hv| hv.to_str().ok())
            .context("Authorization header not found")
            .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
        // Ensure the token starts with "Bearer "
        let token = auth_header.strip_prefix("Bearer ").ok_or(StatusCode::UNAUTHORIZED)?;
    
        // Decode JWT and extract claims
        decode::<Claims>(token, &self.decoding, &self.validation)
            .map(|token_data| token_data.claims)
            .map_err(|_| StatusCode::UNAUTHORIZED)
    }
}
