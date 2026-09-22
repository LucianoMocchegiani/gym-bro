import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { startRouter } from './routes/start';
import { callbackRouter } from './routes/callback';
import { sessionValidateRouter } from './routes/session-validate';

const app = express();
const PORT = Number(process.env.PORT || 3003);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-proxy' });
});

app.use('/', startRouter);
app.use('/auth', callbackRouter);
app.use('/session', sessionValidateRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth proxy running on port ${PORT}`);
});
