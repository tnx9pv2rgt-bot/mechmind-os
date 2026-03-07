/**
 * MechMind OS - Backup Orchestrator Lambda
 * 
 * Manages automated PostgreSQL backups:
 * - Creates RDS snapshots
 * - Exports data to S3 (encrypted)
 * - Cleans up old backups
 * - Sends notifications on success/failure
 */

const AWS = require('aws-sdk');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// AWS Clients
const rds = new AWS.RDS();
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();
const sns = new AWS.SNS();

exports.handler = async (event, context) => {
  const startTime = Date.now();
  const backupId = `backup-${Date.now()}`;
  
  const config = {
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPasswordSecret: process.env.DB_PASSWORD_SECRET,
    backupBucket: process.env.BACKUP_BUCKET,
    kmsKeyId: process.env.KMS_KEY_ID,
    environment: process.env.ENVIRONMENT,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    retentionDays: parseInt(process.env.RETENTION_DAYS || '30', 10),
  };

  console.log(`Starting backup ${backupId} for ${config.dbName}`);

  try {
    // 1. Get database password from Secrets Manager
    const secretResponse = await secretsManager.getSecretValue({
      SecretId: config.dbPasswordSecret,
    }).promise();
    
    const dbPassword = JSON.parse(secretResponse.SecretString).password;

    // 2. Create RDS snapshot
    const snapshotId = `${config.environment}-manual-${Date.now()}`;
    await createRDSSnapshot(config, snapshotId);

    // 3. Create logical backup (pg_dump) to S3
    const backupKey = await createLogicalBackup(config, dbPassword, backupId);

    // 4. Clean up old backups
    const deletedCount = await cleanupOldBackups(config);

    // 5. Verify backup integrity
    await verifyBackup(config, backupKey);

    // 6. Send success notification
    await sendNotification(config, 'SUCCESS', {
      backupId,
      snapshotId,
      backupKey,
      duration: Date.now() - startTime,
      deletedOldBackups: deletedCount,
    });

    console.log(`Backup ${backupId} completed successfully`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Backup completed successfully',
        backupId,
        snapshotId,
        backupKey,
      }),
    };

  } catch (error) {
    console.error('Backup failed:', error);
    
    await sendNotification(config, 'FAILED', {
      backupId,
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    throw error;
  }
};

/**
 * Create RDS snapshot
 */
async function createRDSSnapshot(config, snapshotId) {
  // Extract DB instance identifier from host
  const dbInstanceId = config.dbHost.split('.')[0];
  
  console.log(`Creating RDS snapshot: ${snapshotId}`);
  
  try {
    await rds.createDBSnapshot({
      DBInstanceIdentifier: dbInstanceId,
      DBSnapshotIdentifier: snapshotId,
      Tags: [
        { Key: 'Environment', Value: config.environment },
        { Key: 'CreatedBy', Value: 'BackupOrchestrator' },
        { Key: 'BackupType', Value: 'Automated' },
      ],
    }).promise();
    
    console.log(`RDS snapshot ${snapshotId} created`);
    return snapshotId;
  } catch (error) {
    console.error('Failed to create RDS snapshot:', error);
    // Don't throw - logical backup is more important
    return null;
  }
}

/**
 * Create logical backup using pg_dump
 */
async function createLogicalBackup(config, password, backupId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `mechmind-${config.environment}-${timestamp}.sql.gz`;
  const localPath = `/tmp/${filename}`;
  
  console.log(`Creating logical backup: ${filename}`);
  
  // Set PGPASSWORD environment variable
  const env = {
    ...process.env,
    PGPASSWORD: password,
  };
  
  // Run pg_dump
  const dumpCommand = `pg_dump -h ${config.dbHost} -U ${config.dbUser} -d ${config.dbName} --verbose --format=custom | gzip > ${localPath}`;
  
  try {
    await execAsync(dumpCommand, { env, timeout: 600000 }); // 10 minute timeout
    
    // Get file stats
    const stats = fs.statSync(localPath);
    console.log(`Backup file created: ${stats.size} bytes`);
    
    // Upload to S3 with encryption
    const s3Key = `backups/${config.environment}/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${filename}`;
    
    await s3.upload({
      Bucket: config.backupBucket,
      Key: s3Key,
      Body: fs.createReadStream(localPath),
      ContentType: 'application/gzip',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: config.kmsKeyId,
      Metadata: {
        'backup-id': backupId,
        'created-at': new Date().toISOString(),
        'environment': config.environment,
        'database': config.dbName,
      },
    }).promise();
    
    console.log(`Backup uploaded to S3: ${s3Key}`);
    
    // Clean up local file
    fs.unlinkSync(localPath);
    
    return s3Key;
    
  } catch (error) {
    // Clean up on failure
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    throw error;
  }
}

/**
 * Clean up old backups beyond retention period
 */
async function cleanupOldBackups(config) {
  console.log(`Cleaning up backups older than ${config.retentionDays} days`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
  
  try {
    // List objects in backup prefix
    const listResponse = await s3.listObjectsV2({
      Bucket: config.backupBucket,
      Prefix: `backups/${config.environment}/`,
    }).promise();
    
    let deletedCount = 0;
    
    for (const object of listResponse.Contents || []) {
      if (object.LastModified < cutoffDate) {
        await s3.deleteObject({
          Bucket: config.backupBucket,
          Key: object.Key,
        }).promise();
        
        console.log(`Deleted old backup: ${object.Key}`);
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} old backups`);
    return deletedCount;
    
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
    return 0;
  }
}

/**
 * Verify backup integrity by checking file size and metadata
 */
async function verifyBackup(config, backupKey) {
  console.log(`Verifying backup: ${backupKey}`);
  
  try {
    const headResponse = await s3.headObject({
      Bucket: config.backupBucket,
      Key: backupKey,
    }).promise();
    
    if (headResponse.ContentLength === 0) {
      throw new Error('Backup file is empty');
    }
    
    console.log(`Backup verified: ${headResponse.ContentLength} bytes`);
    return true;
    
  } catch (error) {
    console.error('Backup verification failed:', error);
    throw error;
  }
}

/**
 * Send notification on backup status
 */
async function sendNotification(config, status, details) {
  const message = {
    environment: config.environment,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  };
  
  // Send to Slack if configured
  if (config.slackWebhook) {
    try {
      await fetch(config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Backup ${status}`,
          attachments: [{
            color: status === 'SUCCESS' ? 'good' : 'danger',
            fields: Object.entries(message).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
          }],
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }
  
  // Log message
  console.log('Notification:', JSON.stringify(message, null, 2));
}
