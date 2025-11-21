import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { GenerationModule } from 'src/generation/generation.module';
import { ToolsService } from './tools.service';

@Module({
  imports: [GenerationModule],
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
