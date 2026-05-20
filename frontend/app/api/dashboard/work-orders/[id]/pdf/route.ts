import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/work-orders/[id]/pdf → GET /v1/work-orders/:id/pdf (returns HTML) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;
  let tenantId = cookieStore.get('tenant_id')?.value;

  if (token && !tenantId) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
          tenantId?: string;
        };
        if (payload.tenantId) tenantId = payload.tenantId;
      }
    } catch {
      /* ignore */
    }
  }

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  try {
    const res = await fetch(`${BACKEND_BASE}/v1/work-orders/${id}/pdf`, { headers });
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'text/html; charset=utf-8',
        'Content-Disposition':
          res.headers.get('Content-Disposition') || `inline; filename="odl-${id}.html"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Backend non raggiungibile' }, { status: 502 });
  }
}
