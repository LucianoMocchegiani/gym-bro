const TOOL_DONE: Record<string, string> = {
  search_members: 'Buscó afiliados',
  get_member_account: 'Consultó el estado de cuenta',
  preview_member_access: 'Consultó si puede entrar',
  list_sessions: 'Listó sesiones',
  get_session: 'Consultó una sesión',
  get_cash_day: 'Consultó la caja',
  suggest_nav: 'Sugirió una pantalla',
  get_reports_summary: 'Consultó reportes',
  list_refund_requests: 'Listó devoluciones',
  list_debit_mandates: 'Listó débitos',
  list_services: 'Listó servicios',
  list_packs: 'Listó packs',
  get_pack: 'Consultó un pack',
  list_roles: 'Listó roles',
  get_role: 'Consultó un rol',
  search_audit_events: 'Buscó en auditoría',
  get_help: 'Consultó la ayuda',
};

const TOOL_PENDING: Record<string, string> = {
  search_members: 'Buscando afiliados…',
  get_member_account: 'Consultando estado de cuenta…',
  preview_member_access: 'Consultando ingreso…',
  list_sessions: 'Listando sesiones…',
  get_session: 'Consultando sesión…',
  get_cash_day: 'Consultando caja…',
  suggest_nav: 'Buscando una pantalla…',
  get_reports_summary: 'Consultando reportes…',
  list_refund_requests: 'Listando devoluciones…',
  list_debit_mandates: 'Listando débitos…',
  list_services: 'Listando servicios…',
  list_packs: 'Listando packs…',
  get_pack: 'Consultando pack…',
  list_roles: 'Listando roles…',
  get_role: 'Consultando rol…',
  search_audit_events: 'Buscando en auditoría…',
  get_help: 'Consultando la ayuda…',
};

/**
 * Una línea para el hilo (C5/C6). Sin JSON ni chips (C7).
 */
export function toolLineLabel(toolName: string, pending: boolean): string {
  const key = toolName.trim();
  if (pending) {
    return TOOL_PENDING[key] ?? `Usando ${key}…`;
  }
  return TOOL_DONE[key] ?? `Usó ${key}`;
}
