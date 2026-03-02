use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    models::user,
    utils::{errors::AppError, hash, jwt},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

#[derive(Deserialize)]
pub struct AuthPayload {
    pub username: String,
    pub name: Option<String>,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: i32,
    pub username: String,
    pub name: Option<String>,
    pub role: String,
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> Result<(StatusCode, Json<AuthResponse>), AppError> {
    // Check if user exists
    let existing_user = user::Entity::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await?;

    if existing_user.is_some() {
        return Err(AppError::BadRequest("Username already exists".into()));
    }

    // Role defaults to student, but if it's the first user we could make them an admin.
    let count = user::Entity::find().count(&state.db).await?;
    let role = if count == 0 { "admin" } else { "student" };

    let password_hash = hash::hash_password(&payload.password)
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;

    let new_user = user::ActiveModel {
        username: Set(payload.username.clone()),
        name: Set(payload.name.clone()),
        password_hash: Set(password_hash),
        role: Set(role.to_string()),
        show_in_weekly: Set(true),
        created_at: Set(chrono::Utc::now()),
        ..Default::default()
    };

    let user = new_user.insert(&state.db).await?;

    let token = jwt::create_token(user.id, &user.username, &user.role)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: UserInfo {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
            },
        }),
    ))
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> Result<Json<AuthResponse>, AppError> {
    let user = user::Entity::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid username or password".into()))?;

    let is_valid = hash::verify_password(&payload.password, &user.password_hash)
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;

    if !is_valid {
        return Err(AppError::Unauthorized(
            "Invalid username or password".into(),
        ));
    }

    let token = jwt::create_token(user.id, &user.username, &user.role)?;

    Ok(Json(AuthResponse {
        token,
        user: UserInfo {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        },
    }))
}
