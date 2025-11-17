use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
use futures::future::LocalBoxFuture;
use std::future::{ready, Ready};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct AuthMiddleware {
    pub jwt_secret: String,
}

impl AuthMiddleware {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service,
            jwt_secret: self.jwt_secret.clone(),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: S,
    jwt_secret: String,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let jwt_secret = self.jwt_secret.clone();

        // Skip auth for public endpoints
        if is_public_endpoint(req.path()) {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await });
        }

        // Extract and verify JWT token
        let auth_header = req.headers().get("Authorization");

        if let Some(auth_value) = auth_header {
            if let Ok(auth_str) = auth_value.to_str() {
                if let Some(token) = auth_str.strip_prefix("Bearer ") {
                    match verify_token(token, &jwt_secret) {
                        Ok(claims) => {
                            // Add user ID to request headers for downstream services
                            req.headers_mut().insert(
                                actix_web::http::header::HeaderName::from_static("x-user-id"),
                                actix_web::http::header::HeaderValue::from_str(&claims.user_id.to_string())
                                    .unwrap(),
                            );

                            // Store claims in request extensions
                            req.extensions_mut().insert(claims);

                            let fut = self.service.call(req);
                            return Box::pin(async move { fut.await });
                        }
                        Err(_) => {
                            return Box::pin(async move {
                                Err(actix_web::error::ErrorUnauthorized("Invalid token"))
                            });
                        }
                    }
                }
            }
        }

        Box::pin(async move {
            Err(actix_web::error::ErrorUnauthorized("Missing or invalid authentication"))
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
    pub user_id: Uuid,
    pub email: String,
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
    let validation = Validation::default();

    let token_data = decode::<Claims>(token, &decoding_key, &validation)?;
    Ok(token_data.claims)
}

fn is_public_endpoint(path: &str) -> bool {
    path.starts_with("/api/v1/auth/login") ||
    path.starts_with("/api/v1/auth/register") ||
    path.starts_with("/api/v1/auth/password-reset") ||
    path.starts_with("/api/v1/health") ||
    path == "/health"
}
