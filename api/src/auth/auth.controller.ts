import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTokens, MembershipsList, type AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequireIdentityAuth } from './decorators/require-identity-auth.decorator';
import { RequireSuperAuth } from './decorators/require-super-auth.decorator';
import {
  ChangePasswordDto,
  GoogleLoginDto,
  AppleLoginDto,
  IdentityLoginDto,
  ImpersonateDto,
  LogoutDto,
  MemberLoginDto,
  RefreshTokenDto,
  SelectContextDto,
  StaffLoginDto,
  SuperLoginDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Endpoints de autenticación por perfil (RN-ROL-005).
 *
 * @remarks Rutas bajo el prefijo global `api` → `/api/auth/...`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login Super Admin.
   */
  @Post('super/login')
  loginSuper(@Body() dto: SuperLoginDto): Promise<AuthTokens> {
    return this.authService.loginSuper(dto);
  }

  /**
   * Super Admin impersona a un staff member (token temporal 4h).
   *
   * @remarks Requiere permisos de Super. Registra en audit log.
   */
  @RequireSuperAuth()
  @Post('super/impersonate')
  impersonate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImpersonateDto,
  ): Promise<AuthTokens> {
    return this.authService.impersonate(user.userId, dto);
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
    * Login de persona con `id_token` de Google Sign-In (app).
    *
    * @remarks Crea identity si el mail es nuevo; vincula `google_sub` si ya existe.
    */
  @Post('google')
  loginGoogle(@Body() dto: GoogleLoginDto): Promise<AuthTokens> {
    return this.authService.loginGoogle(dto);
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
   * Lista de gyms/perfiles de la identity.
   */
  @Get('memberships')
  @RequireIdentityAuth()
  listMemberships(
    @CurrentUser() user: AuthUser,
  ): Promise<MembershipsList> {
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
   * Revoca el refresh token actual.
   */
  @Post('logout')
  logout(@Body() dto: LogoutDto): Promise<{ ok: true }> {
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Cambia la contraseña del usuario autenticado (staff / super).
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
   * Devuelve el usuario del access token (smoke de guards).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
