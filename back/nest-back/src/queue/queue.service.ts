import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface GenerationJobData {
  generationId: string;
  userId: string;
  inputFileId?: string;
  prompt: string;
  model: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  /**
   * Add generation job to queue
   */
  async addGenerationJob(data: GenerationJobData): Promise<string> {
    const job = await this.generationQueue.add('generate-image', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 4000,
      },
    });

    this.logger.log(`Added generation job: ${job.id}`);
    return job.id as string;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    const job = await this.generationQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
    };
  }

  /**
   * Remove job
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.generationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed job: ${jobId}`);
    }
  }
}
