import { Module, forwardRef } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CashPaymentService } from './cash-payment.service';
import { OnlinePaymentService } from './online-payment.service';
import { WebhookPaymentService } from './webhook-payment.service';
import { AuditModule } from '../audit/audit.module';
import { PaymentRegisterModule } from '../payment-register/payment-register.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { RolesModule } from '../roles/roles.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ContractsModule } from '../contracts/contracts.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT } from './mp-account.port';
import { HttpMpAccountAdapter } from './http-mp-account.adapter';
import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { MercadoPagoAccountController } from './mercadopago-account.controller';
import { SuperMercadoPagoAccountController } from './super-mercadopago-account.controller';

@Module({
  imports: [
    AuditModule,
    PaymentRegisterModule,
    forwardRef(() => ReceiptsModule),
    forwardRef(() => ContractsModule),
    forwardRef(() => ReservationsModule),
    SessionsModule,
    RolesModule,
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    MercadoPagoAccountController,
    SuperMercadoPagoAccountController,
  ],
  providers: [
    TransactionService,
    CashPaymentService,
    OnlinePaymentService,
    WebhookPaymentService,
    MercadoPagoAccountService,
    HttpMpAccountAdapter,
    {
      provide: MP_ACCOUNT_PORT,
      useExisting: HttpMpAccountAdapter,
    },
  ],
  exports: [
    TransactionService,
    CashPaymentService,
    OnlinePaymentService,
    WebhookPaymentService,
    PaymentRegisterModule,
    MercadoPagoAccountService,
    MP_ACCOUNT_PORT,
  ],
})
export class PaymentModule {}
