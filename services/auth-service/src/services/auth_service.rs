use sqlx::PgPool;
use uuid::Uuid;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use llm_governance_common::{AppError, Result};
use chrono::Utc;
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub status: String,
    pub mfa_enabled: bool,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

pub struct AuthService {
    pool: PgPool,
}

// Helper function to hash tokens with SHA-256
fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

impl AuthService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn register_user(
        &self,
        email: &str,
        password: &str,
        name: &str,
    ) -> Result<User> {
        // Hash password using Argon2
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?
            .to_string();

        // Insert user into database
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (email, password_hash, name, status, mfa_enabled)
            VALUES ($1, $2, $3, 'pending', false)
            RETURNING id, email, password_hash, name, status, mfa_enabled, created_at, updated_at
            "#,
        )
        .bind(email)
        .bind(&password_hash)
        .bind(name)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(db_err) if db_err.constraint() == Some("users_email_key") => {
                AppError::BadRequest("Email already registered".to_string())
            }
            _ => AppError::Database(e),
        })?;

        Ok(user)
    }

    pub async fn authenticate_user(
        &self,
        email: &str,
        password: &str,
    ) -> Result<User> {
        // Fetch user by email
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, name, status, mfa_enabled, created_at, updated_at
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid credentials".to_string()))?;

        // Verify status
        if user.status != "active" {
            return Err(AppError::Auth(format!("Account is {}", user.status)));
        }

        // Verify password
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|e| AppError::Internal(format!("Invalid password hash: {}", e)))?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Auth("Invalid credentials".to_string()))?;

        Ok(user)
    }

    pub async fn get_user_by_id(&self, user_id: Uuid) -> Result<User> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, name, status, mfa_enabled, created_at, updated_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<User> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, name, status, mfa_enabled, created_at, updated_at
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn verify_email(&self, user_id: Uuid) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE users
            SET status = 'active'
            WHERE id = $1 AND status = 'pending'
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn initiate_password_reset(&self, email: &str) -> Result<String> {
        let user = self.get_user_by_email(email).await?;

        // Generate reset token
        let reset_token = Uuid::new_v4().to_string();
        let token_hash = hash_token(&reset_token);

        // Store token in database (expires in 1 hour)
        sqlx::query(
            r#"
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '1 hour')
            "#,
        )
        .bind(user.id)
        .bind(&token_hash)
        .execute(&self.pool)
        .await?;

        Ok(reset_token)
    }

    pub async fn reset_password(&self, token: &str, new_password: &str) -> Result<()> {
        let token_hash = hash_token(token);

        // Find valid token
        let result: Option<(Uuid,)> = sqlx::query_as(
            r#"
            SELECT user_id
            FROM password_reset_tokens
            WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
            "#,
        )
        .bind(&token_hash)
        .fetch_optional(&self.pool)
        .await?;

        let (user_id,) = result.ok_or_else(|| AppError::BadRequest("Invalid or expired token".to_string()))?;

        // Hash new password
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?
            .to_string();

        // Update password
        sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
        )
        .bind(&password_hash)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        // Mark token as used
        sqlx::query(
            r#"
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
            "#,
        )
        .bind(&token_hash)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn change_password(
        &self,
        user_id: Uuid,
        current_password: &str,
        new_password: &str,
    ) -> Result<()> {
        // Verify current password
        let user = self.get_user_by_id(user_id).await?;
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|e| AppError::Internal(format!("Invalid password hash: {}", e)))?;

        Argon2::default()
            .verify_password(current_password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Auth("Invalid current password".to_string()))?;

        // Hash new password
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?
            .to_string();

        // Update password
        sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
        )
        .bind(&password_hash)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
