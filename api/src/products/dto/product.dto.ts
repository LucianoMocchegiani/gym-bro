import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateStockAdjustmentDto {
  @IsString()
  @IsIn(['IN', 'OUT'])
  type!: 'IN' | 'OUT';

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
