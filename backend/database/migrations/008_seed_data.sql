-- Migration 008: Seed data per sviluppo
-- Data: 2026-02-28

-- =====================================================
-- SEED DATA - CLIENTI PRIVATI
-- =====================================================
INSERT INTO customers (
    id, customer_type, email, password_hash, phone,
    email_verified, status, first_name, last_name,
    newsletter, marketing, gdpr_accepted, privacy_accepted,
    gdpr_accepted_at, privacy_accepted_at, created_at
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'private',
    'mario.rossi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393471234567',
    TRUE,
    'active',
    'Mario',
    'Rossi',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '30 days'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'private',
    'giulia.bianchi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393481234567',
    FALSE,
    'pending_email_verification',
    'Giulia',
    'Bianchi',
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '1 day'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'private',
    'luca.verdi@example.com',
    crypt('TestPassword123!', gen_salt('bf')),
    '+393491234567',
    TRUE,
    'suspended',
    'Luca',
    'Verdi',
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA - CLIENTI BUSINESS
-- =====================================================
INSERT INTO customers (
    id, customer_type, email, password_hash, phone,
    email_verified, status, business_name, business_type,
    vat_number, vat_verified, address, postal_code, city, province,
    pec_email, sdi_code,
    newsletter, marketing, marketing_channels,
    gdpr_accepted, privacy_accepted,
    gdpr_accepted_at, privacy_accepted_at, created_at
) VALUES 
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'business',
    'info@techsolutions.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390212345678',
    TRUE,
    'active',
    'Tech Solutions S.r.l.',
    'S.r.l.',
    '12345678901',
    TRUE,
    'Via Roma 123',
    '20121',
    'Milano',
    'MI',
    'techsolutions@pec.it',
    'ABC1234',
    TRUE,
    TRUE,
    ARRAY['email', 'sms'],
    TRUE,
    TRUE,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'business',
    'amministrazione@designstudio.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390612345678',
    TRUE,
    'active',
    'Design Studio S.r.l.s.',
    'S.r.l.s.',
    '10987654321',
    FALSE,
    'Via Milano 456',
    '00185',
    'Roma',
    'RM',
    'designstudio@pec.it',
    'XYZ5678',
    FALSE,
    TRUE,
    ARRAY['email'],
    TRUE,
    TRUE,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'business',
    'contatti@consulenzepro.it',
    crypt('TestPassword123!', gen_salt('bf')),
    '+390112345678',
    FALSE,
    'pending_email_verification',
    'Consulenze Pro S.a.s.',
    'S.a.s.',
    '11223344556',
    FALSE,
    'Corso Torino 789',
    '10123',
    'Torino',
    'TO',
    'consulenzepro@pec.it',
    'DEF9012',
    TRUE,
    FALSE,
    NULL,
    TRUE,
    TRUE,
    NOW(),
    NOW(),
    NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA - TOKEN DI VERIFICA
-- =====================================================
INSERT INTO email_verification_tokens (
    id, customer_id, token, expires_at, used, used_at, created_at
) VALUES 
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'verified_token_mario_123456789',
    NOW() - INTERVAL '1 day',
    TRUE,
    NOW() - INTERVAL '29 days',
    NOW() - INTERVAL '30 days'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'pending_token_giulia_123456789',
    NOW() + INTERVAL '23 hours',
    FALSE,
    NULL,
    NOW() - INTERVAL '1 hour'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'verified_token_tech_123456789',
    NOW() - INTERVAL '10 days',
    TRUE,
    NOW() - INTERVAL '44 days',
    NOW() - INTERVAL '45 days'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'pending_token_cons_123456789',
    NOW() + INTERVAL '23 hours',
    FALSE,
    NULL,
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA - CACHE P.IVA
-- =====================================================
INSERT INTO vat_verifications (
    id, vat_number, is_valid, found_in_registry, ragione_sociale,
    indirizzo, cap, città, provincia, verified_at, expires_at
) VALUES 
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41',
    '12345678901',
    TRUE,
    TRUE,
    'Tech Solutions S.r.l.',
    'Via Roma 123',
    '20121',
    'Milano',
    'MI',
    NOW() - INTERVAL '45 days',
    NOW() + INTERVAL '45 days'
),
(
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    '10987654321',
    FALSE,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA - LOG AUDIT
-- =====================================================
INSERT INTO signup_audit_log (
    id, customer_id, event_type, ip_address, user_agent, form_data, created_at
) VALUES 
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'signup',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0',
    '{"customer_type": "private", "first_name": "Mario", "last_name": "Rossi", "email": "mario.rossi@example.com"}'::jsonb,
    NOW() - INTERVAL '30 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'email_verified',
    '192.168.1.100',
    NULL,
    '{"token_used": "verified_token_mario_123456789"}'::jsonb,
    NOW() - INTERVAL '29 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
    'signup',
    '192.168.1.101',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.0',
    '{"customer_type": "business", "business_name": "Tech Solutions S.r.l.", "vat_number": "12345678901"}'::jsonb,
    NOW() - INTERVAL '45 days'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a54',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'status_change:suspended',
    NULL,
    NULL,
    '{"old_status": "active", "new_status": "suspended", "email_verified": true}'::jsonb,
    NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA - RATE LIMITS
-- =====================================================
INSERT INTO rate_limits (
    id, ip_address, endpoint, attempt_count, first_attempt, last_attempt, reset_at
) VALUES 
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61',
    '192.168.1.200',
    '/api/auth/login',
    3,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '5 minutes',
    NULL
),
(
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62',
    '192.168.1.201',
    '/api/auth/signup',
    5,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '23 hours'
)
ON CONFLICT (id) DO NOTHING;
