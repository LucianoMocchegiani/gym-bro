import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export const AD_PLACEMENTS = ['MEMBER_PORTAL', 'DASHBOARD', 'GYM_SITE'] as const;
export const AD_EVENT_TYPES = ['IMPRESSION', 'CLICK'] as const;

export class SaveAdCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  body!: string;

  // shortcut: creatives use HTTPS URLs, migrate to owned uploads when asset management is added.
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl!: string;

  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(2048)
  targetUrl!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsBoolean()
  active!: boolean;

  @IsArray()
  @IsIn(AD_PLACEMENTS, { each: true })
  placements!: string[];
}

export class TrackAdEventDto {
  @IsString()
  @MaxLength(80)
  tenantSlug!: string;

  @IsString()
  @MaxLength(36)
  campaignId!: string;

  @IsIn(AD_PLACEMENTS)
  placement!: (typeof AD_PLACEMENTS)[number];

  @IsIn(AD_EVENT_TYPES)
  type!: (typeof AD_EVENT_TYPES)[number];
}
