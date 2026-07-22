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
 * Pack del catálogo con componentes y kind calculado.
 */
export type PackDetail = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: Date | null;
  active: boolean;
  kind: PackKind;
  components: PackComponentDetail[];
  createdAt: Date;
  updatedAt: Date;
};
