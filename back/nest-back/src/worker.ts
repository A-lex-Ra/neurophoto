import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  logger.log('🚀 Worker started and processing jobs...');
  
  // Keep the process running
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received: closing worker');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
