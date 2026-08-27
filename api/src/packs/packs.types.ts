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
  kind: PackKind;
  components: PackComponentDetail[];
  /** Clave en `credentialConfigurationsSupported` (`pack_{id}`). */
  kuatiaConfigurationId: string | null;
  /** VCT (`urn:gymbro:pack:{id}`). */
  kuatiaVct: string | null;
  kuatiaSyncedAt: Date | null;
  /** Soft-fail de sync; null si OK o nunca intentado. */
  kuatiaLastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};
