import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OpenAIGenerateImageResponse, OpenAIService } from '../openai/openai.stub';
import { GenerationJobData } from '../queue/queue.service';
import { GalleryService } from '../gallery/gallery.service';
import { FileConversionUtil } from '../utils/file-conversion.util';

export interface GenerationJobResult {
  generationId: string; // meta info
  status: 'COMPLETED' | 'FAILED';
  result?: OpenAIGenerateImageResponse & { imageFileId?: string };
  error?: string;
}

@Processor('generation')
export class GenerationJobProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationJobProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly openai: OpenAIService,
    private readonly gallery: GalleryService,
  ) {
    super();
  }

  async process(job: Job<GenerationJobData>): Promise<GenerationJobResult> {
    const { generationId, userId, inputFileId, prompt, model } = job.data;

    this.logger.log(`Processing generation ${generationId}, job ${job.id}`);

    const startTime = Date.now();

    try {
      // Update status to GENERATING
      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'GENERATING',
          startedAt: new Date(),
          progress: 10,
        },
      });

      await job.updateProgress(10);

      // Get input file if provided
      let inputImageBase64 = '';
      if (inputFileId) {
        const inputFile = await this.prisma.file.findUnique({
          where: { id: inputFileId },
        });

        if (!inputFile) {
          throw new Error('Input file not found');
        }

        this.logger.log(`Downloading input file: ${inputFile.path}`);

        try {
          const buffer = await this.storage.downloadFile(inputFile.path);
          // Convert to base64 with proper mime type prefix
          inputImageBase64 = `data:${inputFile.mimeType};base64,${buffer.toString('base64')}`;
        } catch (error) {
          this.logger.error(`Failed to download input file: ${error.message}`);
          throw new Error('Failed to download input file');
        }
      }

      await job.updateProgress(30);

      // Call OpenAI API
      this.logger.log('Calling OpenAI API...');
      const result = await this.openai.generateImage(inputImageBase64, prompt);

      await job.updateProgress(70);

      // you should handle the generated image, load to storage
      let outputFileId: string | undefined = undefined;
      if (result.imageUrl) {
        ({ id: outputFileId } = await this.gallery.uploadFile(userId, FileConversionUtil.base64ToUploadFileData(result.imageUrl)));
      }
      const durationMs = Date.now() - startTime;

      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'COMPLETED',
          textResponse: result.text,
          outputFileId,
          progress: 100,
          completedAt: new Date(),
          durationMs,
        },
      });

      await job.updateProgress(100);

      this.logger.log(`Generation ${generationId} completed in ${durationMs}ms`);

      return {
        generationId,
        status: 'COMPLETED',
        result: { ...result, imageFileId: outputFileId },
      };
    } catch (error) {
      this.logger.error(`Generation ${generationId} failed: ${error.message}`);

      await this.prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
