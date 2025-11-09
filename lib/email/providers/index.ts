export interface EmailProvider {
  send(message: any): Promise<{ id: string; status: string }>;
  validateConfig(): Promise<boolean>;
}

export * from './resend';
export * from './sendgrid';
export * from './ses';