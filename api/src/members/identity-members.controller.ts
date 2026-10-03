import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireIdentityAuth } from '../auth/decorators/require-identity-auth.decorator';
import { StartMemberSignupDto } from './dto/member.dto';
import { MemberSignupService } from './member-signup.service';
import { MemberSignupCheckout, MemberSignupView } from './members.types';

/**
 * Persona (JWT Identity) que se hace socia de un gym desde su web: paga
 * primero y el socio nace con el pago aprobado (RN-CTA-007).
 */
@Controller('identity/member-signups')
@RequireIdentityAuth()
export class IdentityMembersController {
  constructor(private readonly signups: MemberSignupService) {}

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartMemberSignupDto,
  ): Promise<MemberSignupCheckout> {
    return this.signups.start(user.userId, dto);
  }

  @Get(':id')
  getMine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MemberSignupView> {
    return this.signups.getMine(user.userId, id);
  }
}
