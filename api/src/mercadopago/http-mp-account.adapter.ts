import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MpAccountPort, MpAccountValidation } from './mp-account.port';

const MP_USERS_ME = 'https://api.mercadopago.com/users/me';

/**
 * Adapter HTTP de validación de cuenta MP (`GET /users/me`).
 *
 * @remarks Si `MP_ACCOUNT_VALIDATE_MODE=stub`, acepta cualquier token no vacío
 * (solo desarrollo local / Postman sin sandbox real).
 */
@Injectable()
export class HttpMpAccountAdapter extends MpAccountPort {
  private readonly logger = new Logger(HttpMpAccountAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * @inheritdoc
   */
  async validateAccessToken(accessToken: string): Promise<MpAccountValidation> {
    const mode =
      this.config.get<string>('MP_ACCOUNT_VALIDATE_MODE')?.trim() ?? 'live';

    if (mode === 'stub') {
      return {
        userId: 'stub-mp-user',
        nickname: 'stub',
      };
    }

    const response = await fetch(MP_USERS_ME, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `MP /users/me failed status=${response.status} body=${body.slice(0, 200)}`,
      );
      throw new Error(
        `Mercado Pago rejected credentials (HTTP ${response.status})`,
      );
    }

    const data = (await response.json()) as {
      id?: number | string;
      nickname?: string;
    };
    if (data.id === undefined || data.id === null) {
      throw new Error('Mercado Pago /users/me response missing id');
    }

    return {
      userId: String(data.id),
      nickname: data.nickname,
    };
  }
}
