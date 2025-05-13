use axum::{extract::State, response::IntoResponse, Json};
use bcrypt::{hash, DEFAULT_COST};

use super::handlers::*;

// gen-password-hash
pub async fn gen_password_hash(
    State(state): State<AppState>,
    Json(req): Json<PasswordStringRequest>,
) -> impl IntoResponse {
    println!("req: {:?}", req);
    let password_hash = GenPasswordHash::new(req.password);
    (StatusCode::OK, Json(json!(password_hash))).into_response()
}

#[derive(Deserialize, Debug)]
pub struct PasswordStringRequest {
    password: String,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
struct GenPasswordHash {
    #[serde(rename = "passwordHash")]
    password_hash: String,
}

impl GenPasswordHash {
    pub fn new(password: String) -> Self {
        Self { password_hash: if let Ok(hash) = hash(password, DEFAULT_COST) {
            hash
        } else {
            error!("Failed to hash password returning empty string");
            String::new()
        } }
    }
}