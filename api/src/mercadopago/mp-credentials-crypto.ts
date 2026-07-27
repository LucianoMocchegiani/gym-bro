import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGO = 'aes-256-gcm' as const;
const PREFIX = 'v1';

/**
 * Cifrado simétrico de credenciales MP en reposo.
 *
 * @remarks Formato `v1:iv:tag:ciphertext` (base64url). La clave se deriva
 * con SHA-256 de `MP_CREDENTIALS_SECRET`.
 */
export class MpCredentialsCrypto {
  constructor(private readonly secret: string) {
    if (!secret || secret.length < 16) {
      throw new Error('MP_CREDENTIALS_SECRET must be at least 16 characters');
    }
  }

  /**
   * Cifra un secreto (p. ej. access_token).
   */
  encrypt(plain: string): string {
    const key = this.deriveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      PREFIX,
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  /**
   * Descifra un valor producido por {@link encrypt}.
   *
   * @throws {Error} Si el formato o el tag GCM son inválidos.
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
      throw new Error('Invalid MP credential ciphertext format');
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const key = this.deriveKey();
    const decipher = createDecipheriv(
      ALGO,
      key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  }

  private deriveKey(): Buffer {
    return createHash('sha256').update(this.secret).digest();
  }
}
