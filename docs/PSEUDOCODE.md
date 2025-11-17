# LLM Governance Dashboard - Pseudocode Specification

## SPARC Framework - Pseudocode Phase

This document provides high-level algorithmic descriptions and pseudocode for the core components of the LLM Governance Dashboard system.

---

## 1. Data Aggregation Algorithms

### 1.1 Multi-Source Data Aggregation Pipeline

```pseudocode
ALGORITHM: AggregateGovernanceData
INPUT: sourceConfigs (list of data source configurations)
OUTPUT: aggregatedData (unified governance dataset)

FUNCTION AggregateGovernanceData(sourceConfigs):
    aggregatedData = empty dictionary
    errors = empty list

    // Initialize parallel workers for each data source
    workers = CreateWorkerPool(size = NUMBER_OF_SOURCES)

    FOR EACH source IN sourceConfigs:
        // Submit async task to worker pool
        task = workers.Submit(FetchSourceData, source)
        tasks.Add(task)
    END FOR

    // Wait for all tasks with timeout
    results = workers.WaitAll(tasks, timeout = 30_seconds)

    FOR EACH result IN results:
        IF result.IsSuccess():
            // Normalize data to common schema
            normalizedData = NormalizeDataSchema(result.data, result.sourceType)

            // Merge with existing data using conflict resolution
            aggregatedData = MergeData(aggregatedData, normalizedData,
                                      strategy = LATEST_TIMESTAMP_WINS)
        ELSE:
            errors.Add(result.error)
            LogError("Data source fetch failed", result.error)
        END IF
    END FOR

    // Apply data quality checks
    aggregatedData = ApplyQualityChecks(aggregatedData)

    // Cache aggregated results
    CacheManager.Set("governance_data", aggregatedData, ttl = 5_minutes)

    RETURN aggregatedData, errors
END FUNCTION


FUNCTION FetchSourceData(sourceConfig):
    TRY:
        // Establish connection with retry logic
        connection = ConnectWithRetry(
            url = sourceConfig.endpoint,
            auth = sourceConfig.credentials,
            maxRetries = 3,
            backoff = EXPONENTIAL
        )

        // Fetch data based on source type
        SWITCH sourceConfig.type:
            CASE "Observatory":
                data = FetchObservatoryMetrics(connection, sourceConfig.query)
            CASE "CostOps":
                data = FetchCostData(connection, sourceConfig.dateRange)
            CASE "PolicyEngine":
                data = FetchPolicyViolations(connection)
            CASE "Registry":
                data = FetchModelRegistry(connection)
            DEFAULT:
                THROW InvalidSourceTypeError
        END SWITCH

        RETURN Success(data, sourceConfig.type)

    CATCH ConnectionError AS e:
        RETURN Failure(e, "CONNECTION_FAILED")
    CATCH TimeoutError AS e:
        RETURN Failure(e, "TIMEOUT")
    CATCH AuthenticationError AS e:
        RETURN Failure(e, "AUTH_FAILED")
    END TRY
END FUNCTION


FUNCTION NormalizeDataSchema(rawData, sourceType):
    // Transform source-specific schema to unified schema
    normalizedData = empty dictionary

    schema = GetSchemaDefinition(sourceType)

    FOR EACH field IN schema.fields:
        sourceField = field.sourceMapping

        IF rawData.HasField(sourceField):
            value = rawData.Get(sourceField)

            // Apply type conversion
            convertedValue = ConvertType(value, field.targetType)

            // Apply validation rules
            IF ValidateField(convertedValue, field.rules):
                normalizedData[field.name] = convertedValue
            ELSE:
                LogWarning("Field validation failed", field.name, value)
            END IF
        END IF
    END FOR

    // Add metadata
    normalizedData["_source"] = sourceType
    normalizedData["_timestamp"] = CurrentTimestamp()
    normalizedData["_version"] = schema.version

    RETURN normalizedData
END FUNCTION


FUNCTION MergeData(existingData, newData, strategy):
    mergedData = Copy(existingData)

    FOR EACH key, value IN newData:
        IF NOT mergedData.Contains(key):
            // New key, simply add
            mergedData[key] = value
        ELSE:
            // Conflict resolution based on strategy
            SWITCH strategy:
                CASE LATEST_TIMESTAMP_WINS:
                    IF value._timestamp > mergedData[key]._timestamp:
                        mergedData[key] = value
                    END IF

                CASE MERGE_ARRAYS:
                    IF IsArray(value):
                        mergedData[key] = Concatenate(mergedData[key], value)
                        mergedData[key] = RemoveDuplicates(mergedData[key])
                    END IF

                CASE AGGREGATE_NUMERIC:
                    IF IsNumeric(value):
                        mergedData[key] = Sum(mergedData[key], value)
                    END IF

                CASE SOURCE_PRIORITY:
                    // Check source priority configuration
                    IF GetSourcePriority(value._source) >
                       GetSourcePriority(mergedData[key]._source):
                        mergedData[key] = value
                    END IF
            END SWITCH
        END IF
    END FOR

    RETURN mergedData
END FUNCTION
```

### 1.2 Observatory Metrics Aggregation

```pseudocode
ALGORITHM: AggregateObservatoryMetrics
INPUT: timeRange (start and end timestamps), filters (optional query filters)
OUTPUT: aggregatedMetrics (time-series metrics data)

FUNCTION AggregateObservatoryMetrics(timeRange, filters):
    // Define metric types to collect
    metricTypes = [
        "request_latency",
        "token_usage",
        "error_rate",
        "model_performance",
        "cost_per_request"
    ]

    aggregatedMetrics = empty dictionary

    FOR EACH metricType IN metricTypes:
        // Fetch raw metric data
        rawMetrics = ObservatoryClient.Query(
            metric = metricType,
            start = timeRange.start,
            end = timeRange.end,
            filters = filters
        )

        // Perform time-series aggregation
        aggregated = AggregateTimeSeries(
            data = rawMetrics,
            interval = DetermineInterval(timeRange),
            aggregations = ["mean", "p50", "p95", "p99", "max"]
        )

        aggregatedMetrics[metricType] = aggregated
    END FOR

    // Cross-metric analysis
    aggregatedMetrics["derived_metrics"] = CalculateDerivedMetrics(aggregatedMetrics)

    RETURN aggregatedMetrics
END FUNCTION


FUNCTION AggregateTimeSeries(data, interval, aggregations):
    // Group data points by time buckets
    timeBuckets = GroupByTime(data, interval)

    result = empty list

    FOR EACH bucket IN timeBuckets:
        bucketStats = empty dictionary
        bucketStats["timestamp"] = bucket.startTime
        bucketStats["count"] = bucket.dataPoints.length

        FOR EACH aggType IN aggregations:
            SWITCH aggType:
                CASE "mean":
                    bucketStats["mean"] = Average(bucket.dataPoints)
                CASE "p50":
                    bucketStats["p50"] = Percentile(bucket.dataPoints, 50)
                CASE "p95":
                    bucketStats["p95"] = Percentile(bucket.dataPoints, 95)
                CASE "p99":
                    bucketStats["p99"] = Percentile(bucket.dataPoints, 99)
                CASE "max":
                    bucketStats["max"] = Maximum(bucket.dataPoints)
                CASE "min":
                    bucketStats["min"] = Minimum(bucket.dataPoints)
                CASE "sum":
                    bucketStats["sum"] = Sum(bucket.dataPoints)
            END SWITCH
        END FOR

        result.Add(bucketStats)
    END FOR

    RETURN result
END FUNCTION
```

---

## 2. RBAC Permission Checking Logic

### 2.1 Core Permission Evaluation

```pseudocode
ALGORITHM: CheckPermission
INPUT: principal (user/service), resource (target resource), action (requested operation)
OUTPUT: authorized (boolean), reason (explanation)

FUNCTION CheckPermission(principal, resource, action):
    // Quick cache lookup for recent decisions
    cacheKey = Hash(principal.id, resource.id, action)
    cached = PermissionCache.Get(cacheKey)

    IF cached IS NOT NULL AND NOT cached.IsExpired():
        RETURN cached.decision, cached.reason
    END IF

    // Step 1: Load principal's roles and permissions
    roles = LoadPrincipalRoles(principal)
    directPermissions = LoadDirectPermissions(principal)

    // Step 2: Check for explicit deny (highest priority)
    denyCheck = CheckExplicitDeny(roles, directPermissions, resource, action)
    IF denyCheck.denied:
        decision = CreateDecision(false, denyCheck.reason)
        PermissionCache.Set(cacheKey, decision, ttl = 5_minutes)
        AuditLog("PERMISSION_DENIED", principal, resource, action, denyCheck.reason)
        RETURN false, denyCheck.reason
    END IF

    // Step 3: Check direct permissions
    IF HasDirectPermission(directPermissions, resource, action):
        decision = CreateDecision(true, "DIRECT_PERMISSION")
        PermissionCache.Set(cacheKey, decision, ttl = 5_minutes)
        AuditLog("PERMISSION_GRANTED", principal, resource, action, "DIRECT")
        RETURN true, "DIRECT_PERMISSION"
    END IF

    // Step 4: Check role-based permissions
    FOR EACH role IN roles:
        rolePermissions = LoadRolePermissions(role)

        IF HasRolePermission(rolePermissions, resource, action):
            // Check for conditional permissions
            IF role.HasConditions():
                conditionsMet = EvaluateConditions(role.conditions, principal, resource)
                IF NOT conditionsMet:
                    CONTINUE  // Try next role
                END IF
            END IF

            decision = CreateDecision(true, "ROLE_PERMISSION: " + role.name)
            PermissionCache.Set(cacheKey, decision, ttl = 5_minutes)
            AuditLog("PERMISSION_GRANTED", principal, resource, action, role.name)
            RETURN true, "ROLE_PERMISSION: " + role.name
        END IF
    END FOR

    // Step 5: Check resource hierarchy permissions (inheritance)
    parentResource = resource.parent
    WHILE parentResource IS NOT NULL:
        IF CheckPermission(principal, parentResource, action):
            decision = CreateDecision(true, "INHERITED_PERMISSION")
            PermissionCache.Set(cacheKey, decision, ttl = 5_minutes)
            AuditLog("PERMISSION_GRANTED", principal, resource, action, "INHERITED")
            RETURN true, "INHERITED_PERMISSION"
        END IF
        parentResource = parentResource.parent
    END WHILE

    // Step 6: No permission found - deny by default
    decision = CreateDecision(false, "NO_PERMISSION_FOUND")
    PermissionCache.Set(cacheKey, decision, ttl = 5_minutes)
    AuditLog("PERMISSION_DENIED", principal, resource, action, "DEFAULT_DENY")

    RETURN false, "NO_PERMISSION_FOUND"
END FUNCTION


FUNCTION HasDirectPermission(permissions, resource, action):
    FOR EACH permission IN permissions:
        // Check exact match
        IF permission.resource == resource.id AND
           permission.action == action:
            RETURN true
        END IF

        // Check wildcard patterns
        IF MatchesPattern(permission.resource, resource.id) AND
           MatchesPattern(permission.action, action):
            RETURN true
        END IF
    END FOR

    RETURN false
END FUNCTION


FUNCTION HasRolePermission(rolePermissions, resource, action):
    FOR EACH permission IN rolePermissions:
        // Check resource type matching
        IF permission.resourceType == resource.type OR
           permission.resourceType == "*":

            // Check action matching
            IF permission.action == action OR
               permission.action == "*" OR
               action IN permission.allowedActions:

                // Check resource constraints
                IF EvaluateResourceConstraints(permission.constraints, resource):
                    RETURN true
                END IF
            END IF
        END IF
    END FOR

    RETURN false
END FUNCTION


FUNCTION EvaluateConditions(conditions, principal, resource):
    // Evaluate all conditions using AND logic
    FOR EACH condition IN conditions:
        result = false

        SWITCH condition.type:
            CASE "TIME_BASED":
                currentTime = CurrentTimestamp()
                result = (currentTime >= condition.startTime AND
                         currentTime <= condition.endTime)

            CASE "IP_RANGE":
                result = IsIPInRange(principal.ipAddress, condition.ipRange)

            CASE "ATTRIBUTE_BASED":
                attributeValue = principal.attributes[condition.attributeName]
                result = EvaluateExpression(attributeValue, condition.operator,
                                           condition.expectedValue)

            CASE "RESOURCE_OWNERSHIP":
                result = (resource.owner == principal.id)

            CASE "CUSTOM_FUNCTION":
                result = ExecuteCustomCondition(condition.function,
                                               principal, resource)
        END SWITCH

        IF NOT result:
            RETURN false  // Short-circuit on first failure
        END IF
    END FOR

    RETURN true  // All conditions passed
END FUNCTION
```

### 2.2 Role Hierarchy Resolution

```pseudocode
ALGORITHM: ResolveRoleHierarchy
INPUT: principalRoles (list of assigned roles)
OUTPUT: effectiveRoles (all roles including inherited)

FUNCTION ResolveRoleHierarchy(principalRoles):
    effectiveRoles = empty set
    visited = empty set  // Prevent circular references
    queue = Queue(principalRoles)

    WHILE NOT queue.IsEmpty():
        role = queue.Dequeue()

        IF role IN visited:
            CONTINUE  // Already processed
        END IF

        visited.Add(role)
        effectiveRoles.Add(role)

        // Get parent roles (roles this role inherits from)
        parentRoles = GetParentRoles(role)

        FOR EACH parentRole IN parentRoles:
            IF parentRole NOT IN visited:
                queue.Enqueue(parentRole)
            END IF
        END FOR
    END WHILE

    RETURN effectiveRoles
END FUNCTION
```

---

## 3. Audit Logging System

### 3.1 Event Capture and Storage

```pseudocode
ALGORITHM: CaptureAuditEvent
INPUT: eventType, principal, resource, action, result, metadata
OUTPUT: success (boolean)

FUNCTION CaptureAuditEvent(eventType, principal, resource, action, result, metadata):
    // Create audit event object
    event = CreateAuditEvent(
        id = GenerateUUID(),
        timestamp = CurrentTimestampUTC(),
        eventType = eventType,
        principal = SerializePrincipal(principal),
        resource = SerializeResource(resource),
        action = action,
        result = result,
        metadata = metadata,
        sessionId = GetCurrentSessionId(),
        ipAddress = GetClientIPAddress(),
        userAgent = GetUserAgent(),
        traceId = GetDistributedTraceId()
    )

    // Enrich event with contextual data
    event = EnrichAuditEvent(event)

    // Determine event severity
    event.severity = DetermineSeverity(eventType, result)

    // Add to async processing queue (non-blocking)
    TRY:
        AuditQueue.EnqueueNonBlocking(event, timeout = 100_milliseconds)

        // For critical events, also log synchronously
        IF event.severity IN ["CRITICAL", "HIGH"]:
            WriteAuditLogSync(event)
            TriggerRealTimeAlert(event)
        END IF

        RETURN true

    CATCH QueueFullError:
        // Fallback to synchronous logging
        LogWarning("Audit queue full, falling back to sync write")
        WriteAuditLogSync(event)
        RETURN true

    CATCH error:
        LogError("Failed to capture audit event", error)
        RETURN false
    END TRY
END FUNCTION


FUNCTION ProcessAuditQueue():
    // Background worker process
    WHILE true:
        batch = AuditQueue.DequeueBatch(maxSize = 100, timeout = 1_second)

        IF batch.IsEmpty():
            Sleep(100_milliseconds)
            CONTINUE
        END IF

        // Process batch
        TRY:
            // Write to primary storage (database)
            WriteBatchToDatabase(batch)

            // Write to secondary storage (object storage for long-term retention)
            IF ShouldArchive(batch):
                ArchiveBatchToObjectStorage(batch)
            END IF

            // Index for search
            IndexBatchInSearchEngine(batch)

            // Update real-time metrics
            UpdateAuditMetrics(batch)

            // Check for compliance violations
            FOR EACH event IN batch:
                violations = CheckComplianceRules(event)
                IF violations IS NOT EMPTY:
                    TriggerComplianceAlert(event, violations)
                END IF
            END FOR

        CATCH error:
            LogError("Failed to process audit batch", error)
            // Re-queue failed events with exponential backoff
            RequeueWithBackoff(batch)
        END TRY
    END WHILE
END FUNCTION


FUNCTION EnrichAuditEvent(event):
    // Add organization context
    IF event.principal.organizationId IS NOT NULL:
        org = GetOrganization(event.principal.organizationId)
        event.organization = {
            id: org.id,
            name: org.name,
            tier: org.tier
        }
    END IF

    // Add resource classification
    IF event.resource IS NOT NULL:
        event.resourceClassification = ClassifyResource(event.resource)
        event.dataClassification = GetDataClassification(event.resource)
    END IF

    // Add geolocation data
    IF event.ipAddress IS NOT NULL:
        geoData = GeolocateIP(event.ipAddress)
        event.geolocation = geoData
    END IF

    // Add compliance tags
    event.complianceTags = DetermineComplianceTags(event)

    RETURN event
END FUNCTION


FUNCTION DetermineSeverity(eventType, result):
    // Critical events
    criticalEvents = [
        "PERMISSION_ESCALATION",
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "DATA_EXFILTRATION",
        "POLICY_VIOLATION_CRITICAL",
        "AUTHENTICATION_BYPASS"
    ]

    IF eventType IN criticalEvents:
        RETURN "CRITICAL"
    END IF

    // High severity events
    highEvents = [
        "PERMISSION_DENIED",
        "AUTHENTICATION_FAILURE",
        "POLICY_VIOLATION_HIGH",
        "SENSITIVE_DATA_ACCESS"
    ]

    IF eventType IN highEvents:
        RETURN "HIGH"
    END IF

    // Failed operations increase severity
    IF result == "FAILURE" OR result == "ERROR":
        RETURN "MEDIUM"
    END IF

    RETURN "LOW"
END FUNCTION
```

### 3.2 Audit Query and Analysis

```pseudocode
ALGORITHM: QueryAuditLogs
INPUT: query (search criteria), pagination (page size and offset)
OUTPUT: results (matching audit events), totalCount

FUNCTION QueryAuditLogs(query, pagination):
    // Build search query
    searchQuery = BuildSearchQuery(query)

    // Apply security filters (users can only see their own org's logs)
    securityFilters = ApplySecurityFilters(GetCurrentUser())
    searchQuery = CombineQueries(searchQuery, securityFilters)

    // Execute search with pagination
    results = SearchEngine.Search(
        query = searchQuery,
        offset = pagination.offset,
        limit = pagination.limit,
        sort = query.sortBy OR "timestamp:desc"
    )

    // Apply post-processing
    processedResults = empty list
    FOR EACH result IN results.hits:
        // Redact sensitive fields based on user permissions
        redactedEvent = RedactSensitiveFields(result, GetCurrentUser())
        processedResults.Add(redactedEvent)
    END FOR

    RETURN processedResults, results.totalCount
END FUNCTION
```

---

## 4. Compliance Rule Evaluation Engine

### 4.1 Rule Evaluation Pipeline

```pseudocode
ALGORITHM: EvaluateComplianceRules
INPUT: event (audit event or data change), ruleset (applicable rules)
OUTPUT: violations (list of rule violations)

FUNCTION EvaluateComplianceRules(event, ruleset):
    violations = empty list

    // Filter applicable rules based on event context
    applicableRules = FilterApplicableRules(ruleset, event)

    // Evaluate rules in parallel for performance
    workers = CreateWorkerPool(size = CPU_CORES)

    FOR EACH rule IN applicableRules:
        task = workers.Submit(EvaluateRule, rule, event)
        tasks.Add(task)
    END FOR

    results = workers.WaitAll(tasks, timeout = 5_seconds)

    FOR EACH result IN results:
        IF result.IsViolation():
            violation = CreateViolation(
                ruleId = result.rule.id,
                ruleName = result.rule.name,
                severity = result.rule.severity,
                description = result.message,
                event = event,
                evidence = result.evidence,
                timestamp = CurrentTimestamp()
            )
            violations.Add(violation)
        END IF
    END FOR

    // Aggregate related violations
    violations = AggregateRelatedViolations(violations)

    // Store violations for reporting
    IF violations IS NOT EMPTY:
        StoreViolations(violations)
        TriggerViolationAlerts(violations)
    END IF

    RETURN violations
END FUNCTION


FUNCTION EvaluateRule(rule, event):
    TRY:
        // Check rule conditions
        conditionsMet = EvaluateRuleConditions(rule.conditions, event)

        IF NOT conditionsMet:
            RETURN NoViolation()
        END IF

        // Execute rule logic based on type
        SWITCH rule.type:
            CASE "THRESHOLD":
                RETURN EvaluateThresholdRule(rule, event)

            CASE "PATTERN":
                RETURN EvaluatePatternRule(rule, event)

            CASE "FREQUENCY":
                RETURN EvaluateFrequencyRule(rule, event)

            CASE "CORRELATION":
                RETURN EvaluateCorrelationRule(rule, event)

            CASE "CUSTOM":
                RETURN EvaluateCustomRule(rule, event)

            DEFAULT:
                LogError("Unknown rule type", rule.type)
                RETURN NoViolation()
        END SWITCH

    CATCH error:
        LogError("Rule evaluation failed", rule.id, error)
        RETURN EvaluationError(rule, error)
    END TRY
END FUNCTION


FUNCTION EvaluateThresholdRule(rule, event):
    // Extract metric value from event
    metricValue = ExtractMetric(event, rule.metricPath)

    IF metricValue IS NULL:
        RETURN NoViolation()
    END IF

    // Compare against threshold
    violated = false

    SWITCH rule.operator:
        CASE "GREATER_THAN":
            violated = (metricValue > rule.threshold)
        CASE "LESS_THAN":
            violated = (metricValue < rule.threshold)
        CASE "EQUALS":
            violated = (metricValue == rule.threshold)
        CASE "NOT_EQUALS":
            violated = (metricValue != rule.threshold)
        CASE "BETWEEN":
            violated = (metricValue >= rule.minThreshold AND
                       metricValue <= rule.maxThreshold)
    END SWITCH

    IF violated:
        evidence = {
            actualValue: metricValue,
            threshold: rule.threshold,
            operator: rule.operator
        }
        RETURN Violation(rule, "Threshold exceeded", evidence)
    END IF

    RETURN NoViolation()
END FUNCTION


FUNCTION EvaluateFrequencyRule(rule, event):
    // Count events matching pattern in time window
    timeWindow = CurrentTimestamp() - rule.timeWindowSeconds

    matchingEvents = CountMatchingEvents(
        pattern = rule.pattern,
        startTime = timeWindow,
        endTime = CurrentTimestamp(),
        filters = rule.filters
    )

    IF matchingEvents > rule.maxOccurrences:
        evidence = {
            count: matchingEvents,
            threshold: rule.maxOccurrences,
            timeWindow: rule.timeWindowSeconds
        }
        RETURN Violation(rule, "Frequency threshold exceeded", evidence)
    END IF

    RETURN NoViolation()
END FUNCTION


FUNCTION EvaluateCorrelationRule(rule, event):
    // Check for multiple related events within time window
    timeWindow = CurrentTimestamp() - rule.correlationWindowSeconds

    // Find events matching each correlation pattern
    correlatedEvents = empty list

    FOR EACH pattern IN rule.correlationPatterns:
        events = FindMatchingEvents(
            pattern = pattern,
            startTime = timeWindow,
            endTime = CurrentTimestamp()
        )
        correlatedEvents.Add(pattern.id, events)
    END FOR

    // Check if all required patterns are present
    allPatternsFound = true
    FOR EACH pattern IN rule.correlationPatterns:
        IF correlatedEvents[pattern.id].IsEmpty():
            allPatternsFound = false
            BREAK
        END IF
    END FOR

    IF allPatternsFound:
        evidence = {
            correlatedEvents: correlatedEvents,
            timeWindow: rule.correlationWindowSeconds
        }
        RETURN Violation(rule, "Suspicious correlation detected", evidence)
    END IF

    RETURN NoViolation()
END FUNCTION


FUNCTION EvaluateCustomRule(rule, event):
    // Execute custom rule logic using embedded script engine
    context = CreateRuleContext(event)

    // Provide safe sandbox environment with limited API
    sandbox = CreateSandbox(
        timeout = 1_second,
        memoryLimit = 10_MB,
        allowedFunctions = ["match", "count", "sum", "contains"]
    )

    TRY:
        result = sandbox.Execute(rule.scriptCode, context)

        IF result.violated:
            RETURN Violation(rule, result.message, result.evidence)
        END IF

        RETURN NoViolation()

    CATCH TimeoutError:
        LogError("Custom rule timeout", rule.id)
        RETURN EvaluationError(rule, "Script timeout")

    CATCH error:
        LogError("Custom rule execution error", rule.id, error)
        RETURN EvaluationError(rule, error)
    END TRY
END FUNCTION
```

### 4.2 Policy Compliance Checking

```pseudocode
ALGORITHM: CheckPolicyCompliance
INPUT: modelDeployment (model deployment configuration)
OUTPUT: complianceReport (compliance status and violations)

FUNCTION CheckPolicyCompliance(modelDeployment):
    complianceReport = {
        compliant: true,
        violations: empty list,
        warnings: empty list,
        timestamp: CurrentTimestamp()
    }

    // Load applicable policies
    policies = LoadApplicablePolicies(
        organizationId = modelDeployment.organizationId,
        resourceType = "MODEL_DEPLOYMENT",
        tags = modelDeployment.tags
    )

    FOR EACH policy IN policies:
        // Check each policy requirement
        FOR EACH requirement IN policy.requirements:
            result = CheckRequirement(requirement, modelDeployment)

            IF result.status == "VIOLATED":
                complianceReport.compliant = false
                complianceReport.violations.Add(result)
            ELSE IF result.status == "WARNING":
                complianceReport.warnings.Add(result)
            END IF
        END FOR
    END FOR

    // Check specific compliance frameworks
    complianceReport.frameworks = CheckComplianceFrameworks(modelDeployment)

    // Store compliance report
    StoreComplianceReport(modelDeployment.id, complianceReport)

    RETURN complianceReport
END FUNCTION


FUNCTION CheckRequirement(requirement, modelDeployment):
    SWITCH requirement.type:
        CASE "MODEL_APPROVAL":
            RETURN CheckModelApproval(modelDeployment)

        CASE "DATA_GOVERNANCE":
            RETURN CheckDataGovernance(modelDeployment)

        CASE "SECURITY_CONTROLS":
            RETURN CheckSecurityControls(modelDeployment)

        CASE "MONITORING_ENABLED":
            RETURN CheckMonitoringEnabled(modelDeployment)

        CASE "COST_LIMITS":
            RETURN CheckCostLimits(modelDeployment)

        CASE "PRIVACY_COMPLIANCE":
            RETURN CheckPrivacyCompliance(modelDeployment)

        DEFAULT:
            LogWarning("Unknown requirement type", requirement.type)
            RETURN UnknownRequirement()
    END SWITCH
END FUNCTION
```

---

## 5. Real-Time Metric Calculation and Aggregation

### 5.1 Streaming Metric Processor

```pseudocode
ALGORITHM: ProcessStreamingMetrics
INPUT: eventStream (real-time event stream)
OUTPUT: aggregatedMetrics (continuously updated metrics)

FUNCTION ProcessStreamingMetrics(eventStream):
    // Initialize metric aggregators with time windows
    aggregators = {
        "1m": CreateTimeWindowAggregator(60_seconds),
        "5m": CreateTimeWindowAggregator(300_seconds),
        "1h": CreateTimeWindowAggregator(3600_seconds)
    }

    // Initialize state stores for stateful aggregations
    stateStore = CreateStateStore()

    WHILE true:
        TRY:
            // Read next event from stream with timeout
            event = eventStream.Read(timeout = 100_milliseconds)

            IF event IS NULL:
                // No event available, perform housekeeping
                EvictExpiredWindows(aggregators)
                CONTINUE
            END IF

            // Extract metrics from event
            metrics = ExtractMetrics(event)

            // Update all time window aggregators
            FOR EACH windowSize, aggregator IN aggregators:
                aggregator.Add(event.timestamp, metrics)
            END FOR

            // Update stateful metrics
            UpdateStatefulMetrics(stateStore, event, metrics)

            // Check if we should emit aggregated results
            FOR EACH windowSize, aggregator IN aggregators:
                IF aggregator.ShouldEmit():
                    aggregatedData = aggregator.GetAggregatedData()
                    EmitMetrics(windowSize, aggregatedData)
                    aggregator.Reset()
                END IF
            END FOR

        CATCH StreamClosedError:
            LogInfo("Event stream closed")
            BREAK

        CATCH error:
            LogError("Error processing stream event", error)
            // Continue processing
        END TRY
    END WHILE

    // Cleanup
    CloseAllAggregators(aggregators)
    CloseStateStore(stateStore)
END FUNCTION


FUNCTION CreateTimeWindowAggregator(windowSizeSeconds):
    aggregator = {
        windowSize: windowSizeSeconds,
        currentWindow: empty map,
        windowStart: CurrentTimestamp(),
        metrics: {
            count: 0,
            sum: empty map,
            min: empty map,
            max: empty map,
            values: empty map  // For percentile calculations
        }
    }

    RETURN aggregator
END FUNCTION


FUNCTION ExtractMetrics(event):
    metrics = empty map

    SWITCH event.type:
        CASE "API_REQUEST":
            metrics["request_count"] = 1
            metrics["latency_ms"] = event.durationMs
            metrics["token_count"] = event.tokenCount
            metrics["cost"] = event.cost
            metrics["error"] = (event.statusCode >= 400) ? 1 : 0

        CASE "MODEL_INFERENCE":
            metrics["inference_count"] = 1
            metrics["inference_time_ms"] = event.inferenceTimeMs
            metrics["input_tokens"] = event.inputTokens
            metrics["output_tokens"] = event.outputTokens
            metrics["model"] = event.modelId

        CASE "POLICY_VIOLATION":
            metrics["violation_count"] = 1
            metrics["severity"] = event.severity

        CASE "COST_EVENT":
            metrics["cost_amount"] = event.amount
            metrics["cost_currency"] = event.currency
    END SWITCH

    // Add common dimensions
    metrics["organization_id"] = event.organizationId
    metrics["user_id"] = event.userId
    metrics["timestamp"] = event.timestamp

    RETURN metrics
END FUNCTION


FUNCTION UpdateStatefulMetrics(stateStore, event, metrics):
    // Update per-user metrics
    userKey = "user:" + event.userId
    userState = stateStore.Get(userKey) OR CreateDefaultState()

    userState.totalRequests += metrics.get("request_count", 0)
    userState.totalTokens += metrics.get("token_count", 0)
    userState.totalCost += metrics.get("cost", 0)
    userState.lastActivity = event.timestamp

    stateStore.Set(userKey, userState)

    // Update per-model metrics
    IF metrics.Contains("model"):
        modelKey = "model:" + metrics["model"]
        modelState = stateStore.Get(modelKey) OR CreateDefaultState()

        modelState.totalInferences += 1
        modelState.totalLatency += metrics.get("latency_ms", 0)
        modelState.errorCount += metrics.get("error", 0)

        stateStore.Set(modelKey, modelState)
    END IF

    // Update organization-level quotas
    orgKey = "org:" + event.organizationId
    orgState = stateStore.Get(orgKey) OR CreateDefaultState()

    orgState.dailyTokens += metrics.get("token_count", 0)
    orgState.dailyCost += metrics.get("cost", 0)

    // Check quota limits
    IF orgState.dailyTokens > orgState.tokenQuota:
        TriggerQuotaAlert(event.organizationId, "TOKEN_QUOTA_EXCEEDED")
    END IF

    IF orgState.dailyCost > orgState.costQuota:
        TriggerQuotaAlert(event.organizationId, "COST_QUOTA_EXCEEDED")
    END IF

    stateStore.Set(orgKey, orgState)
END FUNCTION


FUNCTION EmitMetrics(windowSize, aggregatedData):
    // Publish metrics to various backends

    // 1. Update metrics database
    MetricsDB.Write(
        measurement = "governance_metrics",
        tags = {
            window: windowSize
        },
        fields = aggregatedData,
        timestamp = CurrentTimestamp()
    )

    // 2. Publish to real-time dashboard via WebSocket
    DashboardBroadcast.Send({
        type: "METRICS_UPDATE",
        window: windowSize,
        data: aggregatedData
    })

    // 3. Update Prometheus metrics
    FOR EACH metricName, value IN aggregatedData:
        PrometheusExporter.Set(metricName, value, {window: windowSize})
    END FOR

    // 4. Check for anomalies
    anomalies = DetectAnomalies(aggregatedData)
    IF anomalies IS NOT EMPTY:
        TriggerAnomalyAlerts(anomalies)
    END IF
END FUNCTION
```

### 5.2 Metric Aggregation Functions

```pseudocode
FUNCTION AggregateMetricBatch(metricBatch, aggregationType):
    result = empty map

    // Group metrics by dimensions
    grouped = GroupByDimensions(metricBatch)

    FOR EACH dimensionKey, metrics IN grouped:
        SWITCH aggregationType:
            CASE "SUM":
                result[dimensionKey] = SumMetrics(metrics)

            CASE "AVERAGE":
                result[dimensionKey] = AverageMetrics(metrics)

            CASE "COUNT":
                result[dimensionKey] = CountMetrics(metrics)

            CASE "PERCENTILES":
                result[dimensionKey] = CalculatePercentiles(metrics, [50, 95, 99])

            CASE "RATE":
                result[dimensionKey] = CalculateRate(metrics)

            CASE "DISTRIBUTION":
                result[dimensionKey] = CalculateDistribution(metrics)
        END SWITCH
    END FOR

    RETURN result
END FUNCTION


FUNCTION CalculatePercentiles(values, percentiles):
    sortedValues = Sort(values)
    result = empty map

    FOR EACH p IN percentiles:
        index = (p / 100.0) * (sortedValues.length - 1)

        // Linear interpolation between values
        lowerIndex = Floor(index)
        upperIndex = Ceiling(index)
        fraction = index - lowerIndex

        IF lowerIndex == upperIndex:
            result["p" + p] = sortedValues[lowerIndex]
        ELSE:
            result["p" + p] = sortedValues[lowerIndex] * (1 - fraction) +
                             sortedValues[upperIndex] * fraction
        END IF
    END FOR

    RETURN result
END FUNCTION
```

---

## 6. API Request/Response Flow

### 6.1 REST API Request Handler

```pseudocode
ALGORITHM: HandleRESTRequest
INPUT: httpRequest (incoming HTTP request)
OUTPUT: httpResponse (HTTP response with data or error)

FUNCTION HandleRESTRequest(httpRequest):
    // Step 1: Request parsing and validation
    TRY:
        parsedRequest = ParseHTTPRequest(httpRequest)
    CATCH ParseError AS e:
        RETURN ErrorResponse(400, "INVALID_REQUEST", e.message)
    END TRY

    // Step 2: Extract authentication credentials
    authToken = ExtractAuthToken(httpRequest.headers)

    IF authToken IS NULL:
        AuditLog("UNAUTHENTICATED_REQUEST", null, parsedRequest.endpoint, "DENIED")
        RETURN ErrorResponse(401, "AUTHENTICATION_REQUIRED",
                           "No authentication token provided")
    END IF

    // Step 3: Authenticate and load principal
    TRY:
        principal = AuthenticateToken(authToken)
    CATCH AuthenticationError AS e:
        AuditLog("AUTHENTICATION_FAILED", null, parsedRequest.endpoint, "DENIED")
        RETURN ErrorResponse(401, "AUTHENTICATION_FAILED", e.message)
    END TRY

    // Step 4: Rate limiting check
    rateLimitResult = CheckRateLimit(principal, parsedRequest.endpoint)
    IF rateLimitResult.exceeded:
        AuditLog("RATE_LIMIT_EXCEEDED", principal, parsedRequest.endpoint, "DENIED")
        RETURN ErrorResponse(429, "RATE_LIMIT_EXCEEDED",
                           "Retry after: " + rateLimitResult.retryAfter)
    END IF

    // Step 5: Route to appropriate handler
    handler = RouteRequest(parsedRequest.method, parsedRequest.path)

    IF handler IS NULL:
        RETURN ErrorResponse(404, "NOT_FOUND", "Endpoint not found")
    END IF

    // Step 6: Validate request body against schema
    IF parsedRequest.body IS NOT NULL:
        validationResult = ValidateRequestSchema(parsedRequest.body, handler.schema)
        IF NOT validationResult.valid:
            RETURN ErrorResponse(400, "VALIDATION_FAILED", validationResult.errors)
        END IF
    END IF

    // Step 7: Authorization check
    authorized, reason = CheckPermission(
        principal = principal,
        resource = handler.requiredResource,
        action = handler.requiredAction
    )

    IF NOT authorized:
        RETURN ErrorResponse(403, "FORBIDDEN", reason)
    END IF

    // Step 8: Execute handler with error handling
    startTime = CurrentTimestamp()

    TRY:
        result = handler.Execute(principal, parsedRequest)

        duration = CurrentTimestamp() - startTime

        // Log successful request
        AuditLog("API_REQUEST", principal, parsedRequest.endpoint, "SUCCESS", {
            duration: duration,
            statusCode: result.statusCode
        })

        // Record metrics
        RecordMetric("api.request.duration", duration, {
            endpoint: parsedRequest.endpoint,
            status: result.statusCode
        })

        RETURN FormatSuccessResponse(result)

    CATCH ValidationError AS e:
        AuditLog("API_REQUEST", principal, parsedRequest.endpoint, "VALIDATION_ERROR")
        RETURN ErrorResponse(400, "VALIDATION_ERROR", e.message)

    CATCH ResourceNotFoundError AS e:
        RETURN ErrorResponse(404, "RESOURCE_NOT_FOUND", e.message)

    CATCH ConflictError AS e:
        RETURN ErrorResponse(409, "CONFLICT", e.message)

    CATCH TimeoutError AS e:
        AuditLog("API_REQUEST", principal, parsedRequest.endpoint, "TIMEOUT")
        RETURN ErrorResponse(504, "GATEWAY_TIMEOUT", "Request timeout")

    CATCH error AS e:
        LogError("API request handler error", parsedRequest.endpoint, e)
        AuditLog("API_REQUEST", principal, parsedRequest.endpoint, "ERROR", {
            error: e.message
        })
        RETURN ErrorResponse(500, "INTERNAL_ERROR", "An error occurred")
    END TRY
END FUNCTION


FUNCTION FormatSuccessResponse(result):
    response = {
        statusCode: result.statusCode OR 200,
        headers: {
            "Content-Type": "application/json",
            "X-Request-ID": GetRequestID(),
            "X-RateLimit-Remaining": GetRateLimitRemaining()
        },
        body: {
            success: true,
            data: result.data,
            metadata: {
                timestamp: CurrentTimestamp(),
                version: API_VERSION
            }
        }
    }

    // Add pagination info if present
    IF result.pagination IS NOT NULL:
        response.body.pagination = result.pagination
    END IF

    RETURN response
END FUNCTION


FUNCTION ErrorResponse(statusCode, errorCode, message):
    RETURN {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "X-Request-ID": GetRequestID()
        },
        body: {
            success: false,
            error: {
                code: errorCode,
                message: message,
                timestamp: CurrentTimestamp()
            }
        }
    }
END FUNCTION
```

### 6.2 gRPC Request Handler

```pseudocode
ALGORITHM: HandleGRPCRequest
INPUT: grpcRequest (incoming gRPC request), context (gRPC context)
OUTPUT: grpcResponse (gRPC response or error)

FUNCTION HandleGRPCRequest(grpcRequest, context):
    // Step 1: Extract metadata from context
    metadata = context.GetMetadata()
    authToken = metadata["authorization"]
    traceId = metadata["x-trace-id"] OR GenerateTraceID()

    // Set trace context
    SetTraceContext(traceId)

    // Step 2: Authenticate
    IF authToken IS NULL:
        THROW GRPCError(UNAUTHENTICATED, "Authentication required")
    END IF

    TRY:
        principal = AuthenticateToken(authToken)
    CATCH AuthenticationError AS e:
        THROW GRPCError(UNAUTHENTICATED, e.message)
    END TRY

    // Step 3: Validate request
    validationError = ValidateGRPCRequest(grpcRequest)
    IF validationError IS NOT NULL:
        THROW GRPCError(INVALID_ARGUMENT, validationError)
    END IF

    // Step 4: Authorization
    authorized, reason = CheckPermission(
        principal = principal,
        resource = grpcRequest.ResourceId,
        action = grpcRequest.Action
    )

    IF NOT authorized:
        AuditLog("GRPC_REQUEST_DENIED", principal, grpcRequest, "FORBIDDEN")
        THROW GRPCError(PERMISSION_DENIED, reason)
    END IF

    // Step 5: Process request
    startTime = CurrentTimestamp()

    TRY:
        response = ProcessGRPCRequest(principal, grpcRequest)

        duration = CurrentTimestamp() - startTime

        // Audit successful request
        AuditLog("GRPC_REQUEST", principal, grpcRequest, "SUCCESS", {
            duration: duration
        })

        RecordMetric("grpc.request.duration", duration, {
            method: grpcRequest.GetMethodName()
        })

        RETURN response

    CATCH NotFoundError AS e:
        THROW GRPCError(NOT_FOUND, e.message)

    CATCH error AS e:
        LogError("gRPC request error", e)
        AuditLog("GRPC_REQUEST", principal, grpcRequest, "ERROR", {
            error: e.message
        })
        THROW GRPCError(INTERNAL, "Internal error occurred")
    END TRY
END FUNCTION


FUNCTION ProcessGRPCRequest(principal, grpcRequest):
    // Dispatch based on gRPC method
    methodName = grpcRequest.GetMethodName()

    SWITCH methodName:
        CASE "GetGovernanceMetrics":
            RETURN HandleGetGovernanceMetrics(principal, grpcRequest)

        CASE "StreamAuditEvents":
            RETURN HandleStreamAuditEvents(principal, grpcRequest)

        CASE "EvaluateCompliance":
            RETURN HandleEvaluateCompliance(principal, grpcRequest)

        CASE "CheckPermissions":
            RETURN HandleCheckPermissions(principal, grpcRequest)

        DEFAULT:
            THROW GRPCError(UNIMPLEMENTED, "Method not implemented")
    END SWITCH
END FUNCTION


FUNCTION HandleStreamAuditEvents(principal, grpcRequest):
    // Server-side streaming RPC
    stream = CreateResponseStream()

    // Subscribe to audit event stream
    subscription = AuditEventBus.Subscribe(
        filters = grpcRequest.Filters,
        startTime = grpcRequest.StartTime
    )

    TRY:
        WHILE NOT stream.IsCancelled():
            event = subscription.NextEvent(timeout = 1_second)

            IF event IS NULL:
                CONTINUE  // No event within timeout
            END IF

            // Check if principal has permission to see this event
            IF CanViewEvent(principal, event):
                // Send event to client
                stream.Send(ConvertToGRPCEvent(event))
            END IF
        END WHILE

    FINALLY:
        subscription.Unsubscribe()
        stream.Close()
    END TRY

    RETURN stream
END FUNCTION
```

---

## 7. Authentication and Authorization Flows

### 7.1 Token-Based Authentication

```pseudocode
ALGORITHM: AuthenticateUser
INPUT: credentials (username/password or OAuth token)
OUTPUT: authToken (JWT or session token), principal (user object)

FUNCTION AuthenticateUser(credentials):
    // Step 1: Validate credentials format
    IF NOT ValidateCredentialsFormat(credentials):
        AuditLog("AUTHENTICATION_ATTEMPT", null, "INVALID_FORMAT", "FAILED")
        THROW AuthenticationError("Invalid credentials format")
    END IF

    // Step 2: Determine authentication method
    SWITCH credentials.type:
        CASE "PASSWORD":
            principal = AuthenticateWithPassword(credentials)

        CASE "OAUTH":
            principal = AuthenticateWithOAuth(credentials)

        CASE "API_KEY":
            principal = AuthenticateWithAPIKey(credentials)

        CASE "CERTIFICATE":
            principal = AuthenticateWithCertificate(credentials)

        DEFAULT:
            THROW AuthenticationError("Unsupported authentication method")
    END SWITCH

    // Step 3: Check account status
    IF principal.status != "ACTIVE":
        AuditLog("AUTHENTICATION_ATTEMPT", principal, "INACTIVE_ACCOUNT", "FAILED")
        THROW AuthenticationError("Account is not active")
    END IF

    // Step 4: Multi-factor authentication (if required)
    IF principal.mfaRequired:
        IF NOT credentials.Contains("mfaCode"):
            RETURN {
                requiresMFA: true,
                sessionId: CreateMFASession(principal)
            }
        ELSE:
            IF NOT ValidateMFACode(principal, credentials.mfaCode):
                AuditLog("MFA_FAILED", principal, "INVALID_CODE", "FAILED")
                THROW AuthenticationError("Invalid MFA code")
            END IF
        END IF
    END IF

    // Step 5: Generate authentication token
    authToken = GenerateAuthToken(principal)

    // Step 6: Create session
    session = CreateSession(
        principal = principal,
        token = authToken,
        ipAddress = GetClientIP(),
        userAgent = GetUserAgent(),
        expiresAt = CurrentTimestamp() + TOKEN_TTL
    )

    // Store session
    SessionStore.Set(authToken.id, session)

    // Step 7: Log successful authentication
    AuditLog("AUTHENTICATION_SUCCESS", principal, "LOGIN", "SUCCESS", {
        authMethod: credentials.type,
        ipAddress: GetClientIP()
    })

    // Step 8: Update last login timestamp
    UpdateLastLogin(principal)

    RETURN authToken, principal
END FUNCTION


FUNCTION AuthenticateWithPassword(credentials):
    // Look up user by username/email
    user = UserRepository.FindByUsername(credentials.username)

    IF user IS NULL:
        // Prevent username enumeration - use constant time delay
        Sleep(RANDOM_DELAY)
        AuditLog("AUTHENTICATION_ATTEMPT", null, "USER_NOT_FOUND", "FAILED")
        THROW AuthenticationError("Invalid credentials")
    END IF

    // Check for account lockout
    IF IsAccountLocked(user):
        AuditLog("AUTHENTICATION_ATTEMPT", user, "ACCOUNT_LOCKED", "FAILED")
        THROW AuthenticationError("Account is locked")
    END IF

    // Verify password using constant-time comparison
    passwordValid = VerifyPassword(credentials.password, user.passwordHash)

    IF NOT passwordValid:
        // Increment failed login counter
        IncrementFailedLogins(user)

        // Check if account should be locked
        IF GetFailedLoginCount(user) >= MAX_FAILED_LOGINS:
            LockAccount(user)
            AuditLog("ACCOUNT_LOCKED", user, "TOO_MANY_FAILURES", "LOCKED")
        END IF

        AuditLog("AUTHENTICATION_ATTEMPT", user, "INVALID_PASSWORD", "FAILED")
        THROW AuthenticationError("Invalid credentials")
    END IF

    // Reset failed login counter
    ResetFailedLogins(user)

    // Check password expiration
    IF IsPasswordExpired(user):
        RETURN {
            requiresPasswordChange: true,
            userId: user.id
        }
    END IF

    RETURN user
END FUNCTION


FUNCTION GenerateAuthToken(principal):
    // Create JWT with claims
    claims = {
        sub: principal.id,  // Subject (user ID)
        iss: "llm-governance-dashboard",  // Issuer
        iat: CurrentTimestamp(),  // Issued at
        exp: CurrentTimestamp() + TOKEN_TTL,  // Expiration
        roles: principal.roles,
        organizationId: principal.organizationId,
        permissions: GetDirectPermissions(principal),
        sessionId: GenerateUUID()
    }

    // Sign token with private key
    token = JWT.Sign(claims, PRIVATE_KEY, algorithm = "RS256")

    RETURN token
END FUNCTION


FUNCTION AuthenticateToken(token):
    // Step 1: Parse and verify JWT signature
    TRY:
        claims = JWT.Verify(token, PUBLIC_KEY)
    CATCH JWTVerificationError AS e:
        THROW AuthenticationError("Invalid token")
    END TRY

    // Step 2: Check expiration
    IF claims.exp < CurrentTimestamp():
        THROW AuthenticationError("Token expired")
    END IF

    // Step 3: Check if token is revoked
    IF IsTokenRevoked(claims.sessionId):
        THROW AuthenticationError("Token has been revoked")
    END IF

    // Step 4: Load principal from claims
    principal = LoadPrincipal(claims.sub)

    IF principal IS NULL:
        THROW AuthenticationError("Principal not found")
    END IF

    // Step 5: Verify account is still active
    IF principal.status != "ACTIVE":
        THROW AuthenticationError("Account is not active")
    END IF

    // Step 6: Update session activity
    UpdateSessionActivity(claims.sessionId)

    RETURN principal
END FUNCTION
```

### 7.2 OAuth 2.0 Authorization Code Flow

```pseudocode
ALGORITHM: HandleOAuthAuthorization
INPUT: authRequest (OAuth authorization request)
OUTPUT: redirectUrl (redirect to client with authorization code)

FUNCTION HandleOAuthAuthorization(authRequest):
    // Step 1: Validate OAuth request parameters
    validationResult = ValidateOAuthRequest(authRequest)
    IF NOT validationResult.valid:
        RETURN OAuthError("invalid_request", validationResult.error)
    END IF

    // Step 2: Verify client application
    client = LoadOAuthClient(authRequest.clientId)

    IF client IS NULL:
        RETURN OAuthError("invalid_client", "Unknown client")
    END IF

    // Step 3: Verify redirect URI
    IF NOT IsValidRedirectURI(authRequest.redirectUri, client.registeredRedirectUris):
        RETURN OAuthError("invalid_request", "Invalid redirect URI")
    END IF

    // Step 4: Authenticate user
    principal = GetAuthenticatedUser()

    IF principal IS NULL:
        // Redirect to login page with return URL
        RETURN RedirectToLogin(returnUrl = authRequest.BuildReturnUrl())
    END IF

    // Step 5: Check if user has already granted consent
    existingConsent = LoadUserConsent(principal, client, authRequest.scope)

    IF existingConsent IS NULL OR NOT existingConsent.IsValid():
        // Show consent screen
        RETURN ShowConsentScreen(principal, client, authRequest.scope)
    END IF

    // Step 6: Generate authorization code
    authCode = GenerateAuthorizationCode(
        principal = principal,
        client = client,
        scope = authRequest.scope,
        redirectUri = authRequest.redirectUri,
        codeChallenge = authRequest.codeChallenge,  // PKCE
        expiresAt = CurrentTimestamp() + 10_minutes
    )

    // Store authorization code
    AuthCodeStore.Set(authCode.code, authCode)

    // Audit authorization
    AuditLog("OAUTH_AUTHORIZATION", principal, "AUTH_CODE_ISSUED", "SUCCESS", {
        clientId: client.id,
        scope: authRequest.scope
    })

    // Step 7: Redirect back to client with authorization code
    redirectUrl = BuildRedirectUrl(
        baseUrl = authRequest.redirectUri,
        code = authCode.code,
        state = authRequest.state
    )

    RETURN Redirect(redirectUrl)
END FUNCTION


FUNCTION HandleOAuthTokenExchange(tokenRequest):
    // Step 1: Authenticate client
    client = AuthenticateOAuthClient(tokenRequest.clientId, tokenRequest.clientSecret)

    IF client IS NULL:
        RETURN OAuthError("invalid_client", "Client authentication failed")
    END IF

    // Step 2: Validate grant type
    SWITCH tokenRequest.grantType:
        CASE "authorization_code":
            RETURN ExchangeAuthorizationCode(client, tokenRequest)

        CASE "refresh_token":
            RETURN RefreshAccessToken(client, tokenRequest)

        CASE "client_credentials":
            RETURN IssueClientCredentialsToken(client, tokenRequest)

        DEFAULT:
            RETURN OAuthError("unsupported_grant_type", "Grant type not supported")
    END SWITCH
END FUNCTION


FUNCTION ExchangeAuthorizationCode(client, tokenRequest):
    // Retrieve authorization code
    authCode = AuthCodeStore.Get(tokenRequest.code)

    IF authCode IS NULL:
        RETURN OAuthError("invalid_grant", "Invalid authorization code")
    END IF

    // Verify authorization code hasn't been used
    IF authCode.used:
        // Potential authorization code replay attack
        RevokeAllTokensForAuthCode(authCode)
        AuditLog("OAUTH_SECURITY", null, "AUTH_CODE_REPLAY", "BLOCKED")
        RETURN OAuthError("invalid_grant", "Authorization code has been used")
    END IF

    // Verify code hasn't expired
    IF authCode.expiresAt < CurrentTimestamp():
        RETURN OAuthError("invalid_grant", "Authorization code expired")
    END IF

    // Verify client matches
    IF authCode.clientId != client.id:
        RETURN OAuthError("invalid_grant", "Client mismatch")
    END IF

    // Verify redirect URI matches (if provided)
    IF tokenRequest.redirectUri IS NOT NULL AND
       tokenRequest.redirectUri != authCode.redirectUri:
        RETURN OAuthError("invalid_grant", "Redirect URI mismatch")
    END IF

    // Verify PKCE code verifier (if using PKCE)
    IF authCode.codeChallenge IS NOT NULL:
        IF NOT VerifyPKCE(tokenRequest.codeVerifier, authCode.codeChallenge):
            RETURN OAuthError("invalid_grant", "Invalid code verifier")
        END IF
    END IF

    // Mark code as used
    authCode.used = true
    AuthCodeStore.Set(tokenRequest.code, authCode)

    // Load principal
    principal = LoadPrincipal(authCode.principalId)

    // Generate access token and refresh token
    accessToken = GenerateAccessToken(principal, client, authCode.scope)
    refreshToken = GenerateRefreshToken(principal, client, authCode.scope)

    // Store tokens
    TokenStore.Set(accessToken.id, accessToken)
    TokenStore.Set(refreshToken.id, refreshToken)

    // Audit token issuance
    AuditLog("OAUTH_TOKEN", principal, "ACCESS_TOKEN_ISSUED", "SUCCESS", {
        clientId: client.id,
        scope: authCode.scope
    })

    // Return token response
    RETURN {
        access_token: accessToken.token,
        token_type: "Bearer",
        expires_in: accessToken.expiresIn,
        refresh_token: refreshToken.token,
        scope: authCode.scope
    }
END FUNCTION
```

---

## 8. Data Synchronization and Caching Strategies

### 8.1 Cache-Aside Pattern with Refresh

```pseudocode
ALGORITHM: GetWithCache
INPUT: key (cache key), fetchFunction (function to fetch data if not cached)
OUTPUT: data (cached or freshly fetched data)

FUNCTION GetWithCache(key, fetchFunction, ttl):
    // Try to get from cache
    cached = Cache.Get(key)

    IF cached IS NOT NULL:
        // Check if data is fresh
        IF NOT cached.IsExpired():
            // Record cache hit
            RecordMetric("cache.hit", 1, {key: key})
            RETURN cached.data
        ELSE:
            // Stale data - try to refresh asynchronously
            TriggerAsyncRefresh(key, fetchFunction, ttl)

            // Return stale data for now (stale-while-revalidate)
            RecordMetric("cache.stale", 1, {key: key})
            RETURN cached.data
        END IF
    END IF

    // Cache miss - fetch data
    RecordMetric("cache.miss", 1, {key: key})

    // Use distributed lock to prevent thundering herd
    lock = AcquireDistributedLock(key, timeout = 5_seconds)

    IF lock IS NULL:
        // Another process is fetching - wait and retry
        Sleep(100_milliseconds)
        RETURN GetWithCache(key, fetchFunction, ttl)
    END IF

    TRY:
        // Double-check cache (another process might have populated it)
        cached = Cache.Get(key)
        IF cached IS NOT NULL AND NOT cached.IsExpired():
            RETURN cached.data
        END IF

        // Fetch fresh data
        data = fetchFunction()

        // Store in cache
        Cache.Set(key, data, ttl)

        RETURN data

    FINALLY:
        ReleaseLock(lock)
    END TRY
END FUNCTION


FUNCTION TriggerAsyncRefresh(key, fetchFunction, ttl):
    // Submit background task to refresh cache
    BackgroundWorker.Submit(FUNCTION():
        TRY:
            // Fetch fresh data
            data = fetchFunction()

            // Update cache
            Cache.Set(key, data, ttl)

            LogInfo("Cache refreshed", key)

        CATCH error:
            LogError("Cache refresh failed", key, error)
        END TRY
    END FUNCTION)
END FUNCTION
```

### 8.2 Write-Through Cache for Consistency

```pseudocode
ALGORITHM: WriteThrough
INPUT: key, data (data to write)
OUTPUT: success (boolean)

FUNCTION WriteThrough(key, data):
    // Use distributed transaction for consistency
    transaction = BeginDistributedTransaction()

    TRY:
        // Write to primary database
        DatabaseWrite(key, data)

        // Write to cache
        Cache.Set(key, data, ttl = DEFAULT_TTL)

        // Commit transaction
        transaction.Commit()

        // Invalidate related cache entries
        InvalidateRelatedCache(key)

        // Publish change event for other services
        PublishChangeEvent(key, data)

        RETURN true

    CATCH error:
        transaction.Rollback()
        LogError("Write-through failed", key, error)
        RETURN false
    END TRY
END FUNCTION


FUNCTION InvalidateRelatedCache(key):
    // Determine related cache keys based on data relationships
    relatedKeys = GetRelatedCacheKeys(key)

    FOR EACH relatedKey IN relatedKeys:
        Cache.Delete(relatedKey)
    END FOR

    // Publish cache invalidation event
    CacheInvalidationBus.Publish({
        type: "INVALIDATION",
        keys: relatedKeys,
        timestamp: CurrentTimestamp()
    })
END FUNCTION
```

### 8.3 Data Synchronization Between Services

```pseudocode
ALGORITHM: SynchronizeData
INPUT: sourceService, targetService, syncConfig
OUTPUT: syncResult (sync statistics and status)

FUNCTION SynchronizeData(sourceService, targetService, syncConfig):
    syncResult = {
        itemsProcessed: 0,
        itemsSuccess: 0,
        itemsFailed: 0,
        errors: empty list
    }

    // Get last sync timestamp
    lastSync = GetLastSyncTimestamp(sourceService, targetService)

    // Fetch changes since last sync
    changes = FetchChanges(
        service = sourceService,
        since = lastSync,
        batchSize = syncConfig.batchSize
    )

    WHILE changes.HasMore():
        batch = changes.GetNextBatch()
        syncResult.itemsProcessed += batch.length

        FOR EACH change IN batch:
            TRY:
                // Transform data to target schema
                transformedData = TransformData(change, syncConfig.transformation)

                // Apply change to target
                SWITCH change.type:
                    CASE "CREATE":
                        targetService.Create(transformedData)

                    CASE "UPDATE":
                        targetService.Update(change.id, transformedData)

                    CASE "DELETE":
                        targetService.Delete(change.id)
                END SWITCH

                syncResult.itemsSuccess += 1

            CATCH ConflictError AS e:
                // Handle conflict with resolution strategy
                resolved = ResolveConflict(change, e, syncConfig.conflictResolution)
                IF resolved:
                    syncResult.itemsSuccess += 1
                ELSE:
                    syncResult.itemsFailed += 1
                    syncResult.errors.Add(e)
                END IF

            CATCH error AS e:
                syncResult.itemsFailed += 1
                syncResult.errors.Add(error)
                LogError("Sync failed for item", change.id, error)
            END TRY
        END FOR

        // Update last sync timestamp
        UpdateLastSyncTimestamp(sourceService, targetService, batch.lastTimestamp)
    END WHILE

    // Record sync metrics
    RecordMetric("data.sync.completed", 1, {
        source: sourceService,
        target: targetService,
        success: syncResult.itemsSuccess,
        failed: syncResult.itemsFailed
    })

    RETURN syncResult
END FUNCTION


FUNCTION ResolveConflict(change, conflict, strategy):
    SWITCH strategy:
        CASE "LAST_WRITE_WINS":
            IF change.timestamp > conflict.existingTimestamp:
                targetService.Update(change.id, change.data, force = true)
                RETURN true
            END IF
            RETURN false

        CASE "SOURCE_WINS":
            targetService.Update(change.id, change.data, force = true)
            RETURN true

        CASE "MERGE":
            mergedData = MergeData(change.data, conflict.existingData)
            targetService.Update(change.id, mergedData)
            RETURN true

        CASE "MANUAL":
            // Queue for manual resolution
            ConflictQueue.Add(change, conflict)
            RETURN false

        DEFAULT:
            RETURN false
    END SWITCH
END FUNCTION
```

### 8.4 Change Data Capture (CDC) Pattern

```pseudocode
ALGORITHM: ProcessChangeDataCapture
INPUT: changeStream (database change stream)
OUTPUT: none (processes changes continuously)

FUNCTION ProcessChangeDataCapture(changeStream):
    WHILE true:
        TRY:
            change = changeStream.GetNext(timeout = 1_second)

            IF change IS NULL:
                CONTINUE  // No changes
            END IF

            // Determine change type
            SWITCH change.operation:
                CASE "INSERT":
                    HandleInsert(change)

                CASE "UPDATE":
                    HandleUpdate(change)

                CASE "DELETE":
                    HandleDelete(change)
            END SWITCH

            // Acknowledge change processing
            changeStream.Acknowledge(change.id)

        CATCH error:
            LogError("CDC processing error", error)
            Sleep(1_second)  // Back off on error
        END TRY
    END WHILE
END FUNCTION


FUNCTION HandleInsert(change):
    // Invalidate relevant caches
    InvalidateCacheForTable(change.table)

    // Publish event for downstream consumers
    EventBus.Publish({
        type: "DATA_CREATED",
        table: change.table,
        id: change.newData.id,
        data: change.newData,
        timestamp: change.timestamp
    })

    // Trigger any dependent computations
    TriggerDependentUpdates(change.table, change.newData.id)

    // Update materialized views
    UpdateMaterializedViews(change.table, change.newData)
END FUNCTION


FUNCTION HandleUpdate(change):
    // Calculate what changed
    changedFields = CalculateChangedFields(change.oldData, change.newData)

    // Invalidate caches
    InvalidateCacheForRecord(change.table, change.newData.id)

    // Publish update event
    EventBus.Publish({
        type: "DATA_UPDATED",
        table: change.table,
        id: change.newData.id,
        changedFields: changedFields,
        oldData: change.oldData,
        newData: change.newData,
        timestamp: change.timestamp
    })

    // Update dependent data
    IF ShouldPropagateUpdate(changedFields):
        PropagateUpdate(change.table, change.newData.id, changedFields)
    END IF
END FUNCTION
```

---

## 9. Cross-Cutting Algorithmic Patterns

### 9.1 Circuit Breaker Pattern

```pseudocode
ALGORITHM: CircuitBreakerExecute
INPUT: operation (function to execute), circuitName
OUTPUT: result (operation result or fallback)

FUNCTION CircuitBreakerExecute(operation, circuitName):
    circuit = GetCircuitBreaker(circuitName)

    // Check circuit state
    SWITCH circuit.state:
        CASE "OPEN":
            // Circuit is open - reject immediately
            IF ShouldAttemptReset(circuit):
                circuit.state = "HALF_OPEN"
            ELSE:
                RecordMetric("circuit.rejected", 1, {name: circuitName})
                THROW CircuitOpenError("Circuit breaker is open")
            END IF

        CASE "HALF_OPEN":
            // Allow limited requests through
            IF circuit.halfOpenAttempts >= MAX_HALF_OPEN_ATTEMPTS:
                RecordMetric("circuit.rejected", 1, {name: circuitName})
                THROW CircuitOpenError("Circuit breaker is half-open")
            END IF
            circuit.halfOpenAttempts += 1
    END SWITCH

    // Execute operation
    startTime = CurrentTimestamp()

    TRY:
        result = operation()
        duration = CurrentTimestamp() - startTime

        // Record success
        circuit.recordSuccess()

        // Check if we should close the circuit
        IF circuit.state == "HALF_OPEN" AND circuit.shouldClose():
            circuit.state = "CLOSED"
            circuit.reset()
            LogInfo("Circuit breaker closed", circuitName)
        END IF

        RecordMetric("circuit.success", 1, {name: circuitName})
        RETURN result

    CATCH error:
        duration = CurrentTimestamp() - startTime

        // Record failure
        circuit.recordFailure()

        // Check if we should open the circuit
        IF circuit.shouldOpen():
            circuit.state = "OPEN"
            circuit.openedAt = CurrentTimestamp()
            LogWarning("Circuit breaker opened", circuitName)
            RecordMetric("circuit.opened", 1, {name: circuitName})
        END IF

        RecordMetric("circuit.failure", 1, {name: circuitName})
        THROW error
    END TRY
END FUNCTION
```

### 9.2 Retry with Exponential Backoff

```pseudocode
ALGORITHM: RetryWithBackoff
INPUT: operation, maxRetries, initialDelay
OUTPUT: result (successful operation result)

FUNCTION RetryWithBackoff(operation, maxRetries, initialDelay):
    attempt = 0
    delay = initialDelay
    lastError = null

    WHILE attempt < maxRetries:
        TRY:
            result = operation()

            IF attempt > 0:
                RecordMetric("retry.success", 1, {attempts: attempt})
            END IF

            RETURN result

        CATCH RetryableError AS error:
            lastError = error
            attempt += 1

            IF attempt >= maxRetries:
                RecordMetric("retry.exhausted", 1)
                THROW error
            END IF

            // Calculate backoff with jitter
            backoff = delay * (2 ** (attempt - 1))
            jitter = Random(0, backoff * 0.1)
            sleepTime = Min(backoff + jitter, MAX_BACKOFF)

            LogInfo("Retrying operation", {
                attempt: attempt,
                delay: sleepTime,
                error: error.message
            })

            Sleep(sleepTime)

        CATCH NonRetryableError AS error:
            // Don't retry certain errors
            THROW error
        END TRY
    END WHILE

    THROW lastError
END FUNCTION
```

---

## Design Decision Notes

### Performance Considerations
1. **Parallel Processing**: Data aggregation uses worker pools to fetch from multiple sources concurrently
2. **Caching Strategy**: Multi-level caching (L1: in-memory, L2: distributed cache, L3: database)
3. **Async Operations**: Non-blocking audit logging and metric emission
4. **Batch Processing**: Audit events processed in batches for efficiency

### Security Considerations
1. **Defense in Depth**: Multiple layers of authentication and authorization
2. **Constant-Time Operations**: Password verification uses constant-time comparison
3. **Token Revocation**: Session tokens can be revoked centrally
4. **Audit Trail**: All security-relevant operations are logged

### Reliability Considerations
1. **Circuit Breakers**: Prevent cascade failures when external services are down
2. **Graceful Degradation**: Return stale cached data when fresh data unavailable
3. **Retry Logic**: Exponential backoff with jitter prevents thundering herd
4. **Distributed Locks**: Prevent cache stampede during cache misses

### Scalability Considerations
1. **Horizontal Scaling**: Stateless API handlers can scale horizontally
2. **Stream Processing**: Real-time metrics use streaming aggregation
3. **Event-Driven Architecture**: CDC pattern enables loose coupling between services
4. **Partitioning**: Audit logs partitioned by time for query performance

---

*This pseudocode specification provides the algorithmic foundation for implementing the LLM Governance Dashboard system. Each algorithm includes error handling, logging, metrics, and security considerations appropriate for a production system.*
