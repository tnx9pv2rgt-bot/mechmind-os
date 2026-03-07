/**
 * POST /api/auth/forgot-password
 * Send password reset email to user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_EMAIL', message: 'Email non valida' } },
        { status: 400 }
      )
    }

    // Find user by email (tenant users table)
    const user = await prisma.tenantUser.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        tenant: true,
      },
    })

    // For security, always return success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      // Simulate processing time to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return NextResponse.json({
        success: true,
        message: 'Se l\'email esiste, riceverai un link di reset',
      })
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store token in database (you should add these fields to your schema)
    // For now, we'll just log it
    console.log('Password reset requested:', {
      email: user.email,
      tenant: user.tenant.name,
      token: resetToken,
      expires: resetTokenExpiry,
    })

    // TODO: Send actual email using your email service (Resend, SendGrid, etc.)
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'MechMind OS <noreply@mechmind.io>',
    //   to: user.email,
    //   subject: 'Reset della password - MechMind OS',
    //   html: passwordResetEmailTemplate({
    //     name: user.name,
    //     resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`,
    //   }),
    // })

    return NextResponse.json({
      success: true,
      message: 'Email di reset inviata con successo',
      // In development, return the token for testing
      ...(process.env.NODE_ENV === 'development' && { 
        debug: { token: resetToken, email: user.email } 
      }),
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Errore durante l\'elaborazione della richiesta' 
        } 
      },
      { status: 500 }
    )
  }
}

// Email template function (to be implemented with your email provider)
function passwordResetEmailTemplate({ name, resetUrl }: { name: string; resetUrl: string }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password - MechMind OS</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <tr>
                <td style="padding: 40px;">
                  <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600; margin: 0 0 20px;">Ciao ${name},</h1>
                  <p style="color: #86868b; font-size: 16px; line-height: 1.5; margin: 0 0 30px;">
                    Hai richiesto il reset della password per il tuo account MechMind OS. 
                    Clicca il pulsante qui sotto per reimpostare la tua password.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetUrl}" 
                           style="display: inline-block; background-color: #0071e3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 500; font-size: 16px;">
                          Reimposta Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #86868b; font-size: 14px; line-height: 1.5; margin: 30px 0 0;">
                    Se non hai richiesto tu il reset della password, puoi ignorare questa email. 
                    Il link scadrà tra 24 ore per motivi di sicurezza.
                  </p>
                  <hr style="border: none; border-top: 1px solid #d2d2d7; margin: 30px 0;">
                  <p style="color: #86868b; font-size: 12px; margin: 0;">
                    MechMind OS - Gestionale per Officine
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}
