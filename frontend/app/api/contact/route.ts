import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json() as { name?: string; email?: string; message?: string };

  if (!body.name || !body.email || !body.message) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Tutti i campi sono obbligatori' } },
      { status: 400 },
    );
  }

  // Contact form — in production, send email via backend notification service
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Funzionalità non ancora disponibile' } },
    { status: 501 },
  );
}
