import { Injectable } from '@nestjs/common';

/**
 * Store en memoria de handoffs de impersonación (un uso, ~60 s).
 *
 * @remarks Mismo criterio que `auth-proxy` (`Map` + TTL). Un restart de API
 * invalida handoffs pendientes. No hay tabla Prisma.
 */
export type ImpersonationHandoff = {
  staffUserId: string;
  tenantId: string;
  tenantSlug: string;
  platformStaffId: string;
};

const TTL_MS = 60_000;

@Injectable()
export class ImpersonationHandoffStore {
  private readonly byId = new Map<
    string,
    ImpersonationHandoff & { createdAt: number }
  >();

  put(id: string, data: ImpersonationHandoff): void {
    this.byId.set(id, { ...data, createdAt: Date.now() });
    setTimeout(() => {
      this.byId.delete(id);
    }, TTL_MS);
  }

  /**
   * Lee y borra. Null si no existe o venció.
   */
  consume(id: string): ImpersonationHandoff | null {
    const row = this.byId.get(id);
    this.byId.delete(id);
    if (!row) {
      return null;
    }
    if (Date.now() - row.createdAt > TTL_MS) {
      return null;
    }
    return {
      staffUserId: row.staffUserId,
      tenantId: row.tenantId,
      tenantSlug: row.tenantSlug,
      platformStaffId: row.platformStaffId,
    };
  }

  discard(id: string): void {
    this.byId.delete(id);
  }
}
