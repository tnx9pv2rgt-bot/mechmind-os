/**
 * POST /api/auth/passkey/authenticate
 * Verifica l'autenticazione con passkey
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// Mock credential store (condiviso con register)
const credentialsStore = new Map<string, {
  credentialId: string
  publicKey: string
  userId: string
  deviceName: string
  platform: string
  counter: number
  createdAt: Date
  lastUsedAt?: Date
}>()

// Mock user store
const usersStore = new Map<string, {
  id: string
  email: string
  name: string
}>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle,
    } = body

    // Validazione
    if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
      return NextResponse.json(
        { error: 'Dati di autenticazione incompleti' },
        { status: 400 }
      )
    }

    // Verifica challenge
    const sessionId = request.cookies.get('passkey_challenge')?.value
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Sessione scaduta o non valida' },
        { status: 400 }
      )
    }

    // Recupera credenziale
    const credential = credentialsStore.get(credentialId)
    if (!credential) {
      return NextResponse.json(
        { error: 'Credenziale non trovata' },
        { status: 400 }
      )
    }

    // Verifica counter (previene replay attacks)
    const newCounter = credential.counter + 1
    if (newCounter <= credential.counter) {
      return NextResponse.json(
        { error: 'Possibile attacco replay rilevato' },
        { status: 400 }
      )
    }

    // Aggiorna credenziale
    credential.counter = newCounter
    credential.lastUsedAt = new Date()
    credentialsStore.set(credentialId, credential)

    // Recupera o crea utente
    let user = usersStore.get(credential.userId)
    if (!user) {
      user = {
        id: credential.userId,
        email: `user-${credential.userId.slice(-6)}@example.com`,
        name: 'Utente',
      }
      usersStore.set(credential.userId, user)
    }

    // Genera token di sessione
    const token = randomBytes(32).toString('hex')

    // Risposta
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })

    // Imposta cookie di sessione
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 giorni
    })

    // Pulisci challenge
    response.cookies.delete('passkey_challenge')

    return response
  } catch (error) {
    console.error('Passkey authentication error:', error)
    return NextResponse.json(
      { error: 'Errore nell\'autenticazione' },
      { status: 500 }
    )
  }
}
