import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que exige un access JWT válido (strategy `jwt`).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
