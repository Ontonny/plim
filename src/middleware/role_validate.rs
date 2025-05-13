use axum::{body::Body, extract::Request, http::StatusCode, middleware::Next, response::Response};



use crate::jwt::Claims;

pub async fn authorize_role(req: Request<Body>, next: Next, required_role: &str) -> Result<Response, StatusCode> {
    // Extract claims from request extensions
    let claims = req.extensions().get::<Claims>().ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if user has the required role
    if claims.roles.contains(&required_role.to_string()) && !claims.disabled {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::FORBIDDEN)  // User does not have required role
    }
}
