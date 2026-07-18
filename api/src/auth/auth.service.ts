import { createHash, randomBytes } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProfileType, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokens, JwtAccessPayload } from './auth.types';
import { MemberLoginDto, StaffLoginDto, SuperLoginDto } from './dto/auth.dto';

type TokenOwner = {
  profileType: AuthProfileType;
  userId: string;
  email: string;
  name: string | null;
  tenantId?: string;
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
   * Login de staff dentro de un tenant.
   *
   * @throws {UnauthorizedException} Credenciales inválidas.
   * @throws {ForbiddenException} Tenant suspendido.
   */
  async loginStaff(dto: StaffLoginDto): Promise<AuthTokens> {
    await this.assertTenantActive(dto.tenantId);
    const user = await this.prisma.staffUser.findUnique({
      where: {
        tenantId_email: {
          tenantId: dto.tenantId,
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
   * @throws {UnauthorizedException} Credenciales inválidas.
   * @throws {ForbiddenException} Tenant suspendido.
   */
  async loginMember(dto: MemberLoginDto): Promise<AuthTokens> {
    await this.assertTenantActive(dto.tenantId);
    const user = await this.prisma.member.findUnique({
      where: {
        tenantId_email: {
          tenantId: dto.tenantId,
          email: dto.email.toLowerCase(),
        },
      },
    });
    if (!user?.active) {
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
      if (!stored.member.active) {
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
    };

    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: this.accessTtlSeconds,
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
