//! RuVector Service Consumer Adapter
//!
//! Client adapter for persisting and retrieving DecisionEvents via ruvector-service.
//! This is the ONLY authorized persistence mechanism for governance artifacts.
//!
//! # Critical Constraints
//!
//! - LLM-Governance-Dashboard NEVER connects directly to Google SQL
//! - LLM-Governance-Dashboard NEVER executes SQL
//! - All persistence occurs via ruvector-service client calls ONLY
//!
//! # Data Persistence
//!
//! - DecisionEvents are persisted with exactly-once semantics using idempotency keys
//! - All writes are async and non-blocking
//! - Reads are eventually consistent

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use uuid::Uuid;

// ============================================================================
// DecisionEvent Types (aligned with packages/types)
// ============================================================================

/// DecisionEvent - Core schema for all agent decisions
/// Persisted to ruvector-service for audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionEvent {
    /// Unique identifier for this decision event
    pub id: String,
    /// Agent identifier (e.g., "governance-audit-agent")
    pub agent_id: String,
    /// Semantic version of the agent (e.g., "1.0.0")
    pub agent_version: String,
    /// Type of decision made
    pub decision_type: GovernanceDecisionType,
    /// SHA-256 hash of inputs for reproducibility verification
    pub inputs_hash: String,
    /// Structured output of the decision
    pub outputs: DecisionOutputs,
    /// Confidence metrics for the decision
    pub confidence: DecisionConfidence,
    /// Constraints/policies applied during decision
    pub constraints_applied: Vec<ConstraintApplication>,
    /// Reference to execution context
    pub execution_ref: ExecutionReference,
    /// UTC timestamp of decision
    pub timestamp: String,
    /// Organization context
    pub organization_id: String,
    /// Optional correlation ID for tracing across systems
    pub correlation_id: Option<String>,
}

/// Types of governance decisions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GovernanceDecisionType {
    /// Summary of audit findings across systems
    AuditSummary,
    /// Current compliance status assessment
    ComplianceStatus,
    /// Point-in-time governance state capture
    GovernanceSnapshot,
    /// Policy adherence analysis
    PolicyAdherence,
    /// Approval trail analysis
    ApprovalTrail,
    /// Change impact assessment
    ChangeImpact,
    /// Risk indicator aggregation
    RiskAggregation,
}

/// Structured outputs from governance decisions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionOutputs {
    /// Human-readable summary
    pub summary: String,
    /// Detailed findings
    pub findings: Vec<GovernanceFinding>,
    /// Aggregated metrics
    pub metrics: GovernanceMetrics,
    /// Recommendations (read-only, informational)
    pub recommendations: Vec<String>,
    /// Raw data references (not the data itself)
    pub data_refs: Vec<DataReference>,
}

/// Individual governance finding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceFinding {
    pub id: String,
    pub category: FindingCategory,
    pub severity: GovernanceSeverity,
    pub title: String,
    pub description: String,
    pub affected_resources: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub first_detected: String,
    pub last_seen: String,
}

/// Finding category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingCategory {
    PolicyViolation,
    ApprovalGap,
    ConfigurationDrift,
    AccessAnomaly,
    ComplianceDeviation,
    AuditGap,
    CostAnomaly,
}

/// Governance severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GovernanceSeverity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

/// Aggregated governance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceMetrics {
    /// Total events analyzed
    pub events_analyzed: u64,
    /// Time range of analysis
    pub time_range: DateRange,
    /// Coverage percentage (0-100)
    pub coverage_percentage: f64,
    /// Policies evaluated
    pub policies_evaluated: u32,
    /// Compliance rate (0-100)
    pub compliance_rate: f64,
    /// Open findings count by severity
    pub findings_by_severity: HashMap<String, u32>,
    /// Trend direction
    pub trend: TrendDirection,
}

/// Date range for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

/// Trend direction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TrendDirection {
    Improving,
    Stable,
    Degrading,
    Unknown,
}

/// Reference to source data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataReference {
    pub ref_type: DataReferenceType,
    pub source_system: String,
    pub ref_id: String,
    pub ref_timestamp: String,
}

/// Data reference type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DataReferenceType {
    DecisionEvent,
    PolicyEvaluation,
    Incident,
    Approval,
    CostRecord,
    Telemetry,
}

/// Confidence metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionConfidence {
    /// Overall confidence score (0.0-1.0)
    pub overall: f64,
    /// Data completeness (0.0-1.0)
    pub completeness: f64,
    /// Assessment certainty (0.0-1.0)
    pub certainty: f64,
    /// Confidence bands for different aspects
    pub bands: Vec<ConfidenceBand>,
    /// Factors affecting confidence
    pub factors: Vec<ConfidenceFactor>,
}

/// Confidence band
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceBand {
    pub aspect: String,
    pub lower: f64,
    pub upper: f64,
    pub median: f64,
}

/// Confidence factor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceFactor {
    pub factor: String,
    pub impact: ConfidenceImpact,
    pub weight: f64,
    pub description: String,
}

/// Impact type for confidence factors
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConfidenceImpact {
    Positive,
    Negative,
    Neutral,
}

/// Constraint application record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintApplication {
    pub constraint_id: String,
    pub constraint_name: String,
    pub constraint_type: ConstraintType,
    pub scope: ConstraintScope,
    pub satisfied: bool,
    pub details: String,
}

/// Constraint type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConstraintType {
    PolicyRule,
    ComplianceRequirement,
    OrganizationalBoundary,
    DataRetention,
    AccessControl,
}

/// Constraint scope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintScope {
    pub organizations: Vec<String>,
    pub teams: Vec<String>,
    pub resource_types: Vec<String>,
    pub time_range: Option<DateRange>,
}

/// Execution context reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionReference {
    pub execution_id: String,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub source: InvocationSource,
    pub invoker: Option<String>,
}

/// Invocation source
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvocationSource {
    Cli,
    Api,
    Scheduled,
    Webhook,
    Internal,
}

// ============================================================================
// RuVector Service Request/Response Types
// ============================================================================

/// Request to persist DecisionEvent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistDecisionRequest {
    /// The decision event to persist
    pub event: DecisionEvent,
    /// Idempotency key (prevents duplicate writes)
    pub idempotency_key: String,
    /// TTL in days (for data retention compliance)
    pub ttl_days: Option<u32>,
}

/// Response from persist operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistDecisionResponse {
    pub success: bool,
    pub event_id: String,
    pub persisted_at: String,
    pub storage_ref: String,
}

/// Query for retrieving DecisionEvents
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionEventQuery {
    pub organization_id: String,
    pub agent_id: Option<String>,
    pub decision_type: Option<GovernanceDecisionType>,
    pub time_range: Option<DateRange>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// Paginated response for DecisionEvents
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionEventPage {
    pub items: Vec<DecisionEvent>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

// ============================================================================
// RuVector Service Consumer
// ============================================================================

/// Consumer adapter for ruvector-service
///
/// This is the ONLY authorized mechanism for persisting governance data.
/// All persistence flows through this adapter to ruvector-service.
pub struct RuVectorConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl RuVectorConsumer {
    /// Create a new RuVector consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Persist a DecisionEvent to ruvector-service
    ///
    /// This is an async, non-blocking write with exactly-once semantics.
    /// The idempotency_key ensures duplicate writes are safely ignored.
    pub async fn persist_decision_event(&self, event: DecisionEvent) -> Result<PersistDecisionResponse> {
        let idempotency_key = self.generate_idempotency_key(&event);

        let request = PersistDecisionRequest {
            event,
            idempotency_key,
            ttl_days: Some(365), // 1 year retention by default
        };

        let url = format!("{}/api/v1/decisions", self.config.base_url);
        self.post_json(&url, &request).await
    }

    /// Persist with custom TTL for data retention compliance
    pub async fn persist_decision_event_with_ttl(
        &self,
        event: DecisionEvent,
        ttl_days: u32,
    ) -> Result<PersistDecisionResponse> {
        let idempotency_key = self.generate_idempotency_key(&event);

        let request = PersistDecisionRequest {
            event,
            idempotency_key,
            ttl_days: Some(ttl_days),
        };

        let url = format!("{}/api/v1/decisions", self.config.base_url);
        self.post_json(&url, &request).await
    }

    /// Query DecisionEvents from ruvector-service
    pub async fn query_decision_events(
        &self,
        query: DecisionEventQuery,
    ) -> Result<DecisionEventPage> {
        let mut url = format!(
            "{}/api/v1/decisions?organization_id={}&limit={}&offset={}",
            self.config.base_url,
            query.organization_id,
            query.limit.unwrap_or(100),
            query.offset.unwrap_or(0)
        );

        if let Some(ref agent_id) = query.agent_id {
            url.push_str(&format!("&agent_id={}", agent_id));
        }

        if let Some(ref decision_type) = query.decision_type {
            let type_str = serde_json::to_string(&decision_type)
                .unwrap()
                .trim_matches('"')
                .to_string();
            url.push_str(&format!("&decision_type={}", type_str));
        }

        if let Some(ref time_range) = query.time_range {
            url.push_str(&format!("&from={}&to={}", time_range.start, time_range.end));
        }

        self.fetch_json(&url).await
    }

    /// Get a specific DecisionEvent by ID
    pub async fn get_decision_event(&self, event_id: &str) -> Result<DecisionEvent> {
        let url = format!("{}/api/v1/decisions/{}", self.config.base_url, event_id);
        self.fetch_json(&url).await
    }

    /// Get DecisionEvents for a specific agent
    pub async fn get_agent_decisions(
        &self,
        organization_id: &str,
        agent_id: &str,
        time_range: Option<DateRange>,
        limit: Option<u32>,
    ) -> Result<Vec<DecisionEvent>> {
        let query = DecisionEventQuery {
            organization_id: organization_id.to_string(),
            agent_id: Some(agent_id.to_string()),
            decision_type: None,
            time_range,
            limit,
            offset: None,
        };

        let page = self.query_decision_events(query).await?;
        Ok(page.items)
    }

    /// Generate idempotency key from event content
    fn generate_idempotency_key(&self, event: &DecisionEvent) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&event.agent_id);
        hasher.update(&event.agent_version);
        hasher.update(&event.inputs_hash);
        hasher.update(&event.timestamp);
        hasher.update(&event.organization_id);
        format!("{:x}", hasher.finalize())
    }

    /// Internal helper to fetch JSON from upstream
    async fn fetch_json<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T> {
        let mut request = self.client.get(url);

        if let Some(ref api_key) = self.config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("RuVector request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "RuVector returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse RuVector response: {}", e)))
    }

    /// Internal helper to POST JSON to upstream
    async fn post_json<T: Serialize, R: for<'de> Deserialize<'de>>(
        &self,
        url: &str,
        body: &T,
    ) -> Result<R> {
        let mut request = self.client.post(url).json(body);

        if let Some(ref api_key) = self.config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("RuVector request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "RuVector returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse RuVector response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for RuVectorConsumer {
    fn service_name(&self) -> &'static str {
        "ruvector-service"
    }

    async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.config.base_url);
        match self.client.get(&url).send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}

// ============================================================================
// Helper Functions for DecisionEvent Creation
// ============================================================================

/// Create a new DecisionEvent with required fields
pub fn create_decision_event(
    agent_id: &str,
    agent_version: &str,
    decision_type: GovernanceDecisionType,
    organization_id: &str,
    outputs: DecisionOutputs,
    confidence: DecisionConfidence,
    constraints_applied: Vec<ConstraintApplication>,
    execution_ref: ExecutionReference,
    inputs: &impl Serialize,
) -> DecisionEvent {
    let inputs_json = serde_json::to_string(inputs).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(inputs_json.as_bytes());
    let inputs_hash = format!("{:x}", hasher.finalize());

    DecisionEvent {
        id: Uuid::new_v4().to_string(),
        agent_id: agent_id.to_string(),
        agent_version: agent_version.to_string(),
        decision_type,
        inputs_hash,
        outputs,
        confidence,
        constraints_applied,
        execution_ref,
        timestamp: chrono::Utc::now().to_rfc3339(),
        organization_id: organization_id.to_string(),
        correlation_id: None,
    }
}

/// Create default confidence for simple audits
pub fn default_confidence(completeness: f64, certainty: f64) -> DecisionConfidence {
    DecisionConfidence {
        overall: (completeness + certainty) / 2.0,
        completeness,
        certainty,
        bands: vec![],
        factors: vec![],
    }
}

/// Create execution reference from HTTP request context
pub fn execution_ref_from_request(
    request_id: Option<&str>,
    trace_id: Option<&str>,
    invoker: Option<&str>,
    source: InvocationSource,
) -> ExecutionReference {
    ExecutionReference {
        execution_id: Uuid::new_v4().to_string(),
        request_id: request_id.map(String::from),
        trace_id: trace_id.map(String::from),
        span_id: None,
        source,
        invoker: invoker.map(String::from),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decision_type_serialization() {
        let decision_type = GovernanceDecisionType::AuditSummary;
        let json = serde_json::to_string(&decision_type).unwrap();
        assert_eq!(json, "\"audit_summary\"");
    }

    #[test]
    fn test_severity_serialization() {
        let severity = GovernanceSeverity::Critical;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"critical\"");
    }

    #[test]
    fn test_invocation_source_serialization() {
        let source = InvocationSource::Cli;
        let json = serde_json::to_string(&source).unwrap();
        assert_eq!(json, "\"cli\"");
    }

    #[test]
    fn test_create_decision_event() {
        let outputs = DecisionOutputs {
            summary: "Test audit".to_string(),
            findings: vec![],
            metrics: GovernanceMetrics {
                events_analyzed: 100,
                time_range: DateRange {
                    start: "2024-01-01T00:00:00Z".to_string(),
                    end: "2024-01-02T00:00:00Z".to_string(),
                },
                coverage_percentage: 95.0,
                policies_evaluated: 10,
                compliance_rate: 98.0,
                findings_by_severity: HashMap::new(),
                trend: TrendDirection::Stable,
            },
            recommendations: vec![],
            data_refs: vec![],
        };

        let confidence = default_confidence(0.9, 0.85);
        let execution_ref = execution_ref_from_request(
            Some("req-123"),
            Some("trace-456"),
            Some("user@example.com"),
            InvocationSource::Api,
        );

        let event = create_decision_event(
            "governance-audit-agent",
            "1.0.0",
            GovernanceDecisionType::AuditSummary,
            "org-123",
            outputs,
            confidence,
            vec![],
            execution_ref,
            &serde_json::json!({"test": "input"}),
        );

        assert_eq!(event.agent_id, "governance-audit-agent");
        assert_eq!(event.agent_version, "1.0.0");
        assert!(!event.inputs_hash.is_empty());
    }
}
