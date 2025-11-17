use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_expiration: i64,
    pub refresh_token_expiration: i64,
    pub oauth_google_client_id: Option<String>,
    pub oauth_google_client_secret: Option<String>,
    pub oauth_github_client_id: Option<String>,
    pub oauth_github_client_secret: Option<String>,
    pub mfa_issuer: String,
}

impl Config {
    pub fn from_env() -> Result<Self, envy::Error> {
        envy::prefixed("AUTH_").from_env::<Self>()
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8081,
            database_url: String::new(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
            jwt_secret: String::new(),
            jwt_expiration: 3600,
            refresh_token_expiration: 2592000,
            oauth_google_client_id: None,
            oauth_google_client_secret: None,
            oauth_github_client_id: None,
            oauth_github_client_secret: None,
            mfa_issuer: "LLM-Governance".to_string(),
        }
    }
}
