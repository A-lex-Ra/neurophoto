import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateGenerationDto {
  @IsOptional()
  @IsString()
  inputFileId?: string;

  @IsNotEmpty()
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  cost?: number; // Custom cost in credits (overrides default GENERATION_COST)
}
