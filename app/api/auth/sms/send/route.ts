import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { randomInt } from 'crypto';

// SMS Provider configuration (Twilio example)
interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'messagebird';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

const smsConfig: SMSConfig = {
  provider: (process.env.SMS_PROVIDER as SMSConfig['provider']) || 'twilio',
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.SMS_FROM_NUMBER,
};

/**
 * Send SMS via Twilio
 */
async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  try {
    const twilio = require('twilio');
    const client = twilio(smsConfig.accountSid, smsConfig.authToken);
    
    await client.messages.create({
      body: message,
      from: smsConfig.fromNumber,
      to,
    });
    
    return true;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}

/**
 * Send SMS via AWS SNS
 */
async function sendAwsSnsSMS(to: string, message: string): Promise<boolean> {
  try {
    const AWS = require('aws-sdk');
    const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'eu-west-1' });
    
    await sns.publish({
      Message: message,
      PhoneNumber: to,
    }).promise();
    
    return true;
  } catch (error) {
    console.error('AWS SNS SMS error:', error);
    return false;
  }
}

/**
 * Send SMS via MessageBird
 */
async function sendMessageBirdSMS(to: string, message: string): Promise<boolean> {
  try {
    const messagebird = require('messagebird')(process.env.MESSAGEBIRD_API_KEY);
    
    await new Promise((resolve, reject) => {
      messagebird.messages.create({
        originator: 'MechMind',
        recipients: [to],
        body: message,
      }, (err: any, response: any) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
    
    return true;
  } catch (error) {
    console.error('MessageBird SMS error:', error);
    return false;
  }
}

/**
 * Send SMS using configured provider
 */
async function sendSMS(to: string, message: string): Promise<boolean> {
  switch (smsConfig.provider) {
    case 'twilio':
      return sendTwilioSMS(to, message);
    case 'aws-sns':
      return sendAwsSnsSMS(to, message);
    case 'messagebird':
      return sendMessageBirdSMS(to, message);
    default:
      console.warn(`Unknown SMS provider: ${smsConfig.provider}`);
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone, userId, purpose = 'login' } = await req.json();

    // Validate phone number (basic validation)
    if (!phone || !/^\+[1-9]\d{1,14}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Numero di telefono non valido. Usa il formato internazionale (+39...)' },
        { status: 400 }
      );
    }

    // Rate limiting: max 3 SMS per phone per hour
    const rateLimitKey = `sms:rate:${phone}`;
    const attempts = await redis.get(rateLimitKey);
    if (attempts && parseInt(attempts as string) >= 3) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un\'ora.' },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Redis with phone number key
    const otpKey = `sms:otp:${phone}`;
    await redis.setex(otpKey, 600, JSON.stringify({
      otp,
      userId,
      purpose,
      expiresAt,
      attempts: 0,
    }));

    // Increment rate limit
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 3600); // 1 hour

    // Send SMS (in development, just log)
    const message = `Il tuo codice di verifica MechMind OS è: ${otp}. Valido per 10 minuti.`;
    
    if (process.env.NODE_ENV === 'production') {
      const sent = await sendSMS(phone, message);
      if (!sent) {
        return NextResponse.json(
          { error: 'Errore durante l\'invio dell\'SMS. Riprova più tardi.' },
          { status: 500 }
        );
      }
    } else {
      console.log('📱 SMS OTP (dev mode):', { phone, otp, message });
    }

    return NextResponse.json({
      success: true,
      message: 'Codice inviato con successo',
      // In development only: return OTP for testing
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'invio dell\'SMS' },
      { status: 500 }
    );
  }
}
