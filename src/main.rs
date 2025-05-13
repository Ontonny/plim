mod cmd;
mod config;
mod merge_yml;
mod state;
use anyhow::{ Context, Result};
use etcd_client::Client;
use http_client::GitlabClient;
use jwt::JwtKey;
use log::warn;
use state::{AppState, GitlabTokens};
use std::{collections::HashMap, env};
use tracing_subscriber::prelude::*;
mod handlers;
mod http_client;
mod jwt;
mod middleware;
mod routes;

const DEFAULT_TOKEN_SECRET: &str = "mysecret";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}=trace", env!("CARGO_CRATE_NAME")).into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
    let conf = config::load().await?;
    let gitlab_tokens = GitlabTokens::new();
    let token_secret = if let Ok(token_secret) = gitlab_tokens.get("TOKEN_SECRET").await {
        token_secret
    } else {
        warn!("TOKEN_SECRET is not set, using default value");
        DEFAULT_TOKEN_SECRET.to_string()
    };
    let jwt = JwtKey::init(&token_secret, conf.plim.jwt_token_duration_hours);
    let gc = match GitlabClient::new(&conf.gitlab.api_endpoint) {
        Ok(gc) => gc,
        Err(e) => { Err(e.context("Failed to create GitlabClient"))? }
    };
    let mut etcd_clients_map = HashMap::new();
    for (key, value) in conf.etcd_data_map.iter() {
        let etcd_client = Client::connect(value.address.clone(), None).await;
        if let Ok(etcd_client) = etcd_client {
            etcd_clients_map.insert(key.to_string(), etcd_client);
        } else {
            warn!("Failed to create EtcdClient for {}", key);
        }
    };
    let app_state = state::AppState::new(
        jwt,
        conf.clone(),
        gc,
        gitlab_tokens,
        etcd_clients_map
    );
    let app = routes::create_router(app_state);
    let listener = tokio::net::TcpListener::bind(&conf.plim.listen_address)
        .await
        .context(format!(
            "Failed to bind TCP listener to address {}",
            conf.plim.listen_address
        ))?;
    axum::serve(listener, app)
        .await
        .context("Failed to serve application")?;

    Ok(())
}
