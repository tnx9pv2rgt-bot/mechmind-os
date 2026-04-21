/**
 * DELETE /api/auth/passkey/:id
 * Rimuove un passkey
 */

import { NextRequest, NextResponse } from 'next/server'

// Mock credential store
const credentialsStore = new Map<string, {
  credentialId: string
  userId: string
  deviceName: string
  createdAt: Date
}>()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const credentialId = id

    // In produzione: verifica sessione
    const userId = 'current-user-id' // Mock

    // Verifica che la credenziale esista e appartenga all'utente
    const credential = credentialsStore.get(credentialId)
    if (!credential) {
      return NextResponse.json(
        { error: 'Credenziale non trovata' },
        { status: 404 }
      )
    }

    if (credential.userId !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Rimuovi credenziale
    credentialsStore.delete(credentialId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete passkey error:', error)
    return NextResponse.json(
      { error: 'Errore nella rimozione del passkey' },
      { status: 500 }
    )
  }
}
