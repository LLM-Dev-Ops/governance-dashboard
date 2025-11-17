use serde::Deserialize;
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    #[serde(default = "default_csrf_secret")]
    pub csrf_secret: String,
}

fn default_csrf_secret() -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(b"default_csrf_secret_change_in_production");
    format!("{:x}", hasher.finalize())
}

impl Config {
    pub fn from_env() -> Result<Self, envy::Error> {
        envy::prefixed("API-GATEWAY_").from_env::<Self>()
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8080,
            database_url: String::new(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
            csrf_secret: default_csrf_secret(),
        }
    }
}
