use crate::handlers::ansible::{get_ansible_inventory, get_ansible_cmd};

use super::routes::*;
pub fn get_routes() -> Router<AppState>{
    Router::new()
    .route("/ansible/inventory", post(get_ansible_inventory))
    .route("/ansible/get-cmd", post(get_ansible_cmd))
}

