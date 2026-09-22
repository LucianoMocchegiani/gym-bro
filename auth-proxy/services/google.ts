import { OAuth2Client } from 'google-auth-library';

const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `${process.env.BASE_URL}/auth/callback`,
);

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

export async function verifyIdToken(idToken: string) {
  const ticket = await oAuth2Client.verifyIdToken({
    idToken,
    audience: process.env.CLIENT_ID,
  });
  return ticket.getPayload();
}
