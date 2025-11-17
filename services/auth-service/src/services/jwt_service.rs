use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
    pub user_id: Uuid,
    pub email: String,
}

pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    expiration: i64,
}

impl JwtService {
    pub fn new(secret: &str, expiration: i64) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            expiration,
        }
    }

    pub fn generate_token(&self, user_id: Uuid, email: &str) -> Result<String, anyhow::Error> {
        let now = chrono::Utc::now().timestamp() as usize;
        let exp = (chrono::Utc::now().timestamp() + self.expiration) as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            exp,
            iat: now,
            user_id,
            email: email.to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Failed to generate token: {}", e))
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims, anyhow::Error> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &Validation::default())
            .map_err(|e| anyhow::anyhow!("Invalid token: {}", e))?;

        Ok(token_data.claims)
    }

    pub fn generate_refresh_token(&self) -> String {
        Uuid::new_v4().to_string()
    }
}
