/**
 * Emisión de credenciales de acceso del gym, independiente del sistema de puerta.
 *
 * @remarks Mismas operaciones que hoy hace el adapter Kuatia (metadata del pack
 * en el issuer + oferta OID4VCI al vender), sin métodos que Kuatia no tenga.
 * Packs y contratos dependen de este puerto, no de Kuatia. En un gym ZKTeco la
 * implementación no envía nada a Kuatia (RN-ACC-010).
 * @see docs/19-puerta-molinete-hw-sw.md
 */
export abstract class CredentialIssuerPort {
  /**
   * Publica (o actualiza) la configuración de credencial del pack.
   *
   * @param tenantId - Tenant dueño del pack (del contexto autenticado).
   * @param packId - Pack ya persistido.
   * @param packName - Nombre visible de la credencial.
   * @remarks Nunca lanza por fallo del sistema externo.
   */
  abstract syncPackConfiguration(
    tenantId: string,
    packId: string,
    packName: string,
  ): Promise<void>;

  /**
   * Asegura la oferta de credencial del contrato vendido (una por socio + pack).
   *
   * @param options.force - Re-oferta aunque ya haya una pendiente o aceptada.
   * @remarks Nunca lanza por fallo del sistema externo.
   * @throws {NotFoundException} Si el contrato no existe en el tenant.
   */
  abstract ensureOfferForContract(
    tenantId: string,
    contractId: string,
    options?: { force?: boolean },
  ): Promise<void>;
}
