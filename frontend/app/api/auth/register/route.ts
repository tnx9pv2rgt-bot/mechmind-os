import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

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
      const backendRes = await fetch(`${BACKEND_BASE}/v1/auth/register`, {
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

        // Extract tenant info from response and JWT
        const tenant = (data.tenant && typeof data.tenant === 'object'
          ? data.tenant
          : {}) as Record<string, unknown>;
        const tenantSlug = (tenant.slug as string) || slug;

        let tenantId = (tenant.id as string) || '';

        const response = NextResponse.json({
          success: true,
          tenantSlug,
          message: 'Registrazione completata!',
        });

        const isProduction = process.env.NODE_ENV === 'production';
        const cookieBase = {
          secure: isProduction,
          sameSite: 'lax' as const,
          path: '/',
        };

        // Set auth cookies
        if (data.tokens && typeof data.tokens === 'object') {
          const tokens = data.tokens as Record<string, unknown>;
          if (tokens.accessToken) {
            response.cookies.set('auth_token', tokens.accessToken as string, {
              ...cookieBase,
              httpOnly: true,
              maxAge: (tokens.expiresIn as number) || 86400,
            });

            // Decode JWT to extract tenantId if not already available
            if (!tenantId) {
              try {
                const parts = (tokens.accessToken as string).split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(
                    Buffer.from(parts[1], 'base64url').toString('utf-8'),
                  ) as { tenantId?: string; sub?: string };
                  tenantId = payload.tenantId || '';
                  if (!tenantId && payload.sub) {
                    const subParts = payload.sub.split(':');
                    if (subParts.length >= 2) tenantId = subParts[1];
                  }
                }
              } catch { /* ignore decode errors */ }
            }
          }
          if (tokens.refreshToken) {
            response.cookies.set('refresh_token', tokens.refreshToken as string, {
              ...cookieBase,
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60,
            });
          }
        }

        // Set tenant context cookies — CRITICAL for middleware to allow /dashboard access
        if (tenantId) {
          response.cookies.set('tenant_id', tenantId, {
            ...cookieBase,
            httpOnly: false,
          });
        }
        response.cookies.set('tenant_slug', tenantSlug, {
          ...cookieBase,
          httpOnly: false,
        });

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
