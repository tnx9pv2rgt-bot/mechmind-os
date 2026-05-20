/**
 * POST /api/tenant/register
 * Register a new tenant (auto-repair shop) — proxies to NestJS backend
 */

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/admin/register', method: 'POST', body });
}
