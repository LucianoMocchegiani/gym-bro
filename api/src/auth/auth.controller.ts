import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthTokens,
  ImpersonateHandoffResult,
  MembershipsList,
  type AuthMeResponse,
  type AuthUser,
} from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequireIdentityAuth } from './decorators/require-identity-auth.decorator';
import { PlatformTenantGuard } from './guards/platform-tenant.guard';
import { PermissionGuard } from '../roles/guards/permission.guard';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import {
  ChangePasswordDto,
  GoogleLoginDto,
  StaffGoogleLoginDto,
  AppleLoginDto,
  FromCookieDto,
  IdentityLoginDto,
  IdentityRegisterDto,
  ImpersonateDto,
  LogoutDto,
  MemberLoginDto,
  RefreshTokenDto,
  SelectContextDto,
  StaffLoginDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlatformAccessService } from '../tenant/platform-access.service';
import {
  IMPERSONATION_HANDOFF_COOKIE,
  clearHandoffCookie,
  setHandoffCookie,
} from './handoff-cookie';

/**
 * Endpoints de autenticación por perfil (RN-ROL-005).
 *
 * @remarks Rutas bajo el prefijo global `api` → `/api/auth/...`.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly platformAccess: PlatformAccessService,
  ) {}

  /**
   * Impersona a un staff de otro gym desde el tenant `admin`.
   *
   * @remarks Setea cookie `impersonation_handoff` (un uso, ~60 s). El gym
   * destino llama `POST /auth/from-handoff`. No devuelve JWT (el origen
   * plataforma no debe persistir la sesión del gym).
   */
  // Orden: `@RequirePermission` arriba de `@UseGuards` (PermissionGuard después del JWT).
  @RequirePermission('platform.impersonate')
  @UseGuards(JwtAuthGuard, PlatformTenantGuard, PermissionGuard)
  @Post('super/impersonate')
  async impersonate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImpersonateDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ImpersonateHandoffResult> {
    const { tenantSlug, handoffId } = await this.authService.impersonate(
      user.userId,
      dto,
    );
    setHandoffCookie(res, this.config, handoffId);
    return { tenantSlug };
  }

  /**
   * Canjea la cookie de impersonación por JWT del staff destino.
   */
  @Post('from-handoff')
  async fromHandoff(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const handoffId = req.cookies?.[IMPERSONATION_HANDOFF_COOKIE];
    if (typeof handoffId !== 'string' || !handoffId) {
      throw new UnauthorizedException('No session');
    }
    try {
      return await this.authService.exchangeHandoff(handoffId);
    } finally {
      clearHandoffCookie(res, this.config);
    }
  }

  /**
   * Login staff de un tenant.
   */
  @Post('staff/login')
  loginStaff(@Body() dto: StaffLoginDto): Promise<AuthTokens> {
    return this.authService.loginStaff(dto);
  }

  /**
   * Login afiliado de un tenant.
   */
  @Post('member/login')
  loginMember(@Body() dto: MemberLoginDto): Promise<AuthTokens> {
    return this.authService.loginMember(dto);
  }

  /**
   * Login de persona (sin gym). Email + password de `identities`.
   */
  @Post('identity/login')
  loginIdentity(@Body() dto: IdentityLoginDto): Promise<AuthTokens> {
    return this.authService.loginIdentity(dto);
  }

  /**
   * Crea una cuenta Faciliter (email + password) para contratar un gym.
   */
  @Post('identity/register')
  registerIdentity(@Body() dto: IdentityRegisterDto): Promise<AuthTokens> {
    return this.authService.registerIdentity(dto);
  }

  /**
   * Login de persona con `id_token` de Google Sign-In (app).
   *
   * @remarks Crea identity si el mail es nuevo; vincula `google_sub` si ya existe.
   */
  @Post('google')
  loginGoogle(@Body() dto: GoogleLoginDto): Promise<AuthTokens> {
    return this.authService.loginGoogle(dto);
  }

  /**
   * Staff de un tenant entra con `id_token` de Google (Admin web).
   *
   * @remarks El tenantId viene de la URL. Verifica que la identity sea staff de ese tenant.
   */
  @Post('staff/:tenantId/google')
  loginStaffGoogle(
    @Param('tenantId') tenantId: string,
    @Body() dto: StaffGoogleLoginDto,
  ): Promise<AuthTokens> {
    return this.authService.loginStaffGoogle(tenantId, dto);
  }

  /**
   * Login de persona con `id_token` de Sign in with Apple (app).
   *
   * @remarks Crea identity si el mail es nuevo; vincula `apple_sub` si ya existe.
   */
  @Post('apple')
  loginApple(@Body() dto: AppleLoginDto): Promise<AuthTokens> {
    return this.authService.loginApple(dto);
  }

  /**
   * Intercambia cookie central de login proxy por JWT.
   *
   * @remarks Tras Google en `login.faciliter.xyz`. Sin `tenantSlug` → Identity
   * (alta o sesión en el apex). Con slug → staff o socio de ese gym.
   */
  @Post('from-cookie')
  fromCookie(
    @Req() req: Request,
    @Body() dto: FromCookieDto,
  ): Promise<AuthTokens> {
    const sessionId = req.cookies?.central_session;
    if (!sessionId) {
      throw new UnauthorizedException('No session');
    }
    return this.authService.loginFromProxy(sessionId, dto.tenantSlug);
  }

  /**
   * Lista de gyms/perfiles de la identity.
   */
  @Get('memberships')
  @RequireIdentityAuth()
  listMemberships(@CurrentUser() user: AuthUser): Promise<MembershipsList> {
    return this.authService.listMemberships(user.userId);
  }

  /**
   * Emite JWT de negocio para un gym + perfil.
   */
  @Post('select-context')
  @RequireIdentityAuth()
  selectContext(
    @CurrentUser() user: AuthUser,
    @Body() dto: SelectContextDto,
  ): Promise<AuthTokens> {
    return this.authService.selectContext(user.userId, dto);
  }

  /**
   * Renueva access (y rota refresh) con un refresh token válido.
   */
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Revoca el refresh token actual. Si hay cookie de handoff pendiente, la tira.
   */
  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const handoffId = req.cookies?.[IMPERSONATION_HANDOFF_COOKIE];
    if (typeof handoffId === 'string' && handoffId) {
      this.authService.discardHandoff(handoffId);
      clearHandoffCookie(res, this.config);
    }
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Cambia la contraseña del usuario autenticado (staff o Identity).
   *
   * @remarks Revoca todos los refresh tokens → obliga a re-login.
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    return this.authService.changePassword(user, dto);
  }

  /**
   * Usuario del access token + si el gym puede operar (plan Faciliter).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<AuthMeResponse> {
    const platformAccess = await this.resolvePlatformAccess(user);
    return { ...user, platformAccess };
  }

  private async resolvePlatformAccess(
    user: AuthUser,
  ): Promise<AuthMeResponse['platformAccess']> {
    if (user.profileType !== 'STAFF' || !user.tenantId || user.impersonatedBy) {
      return 'ok';
    }
    return this.platformAccess.evaluate(user.tenantId);
  }
}
