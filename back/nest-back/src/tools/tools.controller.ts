import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/tools')
@UseGuards(JwtAuthGuard)
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) { }

  @Post(':toolName/call')
  async toolCall(@Body() toolCallParams: any, @Param('toolName') toolName: string, @CurrentUser() user) {
    try {
      console.log('Received tool call request:', JSON.stringify(toolCallParams));
      return this.toolsService.toolCall(user.id, toolName, toolCallParams);
    } catch (error) {
      console.error('Tool call request failed:', error);
      throw error;
    }
  }

  @Get('list')
  async list(
    @CurrentUser() user,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.toolsService.listTools();
  }
}
