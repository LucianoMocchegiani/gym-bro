import { MemberStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Alta de afiliado (CU-AFI-001). Staff define password inicial.
 */
export class CreateMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  document?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

/**
 * Edición de ficha (CU-AFI-002). No cambia status ni password.
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(40)
  document?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  branchId?: string | null;
}

/**
 * Baja / suspensión / reactivación (CU-AFI-003).
 */
export class UpdateMemberStatusDto {
  @IsEnum(MemberStatus)
  status!: MemberStatus;
}

/**
 * Query de listado de afiliados (CU-AFI-001).
 *
 * @remarks `q` busca en email, name y document. `orderBy` acepta
 * `createdAt`, `name`, `email` y `status` (whitelist en el servicio).
 */
export class ListMembersQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
