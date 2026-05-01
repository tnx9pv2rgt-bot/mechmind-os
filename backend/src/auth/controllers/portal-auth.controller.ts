import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, IsNotEmpty, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { createHash } from 'crypto';
import { AuthService, UserWithTenant } from '../services/auth.service';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';

// ============================================================
// DTOs
// ============================================================

class PortalRegisterDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Il nome è obbligatorio' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Il cognome è obbligatorio' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Il telefono è obbligatorio' })
  phone: string;

  @IsBoolean()
  gdprConsent: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

class PortalLoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Inserisci la password' })
  password: string;
}

// ============================================================
// Helper — build customer response with tenant lookup
// ============================================================

interface CustomerTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    customer: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
    };
  };
}

// ============================================================
// CONTROLLER
// ============================================================

@ApiTags('Portal Authentication')
@Controller('auth/portal')
export class PortalAuthController {
  private readonly logger = new Logger(PortalAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** SHA-256 hash for email/phone lookup */
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  // ----------------------------------------------------------
  // POST /v1/auth/portal/register
  // ----------------------------------------------------------
  @Post('register')
  @Throttle({ strict: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Registrazione cliente portale' })
  @ApiResponse({ status: 201, description: 'Cliente registrato con successo' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 409, description: 'Email già registrata' })
  @ApiBody({ type: PortalRegisterDto })
  async register(@Body() dto: PortalRegisterDto): Promise<CustomerTokenResponse> {
    if (!dto.gdprConsent) {
      throw new BadRequestException('Devi accettare la privacy policy per registrarti');
    }

    const emailNormalized = dto.email.toLowerCase().trim();
    const emailHash = this.hash(emailNormalized);

    // Find tenant — use provided slug or default demo tenant
    const tenantSlug = dto.tenantSlug || 'demo';
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new BadRequestException('Officina non trovata. Verifica il link di registrazione.');
    }

    // Check if customer already exists with this email in this tenant
    // Use raw query since emailHash is a new field not yet in Prisma client
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM customers
      WHERE email_hash = ${emailHash}
        AND tenant_id = ${tenant.id}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (existing.length > 0) {
      throw new ConflictException('Esiste già un account con questa email');
    }

    // Hash password with argon2id
    const passwordHash = await this.authService.hashPassword(dto.password);

    // Encrypt PII
    const encryptedEmail = this.encryption.encrypt(emailNormalized);
    const encryptedFirstName = this.encryption.encrypt(dto.firstName.trim());
    const encryptedLastName = this.encryption.encrypt(dto.lastName.trim());
    const encryptedPhone = this.encryption.encrypt(dto.phone.trim());
    const phoneHash = this.hash(dto.phone.trim());

    // Create customer with raw insert for new fields
    const customerId = crypto.randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO customers (
        id, tenant_id, encrypted_email, encrypted_first_name, encrypted_last_name,
        encrypted_phone, phone_hash, email_hash, password_hash,
        gdpr_consent, gdpr_consent_at, gdpr_consent_method,
        marketing_consent, marketing_consent_at, source,
        country, created_at, updated_at
      ) VALUES (
        ${customerId}, ${tenant.id}, ${encryptedEmail}, ${encryptedFirstName}, ${encryptedLastName},
        ${encryptedPhone}, ${phoneHash}, ${emailHash}, ${passwordHash},
        true, NOW(), 'portal-register',
        ${dto.marketingConsent || false}, ${dto.marketingConsent ? new Date() : null}, 'PORTAL',
        'IT', NOW(), NOW()
      )
    `;

    // Generate JWT tokens
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const customerAsUser: UserWithTenant = {
      id: customerId,
      email: emailNormalized,
      name: `${firstName} ${lastName}`,
      role: 'CUSTOMER',
      isActive: true,
      tenantId: tenant.id,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: true,
      },
    };

    const tokens = await this.authService.generateTokens(customerAsUser);

    this.logger.log(`Portal customer registered: ${customerId} in tenant ${tenant.slug}`);

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        customer: {
          id: customerId,
          email: emailNormalized,
          firstName,
          lastName,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        },
      },
    };
  }

  // ----------------------------------------------------------
  // POST /v1/auth/portal/login
  // ----------------------------------------------------------
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login cliente portale' })
  @ApiResponse({ status: 200, description: 'Login riuscito' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiResponse({ status: 401, description: 'Credenziali non valide' })
  @ApiBody({ type: PortalLoginDto })
  async login(@Body() dto: PortalLoginDto): Promise<CustomerTokenResponse> {
    const emailNormalized = dto.email.toLowerCase().trim();
    const emailHash = this.hash(emailNormalized);

    // Find customer by emailHash using raw query (new field)
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        password_hash: string | null;
        tenant_id: string;
        encrypted_first_name: string | null;
        encrypted_last_name: string | null;
      }[]
    >`
      SELECT c.id, c.password_hash, c.tenant_id, c.encrypted_first_name, c.encrypted_last_name
      FROM customers c
      WHERE c.email_hash = ${emailHash}
        AND c.deleted_at IS NULL
        AND c.password_hash IS NOT NULL
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const row = rows[0];

    // Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: row.tenant_id },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Officina non attiva');
    }

    // Verify password
    const isValid = await this.authService.verifyPassword(dto.password, row.password_hash!);
    if (!isValid) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Decrypt PII for response
    const firstName = row.encrypted_first_name
      ? this.encryption.decrypt(row.encrypted_first_name)
      : '';
    const lastName = row.encrypted_last_name
      ? this.encryption.decrypt(row.encrypted_last_name)
      : '';

    // Generate tokens
    const customerAsUser: UserWithTenant = {
      id: row.id,
      email: emailNormalized,
      name: `${firstName} ${lastName}`.trim(),
      role: 'CUSTOMER',
      isActive: true,
      tenantId: tenant.id,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
      },
    };

    const tokens = await this.authService.generateTokens(customerAsUser);

    this.logger.log(`Portal customer login: ${row.id} in tenant ${tenant.slug}`);

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        customer: {
          id: row.id,
          email: emailNormalized,
          firstName,
          lastName,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        },
      },
    };
  }
}
