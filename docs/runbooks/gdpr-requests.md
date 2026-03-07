# GDPR Data Requests Runbook

This runbook provides procedures for handling GDPR (General Data Protection Regulation) data subject requests for MechMind OS.

## Overview

MechMind OS handles personal data for:
- Customers (names, phone numbers, emails, vehicle info)
- Shop staff (names, contact info)
- Call recordings (voice data)

## Request Types

| Type | Description | SLA |
|------|-------------|-----|
| **Access** | Provide copy of personal data | 30 days |
| **Deletion** | Delete all personal data (Right to be Forgotten) | 30 days |
| **Rectification** | Correct inaccurate data | 30 days |
| **Portability** | Export data in machine-readable format | 30 days |
| **Restriction** | Limit processing of data | 30 days |

## Request Handling Process

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│  Validate   │────▶│   Verify    │
│   Received  │     │   Identity  │     │   Identity  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐     ┌──────▼──────┐
│   Confirm   │◀────│   Execute   │◀────│   Process   │
│ Completion  │     │   Request   │     │   Request   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Receiving Requests

### Channels

- Email: privacy@mechmind.io
- Web form: https://mechmind.io/privacy/request
- Mail: MechMind Privacy Team, [Address]

### Initial Triage

1. **Log the request**:
   ```
   Ticket: GDPR-{YYYY}-{NNNN}
   Type: [access/deletion/rectification/portability/restriction]
   Date Received: YYYY-MM-DD
   Requester Email: [email]
   Shop ID: [if applicable]
   ```

2. **Acknowledge receipt** within 24 hours:
   ```
   Subject: GDPR Request Acknowledged - Ticket #{ticket}
   
   Dear [Name],
   
   We have received your [type] request and are processing it.
   
   Ticket: #{ticket}
   Expected completion: [date + 30 days]
   
   We will contact you if we need additional information.
   
   Regards,
   MechMind Privacy Team
   ```

## Identity Verification

### For Customers

Required proof of identity:
- Photo ID (driver's license, passport)
- Proof of phone number ownership
- Recent booking confirmation (if available)

### For Shop Staff

Required proof:
- Employee ID or recent payslip
- Photo ID
- Email from registered shop domain

### Verification Process

```bash
# Check if requester has data in system
psql -U app_user -d mechmind_prod -c "
  SELECT id, first_name, last_name, phone, email
  FROM customers
  WHERE email = 'requester@example.com'
     OR phone = '+14155551234';
"

# Verify booking history matches ID
psql -U app_user -d mechmind_prod -c "
  SELECT b.id, b.created_at, b.service_type
  FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE c.email = 'requester@example.com'
  ORDER BY b.created_at DESC
  LIMIT 5;
"
```

## Data Access Request

### Generate Data Export

```bash
# Create export directory
EXPORT_DIR="/exports/gdpr_access_${TICKET}_${DATE}"
mkdir -p $EXPORT_DIR

# Export customer data
psql -U app_user -d mechmind_prod -c "
  COPY (
    SELECT * FROM customers
    WHERE email = 'requester@example.com'
  ) TO '${EXPORT_DIR}/customer_data.csv' WITH CSV HEADER;
"

# Export booking history
psql -U app_user -d mechmind_prod -c "
  COPY (
    SELECT b.* 
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    WHERE c.email = 'requester@example.com'
  ) TO '${EXPORT_DIR}/booking_history.csv' WITH CSV HEADER;
"

# Export vehicle information
psql -U app_user -d mechmind_prod -c "
  COPY (
    SELECT v.*
    FROM vehicles v
    JOIN customers c ON v.customer_id = c.id
    WHERE c.email = 'requester@example.com'
  ) TO '${EXPORT_DIR}/vehicles.csv' WITH CSV HEADER;
"

# Package export
tar -czf "${EXPORT_DIR}.tar.gz" $EXPORT_DIR

# Securely transfer to requester
# (Use secure file sharing service)
```

### Data Export Contents

```
gdpr_access_TICKET_DATE/
├── customer_data.csv          # Personal information
├── booking_history.csv        # All bookings
├── vehicles.csv               # Vehicle information
├── call_recordings/           # Voice call recordings
│   ├── call_20240115_001.mp3
│   └── call_20240120_002.mp3
├── communications/            # Email/SMS history
│   ├── confirmation_emails/
│   └── reminder_sms/
└── README.txt                 # Data dictionary
```

## Data Deletion Request (Right to be Forgotten)

### Pre-Deletion Checklist

- [ ] Identity verified
- [ ] Legal holds checked (no active litigation)
- [ ] Financial records preserved (anonymized)
- [ ] Backup retention period noted

### Anonymization Strategy

```sql
-- Anonymize customer (preserves booking statistics)
BEGIN;

-- Create anonymized record
INSERT INTO customers_anonymized (
  original_id,
  anonymized_at,
  booking_count,
  total_revenue
)
SELECT 
  id,
  NOW(),
  (SELECT COUNT(*) FROM bookings WHERE customer_id = c.id),
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id)
FROM customers c
WHERE email = 'requester@example.com';

-- Update bookings to reference anonymized record
UPDATE bookings
SET customer_id = '00000000-0000-0000-0000-000000000000'
WHERE customer_id IN (
  SELECT id FROM customers WHERE email = 'requester@example.com'
);

-- Delete personal data
DELETE FROM customers WHERE email = 'requester@example.com';
DELETE FROM customer_vehicles WHERE customer_id NOT IN (SELECT id FROM customers);
DELETE FROM customer_preferences WHERE customer_id NOT IN (SELECT id FROM customers);

-- Delete call recordings
DELETE FROM call_recordings WHERE customer_phone = '+14155551234';

-- Delete communications
DELETE FROM email_logs WHERE recipient = 'requester@example.com';
DELETE FROM sms_logs WHERE phone = '+14155551234';

COMMIT;
```

### Post-Deletion Verification

```sql
-- Verify deletion
SELECT COUNT(*) FROM customers WHERE email = 'requester@example.com';
-- Should return 0

-- Verify anonymized bookings preserved
SELECT COUNT(*) FROM bookings 
WHERE customer_id = '00000000-0000-0000-0000-000000000000';
-- Should show anonymized bookings

-- Check call recordings deleted
SELECT COUNT(*) FROM call_recordings WHERE customer_phone = '+14155551234';
-- Should return 0
```

### Backup Handling

Backups are retained for 30 days. Deleted data will be purged from:
- Daily backups: After 30 days
- WAL archives: After 30 days
- S3 Glacier: After 90 days (legal requirement)

## Data Rectification Request

### Process

```sql
-- Update customer information
UPDATE customers
SET 
  first_name = 'Corrected First Name',
  last_name = 'Corrected Last Name',
  phone = '+14155559999',
  updated_at = NOW()
WHERE email = 'requester@example.com';

-- Log the change for audit
INSERT INTO data_changes_log (
  table_name,
  record_id,
  change_type,
  changed_by,
  changed_at,
  gdpr_request_id
)
VALUES (
  'customers',
  (SELECT id FROM customers WHERE email = 'requester@example.com'),
  'rectification',
  'gdpr_processor',
  NOW(),
  'GDPR-2024-0001'
);
```

## Data Portability Request

### Generate Machine-Readable Export

```bash
# JSON format export
psql -U app_user -d mechmind_prod -t -A -F"," -c "
  SELECT jsonb_pretty(jsonb_agg(row_to_json(t)))
  FROM (
    SELECT * FROM customers WHERE email = 'requester@example.com'
  ) t;
" > customer_data.json

# Include all related data
cat > full_export.json <<EOF
{
  "export_date": "$(date -Iseconds)",
  "customer": $(cat customer_data.json),
  "bookings": $(psql -c "SELECT jsonb_agg(row_to_json(t)) FROM bookings t WHERE customer_id = '$CUSTOMER_ID'"),
  "vehicles": $(psql -c "SELECT jsonb_agg(row_to_json(t)) FROM vehicles t WHERE customer_id = '$CUSTOMER_ID'")
}
EOF
```

## Request Tracking

### GDPR Request Log

```sql
CREATE TABLE gdpr_requests (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  requester_email VARCHAR(255),
  requester_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'received',
  received_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  completed_at TIMESTAMP,
  data_export_url VARCHAR(500),
  notes TEXT
);

-- Log new request
INSERT INTO gdpr_requests (ticket_number, request_type, requester_email, requester_phone)
VALUES ('GDPR-2024-0001', 'deletion', 'requester@example.com', '+14155551234');
```

## Communication Templates

### Access Request Complete

```
Subject: Your Data Access Request - Ticket #GDPR-2024-0001

Dear [Name],

Your data access request has been completed.

You can download your data here: [secure link]
The link expires in 7 days.

Your data includes:
- Personal information
- Booking history (X bookings)
- Vehicle information
- Call recordings (X recordings)

If you have questions, reply to this email.

Regards,
MechMind Privacy Team
```

### Deletion Request Complete

```
Subject: Your Data Deletion Request - Ticket #GDPR-2024-0001

Dear [Name],

Your data deletion request has been completed.

We have deleted:
- Personal information
- Booking history (anonymized)
- Call recordings
- Communications

Note: Some data may remain in backups for up to 30 days,
after which it will be permanently deleted.

Regards,
MechMind Privacy Team
```

## Legal Considerations

### Exceptions to Deletion

Data may be retained for:
- Legal obligations (tax records: 7 years)
- Legal claims (until statute of limitations expires)
- Public interest (safety records)

### Documentation

Retain for 3 years:
- Request details
- Identity verification records
- Actions taken
- Communications

## Escalation

| Issue | Contact | Timeline |
|-------|---------|----------|
| Complex request | Legal team | 24 hours |
| Potential breach | Security team | Immediate |
| Legal hold | Legal counsel | 4 hours |

## Metrics

Track monthly:
- Requests received by type
- Average resolution time
- Compliance rate (target: 100% within SLA)
