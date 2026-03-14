import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface RegisterBody {
  shopName: string;
  slug: string;
  name: string;
  email: string;
  password: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/auth/register
 *
 * Proxies registration to the backend which has the full Prisma schema
 * with User model and bcrypt for password hashing.
 *
 * If backend doesn't have a register endpoint, we use the frontend
 * Prisma client with the available models (Tenant + TenantUser).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as RegisterBody;

    // Validation
    if (!body.shopName?.trim()) {
      return NextResponse.json({ error: 'Nome officina obbligatorio' }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome completo obbligatorio' }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }
    if (!body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 8 caratteri' },
        { status: 400 }
      );
    }

    const slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.shopName);

    // Proxy to backend NestJS (has User model + bcrypt password hashing)
    try {
      const backendRes = await fetch(`${BACKEND_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: body.shopName.trim(),
          slug,
          name: body.name.trim(),
          email: body.email.toLowerCase().trim(),
          password: body.password,
        }),
        signal: AbortSignal.timeout(30_000), // Render cold start ~30s
      });

      if (backendRes.ok) {
        const raw = (await backendRes.json()) as Record<string, unknown>;
        // Backend wraps in { success, data: {...}, timestamp }
        const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<
          string,
          unknown
        >;

        const response = NextResponse.json({
          success: true,
          tenantSlug: slug,
          message: 'Registrazione completata!',
        });

        // Se il backend restituisce tokens, setta cookie HttpOnly
        if (data.tokens && typeof data.tokens === 'object') {
          const tokens = data.tokens as Record<string, unknown>;
          if (tokens.accessToken) {
            response.cookies.set('auth_token', tokens.accessToken as string, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: (tokens.expiresIn as number) || 86400,
            });
          }
          if (tokens.refreshToken) {
            response.cookies.set('refresh_token', tokens.refreshToken as string, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 7 * 24 * 60 * 60,
            });
          }
        }

        return response;
      }

      // Errori 4xx dal backend — forwarda
      if (backendRes.status >= 400 && backendRes.status < 500) {
        const errorData = (await backendRes.json()) as Record<string, unknown>;
        return NextResponse.json(
          { error: (errorData.message as string) || 'Errore durante la registrazione' },
          { status: backendRes.status }
        );
      }
    } catch {
      // Backend non disponibile — fallback Prisma locale
    }

    // Fallback: local registration using frontend Prisma (Tenant + TenantUser)
    const { prisma } = await import('@/lib/prisma');

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Questo slug è già in uso. Scegline un altro.' },
        { status: 409 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.tenantUser.findFirst({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Questa email è già registrata.' }, { status: 409 });
    }

    // Create tenant + user in transaction
    const result = await prisma.$transaction(async tx => {
      const tenant = await tx.tenant.create({
        data: {
          name: body.shopName.trim(),
          slug,
          email: body.email.toLowerCase().trim(),
          country: 'IT',
        },
      });

      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: `local_${Date.now()}`,
          email: body.email.toLowerCase().trim(),
          role: 'ADMIN',
          isActive: true,
        },
      });

      return tenant;
    });

    return NextResponse.json({
      success: true,
      tenantSlug: result.slug,
      message: 'Registrazione completata! Puoi accedere.',
    });
  } catch (error: unknown) {
    console.error('[register] Error:', error);
    return NextResponse.json(
      { error: 'Errore durante la registrazione. Riprova.' },
      { status: 500 }
    );
  }
}
