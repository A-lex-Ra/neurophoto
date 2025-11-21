import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { OpenAIModule } from './openai/openai.module';
import { GenerationModule } from './generation/generation.module';
import { GalleryModule } from './gallery/gallery.module';
import { ToolsModule } from './tools/tools.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    QueueModule,
    OpenAIModule,
    GenerationModule,
    GalleryModule,
    ToolsModule,
    AuthModule,
    BillingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
