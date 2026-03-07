/**
 * Email Notifications for Billing Events
 * Templates and sending functions for billing-related emails
 */

export type BillingEmailType =
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'payment_success'
  | 'payment_failed'
  | 'invoice_created'
  | 'invoice_paid'
  | 'grace_period_warning'
  | 'account_suspended'

interface EmailData {
  tenantId: string
  tenantName?: string
  email: string
  plan?: string
  amount?: number
  currency?: string
  date?: string
  invoiceId?: string
  gracePeriodEnd?: string
}

/**
 * Send billing-related email notification
 */
export async function sendBillingEmail(
  type: BillingEmailType,
  data: EmailData
): Promise<void> {
  const template = getEmailTemplate(type, data)
  
  try {
    // Call the notifications API
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: data.tenantId,
        type: 'billing',
        channels: ['email'],
        data: {
          subject: template.subject,
          html: template.html,
          text: template.text,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send email')
    }

    console.log(`📧 Billing email sent: ${type} to ${data.email}`)
  } catch (error) {
    console.error('Failed to send billing email:', error)
    throw error
  }
}

/**
 * Get email template based on type
 */
function getEmailTemplate(type: BillingEmailType, data: EmailData) {
  const templates: Record<BillingEmailType, { subject: string; html: string; text: string }> = {
    subscription_activated: {
      subject: '✅ Abbonamento MechMind OS Attivato',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007AFF;">Benvenuto in MechMind OS!</h1>
          <p>Il tuo abbonamento <strong>${data.plan}</strong> è stato attivato con successo.</p>
          <div style="background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Dettagli Abbonamento</h3>
            <p><strong>Piano:</strong> ${data.plan}</p>
            <p><strong>Data attivazione:</strong> ${formatDate(data.date)}</p>
          </div>
          <p>Puoi gestire il tuo abbonamento dalla <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">dashboard di fatturazione</a>.</p>
        </div>
      `,
      text: `Benvenuto in MechMind OS! Il tuo abbonamento ${data.plan} è stato attivato.`,
    },
    
    subscription_canceled: {
      subject: '❌ Abbonamento Cancellato',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF3B30;">Abbonamento Cancellato</h1>
          <p>Il tuo abbonamento è stato cancellato come richiesto.</p>
          <p>L'accesso rimarrà attivo fino alla fine del periodo di fatturazione corrente.</p>
          <p>Se cambi idea, puoi <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">riattivare l'abbonamento</a> in qualsiasi momento.</p>
        </div>
      `,
      text: 'Il tuo abbonamento è stato cancellato. Accesso attivo fino alla fine del periodo.',
    },
    
    payment_success: {
      subject: '✅ Pagamento Confermato',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #34C759;">Pagamento Ricevuto</h1>
          <p>Grazie! Abbiamo ricevuto il tuo pagamento di <strong>${formatAmount(data.amount, data.currency)}</strong>.</p>
          <p>La fattura è disponibile nella tua <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">dashboard</a>.</p>
        </div>
      `,
      text: `Pagamento di ${formatAmount(data.amount, data.currency)} ricevuto. Grazie!`,
    },
    
    payment_failed: {
      subject: '⚠️ Pagamento Non Riuscito',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF9500;">Problema con il Pagamento</h1>
          <p>Il pagamento di <strong>${formatAmount(data.amount, data.currency)}</strong> non è andato a buon fine.</p>
          <div style="background: #FFF3E0; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Periodo di grazia:</strong> Hai 3 giorni per aggiornare il metodo di pagamento.</p>
          </div>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Aggiorna Pagamento</a></p>
        </div>
      `,
      text: `Pagamento non riuscito. Aggiorna il metodo di pagamento entro 3 giorni.`,
    },
    
    invoice_created: {
      subject: '📄 Nuova Fattura Disponibile',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007AFF;">Nuova Fattura</h1>
          <p>È stata emessa una nuova fattura per <strong>${formatAmount(data.amount, data.currency)}</strong>.</p>
          <p>Scadenza: ${formatDate(data.date)}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Visualizza fattura</a></p>
        </div>
      `,
      text: `Nuova fattura disponibile: ${formatAmount(data.amount, data.currency)}`,
    },
    
    invoice_paid: {
      subject: '✅ Fattura Pagata',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #34C759;">Fattura Pagata</h1>
          <p>La fattura #${data.invoiceId} per <strong>${formatAmount(data.amount, data.currency)}</strong> è stata pagata.</p>
        </div>
      `,
      text: `Fattura #${data.invoiceId} pagata: ${formatAmount(data.amount, data.currency)}`,
    },
    
    grace_period_warning: {
      subject: '⏰ Attenzione: Periodo di Grazia in Scadenza',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF9500;">Periodo di Grazia in Scadenza</h1>
          <p>Il tuo periodo di grazia scade <strong>${formatDate(data.gracePeriodEnd)}</strong>.</p>
          <p>Se non aggiorni il metodo di pagamento, l'account verrà sospeso.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Aggiorna Ora</a></p>
        </div>
      `,
      text: `Periodo di grazia in scadenza il ${formatDate(data.gracePeriodEnd)}. Aggiorna il pagamento.`,
    },
    
    account_suspended: {
      subject: '🚫 Account Sospeso',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF3B30;">Account Sospeso</h1>
          <p>Il tuo account è stato sospeso a causa di un pagamento non ricevuto.</p>
          <p>Per riattivare l'account, aggiorna il metodo di pagamento:</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Riattiva Account</a></p>
        </div>
      `,
      text: 'Account sospeso. Aggiorna il metodo di pagamento per riattivare.',
    },
  }

  return templates[type]
}

/**
 * Format amount for display
 */
function formatAmount(amount?: number, currency?: string): string {
  if (amount === undefined) return 'N/A'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'EUR',
  }).format(amount / 100)
}

/**
 * Format date for display
 */
function formatDate(date?: string): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
