import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: 'v1/obd/devices/pair', method: 'POST', body });
}
