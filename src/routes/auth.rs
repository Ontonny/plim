use crate::handlers::authentication::login;

use super::routes::*;
pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/login", post(login))
}

