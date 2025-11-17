use sqlx::PgPool;
use uuid::Uuid;
use totp_rs::{Algorithm, TOTP, Secret};
use qrcode::QrCode;
use qrcode::render::svg;
use llm_governance_common::{AppError, Result};
use chrono::Utc;

pub struct MfaService {
    pool: PgPool,
    issuer: String,
}

impl MfaService {
    pub fn new(pool: PgPool, issuer: String) -> Self {
        Self { pool, issuer }
    }

    pub async fn setup_mfa(&self, user_id: Uuid, email: &str) -> Result<MfaSetupResponse> {
        // Generate secret
        let secret = Secret::generate_secret();
        let secret_base32 = secret.to_encoded().to_string();

        // Create TOTP instance
        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.to_bytes().unwrap(),
            Some(self.issuer.clone()),
            email.to_string(),
        ).map_err(|e| AppError::Internal(format!("Failed to create TOTP: {}", e)))?;

        // Generate QR code
        let qr_code_url = totp.get_url();
        let qr_code = QrCode::new(&qr_code_url)
            .map_err(|e| AppError::Internal(format!("Failed to generate QR code: {}", e)))?;

        let qr_svg = qr_code.render::<svg::Color>()
            .min_dimensions(200, 200)
            .build();

        // Generate backup codes
        let backup_codes: Vec<String> = (0..10)
            .map(|_| {
                let code = Uuid::new_v4().to_string().replace("-", "");
                code[..8].to_string().to_uppercase()
            })
            .collect();

        // Store encrypted secret and backup codes in database
        let backup_codes_json = serde_json::to_string(&backup_codes)
            .map_err(|e| AppError::Internal(format!("Failed to serialize backup codes: {}", e)))?;

        sqlx::query(
            r#"
            INSERT INTO mfa_secrets (user_id, secret_encrypted, backup_codes_encrypted)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id)
            DO UPDATE SET
                secret_encrypted = $2,
                backup_codes_encrypted = $3,
                enabled_at = NOW()
            "#,
        )
        .bind(user_id)
        .bind(&secret_base32)
        .bind(&backup_codes_json)
        .execute(&self.pool)
        .await?;

        Ok(MfaSetupResponse {
            secret: secret_base32,
            qr_code_svg: qr_svg,
            backup_codes,
        })
    }

    pub async fn enable_mfa(&self, user_id: Uuid, verification_code: &str) -> Result<()> {
        // Get user's secret
        let result: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT secret_encrypted
            FROM mfa_secrets
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        let (secret,) = result.ok_or_else(|| AppError::BadRequest("MFA not set up".to_string()))?;

        // Verify the code
        self.verify_totp_code(&secret, verification_code)?;

        // Enable MFA for user
        sqlx::query(
            r#"
            UPDATE users
            SET mfa_enabled = true
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn disable_mfa(&self, user_id: Uuid, verification_code: &str) -> Result<()> {
        // Get user's secret
        let result: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT secret_encrypted
            FROM mfa_secrets
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        let (secret,) = result.ok_or_else(|| AppError::BadRequest("MFA not enabled".to_string()))?;

        // Verify the code
        self.verify_totp_code(&secret, verification_code)?;

        // Disable MFA for user
        sqlx::query(
            r#"
            UPDATE users
            SET mfa_enabled = false
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        // Delete MFA secrets
        sqlx::query(
            r#"
            DELETE FROM mfa_secrets
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn verify_mfa(&self, user_id: Uuid, code: &str) -> Result<bool> {
        // Get user's secret and backup codes
        let result: Option<(String, String)> = sqlx::query_as(
            r#"
            SELECT secret_encrypted, backup_codes_encrypted
            FROM mfa_secrets
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        let (secret, backup_codes_json) = result.ok_or_else(|| AppError::BadRequest("MFA not enabled".to_string()))?;

        // Try TOTP verification first
        if self.verify_totp_code(&secret, code).is_ok() {
            return Ok(true);
        }

        // Try backup code verification
        let mut backup_codes: Vec<String> = serde_json::from_str(&backup_codes_json)
            .map_err(|e| AppError::Internal(format!("Failed to parse backup codes: {}", e)))?;

        if let Some(index) = backup_codes.iter().position(|bc| bc == code) {
            // Remove used backup code
            backup_codes.remove(index);

            let updated_codes = serde_json::to_string(&backup_codes)
                .map_err(|e| AppError::Internal(format!("Failed to serialize backup codes: {}", e)))?;

            sqlx::query(
                r#"
                UPDATE mfa_secrets
                SET backup_codes_encrypted = $1
                WHERE user_id = $2
                "#,
            )
            .bind(&updated_codes)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

            return Ok(true);
        }

        Err(AppError::Auth("Invalid MFA code".to_string()))
    }

    fn verify_totp_code(&self, secret: &str, code: &str) -> Result<()> {
        let secret_bytes = Secret::Encoded(secret.to_string())
            .to_bytes()
            .map_err(|e| AppError::Internal(format!("Invalid secret: {}", e)))?;

        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret_bytes,
            None,
            "".to_string(),
        ).map_err(|e| AppError::Internal(format!("Failed to create TOTP: {}", e)))?;

        let is_valid = totp.check_current(code)
            .map_err(|e| AppError::Internal(format!("Failed to verify code: {}", e)))?;

        if is_valid {
            Ok(())
        } else {
            Err(AppError::Auth("Invalid TOTP code".to_string()))
        }
    }

    pub async fn regenerate_backup_codes(&self, user_id: Uuid) -> Result<Vec<String>> {
        // Generate new backup codes
        let backup_codes: Vec<String> = (0..10)
            .map(|_| {
                let code = Uuid::new_v4().to_string().replace("-", "");
                code[..8].to_string().to_uppercase()
            })
            .collect();

        let backup_codes_json = serde_json::to_string(&backup_codes)
            .map_err(|e| AppError::Internal(format!("Failed to serialize backup codes: {}", e)))?;

        sqlx::query(
            r#"
            UPDATE mfa_secrets
            SET backup_codes_encrypted = $1
            WHERE user_id = $2
            "#,
        )
        .bind(&backup_codes_json)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(backup_codes)
    }
}

#[derive(Debug, serde::Serialize)]
pub struct MfaSetupResponse {
    pub secret: String,
    pub qr_code_svg: String,
    pub backup_codes: Vec<String>,
}
