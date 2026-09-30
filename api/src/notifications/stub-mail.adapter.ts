import { Injectable, Logger } from '@nestjs/common';
import type { MailMessage, MailPort } from './mail.port';

/**
 * No envía. Log para local / CI (`MAIL_DRIVER=stub`).
 */
@Injectable()
export class StubMailAdapter implements MailPort {
  private readonly logger = new Logger(StubMailAdapter.name);

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[stub] to=${message.to} subject=${message.subject.slice(0, 80)}`,
    );
  }
}
