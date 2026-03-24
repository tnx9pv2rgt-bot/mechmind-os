import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  return proxyToNestJS({ backendPath: 'v1/subscription/current' });
}
