import { AsyncLocalStorage } from 'node:async_hooks';

/** Bearer del request MCP actual (un valor por request HTTP). */
export const requestBearer = new AsyncLocalStorage<string>();

/**
 * JWT Staff del request en curso.
 *
 * @throws Si se llama fuera de `requestBearer.run` (bug del servidor).
 */
export function getBearer(): string {
  const token = requestBearer.getStore();
  if (!token) {
    throw new Error('Missing request bearer');
  }
  return token;
}
