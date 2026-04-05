import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { RedisService } from '@common/services/redis.service';
import { AuthService, UserWithTenant, AuthTokens } from '../services/auth.service';

@Injectable()
export class PasskeyService {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly origin: string;
  private readonly challengeTtl = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly redis: RedisService,
    private readonly authService: AuthService,
  ) {
    this.rpId = this.config.get<string>('WEBAUTHN_RP_ID', 'localhost');
    this.rpName = this.config.get<string>('WEBAUTHN_RP_NAME', 'MechMind OS');
    this.origin = this.config.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:3001');
  }

  async generateRegistrationOptions(
    userId: string,
  ): Promise<{ options: Record<string, unknown>; sessionId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, passkeys: { select: { credentialId: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map(pk => ({
        id: pk.credentialId,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const sessionId = randomUUID();
    await this.redis.set(
      `passkey:reg:${sessionId}`,
      JSON.stringify({ challenge: options.challenge, userId }),
      this.challengeTtl,
    );

    return { options: options as unknown as Record<string, unknown>, sessionId };
  }

  async verifyRegistration(
    userId: string,
    attestation: RegistrationResponseJSON,
    sessionId: string,
    deviceName?: string,
    userAgent?: string,
  ): Promise<{ id: string }> {
    const stored = await this.redis.get(`passkey:reg:${sessionId}`);
    if (!stored) {
      throw new BadRequestException('Challenge expired or invalid session');
    }

    const { challenge, userId: storedUserId } = JSON.parse(stored);
    if (storedUserId !== userId) {
      throw new ForbiddenException('Session mismatch');
    }

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Registration verification failed');
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;

    const passkey = await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: Buffer.from(credential.id).toString('base64url'),
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: (credential.transports ?? []) as string[],
        deviceName: deviceName || this.getDeviceName(userAgent),
        deviceType: credentialDeviceType || 'unknown',
        registeredAt: new Date(),
        isBackupKey: false,
      },
    });

    await this.redis.del(`passkey:reg:${sessionId}`);

    this.logger.log(`Passkey registered for user ${userId}: ${passkey.id}`);

    return { id: passkey.id };
  }

  async generateAuthenticationOptions(): Promise<{
    options: Record<string, unknown>;
    sessionId: string;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
    });

    const sessionId = randomUUID();
    await this.redis.set(`passkey:auth:${sessionId}`, options.challenge, this.challengeTtl);

    return { options: options as unknown as Record<string, unknown>, sessionId };
  }

  async verifyAuthentication(
    assertion: AuthenticationResponseJSON,
    sessionId: string,
    ip?: string,
  ): Promise<AuthTokens> {
    const challenge = await this.redis.get(`passkey:auth:${sessionId}`);
    if (!challenge) {
      throw new BadRequestException('Challenge expired or invalid session');
    }

    // Find passkey by credential ID
    const credentialId = assertion.id;
    const passkey = await this.prisma.passkey.findFirst({
      where: { credentialId },
      include: {
        user: {
          include: { tenant: true },
        },
      },
    });

    if (!passkey || !passkey.user) {
      throw new BadRequestException('Passkey not found');
    }

    if (!passkey.user.isActive || !passkey.user.tenant?.isActive) {
      throw new BadRequestException('User or tenant is inactive');
    }

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: passkey.counter,
        transports: (passkey.transports ?? []) as AuthenticatorTransport[],
      },
    });

    if (!verification.verified) {
      throw new BadRequestException('Authentication verification failed');
    }

    // Update counter and last used
    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    await this.redis.del(`passkey:auth:${sessionId}`);

    const { user } = passkey;
    const userWithTenant: UserWithTenant = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        isActive: user.tenant.isActive,
      },
    };

    await this.authService.updateLastLogin(user.id, ip);

    return this.authService.generateTokens(userWithTenant);
  }

  async listPasskeys(userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      deviceType: string;
      lastUsedAt: Date | null;
      registeredAt: Date;
    }>
  > {
    return this.prisma.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        lastUsedAt: true,
        registeredAt: true,
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    const passkey = await this.prisma.passkey.findFirst({
      where: { id: passkeyId, userId },
    });

    if (!passkey) {
      throw new NotFoundException('Passkey not found');
    }

    await this.prisma.passkey.delete({ where: { id: passkey.id } });

    this.logger.log(`Passkey ${passkeyId} deleted by user ${userId}`);
  }

  private getDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    return 'Unknown Device';
  }
}
