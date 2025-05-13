use anyhow::{Context, Error};
use log::{trace, warn};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use crate::config::{AnsibleBackendType, PlimPlan};
use configparser::ini::Ini;
use super::gitlab::TriggerPipelineRequest;
use super::handlers::*;
pub async fn get_ansible_inventory(
    State(state): State<AppState>,
    Json(inv): Json<AnsibleInventoryRequest>,
) -> impl IntoResponse {
    info!("Get ansible inventory: {:?}", inv);
    let inventory: Result<Inventory, (StatusCode, Json<serde_json::Value>)> = match inv {
        AnsibleInventoryRequest::Raw(inv) => {
            let inventory_file_format = inv.file_path.split(".").last();
            match inventory_file_format {
                Some("yaml") | Some("yml") => Ok(AnsibleInventoryParserLocal::parse_yaml_file(&inv.file_path)?),
                Some("ini") => Ok(AnsibleInventoryParserLocal::parse_ini_file(&inv.file_path)?),
                // default to ini
                _ => Ok(AnsibleInventoryParserLocal::parse_ini_file(&inv.file_path)?),
            }
        }
        AnsibleInventoryRequest::Plan(inv) => {
            let plan = match state.config.plans.get(&inv.plan_name) {
                Some(plan) => plan,
                None => {
                    return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Plan not found"}))));
                }
            };
            let file_path = match plan.ansible.clone() {
                Some(ansible_config) => match ansible_config.backend_inventory {
                    AnsibleBackendType::Local(local) => local.file_path,
                    AnsibleBackendType::Gitlab(gitlab) => gitlab.file_path,
                    AnsibleBackendType::Etcd(_etcd) => ".yml".to_string(), // TODO: add ini support for etcd
                },
                None => {
                    return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "No inventory file path found"}))));
                }
            };
            let inventory_file_format = file_path.split(".").last();
            match plan.ansible.clone() {
                Some(ansible_config) => match ansible_config.backend_inventory {
                    AnsibleBackendType::Gitlab(gitlab) => {
                        trace!("Loading inventory for gitlab plan: {:?}", gitlab);
                        match inventory_file_format {
                            Some("yaml") | Some("yml") => Ok(AnsibleInventoryParserGitlab::parse_yaml(plan, &state).await?),
                            Some("ini") => Ok(AnsibleInventoryParserGitlab::parse_ini(plan, &state).await?),
                            // default to ini
                            _ => Ok(AnsibleInventoryParserGitlab::parse_ini(plan, &state).await?),
                        }
                    }
                    AnsibleBackendType::Local(local) => {
                        trace!("Loading inventory for local plan: {:?} with file path: {}", &local.type_name, &local.file_path);
                        match inventory_file_format {
                            Some("yaml") | Some("yml") => Ok(AnsibleInventoryParserLocal::parse_yaml_file(&file_path)?),
                            Some("ini") => Ok(AnsibleInventoryParserLocal::parse_ini_file(&file_path)?),
                            // default to ini
                            _ => Ok(AnsibleInventoryParserLocal::parse_ini_file(&file_path)?),
                        }
                    }
                    AnsibleBackendType::Etcd(etcd) => {
                        info!("Loading inventory from etcd: {:?}, file format: {:?}", etcd, inventory_file_format);
                        let etcd_client = state.etcd_clients_map.get(&etcd.etcd_name)
                            .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "Etcd client not found"}))))?;
                        let etcd_data = etcd_client.clone().get(etcd.key_path.as_str(), None).await
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
                        let etcd_data = match etcd_data.kvs().first() {
                            Some(etcd_data) => etcd_data,
                            None => return Err((StatusCode::NOT_FOUND, Json(json!({"error": "Key not found"})))),
                        };
                        let content = String::from_utf8(etcd_data.value().to_vec())
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
                        match inventory_file_format {
                            Some("yaml") | Some("yml") => Ok(AnsibleInventoryParserLocal::parse_yaml(&content)?),
                            _ => {
                                return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid inventory file format (ini not supported)"}))));
                            }
                        }
                    }
                },
                _ => {
                    return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "No inventory file path found"}))));
                }
            }
        }
    };
    
    trace!("{:?} - inventory", inventory.clone());

    Ok((StatusCode::OK, Json(json!(inventory?))).into_response())
}

pub async fn get_ansible_cmd(
    State(state): State<AppState>,
    Json(req): Json<TriggerPipelineRequest>,
) -> impl IntoResponse {
    let cmd = match state.ansible_command_generator.gen_ansible_cmd(&req) {
        Ok(it) => it,
        Err(err) => return Err((StatusCode::BAD_REQUEST, Json(json!({"error": err.to_string()})))),
    };
    Ok((StatusCode::OK, Json(json!(cmd))).into_response())
}
// Failed to deserialize the JSON body into the target type: unknown variant `path`, expected `Local` or `Gitlab` at line 1 column 8
#[derive(Debug, Deserialize, Clone)]
#[serde(untagged)]
pub enum AnsibleInventoryRequest {
    Raw(RawLocalAnsibleInventory),
    Plan(PlanAnsibleInventory),
}

#[derive(Debug, Deserialize, Clone)]
pub struct PlanAnsibleInventory {
    pub plan_name: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RawLocalAnsibleInventory {
    pub file_path: String,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryChildren {
    pub hosts: HostGroup,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Inventory(HashMap<String, InventoryChildren>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostGroup(HashMap<String, Option<HostVars>>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostVars {
    pub ansible_host: Option<String>,
}

pub struct AnsibleInventoryParserLocal;

impl AnsibleInventoryParserLocal {
    pub fn parse_yaml(content: &str) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
        let inventory: Inventory = serde_yaml::from_str(content).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        Ok(inventory)
    }
    pub fn parse_yaml_file(file_path: &str) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
        let content = fs::read_to_string(file_path).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        AnsibleInventoryParserLocal::parse_yaml(&content)
    }
    pub fn parse_ini_file(file_path: &str) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
        let mut ini = Ini::new();
        ini.load(file_path).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        parse_ini_inventory(ini).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("{:?}", e)}))))
    }
}


pub struct AnsibleInventoryParserGitlab;

impl AnsibleInventoryParserGitlab {
    pub async fn get_file_content(
        plan: &PlimPlan,
        state: &AppState,
    ) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
        let ansible_config = plan.ansible.clone();
        let backend_inventory = match ansible_config {
            Some(ansible_config) => match ansible_config.backend_inventory {
                AnsibleBackendType::Gitlab(gitlab) => gitlab,
                _ => {
                    return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid inventory type"}))));
                }
            },
            None => {
                return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "No inventory file path found"}))));
            }
        };
        let token_var = match backend_inventory.token_var {
            Some(ref token_var) => token_var,
            None => {
                return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Token variable not found"}))));
            }
        };
        let token = state.gitlab_tokens.get(&token_var).await;
        let token = match token {
            Ok(ref token) => token,
            Err(e) => {
                return Err((StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))));
            }
        };
        let file_content = state
            .gitlab_client
            .get_gitlab_file(
                backend_inventory.project_id.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "Project ID not found"}))))?,
                &backend_inventory.file_path,
                &backend_inventory.ref_name.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "Ref name not found"}))))?,
                &token,
            )
            .await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        let content_in_base64 = file_content.content.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "Base64 content not found"}))))?;
        let content = BASE64_STANDARD.decode(&content_in_base64).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        let result = String::from_utf8(content).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        Ok(result)
    }
    pub async fn parse_yaml(
        plan: &PlimPlan,
        state: &AppState,
    ) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
        let content = AnsibleInventoryParserGitlab::get_file_content(plan, state).await?;
        trace!("Content: {:?}", content);
        let inventory: Inventory = serde_yaml::from_str(&content).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        Ok(inventory)
    }
    pub async fn parse_ini(
        plan: &PlimPlan,
        state: &AppState,
    ) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
        let content = AnsibleInventoryParserGitlab::get_file_content(plan, state).await?;
        trace!("Content: {:?}", content);
        let mut ini = Ini::new();
        ini.read(content).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
        parse_ini_inventory(ini).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("{:?}", e)}))))
    }
}

fn parse_ini_inventory(ini: Ini) -> Result<Inventory, (StatusCode, Json<serde_json::Value>)> {
    let mut inventory_map = HashMap::new();

    // Iterate through sections in INI file
    for section_name in ini.sections() {
        // Skip any section that starts with '_' as these are Ansible vars
        if section_name.starts_with('_') {
            continue;
        }

        let mut host_group = HostGroup(HashMap::new());
        // Process each host in the section
        if let Some(section_map) = ini
            .get_map()
            .context("Failed to get INI map")
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
            .get(&section_name)
        {
            for (key, value) in section_map {
                // println!("key: {:?}, value: {:?}", key, value);
                host_group.0.insert(
                    key.split(" ").next().ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "Host name not found"}))))?.to_string(),
                    value.as_ref().map(|v| HostVars {
                        ansible_host: Some(v.to_string()),
                    }),
                );
            }
        }

        inventory_map.insert(section_name, InventoryChildren { hosts: host_group });
    }
    Ok(Inventory(inventory_map))
}
// AnsibleCommandGenerator
#[derive(Default)]
pub struct AnsibleGenCmd;
const EXTRA_VARS: &str = "-e"; // --extra-vars

impl AnsibleGenCmd {
    pub fn gen_ansible_cmd(&self, req: &TriggerPipelineRequest) -> Result<String, Error> {
        let config = req.ansible_data.clone().ok_or(anyhow::anyhow!("Ansible data not found"))?;
        let req_extra_vars = req.json_data.clone();
        let mut command = format!("ansible-playbook {}", config.playbook);

        command += &format!(" -i {}", config.inventory);

        // Connection options
        if let Some(private_key) = config.private_key {
            command += &format!(" --private-key {}", private_key);
        }
        if let Some(remote_user) = config.remote_user {
            command += &format!(" -u {}", remote_user);
        }
        if let Some(connection) = config.connection {
            command += &format!(" -c {}", connection);
        }
        if let Some(timeout) = config.timeout {
            command += &format!(" -T {}", timeout);
        }
        if let Some(ssh_common_args) = config.ssh_common_args {
            command += &format!(" --ssh-common-args '{}'", ssh_common_args);
        }
        if let Some(sftp_extra_args) = config.sftp_extra_args {
            command += &format!(" --sftp-extra-args '{}'", sftp_extra_args);
        }
        if let Some(scp_extra_args) = config.scp_extra_args {
            command += &format!(" --scp-extra-args '{}'", scp_extra_args);
        }
        if let Some(ssh_extra_args) = config.ssh_extra_args {
            command += &format!(" --ssh-extra-args '{}'", ssh_extra_args);
        }
        if let Some(ask_pass) = config.ask_pass {
            if ask_pass {
                command += " -k";
            }
        }

        if let Some(privilege_escalation) = config.privilege_escalation {
            if privilege_escalation {
                command += " -b";
            }
        }
        if let Some(become_method) = config.become_method {
            command += &format!(" --become-method {}", become_method);
        }
        if let Some(become_user) = config.become_user {
            command += &format!(" --become-user {}", become_user);
        }
        if let Some(ask_become_pass) = config.ask_become_pass {
            if ask_become_pass {
                command += " -K";
            }
        }

        // Additional playbook options
        if let Some(tags) = config.tags {
            if !tags.is_empty() {
                let tags_str = tags.join(",");
                command += &format!(" -t {}", tags_str);
            }
        }
        if let Some(skip_tags) = config.skip_tags {
            command += &format!(" --skip-tags {}", skip_tags);
        }
        if let Some(forks) = config.forks {
            command += &format!(" -f {}", forks);
        }
        if let Some(limit_hosts) = config.limit_hosts {
            if !limit_hosts.is_empty() {
                let lhosts = limit_hosts.join(",");
                command += &format!(" -l {}", lhosts);
                if let Some(is_inventory_inline) = config.is_inventory_inline {
                    if is_inventory_inline {
                        command += ",";
                    }
                }
            }
        }
        if let Some(verbosity) = config.verbosity {
            if verbosity != 0 {
                command += &format!(" -{}", "v".repeat(verbosity as usize));
            }
        }

        // Vault options
        if let Some(vault_password_file) = config.vault_password_file {
            command += &format!(" --vault-password-file {}", vault_password_file);
        }

        // Other options
        if let Some(syntax_check) = config.syntax_check {
            if syntax_check {
                command += " --syntax-check";
            }
        }
        if let Some(diff) = config.diff {
            if diff {
                command += " --diff";
            }
        }
        if let Some(check) = config.check {
            if check {
                command += " --check";
            }
        }
        if let Some(list_hosts) = config.list_hosts {
            if list_hosts {
                command += " --list-hosts";
            }
        }
        if let Some(list_tasks) = config.list_tasks {
            if list_tasks {
                command += " --list-tasks";
            }
        }
        if let Some(list_tags) = config.list_tags {
            if list_tags {
                command += " --list-tags";
            }
        }
        if let Some(start_at_task) = config.start_at_task {
            command += &format!(" --start-at-task '{}'", start_at_task);
        }
        // Add extra vars
        if let Some(extra_vars) = config.extra_vars {
            for (key, value) in extra_vars {
                command += &format!(" {EXTRA_VARS} {}='{}'", key, value);
            }
        }
        if let Some(req_extra_vars) = req_extra_vars {
            for (key, value) in req_extra_vars {
                if let Some(value) = value {
                    command += &format!(" {EXTRA_VARS} {}='{}'", key, value.to_string());
                } else {
                    warn!("Extra var {} is None", key);
                }
            }
        }
        trace!("Ansible command: {:?}", command);
        Ok(command)
    }
}
