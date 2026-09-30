import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Alta de etiqueta del gym. */
export class CreateFolderLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

/** Alta de nota. */
export class CreateFolderNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsUUID()
  labelId?: string;
}
