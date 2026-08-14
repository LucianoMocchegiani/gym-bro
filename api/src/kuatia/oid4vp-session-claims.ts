/**
 * Decodifica SD-JWT VC desde `vp_token` de una sesión OID4VP Quark.
 *
 * @remarks Misma lógica que el script Postman `02.7 Verifier - Consultar sesion OID4VP`
 * (colección QuarkID 2.0). No toca Quark: el GET session crudo trae
 * `authorizationResponsePayload.vp_token` cuando ya hubo presentación.
 */

const SD_JWT_SKIP_KEYS = new Set([
  '_sd',
  '_sd_alg',
  'cnf',
  'iss',
  'iat',
  'vct',
  'exp',
  'nbf',
  'jti',
]);

/**
 * Claims compactos de una VC presentada (pretty claims + metadatos útiles).
 */
export type Oid4VpDecodedCredential = {
  vct: string | null;
  issuer: string | null;
  issuedAt: string | null;
  claims: Record<string, unknown>;
};

/**
 * Extrae `vp_token` de la respuesta cruda de `GET …/openid4vc/session/:id`.
 */
export function extractVpToken(session: Record<string, unknown>): unknown {
  const payload = session.authorizationResponsePayload;
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (p.vp_token !== undefined) {
      return p.vp_token;
    }
  }
  // Algunas serializaciones Credo anidan distinto
  const authResponse = session.authorizationResponse;
  if (authResponse && typeof authResponse === 'object') {
    const a = authResponse as Record<string, unknown>;
    if (a.vp_token !== undefined) {
      return a.vp_token;
    }
  }
  return undefined;
}

/**
 * Decodifica uno o más SD-JWT compactos del `vp_token` (string u objeto DCQL).
 */
export function decodeVpTokenCredentials(
  vpToken: unknown,
): Oid4VpDecodedCredential[] {
  if (vpToken == null) {
    return [];
  }

  const out: Oid4VpDecodedCredential[] = [];
  let parsed: unknown = vpToken;

  if (typeof vpToken === 'string') {
    try {
      parsed = JSON.parse(vpToken);
    } catch {
      parsed = vpToken;
    }
  }

  if (typeof parsed === 'string') {
    if (parsed.includes('.')) {
      out.push(decodeSdJwtCompact(parsed));
    }
    return out;
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === 'string' && item.includes('.')) {
        out.push(decodeSdJwtCompact(item));
      }
    }
    return out;
  }

  if (parsed && typeof parsed === 'object') {
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      const list = Array.isArray(value) ? value : [value];
      for (const compact of list) {
        if (typeof compact === 'string' && compact.includes('.')) {
          out.push(decodeSdJwtCompact(compact));
        }
      }
    }
  }

  return out;
}

/**
 * Une claims de todas las VCs del vp_token (primera gana en colisiones).
 */
export function flattenPresentedClaims(
  decoded: Oid4VpDecodedCredential[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const item of decoded) {
    for (const [k, v] of Object.entries(item.claims)) {
      if (!(k in merged)) {
        merged[k] = v;
      }
    }
    if (item.vct && !('vct' in merged)) {
      merged.vct = item.vct;
    }
  }
  return merged;
}

/**
 * Decodifica un SD-JWT compact (`header.payload.sig~disclosure~…`).
 *
 * @remarks No verifica firma: Quark/Credo ya verificó al cerrar la sesión.
 * Solo mapea claims revelados (Postman 02.7).
 */
export function decodeSdJwtCompact(compact: string): Oid4VpDecodedCredential {
  const chunks = compact.split('~');
  const jwt = chunks[0] ?? '';
  const parts = jwt.split('.');
  if (parts.length < 2) {
    return { vct: null, issuer: null, issuedAt: null, claims: {} };
  }

  const payload = JSON.parse(b64urlDecodeToString(parts[1])) as Record<
    string,
    unknown
  >;

  const claims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!SD_JWT_SKIP_KEYS.has(k)) {
      claims[k] = v;
    }
  }

  for (const piece of chunks.slice(1)) {
    if (!piece) {
      continue;
    }
    try {
      const arr = JSON.parse(b64urlDecodeToString(piece)) as unknown;
      if (
        Array.isArray(arr) &&
        arr.length === 3 &&
        typeof arr[1] === 'string'
      ) {
        claims[arr[1]] = arr[2];
      }
    } catch {
      // disclosure inválido / key binding: ignorar
    }
  }

  const iat = typeof payload.iat === 'number' ? payload.iat : null;

  return {
    vct: typeof payload.vct === 'string' ? payload.vct : null,
    issuer: typeof payload.iss === 'string' ? payload.iss : null,
    issuedAt: iat != null ? new Date(iat * 1000).toISOString() : null,
    claims,
  };
}

function b64urlDecodeToString(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '='.repeat(padLen);
  return Buffer.from(b64, 'base64').toString('utf8');
}
