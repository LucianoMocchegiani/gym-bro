import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityGuard } from './guards/identity.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperGuard } from './guards/super.guard';
import { IdentityService } from './identity.service';
import { GoogleIdTokenService } from './google-id-token.service';
import { AppleIdTokenService } from './apple-id-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Módulo de autenticación JWT + refresh (Super / Staff / Member).
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    forwardRef(() => AuditModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    IdentityService,
    GoogleIdTokenService,
    AppleIdTokenService,
    JwtStrategy,
    JwtAuthGuard,
    SuperGuard,
    IdentityGuard,
  ],
  exports: [
    AuthService,
    IdentityService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    SuperGuard,
  ],
})
export class AuthModule {}
