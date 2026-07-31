import { IsOptional, Matches } from 'class-validator';

/**
 * Query de reportes. Fechas de negocio YYYY-MM-DD (timezone BA).
 *
 * @remarks Si omitís ambos, usa el mes calendario actual.
 */
export class ReportsSummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be YYYY-MM-DD',
  })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be YYYY-MM-DD',
  })
  to?: string;
}
