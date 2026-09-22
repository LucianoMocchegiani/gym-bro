import { Router, Request, Response } from 'express';
import { getSession, deleteSession } from '../services/session';

const router = Router();

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining };
}

function rateLimit(req: Request, res: Response, next: () => void): void {
  const ip = req.ip ?? 'unknown';
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  next();
}

router.post('/validate', rateLimit, (_req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(401).json({ error: 'sessionId required' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session not found' });
  }

  res.json({
    email: session.email,
    name: session.name,
    googleSub: session.googleSub,
  });
});

router.post('/logout', rateLimit, (_req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' });
  }

  deleteSession(sessionId);
  res.json({ ok: true });
});

export const sessionValidateRouter = router;