-- ============================================================================
-- Billing Tables Migration
-- ============================================================================
-- Creates tables for Stripe billing integration, subscriptions, and payments
-- ============================================================================

-- Customer billing information
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT customers_user_id_unique UNIQUE(user_id)
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_stripe_id ON customers(stripe_customer_id);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_price_id_monthly VARCHAR(255) UNIQUE,
    stripe_price_id_yearly VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'professional', 'enterprise')),
    description TEXT,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

-- Active subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'incomplete', 'incomplete_expired', 'trialing', 'active',
        'past_due', 'canceled', 'unpaid', 'paused'
    )),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50),
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    billing_details JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_customer ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(customer_id, is_default) WHERE is_default = true;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    status VARCHAR(50) CHECK (status IN (
        'draft', 'open', 'paid', 'uncollectible', 'void'
    )),
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_remaining DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    invoice_pdf VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);

-- Usage records for metered billing
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    metric_name VARCHAR(100) NOT NULL,
    quantity BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    synced_to_stripe BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    stripe_usage_record_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_records_customer ON usage_records(customer_id, timestamp DESC);
CREATE INDEX idx_usage_records_subscription ON usage_records(subscription_id, timestamp DESC);
CREATE INDEX idx_usage_records_sync ON usage_records(synced_to_stripe, timestamp) WHERE synced_to_stripe = false;
CREATE INDEX idx_usage_records_metric ON usage_records(metric_name, timestamp DESC);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    api_version VARCHAR(50),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);

-- Payment intents
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) CHECK (status IN (
        'requires_payment_method', 'requires_confirmation', 'requires_action',
        'processing', 'requires_capture', 'canceled', 'succeeded'
    )),
    client_secret VARCHAR(500),
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_customer ON payment_intents(customer_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);

-- Billing alerts and notifications
CREATE TABLE IF NOT EXISTS billing_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN (
        'payment_failed', 'subscription_ending', 'trial_ending',
        'usage_threshold', 'invoice_due', 'card_expiring'
    )),
    severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_alerts_customer ON billing_alerts(customer_id, created_at DESC);
CREATE INDEX idx_billing_alerts_acknowledged ON billing_alerts(acknowledged, created_at);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO subscription_plans (
    stripe_product_id,
    stripe_price_id_monthly,
    stripe_price_id_yearly,
    name,
    tier,
    description,
    price_monthly,
    price_yearly,
    features,
    limits,
    sort_order
) VALUES
(
    'prod_free',
    'price_free_monthly',
    NULL,
    'Free',
    'free',
    'Perfect for testing and small projects',
    0.00,
    0.00,
    '["Up to 10,000 requests/month", "Basic policy management", "7-day audit log retention", "Community support"]'::jsonb,
    '{"max_requests_monthly": 10000, "max_policies": 5, "max_users": 3, "audit_retention_days": 7}'::jsonb,
    1
),
(
    'prod_professional',
    'price_professional_monthly',
    'price_professional_yearly',
    'Professional',
    'professional',
    'For growing teams and businesses',
    99.00,
    990.00,
    '["Up to 1M requests/month", "Advanced policy engine", "90-day audit log retention", "Priority support", "Custom integrations", "Usage analytics"]'::jsonb,
    '{"max_requests_monthly": 1000000, "max_policies": 100, "max_users": 25, "audit_retention_days": 90}'::jsonb,
    2
),
(
    'prod_enterprise',
    'price_enterprise_monthly',
    'price_enterprise_yearly',
    'Enterprise',
    'enterprise',
    'For large organizations with advanced needs',
    499.00,
    4990.00,
    '["Unlimited requests", "Custom policy engine", "Unlimited audit log retention", "24/7 dedicated support", "SSO/SAML", "SLA guarantee", "On-premise deployment option", "Advanced analytics"]'::jsonb,
    '{"max_requests_monthly": -1, "max_policies": -1, "max_users": -1, "audit_retention_days": -1}'::jsonb,
    3
) ON CONFLICT (stripe_product_id) DO NOTHING;

COMMENT ON TABLE customers IS 'Stores Stripe customer information linked to platform users';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and pricing';
COMMENT ON TABLE subscriptions IS 'Active and historical subscriptions';
COMMENT ON TABLE payment_methods IS 'Customer payment methods (credit cards, etc.)';
COMMENT ON TABLE invoices IS 'Billing invoices generated by Stripe';
COMMENT ON TABLE usage_records IS 'Usage metrics for metered billing';
COMMENT ON TABLE webhook_events IS 'Log of all Stripe webhook events received';
COMMENT ON TABLE payment_intents IS 'Stripe payment intents for one-time payments';
COMMENT ON TABLE billing_alerts IS 'Notifications for billing-related events';
