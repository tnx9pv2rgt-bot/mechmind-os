import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';
import { AuthService, AuthTokens } from '../services/auth.service';
import { EmailService } from '../../notifications/email/email.service';

@Injectable()
export class MagicLinkService {
  private readonly frontendUrl: string;
  private readonly tokenExpiryMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
  }

  async sendMagicLink(
    email: string,
    tenantSlug: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ sent: true }> {
    // Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      // Don't reveal if tenant exists
      return { sent: true };
    }

    // Find user
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id, isActive: true },
    });

    if (!user) {
      // Don't reveal if user exists
      return { sent: true };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.tokenExpiryMinutes * 60 * 1000);

    // Save magic link
    await this.prisma.magicLink.create({
      data: {
        email,
        token,
        tenantId: tenant.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Send email
    const verifyUrl = `${this.frontendUrl}/auth/magic-link/verify?token=${token}`;

    await this.emailService.sendRawEmail({
      to: email,
      subject: 'Accedi a MechMind OS',
      html: this.getMagicLinkEmailHtml(user.name, verifyUrl, this.tokenExpiryMinutes),
    });

    this.logger.log(`Magic link sent to ${email} for tenant ${tenantSlug}`);

    return { sent: true };
  }

  async verifyMagicLink(token: string, ip?: string): Promise<AuthTokens> {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink) {
      throw new MagicLinkError('Link non valido');
    }

    if (magicLink.usedAt) {
      throw new MagicLinkError("Link gia' utilizzato");
    }

    if (magicLink.expiresAt < new Date()) {
      throw new MagicLinkError('Link scaduto');
    }

    // Mark as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        email: magicLink.email,
        tenantId: magicLink.tenantId!,
        isActive: true,
      },
      include: { tenant: true },
    });

    if (!user || !user.tenant.isActive) {
      throw new MagicLinkError('Utente non trovato o non attivo');
    }

    await this.authService.updateLastLogin(user.id, ip);

    return this.authService.generateTokens({
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
    });
  }

  private getMagicLinkEmailHtml(name: string, url: string, expiryMinutes: number): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1d1d1f; font-size: 28px; font-weight: 600; margin: 0;">MechMind OS</h1>
        </div>
        <p style="color: #1d1d1f; font-size: 17px; line-height: 1.5;">Ciao <strong>${name}</strong>,</p>
        <p style="color: #424245; font-size: 17px; line-height: 1.5;">Clicca il pulsante qui sotto per accedere al tuo account:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${url}" style="background: #0071e3; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-size: 17px; font-weight: 500; display: inline-block;">Accedi ora</a>
        </div>
        <p style="color: #86868b; font-size: 14px; line-height: 1.5;">Questo link scade tra ${expiryMinutes} minuti ed e' utilizzabile una sola volta.</p>
        <p style="color: #86868b; font-size: 14px; line-height: 1.5;">Se non hai richiesto questo link, puoi ignorare questa email.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
        <p style="color: #86868b; font-size: 12px; text-align: center;">MechMind OS - Gestionale Officine</p>
      </div>
    `;
  }
}

export class MagicLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MagicLinkError';
  }
}
