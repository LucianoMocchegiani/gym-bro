import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de staff del gym (CU-ROL-004).
 */
export class CreateStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  /** Roles iniciales (mismo tenant). Puede ir vacío y asignarse después. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

/**
 * Reemplazo completo de roles asignados a un staff (RN-ROL-004).
 */
export class SetStaffRolesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
