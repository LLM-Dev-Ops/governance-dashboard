use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
};
use futures::future::LocalBoxFuture;
use std::future::{ready, Ready};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct RateLimiter {
    store: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
    max_requests: u32,
    window_secs: u64,
}

#[derive(Clone)]
struct RateLimitEntry {
    count: u32,
    window_start: Instant,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
            max_requests,
            window_secs,
        }
    }

    async fn check_rate_limit(&self, key: &str) -> Result<(), ()> {
        let mut store = self.store.write().await;
        let now = Instant::now();

        let entry = store.entry(key.to_string()).or_insert(RateLimitEntry {
            count: 0,
            window_start: now,
        });

        // Reset window if expired
        if now.duration_since(entry.window_start) > Duration::from_secs(self.window_secs) {
            entry.count = 0;
            entry.window_start = now;
        }

        // Check limit
        if entry.count >= self.max_requests {
            return Err(());
        }

        entry.count += 1;
        Ok(())
    }
}

impl<S, B> Transform<S, ServiceRequest> for RateLimiter
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimiterService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RateLimiterService {
            service,
            limiter: self.clone(),
        }))
    }
}

pub struct RateLimiterService<S> {
    service: S,
    limiter: RateLimiter,
}

impl<S, B> Service<ServiceRequest> for RateLimiterService<S>
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
        let limiter = self.limiter.clone();

        // Extract rate limit key (user ID or IP address)
        let key = extract_rate_limit_key(&req);

        let fut = self.service.call(req);

        Box::pin(async move {
            match limiter.check_rate_limit(&key).await {
                Ok(_) => fut.await,
                Err(_) => Err(actix_web::error::ErrorTooManyRequests("Rate limit exceeded")),
            }
        })
    }
}

fn extract_rate_limit_key(req: &ServiceRequest) -> String {
    // Try to get user ID from headers (set by auth middleware)
    if let Some(user_id) = req.headers().get("x-user-id") {
        if let Ok(user_id_str) = user_id.to_str() {
            return format!("user:{}", user_id_str);
        }
    }

    // Fall back to IP address
    if let Some(addr) = req.connection_info().realip_remote_addr() {
        return format!("ip:{}", addr);
    }

    "unknown".to_string()
}
