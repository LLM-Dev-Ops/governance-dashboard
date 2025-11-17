use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CostEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider: String,
    pub model: String,
    pub tokens_used: i64,
    pub cost_usd: String,
    pub created_at: DateTime<Utc>,
}
