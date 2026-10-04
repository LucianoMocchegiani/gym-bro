export const ASSISTANT_ASK_EVENT = 'faciliter:assistant-ask';

export type AssistantAskDetail = { message: string };

/**
 * Abre la burbuja del asistente público y le manda `message` como si lo
 * escribiera el visitante (botones «Más información» de la landing).
 *
 * @remarks Lo escucha `AssistantLauncher` con `variant="public"`; sin burbuja
 * montada no pasa nada.
 */
export function askAssistant(message: string): void {
  window.dispatchEvent(
    new CustomEvent<AssistantAskDetail>(ASSISTANT_ASK_EVENT, {
      detail: { message },
    }),
  );
}
