import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const { invoiceId, ...rest } = body as { invoiceId: string; [key: string]: unknown };
  return proxyToNestJS({
    backendPath: `v1/invoices/${invoiceId}/refund`,
    method: 'POST',
    body: rest,
  });
}
