import { IsArray, IsUUID } from 'class-validator';

/**
 * Reemplazo completo de roles asignados a un staff (RN-ROL-004).
 */
export class SetStaffRolesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
