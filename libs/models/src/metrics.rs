use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Metric {
    pub id: Uuid,
    pub metric_name: String,
    pub metric_value: f64,
    pub tags: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}
