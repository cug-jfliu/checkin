use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
};
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    models::{checkin, user},
    utils::{auth_guard::AuthUser, errors::AppError, timezone},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/records", get(get_records))
        .route("/users", get(get_users))
        .route("/users", post(create_user))
        .route("/users/{id}", put(update_user))
        .route("/users/{id}", delete(delete_user))
        .route("/weekly-export", get(get_weekly_export))
}

#[derive(Deserialize)]
pub struct DateQuery {
    pub date: Option<String>, // format YYYY-MM-DD
}

#[derive(Serialize)]
pub struct AdminCheckinRecord {
    pub id: i32,
    pub username: String,
    pub name: Option<String>,
    pub checkin_time: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

async fn get_records(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<DateQuery>,
) -> Result<Json<Vec<AdminCheckinRecord>>, AppError> {
    if user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let mut select = checkin::Entity::find()
        .find_also_related(user::Entity)
        .order_by_desc(checkin::Column::CheckinTime);

    if let Some(date_str) = query.date {
        let (start_of_day, end_of_day) =
            timezone::parse_local_date_bounds(&date_str, timezone::timezone_offset())
                .map_err(|_| AppError::BadRequest("Invalid date format".into()))?;

        select = select
            .filter(checkin::Column::CheckinTime.gte(start_of_day))
            .filter(checkin::Column::CheckinTime.lt(end_of_day));
    }

    let results = select.all(&state.db).await?;

    let records: Vec<AdminCheckinRecord> = results
        .into_iter()
        .filter_map(|(c, u)| {
            u.map(|user_model| AdminCheckinRecord {
                id: c.id,
                username: user_model.username,
                name: user_model.name,
                checkin_time: c.checkin_time.to_rfc3339(),
                latitude: c.latitude,
                longitude: c.longitude,
            })
        })
        .collect();

    Ok(Json(records))
}

#[derive(Serialize)]
pub struct AdminUserRecord {
    pub id: i32,
    pub username: String,
    pub name: Option<String>,
    pub role: String,
    pub show_in_weekly: bool,
    pub created_at: String,
}

async fn get_users(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<AdminUserRecord>>, AppError> {
    if auth_user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let users = user::Entity::find()
        .order_by_asc(user::Column::Username)
        .all(&state.db)
        .await?;

    let records: Vec<AdminUserRecord> = users
        .into_iter()
        .map(|u| AdminUserRecord {
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            show_in_weekly: u.show_in_weekly,
            created_at: u.created_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(records))
}

#[derive(Deserialize)]
pub struct CreateUserPayload {
    pub username: String,
    pub name: Option<String>,
    pub password: Option<String>,
    pub role: String,
}

#[derive(Deserialize)]
pub struct UpdateUserPayload {
    pub username: String,
    pub name: Option<String>,
    pub password: Option<String>,
    pub role: String,
    pub show_in_weekly: bool,
}

async fn create_user(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateUserPayload>,
) -> Result<Json<AdminUserRecord>, AppError> {
    if user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let existing_user = user::Entity::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await?;
    if existing_user.is_some() {
        return Err(AppError::BadRequest("Username already exists".into()));
    }

    let password = payload.password.unwrap_or_else(|| "123456".to_string());
    let password_hash = crate::utils::hash::hash_password(&password)
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;

    let new_user = user::ActiveModel {
        username: Set(payload.username.clone()),
        name: Set(payload.name.clone()),
        password_hash: Set(password_hash),
        role: Set(payload.role.clone()),
        show_in_weekly: Set(true), // Default to true
        created_at: Set(chrono::Utc::now()),
        ..Default::default()
    };

    let u = new_user.insert(&state.db).await?;

    Ok(Json(AdminUserRecord {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        show_in_weekly: u.show_in_weekly,
        created_at: u.created_at.to_rfc3339(),
    }))
}

async fn update_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateUserPayload>,
) -> Result<Json<AdminUserRecord>, AppError> {
    if user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let user_model = user::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    // Check if new username conflicts with another user
    if user_model.username != payload.username {
        let existing = user::Entity::find()
            .filter(user::Column::Username.eq(&payload.username))
            .one(&state.db)
            .await?;
        if existing.is_some() {
            return Err(AppError::BadRequest("Username already exists".into()));
        }
    }

    let mut active_user: user::ActiveModel = user_model.into();
    active_user.username = Set(payload.username);
    active_user.name = Set(payload.name);
    active_user.role = Set(payload.role);
    active_user.show_in_weekly = Set(payload.show_in_weekly);

    if let Some(pwd) = payload.password {
        if !pwd.is_empty() {
            let password_hash = crate::utils::hash::hash_password(&pwd)
                .map_err(|e| AppError::InternalServerError(e.to_string()))?;
            active_user.password_hash = Set(password_hash);
        }
    }

    let u = active_user.update(&state.db).await?;

    Ok(Json(AdminUserRecord {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        show_in_weekly: u.show_in_weekly,
        created_at: u.created_at.to_rfc3339(),
    }))
}

async fn delete_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, AppError> {
    if user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let _ = checkin::Entity::delete_many()
        .filter(checkin::Column::UserId.eq(id))
        .exec(&state.db)
        .await?;

    let res = user::Entity::delete_by_id(id).exec(&state.db).await?;
    if res.rows_affected == 0 {
        return Err(AppError::NotFound("User not found".into()));
    }

    Ok(Json(serde_json::json!({ "message": "User deleted" })))
}

#[derive(Deserialize)]
pub struct WeeklyQuery {
    pub start_date: String, // format YYYY-MM-DD
}

#[derive(Serialize)]
pub struct UserWeeklySummary {
    pub id: i32,
    pub username: String,
    pub name: Option<String>,
    pub checkins: Vec<String>, // list of ISO timestamps
}

async fn get_weekly_export(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<WeeklyQuery>,
) -> Result<Json<Vec<UserWeeklySummary>>, AppError> {
    if user.role != "admin" {
        return Err(AppError::Unauthorized("Admin access required".into()));
    }

    let (start_of_week, _) =
        timezone::parse_local_date_bounds(&query.start_date, timezone::timezone_offset())
            .map_err(|_| AppError::BadRequest("Invalid start_date format".into()))?;
    let end_of_week = start_of_week + chrono::Duration::days(7);

    // Get all students that should be shown in weekly reports
    let students = user::Entity::find()
        .filter(user::Column::Role.eq("student"))
        .filter(user::Column::ShowInWeekly.eq(true))
        .order_by_asc(user::Column::Username)
        .all(&state.db)
        .await?;

    // Get all checkins in range
    let checkins = checkin::Entity::find()
        .filter(checkin::Column::CheckinTime.gte(start_of_week))
        .filter(checkin::Column::CheckinTime.lt(end_of_week))
        .all(&state.db)
        .await?;

    let mut summary = Vec::new();

    for student in students {
        // Collect timestamps
        let user_checkin_strings: Vec<String> = checkins
            .iter()
            .filter(|c| c.user_id == student.id)
            .map(|c| c.checkin_time.to_rfc3339())
            .collect();

        summary.push(UserWeeklySummary {
            id: student.id,
            username: student.username,
            name: student.name,
            checkins: user_checkin_strings,
        });
    }

    Ok(Json(summary))
}
