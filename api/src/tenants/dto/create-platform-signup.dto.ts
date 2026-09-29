import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Alta self-serve: pack de `admin` + slug del gym.
 */
export class CreatePlatformSignupDto {
  @IsUUID()
  packId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  gymName!: string;
}
