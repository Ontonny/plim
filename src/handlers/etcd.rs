use std::collections::HashMap;

use crate::{config::{AnsibleBackendType, AnsibleEtcdBackend, DataSource, DataSourceType, PlimPlan, PlimPlanViewType}, jwt::Claims, state::AppState};
use axum::{extract::State, response::IntoResponse, Extension, Json};
use base64::{prelude::BASE64_STANDARD, Engine};
use log::trace;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{ ansible::{AnsibleInventoryParserLocal, Inventory}, PlimApiError, PlimErrorKind};

const ADMIN_ROLE_NAME: &str = "admin";

pub async fn get_plans_etcd_views(Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, PlimApiError> {
    get_etcd_view_data_source_list(claims, state).await.map(|data| (StatusCode::OK, Json(json!(data))))
}

pub async fn get_plans_etcd_inventories(Extension(claims): Extension<Claims>, State(state): State<AppState>) -> Result<impl IntoResponse, PlimApiError> {
    get_etcd_inventory_data_source_list(claims, state).await.map(|data| (StatusCode::OK, Json(json!(data))))
}

pub async fn update_etcd_key<T: Serialize, F>(state: AppState, etcd_name: String, key_path: String, key_value: T, serialize_fn : F) -> Result<(), PlimApiError>
where
    F: Fn(T) -> Result<String, PlimErrorKind>,
{
    let mut etcd_client = match state.etcd_clients_map.get(&etcd_name) {
        Some(client) => client.clone(),
        None => return Err(PlimErrorKind::not_found("Etcd client not found").into())
    };
    match etcd_client.put(key_path, serialize_fn(key_value)?, None).await {
        Ok(_) => Ok(()),
        Err(e) => Err(PlimErrorKind::internal_server_error(e.to_string()).into())
    }
}
pub async fn read_etcd_key(state: AppState, etcd_name: String, key_path: String) -> Result<String, PlimApiError> {
    let mut etcd_client = match state.etcd_clients_map.get(&etcd_name) {
        Some(client) => client.clone(),
        None => return Err(PlimErrorKind::not_found("Etcd client not found").into())
    };
    match etcd_client.get(key_path.clone(), None).await {
        Ok(resp) => {
            let kv = resp.kvs().first().ok_or_else(|| PlimErrorKind::not_found(format!("Key {} not found", key_path)))?;
            let value = String::from_utf8_lossy(kv.value()).to_string();
            trace!("read_etcd_key: {:?}", value);
            Ok(value)
        },
        Err(e) => Err(PlimErrorKind::internal_server_error(e.to_string()).into())
    }
}

pub async fn set_view_etcd_key(Extension(claims): Extension<Claims>, State(state): State<AppState>, Json(request): Json<EtcdSetViewRequest> ) -> Result<impl IntoResponse, PlimApiError> {
    if check_etcd_key_value_is_available_in_views(claims, state.clone(), request.etcd_name.clone(), request.key_path.clone()).await? {
        let to_json = |x: Vec<String>| serde_json::to_string(&x).map_err(|e| PlimErrorKind::internal_server_error(e.to_string()));
        update_etcd_key(state, request.etcd_name.clone(), request.key_path.clone(), request.key_value.clone(), to_json).await
    } else {
        Err(PlimErrorKind::not_found(format!("Etcd key value is not available for key {} and path {}", request.etcd_name, request.key_path)).into())
    }
}

pub async fn get_view_etcd_key(Extension(claims): Extension<Claims>, State(state): State<AppState>, Json(request): Json<EtcdGetViewRequest> ) -> Result<impl IntoResponse, PlimApiError> {
    if check_etcd_key_value_is_available_in_views(claims, state.clone(), request.etcd_name.clone(), request.key_path.clone()).await? {
        read_etcd_key(state, request.etcd_name.clone(), request.key_path.clone()).await
    } else {
        Err(PlimErrorKind::not_found(format!("Etcd key value is not available for key {} and path {}", request.etcd_name, request.key_path)).into())
    }
}

pub async fn get_etcd_inventory_data_source_list(claims: Claims, state: AppState) -> Result<Vec<AnsibleEtcdBackend>, PlimApiError> {
    let available_plans = get_available_plans(claims, state).await?;
    let etcd_backend_inventory_list: Vec<AnsibleEtcdBackend> = available_plans.values().
    flat_map(|plan| plan.ansible.clone()).filter_map(|ansible| match ansible.backend_inventory {
        AnsibleBackendType::Etcd(etcd) => Some(etcd),
        _ => None,
    }).collect();
    Ok(etcd_backend_inventory_list)
}

pub async fn set_inventory_etcd_key(Extension(claims): Extension<Claims>, State(state): State<AppState>, Json(request): Json<EtcdSetInventoryRequest> ) -> Result<impl IntoResponse, PlimApiError> {
    if check_etcd_key_value_is_available_in_inventories(claims, state.clone(), request.etcd_name.clone(), request.key_path.clone()).await? {
        let decoded_bytes = BASE64_STANDARD.decode(request.key_value.clone()).map_err(|e| PlimErrorKind::internal_server_error(e.to_string()))?;
        let key_value = String::from_utf8(decoded_bytes).map_err(|e| PlimErrorKind::internal_server_error(e.to_string()))?;
        let inventory = AnsibleInventoryParserLocal::parse_yaml(&key_value).map_err(|e| PlimErrorKind::internal_server_error("Failed to parse yaml inventory"))?;
        trace!("inventory: {:?}", inventory);
        let to_yaml = |x: Inventory| serde_yaml::to_string(&x).map_err(|e| PlimErrorKind::internal_server_error(e.to_string()));
        update_etcd_key(state, request.etcd_name.clone(), request.key_path.clone(), inventory.clone(), to_yaml).await?;
        Ok(Json(json!(inventory)))
    } else {
        Err(PlimErrorKind::not_found(format!("Etcd key value is not available for key {} and path {}", request.etcd_name, request.key_path)).into())
    }
}

pub async fn get_inventory_etcd_key(Extension(claims): Extension<Claims>, State(state): State<AppState>, Json(request): Json<EtcdGetViewRequest> ) -> Result<impl IntoResponse, PlimApiError> {
    if check_etcd_key_value_is_available_in_inventories(claims, state.clone(), request.etcd_name.clone(), request.key_path.clone()).await? {
        let value = read_etcd_key(state, request.etcd_name.clone(), request.key_path.clone()).await?;
        let value_base64 = BASE64_STANDARD.encode(value);
        Ok(Json(json!(value_base64)))
    } else {
        Err(PlimErrorKind::not_found(format!("Etcd key value is not available for key {} and path {}", request.etcd_name, request.key_path)).into())
    }
}

// not http api methods below

pub async fn get_etcd_view_data_source_list(claims: Claims, state: AppState) -> Result<Vec<DataSource>, PlimApiError> {
    let available_plans = get_available_plans(claims, state).await?;
    let data_source_is_exist = PlimPlanViewType::data_source_is_exist(
        &available_plans.values().flat_map(|plan| plan.views.clone()).collect());
    if !data_source_is_exist {
        return Err(PlimErrorKind::not_found("No data source found").into());
    }
    // get all data source from all plans
    let etcd_data_source_list: Vec<DataSource> = available_plans.values()
        .flat_map(|plan| plan.views.clone()).filter_map(|view| match view {
            PlimPlanViewType::Multi(view) => view.data_source.filter(|ds| ds.source_type == DataSourceType::Etcd),
            PlimPlanViewType::CheckboxList(view) => view.data_source.filter(|ds| ds.source_type == DataSourceType::Etcd),
            PlimPlanViewType::Dynamic(view) => view.data_source.filter(|ds| ds.source_type == DataSourceType::Etcd),
            PlimPlanViewType::One(view) => view.data_source.filter(|ds| ds.source_type == DataSourceType::Etcd),
        }).collect();
    Ok(etcd_data_source_list)
}

pub async fn get_available_plans(claims: Claims, state: AppState) -> Result<HashMap<String, PlimPlan>, PlimApiError> {
    let available_plans = if claims.roles.contains(&ADMIN_ROLE_NAME.into()) {
        state.config.plans.clone()
    } else {
        state.config.filter_plans_by_groups(&claims.roles)
    };
    Ok(available_plans)
}

pub async fn check_etcd_key_value_is_available_in_views(claims: Claims, state: AppState, etcd_name: String, key_path: String) -> Result<bool, PlimApiError> {
    let etcd_data_source_list = get_etcd_view_data_source_list(claims, state).await?;
    let etcd_data_source = etcd_data_source_list.iter().find(|ds| ds.etcd_name == etcd_name && ds.key_path == key_path);
    if etcd_data_source.is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

pub async fn check_etcd_key_value_is_available_in_inventories(claims: Claims, state: AppState, etcd_name: String, key_path: String) -> Result<bool, PlimApiError> {
    let etcd_data_source_list = get_etcd_inventory_data_source_list(claims, state).await?;
    let etcd_data_source = etcd_data_source_list.iter().find(|ds| ds.etcd_name == etcd_name && ds.key_path == key_path);
    if etcd_data_source.is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

#[derive(Deserialize)]
pub struct EtcdSetInventoryRequest {
    pub etcd_name: String,
    pub key_path: String,
    pub key_value: String,
}
#[derive(Deserialize)]
pub struct EtcdGetInventoryRequest {
    pub etcd_name: String,
    pub key_path: String,
}

#[derive(Deserialize)]
pub struct EtcdSetViewRequest {
    pub etcd_name: String,
    pub key_path: String,
    pub key_value: Vec<String>,
}

#[derive(Deserialize)]
pub struct EtcdGetViewRequest {
    pub etcd_name: String,
    pub key_path: String,
}
