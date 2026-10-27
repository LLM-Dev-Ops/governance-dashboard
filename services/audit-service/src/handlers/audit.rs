use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::{DateTime, Utc};
use llm_governance_common::{ApiResponse, AppError, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateAuditLogRequest {
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub details: serde_json::Value,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub ip_address: Option<String>,
    pub details: serde_json::Value,
    pub checksum: String,
}

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub user_id: Option<Uuid>,
    pub action: Option<String>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub format: String, // "csv" or "json"
    pub user_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[post("/audit/logs")]
pub async fn create_audit_log(
    pool: web::Data<PgPool>,
    req: web::Json<CreateAuditLogRequest>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id_optional(&http_req);
    let ip_address = extract_ip_address(&http_req);

    // Calculate checksum for integrity
    let checksum = calculate_checksum(
        user_id,
        &req.action,
        &req.resource_type,
        &req.resource_id,
        &req.details,
    );

    let log = sqlx::query_as::<_, AuditLogResponse>(
        r#"
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, details, checksum)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum
        "#,
    )
    .bind(user_id)
    .bind(&req.action)
    .bind(&req.resource_type)
    .bind(&req.resource_id)
    .bind(ip_address)
    .bind(&req.details)
    .bind(&checksum)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(log)))
}

#[get("/audit/logs")]
pub async fn query_audit_logs(
    pool: web::Data<PgPool>,
    query: web::Query<AuditQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(50).min(1000);
    let offset = query.offset.unwrap_or(0);

    // Build dynamic query
    let mut sql = String::from(
        "SELECT id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum FROM audit_logs WHERE 1=1"
    );

    let mut bind_index = 1;

    if let Some(_user_id) = query.user_id {
  ÙÜÂˆÒT‘HYH	BˆˆËˆ
Bˆ˜š[™
Ù×ÚY˜\×Ü™YŠ
JBˆ™™]ÚÛÜ[Û˜[
ÛÛ™Ù]Ü™YŠ
JBˆ˜]ØZ]Âˆ›Ú×ÛÜ—Ù[ÙJ\\œ›Ü“›İ›İ[™
]Y]ÙÈ›İ›İ[™‹×Üİš[™Ê
JJOÎÂ‚ˆËÈ™XØ[İ[]HÚXÚÜİ[Bˆ]Ø[İ[]YØÚXÚÜİ[HHØ[İ[]WØÚXÚÜİ[JˆÙË\Ù\—ÚYˆ	›ÙË˜Xİ[Û‹ˆ	›ÙËœ™\Ûİ\˜ÙWİ\Kˆ	›ÙËœ™\Ûİ\˜ÙWÚYˆ	›ÙË™]Z[Ëˆ
NÂ‚ˆ]\×İ˜[YHØ[İ[]YØÚXÚÜİ[HOHÙË˜ÚXÚÜİ[NÂ‚ˆÚÊˆ™\ÜÛœÙN“ÚÊ
KšœÛÛŠ\T™\ÜÛœÙNœİXØÙ\ÜÊÙ\™WÚœÛÛšœÛÛˆJÂˆ›Ù×ÚYˆÙËšYˆš\×İ˜[Yˆ\×İ˜[YˆœİÜ™YØÚXÚÜİ[HˆÙË˜ÚXÚÜİ[Kˆ˜Ø[İ[]YØÚXÚÜİ[HˆØ[İ[]YØÚXÚÜİ[BˆJJJKˆ
BŸB‚ˆÖÜÜİ
‹Ø]Y]Ù^ÜŠWBœXˆ\Ş[˜È›ˆ^ÜØ]Y]ÛÙÜÊˆÛÛˆÙX‘]OÔÛÛ‹ˆ™\NˆÙX’œÛÛ^Ü™\]Y\İ‹ŠHOˆ™\İ[[\™\ÜÛ™\ˆÂˆËÈZ[]Y\Bˆ]]]Ü[Hİš[™Î™œ›ÛJˆ”ÑSPÕY[Y\İ[\\Ù\—ÚYXİ[Û‹™\Ûİ\˜ÙWİ\K™\Ûİ\˜ÙWÚY\ØY™\ÜË]Z[ËÚXÚÜİ[H”“ÓH]Y]ÛÙÜÈÒT‘HOLH‚ˆ
NÂ‚ˆYˆ™\K\Ù\—ÚYš\×ÜÛÛYJ
HÂˆÜ[œ\ÚÜİŠˆS‘\Ù\—ÚYH	HŠNÂˆBˆYˆ™\Kœİ\Ù]Kš\×ÜÛÛYJ
HÂˆÜ[œ\ÚÜİŠˆS‘[Y\İ[\H	ˆŠNÂˆBˆYˆ™\K™[™Ù]Kš\×ÜÛÛYJ
HÂˆÜ[œ\ÚÜİŠˆS‘[Y\İ[\H	ÈŠNÂˆB‚ˆÜ[œ\ÚÜİŠˆÔ‘Tˆ–H[Y\İ[\TĞÈSRULŠNÂ‚ˆ]]]]Y\WØZ[\ˆHÜ[œ]Y\WØ\ÎË]Y]ÙÔ™\ÜÛœÙOŠ	œÜ[
NÂ‚ˆYˆ]ÛÛYJ\Ù\—ÚY
HH™\K\Ù\—ÚYÂˆ]Y\WØZ[\ˆH]Y\WØZ[\‹˜š[™
\Ù\—ÚY
NÂˆBˆYˆ]ÛÛYJ™Yˆİ\Ù]JHH™\Kœİ\Ù]HÂˆ]Y\WØZ[\ˆH]Y\WØZ[\‹˜š[™
İ\Ù]JNÂˆBˆYˆ]ÛÛYJ™Yˆ[™Ù]JHH™\K™[™Ù]HÂˆ]Y\WØZ[\ˆH]Y\WØZ[\‹˜š[™
[™Ù]JNÂˆB‚ˆ]ÙÜÈH]Y\WØZ[\‹™™]ÚØ[
ÛÛ™Ù]Ü™YŠ
JK˜]ØZ]ÎÂ‚ˆX]Ú™\K™›Ü›X]˜\×ÜİŠ
HÂˆ˜ÜİˆˆOˆÂˆ]ÜİˆHÙ[™\˜]WØÜİŠ	›ÙÜÊOÎÂˆÚÊ™\ÜÛœÙN“ÚÊ
Bˆ˜ÛÛ[İ\J^ØÜİˆŠBˆš[œÙ\ÚXY\Š
ÛÛ[Q\ÜÜÚ][Ûˆ‹˜]XÚY[Èš[[˜[YOX]Y]ÛÙÜË˜ÜİˆŠJBˆ˜›ÙJÜİŠJBˆBˆšœÛÛˆˆOˆÚÊ™\ÜÛœÙN“ÚÊ
Bˆ˜ÛÛ[İ\J˜\XØ][Û‹ÚœÛÛˆŠBˆš[œÙ\ÚXY\Š
ˆÛÛ[Q\ÜÜÚ][Ûˆ‹ˆ˜]XÚY[Èš[[˜[YOX]Y]ÛÙÜËšœÛÛˆ‹ˆ
JBˆšœÛÛŠÙÜÊJKˆÈOˆ\œŠ\\œ›Ü•˜[Y][ÛŠˆ’[˜[Y^Ü›Ü›X]ˆ\ÙH	ØÜİ‰ÈÜˆ	ÚœÛÛ‰È‹×Üİš[™Ê
Kˆ
JKˆBŸB‚ˆÖÙÙ]
‹Ø]Y]Ü™\ÜËØÛÛ\X[˜ÙHŠWBœXˆ\Ş[˜È›ˆÙ[™\˜]WØÛÛ\X[˜ÙWÜ™\Ü
ˆÛÛˆÙX‘]OÔÛÛ‹ˆ]Y\NˆÙX”]Y\OÛÛ\X[˜ÙT]Y\O‹ŠHOˆ™\İ[[\™\ÜÛ™\ˆÂˆ]İ\Ù]HH]Y\Kœİ\Ù]K˜ÛÛ™J
K[Ü˜\ÛÜ—Ù[ÙJÂˆÚ›Û›Î•]Î››İÊ
Bˆ˜ÚXÚÙYÜİX—ÜÚYÛ™Y
Ú›Û›Î‘\˜][Û™^\ÊÌ
JBˆ[Ü˜\

Bˆ×Ü™˜ÌÌÌÎJ
BˆJNÂ‚ˆ][™Ù]HH]Y\Bˆ™[™ÙR’“°¢Ğ ¢ö²†77b§Ğ §V"fâ6öæf–wW&R†6fs¢f×WBvV#£¥6W'f–6T6öæf–r’°¢6frç6W'f–6R†7&VFUöVF—EöÆör¢ç6W'f–6R‡VW'•öVF—EöÆöw2¢ç6W'f–6R†vWEöVF—EöÆör¢ç6W'f–6R‡fW&–g•öVF—EöÆör¢ç6W'f–6R†W‡÷'EöVF—EöÆöw2¢ç6W'f–6R†vVæW&FUö6ö×Æ–æ6U÷&W÷'B“°§Ğ