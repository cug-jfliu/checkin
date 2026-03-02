use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    models::checkin,
    utils::{auth_guard::AuthUser, errors::AppError},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_checkin))
        .route("/today", get(get_today_checkin))
        .route("/history", get(get_history))
}

#[derive(Deserialize)]
pub struct CheckinPayload {
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Serialize)]
pub struct CheckinResponse {
    pub id: i32,
    pub checkin_time: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

async fn create_checkin(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CheckinPayload>,
) -> Result<(StatusCode, Json<CheckinResponse>), AppError> {
    // Check if checkin already exists for today
    use chrono::{Datelike, TimeZone, Utc};
    let now = Utc::now();
    let start_of_day = Utc
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap();
    let end_of_day = start_of_day + chrono::Duration::days(1);

    let existing = checkin::Entity::find()
        .filter(checkin::Column::UserId.eq(user.id))
        .filter(checkin::Column::CheckinTime.gte(start_of_day))
        .filter(checkin::Column::CheckinTime.lt(end_of_day))
        .one(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Already checked in today".into()));
    }

    let new_checkin = checkin::ActiveModel {
        user_id: Set(user.id),
        checkin_time: Set(now),
        latitude: Set(payload.latitude),
        longitude: Set(payload.longitude),
        ..Default::default()
    };

    let result = new_checkin.insert(&state.db).await?;

    Ok((
        StatusCode::CREATED,
        Json(CheckinResponse {
            id: result.id,
            checkin_time: result.checkin_time.to_rfc3339(),
            latitude: result.latitude,
            longitude: result.longitude,
        }),
    ))
}

async fn get_today_checkin(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Option<CheckinResponse>>, AppError> {
    use chrono::{Datelike, TimeZone, Utc};
    let now = Utc::now();
    let start_of_day = Utc
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .unwrap();
    let end_of_day = start_of_day + chrono::Duration::days(1);

    let existing = checkin::Entity::find()
        .filter(checkin::Column::UserId.eq(user.id))
        .filter(checkin::Column::CheckinTime.gte(start_of_day))
        .filter(checkin::Column::CheckinTime.lt(end_of_day))
        .one(&state.db)
        .await?;

    match existing {
        Some(c) => Ok(Json(Some(CheckinResponse {
            id: c.id,
            checkin_time: c.checkin_time.to_rfc3339(),
            latitude: c.latitude,
            longitude: c.longitude,
        }))),
        None => Ok(Json(None)),
    }
}

async fn get_history(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<CheckinResponse>>, AppError> {
    let checkins = checkin::Entity::find()
        .filter(checkin::Column::UserId.eq(user.id))
        .order_by_desc(checkin::Column::CheckinTime)
        .all(&state.db)
        .await?;

    let history: Vec<CheckinResponse> = checkins
        .into_iter()
        .map(|c| CheckinResponse {
            id: c.id,
            checkin_time: c.checkin_time.to_rfc3339(),
            latitude: c.latitude,
            longitude: c.longitude,
        })
        .collect();

    Ok(Json(history))
}
