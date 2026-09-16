/**
 * Spike sandbox: plan MP + preapproval `pending` (link `init_point`).
 *
 * No toca GymBro ni la DB. Sirve para validar RN-PAG-013..014 (alta por checkout MP)
 * antes de reemplazar el débito tarjeta+job.
 *
 * Uso (token de **prueba** `TEST-…` / `APP_USR-` de test, no el live del gym):
 *
 * ```bash
 * cd api
 * $env:MP_SPIKE_ACCESS_TOKEN="TEST-..."
 * $env:MP_SPIKE_PAYER_EMAIL="test_user_xxxx@testuser.com"
 * npm run spike:mp-sub
 * ```
 *
 * Abrí el `init_point` que imprime, pagá con tarjeta de prueba, y en Tus integraciones
 * mirá topics `subscription_preapproval` y `subscription_authorized_payment`.
 *
 * @see local/spike-suscripciones-mp.md
 */
const MP_API = 'https://api.mercadopago.com';

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : {};
}

function pickString(row: Json, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

async function mp(
  token: string,
  method: string,
  path: string,
  body?: Json,
): Promise<{ status: number; data: Json; raw: string }> {
  const response = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let parsed: unknown = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }
  return { status: response.status, data: asRecord(parsed), raw };
}

function fail(status: number, op: string, raw: string): never {
  const snippet = raw.slice(0, 800);
  throw new Error(`MP ${op} HTTP ${status}: ${snippet}`);
}

async function main(): Promise<void> {
  const token = process.env.MP_SPIKE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('Definí MP_SPIKE_ACCESS_TOKEN (credencial de prueba).');
  }
  const payerEmail =
    process.env.MP_SPIKE_PAYER_EMAIL?.trim() || 'test_user_spike@testuser.com';
  const backUrl =
    process.env.MP_SPIKE_BACK_URL?.trim() || 'https://faciliter.xyz/';
  const amount = Number(process.env.MP_SPIKE_AMOUNT ?? '1500');

  const me = await mp(token, 'GET', '/users/me');
  if (me.status !== 200) {
    fail(me.status, 'GET /users/me', me.raw);
  }
  console.log(
    `collector id=${pickString(me.data, 'id') ?? '?'} nickname=${pickString(me.data, 'nickname') ?? '?'}`,
  );

  const plan = await mp(token, 'POST', '/preapproval_plan', {
    reason: 'Faciliter spike MONTHLY',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'ARS',
    },
    back_url: backUrl,
  });
  if (plan.status !== 200 && plan.status !== 201) {
    fail(plan.status, 'POST /preapproval_plan', plan.raw);
  }
  const planId = pickString(plan.data, 'id');
  if (!planId) {
    throw new Error('Plan sin id');
  }
  console.log(`plan id=${planId} status=${pickString(plan.data, 'status')}`);

  const sub = await mp(token, 'POST', '/preapproval', {
    preapproval_plan_id: planId,
    reason: 'Faciliter spike MONTHLY',
    external_reference: `spike-${Date.now()}`,
    payer_email: payerEmail,
    back_url: backUrl,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'ARS',
    },
  });
  if (sub.status !== 200 && sub.status !== 201) {
    fail(sub.status, 'POST /preapproval', sub.raw);
  }

  const subId = pickString(sub.data, 'id');
  const initPoint = pickString(sub.data, 'init_point');
  const subStatus = pickString(sub.data, 'status');
  console.log(`preapproval id=${subId} status=${subStatus}`);
  console.log(`init_point=${initPoint}`);
  console.log(
    'Abrí init_point, pagá, y revisá webhooks subscription_preapproval + subscription_authorized_payment.',
  );

  if (process.env.MP_SPIKE_CANCEL === '1' && subId) {
    const cancelled = await mp(token, 'PUT', `/preapproval/${subId}`, {
      status: 'cancelled',
    });
    if (cancelled.status !== 200 && cancelled.status !== 201) {
      fail(cancelled.status, 'PUT /preapproval cancel', cancelled.raw);
    }
    console.log(`cancelado status=${pickString(cancelled.data, 'status')}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
