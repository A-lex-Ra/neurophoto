import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GenerationService } from './generation.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/generations')
@UseGuards(JwtAuthGuard)
export class GenerationController {
  constructor(private readonly generationService: GenerationService) { }

  @Post('create')
  async create(@Body() createGenerationDto: CreateGenerationDto, @CurrentUser() user) {
    try {
      console.log('Received generation request:', JSON.stringify(createGenerationDto));
      return this.generationService.create(user.id, createGenerationDto);
    } catch (error) {
      console.error('Generation request failed:', error);
      throw error;
    }
  }

  @Get('list')
  async list(
    @CurrentUser() user,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.generationService.findUserGenerations(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.generationService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user) {
    return this.generationService.remove(id, user.id);
  }
}
