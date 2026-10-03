/**
 * Kind inferido de los componentes del pack (no se persiste).
 */
export type PackKind = 'ACCESS' | 'CREDITS' | 'MIXED';

/**
 * Línea de componente en respuestas de API.
 */
export type PackComponentDetail = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: 'ACCESO_LIBRE' | 'POR_SESIONES';
  creditAmount: number | null;
};

/**
 * Pack del catálogo con componentes, kind calculado y refs Quark OID4VCI.
 */
export type PackDetail = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: Date | null;
  active: boolean;
  /** Solo packs de plataforma: el alta / Caja puede dar el mes de prueba. */
  offersPlatformTrial: boolean;
  kind: PackKind;
  components: PackComponentDetail[];
  /** Clave en `credentialConfigurationsSupported` (`pack_{id}`). */
  kuatiaConfigurationId: string | null;
  /** VCT (`urn:faciliter:pack:{id}`). */
  kuatiaVct: string | null;
  kuatiaSyncedAt: Date | null;
  /** Soft-fail de sync; null si OK o nunca intentado. */
  kuatiaLastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Pack de plataforma en la landing (tenant `admin`, sin auth).
 */
export type PublicPlatformPack = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  /** false = se cobra desde el primer mes (sin prueba). */
  offersPlatformTrial: boolean;
  services: { id: string; name: string }[];
};
