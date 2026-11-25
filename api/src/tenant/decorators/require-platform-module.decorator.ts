import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PLATFORM_MODULE = 'required_platform_module';

export const RequirePlatformModule = (moduleKey: string) =>
  SetMetadata(REQUIRED_PLATFORM_MODULE, moduleKey);
