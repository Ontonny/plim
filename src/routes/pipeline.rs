use crate::handlers::{trigger_gitlab_pipeline, trigger_gitlab_pipeline_by_webhook};

use super::routes::*;
pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/trigger-pipeline/{plan_name}", post(trigger_gitlab_pipeline))
    .route("/webhook/{plan_name}/{webhook_name}", post(trigger_gitlab_pipeline_by_webhook))
}
