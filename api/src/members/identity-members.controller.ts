import { Body, Controller, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireIdentityAuth } from '../auth/decorators/require-identity-auth.decorator';
import { SelfJoinMemberDto } from './dto/member.dto';
import { MembersService } from './members.service';
import { SelfJoinResult } from './members.types';

/**
 * Persona (JWT Identity) que se hace socia de un gym desde su web.
 */
@Controller('identity')
@RequireIdentityAuth()
export class IdentityMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post('memberships')
  selfJoin(
    @CurrentUser() user: AuthUser,
    @Body() dto: SelfJoinMemberDto,
  ): Promise<SelfJoinResult> {
    return this.membersService.selfJoin(user.userId, dto);
  }
}
