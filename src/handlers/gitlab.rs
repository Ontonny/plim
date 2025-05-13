use std::collections::HashMap;

use axum::{http::HeaderMap, response::IntoResponse, Json};
use derive_merge_struct::Merge;
use log::trace;
use super::handlers::*;
use crate::{config::{AnsibleConfig, AnyValue, ExecuteApiType, GetPlanViewData, PlanType, PlimPlanViewType, WebhookType}, http_client::gitlab::responses::GitLabBranchesArgs};

const TOKEN_HEADER_NAME: &str = "TOKEN";

pub async fn trigger_gitlab_pipeline_by_webhook(
    headers: HeaderMap,
    Path((plan_name, webhook_name)): Path<(String, String)>,
    State(state): State<AppState>,
    Json(wh_request_data): Json<WebhookPipelineRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let plan = match state.config.plans.get(&plan_name) {
        Some(plan) => plan.clone(),
        None => {
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": "Plan not found"}))));
        }
    };
    let wh = match plan.webhooks {
        Some(wh) => wh,
        None => {
            return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": "Webhook is not defined"}))));
        }
    };
    let webhook = match wh.iter().find(|wh| wh.name == webhook_name) {
        Some(webhook) => webhook,
        None => {
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": "Webhook not found"}))));
        }
    };
    // token validation here
    let header_token = match headers.get(TOKEN_HEADER_NAME) {
        Some(token) => match token.to_str() {
            Ok(token) => token,
            Err(_) => return Ok((StatusCode::FORBIDDEN, Json(json!({"error": "Webhook token is not valid"})))),
        },
        None => return Ok((StatusCode::FORBIDDEN, Json(json!({"error": "Webhook token is missing"})))),
    };
    match state.gitlab_tokens.get(&webhook.trigger_token).await {
        Ok(token) => {
            if token != header_token || state.config.plim.webhook_token_length != header_token.len() as u8 {
                return Ok((StatusCode::FORBIDDEN, Json(json!({"error": "Webhook token is not valid or short"}))));
            }
        }
        Err(_) => {
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": "Webhook token is missing"}))));
        }
    };
    let gitlab_token = match state.gitlab_tokens.get(&plan.gitlab.token_var).await {
        Ok(token) => token,
        Err(_) => {
            let error_message = format!("Your token {} is missing", &plan.gitlab.token_var);
            error!("{}", error_message);
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": error_message}))));
        }
    };

    let wh_ansible = webhook.ansible.clone();
    let ansible_data = match wh_ansible {
        Some(ansible_data) => {
            if webhook.type_name == WebhookType::Dynamic {
                if let Some(ansible_data) = wh_request_data.ansible_data {
                    ansible_data.clone().merge(ansible_data);
                }
            }
            Some(ansible_data)
        }
        None => {
            plan.ansible
        }
    };

    let wh_views = webhook.views.clone();
    let views_data: HashMap<String, Option<AnyValue>> = match wh_views {
        Some(views) => {
            let defined_views: HashMap<String, Option<AnyValue>>  = views.iter().flat_map(|view| view.clone().get_data()).collect();
            if webhook.type_name == WebhookType::Dynamic {
                if let Some(requested_views) = wh_request_data.views {
                    let requested_views: HashMap<String, Option<AnyValue>> = requested_views.iter().flat_map(|view| view.clone().get_data()).collect();
                    defined_views.into_iter().chain(requested_views.into_iter()).collect() // merged views here
                } else {
                    defined_views
                }
            } else {
                defined_views
            }
        }
        None => {
            plan.views.iter().flat_map(|view| view.clone().get_data()).collect()
        }
    };

    trace!("Views data: {:?}", views_data);
    trace!("Ansible data: {:?}", ansible_data);

    let default_pipeline_data = TriggerPipelineRequest::new(
        Some(views_data),
        ansible_data,
        Some(GitlabParams {
            selected_ref: plan.gitlab.ref_name.clone(),
        }),
    );

    let trigger_pipeline_payload = match webhook.type_name {
        WebhookType::Static => {
            match plan.type_name {
                PlanType::GitlabAnsibleBase64 => {
                    let ansible_cmd = state.ansible_command_generator
                        .gen_ansible_cmd(&default_pipeline_data)
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

                    let json_data_key = plan.gitlab.json_data_key.as_ref()
                        .ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "JSON data key required for gitlab-ansible-base64 type"}))))?;

                    Ok(make_base64_payload_for_create_pipeline_api(
                        &ansible_cmd,
                        &plan.gitlab.ref_name,
                        json_data_key,
                    ))
                }
                _ => Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid plan type - not implemented"})))),
            }
        },
        WebhookType::Dynamic => {
            match plan.type_name {
                PlanType::GitlabAnsibleBase64 => {
                    let ansible_cmd = state.ansible_command_generator
                        .gen_ansible_cmd(&default_pipeline_data)
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

                    let json_data_key = plan.gitlab.json_data_key.as_ref()
                        .ok_or((StatusCode::BAD_REQUEST, Json(json!({"error": "JSON data key required for gitlab-ansible-base64 type"}))))?;

                    Ok(make_base64_payload_for_create_pipeline_api(
                        &ansible_cmd,
                        &plan.gitlab.ref_name,
                        json_data_key,
                    ))
                }
                _ => Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid plan type - not implemented"})))),
            }
        }
    };

    let trigger_pipeline_payload = trigger_pipeline_payload?;

    let gitlab_response = match plan.gitlab.execute_api_type {
        ExecuteApiType::Create => {
            state
                .gitlab_client
                .create_gitlab_pipeline(
                    plan.gitlab.project_id,
                    &trigger_pipeline_payload,
                    &gitlab_token,
                )
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))
        }
        ExecuteApiType::Trigger => {
            state
                .gitlab_client
                .trigger_gitlab_pipeline(
                    plan.gitlab.project_id,
                    &trigger_pipeline_payload,
                    &gitlab_token,
                )
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))
        }
    };

    let json_response = json!({
        "status": "success",
        "url": gitlab_response?.web_url
    });

    Ok((StatusCode::OK, Json(json_response)))
}

pub async fn trigger_gitlab_pipeline(
    Path(plan_name): Path<String>,
    State(state): State<AppState>,
    Json(pipeline_data): Json<TriggerPipelineRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let plan = match state.config.plans.get(&plan_name) {
        Some(plan) => plan.clone(),
        None => {
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": "Plan not found"}))));
        }
    };
    let gitlab_token = match state.gitlab_tokens.get(&plan.gitlab.token_var).await {
        Ok(token) => token,
        Err(_) => {
            let error_message = format!("Your token {} is missing", &plan.gitlab.token_var);
            error!("{}", error_message);
            return Ok((StatusCode::NOT_FOUND, Json(json!({"error": error_message}))));
        }
    };

    let json_data = match pipeline_data.json_data {
        Some(ref json_data) => json_data.clone(),
        None => {
            return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": "JSON data view"}))));
        }
    };

    let ansible_data = match pipeline_data.ansible_data {
        Some(ref ansible_data) => ansible_data.clone(),
        None => {
            if plan.type_name == PlanType::GitlabAnsibleBase64 {
                return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": "Ansible data required for gitlab-ansible-base64 type"}))));
            } else {
                AnsibleConfig::default()
            }
        }
    };
    let trigger_pipeline_payload = match plan.type_name {
        PlanType::GitlabAnsibleBase64 => {
            let json_data_key = match plan.gitlab.json_data_key {
                Some(ref json_data_key) => json_data_key,
                None => return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": "JSON data key required for gitlab-ansible-base64 type"})))),
            };
            match pipeline_data.gitlab_data {
                Some(ref gitlab_data) => {
                    let ansible_cmd = match state.ansible_command_generator.gen_ansible_cmd(&pipeline_data) {
                        Ok(it) => it,
                        Err(err) => return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": err.to_string()})))),
                    };
                    make_base64_payload_for_create_pipeline_api(
                        &ansible_cmd,
                        &gitlab_data.selected_ref,
                        json_data_key,
                    )
                }
                None => {
                    let ansible_cmd = match state.ansible_command_generator.gen_ansible_cmd(&pipeline_data) {
                        Ok(it) => it,
                        Err(err) => return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": err.to_string()})))),
                    };
                    make_base64_payload_for_create_pipeline_api(
                        &ansible_cmd,
                        &plan.gitlab.ref_name,
                        json_data_key,
                    )
                }
            }
        }
        PlanType::GitlabBase64 => {
            make_base64_payload_for_create_pipeline_api(
                &serde_json::to_string(&json_data).map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid json data"}))))?,
                &plan.gitlab.ref_name,
                &plan.gitlab.json_data_key.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({"error": "JSON data key required for gitlab-base64 type"}))))?,
            )
        }
        PlanType::GitlabAnsibleNative => {
            match pipeline_data.ansible_data {
                Some(ansible_data) => json!({
                    "variables": ansible_data
                }),
                None => {
                    return Ok((StatusCode::BAD_REQUEST, Json(json!({"error": "Ansible data required for gitlab-ansible-native type"}))));
                }
            }
        }
        PlanType::GitlabNative => {
            make_native_payload_for_create_pipeline_api(
                &json_data,
                &plan.gitlab.ref_name,
            )
        }
    };

    trace!("TRINGGER PAYLOAD {:?}", trigger_pipeline_payload);

    let gitlab_response = match plan.gitlab.execute_api_type {
        ExecuteApiType::Create => {
            state
                .gitlab_client
                .create_gitlab_pipeline(
                    plan.gitlab.project_id,
                    &trigger_pipeline_payload,
                    &gitlab_token,
                )
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        }
        ExecuteApiType::Trigger => {
            state
                .gitlab_client
                .trigger_gitlab_pipeline(
                    plan.gitlab.project_id,
                    &trigger_pipeline_payload,
                    &gitlab_token,
                )
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        }
    };

    let json_response = json!({
        "url": gitlab_response.web_url,
        "ref": gitlab_response.ref_name,
        "status": gitlab_response.status,
        "tag": gitlab_response.tag,
        "yaml_errors": gitlab_response.yaml_errors,
        "user": gitlab_response.user,
        "created_at": gitlab_response.created_at,
    });

    Ok((StatusCode::OK, Json(json_response)))
}

#[derive(Deserialize, Clone)]
pub struct TriggerPipelineRequest {
    pub json_data: Option<HashMap<String, Option<AnyValue>>>,
    pub ansible_data: Option<AnsibleConfig>,
    pub gitlab_data: Option<GitlabParams>,
}

impl TriggerPipelineRequest {
    pub fn new(json_data: Option<HashMap<String, Option<AnyValue>>>, ansible_data: Option<AnsibleConfig>, gitlab_data: Option<GitlabParams>) -> Self {
        Self { json_data, ansible_data, gitlab_data }
    }
}

#[derive(Deserialize)]
pub struct WebhookPipelineRequest {
    pub ansible_data: Option<AnsibleConfig>,
    pub views: Option<Vec<PlimPlanViewType>>,
}

#[derive(Deserialize, Clone)]
pub struct GitlabParams {
    pub selected_ref: String,
}

fn make_base64_payload_for_create_pipeline_api(
    json_string: &str,
    ref_name: &str,
    json_data_base64_key: &str,
) -> serde_json::Value {
    let variables_payload = BASE64_STANDARD.encode(json_string);
    let data = json!({
        "ref": ref_name,
        "variables": [{
            "key": json_data_base64_key,
            "variable_type": "file",
            "value": variables_payload
        }]
    });
    data
}
fn make_base64_payload_for_trigger_pipeline_api(
    json_data: &HashMap<String, Option<AnyValue>>,
    token: &str,
    ref_name: &str,
    json_data_base64_key: &str,
) -> Result<serde_json::Value, (StatusCode, Json<serde_json::Value>)> {
    let json_bytes: Vec<u8> = get_json_bytes(json_data)?;
    let encoded_json = BASE64_STANDARD.encode(json_bytes);

    let mut data = HashMap::new();
    data.insert("token".to_string(), token.to_string());
    data.insert("ref".to_string(), ref_name.to_string());
    data.insert(json_data_base64_key.to_string(), encoded_json);

    match serde_json::to_value(data) {
        Ok(payload) => Ok(payload),
        Err(e) => {
            error!("Failed to create base64 payload: {}", e);
            Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid plan type - not implemented"}))))
        }
    }
}

fn make_native_payload_for_trigger_pipeline_api(
    json_data: &HashMap<String, Option<AnyValue>>,
    token: &str,
    ref_name: &str,
) -> Result<serde_json::Value, (StatusCode, Json<serde_json::Value>)> {
    let mut data = json_data
        .iter()
        .filter_map(|(key, value)| {
            value
                .as_ref()
                .map(|v| (format!("variables[{}]", key), v.clone()))
        })
        .collect::<HashMap<_, _>>();

    data.insert("token".to_string(), AnyValue::String(token.to_string()));
    data.insert("ref".to_string(), AnyValue::String(ref_name.to_string()));

    match serde_json::to_value(data) {
        Ok(payload) => Ok(payload),
        Err(e) => {
            error!("Failed to create native payload: {}", e);
            Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid plan type - not implemented"}))))
        }
    }
}

fn make_native_payload_for_create_pipeline_api(
    json_data: &HashMap<String, Option<AnyValue>>,
    ref_name: &str,
) -> serde_json::Value {
    let variables = json_data
        .iter()
        .filter_map(|(key, value)| value.as_ref().map(|v| json!({"key": key, "value": v})))
        .collect::<Vec<_>>();
    json!({
        "ref": ref_name,
        "variables": variables
    })
}

pub async fn get_gitlab_refs(
    State(state): State<AppState>,
    Path(plan_name): Path<String>,
) -> impl IntoResponse {
    let plan = match state.config.plans.get(&plan_name) {
        Some(plan) => plan.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Plan not found"})),
            )
        }
    };
    if !plan.gitlab.ref_select.ref_select_enabled {
        return (
            StatusCode::OK,
            Json(json!(vec![plan.gitlab.ref_name])),
        );
    }
    let mut refs = Vec::new();
    match state.gitlab_tokens.get(&plan.gitlab.token_var).await {
        Ok(gitlab_token) => {
            if plan.gitlab.ref_select.branch_enabled {
                let branches = state
                .gitlab_client
                .get_gitlab_branches(
                    GitLabBranchesArgs {
                        project_id: plan.gitlab.project_id,
                        token: gitlab_token.to_string(),
                        search: plan.gitlab.ref_select.branch_search_name,
                        regex: plan.gitlab.ref_select.branch_regex,
                    }
                )
                .await;
                if let Ok(branches) = branches {
                    let branch_list = branches
                        .iter()
                        .map(|branch| branch.name.clone())
                        .collect::<Vec<String>>();
                    refs.extend(branch_list);
                }
            }
            if plan.gitlab.ref_select.tag_enabled {
                let tags = state
                    .gitlab_client
                .get_gitlab_tags(
                    plan.gitlab.project_id,
                    &gitlab_token,
                    plan.gitlab.ref_select.tag_search_name,
                    plan.gitlab.ref_select.tag_regex,
                )
                .await;
                if let Ok(tags) = tags {
                    let tag_list = tags
                        .iter()
                        .map(|tag| tag.name.clone())
                        .collect::<Vec<String>>();
                    refs.extend(tag_list);
                }
            }
            
            
            
            (StatusCode::OK, Json(json!(refs)))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}


fn get_json_bytes(json_data: &HashMap<String, Option<AnyValue>>) -> Result<Vec<u8>, (StatusCode, Json<serde_json::Value>)> {
    let json_bytes: Vec<u8> = match serde_json::to_string(json_data) {
        Ok(json_string) => json_string.into_bytes(),
        Err(e) => {
            // throw http error
            return Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid plan type - not implemented"}))));
        }
    };
    Ok(json_bytes)
}