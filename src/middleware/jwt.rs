use axum::{
    body::Body,
    extract::{ Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use log::{ info, trace};
use crate::{ routes::FRONT_API_ROOT_PATH, state::AppState };
use super::*;

pub async fn jwt_auth(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // TODO header only validation
    if SKIP_AUTH_PATHS_ENDS.iter().any(|path| req.uri().path().ends_with(path)) 
        || SKIP_AUTH_PATHS_STARTS.iter().any(|path| req.uri().path().starts_with(format!("{}{}", FRONT_API_ROOT_PATH, path).as_str())) {
        trace!("JWT auth skipped for path: {:?}", req.uri().path());
        return Ok(next.run(req).await);
    } 
    let headers = req.headers();
    let claims = state.jwt.validate_jwt(headers).await?;
    info!("JWT claims: {:?}", claims);
    // Attach claims to request extensions for further use
    req.extensions_mut().insert(claims);

    Ok(next.run(req).await)
}

