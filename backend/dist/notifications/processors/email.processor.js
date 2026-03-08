"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const AWS = __importStar(require("aws-sdk"));
let EmailProcessor = EmailProcessor_1 = class EmailProcessor extends bullmq_1.WorkerHost {
    constructor() {
        super();
        this.logger = new common_1.Logger(EmailProcessor_1.name);
        this.ses = new AWS.SES({
            region: process.env.AWS_REGION || 'eu-west-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    async process(job) {
        this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);
        const { to, subject, template, variables } = job.data;
        try {
            const htmlBody = this.renderTemplate(template, variables);
            const result = await this.ses.sendEmail({
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
                ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
            }).promise();
            this.logger.log(`Email sent successfully: ${result.MessageId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            throw error;
        }
    }
    onCompleted(job) {
        this.logger.log(`Email job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Email job ${job.id} failed: ${error.message}`);
    }
    renderTemplate(template, variables) {
        const templates = {
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
        let html = templates[template] || templates.booking_confirmation;
        Object.entries(variables).forEach(([key, value]) => {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
        return html;
    }
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
};
exports.EmailProcessor = EmailProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], EmailProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], EmailProcessor.prototype, "onFailed", null);
exports.EmailProcessor = EmailProcessor = EmailProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('email-queue'),
    __metadata("design:paramtypes", [])
], EmailProcessor);
