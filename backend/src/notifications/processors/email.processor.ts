import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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
  private readonly ses: SESClient;

  constructor() {
    super();
    this.ses = new SESClient({
      region: process.env.AWS_REGION || 'eu-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} for ${job.data.to.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
    );

    const { to, subject, template, variables } = job.data;

    try {
      // Generate HTML content from template
      const htmlBody = this.renderTemplate(template, variables);

      // Send via AWS SES v3
      const result = await this.ses.send(
        new SendEmailCommand({
          Source: process.env.SES_FROM_EMAIL || 'noreply@mechmind.io',
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: this.stripHtml(htmlBody),
                Charset: 'UTF-8',
              },
            },
          },
          ConfigurationSetName: process.env.SES_CONFIGURATION_SET || undefined,
        }),
      );

      this.logger.log(`Email sent successfully: ${result.MessageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error; // Trigger retry
    }
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
    // Simple template rendering - in production use a proper template engine
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

    // Replace variables with HTML-escaped values
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

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
