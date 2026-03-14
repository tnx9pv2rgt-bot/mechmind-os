/**
 * Portal Registration API Route
 * Proxies customer registration to the NestJS backend
 * TODO: Create dedicated PortalAuthController in backend with customer registration
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      gdprConsent,
      marketingConsent = false,
    } = body;

    // Validation
    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_FIELDS',
            message: 'All required fields must be provided',
            details: {
              email: !email ? ['Email is required'] : [],
              password: !password ? ['Password is required'] : [],
              firstName: !firstName ? ['First name is required'] : [],
              lastName: !lastName ? ['Last name is required'] : [],
              phone: !phone ? ['Phone is required'] : [],
            },
          },
        },
        { status: 400 }
      );
    }

    if (!gdprConsent) {
      return NextResponse.json(
        {
          error: {
            code: 'GDPR_REQUIRED',
            message: 'GDPR consent is required',
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: {
            code: 'PASSWORD_TOO_SHORT',
            message: 'Password must be at least 8 characters long',
          },
        },
        { status: 400 }
      );
    }

    // Proxy to backend auth endpoint
    const res = await fetch(`${BACKEND_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gdprConsent,
        marketingConsent,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data: unknown = await res.json().catch(() => ({
      error: { code: 'PARSE_ERROR', message: 'Invalid response from server' },
    }));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during registration',
        },
      },
      { status: 500 }
    );
  }
}
