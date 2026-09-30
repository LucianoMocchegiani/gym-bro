-- E2 débito vs caja + avisos de cobro MP rechazado / mandato fallido.
ALTER TYPE "NotificationEventCode" ADD VALUE IF NOT EXISTS 'CONTRACT_EXPIRING_DEBIT';
ALTER TYPE "NotificationEventCode" ADD VALUE IF NOT EXISTS 'DEBIT_CHARGE_FAILED';
ALTER TYPE "NotificationEventCode" ADD VALUE IF NOT EXISTS 'DEBIT_MANDATE_FAILED';
