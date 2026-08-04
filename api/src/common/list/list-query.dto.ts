import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query común de listados paginados.
 *
 * @remarks `page` 1-based. `order` solo `asc`|`desc`. `orderBy` se valida
 * por whitelist en cada servicio (no en este DTO genérico).
 */
export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** Búsqueda texto libre (campos según el recurso). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** Campo de orden (whitelist por endpoint). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

/**
 * Respuesta estándar de listados.
 */
export type ListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

/**
 * Valores normalizados para Prisma `skip`/`take` + sort/q.
 */
export type NormalizedListQuery = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q?: string;
  orderBy?: string;
  order: 'asc' | 'desc';
};

/**
 * Normaliza query de listado con defaults.
 */
export function normalizeListQuery(
  query: ListQueryDto | undefined,
): NormalizedListQuery {
  const page = query?.page && query.page > 0 ? query.page : 1;
  const pageSize =
    query?.pageSize && query.pageSize > 0
      ? Math.min(query.pageSize, 100)
      : 20;
  const q = query?.q?.trim();
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    q: q && q.length > 0 ? q : undefined,
    orderBy: query?.orderBy?.trim() || undefined,
    order: query?.order === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * Arma {@link ListResult} a partir de items + total.
 */
export function toListResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ListResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  };
}

/**
 * Elige `orderBy` de una whitelist; si no matchea, usa `fallback`.
 */
export function resolveOrderField<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (requested && (allowed as readonly string[]).includes(requested)) {
    return requested as T;
  }
  return fallback;
}
