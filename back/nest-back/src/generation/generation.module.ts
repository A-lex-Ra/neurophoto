import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { GenerationJobProcessor } from './generation.processor';
import { GenerationGateway } from './generation.gateway';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { OpenAIModule } from '../openai/openai.module';
import { GalleryModule } from '../gallery/gallery.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [QueueModule, StorageModule, OpenAIModule, GalleryModule, BillingModule],
  controllers: [GenerationController, GenerationGateway],
  providers: [GenerationService, GenerationJobProcessor],
  exports: [GenerationService],
})
export class GenerationModule { }
