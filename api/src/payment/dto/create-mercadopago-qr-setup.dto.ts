import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMercadoPagoQrSetupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  streetName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  streetNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cityName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  stateName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
