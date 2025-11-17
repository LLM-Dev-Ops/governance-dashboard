use actix_web::{web, App, HttpServer};
use tracing::{info, Level};
use tracing_subscriber;

mod config;
mod handlers;
mod middleware;
mod models;
mod services;

use config::Config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    // Load configuration
    dotenv::dotenv().ok();
    let config = Config::from_env().expect("Failed to load configuration");

    info!("Starting auth-service on {}:{}", config.host, config.port);

    // Initialize database connection pool
    let db_pool = llm_governance_database::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Initialize Redis connection
    let redis_client = redis::Client::open(config.redis_url.clone())
        .expect("Failed to create Redis client");

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db_pool.clone()))
            .app_data(web::Data::new(redis_client.clone()))
            .app_data(web::Data::new(config.clone()))
            .wrap(tracing_actix_web::TracingLogger::default())
            .configure(handlers::configure)
    })
    .bind((config.host.as_str(), config.port))?
    .run()
    .await
}
