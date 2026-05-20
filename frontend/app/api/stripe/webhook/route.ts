/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events — forwards raw body to NestJS backend
 *
 * The backend handles signature verification and all database operations.
 * We forward the raw payload and Stripe-Signature header as-is.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 30_000;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${BACKEND_BASE}/v1/subscription/stripe-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': signature,
        },
        body: payload,
        signal: controller.signal,
      });

      const data: unknown = await res.json().catch(() => ({ received: true }));
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Backend timeout' },
        { status: 503 },
      );
    }
    console.error('[stripe-webhook] Error forwarding to backend:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 502 },
    );
  }
}
