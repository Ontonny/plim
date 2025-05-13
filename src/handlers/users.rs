use crate::jwt::Claims;

use super::handlers::*;

pub async fn get_users(State(state): State<AppState>,) -> impl IntoResponse {
    // let users: Vec<PlimUser>  = state.config.users.keys().cloned().collect();
    let users_json = json!(state.config.users);
    (StatusCode::OK,Json(users_json)).into_response()
}

pub async fn get_user_info(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>) -> impl IntoResponse {
    let user = match state.config.get_user(&claims.username) {
        Ok(user) => user,
        Err(e) => {
            return (StatusCode::NOT_FOUND, Json(json!({ "error": e.to_string() })));
        }
    };
    json_response(user)
}