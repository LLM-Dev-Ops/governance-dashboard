use actix_web::{get, post, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use redis::Client as RedisClient;
use uuid::Uuid;
use llm_governance_common::{AppError, Result, ApiResponse};
use crate::config::Config;
use crate::services::auth_service::AuthService;
use crate::services::jwt_service::JwtService;
use sha2::{Sha256, Digest};

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
    #[validate(length(min = 2, max = 100))]
    pub name: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct PasswordResetRequest {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct PasswordResetConfirm {
    pub token: String,
    #[validate(length(min = 8, max = 128))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 8))]
    pub current_password: String,
    #[validate(length(min = 8, max = 128))]
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
    pub requires_mfa: bool,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub status: String,
    pub mfa_enabled: bool,
}

// Helper function to hash tokens with SHA-256
fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct MfaVerifyRequest {
    pub code: String,
    pub session_id: String,
}

#[post("/auth/register")]
pub async fn register(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: web::Json<RegisterRequest>,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let auth_service = AuthService::new(pool.get_ref().clone());
    let user = auth_service
        .register_user(&req.email, &req.password, &req.name)
        .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(
        serde_json::json!({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "status": user.status,
            "message": "User registered successfully. Please verify your email."
        })
    )))
}

#[post("/auth/login")]
pub async fn login(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    config: web::Data<Config>,
    req: web::Json<LoginRequest>,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let auth_service = AuthService::new(pool.get_ref().clone());
    let user = auth_service
        .authenticate_user(&req.email, &req.password)
        .await?;

    // If MFA is enabled, create temporary session and require MFA
    if user.mfa_enabled {
        let session_id = Uuid::new_v4().to_string();

        // Store session temporarily in Redis (expires in 5 minutes)
        let mut conn = redis_client.get_connection()
            .map_err(|e| AppError::Redis(e))?;

        let session_data = serde_json::json!({
            "user_id": user.id,
            "email": user.email,
        });

        redis::cmd("SETEX")
            .arg(format!("mfa_session:{}", session_id))
            .arg(300) // 5 minutes
            .arg(session_data.to_string())
            .query::<()>(&mut conn)
            .map_err(|e| AppError::Redis(e))?;

        return Ok(HttpResponse::Ok().json(ApiResponse::success(
            serde_json::json!({
                "requires_mfa": true,
                "session_id": session_id,
                "message": "MFA verification required"
            })
        )));
    }

    // Generate tokens
    let jwt_service = JwtService::new(&config.jwt_secret, config.jwt_expiration);
    let access_token = jwt_service.generate_token(user.id, &user.email)
        .map_err(|e| AppError::Internal(format!("Failed to generate token: {}", e)))?;

    let refresh_token = jwt_service.generate_refresh_token();

    // Store refresh token in database
    sqlx::query(
        r#"
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '30 days')
        "#,
    )
    .bind(user.id)
    .bind(hash_token(&refresh_token))
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(AuthResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: config.jwt_expiration,
        user: UserInfo {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            mfa_enabled: user.mfa_enabled,
        },
        requires_mfa: false,
    })))
}

#[post("/auth/mfa/verify")]
pub async fn verify_mfa(
    pool: web::Data<PgPool>,
    redis_client: web::Data<RedisClient>,
    config: web::Data<Config>,
    req: web::Json<MfaVerifyRequest>,
) -> Result<impl Responder> {
    use crate::services::mfa_service_impl::MfaService;

    // Get session from Redis
    let mut conn = redis_client.get_connection()
        .map_err(|e| AppError::Redis(e))?;

    let session_data: String = redis::cmd("GET")
        .arg(format!("mfa_session:{}", req.session_id))
        .query(&mut conn)
        .map_err(|_| AppError::Auth("Invalid or expired session".to_string()))?;

    let session: serde_json::Value = serde_json::from_str(&session_data)
        .map_err(|e| AppError::Internal(format!("Invalid session data: {}", e)))?;

    let user_id: Uuid = serde_json::from_value(session["user_id"].clone())
        .map_err(|e| AppError::Internal(format!("Invalid user ID: {}", e)))?;

    // Verify MFA code
    let mfa_service = MfaService::new(pool.get_ref().clone(), config.mfa_issuer.clone());
    mfa_service.verify_mfa(user_id, &req.code).await?;

    // Get user details
    let auth_service = AuthService::new(pool.get_ref().clone());
    let user = auth_service.get_user_by_id(user_id).await?;

    // Generate tokens
    let jwt_service = JwtService::new(&config.jwt_secret, config.jwt_expiration);
    let access_token = jwt_service.generate_token(user.id, &user.email)
        .map_err(|e| AppError::Internal(format!("Failed to generate token: {}", e)))?;

    let refresh_token = jwt_service.generate_refresh_token();

    // Store refresh token
    sqlx::query(
        r#"
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '30 days')
        "#,
    )
    .bind(user.id)
    .bind(hash_token(&refresh_token))
    .execute(pool.get_ref())
    .await?;

    // Delete MFA session
    redis::cmd("DEL")
        .arg(format!("mfa_session:{}", req.session_id))
        .query::<()>(&mut conn)
        .map_err(|e| AppError::Redis(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(AuthResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: config.jwt_expiration,
        user: UserInfo {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            mfa_enabled: user.mfa_enabled,
        },
        requires_mfa: false,
    })))
}

#[post("/auth/refresh")]
pub async fn refresh_token(
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
    req: web::Json<RefreshTokenRequest>,
) -> Result<impl Responder> {
    let token_hash = hash_token(&req.refresh_token);

    // Verify refresh token exists and is valid
    let result: Option<(Uuid, String, String)> = sqlx::query_as(
        r#"
        SELECT u.id, u.email, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1 AND s.expires_at > NOW()
        "#,
    )
    .bind(&token_hash)
    .fetch_optional(pool.get_ref())
    .await?;

    let (user_id, email, name) = result
        .ok_or_else(|| AppError::Auth("Invalid or expired refresh token".to_string()))?;

    // Generate new access token
    let jwt_service = JwtService::new(&config.jwt_secret, config.jwt_expiration);
    let access_token = jwt_service.generate_token(user_id, &email)
        .map_err(|e| AppError::Internal(format!("Failed to generate token: {}", e)))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": config.jwt_expiration
    }))))
}

#[post("/auth/logout")]
pub async fn logout(
    pool: web::Data<PgPool>,
    redis: web::Data<RedisClient>,
    config: web::Data<Config>,
    req: HttpRequest,
) -> Result<impl Responder> {
    // Extract token from Authorization header
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized)?;

    // Decode JWT to get user_id and expiration
    let jwt_service = JwtService::new(&config.jwt_secret, config.jwt_expiration);
    let claims = jwt_service
        .decode_token(token)
        .map_err(|_| AppError::Unauthorized)?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized)?;

    // Invalidate all active sessions for this user in database
    sqlx::query(
        r#"
        UPDATE sessions
        SET is_active = false
        WHERE user_id = $1 AND is_active = true
        "#,
    )
    .bind(user_id)
    .execute(pool.get_ref())
    .await?;

    // Blacklist the current token in Redis until it expires
    let mut conn = redis
        .get_multiplexed_tokio_connection()
        .await
        .map_err(|e| AppError::Redis(e))?;

    let ttl = (claims.exp - chrono::Utc::now().timestamp()).max(0);
    let blacklist_key = format!("blacklist:{}", token);

    redis::cmd("SET")
        .arg(&blacklist_key)
        .arg("1")
        .arg("EX")
        .arg(ttl)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| AppError::Redis(e))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Logged out successfully"})
    )))
}

#[post("/auth/password-reset/initiate")]
pub async fn initiate_password_reset(
    pool: web::Data<PgPool>,
    req: web::Json<PasswordResetRequest>,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let auth_service = AuthService::new(pool.get_ref().clone());

    // Always return success even if email doesn't exist (security best practice)
    let _ = auth_service.initiate_password_reset(&req.email).await;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({
            "message": "If the email exists, a password reset link has been sent"
        })
    )))
}

#[post("/auth/password-reset/confirm")]
pub async fn confirm_password_reset(
    pool: web::Data<PgPool>,
    req: web::Json<PasswordResetConfirm>,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let auth_service = AuthService::new(pool.get_ref().clone());
    auth_service.reset_password(&req.token, &req.new_password).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Password reset successfully"})
    )))
}

#[post("/auth/password/change")]
pub async fn change_password(
    pool: web::Data<PgPool>,
    req: web::Json<ChangePasswordRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    // Extract user ID from JWT (would be done by auth middleware)
    // For now, assuming it's in a header
    let user_id = http_req
        .headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::Unauthorized)?;

    let auth_service = AuthService::new(pool.get_ref().clone());
    auth_service
        .change_password(user_id, &req.current_password, &req.new_password)
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Password changed successfully"})
    )))
}

#[get("/auth/verify-email/{token}")]
pub async fn verify_email(
    pool: web::Data<PgPool>,
    token: web::Path<String>,
) -> Result<impl Responder> {
    let token_hash = hash_token(token.as_str());

    // Find user by verification token
    let result: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT user_id
        FROM email_verification_tokens
        WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL
        "#,
    )
    .bind(&token_hash)
    .fetch_optional(pool.get_ref())
    .await?;

    let (user_id,) = result
        .ok_or_else(|| AppError::BadRequest("Invalid or expired verification token".to_string()))?;

    // Verify email
    let auth_service = AuthService::new(pool.get_ref().clone());
    auth_service.verify_email(user_id).await?;

    // Mark token as used
    sqlx::query(
        r#"
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE token_hash = $1
        "#,
    )
    .bind(&token_hash)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Email verified successfully"})
    )))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(register)
        .service(login)
        .service(verify_mfa)
        .service(refresh_token)
        .service(logout)
        .service(initiate_password_reset)
        .service(confirm_password_reset)
        .service(change_password)
        .service(verify_email);
}
