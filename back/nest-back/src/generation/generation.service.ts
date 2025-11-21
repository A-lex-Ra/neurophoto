import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { BillingService } from '../billing/billing.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { GenerationStatus, AccessCode } from '@prisma/client';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly GENERATION_COST = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly billingService: BillingService,
  ) { }

  /**
   * Create a new generation task
   */
  async create(userId: string, dto: CreateGenerationDto, accessCode?: AccessCode) {
    this.logger.debug('Creating generation with dto:', JSON.stringify(dto));

    if (!dto || !dto.prompt) {
      this.logger.error('Invalid generation DTO - missing prompt');
      throw new Error('Invalid generation request - prompt is required');
    }

    // Deduct credits
    // If accessCode is provided (legacy), we skip credit deduction from user balance
    // But since we are moving to full auth, we should prioritize user credits.
    // If accessCode is passed, we might still use it, but let's assume we use BillingService.

    // Determine the cost: use custom cost from DTO if provided, otherwise use default
    const creditCost = dto.cost ?? this.GENERATION_COST;

    if (!accessCode) {
      try {
        await this.billingService.deductCredits(userId, creditCost, 'Image Generation');
      } catch (error) {
        throw new BadRequestException('Insufficient credits');
      }
    } else {
      // Legacy AccessCode logic (to be removed later or kept for transition)
      await this.prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { usesLeft: { decrement: 1 } }
      });
    }

    // Create generation record
    const generation = await this.prisma.generation.create({
      data: {
        userId,
        inputFileId: dto.inputFileId,
        prompt: dto.prompt,
        model: dto.model || process.env.MODEL_NAME || 'gemini-2.5-flash-image-preview',
        status: GenerationStatus.PENDING,
        jobId: '', // Will be updated after job creation
        accessCodeId: accessCode ? accessCode.id : null,
      },
    });

    // Add job to queue
    const jobId = await this.queueService.addGenerationJob({
      generationId: generation.id,
      userId,
      inputFileId: dto.inputFileId,
      prompt: dto.prompt,
      model: generation.model,
    });

    // Update generation with jobId
    await this.prisma.generation.update({
      where: { id: generation.id },
      data: { jobId },
    });

    this.logger.log(`Created generation ${generation.id} with job ${jobId}`);

    return {
      id: generation.id,
      jobId,
      status: generation.status,
      streamUrl: `/api/generations/stream/${jobId}`,
    };
  }

  /**
   * Get generation by ID
   */
  async findOne(id: string) {
    const generation = await this.prisma.generation.findUnique({
      where: { id },
      include: {
        inputFile: true,
        outputFile: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    return generation;
  }

  /**
   * Get user's generations
   */
  async findUserGenerations(userId: string, limit = 20, offset = 0) {
    const [generations, total] = await Promise.all([
      this.prisma.generation.findMany({
        where: { userId },
        include: {
          inputFile: true,
          outputFile: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.generation.count({
        where: { userId },
      }),
    ]);

    return {
      data: generations,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update generation status
   */
  async updateStatus(
    generationId: string,
    status: GenerationStatus,
    data?: {
      outputFileId?: string;
      textResponse?: string;
      error?: string;
      progress?: number;
      durationMs?: number;
      startedAt?: Date;
    },
  ) {
    const updateData: any = {
      status,
      ...data,
    };

    if (status === GenerationStatus.GENERATING && !data?.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === GenerationStatus.COMPLETED || status === GenerationStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    const generation = await this.prisma.generation.update({
      where: { id: generationId },
      data: updateData,
    });

    // Refund credits if failed
    if (status === GenerationStatus.FAILED && !generation.accessCodeId) {
      await this.billingService.refundCredits(generation.userId, this.GENERATION_COST, 'Generation Failed Refund');
    }

    return generation;
  }

  /**
   * Delete generation (soft delete)
   */
  async remove(id: string, userId: string) {
    const generation = await this.findOne(id);

    if (generation.userId !== userId) {
      throw new NotFoundException('Generation not found');
    }

    // Cancel job if still pending/generating
    if (
      generation.status === GenerationStatus.PENDING ||
      generation.status === GenerationStatus.GENERATING
    ) {
      await this.queueService.removeJob(generation.jobId);
      await this.updateStatus(generation.id, GenerationStatus.CANCELLED);

      // Refund if cancelled before completion
      if (!generation.accessCodeId) {
        await this.billingService.refundCredits(generation.userId, this.GENERATION_COST, 'Generation Cancelled Refund');
      }
    }

    return { success: true };
  }
}
