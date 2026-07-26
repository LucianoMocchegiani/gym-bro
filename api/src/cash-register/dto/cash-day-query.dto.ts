import { IsOptional, Matches } from 'class-validator';

/**
 * Query de caja del día. `date` = YYYY-MM-DD en timezone del gym.
 */
export class GetCashDayQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be YYYY-MM-DD',
  })
  date?: string;
}
