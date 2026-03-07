import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJWT, generateRefreshToken } from '@/lib/auth/tokens';
import bcrypt from 'bcryptjs';
import { redis } from '@/lib/redis';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Handle POST login requests
 */
export async function POST(req: NextRequest) {
  try {
    // Verify content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415, headers: corsHeaders }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, rememberMe } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password richieste' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitKey = `login:ip:${ip}`;
    
    try {
      const attempts = await redis.get(rateLimitKey);
      if (attempts && parseInt(attempts as string) >= 10) {
        return NextResponse.json(
          { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
          { status: 429, headers: corsHeaders }
        );
      }
    } catch (redisError) {
      // Log but don't fail if Redis is unavailable
      console.warn('Redis rate limiting unavailable:', redisError);
    }
    
    // Find user
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });
    
    if (!user || !user.passwordHash) {
      // Increment rate limit (fire and forget)
      try {
        await redis.incr(rateLimitKey);
        await redis.expire(rateLimitKey, 900); // 15 min
      } catch {}
      
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account bloccato. Riprova tra ${minutesLeft} minuti.` },
        { status: 429, headers: corsHeaders }
      );
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      // Increment failed attempts
      const newFailedAttempts = user.failedAttempts + 1;
      const lockedUntil = newFailedAttempts >= 5 
        ? new Date(Date.now() + 15 * 60 * 1000) // 15 min lock
        : null;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          failedAttempts: newFailedAttempts,
          lockedUntil
        }
      });
      
      // Rate limit IP (fire and forget)
      try {
        await redis.incr(rateLimitKey);
        await redis.expire(rateLimitKey, 900);
      } catch {}
      
      // Log failed attempt (fire and forget)
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'login_failed',
            status: 'failed',
            ipAddress: ip,
            userAgent: req.headers.get('user-agent') || 'unknown',
            details: { reason: 'invalid_password', attempts: newFailedAttempts }
          }
        });
      } catch {}
      
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Check if TOTP/MFA is required
    if (user.totpEnabled) {
      // Generate temp token for MFA verification step
      const tempToken = generateJWT({ 
        userId: user.id, 
        email: user.email,
        role: 'temp',
        type: 'mfa_pending'
      });
      
      return NextResponse.json({
        requiresMFA: true,
        tempToken,
        message: 'Inserisci il codice di verifica'
      }, { headers: corsHeaders });
    }
    
    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip
      }
    });
    
    // Generate tokens
    const jwtToken = generateJWT(user);
    const refreshToken = generateRefreshToken(user);
    
    // Create session
    const sessionDuration = rememberMe ? 30 : 7; // days
    const expiresAt = new Date(Date.now() + sessionDuration * 24 * 60 * 60 * 1000);
    
    await prisma.session.create({
      data: {
        userId: user.id,
        jwtToken,
        refreshToken,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || 'unknown',
        expiresAt,
      }
    });
    
    // Log success (fire and forget)
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'login_success',
          status: 'success',
          ipAddress: ip,
          userAgent: req.headers.get('user-agent') || 'unknown',
          details: { method: 'password', rememberMe }
        }
      });
    } catch {}
    
    return NextResponse.json({
      success: true,
      jwtToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Password login error:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'accesso' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Handle unsupported methods
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } }
  );
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } }
  );
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } }
  );
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } }
  );
}
