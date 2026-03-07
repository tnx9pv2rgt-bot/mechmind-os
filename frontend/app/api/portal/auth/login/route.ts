/**
 * Portal Login API Route
 * Authenticates customers and returns JWT token
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SignJWT } from 'jose'

// In production, use environment variable
const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production')

// Mock customer database - replace with actual database
const MOCK_CUSTOMERS = [
  {
    id: '1',
    email: 'demo@mechmind.com',
    password: 'password123', // In production, use bcrypt hashed passwords
    firstName: 'Mario',
    lastName: 'Rossi',
    phone: '+39 333 1234567',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailVerified: true,
    phoneVerified: true,
    marketingConsent: true,
    gdprConsent: true,
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: { 
            code: 'MISSING_CREDENTIALS', 
            message: 'Email and password are required' 
          } 
        },
        { status: 400 }
      )
    }

    // Find customer - replace with database query
    const customer = MOCK_CUSTOMERS.find(c => c.email === email)

    if (!customer) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_CREDENTIALS', 
            message: 'Invalid email or password' 
          } 
        },
        { status: 401 }
      )
    }

    // Verify password - in production use bcrypt.compare
    if (customer.password !== password) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_CREDENTIALS', 
            message: 'Invalid email or password' 
          } 
        },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = await new SignJWT({
      customerId: customer.id,
      email: customer.email,
      type: 'portal',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET)

    // Remove password from response
    const { password: _, ...customerWithoutPassword } = customer

    return NextResponse.json({
      token,
      customer: customerWithoutPassword,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'SERVER_ERROR', 
          message: 'An error occurred during login' 
        } 
      },
      { status: 500 }
    )
  }
}
