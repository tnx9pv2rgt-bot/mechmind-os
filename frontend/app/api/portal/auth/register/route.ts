/**
 * POST /api/portal/auth/register
 * Register a new portal customer — proxies to NestJS backend
 */

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/auth/register', method: 'POST', body });
}
