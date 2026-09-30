import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MailMessage, MailPort } from './mail.port';

/**
 * Adapter Resend HTTP. From verificado en el dashboard de Resend.
 */
@Injectable()
export class ResendMailAdapter implements MailPort {
  private readonly logger = new Logger(ResendMailAdapter.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('RESEND_API_KEY');
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async send(message: MailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      this.logger.warn(`Resend ${res.status}: ${detail.slice(0, 300)}`);
      throw new Error(`Resend ${res.status}`);
    }
  }
}
