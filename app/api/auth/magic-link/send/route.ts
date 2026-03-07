import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email non valida' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase();
    
    // Find user (don't reveal if exists for privacy)
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });
    
    // Rate limiting: max 3 magic links per email per hour
    const rateLimitKey = `magiclink:rate:${normalizedEmail}`;
    const attempts = await redis.get(rateLimitKey);
    if (attempts && parseInt(attempts as string) >= 3) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un\'ora.' },
        { status: 429 }
      );
    }
    
    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store in database
    await prisma.magicLink.create({
      data: {
        email: normalizedEmail,
        token,
        tenantId: user?.tenantId,
        expiresAt,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    });
    
    // Increment rate limit
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 3600); // 1 hour
    
    // Send email (only if user exists - privacy)
    if (user && process.env.RESEND_API_KEY) {
      const magicUrl = `${process.env.NEXT_PUBLIC_URL}/auth/magic-link/verify?token=${token}`;
      
      await resend.emails.send({
        from: 'MechMind OS <noreply@mechmindos.it>',
        to: normalizedEmail,
        subject: 'Il tuo link di accesso a MechMind OS',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Accesso MechMind OS</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .content { padding: 40px; }
              h1 { color: #1d1d1f; font-size: 24px; margin: 0 0 20px; }
              p { color: #86868b; font-size: 16px; line-height: 1.5; margin: 0 0 30px; }
              .button { display: inline-block; background: #0071e3; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 500; }
              .footer { padding: 20px 40px; background: #f5f5f7; font-size: 12px; color: #86868b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <h1>Ciao ${user.name},</h1>
                <p>Hai richiesto un link per accedere al tuo gestionale MechMind OS. Clicca il pulsante qui sotto per entrare:</p>
                <p><a href="${magicUrl}" class="button">Accedi al Gestionale</a></p>
                <p style="margin-top: 30px; font-size: 14px;">Questo link scade tra <strong>15 minuti</strong> per motivi di sicurezza.<br>Se non hai richiesto questo link, puoi ignorare questa email.</p>
              </div>
              <div class="footer">
                MechMind OS - Gestionale per Officine | supporto@mechmindos.it
              </div>
            </div>
          </body>
          </html>
        `
      });
    }
    
    // Always return success (privacy: don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'Se l\'email esiste, riceverai un link di accesso entro pochi minuti.'
    });
    
  } catch (error) {
    console.error('Magic link send error:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'invio. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
