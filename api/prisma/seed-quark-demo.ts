import {
  PrismaClient,
  QuarkProvisionStatus,
} from '@prisma/client';

const MAX_ERROR_LEN = 500;
const DEFAULT_TIMEOUT_MS = 60_000;

type QuarkSeedResult = {
  status: QuarkProvisionStatus;
  issuerWalletId: string | null;
  issuerDid: string | null;
  verifierWalletId: string | null;
  verifierDid: string | null;
  lastError: string | null;
};

/**
 * Provisiona issuer+verifier Quark para el tenant demo del seed (soft-fail).
 *
 * @remarks Misma convención que `QuarkProvisionService`: `gymbro-iss-{slug}` /
 * `gymbro-ver-{slug}` + `oid4vc` / `oid4vp` mínimo. No arranca Nest; usa fetch + env.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
export async function provisionDemoQuark(
  prisma: PrismaClient,
  tenantId: string,
  slug: string,
): Promise<QuarkSeedResult> {
  if (!isQuarkEnabled()) {
    return persistMissing(prisma, tenantId, 'QUARK_PROVISION_ENABLED=false');
  }

  const issuerId = `gymbro-iss-${slug}`;
  const verifierId = `gymbro-ver-${slug}`;

  let issuerWalletId: string | null = null;
  let issuerDid: string | null = null;
  let verifierWalletId: string | null = null;
  let verifierDid: string | null = null;

  try {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        quarkIssuerWalletId: true,
        quarkIssuerDid: true,
        quarkVerifierWalletId: true,
        quarkVerifierDid: true,
      },
    });

    issuerWalletId = existing?.quarkIssuerWalletId ?? null;
    issuerDid = existing?.quarkIssuerDid ?? null;
    verifierWalletId = existing?.quarkVerifierWalletId ?? null;
    verifierDid = existing?.quarkVerifierDid ?? null;

    if (issuerWalletId) {
      const oid4 = await listIssuerRecords(issuerWalletId);
      if (oid4.total < 1) {
        console.warn(
          `[seed-quark] ${issuerWalletId} sin OpenId4VcIssuerRecord; se recrea`,
        );
        issuerWalletId = null;
        issuerDid = null;
      }
    }

    if (!issuerWalletId) {
      const created = await ensureIssuer(issuerId, slug);
      issuerWalletId = created.issuerId;
      issuerDid = created.did;
      const oid4 = await listIssuerRecords(issuerWalletId);
      if (oid4.total < 1) {
        throw new Error(
          `Issuer '${issuerWalletId}' sin OpenId4VcIssuerRecord (ghost o alta sin oid4vc). Reiniciá quark-issuer y reintentá seed.`,
        );
      }
    }

    if (verifierWalletId) {
      const oid4 = await listVerifierRecords(verifierWalletId);
      if (oid4.total < 1) {
        console.warn(
          `[seed-quark] ${verifierWalletId} sin OpenId4VcVerifierRecord; se recrea`,
        );
        verifierWalletId = null;
        verifierDid = null;
      }
    }

    if (!verifierWalletId) {
      const created = await ensureVerifier(verifierId);
      verifierWalletId = created.verifierId;
      verifierDid = created.did;
      const oid4 = await listVerifierRecords(verifierWalletId);
      if (oid4.total < 1) {
        throw new Error(
          `Verifier '${verifierWalletId}' sin OpenId4VcVerifierRecord (ghost o alta sin oid4vp). Wipe DB quarkid_verifier y reintentá seed.`,
        );
      }
    }

    if (!issuerWalletId || !verifierWalletId) {
      return persistMissing(
        prisma,
        tenantId,
        'Issuer or verifier missing after seed provision',
        { issuerWalletId, issuerDid, verifierWalletId, verifierDid },
      );
    }

    const provisionedAt = new Date();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        quarkStatus: QuarkProvisionStatus.READY,
        quarkIssuerWalletId: issuerWalletId,
        quarkIssuerDid: issuerDid,
        quarkVerifierWalletId: verifierWalletId,
        quarkVerifierDid: verifierDid,
        quarkLastError: null,
        quarkProvisionedAt: provisionedAt,
      },
    });

    return {
      status: QuarkProvisionStatus.READY,
      issuerWalletId,
      issuerDid,
      verifierWalletId,
      verifierDid,
      lastError: null,
    };
  } catch (err) {
    const message = formatError(err);
    console.warn(`[seed-quark] soft-fail: ${message}`);
    return persistMissing(prisma, tenantId, message, {
      issuerWalletId,
      issuerDid,
      verifierWalletId,
      verifierDid,
    });
  }
}

function isQuarkEnabled(): boolean {
  const raw = process.env.QUARK_PROVISION_ENABLED;
  if (raw === undefined || raw === null || raw === '') {
    return true;
  }
  return raw !== 'false' && raw !== '0';
}

function issuerBase(): string {
  return (
    process.env.QUARK_ISSUER_BASE_URL?.replace(/\/$/, '') ??
    'http://localhost:9001'
  );
}

function verifierBase(): string {
  return (
    process.env.QUARK_VERIFIER_BASE_URL?.replace(/\/$/, '') ??
    'http://localhost:9002'
  );
}

function timeoutMs(): number {
  const raw = process.env.QUARK_HTTP_TIMEOUT_MS;
  const n = raw ? Number(raw) : DEFAULT_TIMEOUT_MS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

async function ensureIssuer(
  issuerId: string,
  slug: string,
): Promise<{ issuerId: string; did: string | null }> {
  const oid4vc = {
    display: [{ name: `GymBro ${slug}`, locale: 'es' }],
    credentialConfigurationsSupported: {},
  };
  try {
    const created = await requestJson<{
      issuerId: string;
      did: string | null;
    }>(issuerBase(), '/v1/issuers', 'POST', { issuerId, oid4vc });
    return { issuerId: created.issuerId, did: created.did };
  } catch (err) {
    if (err instanceof SeedQuarkHttpError && err.status === 409) {
      const list = await requestJson<{
        issuers: { issuerId: string; did: string | null }[];
      }>(issuerBase(), '/v1/issuers', 'GET');
      const found = list.issuers?.find((i) => i.issuerId === issuerId);
      if (found) {
        try {
          await listIssuerRecords(found.issuerId);
        } catch (probeErr) {
          throw new Error(
            `Issuer '${issuerId}' ghost en memoria Quark. Reiniciá quark-issuer. ${formatError(probeErr)}`,
          );
        }
        return { issuerId: found.issuerId, did: found.did };
      }
    }
    throw err;
  }
}

async function ensureVerifier(
  verifierId: string,
): Promise<{ verifierId: string; did: string | null }> {
  const oid4vp = {
    clientMetadata: { client_name: 'GymBro' },
  };
  try {
    const created = await requestJson<{
      verifierId: string;
      did: string | null;
    }>(verifierBase(), '/v1/verifiers', 'POST', { verifierId, oid4vp });
    return { verifierId: created.verifierId, did: created.did };
  } catch (err) {
    if (err instanceof SeedQuarkHttpError && err.status === 409) {
      const list = await requestJson<{
        verifiers: { verifierId: string; did: string | null }[];
      }>(verifierBase(), '/v1/verifiers', 'GET');
      const found = list.verifiers?.find((v) => v.verifierId === verifierId);
      if (found) {
        const oid4 = await listVerifierRecords(found.verifierId);
        if (oid4.total < 1) {
          throw new Error(
            `Verifier '${verifierId}' ya existe sin OpenId4VcVerifierRecord. Wipe DB quarkid_verifier y re-seed con oid4vp.`,
          );
        }
        return { verifierId: found.verifierId, did: found.did };
      }
    }
    throw err;
  }
}

async function listIssuerRecords(
  issuerWalletId: string,
): Promise<{ total: number }> {
  const data = await requestJson<{
    pagination?: { total?: number };
    records?: unknown[];
  }>(
    issuerBase(),
    `/v1/issuers/${encodeURIComponent(issuerWalletId)}/records?type=${encodeURIComponent('OpenId4VcIssuerRecord')}`,
    'GET',
  );
  return {
    total:
      data.pagination?.total ??
      (Array.isArray(data.records) ? data.records.length : 0),
  };
}

async function listVerifierRecords(
  verifierWalletId: string,
): Promise<{ total: number }> {
  const data = await requestJson<{
    pagination?: { total?: number };
    records?: unknown[];
  }>(
    verifierBase(),
    `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/records?type=${encodeURIComponent('OpenId4VcVerifierRecord')}`,
    'GET',
  );
  return {
    total:
      data.pagination?.total ??
      (Array.isArray(data.records) ? data.records.length : 0),
  };
}

async function persistMissing(
  prisma: PrismaClient,
  tenantId: string,
  error: string,
  partial?: {
    issuerWalletId?: string | null;
    issuerDid?: string | null;
    verifierWalletId?: string | null;
    verifierDid?: string | null;
  },
): Promise<QuarkSeedResult> {
  const lastError = error.slice(0, MAX_ERROR_LEN);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      quarkStatus: QuarkProvisionStatus.MISSING,
      quarkIssuerWalletId: partial?.issuerWalletId ?? undefined,
      quarkIssuerDid: partial?.issuerDid ?? undefined,
      quarkVerifierWalletId: partial?.verifierWalletId ?? undefined,
      quarkVerifierDid: partial?.verifierDid ?? undefined,
      quarkLastError: lastError,
    },
  });
  return {
    status: QuarkProvisionStatus.MISSING,
    issuerWalletId: partial?.issuerWalletId ?? null,
    issuerDid: partial?.issuerDid ?? null,
    verifierWalletId: partial?.verifierWalletId ?? null,
    verifierDid: partial?.verifierDid ?? null,
    lastError,
  };
}

class SeedQuarkHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'SeedQuarkHttpError';
  }
}

async function requestJson<T>(
  base: string,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  const url = `${base}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SeedQuarkHttpError(`Quark unreachable: ${msg}`, 0, '');
  }

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw new SeedQuarkHttpError(
      `Quark HTTP ${response.status}`,
      response.status,
      text,
    );
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function formatError(err: unknown): string {
  if (err instanceof SeedQuarkHttpError) {
    const snippet = err.body ? ` ${err.body.slice(0, 200)}` : '';
    return `${err.message}${snippet}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
