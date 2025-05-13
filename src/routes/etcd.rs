
use axum::{routing::patch, Router};
use super::routes::*;

use crate::handlers::etcd::{ get_inventory_etcd_key, get_plans_etcd_inventories, get_plans_etcd_views, get_view_etcd_key, set_inventory_etcd_key, set_view_etcd_key};

pub fn get_routes() -> Router<AppState> {
    Router::new()
    .route("/etcd/inventories", get(get_plans_etcd_inventories))
    .route("/etcd/inventory/read-key", post(get_inventory_etcd_key))
    .route("/etcd/inventory/update-key", patch(set_inventory_etcd_key))
    // plan views
    .route("/etcd/plans-views", get(get_plans_etcd_views))
    .route("/etcd/plan-view/update-key", patch(set_view_etcd_key))
    .route("/etcd/plan-view/read-key", post(get_view_etcd_key))
}
