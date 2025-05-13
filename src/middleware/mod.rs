pub mod log_request;
pub mod jwt;
pub mod role_validate;

pub const SKIP_AUTH_PATHS_ENDS: [&str; 2] = ["/healthz", "/login"];
pub const SKIP_AUTH_PATHS_STARTS: [&str; 1] = ["/webhook"];