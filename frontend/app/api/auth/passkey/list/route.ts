/**
 * GET /api/auth/passkey/list
 * Recupera la lista dei passkey dell'utente
 */

import { NextRequest, NextResponse } from 'next/server'

// Mock credential store
const credentialsStore = new Map<string, {
  credentialId: string
  userId: string
  deviceName: string
  createdAt: Date
  lastUsedAt?: Date
}>()

export async function GET(request: NextRequest) {
  try {
    // In produzione: verifica sessione e recupera userId
    const userId = 'current-user-id'

    // Filtra credenziali dell'utente
    const userCredentials = Array.from(credentialsStore.values())
      .filter(cred => cred.userId === userId)
      .map(cred => ({
        id: cred.credentialId.slice(0, 16) + '...',
        credentialId: cred.credentialId,
        deviceName: cred.deviceName,
        createdAt: cred.createdAt.toISOString(),
        lastUsedAt: cred.lastUsedAt?.toISOString(),
      }))

    return NextResponse.json(userCredentials)
  } catch (error) {
    console.error('List passkeys error:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei passkey' },
      { status: 500 }
    )
  }
}
