/**
 * Portal Registration API Route
 * Creates new customer account
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production')

// Mock database - replace with actual database
const MOCK_CUSTOMERS: Array<{
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  phoneVerified: boolean
  marketingConsent: boolean
  gdprConsent: boolean
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      gdprConsent,
      marketingConsent = false 
    } = body

    // Validation
    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { 
          error: { 
            code: 'MISSING_FIELDS', 
            message: 'All required fields must be provided',
            details: {
              email: !email ? ['Email is required'] : [],
              password: !password ? ['Password is required'] : [],
              firstName: !firstName ? ['First name is required'] : [],
              lastName: !lastName ? ['Last name is required'] : [],
              phone: !phone ? ['Phone is required'] : [],
            }
          } 
        },
        { status: 400 }
      )
    }

    if (!gdprConsent) {
      return NextResponse.json(
        { 
          error: { 
            code: 'GDPR_REQUIRED', 
            message: 'GDPR consent is required' 
          } 
        },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: { 
            code: 'PASSWORD_TOO_SHORT', 
            message: 'Password must be at least 8 characters long' 
          } 
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingCustomer = MOCK_CUSTOMERS.find(c => c.email === email)
    if (existingCustomer) {
      return NextResponse.json(
        { 
          error: { 
            code: 'EMAIL_EXISTS', 
            message: 'An account with this email already exists' 
          } 
        },
        { status: 409 }
      )
    }

    // Create customer - in production, hash password with bcrypt
    const newCustomer = {
      id: `cust_${Date.now()}`,
      email: email.toLowerCase().trim(),
      password, // In production: await bcrypt.hash(password, 12)
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
      phoneVerified: false,
      marketingConsent,
      gdprConsent,
    }

    // Save to database
    MOCK_CUSTOMERS.push(newCustomer)

    // Generate JWT token
    const token = await new SignJWT({
      customerId: newCustomer.id,
      email: newCustomer.email,
      type: 'portal',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET)

    // Remove password from response
    const { password: _, ...customerWithoutPassword } = newCustomer

    return NextResponse.json({
      token,
      customer: customerWithoutPassword,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'SERVER_ERROR', 
          message: 'An error occurred during registration' 
        } 
      },
      { status: 500 }
    )
  }
}
