use crate::handlers::plans::{get_all_plans, get_plan};

use super::routes::*;

pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/plans-list", get(get_all_plans))
    .route("/plans/{plan_name}", get(get_plan))
}
