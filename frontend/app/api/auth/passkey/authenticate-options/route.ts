/**
 * GET /api/auth/passkey/authenticate-options
 * Generate authentication options for passkey login
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePasskeyAuthenticationOptions } from '@/lib/auth/webauthn-server';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const options = await generatePasskeyAuthenticationOptions();

    // Store challenge with temporary session ID
    const sessionId = randomUUID();
    await redis.setex(`webauthn:auth:${sessionId}`, 600, options.challenge);

    return NextResponse.json({ ...options, sessionId });
  } catch (error) {
    console.error('Passkey auth options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
}
