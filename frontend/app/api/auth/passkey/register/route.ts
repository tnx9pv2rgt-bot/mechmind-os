/**
 * POST /api/auth/passkey/register
 * Registra un nuovo passkey per l'utente
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// In produzione, usa un database vero
interface StoredCredential {
  credentialId: string
  publicKey: string
  userId: string
  deviceName: string
  platform: string
  counter: number
  createdAt: Date
  lastUsedAt?: Date
}

const credentialsStore = new Map<string, StoredCredential>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      credentialId,
      clientDataJSON,
      attestationObject,
      metadata,
    } = body

    // Validazione
    if (!credentialId || !clientDataJSON || !attestationObject) {
      return NextResponse.json(
        { error: 'Dati di registrazione incompleti' },
        { status: 400 }
      )
    }

    // Verifica challenge (in produzione: controlla il cookie)
    const sessionId = request.cookies.get('passkey_challenge')?.value
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Sessione scaduta o non valida' },
        { status: 400 }
      )
    }

    // Estrai public key (semplificato - usa @simplewebauthn/server in produzione)
    const mockPublicKey = `mock-public-key-${randomBytes(16).toString('hex')}`

    // Salva credenziale
    const userId = `user-${randomBytes(8).toString('hex')}`
    
    const credential: StoredCredential = {
      credentialId,
      publicKey: mockPublicKey,
      userId,
      deviceName: metadata?.deviceName || 'Dispositivo sconosciuto',
      platform: metadata?.platform || 'unknown',
      counter: 0,
      createdAt: new Date(),
    }

    credentialsStore.set(credentialId, credential)

    // Pulisci cookie challenge
    const response = NextResponse.json({
      success: true,
      credentialId,
      deviceName: credential.deviceName,
    })
    response.cookies.delete('passkey_challenge')

    return response
  } catch (error) {
    console.error('Passkey registration error:', error)
    return NextResponse.json(
      { error: 'Errore nella registrazione del passkey' },
      { status: 500 }
    )
  }
}
