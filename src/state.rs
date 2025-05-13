use crate::config::Config;
use crate::handlers::ansible::AnsibleGenCmd;
use crate::http_client::GitlabClient;
use crate::jwt::JwtKey;
use anyhow::Error;
use etcd_client::Client;
use log::error;


use std::{collections::HashMap, env, ops::Deref, sync::Arc};

#[derive(Clone)]
pub struct AppState {
    inner: Arc<StateInner>,
}

impl Deref for AppState {
    type Target = StateInner;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl AppState {
    pub fn new(
        jwt: JwtKey,
        config: Config,
        gitlab_client: GitlabClient,
        gitlab_tokens: GitlabTokens,
        etcd_clients_map: HashMap<String, Client>,
    ) -> Self {
        Self {
            inner: Arc::new(StateInner { 
                jwt,
                config,
                gitlab_client,
                ansible_command_generator: AnsibleGenCmd,
                gitlab_tokens,
                etcd_clients_map,
            }),
        }
    }
}

pub struct StateInner {
    pub jwt: JwtKey,
    pub config: Config,
    pub gitlab_client: GitlabClient,
    pub ansible_command_generator: AnsibleGenCmd,
    pub gitlab_tokens: GitlabTokens,
    pub etcd_clients_map: HashMap<String, Client>,
}
#[derive(Default)]
pub struct GitlabTokens {
    all_vars: HashMap<String, String>,
}

impl GitlabTokens {

    pub fn new() -> Self {
        let all_vars = Self::load_normalized_env();
        Self { all_vars }
    }

    fn load_normalized_env() -> HashMap<String, String> {
        env::vars()
            .map(|(key, value)| (key.replace("__", "_"), value))
            .collect()
    }


    pub async fn get(&self, token_var: &str) -> Result<String, Error> {
        match self.all_vars.get(token_var) {
            Some(token) => Ok(token.clone()),
            None => {
                let error_message = format!("Your token {} is missing", &token_var);
                error!("{}", error_message);
                Err(anyhow::anyhow!(error_message))
            }
        }
    }


}