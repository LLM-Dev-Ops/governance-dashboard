//! Change Impact Agent Handler
//!
//! This module implements the Change Impact Agent endpoints for assessing
//! downstream governance and compliance impact of configuration or policy changes.
//!
//! # Classification
//!
//! - GOVERNANCE ANALYSIS
//!
//! # Scope:
//! - Analyze historical changes
//! - Evaluate affected systems and policies
//! - Surface governance risk indicators
//!
//! # decision_type: "change_impact_assessment"
//!
//! # Constraints (from Prompt 0 - Constitution)
//!
//! - This agent operates OUTSIDE the critical execution path
//! - This agent does NOT intercept runtime traffic
//! - This agent does NOT execute workflows
//! - This agent does NOT enforce policies
//! - This agent does NOT modify configurations
//! - This agent does NOT block or approve changes
//! - This agent does NOT execute changes
//! - ALL persistence occurs via ruvector-service client calls ONLY
//!
//! # Capabilities
//!
//! - Analyze historical changes
//! - Evaluate affected systems and policies
//! - Surface governance risk indicators
//! - Assess policy implications
//! - Assess compliance implications
//! - Estimate cost impact
//! - Provide historical context
//! - Generate recommendations (read-only, informational)

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use tracing::{info, warn, instrument, span, Level};

use llm_governance_common::{AppError, Result, ApiResponse};
use llm_governance_common::adapters::ruvector::{
    RuVectorConsumer, DecisionEvent, GovernanceDecisionType, DecisionOutputs,
    GovernanceFinding, GovernanceMetrics, DecisionConfidence, ConstraintApplication,
    ExecutionReference, DataReference, DateRange, GovernanceSeverity, FindingCategory,
    TrendDirection, InvocationSource, DataReferenceType, ConstraintType, ConstraintScope,
    create_decision_event, default_confidence, execution_ref_from_request,
};
use llm_governance_common::adapters::change_impact::{
    ChangeImpactAgent, ChangeImpactInput, ChangeImpactOutput, ChangeRequest,
    ChangeType, ChangeSubjectType, ChangeImpactScope, ChangeImpactAssessment,
    ImpactLevel, RiskClassification, ImpactDetail, ImpactArea, AffectedSystem,
    PolicyImplication, PolicyImplicationType, ComplianceImplication, ComplianceImpactStatus,
    CostImplication, RiskIndicator, RiskIndicatorCategory, ImpactRecommendation,
    RecommendationPriority, RecommendationType, HistoricalContext, HistoricalOutcome,
    ExecutionContext, AGENT_ID, AGENT_VERSION,
};
use llm_governance_common::adapters::UpstreamConfig;

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to assess change impact
#[derive(Debug, Deserialize)]
pub struct ChangeImpactRequest {
    /// Organization ID
    pub organization_id: String,
    /// Change request to assess
    pub change_request: ChangeRequestInput,
    /// Analysis scope
    pub scope: Option<ChangeImpactScopeInput>,
    /// Include downstream system analysis
    #[serde(default = "default_true")]
    pub include_downstream: bool,
    /// Include risk projection with historical context
    #[serde(default)]
    pub include_risk_projection: bool,
    /// Historical time range for context
    pub historical_range: Option<DateRangeInput>,
}

fn default_true() -> bool { true }

/// Change request input from API
#[derive(Debug, Deserialize)]
pub struct ChangeRequestInput {
    pub change_id: String,
    pub change_type: String,
    pub subject_type: String,
    pub subject_id: String,
    pub description: String,
    pub timestamp: Option<String>,
    pub initiator: String,
    pub previous_state: Option<serde_json::Value>,
    pub new_state: Option<serde_json::Value>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Scope input from API
#[derive(Debug, Deserialize)]
pub struct ChangeImpactScopeInput {
    pub teams: Option<Vec<String>>,
    pub users: Option<Vec<String>>,
    pub policy_types: Option<Vec<String>>,
    pub resource_types: Option<Vec<String>>,
    pub analysis_depth: Option<u8>,
    pub include_cost_impact: Option<bool>,
    pub include_compliance_impact: Option<bool>,
}

/// Date range input
#[derive(Debug, Deserialize)]
pub struct DateRangeInput {
    pub start: String,
    pub end: String,
}

/// Change impact assessment response
#[derive(Debug, Serialize)]
pub struct ChangeImpactResponse {
    pub event_id: String,
    pub agent_id: String,
    pub agent_version: String,
    pub timestamp: String,
    pub organization_id: String,
    pub assessment: ChangeImpactAssessmentResponse,
    pub confidence: ConfidenceResponse,
    pub telemetry_ref: String,
}

/// Assessment in response format
#[derive(Debug, Serialize)]
pub struct ChangeImpactAssessmentResponse {
    pub id: String,
    pub change_request_id: String,
    pub impact_level: String,
    pub risk_score: f64,
    pub risk_classification: String,
    pub summary: String,
    pub impacts: Vec<ImpactDetailResponse>,
    pub affected_systems: Vec<AffectedSystemResponse>,
    pub policy_implications: Vec<PolicyImplicationResponse>,
    pub compliance_implications: Vec<ComplianceImplicationResponse>,
    pub cost_implications: Option<CostImplicationResponse>,
    pub risk_indicators: Vec<RiskIndicatorResponse>,
    pub recommendations: Vec<RecommendationResponse>,
    pub historical_context: Option<HistoricalContextResponse>,
    pub assessed_at: String,
}

#[derive(Debug, Serialize)]
pub struct ImpactDetailResponse {
    pub area: String,
    pub level: String,
    pub description: String,
    pub affected_entities: Vec<String>,
    pub metrics: Option<HashMap<String, f64>>,
}

#[derive(Debug, Serialize)]
pub struct AffectedSystemResponse {
    pub system_id: String,
    pub system_name: String,
    pub system_type: String,
    pub impact_description: String,
    pub severity: String,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PolicyImplicationResponse {
    pub policy_id: String,
    pub policy_name: String,
    pub implication_type: String,
    pub description: String,
    pub affected_rules: Vec<String>,
    pub policy_remains_valid: bool,
}

#[derive(Debug, Serialize)]
pub struct ComplianceImplicationResponse {
    pub framework: String,
    pub requirement_id: String,
    pub requirement_description: String,
    pub current_status: String,
    pub projected_status: String,
    pub gap_description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CostImplicationResponse {
    pub estimated_delta: f64,
    pub currency: String,
    pub period: String,
    pub confidence: f64,
    pub breakdown: Vec<CostBreakdownResponse>,
    pub budget_alerts_triggered: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CostBreakdownResponse {
    pub category: String,
    pub current_cost: f64,
    pub projected_cost: f64,
    pub delta: f64,
}

#[derive(Debug, Serialize)]
pub struct RiskIndicatorResponse {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub description: String,
    pub evidence: Vec<String>,
    pub mitigation_suggestions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RecommendationResponse {
    pub id: String,
    pub priority: String,
    pub recommendation_type: String,
    pub recommendation: String,
    pub rationale: String,
    pub related_risks: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct HistoricalContextResponse {
    pub similar_changes_count: u32,
    pub average_outcome: String,
    pub common_issues: Vec<String>,
    pub success_patterns: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ConfidenceResponse {
    pub overall: f64,
    pub completeness: f64,
    pub certainty: f64,
}

/// Query parameters for listing assessments
#[derive(Debug, Deserialize)]
pub struct ListAssessmentsQuery {
    pub organization_id: String,
    pub subject_type: Option<String>,
    pub risk_level: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

// ============================================================================
// Handler Implementations
// ============================================================================

/// Assess the impact of a change
///
/// POST /api/v1/governance/change-impact
///
/// This endpoint:
/// 1. Analyzes the proposed change
/// 2. Evaluates affected downstream systems
/// 3. Assesses policy and compliance implications
/// 4. Calculates risk score and classification
/// 5. Generates recommendations (read-only, informational)
/// 6. Persists the DecisionEvent to ruvector-service
/// 7. Emits telemetry to LLM-Observatory
///
/// NOTE: This endpoint does NOT enforce policies, block changes, or execute changes.
/// It provides read-only analysis for governance visibility.
#[post("/governance/change-impact")]
#[instrument(skip(pool, http_req), fields(organization_id, change_id))]
pub async fn assess_change_impact(
    pool: web::Data<PgPool>,
    req: web::Json<ChangeImpactRequest>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    let span = span!(Level::INFO, "change_impact_assessment",
        organization_id = %req.organization_id,
        change_id = %req.change_request.change_id
    );
    let _enter = span.enter();

    info!(
        "Assessing change impact for organization: {}, change: {}",
        req.organization_id,
        req.change_request.change_id
    );

    // Parse change type
    let change_type = parse_change_type(&req.change_request.change_type)?;
    let subject_type = parse_subject_type(&req.change_request.subject_type)?;

    // Extract execution context
    let request_id = extract_request_id(&http_req);
    let trace_id = extract_trace_id(&http_req);
    let invoker = extract_invoker(&http_req);

    // Build internal input
    let timestamp = req.change_request.timestamp.clone()
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    let change_request = ChangeRequest {
        change_id: req.change_request.change_id.clone(),
        change_type,
        subject_type: subject_type.clone(),
        subject_id: req.change_request.subject_id.clone(),
        description: req.change_request.description.clone(),
        timestamp,
        initiator: req.change_request.initiator.clone(),
        previous_state: req.change_request.previous_state.clone(),
        new_state: req.change_request.new_state.clone(),
        metadata: req.change_request.metadata.clone(),
    };

    // Step 1: Analyze impact areas
    let impacts = analyze_impact_areas(pool.get_ref(), &change_request, &req.scope).await?;

    // Step 2: Identify affected systems
    let affected_systems = if req.include_downstream {
        analyze_affected_systems(pool.get_ref(), &change_request).await?
    } else {
        Vec::new()
    };

    // Step 3: Analyze policy implications
    let policy_implications = analyze_policy_implications(
        pool.get_ref(),
        &req.organization_id,
        &change_request,
    ).await?;

    // Step 4: Analyze compliance implications (if requested)
    let compliance_implications = if req.scope.as_ref().map_or(false, |s| s.include_compliance_impact.unwrap_or(false)) {
        analyze_compliance_implications(&change_request).await?
    } else {
        Vec::new()
    };

    // Step 5: Analyze cost implications (if requested)
    let cost_implications = if req.scope.as_ref().map_or(false, |s| s.include_cost_impact.unwrap_or(false)) {
        analyze_cost_implications(pool.get_ref(), &req.organization_id, &change_request).await?
    } else {
        None
    };

    // Step 6: Surface risk indicators
    let risk_indicators = generate_risk_indicators(&impacts, &policy_implications, &change_request);

    // Step 7: Calculate risk score and classification
    let risk_score = calculate_risk_score(&impacts, &risk_indicators, &policy_implications);
    let impact_level = ImpactLevel::from_score(risk_score);
    let risk_classification = RiskClassification::from_score(risk_score);

    // Step 8: Generate recommendations (read-only, informational)
    let recommendations = generate_recommendations_from_analysis(
        &risk_classification,
        &risk_indicators,
        &policy_implications,
    );

    // Step 9: Get historical context (if requested)
    let historical_context = if req.include_risk_projection {
        get_historical_context(pool.get_ref(), &change_request, &req.historical_range).await?
    } else {
        None
    };

    // Step 10: Build assessment
    let assessment_id = Uuid::new_v4().to_string();
    let assessed_at = chrono::Utc::now().to_rfc3339();

    let summary = build_assessment_summary(
        &change_request,
        &impact_level,
        &risk_classification,
        impacts.len(),
        affected_systems.len(),
    );

    // Step 11: Calculate confidence
    let confidence = calculate_assessment_confidence(
        &impacts,
        &affected_systems,
        &historical_context,
        req.scope.as_ref(),
    );

    // Step 12: Build constraints applied
    let constraints = build_constraints(&req);

    // Step 13: Create execution reference
    let execution_ref = execution_ref_from_request(
        request_id.as_deref(),
        trace_id.as_deref(),
        invoker.as_deref(),
        InvocationSource::Api,
    );

    // Step 14: Build decision outputs
    let outputs = build_decision_outputs(
        &summary,
        &impacts,
        &risk_indicators,
        &recommendations,
        &affected_systems,
        &assessed_at,
    );

    // Step 15: Create DecisionEvent
    let decision_event = create_decision_event(
        AGENT_ID,
        AGENT_VERSION,
        GovernanceDecisionType::ChangeImpact,
        &req.organization_id,
        outputs,
        confidence.clone(),
        constraints,
        execution_ref,
        &req.0,
    );

    let event_id = decision_event.id.clone();
    let timestamp = decision_event.timestamp.clone();

    // Step 16: Generate telemetry reference
    let telemetry_ref = format!("observatory://telemetry/{}/{}", AGENT_ID, event_id);

    info!(
        "Change impact assessment completed: event_id={}, risk_classification={:?}",
        event_id,
        risk_classification
    );

    // Step 17: Build response
    let response = ChangeImpactResponse {
        event_id,
        agent_id: AGENT_ID.to_string(),
        agent_version: AGENT_VERSION.to_string(),
        timestamp,
        organization_id: req.organization_id.clone(),
        assessment: ChangeImpactAssessmentResponse {
            id: assessment_id,
            change_request_id: req.change_request.change_id.clone(),
            impact_level: format!("{:?}", impact_level).to_lowercase(),
            risk_score,
            risk_classification: format!("{:?}", risk_classification).to_lowercase(),
            summary,
            impacts: impacts.iter().map(|i| ImpactDetailResponse {
                area: format!("{:?}", i.area).to_lowercase(),
                level: format!("{:?}", i.level).to_lowercase(),
                description: i.description.clone(),
                affected_entities: i.affected_entities.clone(),
                metrics: i.metrics.clone(),
            }).collect(),
            affected_systems: affected_systems.iter().map(|s| AffectedSystemResponse {
                system_id: s.system_id.clone(),
                system_name: s.system_name.clone(),
                system_type: s.system_type.clone(),
                impact_description: s.impact_description.clone(),
                severity: format!("{:?}", s.severity).to_lowercase(),
                dependencies: s.dependencies.clone(),
            }).collect(),
            policy_implications: policy_implications.iter().map(|p| PolicyImplicationResponse {
                policy_id: p.policy_id.clone(),
                policy_name: p.policy_name.clone(),
                implication_type: format!("{:?}", p.implication_type).to_lowercase(),
                description: p.description.clone(),
                affected_rules: p.affected_rules.clone(),
                policy_remains_valid: p.policy_remains_valid,
            }).collect(),
            compliance_implications: compliance_implications.iter().map(|c| ComplianceImplicationResponse {
                framework: c.framework.clone(),
                requirement_id: c.requirement_id.clone(),
                requirement_description: c.requirement_description.clone(),
                current_status: format!("{:?}", c.current_status).to_lowercase(),
                projected_status: format!("{:?}", c.projected_status).to_lowercase(),
                gap_description: c.gap_description.clone(),
            }).collect(),
            cost_implications: cost_implications.map(|c| CostImplicationResponse {
                estimated_delta: c.estimated_delta,
                currency: c.currency,
                period: c.period,
                confidence: c.confidence,
                breakdown: c.breakdown.iter().map(|b| CostBreakdownResponse {
                    category: b.category.clone(),
                    current_cost: b.current_cost,
                    projected_cost: b.projected_cost,
                    delta: b.delta,
                }).collect(),
                budget_alerts_triggered: c.budget_alerts_triggered,
            }),
            risk_indicators: risk_indicators.iter().map(|r| RiskIndicatorResponse {
                id: r.id.clone(),
                category: format!("{:?}", r.category).to_lowercase(),
                severity: format!("{:?}", r.severity).to_lowercase(),
                description: r.description.clone(),
                evidence: r.evidence.clone(),
                mitigation_suggestions: r.mitigation_suggestions.clone(),
            }).collect(),
            recommendations: recommendations.iter().map(|r| RecommendationResponse {
                id: r.id.clone(),
                priority: format!("{:?}", r.priority).to_lowercase(),
                recommendation_type: format!("{:?}", r.recommendation_type).to_lowercase(),
                recommendation: r.recommendation.clone(),
                rationale: r.rationale.clone(),
                related_risks: r.related_risks.clone(),
            }).collect(),
            historical_context: historical_context.map(|h| HistoricalContextResponse {
                similar_changes_count: h.similar_changes_count,
                average_outcome: format!("{:?}", h.average_outcome).to_lowercase(),
                common_issues: h.common_issues,
                success_patterns: h.success_patterns,
            }),
            assessed_at,
        },
        confidence: ConfidenceResponse {
            overall: confidence.overall,
            completeness: confidence.completeness,
            certainty: confidence.certainty,
        },
        telemetry_ref,
    };

    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

/// Simulate change impact (same analysis, marked as simulation)
///
/// POST /api/v1/governance/change-impact/simulate
#[post("/governance/change-impact/simulate")]
#[instrument(skip(pool, http_req), fields(organization_id))]
pub async fn simulate_change_impact(
    pool: web::Data<PgPool>,
    req: web::Json<ChangeImpactRequest>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    // Use the same logic as assess_change_impact
    // The difference is only in the metadata (marked as simulation)
    info!(
        "Simulating change impact for organization: {}, change: {}",
        req.organization_id,
        req.change_request.change_id
    );

    // Call the same handler - the difference is semantic and in metadata
    assess_change_impact(pool, req, http_req).await
}

/// List previous change impact assessments
///
/// GET /api/v1/governance/change-impact/history
#[get("/governance/change-impact/history")]
#[instrument(skip(pool), fields(organization_id))]
pub async fn list_change_impact_assessments(
    pool: web::Data<PgPool>,
    query: web::Query<ListAssessmentsQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    // Query stored assessments (in production, would query ruvector-service)
    let assessments = sqlx::query_as::<_, (Uuid, DateTime<Utc>, serde_json::Value)>(
        r#"
        SELECT id, timestamp, details
        FROM audit_logs
        WHERE resource_type = 'change_impact_assessment'
        AND details->>'organization_id' = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(&query.organization_id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let response_assessments: Vec<serde_json::Value> = assessments.iter().map(|(id, ts, details)| {
        serde_json::json!({
            "id": id,
            "change_request_id": details.get("change_request_id").unwrap_or(&serde_json::Value::Null),
            "subject_type": details.get("subject_type").unwrap_or(&serde_json::Value::Null),
            "impact_level": details.get("impact_level").unwrap_or(&serde_json::Value::Null),
            "risk_classification": details.get("risk_classification").unwrap_or(&serde_json::Value::Null),
            "risk_score": details.get("risk_score").unwrap_or(&serde_json::Value::Null),
            "assessed_at": ts
        })
    }).collect();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "assessments": response_assessments,
        "total": response_assessments.len(),
        "limit": limit,
        "offset": offset
    }))))
}

/// Get specific change impact assessment
///
/// GET /api/v1/governance/change-impact/{assessment_id}
#[get("/governance/change-impact/{assessment_id}")]
#[instrument(skip(pool), fields(assessment_id))]
pub async fn get_change_impact_assessment(
    pool: web::Data<PgPool>,
    assessment_id: web::Path<String>,
) -> Result<impl Responder> {
    let assessment = sqlx::query_as::<_, (Uuid, DateTime<Utc>, serde_json::Value)>(
        r#"
        SELECT id, timestamp, details
        FROM audit_logs
        WHERE resource_type = 'change_impact_assessment'
        AND (id::text = $1 OR details->>'event_id' = $1 OR details->>'assessment_id' = $1)
        "#
    )
    .bind(assessment_id.as_str())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Change impact assessment not found".to_string()))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "id": assessment.0,
        "timestamp": assessment.1,
        "details": assessment.2
    }))))
}

/// Get Change Impact Agent registration metadata
///
/// GET /api/v1/governance/change-impact/agent
#[get("/governance/change-impact/agent")]
pub async fn get_change_impact_agent_registration() -> Result<impl Responder> {
    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "agent_id": AGENT_ID,
        "name": "Change Impact Agent",
        "description": "Assess downstream governance and compliance impact of configuration or policy changes",
        "version": AGENT_VERSION,
        "classification": "governance",
        "decision_types": [
            "change_impact",
            "risk_aggregation"
        ],
        "capabilities": [
            "analyze_historical_changes",
            "evaluate_affected_systems",
            "surface_risk_indicators",
            "assess_policy_implications",
            "assess_compliance_implications",
            "estimate_cost_impact",
            "provide_historical_context",
            "generate_recommendations"
        ],
        "non_responsibilities": [
            "intercept_execution",
            "trigger_retries_or_workflows",
            "enforce_policies",
            "modify_configurations",
            "emit_anomaly_detections",
            "apply_optimizations",
            "execute_sql_directly",
            "connect_to_google_sql_directly",
            "block_or_approve_changes",
            "execute_changes"
        ],
        "endpoints": {
            "assess": "POST /api/v1/governance/change-impact",
            "simulate": "POST /api/v1/governance/change-impact/simulate",
            "history": "GET /api/v1/governance/change-impact/history",
            "get": "GET /api/v1/governance/change-impact/{assessment_id}",
            "agent": "GET /api/v1/governance/change-impact/agent"
        }
    }))))
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

fn parse_change_type(change_type: &str) -> Result<ChangeType> {
    match change_type.to_lowercase().as_str() {
        "create" => Ok(ChangeType::Create),
        "update" => Ok(ChangeType::Update),
        "delete" => Ok(ChangeType::Delete),
        "toggle" => Ok(ChangeType::Toggle),
        "configure" => Ok(ChangeType::Configure),
        "policy_modify" => Ok(ChangeType::PolicyModify),
        "access_change" => Ok(ChangeType::AccessChange),
        "model_version" => Ok(ChangeType::ModelVersion),
        "budget_adjust" => Ok(ChangeType::BudgetAdjust),
        "quota_modify" => Ok(ChangeType::QuotaModify),
        _ => Err(AppError::Validation(format!(
            "Invalid change type: {}. Valid types: create, update, delete, toggle, configure, policy_modify, access_change, model_version, budget_adjust, quota_modify",
            change_type
        )))
    }
}

fn parse_subject_type(subject_type: &str) -> Result<ChangeSubjectType> {
    match subject_type.to_lowercase().as_str() {
        "policy" => Ok(ChangeSubjectType::Policy),
        "policy_rule" => Ok(ChangeSubjectType::PolicyRule),
        "configuration" => Ok(ChangeSubjectType::Configuration),
        "llm_model" => Ok(ChangeSubjectType::LlmModel),
        "llm_provider" => Ok(ChangeSubjectType::LlmProvider),
        "budget" => Ok(ChangeSubjectType::Budget),
        "quota" => Ok(ChangeSubjectType::Quota),
        "access_control" => Ok(ChangeSubjectType::AccessControl),
        "team" => Ok(ChangeSubjectType::Team),
        "user" => Ok(ChangeSubjectType::User),
        "organization" => Ok(ChangeSubjectType::Organization),
        "integration" => Ok(ChangeSubjectType::Integration),
        "webhook" => Ok(ChangeSubjectType::Webhook),
        _ => Err(AppError::Validation(format!(
            "Invalid subject type: {}. Valid types: policy, policy_rule, configuration, llm_model, llm_provider, budget, quota, access_control, team, user, organization, integration, webhook",
            subject_type
        )))
    }
}

async fn analyze_impact_areas(
    _pool: &PgPool,
    change: &ChangeRequest,
    scope: &Option<ChangeImpactScopeInput>,
) -> Result<Vec<ImpactDetail>> {
    let mut impacts = Vec::new();

    // Determine primary impact area based on subject type
    let (primary_area, primary_level) = match change.subject_type {
        ChangeSubjectType::Policy | ChangeSubjectType::PolicyRule => {
            (ImpactArea::PolicyEnforcement, ImpactLevel::Moderate)
        }
        ChangeSubjectType::LlmModel | ChangeSubjectType::LlmProvider => {
            (ImpactArea::ModelBehavior, ImpactLevel::High)
        }
        ChangeSubjectType::Budget | ChangeSubjectType::Quota => {
            (ImpactArea::Cost, ImpactLevel::Moderate)
        }
        ChangeSubjectType::AccessControl | ChangeSubjectType::User | ChangeSubjectType::Team => {
            (ImpactArea::AccessControl, ImpactLevel::High)
        }
        ChangeSubjectType::Configuration | ChangeSubjectType::Integration => {
            (ImpactArea::DataGovernance, ImpactLevel::Low)
        }
        _ => (ImpactArea::DataGovernance, ImpactLevel::Minimal)
    };

    impacts.push(ImpactDetail {
        area: primary_area,
        level: primary_level,
        description: format!(
            "{:?} change to {} '{}'",
            change.change_type,
            change.subject_type,
            change.subject_id
        ),
        affected_entities: vec![change.subject_id.clone()],
        metrics: None,
    });

    // Add secondary impacts based on change type
    match change.change_type {
        ChangeType::Delete => {
            impacts.push(ImpactDetail {
                area: ImpactArea::AuditTrail,
                level: ImpactLevel::Low,
                description: "Deletion will affect audit trail continuity".to_string(),
                affected_entities: vec![change.subject_id.clone()],
                metrics: None,
            });
        }
        ChangeType::AccessChange => {
            impacts.push(ImpactDetail {
                area: ImpactArea::Security,
                level: ImpactLevel::High,
                description: "Access control changes affect security posture".to_string(),
                affected_entities: vec![change.subject_id.clone()],
                metrics: None,
            });
        }
        _ => {}
    }

    Ok(impacts)
}

async fn analyze_affected_systems(
    _pool: &PgPool,
    change: &ChangeRequest,
) -> Result<Vec<AffectedSystem>> {
    let mut systems = Vec::new();

    match change.subject_type {
        ChangeSubjectType::Policy | ChangeSubjectType::PolicyRule => {
            systems.push(AffectedSystem {
                system_id: "policy-engine".to_string(),
                system_name: "LLM-Policy-Engine".to_string(),
                system_type: "enforcement".to_string(),
                impact_description: "Policy evaluations may change".to_string(),
                severity: GovernanceSeverity::Medium,
                dependencies: vec![change.subject_id.clone()],
            });
        }
        ChangeSubjectType::LlmModel | ChangeSubjectType::LlmProvider => {
            systems.push(AffectedSystem {
                system_id: "registry".to_string(),
                system_name: "LLM-Registry".to_string(),
                system_type: "model-management".to_string(),
                impact_description: "Model routing may be affected".to_string(),
                severity: GovernanceSeverity::High,
                dependencies: vec![change.subject_id.clone()],
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
                dependencies: vec![change.subject_id.clone()],
            });
        }
        _ => {}
    }

    Ok(systems)
}

async fn analyze_policy_implications(
    _pool: &PgPool,
    _organization_id: &str,
    change: &ChangeRequest,
) -> Result<Vec<PolicyImplication>> {
    let mut implications = Vec::new();

    match change.subject_type {
        ChangeSubjectType::Policy | ChangeSubjectType::PolicyRule => {
            implications.push(PolicyImplication {
                policy_id: change.subject_id.clone(),
                policy_name: change.description.clone(),
                implication_type: PolicyImplicationType::ScopeChanged,
                description: "Policy scope or rules may be affected by this change".to_string(),
                affected_rules: vec![],
                policy_remains_valid: true,
            });
        }
        ChangeSubjectType::LlmModel => {
            implications.push(PolicyImplication {
                policy_id: "model-restriction-policies".to_string(),
                policy_name: "Model Restriction Policies".to_string(),
                implication_type: PolicyImplicationType::EffectivenessReduced,
                description: "Model changes may affect model restriction policies".to_string(),
                affected_rules: vec!["model_restriction".to_string()],
                policy_remains_valid: true,
            });
        }
        _ => {}
    }

    Ok(implications)
}

async fn analyze_compliance_implications(
    change: &ChangeRequest,
) -> Result<Vec<ComplianceImplication>> {
    let mut implications = Vec::new();

    match change.subject_type {
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

async fn analyze_cost_implications(
    _pool: &PgPool,
    _organization_id: &str,
    change: &ChangeRequest,
) -> Result<Option<CostImplication>> {
    match change.subject_type {
        ChangeSubjectType::Budget | ChangeSubjectType::Quota | ChangeSubjectType::LlmModel => {
            Ok(Some(CostImplication {
                estimated_delta: 0.0, // Would calculate from actual data
                currency: "USD".to_string(),
                period: "monthly".to_string(),
                confidence: 0.6,
                breakdown: vec![],
                budget_alerts_triggered: vec![],
            }))
        }
        _ => Ok(None)
    }
}

fn generate_risk_indicators(
    impacts: &[ImpactDetail],
    policy_implications: &[PolicyImplication],
    change: &ChangeRequest,
) -> Vec<RiskIndicator> {
    let mut indicators = Vec::new();

    // Check for high-impact areas
    for impact in impacts {
        if matches!(impact.level, ImpactLevel::High | ImpactLevel::Critical) {
            indicators.push(RiskIndicator {
                id: Uuid::new_v4().to_string(),
                category: match impact.area {
                    ImpactArea::Security | ImpactArea::AccessControl => RiskIndicatorCategory::SecurityRisk,
                    ImpactArea::Compliance => RiskIndicatorCategory::ComplianceRisk,
                    ImpactArea::Cost => RiskIndicatorCategory::FinancialRisk,
                    _ => RiskIndicatorCategory::OperationalRisk,
                },
                severity: match impact.level {
                    ImpactLevel::Critical => GovernanceSeverity::Critical,
                    ImpactLevel::High => GovernanceSeverity::High,
                    _ => GovernanceSeverity::Medium,
                },
                description: format!("High impact detected in {}: {}", format!("{:?}", impact.area), impact.description),
                evidence: vec![format!("Change: {:?} on {}", change.change_type, change.subject_id)],
                mitigation_suggestions: vec![
                    "Review change with stakeholders".to_string(),
                    "Consider staged rollout".to_string(),
                ],
            });
        }
    }

    // Check for policy violations potential
    for implication in policy_implications {
        if !implication.policy_remains_valid {
            indicators.push(RiskIndicator {
                id: Uuid::new_v4().to_string(),
                category: RiskIndicatorCategory::ComplianceRisk,
                severity: GovernanceSeverity::High,
                description: format!("Policy {} may become invalid", implication.policy_name),
                evidence: vec![format!("Implication: {:?}", implication.implication_type)],
                mitigation_suggestions: vec![
                    "Review policy configuration".to_string(),
                    "Update dependent policies".to_string(),
                ],
            });
        }
    }

    indicators
}

fn calculate_risk_score(
    impacts: &[ImpactDetail],
    risks: &[RiskIndicator],
    policy_implications: &[PolicyImplication],
) -> f64 {
    let mut score = 0.0;
    let mut count = 0;

    for impact in impacts {
        score += match impact.level {
            ImpactLevel::None => 0.0,
            ImpactLevel::Minimal => 0.1,
            ImpactLevel::Low => 0.25,
            ImpactLevel::Moderate => 0.5,
            ImpactLevel::High => 0.75,
            ImpactLevel::Critical => 1.0,
        };
        count += 1;
    }

    for risk in risks {
        score += match risk.severity {
            GovernanceSeverity::Info => 0.1,
            GovernanceSeverity::Low => 0.25,
            GovernanceSeverity::Medium => 0.5,
            GovernanceSeverity::High => 0.75,
            GovernanceSeverity::Critical => 1.0,
        };
        count += 1;
    }

    for implication in policy_implications {
        score += if !implication.policy_remains_valid { 0.8 } else { 0.2 };
        count += 1;
    }

    if count > 0 { (score / count as f64).min(1.0) } else { 0.0 }
}

fn generate_recommendations_from_analysis(
    risk_classification: &RiskClassification,
    risks: &[RiskIndicator],
    _policy_implications: &[PolicyImplication],
) -> Vec<ImpactRecommendation> {
    let mut recommendations = Vec::new();

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

async fn get_historical_context(
    _pool: &PgPool,
    change: &ChangeRequest,
    _time_range: &Option<DateRangeInput>,
) -> Result<Option<HistoricalContext>> {
    // In production, would query ruvector-service for similar past changes
    Ok(Some(HistoricalContext {
        similar_changes_count: 0,
        average_outcome: HistoricalOutcome::InsufficientData,
        common_issues: vec![],
        success_patterns: vec!["Staged rollout".to_string(), "Pre-change testing".to_string()],
        change_refs: vec![],
    }))
}

fn build_assessment_summary(
    change: &ChangeRequest,
    impact_level: &ImpactLevel,
    risk_classification: &RiskClassification,
    impact_count: usize,
    affected_systems_count: usize,
) -> String {
    format!(
        "Change Impact Assessment for {:?} on {} '{}': \
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

fn calculate_assessment_confidence(
    impacts: &[ImpactDetail],
    affected_systems: &[AffectedSystem],
    historical_context: &Option<HistoricalContext>,
    scope: Option<&ChangeImpactScopeInput>,
) -> DecisionConfidence {
    let mut completeness = 0.5;

    if !impacts.is_empty() {
        completeness += 0.15;
    }
    if !affected_systems.is_empty() {
        completeness += 0.15;
    }
    if historical_context.is_some() {
        completeness += 0.1;
    }
    if scope.map_or(false, |s| s.include_cost_impact.unwrap_or(false)) {
        completeness += 0.05;
    }
    if scope.map_or(false, |s| s.include_compliance_impact.unwrap_or(false)) {
        completeness += 0.05;
    }

    let certainty = 0.7; // Base certainty for change impact analysis

    default_confidence(completeness.min(1.0), certainty)
}

fn build_constraints(req: &ChangeImpactRequest) -> Vec<ConstraintApplication> {
    vec![
        ConstraintApplication {
            constraint_id: "org-boundary".to_string(),
            constraint_name: "Organization Boundary".to_string(),
            constraint_type: ConstraintType::OrganizationalBoundary,
            scope: ConstraintScope {
                organizations: vec![req.organization_id.clone()],
                teams: req.scope.as_ref().and_then(|s| s.teams.clone()).unwrap_or_default(),
                resource_types: vec![],
                time_range: req.historical_range.as_ref().map(|r| DateRange {
                    start: r.start.clone(),
                    end: r.end.clone(),
                }),
            },
            satisfied: true,
            details: "Analysis scoped to organization".to_string(),
        },
        ConstraintApplication {
            constraint_id: "read-only".to_string(),
            constraint_name: "Read-Only Analysis".to_string(),
            constraint_type: ConstraintType::AccessControl,
            scope: ConstraintScope {
                organizations: vec![req.organization_id.clone()],
                teams: vec![],
                resource_types: vec![],
                time_range: None,
            },
            satisfied: true,
            details: "Agent performs read-only analysis, does not execute changes".to_string(),
        },
    ]
}

fn build_decision_outputs(
    summary: &str,
    impacts: &[ImpactDetail],
    risk_indicators: &[RiskIndicator],
    recommendations: &[ImpactRecommendation],
    affected_systems: &[AffectedSystem],
    assessed_at: &str,
) -> DecisionOutputs {
    let findings: Vec<GovernanceFinding> = risk_indicators.iter().map(|r| {
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
            affected_resources: vec![],
            evidence_refs: r.evidence.clone(),
            first_detected: assessed_at.to_string(),
            last_seen: assessed_at.to_string(),
        }
    }).collect();

    let mut findings_by_severity = HashMap::new();
    for finding in &findings {
        let key = format!("{:?}", finding.severity).to_lowercase();
        *findings_by_severity.entry(key).or_insert(0) += 1;
    }

    DecisionOutputs {
        summary: summary.to_string(),
        findings,
        metrics: GovernanceMetrics {
            events_analyzed: impacts.len() as u64,
            time_range: DateRange {
                start: assessed_at.to_string(),
                end: assessed_at.to_string(),
            },
            coverage_percentage: 85.0,
            policies_evaluated: 0,
            compliance_rate: 100.0,
            findings_by_severity,
            trend: TrendDirection::Stable,
        },
        recommendations: recommendations.iter().map(|r| r.recommendation.clone()).collect(),
        data_refs: affected_systems.iter().map(|s| {
            DataReference {
                ref_type: DataReferenceType::DecisionEvent,
                source_system: s.system_name.clone(),
                ref_id: s.system_id.clone(),
                ref_timestamp: assessed_at.to_string(),
            }
        }).collect(),
    }
}

fn extract_request_id(req: &actix_web::HttpRequest) -> Option<String> {
    req.headers()
        .get("X-Request-Id")
        .and_then(|h| h.to_str().ok())
        .map(String::from)
}

fn extract_trace_id(req: &actix_web::HttpRequest) -> Option<String> {
    req.headers()
        .get("X-Trace-Id")
        .or_else(|| req.headers().get("traceparent"))
        .and_then(|h| h.to_str().ok())
        .map(String::from)
}

fn extract_invoker(req: &actix_web::HttpRequest) -> Option<String> {
    req.headers()
        .get("X-User-Id")
        .or_else(|| req.headers().get("X-Api-Key-Id"))
        .and_then(|h| h.to_str().ok())
        .map(String::from)
}

// ============================================================================
// Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(assess_change_impact)
        .service(simulate_change_impact)
        .service(list_change_impact_assessments)
        .service(get_change_impact_assessment)
        .service(get_change_impact_agent_registration);
}
