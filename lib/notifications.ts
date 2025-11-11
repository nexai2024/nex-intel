/**
 * Enhanced email notification system for Nex-Intel
 * Integrates with email service providers for actual email delivery
 */

import { getEmailService } from '@/lib/email';
import { EmailMessage } from '@/lib/email';

// Email templates
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate report completion email template
 */
export function generateReportCompletionEmail(projectName: string, runId: string, findings: any[]): EmailTemplate {
  const changeFindings = findings.filter(f => f.notes?.includes('change_detection'));
  const hasChanges = changeFindings.length > 0;

  const subject = hasChanges
    ? `🚨 Important Changes Detected: ${projectName} Competitive Analysis`
    : `📊 ${projectName} Competitive Analysis Complete`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .button:hover { background: #4338ca; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        .change-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .change-item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .change-item:last-child { border-bottom: none; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
        .badge-high { background: #fee2e2; color: #dc2626; }
        .badge-medium { background: #fef3c7; color: #d97706; }
        .badge-low { background: #dbeafe; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${hasChanges ? '🚨 Competitive Intelligence Alert' : '📊 Report Ready'}</h1>
        <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">${projectName}</p>
      </div>

      <div class="content">
        ${hasChanges ? `
          <div class="alert">
            <strong>Important changes detected</strong> in your competitive landscape. Your automated analysis has identified significant updates that may impact your strategy.
          </div>
        ` : `
          <div class="success">
            <strong>Your competitive analysis is complete!</strong> The report includes comprehensive insights about your competitive landscape.
          </div>
        `}

        ${hasChanges && changeFindings.length > 0 ? `
          <div class="change-summary">
            <h3 style="margin-top: 0;">Change Summary</h3>
            ${changeFindings.map(finding => {
              const changeData = JSON.parse(finding.notes || '{}');
              return `
                <div class="change-item">
                  <p style="margin: 0 0 8px;"><strong>${finding.text}</strong></p>
                  <div style="font-size: 14px; color: #6b7280;">
                    ${changeData.highlights?.map((h: string) => `• ${h}`).join('<br>') || ''}
                  </div>
                  <span class="badge badge-${changeData.severity || 'medium'}">${changeData.severity?.toUpperCase() || 'MEDIUM'}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/runs/${runId}" class="button">
            View Full Report
          </a>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h4 style="margin-top: 0;">What's in your report:</h4>
          <ul style="padding-left: 20px;">
            <li>Competitor landscape analysis</li>
            <li>Capability matrix and feature comparison</li>
            <li>Pricing analysis and market positioning</li>
            <li>Integration ecosystem overview</li>
            <li>Security and compliance assessment</li>
            <li>Strategic recommendations</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        <p>This report was generated by <strong>CompeteIQ</strong> - Evidence-first competitive intelligence.</p>
        <p style="margin: 10px 0 0; font-size: 12px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications" style="color: #6b7280; text-decoration: underline;">
            Manage notification preferences
          </a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
${subject}

${hasChanges
  ? `🚨 IMPORTANT: Significant changes detected in your competitive landscape for ${projectName}.

Change Summary:
${changeFindings.map(finding => `• ${finding.text}`).join('\n')}

`
  : `📊 Your competitive analysis for ${projectName} is complete.

Your report includes:
• Competitor landscape analysis
• Capability matrix and feature comparison
• Pricing analysis and market positioning
• Integration ecosystem overview
• Security and compliance assessment
• Strategic recommendations

`}

View your full report here:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/runs/${runId}

---
This report was generated by CompeteIQ - Evidence-first competitive intelligence.
Manage notification preferences: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications
  `;

  return { subject, html, text };
}

/**
 * Generate monitoring setup confirmation email
 */
export function generateMonitoringSetupEmail(projectName: string, nextRun: string): EmailTemplate {
  const subject = `✅ Monitoring Enabled: ${projectName}`;
  const nextRunDate = new Date(nextRun).toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .info-box { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0; font-size: 28px; font-weight: 600;">✅ Monitoring Active</h1>
        <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">${projectName}</p>
      </div>

      <div class="content">
        <p>Great news! Real-time monitoring has been successfully enabled for your project.</p>

        <div class="info-box">
          <strong>Next scheduled analysis:</strong><br>
          ${nextRunDate}
        </div>

        <h3>What happens next:</h3>
        <ul>
          <li>CompeteIQ will automatically re-run your competitive analysis every 7 days</li>
          <li>You'll receive alerts when significant changes are detected</li>
          <li>Each new analysis will be compared against previous runs to identify updates</li>
          <li>All reports are stored in your project dashboard</li>
        </ul>

        <h3>Types of alerts you'll receive:</h3>
        <ul>
          <li><strong>New competitors</strong> entering the market</li>
          <li><strong>Price changes</strong> from existing competitors</li>
          <li><strong>Feature updates</strong> and new capabilities</li>
          <li><strong>Market positioning shifts</strong> and strategic changes</li>
        </ul>
      </div>

      <div class="footer">
        <p>This notification was sent by <strong>CompeteIQ</strong> - Evidence-first competitive intelligence.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
${subject}

Real-time monitoring has been successfully enabled for your project: ${projectName}

Next scheduled analysis: ${nextRunDate}

What happens next:
• CompeteIQ will automatically re-run your competitive analysis every 7 days
• You'll receive alerts when significant changes are detected
• Each new analysis will be compared against previous runs
• All reports are stored in your project dashboard

Types of alerts you'll receive:
• New competitors entering the market
• Price changes from existing competitors
• Feature updates and new capabilities
• Market positioning shifts and strategic changes

---
This notification was sent by CompeteIQ - Evidence-first competitive intelligence.
  `;

  return { subject, html, text };
}

/**
 * Send email notification using the configured email service
 * Integrates with Resend, SendGrid, or AWS SES based on configuration
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    // Log email details for debugging
    console.log(`[Email] Sending email to: ${to}`);
    console.log(`[Email] Subject: ${template.subject}`);
    console.log(`[Email] HTML length: ${template.html.length} characters`);

    // Get the configured email service
    const emailService = getEmailService();

    // Check if email service is properly configured
    const isValid = await emailService.validateConfig();
    if (!isValid) {
      console.warn('[Email] Email service not properly configured, skipping email send');
      return false;
    }

    // Create email message
    const emailMessage: EmailMessage = {
      to,
      subject: template.subject,
      html: template.html,
    };

    // Send the email
    const result = await emailService.send(emailMessage);
    console.log(`[Email] Sent successfully: ${result.id}`);
    return true;

  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    // Return false instead of throwing to avoid breaking workflows
    return false;
  }
}

/**
 * Send report completion notification
 */
export async function sendReportCompletionNotification(userEmail: string, userName: string, projectName: string, runId: string, findings: any[]): Promise<boolean> {
  const template = generateReportCompletionEmail(projectName, runId, findings);

  // Personalize the template
  const personalizedHtml = template.html.replace('{{userName}}', userName);
  const personalizedText = template.text.replace('{{userName}}', userName);

  return await sendEmail(userEmail, {
    ...template,
    html: personalizedHtml,
    text: personalizedText
  });
}

/**
 * Send monitoring setup confirmation
 */
export async function sendMonitoringSetupNotification(userEmail: string, userName: string, projectName: string, nextRun: string): Promise<boolean> {
  const template = generateMonitoringSetupEmail(projectName, nextRun);

  // Personalize the template
  const personalizedHtml = template.html.replace('{{userName}}', userName);
  const personalizedText = template.text.replace('{{userName}}', userName);

  return await sendEmail(userEmail, {
    ...template,
    html: personalizedHtml,
    text: personalizedText
  });
}

/**
 * Send team invitation notification
 */
export async function sendTeamInvitationNotification(userEmail: string, userName: string, invitedBy: string, teamName: string, role: string): Promise<boolean> {
  try {
    const emailService = getEmailService();
    const isValid = await emailService.validateConfig();
    if (!isValid) {
      console.warn('[Email] Email service not properly configured, skipping team invitation email');
      return false;
    }

    // Use the convenience function from email.ts
    await emailService.send({
      to: userEmail,
      subject: `Team Invitation: ${teamName}`,
      html: `
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
              <p>Hi ${userName},</p>
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
      `,
    });

    console.log(`[Email] Team invitation sent successfully to: ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send team invitation:', error);
    return false;
  }
}

/**
 * Send role change notification
 */
export async function sendRoleChangeNotification(userEmail: string, userName: string, teamName: string, oldRole: string, newRole: string, changedBy: string): Promise<boolean> {
  try {
    const emailService = getEmailService();
    const isValid = await emailService.validateConfig();
    if (!isValid) {
      console.warn('[Email] Email service not properly configured, skipping role change email');
      return false;
    }

    await emailService.send({
      to: userEmail,
      subject: `Role Updated in ${teamName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Role Updated</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .role-change { background: #f3f0ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Role Updated</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your role in the team <strong>${teamName}</strong> has been updated.</p>

              <div class="role-change">
                <strong>Role Change:</strong><br>
                From: ${oldRole}<br>
                To: ${newRole}<br>
                Changed by: ${changedBy}
              </div>

              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nex-intel.com'}" class="button">View Team</a>

              <p>If you have any questions about this change, please contact ${changedBy}.</p>

              <p>Best regards,<br>The Nex-Intel Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Nex-Intel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[Email] Role change notification sent successfully to: ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send role change notification:', error);
    return false;
  }
}

/**
 * Send team member removal notification
 */
export async function sendMemberRemovalNotification(userEmail: string, userName: string, teamName: string, removedBy: string): Promise<boolean> {
  try {
    const emailService = getEmailService();
    const isValid = await emailService.validateConfig();
    if (!isValid) {
      console.warn('[Email] Email service not properly configured, skipping removal notification email');
      return false;
    }

    await emailService.send({
      to: userEmail,
      subject: `Removed from ${teamName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Team Membership Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .removal { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Team Membership Update</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your membership in the team <strong>${teamName}</strong> has been ended.</p>

              <div class="removal">
                <strong>Removal Details:</strong><br>
                Team: ${teamName}<br>
                Removed by: ${removedBy}
              </div>

              <p>If you believe this was done in error or have any questions, please contact ${removedBy}.</p>

              <p>Best regards,<br>The Nex-Intel Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Nex-Intel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[Email] Member removal notification sent successfully to: ${userEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send member removal notification:', error);
    return false;
  }
}