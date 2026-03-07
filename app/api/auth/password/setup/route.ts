import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyJWT } from '@/lib/auth/tokens';

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    
    // Get user from JWT
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }
    
    // If user already has password, verify current
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Password attuale richiesta' }, { status: 400 });
      }
      
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Password attuale non valida' }, { status: 400 });
      }
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 });
    }
    
    // Hash and store
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date()
      }
    });
    
    return NextResponse.json({ success: true, message: 'Password impostata con successo' });
    
  } catch (error) {
    console.error('Password setup error:', error);
    return NextResponse.json({ error: 'Errore durante l\'impostazione' }, { status: 500 });
  }
}
