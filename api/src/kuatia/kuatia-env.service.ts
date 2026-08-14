import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Wallet IDs compartidos Kuatia (env). Un issuer + un verifier para todos los gyms.
 *
 * @remarks Provisioning de wallets = consola Kuatia. GymBro solo lee `KUATIA_*`.
 * @see https://kuatia.xyz/docs
 */
@Injectable()
export class KuatiaEnvService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Wallet IDs compartidos desde env (pueden ser null si falta config).
   */
  sharedWalletIds(): {
    issuerId: string | null;
    verifierId: string | null;
  } {
    const issuerId =
      this.config.get<string>('KUATIA_ISSUER_WALLET_ID')?.trim() || null;
    const verifierId =
      this.config.get<string>('KUATIA_VERIFIER_WALLET_ID')?.trim() || null;
    return { issuerId, verifierId };
  }

  /**
   * True si issuer y verifier están configurados en env.
   */
  isConfigured(): boolean {
    const { issuerId, verifierId } = this.sharedWalletIds();
    return Boolean(issuerId && verifierId);
  }

  /**
   * Issuer compartido (fuente de verdad para offers / metadata).
   *
   * @throws {Error} Si `KUATIA_ISSUER_WALLET_ID` no está configurado.
   */
  requireSharedIssuerWalletId(): string {
    const { issuerId } = this.sharedWalletIds();
    if (!issuerId) {
      throw new Error('KUATIA_ISSUER_WALLET_ID is not configured');
    }
    return issuerId;
  }

  /**
   * Verifier compartido (fuente de verdad para OID4VP).
   *
   * @throws {Error} Si `KUATIA_VERIFIER_WALLET_ID` no está configurado.
   */
  requireSharedVerifierWalletId(): string {
    const { verifierId } = this.sharedWalletIds();
    if (!verifierId) {
      throw new Error('KUATIA_VERIFIER_WALLET_ID is not configured');
    }
    return verifierId;
  }
}
