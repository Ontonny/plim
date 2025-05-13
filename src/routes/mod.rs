use std::convert::Infallible;

use crate::{middleware::jwt::jwt_auth, routes};
use axum::{
    body::Body, http::Request, middleware as axum_middleware, response::{IntoResponse, Response}, routing::{get, get_service, post}, Router
};
use reqwest::StatusCode;
use tower::service_fn;
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir};

use crate::state::AppState;
use crate::handlers::health_checker_handler;

mod auth;
mod plans;
mod users;
mod pipeline;
mod ansible;
mod admin;
mod gitlab_ref;
mod etcd;


pub const FRONT_API_ROOT_PATH: &str = "/api/v1";
fn get_cors() -> CorsLayer {
    CorsLayer::new()
    .allow_methods([axum::http::Method::GET, axum::http::Method::POST])
    .allow_origin(Any)
    .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::AUTHORIZATION])
}


pub fn create_router(app_state: AppState) -> Router {
    let index_fallback = service_fn(|_req: Request<Body>| async move {
        match tokio::fs::read("static/index.html").await {
            Ok(contents) => Ok::<_, Infallible>(
                Response::builder()
                    .header("Content-Type", "text/html")
                    .body(Body::from(contents))
                    .unwrap(),
            ),
            Err(_) => Ok(
                Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body(Body::from("Internal Server Error"))
                    .unwrap(),
            ),
        }
    });
    let static_service = get_service(ServeDir::new("static").not_found_service(index_fallback));

    let no_auth_routes = Router::new().fallback_service(static_service);

    let main_routes = Router::new()
        // .route("/admin", get(admin_handler))
        .route("/api/v1/healthz", get(health_checker_handler))
        .nest(FRONT_API_ROOT_PATH, users::get_routes())
        .nest(FRONT_API_ROOT_PATH, plans::get_routes())
        .nest(FRONT_API_ROOT_PATH, pipeline::get_routes())
        .nest(FRONT_API_ROOT_PATH, ansible::get_routes())
        .nest(FRONT_API_ROOT_PATH, auth::get_routes())
        .nest(FRONT_API_ROOT_PATH, admin::get_routes())
        .nest(FRONT_API_ROOT_PATH, gitlab_ref::get_routes())
        .nest(FRONT_API_ROOT_PATH, etcd::get_routes())
        .layer(axum_middleware::from_fn_with_state(app_state.clone(), jwt_auth))
        .with_state(app_state)
        .layer(get_cors());
    main_routes.merge(no_auth_routes)
}
