import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Funzionalità non ancora disponibile' } },
    { status: 501 },
  );
}
