import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import {
  FOLDER_NOTE_BODY_MAX,
  FOLDER_NOTE_TITLE_MAX,
} from '../folder.constants';

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
  @MaxLength(FOLDER_NOTE_TITLE_MAX)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(FOLDER_NOTE_BODY_MAX)
  body!: string;

  @IsOptional()
  @IsUUID()
  labelId?: string;
}
