# MechMind OS - Authentication API

Complete authentication system for NEXO SaaS with Magic Link, Password, TOTP, and SMS OTP support.

## 📁 API Structure

```
app/api/auth/
├── magic-link/
│   ├── send/route.ts      # POST - Send magic link email
│   └── verify/route.ts    # GET - Verify magic link token
├── password/
│   ├── login/route.ts     # POST - Password login
│   └── setup/route.ts     # POST - Set/change password
├── totp/
│   ├── setup/route.ts     # POST - Setup TOTP MFA
│   ├── verify/route.ts    # POST - Verify TOTP code
│   └── disable/route.ts   # POST - Disable TOTP
└── sms/
    ├── send/route.ts      # POST - Send SMS OTP
    └── verify/route.ts    # POST - Verify SMS OTP
```

## 🔐 Authentication Methods

### 1. Magic Link Authentication

**Send Magic Link:**
```bash
POST /api/auth/magic-link/send
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Verify Magic Link:**
```bash
GET /api/auth/magic-link/verify?token=<token>
```

### 2. Password Authentication

**Login with Password:**
```bash
POST /api/auth/password/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "rememberMe": true
}
```

Response with TOTP required:
```json
{
  "requiresMFA": true,
  "tempToken": "<temp-jwt-token>",
  "message": "Inserisci il codice di verifica"
}
```

**Set/Change Password:**
```bash
POST /api/auth/password/setup
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currentPassword": "oldpass",  // Required if password exists
  "newPassword": "newpass123"
}
```

### 3. TOTP (Time-based One-Time Password)

**Setup TOTP:**
```bash
POST /api/auth/totp/setup
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "secret": "BASE32SECRET",
  "qrCode": "data:image/png;base64,...",
  "message": "Scansiona il QR code con la tua app di autenticazione"
}
```

**Verify TOTP (Setup):**
```bash
POST /api/auth/totp/verify
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "code": "123456",
  "isSetup": true
}
```

**Verify TOTP (Login MFA):**
```bash
POST /api/auth/totp/verify
Content-Type: application/json

{
  "code": "123456",
  "tempToken": "<temp-token-from-login>"
}
```

**Disable TOTP:**
```bash
POST /api/auth/totp/disable
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "password": "currentpassword",
  "code": "123456"
}
```

### 4. SMS OTP Authentication

**Send SMS OTP:**
```bash
POST /api/auth/sms/send
Content-Type: application/json

{
  "phone": "+391234567890",
  "userId": "optional-user-id",
  "purpose": "login"  // login | phone_verification | mfa
}
```

**Verify SMS OTP:**
```bash
POST /api/auth/sms/verify
Content-Type: application/json

{
  "phone": "+391234567890",
  "code": "123456",
  "purpose": "login"
}
```

## 🛡️ Security Features

### Rate Limiting
- Magic Link: Max 3 requests per email per hour
- Password Login: Max 10 attempts per IP per 15 minutes
- SMS OTP: Max 3 requests per phone per hour
- TOTP: Max 5 verification attempts per code

### Account Protection
- Account lockout after 5 failed password attempts (15 minutes)
- Failed attempt tracking and automatic reset on successful login
- IP-based rate limiting for all authentication endpoints

### Token Security
- JWT tokens with configurable expiration
- HTTP-only, Secure, SameSite=Strict cookies
- Refresh token rotation support
- Session tracking with IP and User-Agent

### Privacy Features
- Magic links don't reveal if email exists
- Consistent error messages to prevent user enumeration
- Audit logging for all authentication events

## 📦 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/mechmind"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxx
NEXT_PUBLIC_URL=https://app.mechmindos.it

# SMS (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
SMS_FROM_NUMBER=+1234567890

# Alternative SMS Providers
# SMS_PROVIDER=aws-sns
# AWS_REGION=eu-west-1
# SMS_PROVIDER=messagebird
# MESSAGEBIRD_API_KEY=xxxxxxxx
```

## 📊 Database Schema Requirements

The following Prisma models are expected:

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String?
  name            String?
  phone           String?   @unique
  phoneVerifiedAt DateTime?
  role            String    @default("USER")
  tenantId        String?
  
  // TOTP
  totpEnabled     Boolean   @default(false)
  totpSecret      String?
  
  // Security
  failedAttempts  Int       @default(0)
  lockedUntil     DateTime?
  lastLoginAt     DateTime?
  lastLoginIp     String?
  passwordChangedAt DateTime?
  
  sessions        Session[]
  magicLinks      MagicLink[]
  auditLogs       AuditLog[]
  
  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  jwtToken     String
  refreshToken String
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model MagicLink {
  id          String    @id @default(uuid())
  email       String
  token       String    @unique
  tenantId    String?
  expiresAt   DateTime
  usedAt      DateTime?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())
  
  @@map("magic_links")
}

model AuditLog {
  id          String   @id @default(uuid())
  tenantId    String?
  userId      String?
  action      String
  status      String
  details     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  user User? @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
}
```

## 🔧 Testing

### Development Mode
In development, SMS OTP codes are logged to console instead of being sent:
```
📱 SMS OTP (dev mode): { phone: '+391234567890', otp: '123456', ... }
```

### Health Check
All endpoints return proper HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `429` - Too Many Requests (rate limited)
- `500` - Server Error

## 📝 Audit Log Actions

The following actions are logged:
- `login_success` - Successful authentication
- `login_failed` - Failed authentication attempt
- `totp_enabled` - TOTP MFA enabled
- `totp_disabled` - TOTP MFA disabled

## 🚀 Production Deployment Checklist

- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure production database URL
- [ ] Set up Redis instance
- [ ] Configure Resend API key for emails
- [ ] Configure SMS provider (Twilio/AWS SNS/MessageBird)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS only
- [ ] Review and test rate limits
- [ ] Set up monitoring for audit logs
- [ ] Test all authentication flows end-to-end
