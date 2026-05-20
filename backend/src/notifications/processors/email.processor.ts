import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';

interface EmailJobData {
  tenantId: string;
  userId: string;
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
}

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} for ${job.data.to.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
    );

    const { to, subject, template, variables } = job.data;
    const html = this.renderTemplate(template, variables);

    const result = await this.emailService.sendRawEmail({ to, subject, html });
    if (!result.success) {
      throw new Error(result.error ?? 'Email send failed');
    }

    this.logger.log(`Email sent via Resend: ${result.messageId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Email job ${job.id} failed: ${error.message}`);
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    const templates: Record<string, string> = {
      booking_confirmation: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0071e3;">Conferma Prenotazione</h1>
            <p>Gentile {{customerName}},</p>
            <p>La sua prenotazione è stata confermata:</p>
            <div style="background: #f5f5f7; padding: 20px; border-radius: 10px;">
              <p><strong>Servizio:</strong> {{service}}</p>
              <p><strong>Data:</strong> {{date}}</p>
              <p><strong>Ora:</strong> {{time}}</p>
              <p><strong>Veicolo:</strong> {{vehicle}}</p>
            </div>
            <p>Codice prenotazione: <strong>{{bookingCode}}</strong></p>
            <hr style="margin: 30px 0;" />
            <p style="color: #86868b; font-size: 12px;">
              Per disiscriversi dalle notifiche, <a href="{{unsubscribeUrl}}">clicca qui</a>
            </p>
          </body>
        </html>
      `,
      booking_reminder: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ff9500;">Promemoria Prenotazione</h1>
            <p>Gentile {{customerName}},</p>
            <p>Le ricordiamo il suo appuntamento di domani:</p>
            <div style="background: #f5f5f7; padding: 20px; border-radius: 10px;">
              <p><strong>Data:</strong> {{date}}</p>
              <p><strong>Ora:</strong> {{time}}</p>
              <p><strong>Servizio:</strong> {{service}}</p>
            </div>
            <p>Codice: <strong>{{bookingCode}}</strong></p>
          </body>
        </html>
      `,
    };

    // eslint-disable-next-line security/detect-object-injection
    let html = templates[template] || templates.booking_confirmation;

    Object.entries(variables).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedValue = this.escapeHtml(String(value));
      // eslint-disable-next-line security/detect-non-literal-regexp
      html = html.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), escapedValue);
    });

    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
