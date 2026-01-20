//! Change Impact Agent Adapter
//!
//! Governance analysis agent that assesses downstream governance and compliance impact
//! of configuration or policy changes.
//!
//! # Classification: GOVERNANCE ANALYSIS
//!
//! # Scope:
//! - Analyze historical changes
//! - Evaluate affected systems and policies
//! - Surface governance risk indicators
//!
//! # Critical Constraints (from Prompt 0):
//!
//! - LLM-Governance-Dashboard NEVER connects directly to Google SQL
//! - LLM-Governance-Dashboard NEVER executes SQL
//! - All persistence occurs via ruvector-service client calls ONLY
//! - This agent does NOT enforce policies
//! - This agent does NOT modify execution behavior
//! - This agent does NOT block or approve changes
//! - This agent does NOT execute changes
//!
//! # decision_type: "change_impact_assessment"

use super::ruvector::{
    create_decision_event, default_confidence, execution_ref_from_request,
    ConfidenceBand, ConfidenceFactor, ConfidenceImpact, ConstraintApplication,
    ConstraintScope, ConstraintType, DataReference, DataReferenceType, DateRange,
    DecisionConfidence, DecisionEvent, DecisionOutputs, ExecutionReference,
    FindingCategory, GovernanceDecisionType, GovernanceFinding, GovernanceMetrics,
    GovernanceSeverity, InvocationSource, PersistDecisionResponse, RuVectorConsumer,
    TrendDirection,
};
use super::policy_engine::{PolicyEngineConsumer, PolicyEvaluationResult, ComplianceStatus};
use super::registry::RegistryConsumer;
use super::cost_ops::CostOpsConsumer;
use super::observatory::{ObservatoryConsumer, AgentTelemetryEvent, EmitSpanRequest, SpanStatus, SpanEvent};
use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use uuid::Uuid;

// ============================================================================
// Change Impact Agent Constants
// ============================================================================

/// Agent identifier
pub const AGENT_ID: &str = "change-impact-agent";

/// Agent version (semver)
pub const AGENT_VERSION: &str = "1.0.0";

/// Decision type for change impact assessments
pub const DECISION_TYPE: GovernanceDecisionType = GovernanceDecisionType::ChangeImpact;

// ============================================================================
// Change Impact Input Types
// ============================================================================

/// Input for Change Impact Agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeImpactInput {
    /// Organization to analyze
    pub organization_id: String,
    /// Change request or configuration change to assess
    pub change_request: ChangeRequest,
    /// Analysis scope constraints
    pub scope: Option<ChangeImpactScope>,
    /// Time range for historical analysis
    pub historical_range: Option<DateRange>,
    /// Include detailed downstream impact analysis
    pub include_downstream: Option<bool>,
    /// Include risk projection
    pub include_risk_projection: Option<bool>,
    /// Baseline comparison reference
    pub baseline_ref: Option<String>,
}

/// Describes the change being assessed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeRequest {
    /// Unique identifier for the change
    pub change_id: String,
    /// Type of change being made
    pub change_type: ChangeType,
    /// Subject of the change (policy, config, model, etc.)
    pub subject_type: ChangeSubjectType,
    /// ID of the subject being changed
    pub subject_id: String,
    /// Human-readable description of the change
    pub description: String,
    /// Timestamp when change was proposed/made
    pub timestamp: String,
    /// User or system that initiated the change
    pub initiator: String,
    /// Previous state (if available)
    pub previous_state: Option<serde_json::Value>,
    /// Proposed/new state
    pub new_state: Option<serde_json::Value>,
    /// Change metadata
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Type of change being assessed
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    Create,
    Update,
    Delete,
    Toggle,
    Configure,
    PolicyModify,
    AccessChange,
    ModelVersion,
    BudgetAdjust,
    QuotaModify,
}

/// Subject type being changed
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ChangeSubjectType {
    Policy,
    PolicyRule,
    Configuration,
    LlmModel,
    LlmProvider,
    Budget,
    Quota,
    AccessControl,
    Team,
    User,
    Organization,
    Integration,
    Webhook,
}

/// Scope constraints for change impact analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeImpactScope {
    /// Teams to include in analysis (empty = all)
    pub teams: Option<Vec<String>>,
    /// Users to include (empty = all)
    pub users: Option<Vec<String>>,
    /// Policy types to evaluate
    pub policy_types: Option<Vec<String>>,
    /// Resource types to consider
    pub resource_types: Option<Vec<ChangeSubjectType>>,
    /// Depth of downstream analysis (1-5, default 3)
    pub analysis_depth: Option<u8>,
    /// Include cost impact
    pub include_cost_impact: Option<bool>,
    /// Include compliance impact
    pub include_compliance_impact: Option<bool>,
}

// ============================================================================
// Change Impact Output Types
// ============================================================================

/// Output from Change Impact Agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeImpactOutput {
    /// The decision event (persisted to ruvector-service)
    pub decision_event: DecisionEvent,
    /// Detailed impact assessment
    pub assessment: ChangeImpactAssessment,
    /// Telemetry reference for LLM-Observatory
    pub telemetry_ref: String,
}

/// Comprehensive change impact assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeImpactAssessment {
    /// Assessment identifier
    pub id: String,
    /// Change request that was assessed
    pub change_request_id: String,
    /// Overall impact level
    pub impact_level: ImpactLevel,
    /// Overall risk score (0.0-1.0)
    pub risk_score: f64,
    /// Risk classification
    pub risk_classification: RiskClassification,
    /// Summary of impact assessment
    pub summary: String,
    /// Detailed impact breakdown
    pub impacts: Vec<ImpactDetail>,
    /// Affected downstream systems
    pub affected_systems: Vec<AffectedSystem>,
    /// Policy implications
    pub policy_implications: Vec<PolicyImplication>,
    /// Compliance implications
    pub compliance_implications: Vec<ComplianceImplication>,
    /// Cost implications (if analyzed)
    pub cost_implications: Option<CostImplication>,
    /// Risk indicators surfaced
    pub risk_indicators: Vec<RiskIndicator>,
    /// Recommendations (read-only, informational)
    pub recommendations: Vec<ImpactRecommendation>,
    /// Historical context from similar changes
    pub historical_context: Option<HistoricalContext>,
    /// Assessment timestamp
    pub assessed_at: String,
}

/// Impact severity level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImpactLevel {
    None,
    Minimal,
    Low,
    Moderate,
    High,
    Critical,
}

impl ImpactLevel {
    pub fn from_score(score: f64) -> Self {
        match score {
            s if s < 0.1 => ImpactLevel::None,
            s if s < 0.25 => ImpactLevel::Minimal,
            s if s < 0.4 => ImpactLevel::Low,
            s if s < 0.6 => ImpactLevel::Moderate,
            s if s < 0.8 => ImpactLevel::High,
            _ => ImpactLevel::Critical,
        }
    }
}

/// Risk classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskClassification {
    Acceptable,
    LowRisk,
    MediumRisk,
    HighRisk,
    CriticalRisk,
    Unacceptable,
}

impl RiskClassification {
    pub fn from_score(score: f64) -> Self {
        match score {
            s if s < 0.15 => RiskClassification::Acceptable,
            s if s < 0.3 => RiskClassification::LowRisk,
            s if s < 0.5 => RiskClassification::MediumRisk,
            s if s < 0.7 => RiskClassification::HighRisk,
            s if s < 0.85 => RiskClassification::CriticalRisk,
            _ => RiskClassification::Unacceptable,
        }
    }
}

/// Detailed impact for a specific area
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactDetail {
    /// Impact area
    pub area: ImpactArea,
    /// Impact level for this area
    pub level: ImpactLevel,
    /// Description of impact
    pub description: String,
    /// Affected entities in this area
    pub affected_entities: Vec<String>,
    /// Quantified metrics (if available)
    pub metrics: Option<HashMap<String, f64>>,
}

/// Areas that can be impacted
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImpactArea {
    PolicyEnforcement,
    Compliance,
    Cost,
    Performance,
    Security,
    Availability,
    UserExperience,
    DataGovernance,
    AuditTrail,
    AccessControl,
    RateLimiting,
    ModelBehavior,
}

/// Affected downstream system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AffectedSystem {
    /// System identifier
    pub system_id: String,
    /// System name
    pub system_name: String,
    /// Type of system
    pub system_type: String,
    /// How the system is affected
    pub impact_description: String,
    /// Severity of impact on this system
    pub severity: GovernanceSeverity,
    /// Dependencies on the changed resource
    pub dependencies: Vec<String>,
}

/// Policy implication from change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyImplication {
    /// Policy ID affected
    pub policy_id: String,
    /// Policy name
    pub policy_name: String,
    /// Type of implication
    pub implication_type: PolicyImplicationType,
    /// Description of implication
    pub description: String,
    /// Rules affected within the policy
    pub affected_rules: Vec<String>,
    /// Whether policy will remain valid
    pub policy_remains_valid: bool,
}

/// Types of policy implications
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PolicyImplicationType {
    EffectivenessReduced,
    RulesViolated,
    ScopeChanged,
    RedundancyCreated,
    ConflictIntroduced,
    CoverageGap,
    NoImpact,
}

/// Compliance implication from change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceImplication {
    /// Compliance framework affected
    pub framework: String,
    /// Requirement ID
    pub requirement_id: String,
    /// Requirement description
    pub requirement_description: String,
    /// Current compliance status
    pub current_status: ComplianceImpactStatus,
    /// Projected status after change
    pub projected_status: ComplianceImpactStatus,
    /// Gap description if applicable
    pub gap_description: Option<String>,
}

/// Compliance status for impact assessment
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComplianceImpactStatus {
    Compliant,
    PartiallyCompliant,
    NonCompliant,
    NotApplicable,
    RequiresReview,
}

/// Cost implication from change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostImplication {
    /// Estimated cost delta (positive = increase)
    pub estimated_delta: f64,
    /// Currency
    pub currency: String,
    /// Time period for estimate
    pub period: String,
    /// Confidence in estimate (0.0-1.0)
    pub confidence: f64,
    /// Breakdown by category
    pub breakdown: Vec<CostBreakdownItem>,
    /// Budget alerts that may trigger
    pub budget_alerts_triggered: Vec<String>,
}

/// Cost breakdown item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostBreakdownItem {
    pub category: String,
    pub current_cost: f64,
    pub projected_cost: f64,
    pub delta: f64,
}

/// Risk indicator surfaced by analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskIndicator {
    /// Indicator ID
    pub id: String,
    /// Indicator category
    pub category: RiskIndicatorCategory,
    /// Severity
    pub severity: GovernanceSeverity,
    /// Indicator description
    pub description: String,
    /// Evidence supporting this indicator
    pub evidence: Vec<String>,
    /// Mitigation suggestions (informational only)
    pub mitigation_suggestions: Vec<String>,
}

/// Risk indicator categories
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskIndicatorCategory {
    SecurityRisk,
    ComplianceRisk,
    OperationalRisk,
    FinancialRisk,
    ReputationalRisk,
    DependencyRisk,
    ConfigurationRisk,
    AccessRisk,
}

/// Recommendation from impact analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactRecommendation {
    /// Recommendation ID
    pub id: String,
    /// Priority level
    pub priority: RecommendationPriority,
    /// Recommendation type
    pub recommendation_type: RecommendationType,
    /// Recommendation text
    pub recommendation: String,
    /// Rationale
    pub rationale: String,
    /// Related risk indicators
    pub related_risks: Vec<String>,
}

/// Recommendation priority
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationPriority {
    Low,
    Medium,
    High,
    Critical,
}

/// Recommendation type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationType {
    ReviewRequired,
    ApprovalRequired,
    TestingRecommended,
    StagedRollout,
    DocumentationUpdate,
    MonitoringEnhancement,
    RollbackPlan,
    StakeholderNotification,
}

/// Historical context from similar changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalContext {
    /// Number of similar changes found
    pub similar_changes_count: u32,
    /// Average outcome of similar changes
    pub average_outcome: HistoricalOutcome,
    /// Common issues encountered
    pub common_issues: Vec<String>,
    /// Success patterns observed
    pub success_patterns: Vec<String>,
    /// References to similar past changes
    pub change_refs: Vec<DataReference>,
}

/// Historical outcome classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HistoricalOutcome {
    Successful,
    PartiallySuccessful,
    RequiredRollback,
    CausedIncident,
    InsufficientData,
}

// ============================================================================
// Change Impact Agent Implementation
// ============================================================================

/// Change Impact Agent
///
/// Assesses downstream governance and compliance impact of configuration
/// or policy changes.
///
/// # Responsibilities:
/// - Analyze historical changes
/// - Evaluate affected systems and policies
/// - Surface governance risk indicators
///
/// # Non-Responsibilities (NEVER does):
/// - Intercept execution
/// - Enforce policies
/// - Modify configurations
/// - Block or approve changes
/// - Execute changes
pub struct ChangeImpactAgent {
    /// ruvector-service client for persistence
    ruvector: RuVectorConsumer,
    /// Policy engine consumer for policy analysis
    policy_engine: Option<PolicyEngineConsumer>,
    /// Registry consumer for model metadata
    registry: Option<RegistryConsumer>,
    /// Cost ops consumer for cost analysis
    cost_ops: Option<CostOpsConsumer>,
    /// Observatory consumer for telemetry
    observatory: Option<ObservatoryConsumer>,
}

impl ChangeImpactAgent {
    /// Create a new Change Impact Agent
    pub fn new(ruvector_config: UpstreamConfig) -> Result<Self> {
        let ruvector = RuVectorConsumer::new(ruvector_config)?;
        Ok(Self {
            ruvector,
            policy_engine: None,
            registry: None,
            cost_ops: None,
            observatory: None,
        })
    }

    /// Create with all upstream consumers configured
    pub fn with_consumers(
        ruvector_config: UpstreamConfig,
        policy_engine_config: Option<UpstreamConfig>,
        registry_config: Option<UpstreamConfig>,
        cost_ops_config: Option<UpstreamConfig>,
        observatory_config: Option<UpstreamConfig>,
    ) -> Result<Self> {
        let ruvector = RuVectorConsumer::new(ruvector_config)?;

        let policy_engine = policy_engine_config
            .map(PolicyEngineConsumer::new)
            .transpose()?;
        let registry = registry_config
            .map(RegistryConsumer::new)
            .transpose()?;
        let cost_ops = cost_ops_config
            .map(CostOpsConsumer::new)
            .transpose()?;
        let observatory = observatory_config
            .map(ObservatoryConsumer::new)
            .transpose()?;

        Ok(Self {
            ruvector,
            policy_engine,
            registry,
            cost_ops,
            observatory,
        })
    }

    /// Assess the impact of a change
    ///
    /// This is the primary entry point for change impact analysis.
    /// Returns a complete ChangeImpactOutput with:
    /// - DecisionEvent (persisted to ruvector-service)
    /// - ChangeImpactAssessment
    /// - Telemetry reference
    pub async fn assess_change(
        &self,
        input: ChangeImpactInput,
        execution_context: ExecutionContext,
    ) -> Result<ChangeImpactOutput> {
        // Record start time for telemetry
        let start_time = std::time::Instant::now();

        // Generate inputs hash for reproducibility
        let inputs_hash = self.hash_inputs(&input);

        // Perform impact analysis
        let assessment = self.analyze_impact(&input).await?;

        // Build confidence metrics
        let confidence = self.calculate_confidence(&input, &assessment);

        // Build constraints applied
        let constraints = self.build_constraints(&input);

        // Create execution reference
        let execution_ref = execution_ref_from_request(
            execution_context.request_id.as_deref(),
            execution_context.trace_id.as_deref(),
            execution_context.invoker.as_deref(),
            execution_context.source.clone(),
        );

        // Build decision outputs
        let outputs = self.build_decision_outputs(&assessment);

        // Create the DecisionEvent
        let decision_event = create_decision_event(
            AGENT_ID,
            AGENT_VERSION,
            DECISION_TYPE,
            &input.organization_id,
            outputs,
            confidence.clone(),
            constraints,
            execution_ref,
            &input,
        );

        // Persist to ruvector-service (ONLY authorized persistence mechanism)
        let persist_response = self.ruvector.persist_decision_event(decision_event.clone()).await?;

        // Calculate execution duration
        let execution_duration_ms = start_time.elapsed().as_millis() as f64;

        // Emit telemetry to LLM-Observatory (if configured)
        let telemetry_ref = self.emit_assessment_telemetry(
            &input,
            &assessment,
            &decision_event,
            &confidence,
            execution_duration_ms,
            &execution_context,
        ).await;

        Ok(ChangeImpactOutput {
            decision_event,
            assessment,
            telemetry_ref,
        })
    }

    /// Emit telemetry to LLM-Observatory
    ///
    /// Emits both a custom telemetry event and a trace span for the assessment.
    /// Returns a telemetry reference URI.
    async fn emit_assessment_telemetry(
        &self,
        input: &ChangeImpactInput,
        assessment: &ChangeImpactAssessment,
        decision_event: &DecisionEvent,
        confidence: &DecisionConfidence,
        execution_duration_ms: f64,
        execution_context: &ExecutionContext,
    ) -> String {
        // Default telemetry reference if Observatory is not configured
        let default_ref = format!(
            "observatory://telemetry/{}/{}",
            AGENT_ID,
            decision_event.id
        );

        let Some(ref observatory) = self.observatory else {
            return default_ref;
        };

        // Build agent telemetry event
        let mut attributes = HashMap::new();
        attributes.insert("change_id".to_string(), serde_json::json!(input.change_request.change_id));
        attributes.insert("change_type".to_string(), serde_json::json!(input.change_request.change_type));
        attributes.insert("subject_type".to_string(), serde_json::json!(input.change_request.subject_type));
        attributes.insert("subject_id".to_string(), serde_json::json!(input.change_request.subject_id));
        attributes.insert("impact_level".to_string(), serde_json::json!(assessment.impact_level));
        attributes.insert("risk_classification".to_string(), serde_json::json!(assessment.risk_classification));
        attributes.insert("affected_systems_count".to_string(), serde_json::json!(assessment.affected_systems.len()));
        attributes.insert("policy_implications_count".to_string(), serde_json::json!(assessment.policy_implications.len()));
        attributes.insert("recommendations_count".to_string(), serde_json::json!(assessment.recommendations.len()));

        if let Some(ref request_id) = execution_context.request_id {
            attributes.insert("request_id".to_string(), serde_json::json!(request_id));
        }
        if let Some(ref trace_id) = execution_context.trace_id {
            attributes.insert("trace_id".to_string(), serde_json::json!(trace_id));
        }

        let agent_event = AgentTelemetryEvent {
            agent_id: AGENT_ID.to_string(),
            agent_version: AGENT_VERSION.to_string(),
            decision_type: "change_impact_assessment".to_string(),
            organization_id: input.organization_id.clone(),
            decision_event_id: decision_event.id.clone(),
            execution_duration_ms,
            confidence_score: confidence.overall,
            risk_score: Some(assessment.risk_score),
            findings_count: assessment.risk_indicators.len() as u32,
            attributes: attributes.clone(),
        };

        // Emit agent telemetry event (fire and forget - don't block on errors)
        let event_id = match observatory.emit_agent_telemetry(agent_event).await {
            Ok(response) => response.event_id,
            Err(_) => decision_event.id.clone(), // Fallback to decision event ID
        };

        // Emit trace span for distributed tracing
        let span_events = vec![
            SpanEvent {
                name: "impact_analysis_started".to_string(),
                timestamp: decision_event.timestamp.clone(),
                attributes: HashMap::new(),
            },
            SpanEvent {
                name: "impact_analysis_completed".to_string(),
                timestamp: assessment.assessed_at.clone(),
                attributes: {
                    let mut attrs = HashMap::new();
                    attrs.insert("risk_score".to_string(), serde_json::json!(assessment.risk_score));
                    attrs.insert("impact_level".to_string(), serde_json::json!(assessment.impact_level));
                    attrs
                },
            },
        ];

        let span_status = if assessment.risk_score < 0.7 {
            SpanStatus::Ok
        } else {
            SpanStatus::Unset // High risk doesn't mean error, just noteworthy
        };

        let span_request = EmitSpanRequest {
            trace_id: execution_context.trace_id.clone(),
            parent_span_id: None,
            operation_name: "change_impact_assessment".to_string(),
            service_name: AGENT_ID.to_string(),
            status: span_status,
            attributes,
            events: span_events,
        };

        // Emit span (fire and forget)
        let _ = observatory.emit_span(span_request).await;

        // Return telemetry reference
        format!("observatory://telemetry/{}/{}", AGENT_ID, event_id)
    }

    /// Analyze the impact of a change
    async fn analyze_impact(&self, input: &ChangeImpactInput) -> Result<ChangeImpactAssessment> {
        let assessment_id = Uuid::new_v4().to_string();
        let change = &input.change_request;

        // Analyze impacts by area
        let mut impacts = Vec::new();
        let mut risk_indicators = Vec::new();
        let mut policy_implications = Vec::new();
        let mut compliance_implications = Vec::new();
        let mut affected_systems = Vec::new();
        let mut cost_implications = None;

        // Policy impact analysis
        if let Some(ref policy_engine) = self.policy_engine {
            let policy_impacts = self.analyze_policy_impact(policy_engine, input).await?;
            impacts.extend(policy_impacts.impacts);
            policy_implications.extend(policy_impacts.implications);
            risk_indicators.extend(policy_impacts.risks);
        }

        // Cost impact analysis (if requested)
        if input.scope.as_ref().map_or(false, |s| s.include_cost_impact.unwrap_or(false)) {
            if let Some(ref cost_ops) = self.cost_ops {
                cost_implications = self.analyze_cost_impact(cost_ops, input).await?;
            }
        }

        // Compliance impact analysis (if requested)
        if input.scope.as_ref().map_or(false, |s| s.include_compliance_impact.unwrap_or(false)) {
            let compliance_impact = self.analyze_compliance_impact(input).await?;
            compliance_implications.extend(compliance_impact);
        }

        // Analyze affected downstream systems
        if input.include_downstream.unwrap_or(true) {
            affected_systems = self.analyze_downstream_systems(input).await?;
        }

        // Calculate overall risk score
        let risk_score = self.calculate_risk_score(&impacts, &risk_indicators, &policy_implications);
        let impact_level = ImpactLevel::from_score(risk_score);
        let risk_classification = RiskClassification::from_score(risk_score);

        // Generate recommendations
        let recommendations = self.generate_recommendations(
            &risk_classification,
            &risk_indicators,
            &policy_implications,
        );

        // Build summary
        let summary = self.build_summary(
            &change,
            &impact_level,
            &risk_classification,
            impacts.len(),
            affected_systems.len(),
        );

        // Get historical context (if available)
        let historical_context = if input.include_risk_projection.unwrap_or(false) {
            self.get_historical_context(input).await?
        } else {
            None
        };

        Ok(ChangeImpactAssessment {
            id: assessment_id,
            change_request_id: change.change_id.clone(),
            impact_level,
            risk_score,
            risk_classification,
            summary,
            impacts,
            affected_systems,
            policy_implications,
            compliance_implications,
            cost_implications,
            risk_indicators,
            recommendations,
            historical_context,
            assessed_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Analyze policy-related impacts
    async fn analyze_policy_impact(
        &self,
        policy_engine: &PolicyEngineConsumer,
        input: &ChangeImpactInput,
    ) -> Result<PolicyImpactAnalysis> {
        let mut impacts = Vec::new();
        let mut implications = Vec::new();
        let mut risks = Vec::new();

        // Get current compliance status
        let compliance_status = policy_engine
            .get_compliance_status(&input.organization_id)
            .await
            .ok();

        // Analyze impact on policy enforcement
        match input.change_request.subject_type {
            ChangeSubjectType::Policy | ChangeSubjectType::PolicyRule => {
                impacts.push(ImpactDetail {
                    area: ImpactArea::PolicyEnforcement,
                    level: ImpactLevel::Moderate,
                    description: format!(
                        "Direct modification to {} may affect enforcement behavior",
                        input.change_request.subject_type.to_string()
                    ),
                    affected_entities: vec![input.change_request.subject_id.clone()],
                    metrics: None,
                });

                implications.push(PolicyImplication {
                    policy_id: input.change_request.subject_id.clone(),
                    policy_name: input.change_request.description.clone(),
                    implication_type: PolicyImplicationType::ScopeChanged,
                    description: "Policy scope or rules may be affected by this change".to_string(),
                    affected_rules: vec![],
                    policy_remains_valid: true,
                });

                risks.push(RiskIndicator {
                    id: Uuid::new_v4().to_string(),
                    category: RiskIndicatorCategory::ComplianceRisk,
                    severity: GovernanceSeverity::Medium,
                    description: "Policy modification may introduce compliance gaps".to_string(),
                    evidence: vec![format!(
                        "Change type: {:?}, Subject: {}",
                        input.change_request.change_type,
                        input.change_request.subject_id
                    )],
                    mitigation_suggestions: vec![
                        "Review policy coverage after change".to_string(),
                        "Validate compliance requirements are still met".to_string(),
                    ],
                });
            }
            ChangeSubjectType::LlmModel | ChangeSubjectType::LlmProvider => {
                impacts.push(ImpactDetail {
                    area: ImpactArea::ModelBehavior,
                    level: ImpactLevel::High,
                    description: "Model/provider change may affect output quality and cost".to_string(),
                    affected_entities: vec![input.change_request.subject_id.clone()],
                    metrics: None,
                });

                risks.push(RiskIndicator {
                    id: Uuid::new_v4().to_string(),
                    category: RiskIndicatorCategory::OperationalRisk,
                    severity: GovernanceSeverity::High,
                    description: "Model change may affect system behavior and output quality".to_string(),
                    evidence: vec![],
                    mitigation_suggestions: vec![
                        "Conduct A/B testing before full rollout".to_string(),
                        "Monitor output quality metrics post-change".to_string(),
                    ],
                });
            }
            ChangeSubjectType::Budget | ChangeSubjectType::Quota => {
                impacts.push(ImpactDetail {
                    area: ImpactArea::Cost,
                    level: ImpactLevel::Moderate,
                    description: "Budget/quota change affects cost controls".to_string(),
                    affected_entities: vec![input.change_request.subject_id.clone()],
                    metrics: None,
                });

                risks.push(RiskIndicator {
                    id: Uuid::new_v4().to_string(),
                    category: RiskIndicatorCategory::FinancialRisk,
                    severity: GovernanceSeverity::Medium,
                    description: "Financial controls may be weakened or strengthened".to_string(),
                    evidence: vec![],
                    mitigation_suggestions: vec![
                        "Review budget allocation impact".to_string(),
                        "Set up alerts for cost anomalies".to_string(),
                    ],
                });
            }
            ChangeSubjectType::AccessControl | ChangeSubjectType::User | ChangeSubjectType::Team => {
                impacts.push(ImpactDetail {
                    area: ImpactArea::AccessControl,
                    level: ImpactLevel::High,
                    description: "Access control change affects security posture".to_string(),
                    affected_entities: vec![input.change_request.subject_id.clone()],
                    metrics: None,
                });

                risks.push(RiskIndicator {
                    id: Uuid::new_v4().to_string(),
                    category: RiskIndicatorCategory::SecurityRisk,
                    severity: GovernanceSeverity::High,
                    description: "Access changes may create security vulnerabilities".to_string(),
                    evidence: vec![],
                    mitigation_suggestions: vec![
                        "Audit access changes with security team".to_string(),
                        "Apply principle of least privilege".to_string(),
                    ],
                });
            }
            _ => {
                impacts.push(ImpactDetail {
                    area: ImpactArea::DataGovernance,
                    level: ImpactLevel::Low,
                    description: "Configuration change with limited governance impact".to_string(),
                    affected_entities: vec![input.change_request.subject_id.clone()],
                    metrics: None,
                });
            }
        }

        Ok(PolicyImpactAnalysis {
            impacts,
            implications,
            risks,
        })
    }

    /// Analyze cost-related impacts
    async fn analyze_cost_impact(
        &self,
        cost_ops: &CostOpsConsumer,
        input: &ChangeImpactInput,
    ) -> Result<Option<CostImplication>> {
        // Get current cost summary
        let cost_summary = cost_ops
            .get_cost_summary(&input.organization_id, None)
            .await
            .ok();

        if let Some(summary) = cost_summary {
            // Estimate cost delta based on change type
            let estimated_delta = match input.change_request.change_type {
                ChangeType::Create => summary.total_cost * 0.1, // Rough estimate
                ChangeType::Delete => -summary.total_cost * 0.05,
                ChangeType::BudgetAdjust => 0.0, // Depends on specific change
                _ => 0.0,
            };

            Ok(Some(CostImplication {
                estimated_delta,
                currency: "USD".to_string(),
                period: "monthly".to_string(),
                confidence: 0.6, // Lower confidence for estimates
                breakdown: vec![],
                budget_alerts_triggered: vec![],
            }))
        } else {
            Ok(None)
        }
    }

    /// Analyze compliance-related impacts
    async fn analyze_compliance_impact(
        &self,
        input: &ChangeImpactInput,
    ) -> Result<Vec<ComplianceImplication>> {
        let mut implications = Vec::new();

        // Based on subject type, determine compliance implications
        match input.change_request.subject_type {
            ChangeSubjectType::Policy | ChangeSubjectType::PolicyRule => {
                implications.push(ComplianceImplication {
                    framework: "Internal Governance".to_string(),
                    requirement_id: "GOV-001".to_string(),
                    requirement_description: "All policy changes must be audited".to_string(),
                    current_status: ComplianceImpactStatus::Compliant,
                    projected_status: ComplianceImpactStatus::RequiresReview,
                    gap_description: Some("Policy modification requires compliance review".to_string()),
                });
            }
            ChangeSubjectType::AccessControl => {
                implications.push(ComplianceImplication {
                    framework: "Access Control".to_string(),
                    requirement_id: "AC-002".to_string(),
                    requirement_description: "Access changes must follow approval workflow".to_string(),
                    current_status: ComplianceImpactStatus::Compliant,
                    projected_status: ComplianceImpactStatus::RequiresReview,
                    gap_description: Some("Access modification requires security review".to_string()),
                });
            }
            _ => {}
        }

        Ok(implications)
    }

    /// Analyze affected downstream systems
    async fn analyze_downstream_systems(
        &self,
        input: &ChangeImpactInput,
    ) -> Result<Vec<AffectedSystem>> {
        let mut systems = Vec::new();

        // Identify affected systems based on subject type
        match input.change_request.subject_type {
            ChangeSubjectType::Policy => {
                systems.push(AffectedSystem {
                    system_id: "policy-engine".to_string(),
                    system_name: "LLM-Policy-Engine".to_string(),
                    system_type: "enforcement".to_string(),
                    impact_description: "Policy evaluations may change".to_string(),
                    severity: GovernanceSeverity::Medium,
                    dependencies: vec![input.change_request.subject_id.clone()],
                });
            }
            ChangeSubjectType::LlmModel | ChangeSubjectType::LlmProvider => {
                systems.push(AffectedSystem {
                    system_id: "registry".to_string(),
                    system_name: "LLM-Registry".to_string(),
                    system_type: "model-management".to_string(),
                    impact_description: "Model routing may be affected".to_string(),
                    severity: GovernanceSeverity::High,
                    dependencies: vec![input.change_request.subject_id.clone()],
                });
                systems.push(AffectedSystem {
                    system_id: "cost-ops".to_string(),
                    system_name: "LLM-CostOps".to_string(),
                    system_type: "cost-management".to_string(),
                    impact_description: "Cost tracking affected by model change".to_string(),
                    severity: GovernanceSeverity::Medium,
                    dependencies: vec![],
                });
            }
            ChangeSubjectType::Budget | ChangeSubjectType::Quota => {
                systems.push(AffectedSystem {
                    system_id: "cost-ops".to_string(),
                    system_name: "LLM-CostOps".to_string(),
                    system_type: "cost-management".to_string(),
                    impact_description: "Budget/quota controls affected".to_string(),
                    severity: GovernanceSeverity::Medium,
                    dependencies: vec![input.change_request.subject_id.clone()],
                });
            }
            _ => {}
        }

        Ok(systems)
    }

    /// Calculate overall risk score
    fn calculate_risk_score(
        &self,
        impacts: &[ImpactDetail],
        risks: &[RiskIndicator],
        policy_implications: &[PolicyImplication],
    ) -> f64 {
        let mut score = 0.0;
        let mut weight_sum = 0.0;

        // Impact contribution
        for impact in impacts {
            let impact_weight = match impact.level {
                ImpactLevel::None => 0.0,
                ImpactLevel::Minimal => 0.1,
                ImpactLevel::Low => 0.2,
                ImpactLevel::Moderate => 0.4,
                ImpactLevel::High => 0.7,
                ImpactLevel::Critical => 1.0,
            };
            score += impact_weight * 0.4;
            weight_sum += 0.4;
        }

        // Risk indicator contribution
        for risk in risks {
            let risk_weight = match risk.severity {
                GovernanceSeverity::Info => 0.1,
                GovernanceSeverity::Low => 0.2,
                GovernanceSeverity::Medium => 0.4,
                GovernanceSeverity::High => 0.7,
                GovernanceSeverity::Critical => 1.0,
            };
            score += risk_weight * 0.4;
            weight_sum += 0.4;
        }

        // Policy implication contribution
        for implication in policy_implications {
            let impl_weight = match implication.implication_type {
                PolicyImplicationType::NoImpact => 0.0,
                PolicyImplicationType::ScopeChanged => 0.3,
                PolicyImplicationType::EffectivenessReduced => 0.5,
                PolicyImplicationType::CoverageGap => 0.6,
                PolicyImplicationType::RulesViolated => 0.8,
                PolicyImplicationType::ConflictIntroduced => 0.9,
                PolicyImplicationType::RedundancyCreated => 0.2,
            };
            score += impl_weight * 0.2;
            weight_sum += 0.2;
        }

        if weight_sum > 0.0 {
            (score / weight_sum).min(1.0)
        } else {
            0.0
        }
    }

    /// Generate recommendations based on analysis
    fn generate_recommendations(
        &self,
        risk_classification: &RiskClassification,
        risks: &[RiskIndicator],
        policy_implications: &[PolicyImplication],
    ) -> Vec<ImpactRecommendation> {
        let mut recommendations = Vec::new();

        // Risk-level based recommendations
        match risk_classification {
            RiskClassification::CriticalRisk | RiskClassification::Unacceptable => {
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::Critical,
                    recommendation_type: RecommendationType::ApprovalRequired,
                    recommendation: "Executive approval required before proceeding".to_string(),
                    rationale: "Critical risk level detected".to_string(),
                    related_risks: risks.iter().map(|r| r.id.clone()).collect(),
                });
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::Critical,
                    recommendation_type: RecommendationType::RollbackPlan,
                    recommendation: "Detailed rollback plan required".to_string(),
                    rationale: "High impact change requires recovery strategy".to_string(),
                    related_risks: vec![],
                });
            }
            RiskClassification::HighRisk => {
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::High,
                    recommendation_type: RecommendationType::ReviewRequired,
                    recommendation: "Security and compliance review required".to_string(),
                    rationale: "High risk level requires enhanced review".to_string(),
                    related_risks: risks.iter().map(|r| r.id.clone()).collect(),
                });
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::High,
                    recommendation_type: RecommendationType::StagedRollout,
                    recommendation: "Implement staged rollout".to_string(),
                    rationale: "Gradual deployment reduces risk".to_string(),
                    related_risks: vec![],
                });
            }
            RiskClassification::MediumRisk => {
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::Medium,
                    recommendation_type: RecommendationType::TestingRecommended,
                    recommendation: "Comprehensive testing recommended".to_string(),
                    rationale: "Medium risk warrants additional validation".to_string(),
                    related_risks: vec![],
                });
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::Medium,
                    recommendation_type: RecommendationType::MonitoringEnhancement,
                    recommendation: "Enhanced monitoring post-deployment".to_string(),
                    rationale: "Track impact metrics after change".to_string(),
                    related_risks: vec![],
                });
            }
            _ => {
                recommendations.push(ImpactRecommendation {
                    id: Uuid::new_v4().to_string(),
                    priority: RecommendationPriority::Low,
                    recommendation_type: RecommendationType::DocumentationUpdate,
                    recommendation: "Update documentation to reflect change".to_string(),
                    rationale: "Standard change management practice".to_string(),
                    related_risks: vec![],
                });
            }
        }

        recommendations
    }

    /// Build human-readable summary
    fn build_summary(
        &self,
        change: &ChangeRequest,
        impact_level: &ImpactLevel,
        risk_classification: &RiskClassification,
        impact_count: usize,
        affected_systems_count: usize,
    ) -> String {
        format!(
            "Change Impact Assessment for {:?} on {:?} '{}': \
            Impact Level: {:?}, Risk Classification: {:?}. \
            Identified {} impact areas affecting {} downstream systems.",
            change.change_type,
            change.subject_type,
            change.subject_id,
            impact_level,
            risk_classification,
            impact_count,
            affected_systems_count
        )
    }

    /// Get historical context for similar changes
    async fn get_historical_context(
        &self,
        input: &ChangeImpactInput,
    ) -> Result<Option<HistoricalContext>> {
        // Query ruvector-service for similar past changes
        let query = super::ruvector::DecisionEventQuery {
            organization_id: input.organization_id.clone(),
            agent_id: Some(AGENT_ID.to_string()),
            decision_type: Some(GovernanceDecisionType::ChangeImpact),
            time_range: input.historical_range.clone(),
            limit: Some(10),
            offset: None,
        };

        let past_events = self.ruvector.query_decision_events(query).await.ok();

        if let Some(events) = past_events {
            if events.items.is_empty() {
                return Ok(Some(HistoricalContext {
                    similar_changes_count: 0,
                    average_outcome: HistoricalOutcome::InsufficientData,
                    common_issues: vec![],
                    success_patterns: vec![],
                    change_refs: vec![],
                }));
            }

            let change_refs: Vec<DataReference> = events.items.iter().map(|e| {
                DataReference {
                    ref_type: DataReferenceType::DecisionEvent,
                    source_system: "ruvector-service".to_string(),
                    ref_id: e.id.clone(),
                    ref_timestamp: e.timestamp.clone(),
                }
            }).collect();

            Ok(Some(HistoricalContext {
                similar_changes_count: events.items.len() as u32,
                average_outcome: HistoricalOutcome::Successful, // Simplified
                common_issues: vec!["Configuration drift".to_string()],
                success_patterns: vec!["Staged rollout".to_string(), "Pre-change testing".to_string()],
                change_refs,
            }))
        } else {
            Ok(None)
        }
    }

    /// Hash inputs for reproducibility verification
    fn hash_inputs(&self, input: &ChangeImpactInput) -> String {
        let input_json = serde_json::to_string(input).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(input_json.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Calculate confidence metrics
    fn calculate_confidence(
        &self,
        input: &ChangeImpactInput,
        assessment: &ChangeImpactAssessment,
    ) -> DecisionConfidence {
        // Completeness based on available data
        let mut completeness = 0.5; // Base
        if self.policy_engine.is_some() {
            completeness += 0.15;
        }
        if self.cost_ops.is_some() && input.scope.as_ref().map_or(false, |s| s.include_cost_impact.unwrap_or(false)) {
            completeness += 0.15;
        }
        if !assessment.affected_systems.is_empty() {
            completeness += 0.1;
        }
        if assessment.historical_context.is_some() {
            completeness += 0.1;
        }

        // Certainty based on risk score variance
        let certainty = if assessment.risk_score < 0.3 || assessment.risk_score > 0.7 {
            0.85 // High certainty for clear cases
        } else {
            0.65 // Lower certainty for borderline cases
        };

        DecisionConfidence {
            overall: (completeness + certainty) / 2.0,
            completeness: completeness.min(1.0),
            certainty,
            bands: vec![
                ConfidenceBand {
                    aspect: "policy_impact".to_string(),
                    lower: 0.6,
                    upper: 0.9,
                    median: 0.75,
                },
                ConfidenceBand {
                    aspect: "risk_assessment".to_string(),
                    lower: 0.5,
                    upper: 0.85,
                    median: 0.7,
                },
            ],
            factors: vec![
                ConfidenceFactor {
                    factor: "upstream_data_availability".to_string(),
                    impact: if self.policy_engine.is_some() { ConfidenceImpact::Positive } else { ConfidenceImpact::Negative },
                    weight: 0.3,
                    description: "Availability of policy engine data".to_string(),
                },
                ConfidenceFactor {
                    factor: "historical_data".to_string(),
                    impact: if assessment.historical_context.is_some() { ConfidenceImpact::Positive } else { ConfidenceImpact::Neutral },
                    weight: 0.2,
                    description: "Historical change data availability".to_string(),
                },
            ],
        }
    }

    /// Build constraints applied during analysis
    fn build_constraints(&self, input: &ChangeImpactInput) -> Vec<ConstraintApplication> {
        let mut constraints = Vec::new();

        // Organization boundary constraint
        constraints.push(ConstraintApplication {
            constraint_id: "org-boundary".to_string(),
            constraint_name: "Organization Boundary".to_string(),
            constraint_type: ConstraintType::OrganizationalBoundary,
            scope: ConstraintScope {
                organizations: vec![input.organization_id.clone()],
                teams: input.scope.as_ref().and_then(|s| s.teams.clone()).unwrap_or_default(),
                resource_types: vec![],
                time_range: input.historical_range.clone(),
            },
            satisfied: true,
            details: "Analysis scoped to organization".to_string(),
        });

        // Data retention constraint
        constraints.push(ConstraintApplication {
            constraint_id: "data-retention".to_string(),
            constraint_name: "Data Retention Policy".to_string(),
            constraint_type: ConstraintType::DataRetention,
            scope: ConstraintScope {
                organizations: vec![input.organization_id.clone()],
                teams: vec![],
                resource_types: vec![],
                time_range: None,
            },
            satisfied: true,
            details: "DecisionEvent persisted with compliant TTL".to_string(),
        });

        constraints
    }

    /// Build decision outputs for the DecisionEvent
    fn build_decision_outputs(&self, assessment: &ChangeImpactAssessment) -> DecisionOutputs {
        let findings: Vec<GovernanceFinding> = assessment.risk_indicators.iter().map(|r| {
            GovernanceFinding {
                id: r.id.clone(),
                category: match r.category {
                    RiskIndicatorCategory::ComplianceRisk => FindingCategory::ComplianceDeviation,
                    RiskIndicatorCategory::SecurityRisk => FindingCategory::AccessAnomaly,
                    RiskIndicatorCategory::ConfigurationRisk => FindingCategory::ConfigurationDrift,
                    RiskIndicatorCategory::FinancialRisk => FindingCategory::CostAnomaly,
                    _ => FindingCategory::PolicyViolation,
                },
                severity: r.severity.clone(),
                title: r.description.clone(),
                description: r.evidence.join("; "),
                affected_resources: vec![assessment.change_request_id.clone()],
                evidence_refs: r.evidence.clone(),
                first_detected: assessment.assessed_at.clone(),
                last_seen: assessment.assessed_at.clone(),
            }
        }).collect();

        let mut findings_by_severity = HashMap::new();
        for finding in &findings {
            let key = serde_json::to_string(&finding.severity).unwrap_or_default();
            *findings_by_severity.entry(key).or_insert(0) += 1;
        }

        DecisionOutputs {
            summary: assessment.summary.clone(),
            findings,
            metrics: GovernanceMetrics {
                events_analyzed: assessment.impacts.len() as u64,
                time_range: DateRange {
                    start: assessment.assessed_at.clone(),
                    end: assessment.assessed_at.clone(),
                },
                coverage_percentage: 85.0,
                policies_evaluated: assessment.policy_implications.len() as u32,
                compliance_rate: 100.0 - (assessment.risk_score * 100.0),
                findings_by_severity,
                trend: if assessment.risk_score < 0.3 {
                    TrendDirection::Improving
                } else if assessment.risk_score > 0.6 {
                    TrendDirection::Degrading
                } else {
                    TrendDirection::Stable
                },
            },
            recommendations: assessment.recommendations.iter().map(|r| r.recommendation.clone()).collect(),
            data_refs: assessment.affected_systems.iter().map(|s| {
                DataReference {
                    ref_type: DataReferenceType::DecisionEvent,
                    source_system: s.system_name.clone(),
                    ref_id: s.system_id.clone(),
                    ref_timestamp: assessment.assessed_at.clone(),
                }
            }).collect(),
        }
    }
}

/// Execution context for the agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionContext {
    /// Unique request identifier
    pub request_id: Option<String>,
    /// Distributed trace ID for Observatory integration
    pub trace_id: Option<String>,
    /// Invoker identifier (user, system, etc.)
    pub invoker: Option<String>,
    /// Source of the invocation
    pub source: InvocationSource,
}

/// Internal helper struct for policy impact analysis
struct PolicyImpactAnalysis {
    impacts: Vec<ImpactDetail>,
    implications: Vec<PolicyImplication>,
    risks: Vec<RiskIndicator>,
}

// Implement Display for ChangeSubjectType for error messages
impl std::fmt::Display for ChangeSubjectType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ChangeSubjectType::Policy => write!(f, "policy"),
            ChangeSubjectType::PolicyRule => write!(f, "policy_rule"),
            ChangeSubjectType::Configuration => write!(f, "configuration"),
            ChangeSubjectType::LlmModel => write!(f, "llm_model"),
            ChangeSubjectType::LlmProvider => write!(f, "llm_provider"),
            ChangeSubjectType::Budget => write!(f, "budget"),
            ChangeSubjectType::Quota => write!(f, "quota"),
            ChangeSubjectType::AccessControl => write!(f, "access_control"),
            ChangeSubjectType::Team => write!(f, "team"),
            ChangeSubjectType::User => write!(f, "user"),
            ChangeSubjectType::Organization => write!(f, "organization"),
            ChangeSubjectType::Integration => write!(f, "integration"),
            ChangeSubjectType::Webhook => write!(f, "webhook"),
        }
    }
}

#[async_trait]
impl EcosystemConsumer for ChangeImpactAgent {
    fn service_name(&self) -> &'static str {
        "change-impact-agent"
    }

    async fn health_check(&self) -> Result<bool> {
        // Check ruvector-service health
        self.ruvector.health_check().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_impact_level_from_score() {
        assert_eq!(ImpactLevel::from_score(0.0), ImpactLevel::None);
        assert_eq!(ImpactLevel::from_score(0.15), ImpactLevel::Minimal);
        assert_eq!(ImpactLevel::from_score(0.3), ImpactLevel::Low);
        assert_eq!(ImpactLevel::from_score(0.5), ImpactLevel::Moderate);
        assert_eq!(ImpactLevel::from_score(0.75), ImpactLevel::High);
        assert_eq!(ImpactLevel::from_score(0.95), ImpactLevel::Critical);
    }

    #[test]
    fn test_risk_classification_from_score() {
        assert_eq!(RiskClassification::from_score(0.1), RiskClassification::Acceptable);
        assert_eq!(RiskClassification::from_score(0.25), RiskClassification::LowRisk);
        assert_eq!(RiskClassification::from_score(0.45), RiskClassification::MediumRisk);
        assert_eq!(RiskClassification::from_score(0.65), RiskClassification::HighRisk);
        assert_eq!(RiskClassification::from_score(0.8), RiskClassification::CriticalRisk);
        assert_eq!(RiskClassification::from_score(0.9), RiskClassification::Unacceptable);
    }

    #[test]
    fn test_change_type_serialization() {
        let change_type = ChangeType::PolicyModify;
        let json = serde_json::to_string(&change_type).unwrap();
        assert_eq!(json, "\"policy_modify\"");
    }

    #[test]
    fn test_change_subject_type_serialization() {
        let subject_type = ChangeSubjectType::LlmModel;
        let json = serde_json::to_string(&subject_type).unwrap();
        assert_eq!(json, "\"llm_model\"");
    }

    #[test]
    fn test_change_request_serialization() {
        let change = ChangeRequest {
            change_id: "ch-123".to_string(),
            change_type: ChangeType::Update,
            subject_type: ChangeSubjectType::Policy,
            subject_id: "pol-456".to_string(),
            description: "Update policy rules".to_string(),
            timestamp: "2024-01-15T10:00:00Z".to_string(),
            initiator: "user@example.com".to_string(),
            previous_state: None,
            new_state: None,
            metadata: None,
        };

        let json = serde_json::to_string(&change).unwrap();
        assert!(json.contains("\"change_id\":\"ch-123\""));
        assert!(json.contains("\"change_type\":\"update\""));
    }
}
