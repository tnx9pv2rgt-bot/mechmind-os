/**
 * POST /api/auth/passkey/register-options
 * Generate registration options for a new passkey
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasskeyRegistrationOptions } from '@/lib/auth/webauthn-server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email invalida' },
        { status: 400 }
      );
    }

    // Find user (user must be created by admin first)
    const user = await prisma.tenantUser.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato. Contatta l\'amministratore.' },
        { status: 404 }
      );
    }

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions(
      user.id,
      user.email,
      user.email.split('@')[0]
    );

    // Store challenge in Redis (10 min expiry)
    await redis.setex(`webauthn:register:${user.id}`, 600, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey register options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
