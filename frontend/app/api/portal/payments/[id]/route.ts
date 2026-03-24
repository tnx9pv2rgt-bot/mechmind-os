/**
 * Portal Payment Status API Route
 * GET: Get payment status by ID — proxies to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/portal/payments/${id}` });
}
