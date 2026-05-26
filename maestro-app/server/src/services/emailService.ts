import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_SEND_FAILED' = 'EMAIL_SEND_FAILED',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

function getFromAddress(): string {
  const smtpUser = config.email.smtp.auth?.user;
  const configured = config.email.from;

  if (!smtpUser) return configured;

  const smtpDomain = smtpUser.split('@')[1];
  const fromDomain = configured.includes('@') ? configured.split('@')[1] : '';

  if (smtpDomain && fromDomain !== smtpDomain) {
    console.warn(
      `EMAIL_FROM (${configured}) does not match SMTP account domain; using ${smtpUser} as sender (required by Gmail).`
    );
    return smtpUser;
  }

  return configured;
}

function getTransporter(): nodemailer.Transporter | null {
  if (!config.email.smtp.auth) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: config.email.smtp.auth,
    });
  }

  return transporter;
}

export function logEmailConfigStatus(): void {
  const { smtp, devLogToConsole } = config.email;

  if (smtp.auth?.user && smtp.auth.pass) {
    console.log(`Email: SMTP configured (${smtp.host}, user ${smtp.auth.user})`);
    console.log(`Email: sending as <${getFromAddress()}>`);
    return;
  }

  if (smtp.auth?.user && !smtp.auth.pass) {
    console.warn(
      'Email: SMTP_USER is set but SMTP_PASSWORD is missing in server/.env — forgot-password emails will not send via Gmail.'
    );
  } else {
    console.warn('Email: SMTP not configured (set SMTP_USER and SMTP_PASSWORD in server/.env).');
  }

  if (devLogToConsole) {
    console.log('Email: dev mode — reset links will be printed in this console (EMAIL_DEV_LOG=true).');
  } else {
    console.warn(
      'Email: EMAIL_DEV_LOG=false and no SMTP — password reset will fail. Set SMTP_PASSWORD or EMAIL_DEV_LOG=true.'
    );
  }
}

function logDevEmail(label: string, email: string, subject: string, link: string): void {
  console.log(`\n--- EMAIL (dev mode) ---`);
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`\n${label}: ${link}`);
  console.log('--- END EMAIL ---\n');
}

async function deliverEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  devLabel: string;
}): Promise<void> {
  const transport = getTransporter();

  if (transport) {
    try {
      await transport.sendMail({
        from: getFromAddress(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`Email sent to ${options.to}: ${options.subject}`);
      return;
    } catch (error) {
      console.error('Failed to send email via SMTP:', error);
      if (!config.email.devLogToConsole) {
        throw new EmailDeliveryError('Failed to send email', 'EMAIL_SEND_FAILED', error);
      }
    }
  }

  if (config.email.devLogToConsole) {
    const link = options.text.replace(/^.*:\s*/, '');
    logDevEmail(options.devLabel, options.to, options.subject, link);
    return;
  }

  throw new EmailDeliveryError(
    'Email is not configured. Add SMTP_PASSWORD to server/.env (Gmail App Password) or set EMAIL_DEV_LOG=true for local development.',
    'EMAIL_NOT_CONFIGURED'
  );
}

function getVerificationEmailHtml(link: string): string {
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">Maestro Loyalty Program</h2>
          <p style="color: #666; margin-top: 0;">Email Verification</p>
          
          <div style="background: #f5f5f5; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <p>Hello,</p>
            <p>Thank you for registering with the Maestro Loyalty Program! Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${link}" 
                 style="display: inline-block; padding: 12px 32px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: 600;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 13px; color: #666;">Or copy this link:</p>
            <p style="font-size: 12px; word-break: break-all; background: #fff; padding: 12px; border-left: 3px solid #007bff;">${link}</p>
            
            <p style="font-size: 13px; color: #999; margin-top: 16px;">This link expires in 24 hours.</p>
          </div>
          
          <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px;">
            If you didn't register, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
}

function getPasswordResetEmailHtml(link: string): string {
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">Maestro Loyalty Program</h2>
          <p style="color: #666; margin-top: 0;">Password Reset</p>
          
          <div style="background: #f5f5f5; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <p>Hello,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${link}" 
                 style="display: inline-block; padding: 12px 32px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 13px; color: #666;">Or copy this link:</p>
            <p style="font-size: 12px; word-break: break-all; background: #fff; padding: 12px; border-left: 3px solid #28a745;">${link}</p>
            
            <p style="font-size: 13px; color: #999; margin-top: 16px;">This link expires in 24 hours.</p>
          </div>
          
          <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px;">
            If you didn't request a password reset, you can safely ignore this email or contact support.
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${config.frontendUrl}/member/verify?token=${token}`;
  const subject = 'Maestro Loyalty Program - Verify Your Email';

  await deliverEmail({
    to: email,
    subject,
    html: getVerificationEmailHtml(link),
    text: `Please verify your email: ${link}`,
    devLabel: 'Verify link',
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${config.frontendUrl}/member/reset-password?token=${token}`;
  const subject = 'Maestro Loyalty Program - Reset Your Password';

  await deliverEmail({
    to: email,
    subject,
    html: getPasswordResetEmailHtml(link),
    text: `Reset your password: ${link}`,
    devLabel: 'Reset link',
  });
}

export async function sendNotificationEmail(
  email: string,
  subject: string,
  bodySl: string,
  bodyEn: string
): Promise<void> {
  if (config.email.devLogToConsole) {
    console.log(`\n--- NOTIFICATION to ${email}: ${subject} ---`);
    console.log(bodySl);
    console.log('---\n');
  }
}
