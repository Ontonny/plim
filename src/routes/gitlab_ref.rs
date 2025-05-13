use super::routes::*;
use crate::handlers::gitlab::get_gitlab_refs;
pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/gitlab-refs/{plan_name}", get(get_gitlab_refs))
}
