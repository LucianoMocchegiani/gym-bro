import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GymbroApiError } from './gymbro-client.js';

export type NavLink = { href: string; label: string };

export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  };
}

export function permissionDeniedResult(): CallToolResult {
  return {
    content: [{ type: 'text', text: 'No hay permiso para esta consulta.' }],
    isError: true,
  };
}

export async function toolFromGymbro(
  fn: () => Promise<unknown>,
): Promise<CallToolResult> {
  try {
    return jsonResult(await fn());
  } catch (error) {
    if (error instanceof GymbroApiError) {
      if (error.status === 401) {
        return {
          content: [
            {
              type: 'text',
              text: 'Sesión vencida. Volvé a entrar al Admin.',
            },
          ],
          isError: true,
        };
      }
      if (error.status === 403) {
        return permissionDeniedResult();
      }
      if (error.status === 404) {
        return {
          content: [{ type: 'text', text: 'No encontrado.' }],
          isError: true,
        };
      }
      if (error.status === 400) {
        return {
          content: [{ type: 'text', text: 'Pedido inválido.' }],
          isError: true,
        };
      }
    }
    console.error(error);
    return {
      content: [{ type: 'text', text: 'Error al consultar GymBro.' }],
      isError: true,
    };
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function pickString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

export function pickNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function pickBool(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
}

export function take<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}

export function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter((item): item is T => item != null);
}
