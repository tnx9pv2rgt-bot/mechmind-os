/**
 * Portal Documents API Route
 * GET: List customer documents
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production')

async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.substring(7)
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.customerId as string
  } catch {
    return null
  }
}

const mockDocuments = [
  {
    id: 'd1',
    customerId: '1',
    vehicleId: 'v1',
    type: 'invoice',
    documentNumber: 'FAT-2024-001',
    title: 'Fattura Tagliando Gennaio',
    description: 'Tagliando ordinario',
    amount: 350.00,
    issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    fileUrl: '/docs/invoice-001.pdf',
    fileSize: 245760,
    fileType: 'application/pdf',
    status: 'paid',
  },
]

export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyAuth(request)
    
    if (!customerId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    // Filter by customer ID
    let documents = mockDocuments.filter(d => d.customerId === customerId)

    // Filter by type
    if (type) {
      documents = documents.filter(d => d.type === type)
    }

    // Filter by search
    if (search) {
      const query = search.toLowerCase()
      documents = documents.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.documentNumber.toLowerCase().includes(query)
      )
    }

    return NextResponse.json({
      success: true,
      data: documents,
      meta: {
        total: documents.length,
      },
    })

  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load documents' } },
      { status: 500 }
    )
  }
}
