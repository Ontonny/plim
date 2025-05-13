use anyhow::Error;
use log::trace;
use crate::{config::{AnyValue, DataSource, DataSourceType, GetPlanViewData, PlimPlanViewType}, jwt::Claims};

const ADMIN_ROLE_NAME: &str = "admin";

pub async fn get_all_plans(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>) -> impl IntoResponse {
    if claims.roles.is_empty() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Forbidden"}))).into_response();
    }
    if claims.roles.contains(&ADMIN_ROLE_NAME.into()) {
        let all_plans = state.config.plans.clone();
        return json_response(all_plans).into_response();
    }
    let available_plans = state.config.filter_plans_by_groups(&claims.roles);
    trace!("Plans: {:?}", available_plans.keys());
    json_response(available_plans).into_response()
}


use super::handlers::*;
pub async fn get_plan(Path(plan_name): Path<String>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>) -> impl IntoResponse {
    let available_plans = if claims.roles.contains(&ADMIN_ROLE_NAME.into()) {
        state.config.plans.clone()
    } else {
        state.config.filter_plans_by_groups(&claims.roles)
    };
    let mut plan = match available_plans.get(&plan_name) {
        Some(plan) => plan.clone(),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Plan not found"}))),
    };
    let plan_views = plan.views.clone();

    if !PlimPlanViewType::data_source_is_exist(&plan_views) {
        return json_response(plan);
    }
    // below only for etcd data logic
    let mut plan_views_with_etcd_data: Vec<PlimPlanViewType> = Vec::new();
    for view in plan_views {
        match view {
            PlimPlanViewType::Multi(mut view) => {
                if let Some(ref data_source) = view.data_source {
                    match data_source.source_type {
                        DataSourceType::Etcd => {
                            let etcd_data = get_etcd_data(&state, data_source).await;
                            match etcd_data {
                                Ok(data) => {
                                    view.data = data;
                                    plan_views_with_etcd_data.push(PlimPlanViewType::Multi(view));
                                }
                                Err(e) => {
                                    error!("Error getting etcd data: {}", e);
                                }
                            }
                        }
                        _ => {
                            plan_views_with_etcd_data.push(PlimPlanViewType::Multi(view.clone()));
                            trace!("BUGG: {:?}", view.clone());
                        }
                    }
                }
                
            },
            PlimPlanViewType::One(mut view) => {
                if let Some(ref data_source) = view.data_source {
                    match data_source.source_type {
                        DataSourceType::Etcd => {
                            let etcd_data = get_etcd_data(&state, data_source).await;
                            match etcd_data {
                                Ok(data) => {
                                    view.value = Some(data[0].clone());
                                    plan_views_with_etcd_data.push(PlimPlanViewType::One(view));
                                }
                                Err(e) => {
                                    error!("Error getting etcd data: {}", e);
                                }
                            }
                        }
                        _ => {
                            plan_views_with_etcd_data.push(PlimPlanViewType::One(view));
                        }
                    }
                }
            },
            PlimPlanViewType::CheckboxList(mut view) => {
                if let Some(ref data_source) = view.data_source {
                    match data_source.source_type {
                        DataSourceType::Etcd => {
                            let etcd_data = get_etcd_data(&state, data_source).await;
                            match etcd_data {
                                Ok(data) => {
                                    view.values = data;
                                    plan_views_with_etcd_data.push(PlimPlanViewType::CheckboxList(view));
                                }
                                Err(e) => {
                                    error!("Error getting etcd data: {}", e);
                                }
                            }
                        }
                        _ => {
                            plan_views_with_etcd_data.push(PlimPlanViewType::CheckboxList(view));
                        }
                    }
                }
            },
            PlimPlanViewType::Dynamic(mut view) => {
                if let Some(ref data_source) = view.data_source {
                    match data_source.source_type {
                        DataSourceType::Etcd => {
                            let etcd_data = get_etcd_data(&state, data_source).await;
                            match etcd_data {
                                Ok(data) => {
                                    view.data = data;
                                    plan_views_with_etcd_data.push(PlimPlanViewType::Dynamic(view));
                                }
                                Err(e) => {
                                    error!("Error getting etcd data: {}", e);
                                }
                            }
                        }
                        _ => {
                            plan_views_with_etcd_data.push(PlimPlanViewType::Dynamic(view));
                        }
                    }
                }
            },
        }
    }
    trace!("Plan views with etcd data: {:?}", plan_views_with_etcd_data);
    plan.views = plan_views_with_etcd_data;
    json_response(plan)
}

async fn get_etcd_data(state: &AppState, data_source: &DataSource) -> Result<Vec<AnyValue>, Error> {
    let etcd_name = data_source.etcd_name.clone();
    let etcd_client = match state.etcd_clients_map.get(&etcd_name) {
        Some(etcd_client) => etcd_client,
        None => return Err(anyhow::anyhow!("Etcd client not found")),
    };
    let key_path = data_source.key_path.clone();
    let etcd_data = etcd_client.clone().get(key_path.clone(), None).await?;
    let etcd_data = match etcd_data.kvs().first() {
        Some(etcd_data) => etcd_data,
        None => return Err(anyhow::anyhow!("Key not found")),
    };
    trace!("Key: {}, Value: {:?}", &key_path, String::from_utf8_lossy(etcd_data.value()));
    let result: Result<Vec<AnyValue>, Error> = match serde_json::from_slice::<Vec<AnyValue>>(etcd_data.value()) {
        Ok(ref data) => {
            info!("Key: {}, Deserialized: {:?}", &key_path, data);
            Ok(data.clone())
        }
        Err(ref e) => {
            error!("Key: {}, Failed to deserialize: {}", &key_path, e.to_string());
            Err(anyhow::anyhow!(e.to_string()))
        }
    };
    result
}

// fn data_source_is_exist(plan_views: &Vec<PlimPlanViewType>) -> bool {
//     let mut is_exist = false;
//     for view in plan_views {
//         if view.check_data_source_is_exist() {
//             is_exist = true;
//         }
//     }
//     is_exist
// }

