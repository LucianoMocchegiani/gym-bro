'use client';

import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { useEffect } from 'react';

export type MpCardTokenResult = {
  token: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: number;
  identificationType?: string;
  identificationNumber?: string;
};

type BrickFormData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments?: number;
  payer?: {
    identification?: { type?: string; number?: string };
  };
};

/**
 * Card Payment Brick de MP: tokeniza en el browser (sin PAN en GymBro).
 *
 * @remarks CU-PAG-008. `amount` es el del pack (el Brick exige monto &gt; 0
 * aunque “autorizar tarjeta” no cobre).
 */
export function MpCardPaymentBrick({
  publicKey,
  amount,
  onToken,
}: {
  publicKey: string;
  amount: number;
  onToken: (result: MpCardTokenResult) => Promise<void>;
}) {
  useEffect(() => {
    initMercadoPago(publicKey, { locale: 'es-AR' });
  }, [publicKey]);

  return (
    <CardPayment
      initialization={{ amount }}
      onSubmit={async (formData: BrickFormData) => {
        try {
          await onToken({
            token: formData.token,
            paymentMethodId: formData.payment_method_id,
            issuerId:
              formData.issuer_id !== undefined && formData.issuer_id !== null
                ? String(formData.issuer_id)
                : undefined,
            installments: formData.installments ?? 1,
            identificationType: formData.payer?.identification?.type,
            identificationNumber: formData.payer?.identification?.number,
          });
        } catch (err) {
          const message =
            err instanceof Error && err.message.trim()
              ? err.message
              : 'No se pudo procesar el débito';
          throw new Error(message);
        }
      }}
    />
  );
}
