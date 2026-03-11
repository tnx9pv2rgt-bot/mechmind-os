/**
 * POST /api/stripe/grace-period-check
 * Cron job endpoint to check and process grace periods
 * Should be called daily by a scheduler (Vercel Cron, etc.)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { processGracePeriods } from '@/lib/stripe/grace-period'

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Process grace periods
    await processGracePeriods()

    return NextResponse.json({
      success: true,
      message: 'Grace period check completed',
    })
  } catch (error: any) {
    console.error('Grace period check error:', error)

    return NextResponse.json(
      { 
        error: 'Grace period check failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Use POST in production' },
      { status: 405 }
    )
  }

  try {
    await processGracePeriods()
    return NextResponse.json({
      success: true,
      message: 'Grace period check completed (dev mode)',
    })
  } catch (error: any) {
    console.error('Grace period check error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
