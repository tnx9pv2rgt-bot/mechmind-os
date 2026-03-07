import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth/tokens';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
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

    // Check if TOTP already enabled
    if (user.totpEnabled) {
      return NextResponse.json({ error: 'TOTP già attivo' }, { status: 400 });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `MechMind OS (${user.email})`,
      length: 32,
    });

    // Store temporary secret (not enabled until verified)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: secret.base32,
      }
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scansiona il QR code con la tua app di autenticazione'
    });

  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'Errore durante la configurazione TOTP' },
      { status: 500 }
    );
  }
}
