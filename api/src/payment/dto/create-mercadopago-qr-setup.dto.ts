import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
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
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude!: number;
}
