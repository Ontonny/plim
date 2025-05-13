use anyhow::{Context, Error};
use etcd_client::{Client, GetOptions, GetResponse};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::merge_yml::ConfigData;
use bcrypt::verify;
use derive_merge_struct::Merge;

const PLANS_PATH: &str = "./config/plans";
const USERS_PATH: &str = "./config/users";
const ANSIBLE_PATH: &str = "./config/ansible";
const MAIN_CONFIG_PATH: &str = "./config.yml";
use clap::Parser;

const MAX_ETCD_KEYS_COUNT: i64 = 1000;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(short, long)]
    listen_address: Option<String>,
    #[arg(long, action)]
    validate_config: bool,
}

pub async fn load() -> Result<Config, Error> {
    let mut config_data = ConfigData::new(vec![PLANS_PATH, USERS_PATH, MAIN_CONFIG_PATH]);
    let _ = config_data.load_and_merge();
    let mut conf: Config = serde_yaml::from_str(&config_data.merged_data.to_string())?;
    let args = Args::parse();
    if let Some(listen_address) = args.listen_address {
        conf.plim.listen_address = listen_address;
    }
    if args.validate_config {
        println!("Validating local config...");
        println!("Config: {:?}", conf);
        println!("Quitting...");
        std::process::exit(0);
    }
    let etcd_confs = conf.etcd_configs.clone();
    conf = match load_with_etcd_configs::<PlimPlan>(conf.clone(), &etcd_confs.plans.key_prefix_path, &etcd_confs.plans.etcd_name).await.context("Failed to load plan etcd configs") {
        Ok(etcd_plan_configs_merged) => etcd_plan_configs_merged,
        Err(e) => {
            error!("Failed to load plan etcd configs: {:?}", e);
            conf
        }
    };
    conf = match load_with_etcd_configs::<PlimUser>(conf.clone(), &etcd_confs.users.key_prefix_path, &etcd_confs.users.etcd_name).await.context("Failed to load users etcd configs") {
        Ok(etcd_user_configs_merged) => etcd_user_configs_merged,
        Err(e) => {
            error!("Failed to load users etcd configs: {:?}", e);
            conf
        }
    };

    Ok(conf)
}

pub trait EtcdConfigLoader {
    fn load_into_config(&self, conf: &mut Config, name: String);
}

impl EtcdConfigLoader for PlimPlan {
    fn load_into_config(&self, conf: &mut Config, name: String) {
        conf.plans.insert(name, self.clone());
    }
}

impl EtcdConfigLoader for PlimUser {
    fn load_into_config(&self, conf: &mut Config, name: String) {
        conf.users.insert(name, self.clone());
    }
}

pub async fn load_with_etcd_configs<T: for<'de> Deserialize<'de> + EtcdConfigLoader>(mut conf: Config, prefix_path: &str, etcd_name: &str) -> Result<Config, Error> {
    let etcd_data = load_etcd_config_by_prefix_path(conf.clone(), 
        prefix_path, etcd_name).await.context("Failed to load etcd config data")?;
    for kv in etcd_data.kvs() {
        let key_bytes = kv.key().to_vec();
        let key = String::from_utf8_lossy(&key_bytes).replace(&conf.etcd_configs.plans.key_prefix_path, "");
        let value_bytes = kv.value().to_vec();
        let value = String::from_utf8_lossy(&value_bytes);
        info!("Loading plan: {:?}", key);
        let yaml_config: T = serde_yaml::from_str(&value).context("Failed to parse plan")?;
        let plan_name = format!("{}_{}", etcd_name, key.trim_start_matches('/').trim_end_matches('/'));
        yaml_config.load_into_config(&mut conf, plan_name);
    }
    Ok(conf)
}

async fn load_etcd_config_by_prefix_path(conf: Config, prefix_path: &str, etcd_name: &str) -> Result<GetResponse, Error> {
    let opts = GetOptions::new()
    .with_prefix()
    .with_limit(MAX_ETCD_KEYS_COUNT);
    let etcd_data_map = match conf.etcd_data_map.get(etcd_name) {
        Some(etcd_data_map) => etcd_data_map,
        None => return Err(anyhow::anyhow!("Etcd data map not found")),
    };
    let etcd_client = Client::connect(etcd_data_map.address.clone(), None).await.context("Failed to connect to etcd")?;
    let etcd_data = etcd_client.clone().get(prefix_path, Some(opts)).await.context("Failed to load etcd config data response")?;
    // trace!("Etcd data: {:?}", etcd_data);
    Ok(etcd_data)
}


#[derive(Debug, Default, Serialize, Deserialize, Clone)]
// #[serde(deny_unknown_fields)]
pub struct Config {
    pub plim: PlimConfig,
    pub gitlab: GitlabConfig,
    pub admins: Vec<String>,
    pub users: HashMap<String, PlimUser>,
    #[serde(default = "default_etcd_map")]
    pub etcd_data_map: HashMap<String, EtcdDataMap>,
    #[serde(default = "default_etcd_configs")]
    pub etcd_configs: EtcdConfigs,
    pub plans: HashMap<String, PlimPlan>,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct EtcdConfigs {
    pub plans: EtcdConfig,
    pub users: EtcdConfig,
    pub ansible_inventories: EtcdConfig,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct EtcdConfig {
    pub etcd_name: String,
    pub key_prefix_path: String,
}

fn default_etcd_map() -> HashMap<String, EtcdDataMap> {
    HashMap::new()
}

fn default_etcd_configs() -> EtcdConfigs {
    EtcdConfigs::default()
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct EtcdDataMap {
    pub address: Vec<String>,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct PlimConfig {
    pub listen_address: String,
    pub jwt_token_duration_hours: i64,
    pub webhook_token_length: u8,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct Database {
    pub url: String,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct GitlabConfig {
    pub api_endpoint: String,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct PlimUser {
    pub full_name: String,
    pub email: String,
    pub groups: Vec<String>,
    pub hashed_password: String,
    pub disabled: bool,
}

impl PlimUser {
    pub fn validate_password(&self, password: &str) -> bool {
        if self.hashed_password.is_empty() {
            error!("User {} has no password set", self.full_name);
            return false;
        }
        if self.disabled {
            error!("User {} is disabled", self.full_name);
            return false;
        }
        match verify(password, &self.hashed_password) {
            Ok(valid) => valid,
            Err(e) => {
                error!("Error verifying password for user {}: {}", self.full_name, e);
                false
            }
        }
        
    }
    
}

// TODO: make two enum for plan types: one for plan types and one for plan types with ansible
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct PlimPlan {
    #[serde(rename = "type")]
    pub type_name: PlanType,
    pub groups: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ansible: Option<AnsibleConfig>,
    pub gitlab: PlimPlanGitlabSettings,
    pub webhooks: Option<Vec<PlimPlanWebhook>>,
    pub views: Vec<PlimPlanViewType>
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct PlimPlanWebhook {
    pub name: String,
    pub trigger_token: String,
    #[serde(rename = "type")]
    pub type_name: WebhookType,
    pub views: Option<Vec<PlimPlanViewType>>,
    pub ansible: Option<AnsibleConfig>,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub enum WebhookType {
    #[default]
    #[serde(rename = "static")]
    Static,
    #[serde(rename = "dynamic")]
    Dynamic,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub enum PlanType {
    #[default]
    #[serde(rename = "gitlab-ansible-base64")]
    GitlabAnsibleBase64,
    #[serde(rename = "gitlab-base64")]
    GitlabBase64,
    #[serde(rename = "gitlab-ansible-native")]
    GitlabAnsibleNative,
    #[serde(rename = "gitlab-native")]
    GitlabNative,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct PlimPlanGitlabSettings {
    #[serde(rename = "projectId", alias = "project_id")]
    pub project_id: u64,
    pub token_var: String,
    #[serde(rename = "ref")]
    pub ref_name: String,
    #[serde(default = "default_allow_ref_select")]
    pub ref_select: RefSelect,
    pub json_data_key: Option<String>,
    pub execute_api_type: ExecuteApiType,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct RefSelect {
    pub ref_select_enabled: bool,
    pub branch_enabled: bool,
    pub branch_search_name: Option<String>,
    pub branch_regex: Option<String>,
    pub tag_enabled: bool,
    pub tag_search_name: Option<String>,
    pub tag_regex: Option<String>,
}

fn default_allow_ref_select() -> RefSelect {
    RefSelect {
        ref_select_enabled: false,
        branch_enabled: false,
        branch_search_name: None,
        branch_regex: None,
        tag_enabled: false,
        tag_search_name: None,
        tag_regex: None,
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[derive(Default)]
pub enum ExecuteApiType {
    #[default]
    #[serde(rename = "trigger")]
    Trigger,
    #[serde(rename = "create")]
    Create,
}




#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum AnyValue {
    String(String),
    VecString(Vec<String>),
    Bool(bool),
}
impl ToString for AnyValue {
    fn to_string(&self) -> String {
        match self {
            AnyValue::String(s) => s.clone(),
            AnyValue::VecString(v) => v.join(","),
            AnyValue::Bool(b) => b.to_string(),
        }
    }
}


impl Default for AnyValue {
    fn default() -> Self {
        AnyValue::String(String::default())  // Choose one variant as the default
    }
}


#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum PlimPlanViewType {
    Multi(MultiValueView),
    CheckboxList(CheckboxListView),
    Dynamic(DynamicView),
    One(OneValueView),
}

impl PlimPlanViewType {
    pub fn data_source_is_exist(plan_views: &Vec<PlimPlanViewType>) -> bool {
        let mut is_exist = false;
        for view in plan_views {
            if view.check_data_source_is_exist() {
                is_exist = true;
            }
        }
        is_exist
    }
}

pub trait GetPlanViewData {
    fn get_data(&self) -> Vec<(String, Option<AnyValue>)>;
    fn check_data_source_is_exist(&self) -> bool;
}

impl GetPlanViewData for PlimPlanViewType {
    fn get_data(&self) -> Vec<(String, Option<AnyValue>)> {
        match self {
            PlimPlanViewType::One(view) => view.get_data(),
            PlimPlanViewType::Multi(view) => view.get_data(),
            PlimPlanViewType::CheckboxList(view) => view.get_data(),
            _ => vec![],
        }
    }
    fn check_data_source_is_exist(&self) -> bool {
        match self {
            PlimPlanViewType::One(view) => view.check_data_source_is_exist(),
            PlimPlanViewType::Multi(view) => view.check_data_source_is_exist(),
            PlimPlanViewType::CheckboxList(view) => view.check_data_source_is_exist(),
            _ => false,
        }
    }
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct OneValueView {
    pub text: String,
    #[serde(rename = "type")]
    pub type_name: String,
    pub key: Option<AnyValue>,
    pub value: Option<AnyValue>,
    #[serde(default = "default_data_source")]
    pub data_source: Option<DataSource>,
}

impl GetPlanViewData for OneValueView {
    fn get_data(&self) -> Vec<(String, Option<AnyValue>)> {
        if let Some(key) = &self.key {
            vec![(key.to_string(), self.value.clone())]
        } else {
            error!("Key is required for one value view {}", self.text);
            vec![]
        }
    }
    fn check_data_source_is_exist(&self) -> bool {
        false
    }
}

// always have data (in other same as one value view)
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct MultiValueView {
    pub text: String,
    #[serde(rename = "type")]
    pub type_name: String,
    pub key: Option<AnyValue>,
    pub value: Option<AnyValue>,
    pub data: Vec<AnyValue>,
    #[serde(default = "default_data_source")]
    pub data_source: Option<DataSource>,
}

fn default_data_source() -> Option<DataSource> {
    Some(DataSource {
        source_type: DataSourceType::StaticConfig,
        etcd_name: String::default(),
        key_path: String::default(),
    })
}
#[derive(Debug, Default, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub enum DataSourceType {
    #[default]
    #[serde(rename = "static_config")]
    StaticConfig,
    #[serde(rename = "etcd")]
    Etcd,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct DataSource {
    #[serde(rename = "type")]
    pub source_type: DataSourceType,
    pub etcd_name: String,
    pub key_path: String,
}

impl GetPlanViewData for MultiValueView {
    fn get_data(&self) -> Vec<(String, Option<AnyValue>)> {
        if let Some(key) = &self.key {
            vec![(key.to_string(), self.value.clone())]
        } else {
            error!("Key is required for multi value view {}", self.text);
            vec![]
        }
    }
    fn check_data_source_is_exist(&self) -> bool {
        self.data_source.is_some()
    }
}
// checkbox-list only
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct CheckboxListView {
    pub text: String,
    #[serde(rename = "type")]
    pub type_name: String,
    pub keys: Vec<String>,
    pub values: Vec<AnyValue>,
    #[serde(default = "default_data_source")]
    pub data_source: Option<DataSource>,
}

impl GetPlanViewData for CheckboxListView {
    fn get_data(&self) -> Vec<(String, Option<AnyValue>)> {
        self.keys.iter().zip(self.values.iter()).map(|(key, value)| (key.clone(), Some(value.clone()))).collect()
    }
    fn check_data_source_is_exist(&self) -> bool {
        false
    }
}

// active-choice like views
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct DynamicView {
    pub text: String,
    #[serde(rename = "type")]
    pub type_name: String,
    pub key: Option<AnyValue>,
    pub value: Option<AnyValue>,
    pub data: Vec<AnyValue>,
    pub referenced_key: Vec<AnyValue>,
    #[serde(default = "default_data_source")]
    pub data_source: Option<DataSource>,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[derive(Merge)]
// default values for plan, can be overridden after
pub struct AnsibleConfig {
    pub is_inventory_inline: Option<bool>,
    pub backend_inventory: AnsibleBackendType,
    pub playbook: String,
    pub inventory: String,
    pub extra_vars: Option<HashMap<String, String>>,
    pub private_key: Option<String>, // --private-key, --key-file PRIVATE_KEY_FILE
    pub remote_user: Option<String>,
    pub connection: Option<String>, // -c, --connection CONNECTION (default=ssh)
    pub timeout: Option<u64>, // -T, --timeout TIMEOUT
    pub ssh_common_args: Option<String>, // --ssh-common-args SSH_COMMON_ARGS
    pub sftp_extra_args: Option<String>, // --sftp-extra-args SFTP_EXTRA_ARGS
    pub scp_extra_args: Option<String>, // --scp-extra-args SCP_EXTRA_ARGS
    pub ssh_extra_args: Option<String>, // --ssh-extra-args SSH_EXTRA_ARGS
    pub force_handlers: Option<bool>, // --force-handlers
    pub ask_pass: Option<bool>, // --ask-pass
    #[serde(rename = "become")]
    pub privilege_escalation: Option<bool>,  // Renamed field
    pub become_method: Option<String>, // --become-method BECOME_METHOD
    pub become_user: Option<String>, // --become-user BECOME_USER
    pub ask_become_pass: Option<bool>, // --ask-become-pass
    pub tags: Option<Vec<String>>, // --tags TAGS
    pub skip_tags: Option<String>, // --skip-tags SKIP_TAGS
    pub forks: Option<u64>, // -f, --forks FORKS (default=5)
    #[serde(rename = "limit")]
    pub limit_hosts: Option<Vec<String>>, // --limit LIMIT
    pub verbosity: Option<u64>, // -v, --verbose
    pub vault_password_file: Option<String>, // --vault-password-file VAULT_PASSWORD_FILE
    pub syntax_check: Option<bool>, // --syntax-check
    pub diff: Option<bool>, // -D, --diff
    pub check: Option<bool>, // -C, --check don't make any changes; instead, try to predict some of the changes that may occur
    pub list_hosts: Option<bool>, // --list-hosts
    pub list_tasks: Option<bool>, // --list-tasks
    pub list_tags: Option<bool>, // --list-tags
    pub start_at_task: Option<String>, // --start-at-task TASK_NAME
    pub become_password_file: Option<String>, // --become-password-file, --become-pass-file BECOME_PASSWORD_FILE
    pub connection_password_file: Option<String>, // --connection-password-file, --conn-pass-file CONNECTION_PASSWORD_FILE
    pub module_path: Option<String>, // -M, --module-path MODULE_PATH
    pub version: Option<bool>, // show program's version number,  executable location and exit
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum AnsibleBackendType {
    Local(AnsibleLocalBackend),
    Gitlab(AnsibleGitlabBackend),
    Etcd(AnsibleEtcdBackend),
}

impl Default for AnsibleBackendType {
    fn default() -> Self {
        AnsibleBackendType::Local(AnsibleLocalBackend::default())
    }
}


#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub enum AnsibleInventoryType {
    #[default]
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "gitlab")]
    Gitlab,
    #[serde(rename = "etcd")]
    Etcd,
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct AnsibleGitlabBackend {
    #[serde(rename = "type")]
    pub type_name: AnsibleInventoryType,
    pub token_var: Option<String>,
    pub ref_name: Option<String>,
    pub project_id: Option<u64>,
    pub file_path: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
#[serde(deny_unknown_fields)]
pub struct AnsibleEtcdBackend {
    #[serde(rename = "type")]
    pub type_name: AnsibleInventoryType,
    pub etcd_name: String,
    pub key_path: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
#[serde(deny_unknown_fields)]
pub struct AnsibleLocalBackend {
    #[serde(rename = "type")]
    pub type_name: AnsibleInventoryType,
    pub file_path: String,
}

impl Config {
    pub fn get_user(&self, username: &str) -> Result<&PlimUser, anyhow::Error> {
        self.users.get(username).ok_or_else(|| anyhow::anyhow!("User '{}' not found", username))
    }
    pub fn check_user_password_is_valid(&self, username: &str, password: &str) -> bool {
        let user = match self.get_user(username) {
            Ok(user) => user,
            _ => return false,
        };
        user.validate_password(password)
    }
    pub fn filter_plans_by_groups(&self, desired_groups: &Vec<String>) -> HashMap<String, PlimPlan> {
        self.plans.clone()
            .into_iter()
            .filter(|plan| {
                plan.1.groups.iter().any(|group| desired_groups.contains(group))
            })
            .collect()
    }

}

