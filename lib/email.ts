import { ResendProvider } from '@/lib/email/providers/resend';
import { SendGridProvider } from '@/lib/email/providers/sendgrid';
import { AWSESProvider } from '@/lib/email/providers/ses';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string; status: string }>;
  validateConfig(): Promise<boolean>;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'aws-ses';
  apiKey: string;
  fromEmail: string;
  region?: string; // For AWS SES
}

export class EmailService {
  private provider: EmailProvider;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'resend':
        return new ResendProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'aws-ses':
        return new AWSESProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async send(message: EmailMessage): Promise<{ id: string; status: string }> {
    try {
      const result = await this.provider.send({
        ...message,
        from: message.from || this.config.fromEmail,
      });

      // Log successful email sending
      console.log(`Email sent successfully via ${this.config.provider}:`, {
        id: result.id,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
      });

      return result;
    } catch (error) {
      console.error(`Failed to send email via ${this.config.provider}:`, error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      return await this.provider.validateConfig();
    } catch (error) {
      console.error('Email provider config validation failed:', error);
      return false;
    }
  }
}

// Singleton instance for the application
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    const config: EmailConfig = {
      provider: (process.env.EMAIL_SERVICE_PROVIDER as any) || 'resend',
      apiKey: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@yourapp.com',
      region: process.env.AWS_SES_REGION,
    };

    if (!config.apiKey) {
      console.warn('Email service not configured. EMAIL_API_KEY environment variable is required.');
    }

    emailService = new EmailService(config);
  }

  return emailService;
}

// Convenience functions for common email types
export async function sendWelcomeEmail(to: string, userName: string, teamName?: string) {
  const emailService = getEmailService();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Nex-Intel</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Nex-Intel</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to Nex-Intel! Your account has been successfully created. ${teamName ? `You've been added to the team "${teamName}".` : ''}</p>
            <p>Nex-Intel helps you stay ahead of the competition with automated competitive intelligence and insights.</p>
            <p>To get started:</p>
            <ul>
              <li>Create your first project</li>
              <li>Add competitors to track</li>
              <li>Generate your first intelligence report</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nex-intel.com'}" class="button">Get Started</a>
            <p>If you have any questions, don't hesitate to reach out to our support team.</p>
            <p>Best regards,<br>The Nex-Intel Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Nex-Intel. All rights reserved.</p>
            <p>You received this email because you were added to a Nex-Intel workspace.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: `Welcome to Nex-Intel${teamName ? ` - ${teamName}` : ''}`,
    html,
  });
}

export async function sendReportReadyEmail(
  to: string,
  userName: string,
  projectName: string,
  reportId: string
) {
  const emailService = getEmailService();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your Report is Ready</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Report Ready!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! Your competitive intelligence report for "<strong>${projectName}</strong>" is ready for review.</p>
            <p>The report includes:</p>
            <ul>
              <li>Competitor analysis and insights</li>
              <li>Feature comparisons</li>
              <li>Market positioning analysis</li>
              <li>Strategic recommendations</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nex-intel.com'}/reports/${reportId}" class="button">View Report</a>
            <p>You can also export the report as PDF or share it with your team directly from the platform.</p>
            <p>Best regards,<br>The Nex-Intel Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Nex-Intel. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: `Report Ready: ${projectName}`,
    html,
  });
}

export async function sendAlertEmail(
  to: string,
  userName: string,
  projectName: string,
  alertType: string,
  message: string
) {
  const emailService = getEmailService();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Competitive Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Competitive Alert</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We detected important changes for your project "<strong>${projectName}</strong>" that require your attention.</p>

            <div class="alert">
              <strong>${alertType}</strong><br>
              ${message}
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nex-intel.com'}/projects" class="button">Review Changes</a>

            <p>This alert was generated automatically by our monitoring system. You may want to run a new analysis to get the latest insights.</p>

            <p>Best regards,<br>The Nex-Intel Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Nex-Intel. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: `🚨 Competitive Alert: ${alertType} - ${projectName}`,
    html,
  });
}

export async function sendTeamInvitationEmail(
  to: string,
  invitedBy: string,
  teamName: string,
  role: string
) {
  const emailService = getEmailService();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Team Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .invitation { background: #f0f9ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Invitation</h1>
          </div>
          <div class="content">
            <p>You've been invited to join the team <strong>${teamName}</strong> on Nex-Intel!</p>

            <div class="invitation">
              <strong>Invitation Details:</strong><br>
              Invited by: ${invitedBy}<br>
              Role: ${role}<br>
              Team: ${teamName}
            </div>

            <p>Nex-Intel is a competitive intelligence platform that helps teams track competitors, analyze market trends, and generate strategic insights.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nex-intel.com'}" class="button">Accept Invitation</a>

            <p>If you have any questions about this invitation, please contact ${invitedBy}.</p>

            <p>Best regards,<br>The Nex-Intel Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Nex-Intel. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return emailService.send({
    to,
    subject: `Team Invitation: ${teamName}`,
    html,
  });
}