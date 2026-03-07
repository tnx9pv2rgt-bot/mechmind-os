import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { generateJWT, generateRefreshToken } from '@/lib/auth/tokens';

export async function POST(req: NextRequest) {
  try {
    const { phone, code, purpose = 'login' } = await req.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Numero di telefono e codice richiesti' },
        { status: 400 }
      );
    }

    // Retrieve stored OTP data
    const otpKey = `sms:otp:${phone}`;
    const otpDataRaw = await redis.get(otpKey);

    if (!otpDataRaw) {
      return NextResponse.json(
        { error: 'Codice scaduto o non trovato' },
        { status: 400 }
      );
    }

    const otpData = JSON.parse(otpDataRaw as string);

    // Check if expired
    if (Date.now() > otpData.expiresAt) {
      await redis.del(otpKey);
      return NextResponse.json(
        { error: 'Codice scaduto. Richiedine uno nuovo.' },
        { status: 400 }
      );
    }

    // Check max attempts (5 max)
    if (otpData.attempts >= 5) {
      await redis.del(otpKey);
      return NextResponse.json(
        { error: 'Troppi tentativi. Richiedi un nuovo codice.' },
        { status: 429 }
      );
    }

    // Verify code
    if (code !== otpData.otp) {
      // Increment attempts
      otpData.attempts += 1;
      const ttl = Math.ceil((otpData.expiresAt - Date.now()) / 1000);
      await redis.setex(otpKey, ttl, JSON.stringify(otpData));

      return NextResponse.json(
        { error: 'Codice non valido', remainingAttempts: 5 - otpData.attempts },
        { status: 400 }
      );
    }

    // Code verified - delete from Redis
    await redis.del(otpKey);

    // Handle different purposes
    switch (purpose) {
      case 'login': {
        // Find or create user by phone
        let user = await prisma.user.findFirst({
          where: { phone }
        });

        if (!user) {
          // Create new user with phone-only login
          user = await prisma.user.create({
            data: {
              phone,
              email: `phone_${phone.replace(/\D/g, '')}@temp.mechmindos.it`, // Temporary email
              name: null,
              role: 'USER',
            }
          });
        }

        // Generate tokens
        const jwtToken = generateJWT(user);
        const refreshToken = generateRefreshToken(user);

        // Create session
        await prisma.session.create({
          data: {
            userId: user.id,
            jwtToken,
            refreshToken,
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }
        });

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: req.headers.get('x-forwarded-for') || ''
          }
        });

        // Log audit
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'login_success',
            status: 'success',
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            details: { method: 'sms_otp' }
          }
        });

        return NextResponse.json({
          success: true,
          jwtToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
          }
        });
      }

      case 'phone_verification': {
        // Update user phone verification status
        const userId = otpData.userId;
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID mancante' },
            { status: 400 }
          );
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            phone,
            phoneVerifiedAt: new Date(),
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Numero di telefono verificato con successo'
        });
      }

      case 'mfa': {
        // SMS as MFA method
        const userId = otpData.userId;
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID mancante' },
            { status: 400 }
          );
        }

        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return NextResponse.json(
            { error: 'Utente non trovato' },
            { status: 404 }
          );
        }

        // Generate tokens for MFA completion
        const jwtToken = generateJWT(user);
        const refreshToken = generateRefreshToken(user);

        // Create session
        await prisma.session.create({
          data: {
            userId: user.id,
            jwtToken,
            refreshToken,
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }
        });

        // Reset failed attempts and update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: req.headers.get('x-forwarded-for') || 'unknown'
          }
        });

        // Log audit
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'login_success',
            status: 'success',
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            details: { method: 'sms_mfa' }
          }
        });

        return NextResponse.json({
          success: true,
          jwtToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Scopo non valido' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('SMS verify error:', error);
    return NextResponse.json(
      { error: 'Errore durante la verifica del codice' },
      { status: 500 }
    );
  }
}
