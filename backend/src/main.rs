use axum::{Router, routing::get};
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::prelude::*;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

mod api;
mod migration;
mod models;
mod utils;
// mod services;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    env_logger::init();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    log::info!("Connecting to database...");

    let db = Database::connect(&db_url).await?;
    log::info!("Database connected!");

    // Run migrations
    migration::Migrator::up(&db, None).await?;
    log::info!("Database migrations complete.");

    let state = AppState { db };

    // Set up CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build routes
    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .nest("/api/auth", api::auth::router())
        .nest("/api/checkin", api::checkin::router())
        .nest("/api/admin", api::admin::router())
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()?;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    log::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
