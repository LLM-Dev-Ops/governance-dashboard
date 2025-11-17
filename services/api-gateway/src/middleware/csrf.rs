use actix_web::{
    body::MessageBody,
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
use futures::future::LocalBoxFuture;
use std::future::{ready, Ready};
use std::rc::Rc;
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};
use uuid::Uuid;

/// CSRF Protection Middleware
pub struct CsrfProtection {
    secret: String,
}

impl CsrfProtection {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }

    /// Generate a CSRF token for a session
    pub fn generate_token(&self, session_id: &str) -> String {
        let timestamp = chrono::Utc::now().timestamp();
        let data = format!("{}:{}:{}", session_id, timestamp, self.secret);

        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        let hash = hasher.finalize();

        let token = format!("{}:{}", timestamp, general_purpose::STANDARD.encode(hash));
        token
    }

    /// Validate a CSRF token
    pub fn validate_token(&self, token: &str, session_id: &str) -> bool {
        let parts: Vec<&str> = token.split(':').collect();
        if parts.len() != 2 {
            return false;
        }

        let timestamp = match parts[0].parse::<i64>() {
            Ok(ts) => ts,
            Err(_) => return false,
        };

        // Token expires after 24 hours
        let now = chrono::Utc::now().timestamp();
        if now - timestamp > 86400 {
            return false;
        }

        // Verify hash
        let data = format!("{}:{}:{}", session_id, timestamp, self.secret);
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        let expected_hash = hasher.finalize();
        let expected_token = format!("{}:{}", timestamp, general_purpose::STANDARD.encode(expected_hash));

        token == expected_token
    }
}

impl<S, B> Transform<S, ServiceRequest> for CsrfProtection
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = CsrfMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CsrfMiddleware {
            service: Rc::new(service),
            secret: self.secret.clone(),
        }))
    }
}

pub struct CsrfMiddleware<S> {
    service: Rc<S>,
    secret: String,
}

impl<S, B> Service<ServiceRequest> for CsrfMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<actix_web::body::BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let secret = self.secret.clone();

        Box::pin(async move {
            let method = req.method().as_str();

            // Only check CSRF for state-changing methods
            if matches!(method, "POST" | "PUT" | "DELETE" | "PATCH") {
                // Skip CSRF check for login and public endpoints
                let path = req.path();
                if path.starts_with("/auth/login")
                    || path.starts_with("/auth/register")
                    || path.starts_with("/auth/password-reset")
                    || path.starts_with("/health") {
                    return service.call(req).await.map(|res| res.map_into_boxed_body());
                }

                // Get CSRF token from header
                let csrf_token = req.headers()
                    .get("X-CSRF-Token")
                    .and_then(|h| h.to_str().ok());

                // Get session ID from user_id in extensions (set by auth middleware)
                let session_id = req.extensions()
                    .get::<Uuid>()
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "anonymous".to_string());

                if let Some(token) = csrf_token {
                    let csrf_protection = CsrfProtection::new(secret);
                    if csrf_protection.validate_token(token, &session_id) {
                        return service.call(req).await.map(|res| res.map_into_boxed_body());
                    }
                }

                // CSRF validation failed
                let response = HttpResponse::Forbidden()
                    .json(serde_json::json!({
                        "success": false,
                        "error": "CSRF token validation failed"
                    }));

                return Ok(req.into_response(response));
            }

            // For GET, HEAD, OPTIONS - no CSRF check needed
            service.call(req).await.map(|res| res.map_into_boxed_body())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_validate_token() {
        let csrf = CsrfProtection::new("test_secret".to_string());
        let session_id = "test_session";

        let token = csrf.generate_token(session_id);
        assert!(csrf.validate_token(&token, session_id));
    }

    #[test]
    fn test_invalid_token() {
        let csrf = CsrfProtection::new("test_secret".to_string());
        assert!(!csrf.validate_token("invalid_token", "session"));
    }

    #[test]
    fn test_wrong_session_id() {
        let csrf = CsrfProtection::new("test_secret".to_string());
        let token = csrf.generate_token("session1");
        assert!(!csrf.validate_token(&token, "session2"));
    }
}
