//! Governance Audit Agent Handler
//!
//! This module implements the Governance Audit Agent endpoints for
//! generating authoritative audit summaries across workflows, incidents,
//! approvals, and decisions.
//!
//! # Classification
//!
//! - GOVERNANCE / AUDIT / OVERSIGHT
//!
//! # Constraints (from Prompt 0 - Constitution)
//!
//! - This agent operates OUTSIDE the critical execution path
//! - This agent does NOT intercept runtime traffic
//! - This agent does NOT execute workflows
//! - This agent does NOT enforce policies
//! - This agent does NOT optimize configurations
//! - This agent does NOT perform anomaly detection
//! - ALL persistence occurs via ruvector-service client calls ONLY
//!
//! # Capabilities
//!
//! - Aggregate DecisionEvents across systems
//! - Analyze policy adherence and approval trails
//! - Generate audit summaries and governance views
//! - Surface change history and impact visibility
//! - Provide oversight signals and dashboards

use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use tracing::{info, instrument, span, Level};
use uuid::Uuid;

use llm_governance_common::adapters::ruvector::{
    create_decision_event, default_confidence, execution_ref_from_request, ConstraintApplication,
    ConstraintScope, ConstraintType, DataReference, DataReferenceType, DateRange,
    DecisionConfidence, DecisionOutputs, FindingCategory, GovernanceDecisionType,
    GovernanceFinding, GovernanceMetrics, GovernanceSeverity, InvocationSource, TrendDirection,
};
use llm_governance_common::{ApiResponse, AppError, Result};

// ============================================================================
// Agent Constants
// ============================================================================

const AGENT_ID: &str = "governance-audit-agent";
const AGENT_VERSION: &str = "1.0.0";

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to generate governance audit
#[derive(Debug, Deserialize, Serialize)]
pub struct GovernanceAuditRequest {
    /// Organization ID to audit
    pub organization_id: String,
    /// Type of audit to perform
    pub audit_type: String, // Maps to GovernanceDecisionType
    /// Start of time range (ISO 8601)
    pub from: String,
    /// End of time range (ISO 8601)
    pub to: String,
    /// Optional scope constraints
    pub scope: Option<AuditScopeRequest>,
    /// Include detailed findings
    #[serde(default)]
    pub include_details: bool,
    /// Comparison baseline reference
    pub baseline_ref: Option<String>,
}

/// Scope constraints for audit
#[derive(Debug, Deserialize, Serialize)]
pub struct AuditScopeRequest {
    pub teams: Option<Vec<String>>,
    pub users: Option<Vg—P¢ÆWBFV6—6–öå÷G—RÒ'6UöFV6—6–öå÷G—R‚g&WæVF—E÷G—R“ó° ¢òòW‡G&7BW†V7WF–öâ6öçFW‡@¢ÆWB&WVW7Eö–BÒW‡G&7E÷&WVW7Eö–B‚f‡GG÷&W“°¢ÆWBG&6Uö–BÒW‡G&7E÷G&6Uö–B‚f‡GG÷&W“°¢ÆWB–çfö¶W"ÒW‡G&7Eö–çfö¶W"‚f‡GG÷&W“° ¢òò7FW¢vw&VvFRFFg&öÒ–çFW&æÂVF—BÆöw2‡&VBÖöæÇ’¢ÆWBVF—EöFFÒvw&VvFUöVF—EöFF€¢ööÂævWE÷&Vb‚’À¢g&Wæ÷&væ—¦F–öåö–BÀ¢g&Wæg&öÒÀ¢g&WçFòÀ¢&Wç66÷Ræ5÷&Vb‚’À¢¢æv—Có° ¢òò7FW#¢æÇ—¦RöÆ–7’F†W&Væ6P¢ÆWBöÆ–7•öæÇ—6—2Ð¢æÇ—¦U÷öÆ–7•öF†W&Væ6R‡ööÂævWE÷&Vb‚’Âg&Wæ÷&væ—¦F–öåö–BÂg&Wæg&öÒÂg&WçFò’æv—Có° ¢òò7FW3¢vVæW&FRf–æF–æw0¢ÆWBf–æF–æw2ÒvVæW&FUöf–æF–æw2‚fVF—EöFFÂgöÆ–7•öæÇ—6—2Â&Wæ–æ6ÇVFUöFWF–Ç2“° ¢òò7FWC¢6Æ7VÆFRÖWG&–70¢ÆWBÖWG&–72Ð¢6Æ7VÆFUöv÷fW&ææ6UöÖWG&–72‚fVF—EöFFÂgöÆ–7•öæÇ—6—2Âff–æF–æw2Âg&Wæg&öÒÂg&WçFò“° ¢òò7FWS¢6Æ7VÆFR6öæf–FVæ6P¢ÆWB6öæf–FVæ6RÒ6Æ7VÆFUö6öæf–FVæ6R‚fVF—EöFFÂgöÆ–7•öæÇ—6—2“° ¢òò7FWc¢vVæW&FR&V6öÖÖVæFF–öç2‡&VBÖöæÇ’Â–æf÷&ÖF–öæÂ¢ÆWB&V6öÖÖVæFF–öç2ÒvVæW&FU÷&V6öÖÖVæFF–öç2‚ff–æF–æw2ÂfÖWG&–72“° ¢òò7FWs¢'V–ÆB6öç7G&–çG2Æ–VB&V6÷&@¢ÆWB6öç7G&–çG5öÆ–VBÒ'V–ÆEö6öç7G&–çG5÷&V6÷&B‚g&W“° ¢òò7FWƒ¢7&VFRW†V7WF–öâ&VfW&Væ6P¢ÆWBW†V7WF–öå÷&VbÒW†V7WF–öå÷&Veög&öÕ÷&WVW7B€¢&WVW7Eö–Bæ5öFW&Vb‚’À¢G&6Uö–Bæ5öFW&Vb‚’À¢–çfö¶W"æ5öFW&Vb‚’À¢–çfö6F–öå6÷W&6S£¤’À¢“° ¢òò7FW“¢'V–ÆB÷WGWG0¢ÆWB÷WGWG2ÒFV6—6–öä÷WGWG2°¢7VÖÖ'“¢vVæW&FU÷7VÖÖ'’‚fÖWG&–72Âff–æF–æw2’À¢f–æF–æw3¢f–æF–æw2æ6ÆöæR‚’À¢ÖWG&–73¢ÖWG&–72æ6ÆöæR‚’À¢&V6öÖÖVæFF–öç3¢&V6öÖÖVæFF–öç2æ6ÆöæR‚’À¢FF÷&Vg3¢'V–ÆEöFF÷&VfW&Væ6W2‚fVF—EöFF’À¢Ó° ¢òò7FW¢7&VFRF†RFV6—6–öäWfVç@¢ÆWBFV6—6–öåöWfVçBÒ7&VFUöFV6—6–öåöWfVçB€¢tTåEô”BÀ¢tTåEõdU%4”ôâÀ¢FV6—6–öå÷G—RÀ¢g&Wæ÷&væ—¦F–öåö–BÀ¢÷WGWG2À¢6öæf–FVæ6Ræ6ÆöæR‚’À¢6öç7G&–çG5öÆ–VBÀ¢W†V7WF–öå÷&VbÀ¢g&WãÂòòW6R&WVW7B2–çWG2f÷"†6€¢“° ¢òò7FW¢W'6—7BFò'WfV7F÷"×6W'f–6R†7–æ2ÂæöâÖ&Æö6¶–ær¢òòäõDS¢–â&öGV7F–öâÂF†—2v÷VÆBW6RF†R7GVÂ'WfV7F÷"×6W'f–6R6Æ–Vç@¢òòf÷"æ÷rÂvRW'6—7BÆö6ÆÇ’FòÖ–çF–âF†RGFW&à¢ÆWBWfVçEö–BÒFV6—6–öåöWfVçBæ–Bæ6ÆöæR‚“°¢ÆWBF–ÖW7F×ÒFV6—6–öåöWfVçBçF–ÖW7F×æ6ÆöæR‚“° ¢òòVÖ—BFVÆVÖWG'’&VfW&Væ6R†–â&öGV7F–öâÂv÷VÆB6ÆÂÄÄÒÔö'6W'fF÷'’¢ÆWBFVÆVÖWG'•÷&VbÒf÷&ÖB‚'FVÆVÖWG'“§·Ó§·Ò"ÂtTåEô”BÂWfVçEö–B“° ¢òòvVæW&FR'F–f7B&VfW&Væ6P¢ÆWB'F–f7E÷&VbÒf÷&ÖB‚&'F–f7C¦VF—C§·Ó§·Ò"Â&Wæ÷&væ—¦F–öåö–BÂWfVçEö–B“° ¢–æfò€¢$v÷fW&ææ6RVF—B6ö×ÆWFVC¢WfVçEö–C×·ÒÂf–æF–æw3×·Ò"À¢WfVçEö–BÀ¢f–æF–æw2æÆVâ‚¢“° ¢òò7FW#¢'V–ÆB&W7öç6P¢ÆWB&W7öç6RÒv÷fW&ææ6TVF—E&W7öç6R°¢e_json::Value)>(
        r#"
        SELECT id, timestamp, action, details
        FROM audit_logs
        WHERE resource_type = 'governance_audit'
        AND details->>'organization_id' = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&query.organization_id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(
        HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "audits": audits.iter().map(|(id, ts, action, details)| {
                serde_json::json!({
                    "id": id,
                    "timestamp": ts,
                    "action": action,
                    "details": details
                })
            }).collect::<Vec<_>>(),
            "limit": limit,
            "offset": offset
        }))),
    )
}

/// Inspect a specific governance audit
///
/// GET /api/v1/governance/audit/{audit_id}
#[get("/governance/audit/{audit_id}")]
#[instrument(skip(pool), fields(audit_id))]
pub async fn get_governance_audit(
    pool: web::Data<PgPool>,
    audit_id: web::Path<String>,
) -> Result<impl Responder> {
    // In production, this would query ruvector-service
    let audit = sqlx::query_as::<_, (Uuid, DateTime<Utc>, String, serde_json::Value)>(
        r#"
        SELECT id, timestamp, action, details
        FROM audit_logs
        WHERE resource_type = 'governance_audit'
        AND (id::text = $1 OR details->>'event_id' = $1)
        "#,
    )
    .bind(audit_id.as_str())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Governance audit not found".to_string()))?;

    Ok(
        HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "id": audit.0,
            "timestamp": audit.1,
            "action": audit.2,
            "details": audit.3
        }))),
    )
}

/// Summarize current governance state
///
/// GET /api/v1/governance/summary
#[get("/governance/summary")]
#[instrument(skip(pool), fields(organization_id))]
pub async fn summarize_governance(
    pool: web::Data<PgPool>,
    query: web::Query<SummarizeRequest>,
) -> Result<impl Responder> {
    let period_days = query.period_days.unwrap_or(30);
    let from = chrono::Utc::now()
        .checked_sub_signed(chrono::Duration::days(period_days as i64))
        .unwrap()
        .to_rfc3339();
    let to = chrono::Utc::now().to_rfc3339();

    // Aggregate summary data
    let total_actions: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM audit_logs WHERE timestamp >= $1 AND timestamp <= $2")
            .bind(&from)
            .bind(&to)
            .fetch_one(pool.get_ref())
            .await?;

    let unique_users: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE timestamp >= $1 AND timestamp <= $2",
    )
    .bind(&from)
    .bind(&to)
    .fetch_one(pool.get_ref())
    .await?;

 "À¢&v÷fW&ææ6U÷6æ6†÷B"Óâö²„v÷fW&ææ6TFV6—6–öåG—S£¤v÷fW&ææ6U6æ6†÷B’À¢'öÆ–7•öF†W&Væ6R"Óâö²„v÷fW&ææ6TFV6—6–öåG—S£¥öÆ–7”F†W&Væ6R’À¢&&÷fÅ÷G&–Â"Óâö²„v÷fW&ææ6TFV6—6–öåG—S£¤&÷fÅG&–Â’À¢&6†ævUö–×7B"Óâö²„v÷fW&ææ6TFV6—6–öåG—S£¤6†ævT–×7B’À¢'&—6µövw&VvF–öâ"Óâö²„v÷fW&ææ6TFV6—6–öåG—S£¥&—6´vw&VvF–öâ’À¢òÓâW'"„W'&÷#£¥fÆ–FF–öâ†f÷&ÖB€¢$–çfÆ–BVF—BG—S¢·ÒâfÆ–BG—W3¢VF—E÷7VÖÖ'’Â6ö×Æ–æ6U÷7FGW2Âv÷fW&ææ6U÷6æ6†÷BÂöÆ–7•öF†W&Væ6RÂ&÷fÅ÷G&–ÂÂ6†ævUö–×7BÂ&—6µövw&VvF–öâ"À¢VF—E÷G—P¢’’¢Ð§Ð ¢òòò–çFW&æÂ&W&W6VçFF–öâöbvw&VvFVBVF—BFF§7G'V7BVF—DFFvw&VvFR°¢F÷FÅöWfVçG3¢ScBÀ¢F–ÖU÷&ævUö6÷fW&vS¢ccBÀ§Ð ¦7–æ2fâvw&VvFUöVF—EöFF€¢ööÃ¢euööÂÀ¢ö÷&væ—¦F–öåö–C¢g7G"À¢g&öÓ¢g7G"À¢Fó¢g7G"À¢÷66÷S¢÷F–öãÂdVF—E66÷U&WVW7CâÀ¢’Óâ&W7VÇCÄVF—DFFvw&VvFSâ°¢òòvWBF÷FÂWfVçG26÷Vç@¢ÆWBF÷FÃ¢†“cBÂ’Ð¢7Çƒ£§VW'•ö2‚%4TÄT5B4õTåB‚¢’e$ôÒVF—EöÆöw2t„U$RF–ÖW7F×ãÒCäBF–ÖW7F×ÃÒC""¢æ&–æB†g&öÒ¢æ&–æB‡Fò¢æfWF6…ööæR‡ööÂ¢æv—Có° ¢ö²„VF—DFFvw&VvFR°¢F÷FÅöWfVçG3¢F÷FÂã2ScBÀ¢F–ÖU÷&ævUö6÷fW&vS¢ãÂòò77VÖRgVÆÂ6÷fW&vRf÷"&WVW7FVB&ævP¢Ò§Ð §7G'V7BöÆ–7”æÇ—6—2°¢öÆ–6–W5öWfÇVFVC¢S3"À¢f–öÆF–öç5öf÷VæC¢S3"À¢6ö×Æ–æ6U÷&FS¢ccBÀ¢†–v…÷6WfW&—G•÷f–öÆF–öç3¢S3"À§Ð ¦7–æ2fâæÇ—¦U÷öÆ–7•öF†W&Væ6R€¢ööÃ¢euööÂÀ¢ö÷&væ—¦F–öåö–C¢g7G"À¢g&öÓ¢g7G"À¢Fó¢g7G"À¢’Óâ&W7VÇCÅöÆ–7”æÇ—6—3â°¢òò6÷VçBöÆ–7’×&VÆFVBVF—BWfVçG0¢ÆWBöÆ–7•öWfVçG3¢†“cBÂ’Ò7Çƒ£§VW'•ö2€¢%4TÄT5B4õTåB‚¢’e$ôÒVF—EöÆöw2t„U$R&W6÷W&6U÷G—RÒwöÆ–7’räBF–ÖW7F×ãÒCäBF–ÖW7F×ÃÒC" ¢¢æ&–æB†g&öÒ¢æ&–æB‡Fò¢æfWF6…ööæR‡ööÂ¢æv—@¢çVçw&ö÷"‚ƒÂ’“° ¢òò6÷VçBf–öÆF–öç2†WfVçG2v—F‚7F–öâ6öçF–æ–ærwf–öÆF–öâr÷"w&V¦V7Br¢ÆWBf–öÆF–öç3¢†“cBÂ’Ò7Çƒ£§VW'•ö2€¢%4TÄT5B4õTåB‚¢’e$ôÒVF—EöÆöw2t„U$R†7F–öâÄ”´RrWf–öÆF–öâRrõ"7F–öâÄ”´RrW&V¦V7BRr’äBF–ÖW7F×ãÒCäBF–ÖW7F×ÃÒC" ¢¢æ&–æB†g&öÒ¢æ&–æB‡Fò¢æfWF6…ööæR‡ööÂ¢æv—@¢çVçw&ö÷"‚ƒÂ’“° ¢ÆWBF÷FÂÒöÆ–7•öWfVçG2ãæÖ‚ƒ’2ccC°¢ÆWB6ö×Æ–æ6U÷&FRÒ‚‡F÷FÂÒf–öÆF–öç2ã2ccB’òF÷FÂ¢ã’æ6Æ×ƒãÂã“° ¢ö²…öÆ–7”æÇ—6—2°¢öÆ–6–W5öWfÇVFVC¢öÆ–7•öWfVçG2ã2S3"À¢f–öÆF–öç5öf÷VæC¢f–öÆF–öç2ã2S3"À¢6ö×Æ–æ6U÷&FRÀ¢†–v…÷6WfW&—G•÷f–öÆF–öç3¢‡f–öÆF–öç2ãò2’2S3"ÂòòW7F–ÖFRãó2&R†–v‚6WfW&—G¢Ò§Ð ¦fâvVæW&FUöf–æF–æw2€¢VF—EöFF¢dVF—DFFvw&VvFRÀ¢öÆ–7•öæÇ—6—3¢eöÆ–7”æÇ—6—2À¢ö–æ6ÇVFUöFWF–Ç3¢&ööÂÀ¢’ÓâfV3Äv÷fW&ææ6Tf–æF–æsâ°¢ÆWB×WBf–æF–æw2ÒfV3£¦æWr‚“°¢ÆWBæ÷rÒ6‡&öæó£¥WF3£¦æ÷r‚’çFõ÷&f3333’‚“° ¢òòvVæW&on::to_string(&finding.severity)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string();
        *findings_by_severity.entry(severity_key).or_insert(0) += 1;
    }

    GovernanceMetrics {
        events_analyzed: audit_data.total_events,
        time_range: DateRange {
            start: from.to_string(),
            end: to.to_string(),
        },
        coverage_percentage: audit_data.time_range_coverage * 100.0,
        policies_evaluated: policy_analysis.policies_evaluated,
        compliance_rate: policy_analysis.compliance_rate,
        findings_by_severity,
        trend: determine_trend(
            policy_analysis.compliance_rate,
            policy_analysis.violations_found,
        ),
    }
}

fn determine_trend(compliance_rate: f64, violations: u32) -> TrendDirection {
    if compliance_rate >= 98.0 && violations < 5 {
        TrendDirection::Improving
    } else if compliance_rate >= 90.0 && violations < 20 {
        TrendDirection::Stable
    } else if compliance_rate < 80.0 || violations > 50 {
        TrendDirection::Degrading
    } else {
        TrendDirection::Unknown
    }
}

fn calculate_confidence(
    audit_data: &AuditDataAggregate,
    _policy_analysis: &PolicyAnalysis,
) -> DecisionConfidence {
    let completeness = audit_data.time_range_coverage;
    let certainty = if audit_data.total_events > 100 {
        0.9
    } else if audit_data.total_events > 10 {
        0.7
    } else {
        0.5
    };

    default_confidence(completeness, certainty)
}

fn generate_recommendations(
    findings: &[GovernanceFinding],
    metrics: &GovernanceMetrics,
) -> Vec<String> {
    let mut recommendations = Vec::new();

    // Based on compliance rate
    if metrics.compliance_rate < 95.0 {
        recommendations.push(format!(
            "Review and address policy violations to improve compliance rate from {:.1}% to target 95%",
            metrics.compliance_rate
        ));
    }

    // Based on findings
    let high_severity_count = findings
        .iter()
        .filter(|f| {
            matches!(
                f.severity,
                GovernanceSeverity::High | GovernanceSeverity::Critical
            )
        })
        .count();

    if high_severity_count > 0 {
        recommendations.push(format!(
            "Prioritize remediation of {} high/critical severity findings",
            high_severity_count
        ));
    }

    // Based on coverage
    if metrics.coverage_percentage < 100.0 {
        recommendations.push(
            "Investigate gaps in audit coverage and ensure all systems emit audit events"
                .to_string(),
        );
    }

    if recommendations.is_empty() {
        recommendations.push(
            "Governance posture is healthy. Continue monitoring and periodic audits.".to_string(),
        );
    }

    recommendations
}

fn build_constraints_record(req: &GovernanceAuditRequest) -> Vec<B6ö×Æ–æ6R&FS¢³¢ãÒRâ6÷fW&vS¢³¢ãÒRâ·Ò"À¢ÖWG&–72æWfVçG5öæÇ—¦VBÀ¢ÖWG&–72çöÆ–6–W5öWfÇVFVBÀ¢ÖWG&–72æ6ö×Æ–æ6U÷&FRÀ¢ÖWG&–72æ6÷fW&vU÷W&6VçFvRÀ¢6WfW&—G•÷7VÖÖ'¢§Ð ¦fâFWFW&Ö–æUöv÷fW&ææ6U÷7FGW2‡F÷FÅöWfVçG3¢“cBÂVæ—VU÷W6W'3¢“cB’Óâbw7FF–27G"°¢–bF÷FÅöWfVçG2âbbVæ—VU÷W6W'2âR°¢&†VÇF‡’ ¢ÒVÇ6R–bF÷FÅöWfVçG2â°¢&ÖöFW&FR ¢ÒVÇ6R°¢&Æ–Ö—FVB ¢Ð§Ð ¦fâW‡G&7E÷&WVW7Eö–B‡&W¢f7F—…÷vV#£¤‡GG&WVW7B’Óâ÷F–öãÅ7G&–æsâ°¢&Wæ†VFW'2‚¢ævWB‚%‚Õ&WVW7BÔ–B"¢ææE÷F†Vâ‡Æ‡Â‚çFõ÷7G"‚’æö²‚’¢æÖ…7G&–æs£¦g&öÒ§Ð ¦fâW‡G&7E÷G&6Uö–B‡&W¢f7F—…÷vV#£¤‡GG&WVW7B’Óâ÷F–öãÅ7G&–æsâ°¢&Wæ†VFW'2‚¢ævWB‚%‚ÕG&6RÔ–B"¢æ÷%öVÇ6R‡ÇÂ&Wæ†VFW'2‚’ævWB‚'G&6W&VçB"’¢ææE÷F†Vâ‡Æ‡Â‚çFõ÷7G"‚’æö²‚’¢æÖ…7G&–æs£¦g&öÒ§Ð ¦fâW‡G&7Eö–çfö¶W"‡&W¢f7F—…÷vV#£¤‡GG&WVW7B’Óâ÷F–öãÅ7G&–æsâ°¢&Wæ†VFW'2‚¢ævWB‚%‚ÕW6W"Ô–B"¢æ÷%öVÇ6R‡ÇÂ&Wæ†VFW'2‚’ævWB‚%‚Ô’Ô¶W’Ô–B"’¢ææE÷F†Vâ‡Æ‡Â‚çFõ÷7G"‚’æö²‚’¢æÖ…7G&–æs£¦g&öÒ§Ð ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢òò6öæf–wW&F–öà¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ §V"fâ6öæf–wW&R†6fs¢f×WBvV#£¥6W'f–6T6öæf–r’°¢6frç6W'f–6R†vVæW&FUöv÷fW&ææ6UöVF—B¢ç6W'f–6R†Æ—7Eöv÷fW&ææ6UöVF—G2¢ç6W'f–6R†vWEöv÷fW&ææ6UöVF—B¢ç6W'f–6R‡7VÖÖ&—¦Uöv÷fW&ææ6R¢ç6W'f–6R†vWEövVçE÷&Vv—7G&F–öâ“°§Ð 