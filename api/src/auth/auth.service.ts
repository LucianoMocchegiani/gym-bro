import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProfileType, MemberStatus, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertValidTenantSlug,
  normalizeTenantSlug,
} from '../tenants/tenant-slug';
import { AuthTokens, JwtAccessPayload, type AuthUser } from './auth.types';
import {
  ChangePasswordDto,
  ImpersonateDto,
  MemberLoginDto,
  StaffLoginDto,
  SuperLoginDto,
} from './dto/auth.dto';

type TokenOwner = {
  profileType: AuthProfileType;
  userId: string;
  email: string;
  name: string | null;
  tenantId?: string;
  impersonatedBy?: string;
};

/**
 * Autenticación JWT + refresh para Super, Staff y Afiliado.
 *
 * @remarks Perfiles separados (RN-ROL-005). Staff/Member exigen tenant activo.
 * Refresh tokens se persisten hasheados en Postgres.
 */
@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.accessTtlSeconds = Number(
      this.config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? 900,
    );
    this.refreshTtlSeconds = Number(
      this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 60 * 60 * 24 * 14,
    );
  }

  /**
   * Login de Super Admin (sin tenant).
   *
   * @throws {UnauthorizedException} Credenciales inválidas o usuario inactivo.
   */
  async loginSuper(dto: SuperLoginDto): Promise<AuthTokens> {
    const user = await this.prisma.superUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.active) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.assertPassword(dto.password, user.passwordHash);
    return this.issueTokens({
      profileType: AuthProfileType.SUPER,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  /**
   * Super Admin impersona a un staff member (token temporal 4h).
   *
   * @remarks Emite un JWT con los datos del staff pero incluye `impersonatedBy`
   * con el ID del Super Admin. Solo para soporte/debug.
   */
  async impersonate(
    superUserId: string,
    dto: ImpersonateDto,
  ): Promise<AuthTokens> {
    await this.assertTenantActive(dto.tenantId);
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: dto.staffUserId },
    });
    if (!staff || staff.tenantId !== dto.tenantId || !staff.active) {
      throw new BadRequestException(
        'Staff user not found or inactive in this tenant',
      );
    }

    const tokens = await this.issueTokens({
      profileType: AuthProfileType.STAFF,
      userId: staff.id,
      email: staff.email,
      name: staff.name,
      tenantId: staff.tenantId,
      impersonatedBy: superUserId,
    });

    // Audit: registrar impersonación
    await this.audit.record({
      tenantId: dto.tenantId,
      actor: { profileType: 'SUPER', userId: superUserId },
      action: 'super.impersonate',
      entityType: 'staff_user',
      entityId: staff.id,
      after: { staffEmail: staff.email, staffName: staff.name },
    });

    return tokens;
  }

  /**
   * Login de staff dentro de un tenant.
   *
   * @remarks Acepta `tenantId` o `tenantSlug` (subdominio).
   * @throws {UnauthorizedException} Credenciales inválidas.
   * @throws {ForbiddenException} Tenant suspendido.
   * @throws {BadRequestException} Falta tenantId y tenantSlug.
   */
  async loginStaff(dto: StaffLoginDto): Promise<AuthTokens> {
    const tenantId = await this.resolveTenantId(dto);
    await this.assertTenantActive(tenantId);
    const user = await this.prisma.staffUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email.toLowerCase(),
        },
      },
    });
    if (!user?.active) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.assertPassword(dto.password, user.passwordHash);
    return this.issueTokens({
      profileType: AuthProfileType.STAFF,
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    });
  }

  /**
   * Login de afiliado dentro de un tenant.
   *
   * @remarks Acepta `tenantId` o `tenantSlug` (mismo criterio que Staff).
   * @throws {UnauthorizedException} Credenciales inválidas.
   * @throws {ForbiddenException} Tenant suspendido.
   * @throws {BadRequestException} Falta tenantId y tenantSlug.
   */
  async loginMember(dto: MemberLoginDto): Promise<AuthTokens> {
    const tenantId = await this.resolveTenantId(dto);
    await this.assertTenantActive(tenantId);
    const user = await this.prisma.member.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email.toLowerCase(),
        },
      },
    });
    if (!user || user.status !== MemberStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.assertPassword(dto.password, user.passwordHash);
    return this.issueTokens({
      profileType: AuthProfileType.MEMBER,
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    });
  }

  /**
   * Emite un nuevo access (+ rota refresh) a partir de un refresh válido.
   *
   * @throws {UnauthorizedException} Refresh inválido, expirado o revocado.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { superUser: true, staffUser: true, member: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    if (stored.profileType === AuthProfileType.SUPER && stored.superUser) {
      if (!stored.superUser.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.issueTokens({
        profileType: AuthProfileType.SUPER,
        userId: stored.superUser.id,
        email: stored.superUser.email,
        name: stored.superUser.name,
      });
    }

    if (stored.profileType === AuthProfileType.STAFF && stored.staffUser) {
      if (!stored.staffUser.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      await this.assertTenantActive(stored.staffUser.tenantId);
      return this.issueTokens({
        profileType: AuthProfileType.STAFF,
        userId: stored.staffUser.id,
        email: stored.staffUser.email,
        name: stored.staffUser.name,
        tenantId: stored.staffUser.tenantId,
      });
    }

    if (stored.profileType === AuthProfileType.MEMBER && stored.member) {
      if (stored.member.status !== MemberStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      await this.assertTenantActive(stored.member.tenantId);
      return this.issueTokens({
        profileType: AuthProfileType.MEMBER,
        userId: stored.member.id,
        email: stored.member.email,
        name: stored.member.name,
        tenantId: stored.member.tenantId,
      });
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  /**
   * Revoca el refresh token (logout). Idempotente si ya estaba revocado.
   */
  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Cambia la contraseña del usuario autenticado (STAFF o SUPER).
   *
   * @remarks Verifica la actual con bcrypt; si cambia, revoca todos los
   * refresh tokens del usuario (obliga a re-login).
   * @throws {UnauthorizedException} Contraseña actual inválida o perfil sin soporte.
   */
  async changePassword(
    user: AuthUser,
    dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    const newHash = await bcrypt.hash(dto.newPassword, 12);

    if (user.profileType === AuthProfileType.STAFF) {
      const staffUser = await this.prisma.staffUser.findUnique({
        where: { id: user.userId },
      });
      if (!staffUser) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await this.assertPassword(dto.currentPassword, staffUser.passwordHash);
      await this.prisma.staffUser.update({
        where: { id: user.userId },
        data: { passwordHash: newHash },
      });
      await this.prisma.refreshToken.updateMany({
        where: { staffUserId: user.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }

    if (user.profileType === AuthProfileType.SUPER) {
      const superUser = await this.prisma.superUser.findUnique({
        where: { id: user.userId },
      });
      if (!superUser) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await this.assertPassword(dto.currentPassword, superUser.passwordHash);
      await this.prisma.superUser.update({
        where: { id: user.userId },
        data: { passwordHash: newHash },
      });
      await this.prisma.refreshToken.updateMany({
        where: { superUserId: user.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }

    throw new BadRequestException(
      'Cambio de contraseña no disponible para este perfil',
    );
  }

  private async resolveTenantId(dto: {
    tenantId?: string;
    tenantSlug?: string;
  }): Promise<string> {
    if (dto.tenantId) {
      return dto.tenantId;
    }
    if (!dto.tenantSlug) {
      throw new BadRequestException('Provide tenantId or tenantSlug');
    }
    const slug = normalizeTenantSlug(dto.tenantSlug);
    assertValidTenantSlug(slug);
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return tenant.id;
  }

  private async assertTenantActive(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('Tenant is not active');
    }
  }

  private async assertPassword(
    plain: string,
    passwordHash: string,
  ): Promise<void> {
    const ok = await bcrypt.compare(plain, passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private async issueTokens(owner: TokenOwner): Promise<AuthTokens> {
    const payload: JwtAccessPayload = {
      sub: owner.userId,
      email: owner.email,
      profileType: owner.profileType,
      tenantId: owner.tenantId,
      impersonatedBy: owner.impersonatedBy,
    };

    // Impersonation tokens expiran en 4 horas
    const ttl = owner.impersonatedBy ? 4 * 60 * 60 : this.accessTtlSeconds;

    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: ttl,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        profileType: owner.profileType,
        expiresAt,
        superUserId:
          owner.profileType === AuthProfileType.SUPER ? owner.userId : null,
        staffUserId:
          owner.profileType === AuthProfileType.STAFF ? owner.userId : null,
        memberId:
          owner.profileType === AuthProfileType.MEMBER ? owner.userId : null,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
      tokenType: 'Bearer',
      profileType: owner.profileType,
      user: {
        id: owner.userId,
        email: owner.email,
        name: owner.name,
        tenantId: owner.tenantId,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
