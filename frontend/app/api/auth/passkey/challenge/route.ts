/**
 * POST /api/auth/passkey/challenge
 * Genera una challenge per registrazione o autenticazione passkey
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// In produzione, usa Redis o database per memorizzare le challenge
const challengeStore = new Map<string, { challenge: string; expires: Date }>()

// Cleanup delle challenge scadute ogni 5 minuti
setInterval(() => {
  const now = new Date()
  for (const [key, value] of Array.from(challengeStore.entries())) {
    if (value.expires < now) {
      challengeStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    if (!type || !['registration', 'authentication'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo challenge non valido' },
        { status: 400 }
      )
    }

    // Genera challenge casuale (32 bytes = 256 bit)
    const challengeBuffer = randomBytes(32)
    const challenge = challengeBuffer.toString('base64url')

    // Crea session ID temporaneo
    const sessionId = randomBytes(16).toString('hex')
    
    // Salva challenge con scadenza (5 minuti)
    challengeStore.set(sessionId, {
      challenge,
      expires: new Date(Date.now() + 5 * 60 * 1000),
    })

    // Imposta cookie con session ID
    const response = NextResponse.json({ challenge })
    response.cookies.set('passkey_challenge', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300, // 5 minuti
    })

    return response
  } catch (error) {
    console.error('Challenge generation error:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione della challenge' },
      { status: 500 }
    )
  }
}
