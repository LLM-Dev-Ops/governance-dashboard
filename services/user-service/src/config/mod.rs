use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, envy::Error> {
        envy::prefixed("USER-SERVICE_").from_env::<Self>()
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8082,
            database_url: String::new(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
        }
    }
}
