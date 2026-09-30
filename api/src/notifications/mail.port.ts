export const MAIL_PORT = Symbol('MAIL_PORT');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Puerto de envío N1 (RN-NOT-001). Resend o stub; colas después no cambian esto.
 */
export interface MailPort {
  send(message: MailMessage): Promise<void>;
}
