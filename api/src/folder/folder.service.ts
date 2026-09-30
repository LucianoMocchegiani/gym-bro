import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FolderItemKind, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AuthUser } from '../auth/auth.types';
import { FILE_STORAGE_PORT } from '../file-storage/file-storage.port';
import type { FileStoragePort } from '../file-storage/file-storage.port';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../roles/permissions.service';
import type {
  FolderFileBytes,
  FolderItemDetail,
  FolderLabelDetail,
  FolderOwnerKind,
} from './folder.types';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const FOLDER_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);
const MAX_SIZE = 10 * 1024 * 1024;

type OwnerRef = { kind: FolderOwnerKind; id: string };

/**
 * Carpeta de notas y files de un socio o un staff.
 *
 * @remarks RN-FOL-001..004. Alta solo staff (web). Lectura: staff con permiso
 * o el dueño (`/me`). Files vía R2 sin URL pública.
 */
@Injectable()
export class FolderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    @Inject(FILE_STORAGE_PORT) private readonly storage: FileStoragePort,
  ) {}

  /**
   * Etiquetas del tenant. Staff con `members.read` o `staff.read`.
   */
  async listLabels(
    tenantId: string,
    user: AuthUser,
  ): Promise<FolderLabelDetail[]> {
    await this.assertStaffAny(user, tenantId, ['members.read', 'staff.read']);
    const rows = await this.prisma.folderLabel.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  /**
   * Crea una etiqueta. Staff con `members.write` o `staff.write`.
   */
  async createLabel(
    tenantId: string,
    user: AuthUser,
    nameRaw: string,
  ): Promise<FolderLabelDetail> {
    await this.assertStaffAny(user, tenantId, [
      'members.write',
      'staff.write',
    ]);
    const name = nameRaw.trim();
    if (!name) {
      throw new BadRequestException('Nombre de etiqueta vacío');
    }
    try {
      const row = await this.prisma.folderLabel.create({
        data: { tenantId, name },
      });
      return { id: row.id, name: row.name };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('Esa etiqueta ya existe');
      }
      throw err;
    }
  }

  /**
   * Lista la carpeta del usuario autenticado (socio o staff).
   */
  async listMine(
    tenantId: string,
    user: AuthUser,
  ): Promise<FolderItemDetail[]> {
    if (user.profileType === 'MEMBER') {
      return this.listItems(tenantId, { kind: 'member', id: user.userId });
    }
    if (user.profileType === 'STAFF') {
      return this.listItems(tenantId, { kind: 'staff', id: user.userId });
    }
    throw new ForbiddenException('Perfil no admite carpeta');
  }

  /**
   * Lista carpeta de un socio (staff `members.read`).
   */
  async listMemberFolder(
    tenantId: string,
    user: AuthUser,
    memberId: string,
  ): Promise<FolderItemDetail[]> {
    await this.assertStaffCode(user, tenantId, 'members.read');
    await this.assertMemberInTenant(tenantId, memberId);
    return this.listItems(tenantId, { kind: 'member', id: memberId });
  }

  /**
   * Lista carpeta de un staff (staff `staff.read`).
   */
  async listStaffFolder(
    tenantId: string,
    user: AuthUser,
    staffUserId: string,
  ): Promise<FolderItemDetail[]> {
    await this.assertStaffCode(user, tenantId, 'staff.read');
    await this.assertStaffInTenant(tenantId, staffUserId);
    return this.listItems(tenantId, { kind: 'staff', id: staffUserId });
  }

  /**
   * Alta de nota (staff).
   */
  async createNote(
    tenantId: string,
    user: AuthUser,
    owner: OwnerRef,
    input: { title?: string; body: string; labelId?: string },
  ): Promise<FolderItemDetail> {
    await this.assertWrite(user, tenantId, owner.kind);
    await this.assertOwnerExists(tenantId, owner);
    const labelId = await this.resolveLabelId(tenantId, input.labelId);
    const row = await this.prisma.folderItem.create({
      data: {
        tenantId,
        kind: FolderItemKind.NOTE,
        title: input.title?.trim() || null,
        body: input.body.trim(),
        labelId,
        memberId: owner.kind === 'member' ? owner.id : null,
        staffUserId: owner.kind === 'staff' ? owner.id : null,
        createdByStaffId: user.userId,
      },
      include: this.itemInclude(),
    });
    return this.toDetail(row);
  }

  /**
   * Alta de PDF o imagen (staff).
   */
  async createFile(
    tenantId: string,
    user: AuthUser,
    owner: OwnerRef,
    file: { mimetype: string; size: number; buffer: Buffer; originalname: string },
    input: { title?: string; labelId?: string },
  ): Promise<FolderItemDetail> {
    await this.assertWrite(user, tenantId, owner.kind);
    await this.assertOwnerExists(tenantId, owner);
    if (!FOLDER_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Tipo no permitido. Usá PDF, JPG, PNG, WebP o GIF.',
      );
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('El archivo supera 10 MB.');
    }
    const labelId = await this.resolveLabelId(tenantId, input.labelId);
    const ext = this.extFromMime(file.mimetype);
    const key = `folder/${tenantId}/${owner.kind}/${owner.id}/${randomUUID()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const filename = this.safeFilename(file.originalname, ext);
    try {
      const row = await this.prisma.folderItem.create({
        data: {
          tenantId,
          kind: FolderItemKind.FILE,
          title: input.title?.trim() || filename,
          storageKey: key,
          originalFilename: filename,
          mime: file.mimetype,
          sizeBytes: file.size,
          labelId,
          memberId: owner.kind === 'member' ? owner.id : null,
          staffUserId: owner.kind === 'staff' ? owner.id : null,
          createdByStaffId: user.userId,
        },
        include: this.itemInclude(),
      });
      return this.toDetail(row);
    } catch (err) {
      await this.storage.delete(key);
      throw err;
    }
  }

  /**
   * Baja de ítem. Staff con write del dueño.
   */
  async deleteItem(
    tenantId: string,
    user: AuthUser,
    itemId: string,
    expected?: OwnerRef,
  ): Promise<void> {
    const row = await this.prisma.folderItem.findFirst({
      where: { id: itemId, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Ítem no encontrado');
    }
    const owner: OwnerRef = row.memberId
      ? { kind: 'member', id: row.memberId }
      : { kind: 'staff', id: row.staffUserId! };
    if (
      expected &&
      (expected.kind !== owner.kind || expected.id !== owner.id)
    ) {
      throw new NotFoundException('Ítem no encontrado');
    }
    await this.assertWrite(user, tenantId, owner.kind);
    if (row.storageKey) {
      await this.storage.delete(row.storageKey);
    }
    await this.prisma.folderItem.delete({ where: { id: row.id } });
  }

  /**
   * Bytes del file para `/me` o staff.
   */
  async getFileBytes(
    tenantId: string,
    user: AuthUser,
    itemId: string,
    scope: 'mine' | 'staff',
    expected?: OwnerRef,
  ): Promise<FolderFileBytes> {
    const row = await this.prisma.folderItem.findFirst({
      where: { id: itemId, tenantId },
    });
    if (!row || row.kind !== FolderItemKind.FILE || !row.storageKey) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const owner: OwnerRef = row.memberId
      ? { kind: 'member', id: row.memberId }
      : { kind: 'staff', id: row.staffUserId! };
    if (
      expected &&
      (expected.kind !== owner.kind || expected.id !== owner.id)
    ) {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (scope === 'mine') {
      this.assertMine(user, row.memberId, row.staffUserId);
    } else {
      const ownerKind: FolderOwnerKind = row.memberId ? 'member' : 'staff';
      const readCode =
        ownerKind === 'member' ? 'members.read' : 'staff.read';
      await this.assertStaffCode(user, tenantId, readCode);
    }
    const obj = await this.storage.getObject(row.storageKey);
    return {
      buffer: obj.buffer,
      contentType: row.mime ?? obj.contentType,
      filename: row.originalFilename ?? 'archivo',
    };
  }

  private async listItems(
    tenantId: string,
    owner: OwnerRef,
  ): Promise<FolderItemDetail[]> {
    const rows = await this.prisma.folderItem.findMany({
      where:
        owner.kind === 'member'
          ? { tenantId, memberId: owner.id }
          : { tenantId, staffUserId: owner.id },
      orderBy: { createdAt: 'desc' },
      include: this.itemInclude(),
    });
    return rows.map((r) => this.toDetail(r));
  }

  private itemInclude() {
    return {
      label: { select: { id: true, name: true } },
      createdByStaff: { select: { name: true, email: true } },
    } as const;
  }

  private toDetail(row: {
    id: string;
    kind: FolderItemKind;
    title: string | null;
    body: string | null;
    originalFilename: string | null;
    mime: string | null;
    sizeBytes: number | null;
    createdAt: Date;
    label: { id: string; name: string } | null;
    createdByStaff: { name: string | null; email: string } | null;
  }): FolderItemDetail {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      originalFilename: row.originalFilename,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      createdByName:
        row.createdByStaff?.name?.trim() ||
        row.createdByStaff?.email ||
        null,
    };
  }

  private async resolveLabelId(
    tenantId: string,
    labelId?: string,
  ): Promise<string | null> {
    if (!labelId) {
      return null;
    }
    const label = await this.prisma.folderLabel.findFirst({
      where: { id: labelId, tenantId },
    });
    if (!label) {
      throw new BadRequestException('Etiqueta inválida');
    }
    return label.id;
  }

  private async assertOwnerExists(
    tenantId: string,
    owner: OwnerRef,
  ): Promise<void> {
    if (owner.kind === 'member') {
      await this.assertMemberInTenant(tenantId, owner.id);
      return;
    }
    await this.assertStaffInTenant(tenantId, owner.id);
  }

  private async assertMemberInTenant(
    tenantId: string,
    memberId: string,
  ): Promise<void> {
    const m = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });
    if (!m) {
      throw new NotFoundException('Afiliado no encontrado');
    }
  }

  private async assertStaffInTenant(
    tenantId: string,
    staffUserId: string,
  ): Promise<void> {
    const s = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
      select: { id: true },
    });
    if (!s) {
      throw new NotFoundException('Staff no encontrado');
    }
  }

  private assertMine(
    user: AuthUser,
    memberId: string | null,
    staffUserId: string | null,
  ): void {
    if (user.profileType === 'MEMBER' && memberId === user.userId) {
      return;
    }
    if (user.profileType === 'STAFF' && staffUserId === user.userId) {
      return;
    }
    throw new ForbiddenException('No es tu carpeta');
  }

  private async assertWrite(
    user: AuthUser,
    tenantId: string,
    ownerKind: FolderOwnerKind,
  ): Promise<void> {
    const code = ownerKind === 'member' ? 'members.write' : 'staff.write';
    await this.assertStaffCode(user, tenantId, code);
  }

  private async assertStaffCode(
    user: AuthUser,
    tenantId: string,
    code: string,
  ): Promise<void> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff permission required');
    }
    const codes = await this.permissions.getPermissionCodes(
      user.userId,
      tenantId,
    );
    if (!codes.has(code)) {
      throw new ForbiddenException(`Missing permission(s): ${code}`);
    }
  }

  private async assertStaffAny(
    user: AuthUser,
    tenantId: string,
    codesNeeded: string[],
  ): Promise<void> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff permission required');
    }
    const codes = await this.permissions.getPermissionCodes(
      user.userId,
      tenantId,
    );
    if (!codesNeeded.some((c) => codes.has(c))) {
      throw new ForbiddenException(
        `Missing permission(s): ${codesNeeded.join(' o ')}`,
      );
    }
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
    };
    return map[mime] ?? 'bin';
  }

  private safeFilename(original: string, ext: string): string {
    const base = original.replace(/[/\\]/g, '').trim() || `archivo.${ext}`;
    return base.slice(0, 180);
  }
}
