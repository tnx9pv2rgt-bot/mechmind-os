import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Token di invito richiesto' },
    { status: 400 },
  );
}
