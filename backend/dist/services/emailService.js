"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.isEmailServiceConfigured = isEmailServiceConfigured;
exports.sendEmail = sendEmail;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@mechmind.io';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'MechMind';
const APP_URL = process.env.APP_URL || 'https://app.mechmind.io';
if (SENDGRID_API_KEY) {
    mail_1.default.setApiKey(SENDGRID_API_KEY);
}
const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 20px !important; }
      .button { width: 100% !important; display: block !important; text-align: center !important; }
    }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 30px; color: #374151; line-height: 1.6; }
    .content h2 { color: #111827; margin-top: 0; font-size: 24px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #667eea; text-decoration: none; }
    .token-box { background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: 2px; word-break: break-all; }
    .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .warning-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 MechMind OS</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>MechMind OS</strong> - Gestionale per Officine Meccaniche</p>
      <p>Questa email è stata inviata automaticamente. Non rispondere a questo indirizzo.</p>
      <p>Se hai bisogno di assistenza, contattaci su <a href="mailto:support@mechmind.io">support@mechmind.io</a></p>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} MechMind. Tutti i diritti riservati.
      </p>
    </div>
  </div>
</body>
</html>
`;
const verificationEmailTemplate = (firstName, verificationLink, _token) => {
    const content = `
    <h2>Ciao ${firstName}, benvenuto su MechMind! 👋</h2>
    <p>Grazie per esserti registrato. Per completare la registrazione e attivare il tuo account, conferma il tuo indirizzo email cliccando il pulsante qui sotto:</p>
    <div style="text-align: center;">
      <a href="${verificationLink}" class="button">Verifica Email</a>
    </div>
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Oppure copia e incolla questo link nel tuo browser:<br>
      <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
    </p>
    <div class="info-box">
      <strong>⏰ Token di verifica:</strong><br>
      Il token scade tra 24 ore per motivi di sicurezza.
    </div>
    <div class="warning-box">
      <strong>⚠️ Non hai richiesto questa registrazione?</strong><br>
      Se non sei stato tu a registrarti, puoi ignorare questa email. Nessun account verrà creato.
    </div>
  `;
    return baseTemplate(content, 'Verifica il tuo account MechMind');
};
const welcomeEmailTemplate = (firstName, dashboardLink) => {
    const content = `
    <h2>Benvenuto su MechMind, ${firstName}! 🎉</h2>
    <p>Il tuo account è stato verificato con successo. Siamo felici di averti con noi!</p>
    <div class="info-box">
      <strong>✅ Cosa puoi fare ora:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Gestire clienti e veicoli</li>
        <li>Prenotare appuntamenti</li>
        <li>Tracciare riparazioni e DVI</li>
        <li>Gestire il magazzino ricambi</li>
        <li>Generare report e analisi</li>
      </ul>
    </div>
    <div style="text-align: center;">
      <a href="${dashboardLink}" class="button">Vai alla Dashboard</a>
    </div>
    <p style="margin-top: 30px;">
      <strong>💡 Suggerimento:</strong> Completa il profilo del tuo officina per sfruttare al massimo tutte le funzionalità.
    </p>
    <p>Se hai domande, il nostro team di supporto è sempre disponibile.</p>
  `;
    return baseTemplate(content, 'Benvenuto su MechMind!');
};
const passwordResetTemplate = (firstName, resetLink, token) => {
    const content = `
    <h2>Ciao ${firstName},</h2>
    <p>Hai richiesto il reset della password per il tuo account MechMind. Clicca il pulsante qui sotto per impostare una nuova password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Oppure copia e incolla questo link nel tuo browser:<br>
      <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
    </p>
    <div class="token-box">
      <strong>Token di reset:</strong><br>
      ${token}
    </div>
    <div class="warning-box">
      <strong>⏰ Scadenza:</strong><br>
      Questo link scade tra <strong>1 ora</strong> per motivi di sicurezza. Se non hai richiesto tu il reset, ignora questa email.
    </div>
    <p style="color: #dc2626; font-size: 14px;">
      <strong>🔒 Sicurezza:</strong> Non condividere mai questo link con nessuno. Il team di MechMind non ti chiederà mai la tua password.
    </p>
  `;
    return baseTemplate(content, 'Reset Password MechMind');
};
async function sendVerificationEmail(email, token, firstName) {
    try {
        if (!SENDGRID_API_KEY) {
            throw new Error('SendGrid API key non configurata');
        }
        const verificationLink = `${APP_URL}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        const msg = {
            to: email,
            from: {
                email: EMAIL_FROM_ADDRESS,
                name: EMAIL_FROM_NAME,
            },
            subject: '🔐 Verifica il tuo account MechMind',
            text: `Ciao ${firstName},\n\nBenvenuto su MechMind! Per verificare il tuo account, clicca questo link: ${verificationLink}\n\nIl token scade tra 24 ore.\n\nSe non hai richiesto questa registrazione, ignora questa email.`,
            html: verificationEmailTemplate(firstName, verificationLink, token),
            trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true },
            },
        };
        const [response] = await mail_1.default.send(msg);
        return {
            success: true,
            messageId: response.headers['x-message-id'],
        };
    }
    catch (error) {
        console.error('Errore invio email di verifica:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Errore sconosciuto durante l'invio dell'email",
        };
    }
}
async function sendWelcomeEmail(email, firstName) {
    try {
        if (!SENDGRID_API_KEY) {
            throw new Error('SendGrid API key non configurata');
        }
        const dashboardLink = `${APP_URL}/dashboard`;
        const msg = {
            to: email,
            from: {
                email: EMAIL_FROM_ADDRESS,
                name: EMAIL_FROM_NAME,
            },
            subject: '🎉 Benvenuto su MechMind OS!',
            text: `Ciao ${firstName},\n\nBenvenuto su MechMind! Il tuo account è stato verificato con successo.\n\nAccedi alla dashboard: ${dashboardLink}\n\nGrazie per averci scelto!`,
            html: welcomeEmailTemplate(firstName, dashboardLink),
            trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true },
            },
        };
        const [response] = await mail_1.default.send(msg);
        return {
            success: true,
            messageId: response.headers['x-message-id'],
        };
    }
    catch (error) {
        console.error('Errore invio email di benvenuto:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Errore sconosciuto durante l'invio dell'email",
        };
    }
}
async function sendPasswordResetEmail(email, token) {
    try {
        if (!SENDGRID_API_KEY) {
            throw new Error('SendGrid API key non configurata');
        }
        const firstName = email.split('@')[0];
        const resetLink = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
        const msg = {
            to: email,
            from: {
                email: EMAIL_FROM_ADDRESS,
                name: EMAIL_FROM_NAME,
            },
            subject: '🔑 Reset Password MechMind',
            text: `Ciao,\n\nHai richiesto il reset della password. Clicca questo link: ${resetLink}\n\nIl link scade tra 1 ora.\n\nSe non hai richiesto tu il reset, ignora questa email.`,
            html: passwordResetTemplate(firstName, resetLink, token),
            trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true },
            },
        };
        const [response] = await mail_1.default.send(msg);
        return {
            success: true,
            messageId: response.headers['x-message-id'],
        };
    }
    catch (error) {
        console.error('Errore invio email reset password:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Errore sconosciuto durante l'invio dell'email",
        };
    }
}
function isEmailServiceConfigured() {
    return !!SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.');
}
async function sendEmail(options) {
    try {
        if (!SENDGRID_API_KEY) {
            throw new Error('SendGrid API key non configurata');
        }
        const msg = {
            ...options,
            from: {
                email: EMAIL_FROM_ADDRESS,
                name: EMAIL_FROM_NAME,
            },
        };
        const [response] = await mail_1.default.send(msg);
        return {
            success: true,
            messageId: response.headers['x-message-id'],
        };
    }
    catch (error) {
        console.error('Errore invio email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Errore sconosciuto durante l'invio dell'email",
        };
    }
}
exports.default = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendEmail,
    isEmailServiceConfigured,
};
