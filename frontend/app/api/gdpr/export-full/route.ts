export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const backendRes = await fetch(`${BACKEND_BASE}/v1/gdpr/export-full`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(120000),
  });

  if (!backendRes.ok) {
    return NextResponse.json(
      { success: false, error: 'Errore generazione export' },
      { status: backendRes.status },
    );
  }

  const buffer = await backendRes.arrayBuffer();
  const disposition =
    backendRes.headers.get('Content-Disposition') ??
    `attachment; filename="nexo-export-${Date.now()}.zip"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': disposition,
    },
  });
}
