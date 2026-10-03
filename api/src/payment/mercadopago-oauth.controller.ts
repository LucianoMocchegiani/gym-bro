import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';

/**
 * Vuelta de «Conectar Mercado Pago» (redirect_uri única de la app Faciliter).
 *
 * @remarks Sin JWT: llega el navegador desde MP. El tenant sale del `state`.
 */
@Controller('mercadopago/oauth')
export class MercadoPagoOAuthController {
  constructor(private readonly oauth: MercadoPagoOAuthService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const outcome = await this.oauth.handleCallback({ code, state, error });
    if (outcome.kind === 'redirect') {
      res.redirect(HttpStatus.FOUND, outcome.url);
      return;
    }
    res
      .status(HttpStatus.BAD_REQUEST)
      .type('text/plain; charset=utf-8')
      .send(
        'El enlace de Mercado Pago no es válido o ya se usó. Volvé a Config en Faciliter y tocá «Conectar Mercado Pago» otra vez.',
      );
  }
}
