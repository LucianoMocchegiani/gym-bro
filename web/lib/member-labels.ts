/**
 * Etiquetas de status de afiliado.
 */
export function formatMemberStatus(
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'SUSPENDED':
      return 'Suspendido';
    case 'INACTIVE':
      return 'Inactivo';
    default:
      return status;
  }
}
