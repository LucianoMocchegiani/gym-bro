import { AccessProvider } from '@prisma/client';

/**
 * Pedido de apertura tras un `allow` de Faciliter.
 */
export type DoorOpenCommand = {
  tenantId: string;
  provider: AccessProvider;
  /** Serie del aparato / puerta que pidió el ingreso, si se conoce. */
  deviceSerial: string | null;
  /** Intento ALLOWED que motiva la apertura. */
  accessAttemptId: string;
};

/**
 * Abre el hierro (relé, comando del aparato…) después de que Faciliter decidió `allow`.
 *
 * @remarks Nunca decide derechos: solo actúa. Un deny no llama a este puerto.
 * El driver real (relé USB, comando ZK) vive fuera de Nest (doc 19 §2.6); este
 * puerto es el punto de enchufe.
 */
export abstract class DoorActuatorPort {
  /**
   * Pide la apertura. No lanza: si el actuador falla, el ingreso ya quedó registrado.
   *
   * @returns `true` si el pulso se envió (o se registró en el adapter de log).
   */
  abstract open(command: DoorOpenCommand): Promise<boolean>;
}
