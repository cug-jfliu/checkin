use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};

use crate::utils::{errors::AppError, jwt::verify_token};

pub struct AuthUser {
    pub id: i32,
    #[allow(dead_code)]
    pub username: String,
    pub role: String,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, state)
                .await
                .map_err(|_| AppError::Unauthorized("Missing bearer token".into()))?;

        let claims = verify_token(bearer.token())?;

        Ok(AuthUser {
            id: claims.sub,
            username: claims.username,
            role: claims.role,
        })
    }
}
