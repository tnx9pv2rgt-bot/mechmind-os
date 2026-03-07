# GDPR Incident Response Runbook
## 72-Hour Breach Notification Procedure

**Version:** 1.0  
**Effective Date:** 2026-02-28  
**Review Cycle:** Quarterly  
**Owner:** Data Protection Officer (dpo@mechmind.io)

---

## 1. Incident Classification

### 1.1 Personal Data Breach Definition (GDPR Art. 4(12))
A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored or otherwise processed.

### 1.2 Severity Levels

| Level | Criteria | Response Time | Notification Required |
|-------|----------|---------------|----------------------|
| **CRITICAL** | >10,000 data subjects; sensitive data; ongoing exposure | Immediate | DPA within 24h, subjects immediately |
| **HIGH** | 1,000-10,000 data subjects; financial data; confirmed access | 1 hour | DPA within 48h, subjects within 72h |
| **MEDIUM** | 100-1,000 data subjects; limited data types | 4 hours | DPA within 72h if risk assessed |
| **LOW** | <100 data subjects; encrypted data; no sensitive data | 24 hours | Internal assessment only |

### 1.3 Breach Types

| Type | Examples | Default Severity |
|------|----------|------------------|
| **Confidentiality** | Unauthorized access, data leak, misdirected email | HIGH |
| **Integrity** | Data modification, ransomware, corruption | HIGH |
| **Availability** | System outage, DDoS, data loss | MEDIUM |
| **Physical** | Lost laptop, stolen device, unauthorized entry | MEDIUM |

---

## 2. Incident Response Team

### 2.1 Roles and Contacts

| Role | Name/Team | Contact | Responsibility |
|------|-----------|---------|----------------|
| **Incident Commander** | On-call Security Lead | security@mechmind.io | Overall incident management |
| **DPO** | Privacy Team | dpo@mechmind.io | Regulatory notifications |
| **Legal Counsel** | External (DLA Piper) | +39 02 XXXX XXXX | Legal assessment |
| **Engineering Lead** | CTO/VP Engineering | engineering@mechmind.io | Technical containment |
| **Communications** | PR Team | comms@mechmind.io | External communications |
| **Customer Success** | Support Lead | support@mechmind.io | Customer notifications |

### 2.2 Escalation Matrix

| Time | Action | Contact |
|------|--------|---------|
| T+0 | Incident detected | On-call Engineer |
| T+15 min | Incident confirmed | Incident Commander |
| T+30 min | DPO notified | DPO (dpo@mechmind.io) |
| T+1 hour | Legal assessment initiated | Legal Counsel |
| T+4 hours | Executive briefing | CEO/CTO |
| T+24 hours | DPA notification if required | DPO |
| T+72 hours | Data subject notification if required | DPO + Comms |

---

## 3. Response Procedures

### 3.1 Phase 1: Detection and Assessment (T+0 to T+1 hour)

#### Step 1: Initial Detection
```bash
# Check security monitoring alerts
# Review logs for anomalies
# Verify with alerting system (PagerDuty)
```

#### Step 2: Incident Declaration
```bash
# Create incident in incident management system
# Assign incident commander
# Start incident timer (72-hour countdown)
incident create --severity=HIGH --title="Potential Data Breach" --dpo-notified
```

#### Step 3: Initial Assessment
**Questions to Answer:**
- [ ] What data was involved? (Types, categories, volume)
- [ ] How many data subjects affected?
- [ ] When did the breach occur?
- [ ] Is the breach ongoing?
- [ ] What is the likely consequence?
- [ ] Is data encrypted or pseudonymized?

**Assessment Checklist:**
```markdown
1. Data Involved:
   [ ] Customer PII (names, emails, phones)
   [ ] Vehicle information
   [ ] Booking records
   [ ] Call recordings
   [ ] Financial data
   [ ] Authentication credentials
   [ ] Special category data (health, etc.)

2. Volume:
   [ ] < 100 records
   [ ] 100 - 1,000 records
   [ ] 1,000 - 10,000 records
   [ ] > 10,000 records

3. Timeframe:
   [ ] Detected immediately
   [ ] Detected within 24 hours
   [ ] Detected within 7 days
   [ ] Unknown duration

4. Consequences:
   [ ] Identity theft risk
   [ ] Financial loss risk
   [ ] Discrimination risk
   [ ] Reputational damage
   [ ] No significant impact
```

### 3.2 Phase 2: Containment (T+1 to T+4 hours)

#### Step 1: Immediate Containment
```bash
# 1. Isolate affected systems
kubectl delete deployment affected-service --namespace production
aws waf create-web-acl --name incident-block

# 2. Revoke compromised credentials
aws iam update-access-key --access-key-id AKIA... --status Inactive
revoke-session --user-id compromised-user

# 3. Block malicious IPs
iptables -A INPUT -s MALICIOUS_IP -j DROP

# 4. Enable enhanced logging
aws cloudwatch put-logging-options --log-level DEBUG
```

#### Step 2: Evidence Preservation
```bash
# Create forensic snapshots
# DO NOT: Delete logs, restart systems, or modify data
aws ec2 create-snapshot --volume-id vol-xxx --description "INCIDENT-YYYY-MM-DD-XXX"

# Secure logs
tar -czf /secure/incident-$(date +%Y%m%d-%H%M%S)-logs.tar.gz /var/log/

# Database snapshot
pg_dump -Fc mechmind_prod > /secure/incident-$(date +%Y%m%d-%H%M%S).dump
```

#### Step 3: Impact Assessment
```sql
-- Query affected customers (run in read-only mode)
SELECT COUNT(DISTINCT customer_id) as affected_customers,
       COUNT(*) as affected_records,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM audit_log
WHERE action = 'UNAUTHORIZED_ACCESS'
  AND created_at >= 'YYYY-MM-DD HH:MM:SS';
```

### 3.3 Phase 3: Notification Decision (T+4 to T+24 hours)

#### DPO Assessment Framework

**DPA Notification Required When:**
1. Likely to result in risk to rights and freedoms of natural persons
2. Sensitive data involved (Art. 9)
3. > 1000 data subjects affected
4. Financial data accessed
5. Data not encrypted

**Data Subject Notification Required When:**
1. High risk to rights and freedoms (Art. 34)
2. Sensitive data involved
3. Financial loss likely
4. Identity theft risk

#### Notification Decision Matrix

| Data Type | Encrypted | Volume | DPA Notify | Subject Notify |
|-----------|-----------|--------|------------|----------------|
| PII | Yes | < 100 | No | No |
| PII | No | < 100 | Assess | Assess |
| PII | No | 100-1000 | Yes | Assess |
| PII | Any | > 1000 | Yes | Yes |
| Financial | Any | Any | Yes | Yes |
| Special Cat. | Any | Any | Yes | Yes |

### 3.4 Phase 4: Notifications (T+24 to T+72 hours)

#### DPA Notification (within 72 hours)

**Lead Authority:**
- **Garante per la Protezione dei Dati Personali**
- Email: garante@gpdp.it
- Web form: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/1089924
- Phone: +39 06 696771

**Notification Content:**
```
1. Nature of the personal data breach
   - Categories of data involved
   - Approximate number of data subjects
   - Approximate number of personal data records concerned

2. Name and contact details of the DPO
   - Name: MechMind DPO
   - Email: dpo@mechmind.io
   - Phone: +39 XXX XXXXXXX

3. Likely consequences of the breach
   - Risk assessment summary
   - Potential impact on data subjects

4. Measures taken or proposed
   - Containment actions
   - Mitigation measures
   - Prevention steps

5. Cross-border notification
   - Other affected DPAs (if applicable)
```

#### Data Subject Notification

**Timing:** Without undue delay if high risk

**Channels:**
- Email (primary)
- SMS (if phone available)
- In-app notification
- Website banner (if widespread)

**Template:** See Section 5.1

---

## 4. Recovery and Post-Incident

### 4.1 System Recovery
```bash
# 1. Verify containment is effective
# 2. Apply security patches
# 3. Restore from clean backups if needed
# 4. Re-enable systems with monitoring
# 5. Verify data integrity

# Security patch deployment
kubectl apply -f security-patches/

# Re-enable service
kubectl rollout undo deployment affected-service
```

### 4.2 Post-Incident Review (within 1 week)

**Required Attendees:**
- Incident Commander
- DPO
- Engineering Lead
- Security Team
- Legal Counsel (if applicable)

**Review Agenda:**
1. Timeline reconstruction
2. Root cause analysis
3. Impact assessment validation
4. Response effectiveness
5. Lessons learned
6. Action items

**Deliverables:**
- [ ] Incident Report
- [ ] Root Cause Analysis
- [ ] Remediation Plan
- [ ] Policy/Procedure Updates

### 4.3 Documentation Retention

| Document | Retention Period | Location |
|----------|------------------|----------|
| Incident Report | 3 years | Secure storage |
| DPA Notification | 3 years | Legal files |
| Evidence Snapshots | 1 year | Encrypted S3 |
| Audit Logs | 7 years | WORM storage |
| Communication Records | 3 years | Legal files |

---

## 5. Notification Templates

### 5.1 Data Subject Notification Template

**Subject:** Important Security Notice Regarding Your Data

```
Dear [Customer Name],

We are writing to inform you of a security incident that may have affected your personal data in our system.

WHAT HAPPENED
On [Date], we discovered that [brief description of incident]. We immediately took steps to secure our systems and investigate the incident.

WHAT INFORMATION WAS INVOLVED
The incident may have involved the following information:
- [List specific data types]
- [e.g., Name and phone number]
- [e.g., Vehicle registration information]
- [e.g., Service booking history]

IMPORTANT: Your payment information was NOT affected.

WHAT WE ARE DOING
Upon discovering this incident, we immediately:
- Secured the affected systems
- Engaged cybersecurity experts
- Reported to relevant authorities
- Implemented additional security measures

WHAT YOU CAN DO
We recommend you take the following precautions:
- Be vigilant for suspicious communications
- Do not click links in unexpected emails
- Monitor your accounts for unusual activity
- Report any suspicious activity to us immediately

FOR MORE INFORMATION
We have established a dedicated support line for this incident:
- Email: security@mechmind.io
- Phone: +39 XXX XXXXXXX
- Web: https://mechmind.io/security-notice

We sincerely apologize for any inconvenience this may cause.

Sincerely,
MechMind Security Team

Reference: INCIDENT-[ID]
```

### 5.2 DPA Notification Template

**To:** Garante per la Protezione dei Dati Personali  
**From:** MechMind Technologies S.r.l.  
**Date:** [Date]  
**Re:** Personal Data Breach Notification - Article 33 GDPR

```
1. DATA CONTROLLER INFORMATION
   - Name: MechMind Technologies S.r.l.
   - Address: Via Example 123, 00100 Roma, Italy
   - DPO: dpo@mechmind.io

2. BREACH DETAILS
   - Date of breach: [Date]
   - Date of detection: [Date]
   - Description: [Brief description]

3. DATA INVOLVED
   - Categories: [List categories]
   - Data subjects: [Approximate number]
   - Records: [Approximate number]
   - Special categories: [Yes/No]

4. CONSEQUENCES
   - Likely consequences: [Assessment]
   - Risk level: [HIGH/MEDIUM/LOW]

5. MEASURES TAKEN
   - Containment: [Actions]
   - Assessment: [Actions]
   - Mitigation: [Actions]

6. COMMUNICATION TO DATA SUBJECTS
   - Planned date: [Date]
   - Method: [Email/SMS/etc.]

7. CONTACT
   - Name: [DPO Name]
   - Email: dpo@mechmind.io
   - Phone: +39 XXX XXXXXXX
```

### 5.3 Internal Incident Declaration Template

```markdown
INCIDENT DECLARATION
===================

Incident ID: INC-[YYYY-MM-DD]-[NNN]
Detected: [Timestamp]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Status: [DETECTED/CONTAINED/RESOLVED]

SUMMARY
-------
[Brief description]

AFFECTED SYSTEMS
----------------
- [System 1]
- [System 2]

AFFECTED DATA
-------------
- [Data type]: [Volume]
- [Data type]: [Volume]

IMMEDIATE ACTIONS
-----------------
1. [Action 1]
2. [Action 2]

NOTIFICATION STATUS
-------------------
- [ ] DPO notified
- [ ] Legal counsel consulted
- [ ] DPA notification prepared
- [ ] Customer notification prepared

INCIDENT COMMANDER
------------------
Name: [Name]
Contact: [Phone/Email]
```

---

## 6. Compliance Checklist

### 6.1 GDPR Article 33 Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Notified within 72 hours | ☐ | Timestamp |
| Nature of breach described | ☐ | Incident report |
| DPO contact provided | ☐ | DPO details |
| Consequences assessed | ☐ | Risk assessment |
| Measures taken documented | ☐ | Action log |
| Cross-border notification | ☐ | Other DPAs |

### 6.2 GDPR Article 34 Checklist (Data Subject Notification)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| High risk established | ☐ | Risk assessment |
| Notification without undue delay | ☐ | Timestamps |
| Clear and plain language | ☐ | Message review |
| Contact details provided | ☐ | DPO contact |
| Consequences described | ☐ | Impact analysis |
| Measures taken described | ☐ | Action log |

---

## 7. Training and Drills

### 7.1 Annual Training Requirements

| Role | Training | Frequency |
|------|----------|-----------|
| All Staff | Data protection basics | Annual |
| Engineers | Secure coding, incident response | Annual |
| Support | Breach identification | Annual |
| Management | GDPR compliance, notification requirements | Annual |
| DPO | Advanced privacy law | Annual + CPE |

### 7.2 Incident Response Drills

| Drill Type | Frequency | Participants |
|------------|-----------|--------------|
| Tabletop exercise | Quarterly | IRT, DPO |
| Technical simulation | Bi-annually | Engineering, Security |
| Full-scale drill | Annually | All stakeholders |
| Recovery test | Annually | Engineering |

---

## 8. Appendices

### Appendix A: Regulatory Contacts

| Authority | Jurisdiction | Contact | Emergency |
|-----------|--------------|---------|-----------|
| Garante | Italy | garante@gpdp.it | +39 06 696771 |
| CNIL | France | accueil@cnil.fr | +33 1 53 73 22 22 |
| ICO | UK | casework@ico.org.uk | +44 303 123 1113 |
| BfDI | Germany | mailbox@bfdi.bund.de | +49 228 997799-0 |

### Appendix B: Cyber Insurance

- **Provider:** [Insurance Provider]
- **Policy Number:** [Policy #]
- **Coverage:** [Amount]
- **Contact:** [24h hotline]
- **Claims:** [Process]

### Appendix C: Forensics Partners

| Provider | Service | Contact | SLA |
|----------|---------|---------|-----|
| [Firm 1] | Digital forensics | [Contact] | 4 hours |
| [Firm 2] | Legal forensics | [Contact] | 24 hours |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-28 | DPO | Initial release |

**Next Review:** 2026-05-28

**Document Owner:** dpo@mechmind.io

**Approval:** [ ] CEO [ ] CTO [ ] DPO

---

*This document contains sensitive security procedures. Handle according to classification level: CONFIDENTIAL*
