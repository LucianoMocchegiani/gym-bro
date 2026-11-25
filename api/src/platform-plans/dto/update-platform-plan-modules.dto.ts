import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class UpdatePlatformPlanModulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(32)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z][a-z0-9-]{0,39}$/, { each: true })
  modules!: string[];
}
