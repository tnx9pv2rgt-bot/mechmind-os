import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth/tokens';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { password, code } = await req.json();

    // Get user from JWT
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    if (!user.totpEnabled) {
      return NextResponse.json({ error: 'TOTP non è attivo' }, { status: 400 });
    }

    // Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Password non configurata' },
        { status: 400 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Password non valida' },
        { status: 401 }
      );
    }

    // Verify TOTP code
    if (!user.totpSecret) {
      return NextResponse.json(
        { error: 'Configurazione TOTP non trovata' },
        { status: 400 }
      );
    }

    const codeValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!codeValid) {
      return NextResponse.json(
        { error: 'Codice TOTP non valido' },
        { status: 400 }
      );
    }

    // Disable TOTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'totp_disabled',
        status: 'success',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'TOTP disattivato con successo'
    });

  } catch (error) {
    console.error('TOTP disable error:', error);
    return NextResponse.json(
      { error: 'Errore durante la disattivazione TOTP' },
      { status: 500 }
    );
  }
}
