import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelPlatformPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  confirmSlug!: string;
}
