# Disaster Recovery Drill Schedule

## MechMind OS v10 - DR Testing & Validation Program

**Version:** 1.0  
**Last Updated:** 2026-02-28  
**Owner:** SRE Team  
**Schedule Owner:** Platform Engineering Manager

---

## Overview

This document defines the disaster recovery testing schedule for MechMind OS v10. Regular testing ensures our DR procedures work as expected and validates our RTO/RPO targets.

## Testing Schedule Summary

| Frequency | Test Type | Duration | Participants |
|-----------|-----------|----------|--------------|
| Weekly | Automated Restore Test | 30 min | Automated |
| Monthly | Backup Integrity Check | 1 hour | SRE Team |
| Quarterly | Full Failover Simulation | 4 hours | Platform Team |
| Bi-Annually | Cross-Region DR Drill | 8 hours | Full Engineering |
| Annually | Ransomware Recovery Drill | 1 day | Full Organization |

---

## Weekly: Automated Restore Test

**Schedule:** Every Monday at 02:00 UTC (automated)  
**Duration:** ~30 minutes  
**Notification:** Slack #sre-alerts

### Scope

- Restore latest automated snapshot to temporary instance
- Verify basic connectivity
- Check critical table row counts
- Validate data integrity checksums
- Clean up test resources

### Automated Process

```bash
# Executed by: infrastructure/scripts/backup-test.sh

1. Identify latest automated snapshot
2. Create temporary restore instance
3. Wait for instance availability (10-15 min)
4. Run connectivity test
5. Verify row counts on critical tables:
   - customers
   - bookings
   - users
   - vehicles
   - tenants
6. Generate test report
7. Delete temporary instance
8. Post results to Slack
```

### Success Criteria

- [ ] Restore completes within 20 minutes
- [ ] Database connectivity test passes
- [ ] Row counts match expected ranges (±1%)
- [ ] No critical errors in logs
- [ ] Cleanup completes successfully

### Failure Response

If automated test fails:
1. Alert posted to #sre-alerts
2. On-call engineer investigates within 1 hour
3. If issue persists, escalate to Platform Lead
4. Document findings in incident tracker

### Weekly Test Report Template

```markdown
## Weekly Backup Test Report - Week of YYYY-MM-DD

### Test Execution
- Timestamp: YYYY-MM-DD HH:MM UTC
- Test ID: weekly-backup-test-{timestamp}
- Script Version: X.X.X

### Results
| Check | Status | Details |
|-------|--------|---------|
| Snapshot Identification | ✅/❌ | |
| Instance Creation | ✅/❌ | Duration: Xm |
| Connectivity Test | ✅/❌ | |
| Row Count Verification | ✅/❌ | |
| Data Integrity Check | ✅/❌ | |
| Resource Cleanup | ✅/❌ | |

### Overall Result: ✅ PASSED / ❌ FAILED

### Notes
[Any observations or anomalies]
```

---

## Monthly: Backup Integrity Check

**Schedule:** First Friday of each month at 10:00 UTC  
**Duration:** 1 hour  
**Participants:** SRE Team (2 engineers)  
**Lead:** Senior SRE Engineer

### Scope

- Full schema validation
- Data consistency checks
- Foreign key validation
- Application smoke tests
- Performance baseline comparison

### Manual Checklist

```bash
# 1. Restore from backup to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mechmind-monthly-test \
  --db-snapshot-identifier <latest-snapshot>

# 2. Wait for availability
aws rds wait db-instance-available --db-instance-identifier mechmind-monthly-test

# 3. Schema validation
pg_dump --schema-only -h <test-host> -U mechmind_admin mechmind > /tmp/schema.sql
diff /tmp/schema.sql /reference/schema.sql

# 4. Data consistency queries
psql -h <test-host> -U mechmind_admin mechmind -c "
  -- Check foreign key integrity
  SELECT 
    (SELECT count(*) FROM bookings b 
     LEFT JOIN customers c ON b.customer_id = c.id 
     WHERE c.id IS NULL) as orphaned_bookings,
    (SELECT count(*) FROM vehicles v 
     LEFT JOIN customers c ON v.customer_id = c.id 
     WHERE c.id IS NULL) as orphaned_vehicles;
"

# 5. Application smoke test
# Deploy test Lambda pointing to restored database
# Run integration test suite

# 6. Cleanup
aws rds delete-db-instance \
  --db-instance-identifier mechmind-monthly-test \
  --skip-final-snapshot
```

### Monthly Test Report Template

```markdown
## Monthly Backup Integrity Report - Month YYYY-MM

### Test Information
- Date: YYYY-MM-DD
- Participants: @engineer1, @engineer2
- Snapshot Tested: rds:mechmind-prod-YYYY-MM-DD-XX-XX

### Validation Results

#### Schema Integrity
- Tables: X/Y match
- Indexes: X/Y match
- Constraints: X/Y match
- Stored Procedures: X/Y match

#### Data Consistency
- Total Records: X
- Orphaned Records: X (acceptable threshold: < 0.01%)
- Checksum Validation: ✅/❌
- Foreign Key Integrity: ✅/❌

#### Performance Baseline
| Query | Production (ms) | Restored (ms) | Delta |
|-------|-----------------|---------------|-------|
| Customer lookup | 12 | 13 | +8% |
| Booking search | 45 | 47 | +4% |
| Dashboard load | 120 | 125 | +4% |

### Issues Found
[Document any issues or anomalies]

### Recommendations
[Any follow-up actions]
```

---

## Quarterly: Full Failover Simulation

**Schedule:** First Tuesday of Q1, Q2, Q3, Q4 at 14:00 UTC  
**Duration:** 4 hours  
**Participants:** Platform Team (all members)  
**Observers:** Engineering Leadership, Product Team

### Scope

- Complete production failover test
- Multi-AZ failover execution
- Application reconnection validation
- Customer impact assessment
- Rollback procedure verification

### Pre-Test Checklist (1 week before)

- [ ] Notify customers of maintenance window
- [ ] Verify backup completion
- [ ] Confirm on-call coverage
- [ ] Update status page
- [ ] Prepare war room (Zoom/Meet)
- [ ] Brief all participants
- [ ] Disable non-critical alerts

### Test Execution Timeline

| Time | Activity | Owner | Duration |
|------|----------|-------|----------|
| T+0 | Test kickoff | Incident Commander | 15 min |
| T+15 | Initiate forced failover | SRE Lead | 5 min |
| T+20 | Monitor failover progress | SRE Team | 10 min |
| T+30 | Verify RDS failover completion | DBA | 10 min |
| T+40 | Verify application connectivity | Platform | 15 min |
| T+55 | Run smoke tests | QA | 20 min |
| T+75 | Customer journey validation | Product | 30 min |
| T+105 | Performance validation | SRE | 20 min |
| T+125 | Document observations | All | 30 min |
| T+155 | Rollback to original AZ | SRE Lead | 30 min |
| T+185 | Verify rollback completion | Platform | 15 min |
| T+200 | Post-test review | Incident Commander | 40 min |

### Failover Execution Commands

```bash
# 1. Enable maintenance mode (read-only)
aws rds modify-db-parameter-group \
  --db-parameter-group-name mechmind-prod-postgres-params \
  --parameters ParameterName=default_transaction_read_only,ParameterValue=on

# 2. Force failover
aws rds reboot-db-instance \
  --db-instance-identifier mechmind-prod-postgres \
  --force-failover

# 3. Monitor failover progress
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier mechmind-prod-postgres \
  --query "DBInstances[0].[DBInstanceStatus,AvailabilityZone]"'

# 4. Verify new primary
aws rds describe-db-instances \
  --db-instance-identifier mechmind-prod-postgres \
  --query 'DBInstances[0].[AvailabilityZone,Endpoint.Address]'

# 5. Disable maintenance mode
aws rds modify-db-parameter-group \
  --db-parameter-group-name mechmind-prod-postgres-params \
  --parameters ParameterName=default_transaction_read_only,ParameterValue=off

# 6. Verify application health
curl -sf https://api.mechmind.io/v1/admin/health
curl -sf https://api.mechmind.io/v1/admin/ready
```

### Success Criteria

- [ ] Failover completes within 3 minutes (RTO target)
- [ ] No data loss (RPO = 0)
- [ ] Application reconnects automatically
- [ ] All smoke tests pass
- [ ] Customer-facing features functional
- [ ] Rollback completes within 5 minutes
- [ ] No alerts missed during failover

### Quarterly Test Report Template

```markdown
# Quarterly Failover Simulation Report

## Test Information
- Date: YYYY-MM-DD
- Quarter: QX 20XX
- Incident Commander: @name
- Participants: @name1, @name2, @name3

## Test Objectives
- ✅ Verify Multi-AZ failover works as expected
- ✅ Validate RTO of < 3 minutes
- ✅ Confirm zero data loss (RPO = 0)
- ✅ Test application resilience
- ✅ Validate rollback procedures

## Timeline
| Time | Event | Status |
|------|-------|--------|
| 14:00 | Test started | ✅ |
| 14:05 | Failover initiated | ✅ |
| 14:07 | Failover completed | ✅ |
| 14:10 | App reconnected | ✅ |
| 14:30 | Smoke tests passed | ✅ |
| 15:00 | Customer journey validated | ✅ |
| 16:00 | Rollback initiated | ✅ |
| 16:05 | Rollback completed | ✅ |

## Metrics
- Failover Duration: 2m 15s (Target: < 3 min) ✅
- Application Downtime: 45s ✅
- Data Loss: 0 records ✅
- Rollback Duration: 4m 30s ✅

## Issues Encountered
[Document any issues]

## Lessons Learned
[Key takeaways]

## Action Items
| Priority | Action | Owner | Due Date |
|----------|--------|-------|----------|
| P1 | | | |

## Approval
- Test Lead: _________________ Date: _______
- Platform Lead: _________________ Date: _______
```

---

## Bi-Annual: Cross-Region DR Drill

**Schedule:** March and September, third week, Wednesday 09:00 UTC  
**Duration:** 8 hours  
**Participants:** Full Engineering Team  
**Lead:** VP Engineering / CTO

### Scope

- Full regional failover simulation
- DR environment activation
- DNS cutover procedures
- Data synchronization validation
- Full service restoration

### Test Scenarios

1. **Primary Region Complete Failure**
   - Simulate us-east-1 unavailability
   - Activate eu-west-1 DR environment
   - Verify customer access via DR

2. **Database Recovery from Cross-Region Backup**
   - Restore production database in DR region
   - Validate data consistency
   - Test application functionality

3. **Gradual Failback**
   - Restore primary region
   - Synchronize changes from DR
   - Cut back to primary

### Pre-Test Preparation (2 weeks before)

```bash
# 1. Verify DR infrastructure exists
aws ec2 describe-vpcs --region eu-west-1 --filters Name=tag:Purpose,Values=disaster-recovery

# 2. Verify backup vault has recent backups
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name mechmind-dr-vault \
  --region eu-west-1 \
  --query 'RecoveryPoints[?CreationDate>=`2024-01-01`].[RecoveryPointArn,CreationDate]'

# 3. Verify cross-region S3 replication
aws s3api get-bucket-replication \
  --bucket mechmind-prod-storage-${ACCOUNT_ID} \
  --region us-east-1

# 4. Pre-stage Lambda functions in DR
for func in api-main worker-booking worker-notification voice-handler; do
  aws lambda get-function \
    --function-name mechmind-prod-$func \
    --region eu-west-1
done
```

### DR Activation Procedure

```bash
#!/bin/bash
# Cross-Region DR Activation

DR_REGION="eu-west-1"
SOURCE_REGION="us-east-1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== DR ACTIVATION DRILL - $TIMESTAMP ==="

# Step 1: Identify latest cross-region backup
echo "Finding latest backup..."
LATEST_BACKUP=$(aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name mechmind-dr-vault \
  --region $DR_REGION \
  --query 'sort_by(RecoveryPoints, &CreationDate)[-1].RecoveryPointArn' \
  --output text)

# Step 2: Restore database in DR
echo "Restoring database from $LATEST_BACKUP..."
aws backup start-restore-job \
  --recovery-point-arn $LATEST_BACKUP \
  --metadata file://dr-restore-metadata.json \
  --iam-role-arn arn:aws:iam::${ACCOUNT_ID}:role/AWSBackupDefaultServiceRole \
  --region $DR_REGION

# Step 3: Activate Lambda functions
echo "Activating DR Lambda functions..."
for func in api-main worker-booking worker-notification voice-handler; do
  aws lambda update-function-configuration \
    --function-name mechmind-prod-$func \
    --region $DR_REGION \
    --environment Variables="{ENVIRONMENT=prod,DR_MODE=active,DATABASE_HOST=$DR_DB_HOST}"
done

# Step 4: Update DNS (simulated in drill)
echo "DNS cutover would happen here in real scenario"
echo "In drill: Update /etc/hosts or use test subdomain"

# Step 5: Run validation tests
echo "Running validation tests..."
./scripts/dr-validation-tests.sh $DR_REGION

echo "DR activation complete"
```

### Bi-Annual Test Report Template

```markdown
# Bi-Annual Cross-Region DR Drill Report

## Executive Summary
- Date: YYYY-MM-DD
- Duration: X hours
- Scenario: Primary Region Failure
- Overall Result: ✅ PASSED / ❌ FAILED

## Test Scope
- [ ] Cross-region backup availability
- [ ] DR environment activation
- [ ] Database restore from cross-region backup
- [ ] Application deployment to DR
- [ ] DNS cutover procedures
- [ ] Customer traffic handling
- [ ] Monitoring and alerting in DR
- [ ] Failback procedures

## Key Metrics
| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| DR Activation Time | < 1 hour | 45 min | ✅ |
| Database Restore | < 2 hours | 1h 30m | ✅ |
| Full Service in DR | < 4 hours | 3h 15m | ✅ |
| Failback Time | < 2 hours | 1h 45m | ✅ |
| Data Loss | 0 | 0 | ✅ |

## Detailed Findings
### What Worked Well
1. 
2. 

### Areas for Improvement
1. 
2. 

### Critical Issues
[Document any blockers]

## Recommendations
1. 
2. 

## Sign-offs
- Engineering Lead: _________________
- VP Engineering: _________________
- CTO: _________________
```

---

## Annual: Ransomware Recovery Drill

**Schedule:** October, Cybersecurity Awareness Month  
**Duration:** 1 day (8 hours + post-drill review)  
**Participants:** Full Organization (Engineering, Security, Legal, PR, Leadership)  
**Lead:** CISO / CTO

### Scope

- Tabletop exercise for ransomware scenario
- Full recovery from isolated backups
- Legal and compliance procedures
- Customer and public communication
- Forensic investigation simulation

### Scenario

> "At 09:00 UTC, monitoring detected unusual encryption activity on production databases. Initial investigation suggests a ransomware attack via compromised credentials. All production systems are potentially compromised."

### Exercise Structure

#### Phase 1: Detection & Response (2 hours)
- Alert recognition
- Initial assessment
- Resource isolation
- Evidence preservation

#### Phase 2: Recovery (4 hours)
- Clean backup identification
- Environment rebuilding
- Data restoration
- Security validation

#### Phase 3: Communication (1 hour)
- Internal stakeholder updates
- Customer notification
- Regulatory reporting (simulated)
- Public relations (if needed)

#### Phase 4: Post-Incident (1 hour)
- Lessons learned
- Procedure updates
- Training gaps identification

### Ransomware Drill Checklist

```markdown
## Ransomware Recovery Drill Checklist

### Immediate Response
- [ ] Detect anomalous encryption patterns
- [ ] Activate incident response team
- [ ] Isolate affected systems
- [ ] Preserve forensic evidence
- [ ] Notify security team
- [ ] Document timeline

### Assessment
- [ ] Identify scope of compromise
- [ ] Determine attack vector
- [ ] Assess data exposure
- [ ] Identify clean backup point
- [ ] Evaluate regulatory implications

### Recovery
- [ ] Provision clean infrastructure
- [ ] Restore from pre-attack backup
- [ ] Verify data integrity
- [ ] Rebuild application environment
- [ ] Validate security controls
- [ ] Test application functionality

### Communication
- [ ] Internal stakeholder updates
- [ ] Customer notification (if required)
- [ ] Regulatory reporting (if required)
- [ ] Public disclosure (if required)
- [ ] Post-incident report

### Post-Incident
- [ ] Forensic analysis
- [ ] Root cause determination
- [ ] Security control improvements
- [ ] Procedure updates
- [ ] Training updates
- [ ] Insurance claim (if applicable)
```

### Tabletop Exercise Template

```markdown
# Ransomware Recovery Tabletop Exercise

## Scenario Injection 1 (09:00)
CloudWatch alarm triggers for unusual database write patterns. DBA reports seeing encrypted table names.

**Discussion Questions:**
1. Who do you call first?
2. What is your immediate action?
3. How do you confirm this is ransomware?

## Scenario Injection 2 (09:30)
Forensic analysis confirms ransomware. Attacker demands payment in 48 hours. 70% of database is encrypted.

**Discussion Questions:**
1. Do you pay the ransom? Why or why not?
2. What is your recovery strategy?
3. What systems do you isolate?

## Scenario Injection 3 (11:00)
Clean backup identified from 18 hours ago. DR environment is being provisioned.

**Discussion Questions:**
1. What data will be lost?
2. How do you communicate with customers?
3. What is your estimated recovery time?

## Scenario Injection 4 (14:00)
Recovery is 50% complete. Media has started asking questions.

**Discussion Questions:**
1. What is your public statement?
2. Which customers need direct notification?
3. What regulatory notifications are required?

## Scenario Injection 5 (16:00)
Recovery complete. All services restored. No customer data lost (recovered from backup).

**Discussion Questions:**
1. What follow-up actions are needed?
2. What security improvements will you implement?
3. How do you rebuild customer trust?
```

---

## Schedule Calendar

### 2026 DR Drill Calendar

| Month | Week | Activity | Owner |
|-------|------|----------|-------|
| Jan | 1 | Weekly tests resume | Automated |
| Jan | 1 | Monthly backup check | SRE Team |
| Jan | 1 | Q1 Failover Simulation | Platform Team |
| Feb | 1-4 | Weekly tests | Automated |
| Feb | 1 | Monthly backup check | SRE Team |
| Mar | 1-4 | Weekly tests | Automated |
| Mar | 3 | Bi-Annual DR Drill | Full Engineering |
| Apr | 1 | Q2 Failover Simulation | Platform Team |
| May | 1 | Monthly backup check | SRE Team |
| Jun | 1 | Q3 Failover Simulation | Platform Team |
| Jul | 1-4 | Weekly tests | Automated |
| Jul | 1 | Monthly backup check | SRE Team |
| Aug | 1-4 | Weekly tests | Automated |
| Aug | 1 | Monthly backup check | SRE Team |
| Sep | 3 | Bi-Annual DR Drill | Full Engineering |
| Oct | 2 | Annual Ransomware Drill | Full Organization |
| Oct | 1 | Q4 Failover Simulation | Platform Team |
| Nov | 1 | Monthly backup check | SRE Team |
| Dec | 1-4 | Weekly tests | Automated |
| Dec | Last | Year-end DR review | Platform Lead |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly test success rate | > 95% | Automated tracking |
| Monthly test completion | 100% | Manual tracking |
| Quarterly failover RTO | < 3 min | Stopwatch test |
| Quarterly failover RPO | 0 | Data validation |
| Cross-region RTO | < 4 hours | Drill measurement |
| Cross-region RPO | < 24 hours | Backup age tracking |
| Test documentation | 100% | Checklist review |
| Action item completion | > 90% | Issue tracker |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-28 | Platform Team | Initial version |

---

**Next Review Date:** 2026-05-28
