// use axum::{body::Body, extract::Request, http::{HeaderMap, StatusCode}, middleware::Next, response::Response, Extension};
// use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
// use log::{info, trace};
// use serde::{Deserialize, Serialize};
// use std::env;

// use std::time::Instant;

// pub async fn log_request(req: Request<Body>, next: Next) -> Response {
//     let start = Instant::now();

//     trace!("Received request: {} {}", req.method(), req.uri());

//     let response = next.run(req).await;

//     let duration = start.elapsed();
//     trace!("Request processed in {:?}", duration);

//     response
// }