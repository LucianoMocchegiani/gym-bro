const TOOL_DONE: Record<string, string> = {
  search_members: 'Buscó afiliados',
  get_member_account: 'Consultó el estado de cuenta',
  preview_member_access: 'Consultó si puede entrar',
  list_sessions: 'Listó sesiones',
  get_session: 'Consultó una sesión',
  get_cash_day: 'Consultó la caja',
  suggest_nav: 'Sugirió una pantalla',
};

const TOOL_PENDING: Record<string, string> = {
  search_members: 'Buscando afiliados…',
  get_member_account: 'Consultando estado de cuenta…',
  preview_member_access: 'Consultando ingreso…',
  list_sessions: 'Listando sesiones…',
  get_session: 'Consultando sesión…',
  get_cash_day: 'Consultando caja…',
  suggest_nav: 'Buscando una pantalla…',
};

/**
 * Una línea para el hilo (C5). Sin JSON ni chips (C7).
 */
export function toolLineLabel(toolName: string, pending: boolean): string {
  const key = toolName.trim();
  if (pending) {
    return TOOL_PENDING[key] ?? `Usando ${key}…`;
  }
  return TOOL_DONE[key] ?? `Usó ${key}`;
}
