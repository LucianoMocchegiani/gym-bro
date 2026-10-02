/** Palabra que la persona escribe para confirmar la baja. */
export const ACCOUNT_DELETION_CONFIRM_WORD = 'ELIMINAR';

/**
 * Dominio de los mails anonimizados (`deleted-{identityId}@...`).
 *
 * @remarks `.invalid` está reservado (RFC 2606): nunca recibe mail ni choca
 * con un mail real.
 */
export const DELETED_IDENTITY_EMAIL_DOMAIN = 'deleted.faciliter.invalid';
