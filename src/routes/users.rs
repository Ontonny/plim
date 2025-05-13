use crate::handlers::users::get_user_info;

use super::routes::*;

pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/user-info", get(get_user_info))
}
