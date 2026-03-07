import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Simple demo login endpoint
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Demo credentials check
    if (email === 'demo@mechmind.it' && password === 'demo') {
      return NextResponse.json({
        success: true,
        user: {
          id: 'demo-user-id',
          email: 'demo@mechmind.it',
          name: 'Demo User',
          role: 'admin',
        },
        token: 'demo_token_' + Date.now(),
      }, {
        headers: {
          'Set-Cookie': `auth_token=demo_token_${Date.now()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
        },
      });
    }

    // Invalid credentials
    return NextResponse.json(
      { success: false, error: 'Credenziali non valide' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Errore del server' },
      { status: 500 }
    );
  }
}
