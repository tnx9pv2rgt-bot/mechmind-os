import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth/tokens';
import speakeasy from 'speakeasy';

export async function POST(req: NextRequest) {
  try {
    const { code, isSetup = false, tempToken } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Codice TOTP non valido' },
        { status: 400 }
      );
    }

    let userId: string;

    // If tempToken is provided (MFA verification during login)
    if (tempToken) {
      const payload = verifyJWT(tempToken);
      if (!payload) {
        return NextResponse.json({ error: 'Token temporaneo non valido' }, { status: 401 });
      }
      userId = payload.sub;
    } else {
      // Regular authenticated request
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
      }

      const payload = verifyJWT(token);
      if (!payload) {
        return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
      }
      userId = payload.sub;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: 'Configurazione TOTP non trovata' },
        { status: 404 }
      );
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 steps before/after for time drift
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Codice TOTP non valido' },
        { status: 400 }
      );
    }

    // If this is setup verification, enable TOTP
    if (isSetup) {
      await prisma.user.update({
        where: { id: user.id },
        data: { totpEnabled: true }
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'totp_enabled',
          status: 'success',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        }
      });

      return NextResponse.json({
        success: true,
        message: 'TOTP attivato con successo'
      });
    }

    // This is a login verification - return final tokens
    if (tempToken) {
      const { generateJWT, generateRefreshToken } = await import('@/lib/auth/tokens');
      
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

      // Reset failed attempts
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
          details: { method: 'password_totp' }
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

    return NextResponse.json({
      success: true,
      message: 'Codice TOTP verificato'
    });

  } catch (error) {
    console.error('TOTP verify error:', error);
    return NextResponse.json(
      { error: 'Errore durante la verifica TOTP' },
      { status: 500 }
    );
  }
}
