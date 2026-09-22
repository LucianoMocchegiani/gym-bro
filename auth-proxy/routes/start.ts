import { Router, Request, Response } from 'express';
import { generateState } from '../services/state';
import { validateReturnTo } from '../lib/return-to';

const router = Router();

router.get('/start', (req: Request, res: Response) => {
  const returnTo = req.query.return_to as string || '';

  if (!validateReturnTo(returnTo)) {
    return res.status(400).send('Invalid return_to');
  }

  const state = generateState(returnTo);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.CLIENT_ID!);
  googleAuthUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL}/auth/callback`);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  res.redirect(302, googleAuthUrl.toString());
});

export const startRouter = router;
