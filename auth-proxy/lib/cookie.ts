import { Response } from 'express';

export function setSessionCookie(res: Response, sessionId: string): void {
  res.setHeader(
    'Set-Cookie',
    [
      `central_session=${sessionId}; Domain=.faciliter.xyz; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900`,
    ]
  );
}
