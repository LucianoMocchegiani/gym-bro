import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CreateMpCartCheckoutDto } from './create-mp-cart-checkout.dto';

export class CreateMpPointQrCartCheckoutDto extends CreateMpCartCheckoutDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99)
  discountPercent?: number;
}
