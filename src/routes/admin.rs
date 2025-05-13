use crate::{handlers::{admin_tools::gen_password_hash, users::get_users}, middleware::role_validate::authorize_role};
use super::routes::*;

pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/user-list", get(get_users))
    .route("/gen-password-hash", post(gen_password_hash))
    .layer(axum_middleware::from_fn(|req, next| authorize_role(req, next, "admin")))
}
