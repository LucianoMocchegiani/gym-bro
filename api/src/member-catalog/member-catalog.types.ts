/**
 * Catálogo expuesto al afiliado (mobile): sesiones publicadas y packs activos.
 *
 * @remarks Slices de la app member (E9): reservas, drop-in, waitlist y tienda.
 */

export type MemberSessionDetail = {
  id: string;
  serviceId: string;
  serviceName: string;
  branchName: string | null;
  instructorName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  /** Cupo restante = capacity - bookedCount. */
  slotsLeft: number;
  hasSlots: boolean;
  /** Precio drop-in (ARS) si el servicio lo habilita; null si no. */
  dropInPrice: number | null;
};

export type MemberPackComponentDetail = {
  serviceId: string;
  serviceName: string;
  serviceType: 'ACCESO_LIBRE' | 'POR_SESIONES';
  creditAmount: number | null;
};

export type MemberPackDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: 'MONTHLY' | 'ONE_TIME';
  creditsExpireAt: Date | null;
  kind: 'ACCESS' | 'CREDITS' | 'MIXED';
  components: MemberPackComponentDetail[];
};
