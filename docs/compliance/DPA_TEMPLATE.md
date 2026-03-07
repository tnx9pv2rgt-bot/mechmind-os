# Data Processing Agreement (DPA)
## Article 28 GDPR Compliance Template

**Version:** 1.0  
**Effective Date:** {EFFECTIVE_DATE}  
**Last Updated:** 2026-02-28  

---

## 1. Parties to this Agreement

### 1.1 Data Controller
**Name:** {CONTROLLER_NAME}  
**Address:** {CONTROLLER_ADDRESS}  
**Contact:** {CONTROLLER_EMAIL}  
**Role:** Automotive repair shop using MechMind OS platform

### 1.2 Data Processor
**Name:** MechMind Technologies S.r.l.  
**Address:** Via Example 123, 00100 Roma, Italy  
**DPO Contact:** dpo@mechmind.io  
**Role:** Provider of AI voice booking and customer management SaaS

---

## 2. Subject Matter and Duration

### 2.1 Subject Matter
Processing of personal data in connection with:
- AI-powered voice booking system for automotive repair appointments
- Customer relationship management for automotive repair shops
- Automated voice communication with customers
- Analytics and reporting for repair shop operations

### 2.2 Duration
This DPA is effective from {START_DATE} and continues until:
- The service agreement between parties is terminated, OR
- All personal data has been returned or deleted per Section 9

---

## 3. Nature and Purpose of Processing

### 3.1 Processing Activities
| Activity | Purpose | Legal Basis |
|----------|---------|-------------|
| Voice call handling | Enable AI booking assistance | Contract performance (Art. 6(1)(b)) |
| Customer data storage | Maintain booking records | Contract performance (Art. 6(1)(b)) |
| Vehicle information tracking | Service history management | Legitimate interest (Art. 6(1)(f)) |
| Call recording | Quality assurance and training | Consent (Art. 6(1)(a)) |
| Analytics aggregation | Service improvement | Legitimate interest (Art. 6(1)(f)) |

### 3.2 Categories of Data Subjects
- Vehicle owners and drivers (customers)
- Prospective customers
- Shop staff and mechanics
- Emergency contacts

---

## 4. Types of Personal Data Processed

### 4.1 Personal Data Categories
| Category | Examples | Encryption |
|----------|----------|------------|
| **Identity Data** | Name, surname | AES-256 at rest |
| **Contact Data** | Phone numbers, email addresses | AES-256 at rest |
| **Vehicle Data** | License plates, VIN, make/model | AES-256 at rest |
| **Booking Data** | Appointment dates, service types | Encrypted in transit |
| **Voice Data** | Call recordings | AES-256, 30-day retention |
| **Payment Data** | Transaction references | Tokenized |

### 4.2 Special Categories
**Processing of special category data:** Limited to health data only when:
- Explicitly required for vehicle adaptations (disability-related)
- Explicit consent obtained and documented
- Stored with enhanced encryption and access controls

---

## 5. Data Sub-processors

### 5.1 Approved Sub-processors
| Sub-processor | Service | Location | Data Processed | SCCs |
|---------------|---------|----------|----------------|------|
| **Vapi.ai** | Voice AI platform | USA | Voice calls, transcripts | Standard Contractual Clauses |
| **Twilio** | Telephony infrastructure | USA | Phone numbers, call metadata | Standard Contractual Clauses |
| **AWS** | Cloud infrastructure | EU (Frankfurt) | All data types | EU Data Processing Addendum |
| **SendGrid (Twilio)** | Email delivery | USA | Email addresses, content | Standard Contractual Clauses |

### 5.2 Sub-processor Changes
MechMind will:
- Notify Controller of any intended changes to sub-processors
- Provide 30 days' notice before adding new sub-processors
- Allow Controller to object to changes based on data protection concerns
- Make current sub-processor list available at: https://mechmind.io/sub-processors

---

## 6. Obligations of the Processor

### 6.1 Processing Instructions
MechMind shall process personal data ONLY:
- In accordance with documented instructions from Controller
- As required by Union or Member State law
- For the purposes specified in Section 3

### 6.2 Confidentiality
All personnel processing personal data:
- Are bound by confidentiality obligations
- Have undergone data protection training
- Access is granted on least-privilege basis

### 6.3 Security Measures
| Measure | Implementation |
|---------|----------------|
| **Encryption at Rest** | AES-256 for all databases (pgcrypto) |
| **Encryption in Transit** | TLS 1.3 for all communications |
| **Access Control** | Row Level Security (RLS), JWT authentication |
| **Audit Logging** | Comprehensive audit logs for all data access |
| **Network Security** | VPC isolation, WAF, DDoS protection |
| **Penetration Testing** | Annual third-party security assessments |

### 6.4 Data Minimization
MechMind shall:
- Collect only data necessary for specified purposes
- Implement automated data retention policies
- Anonymize data when possible for analytics

---

## 7. Data Subject Rights Support

### 7.1 Response Times
| Request Type | SLA | Process |
|--------------|-----|---------|
| **Access (Art. 15)** | 30 days | Automated export via API |
| **Rectification (Art. 16)** | 30 days | Direct update in system |
| **Erasure (Art. 17)** | 30 days (24h for automated) | Anonymization + deletion |
| **Restriction (Art. 18)** | 30 days | Processing flag |
| **Portability (Art. 20)** | 30 days | JSON/CSV export |
| **Objection (Art. 21)** | Immediate | Marketing opt-out |

### 7.2 Assistance Provided
MechMind will:
- Provide technical means to fulfill data subject requests
- Notify Controller of requests received directly
- Assist with identity verification procedures
- Maintain audit trail of all requests and responses

---

## 8. Data Breach Notification

### 8.1 Breach Response Timeline
| Action | Timeline |
|--------|----------|
| Detection to Assessment | 1 hour |
| Processor to Controller | Within 24 hours |
| Controller to DPA | Within 72 hours of awareness |
| Data Subject Notification | Without undue delay if high risk |

### 8.2 Breach Notification Content
- Nature of breach (categories and approximate number of data subjects)
- Likely consequences
- Measures taken or proposed
- Contact for more information (DPO)

### 8.3 Security Incidents
MechMind will immediately notify Controller of:
- Unauthorized access to personal data
- Accidental destruction or loss
- Any breach of confidentiality obligations
- Any sub-processor security incident

---

## 9. Data Return and Deletion

### 9.1 Data Return
Upon termination, MechMind will:
- Provide export of all Controller data in JSON/CSV format
- Include full audit logs of processing activities
- Transfer within 30 days of termination

### 9.2 Data Deletion
Following data return:
- All personal data will be permanently deleted
- Backups purged per retention schedule (30 days)
- Certificates of destruction provided upon request
- Anonymized statistical data may be retained

### 9.3 Legal Retention
Data may be retained where required by law:
- Tax records: 10 years (Italy)
- Legal claims: Until statute of limitations expires
- With Controller's explicit consent for dispute resolution

---

## 10. Audit and Inspection Rights

### 10.1 Audit Rights
Controller may audit MechMind:
- Once annually at no cost
- Additional audits if non-compliance suspected
- With 30 days' notice (except in case of suspected breach)

### 10.2 Audit Scope
- Compliance with this DPA
- Security measures effectiveness
- Sub-processor compliance
- Data subject request handling

### 10.3 Audit Reports
MechMind will provide:
- Annual SOC 2 Type II reports
- Penetration test summaries
- Sub-processor audit certificates
- Data protection impact assessments

---

## 11. Data Protection Impact Assessment

### 11.1 DPIA Cooperation
MechMind will assist Controller with:
- Systematic description of processing
- Assessment of necessity and proportionality
- Risk assessment for rights and freedoms
- Mitigation measures identification

### 11.2 High-Risk Processing
For processing likely to result in high risk:
- Prior consultation with supervisory authority
- Enhanced security measures
- Regular compliance reviews

---

## 12. International Data Transfers

### 12.1 Transfer Mechanisms
All transfers outside EEA use:
- Standard Contractual Clauses (2021/914)
- Adequacy decisions where applicable
- Additional safeguards for sensitive transfers

### 12.2 Transfer Impact Assessment
MechMind has conducted TIAs for:
- Vapi.ai (USA) - Law enforcement access assessed
- Twilio (USA) - Government access evaluated
- AWS (EU) - No transfer, EU-only regions

---

## 13. Liability and Indemnification

### 13.1 Liability
Each party's liability for GDPR violations:
- Limited to direct damages
- Subject to applicable law limitations
- Does not exclude liability for gross negligence or willful misconduct

### 13.2 Indemnification
MechMind will indemnify Controller for:
- Breaches of this DPA
- Unauthorized processing by sub-processors
- Security failures attributable to MechMind

---

## 14. Termination

### 14.1 Termination for Cause
Either party may terminate immediately for:
- Material breach of GDPR obligations
- Insolvency or bankruptcy
- Unauthorized sub-processing

### 14.2 Post-Termination
Obligations survive termination:
- Data return and deletion (Section 9)
- Confidentiality obligations
- Audit rights for retention period

---

## 15. Governing Law and Jurisdiction

### 15.1 Governing Law
This DPA is governed by: **Italian Law**

### 15.2 Jurisdiction
Disputes resolved in: **Courts of Rome, Italy**

### 15.3 Supervisory Authority
Lead Supervisory Authority: **Garante per la Protezione dei Dati Personali**

---

## 16. Signatures

**Data Controller:**

Name: _________________________

Title: _________________________

Date: _________________________

Signature: _________________________

---

**Data Processor (MechMind):**

Name: _________________________

Title: Data Protection Officer

Date: _________________________

Signature: _________________________

---

## Appendices

### Appendix A: Technical and Organizational Measures
Detailed security specifications available at: https://mechmind.io/security

### Appendix B: Data Retention Schedule
| Data Type | Retention Period | Trigger Event |
|-----------|------------------|---------------|
| Customer PII | 7 years | Last activity |
| Booking records | 7 years | Service completion |
| Call recordings | 30 days | Call completion |
| Audit logs | 1 year | Event occurrence |
| Backup data | 30 days | Backup creation |

### Appendix C: Incident Response Contacts
| Role | Name | Email | Phone |
|------|------|-------|-------|
| DPO | Privacy Team | dpo@mechmind.io | +39 XXX XXXXXXX |
| Security | Security Team | security@mechmind.io | +39 XXX XXXXXXX |
| Support | Support Team | support@mechmind.io | +39 XXX XXXXXXX |

---

*This Data Processing Agreement constitutes the entire agreement between parties regarding data protection for MechMind OS services.*
