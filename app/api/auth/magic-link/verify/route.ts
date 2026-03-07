import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJWT, generateRefreshToken } from '@/lib/auth/tokens';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.redirect('/auth?error=token_missing');
    }
    
    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token }
    });
    
    // Validate
    if (!magicLink || magicLink.expiresAt < new Date() || magicLink.usedAt) {
      return NextResponse.redirect('/auth?error=link_expired');
    }
    
    // Find user
    const user = await prisma.user.findFirst({
      where: { email: magicLink.email }
    });
    
    if (!user) {
      return NextResponse.redirect('/auth?error=user_not_found');
    }
    
    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() }
    });
    
    // Generate tokens
    const jwtToken = generateJWT(user);
    const refreshToken = generateRefreshToken(user);
    
    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        jwtToken,
        refreshToken,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for') || '' }
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'login_success',
        status: 'success',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: { method: 'magic_link' }
      }
    });
    
    // Set cookies and redirect
    const response = NextResponse.redirect('/dashboard');
    response.cookies.set('jwt', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
    });
    
    return response;
    
  } catch (error) {
    console.error('Magic link verify error:', error);
    return NextResponse.redirect('/auth?error=verification_failed');
  }
}
