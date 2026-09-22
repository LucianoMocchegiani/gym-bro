import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateState, verifyState } from '../services/state';
import { exchangeCodeForTokens, verifyIdToken } from '../services/google';
import { createSession } from '../services/session';
import { setSessionCookie } from '../lib/cookie';
import { validateReturnTo } from '../lib/return-to';

const router = Router();

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    let returnTo = '';
    try {
      const verified = verifyState(state as string);
      if (verified.valid) {
        returnTo = verified.returnTo;
      }
    } catch {
      // sin estado válido
    }
    if (returnTo && validateReturnTo(returnTo)) {
      const errorUrl = new URL(returnTo);
      errorUrl.searchParams.set('error', 'access_denied');
      res.redirect(302, errorUrl.toString());
      return;
    }
    res.status(400).send('Access denied');
    return;
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).send('Missing code or state');
  }

  let returnTo: string;
  try {
    const verified = verifyState(state);
    if (!verified.valid) {
      return res.status(400).send('Invalid or expired session');
    }
    returnTo = verified.returnTo;
    if (!validateReturnTo(returnTo)) {
      return res.status(400).send('Invalid return_to');
    }
  } catch {
    return res.status(400).send('Invalid state');
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code);
    if (!tokenResponse.id_token) {
      throw new Error('No id_token from Google');
    }
    const payload = await verifyIdToken(tokenResponse.id_token);

    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid ID token payload');
    }

    const sessionId = uuidv4();
    await createSession(sessionId, {
      email: payload.email,
      name: payload.name || null,
      googleSub: payload.sub,
    });

    setSessionCookie(res, sessionId);

    res.redirect(302, returnTo);
  } catch (err) {
    console.error('Callback error:', err);
    const errorUrl = new URL(returnTo);
    errorUrl.searchParams.set('error', 'auth_failed');
    res.redirect(302, errorUrl.toString());
  }
});

export const callbackRouter = router;
