/**
 * POST /api/auth/passkey/authenticate-verify
 * Verify a passkey authentication response
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPasskeyAuthentication, getDeviceInfo } from '@/lib/auth/webauthn-server';
import { redis } from '@/lib/redis';
import { generateJWT, generateRefreshToken } from '@/lib/auth/tokens';
// Helper per convertire base64url a buffer
function base64URLToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}
import { AuthenticationResponseJSON } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  try {
    const { assertion, sessionId } = await req.json();

    if (!assertion || !sessionId) {
      return NextResponse.json(
        { error: 'Assertion e sessionId richiesti' },
        { status: 400 }
      );
    }

    const expectedChallenge = await redis.get(`webauthn:auth:${sessionId}`) as string | null;

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Challenge scaduto o non valido' },
        { status: 400 }
      );
    }

    // Find passkey by credential ID
    const credentialId = assertion.id;
    
    // Note: This requires the Passkey model from W2
    let passkey: any = null;
    try {
      passkey = await (prisma as any).passkey.findFirst({
        where: { credentialId }
      });
    } catch (prismaError) {
      console.warn('Passkey model not found in schema:', prismaError);
      return NextResponse.json(
        { error: 'Passkey non trovato' },
        { status: 404 }
      );
    }

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey non trovato' },
        { status: 404 }
      );
    }

    const verification = await verifyPasskeyAuthentication(
      assertion as AuthenticationResponseJSON,
      expectedChallenge,
      base64URLToBuffer(passkey.publicKey),
      passkey.counter
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Autenticazione fallita' },
        { status: 401 }
      );
    }

    // Update counter
    try {
      await (prisma as any).passkey.update({
        where: { id: passkey.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date()
        }
      });
    } catch (prismaError) {
      console.warn('Failed to update passkey counter:', prismaError);
    }

    // Get user
    const user = await prisma.tenantUser.findUnique({
      where: { id: passkey.userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Generate tokens
    const jwtToken = await generateJWT({
      id: user.id,
      email: user.email,
      name: user.email,
      tenantId: user?.tenantId || undefined,
    });
    
    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      name: user.email,
      tenantId: user?.tenantId || undefined,
    });

    // Create session - Note: This requires Session model
    try {
      await (prisma as any).session.create({
        data: {
          userId: user.id,
          token: jwtToken,
          refreshToken: refreshToken,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });
    } catch (prismaError) {
      console.warn('Session model not found, skipping session storage:', prismaError);
    }

    // Clean up challenge
    await redis.del(`webauthn:auth:${sessionId}`);

    // Log audit - Note: This requires AuditLog model
    try {
      await (prisma as any).auditLog.create({
        data: {
          tenantId: user.tenantId || 'default',
          userId: user.id,
          action: 'login_success',
          status: 'success',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          details: { method: 'passkey', device: passkey.deviceName }
        }
      });
    } catch (prismaError) {
      console.warn('AuditLog model not found, skipping audit log:', prismaError);
    }

    return NextResponse.json({
      success: true,
      jwtToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.email,
      }
    });
  } catch (error) {
    console.error('Passkey auth verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}
