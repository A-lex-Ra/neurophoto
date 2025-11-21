import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface UploadFileData {
  originalname?: string;
  extension?: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Upload file to storage and create database record
   */
  async uploadFile(
    userId: string,
    file: UploadFileData,
    folder: 'uploads' | 'generations' = 'uploads',
  ) {
    try {
      // Calculate file hash for deduplication
      const hash = this.calculateHash(file.buffer);

      // Check if file already exists
      const existingFile = await this.prisma.file.findUnique({
        where: { hash },
      });

      if (existingFile) {
        this.logger.log(`File with hash ${hash} already exists, reusing...`);
        return existingFile;
      }

      // Generate unique filename
      if (!file.originalname) {
        file.originalname = `file.${file.extension!}`;
      }
      const filename = `${uuidv4()}.${file.extension || this.getFileExtensionFromName(file.originalname)}`;
      const path = `${folder}/${filename}`;

      // Upload to MinIO
      const { path: storagePath, hash: storageHash } = await this.storage.uploadFile(
        path,
        file.buffer,
        file.mimetype,
      );

      // Create database record
      const fileRecord = await this.prisma.file.create({
        data: {
          originalName: file.originalname,
          filename,
          path: storagePath,
          hash: storageHash,
          mimeType: file.mimetype,
          size: file.buffer.length,
          userId,
        },
      });

      this.logger.log(`File uploaded: ${fileRecord.id}`);

      return fileRecord;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Get user's files
   */
  async findUserFiles(userId: string, limit = 50, offset = 0) {
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.file.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      data: files,
      total,
      limit,
      offset,
    };
  }

  /**
   * Download file
   */
  async downloadFile(id: string) {
    const file = await this.findOne(id);
    const buffer = await this.storage.downloadFile(file.path);

    // Increment download count
    await this.prisma.file.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      buffer,
      filename: file.originalName,
      mimeType: file.mimeType,
    };
  }

  /**
   * Get public URL for file
   */
  async getPublicUrl(id: string): Promise<string> {
    const file = await this.findOne(id);
    return this.storage.getPublicUrl(file.path);
  }

  /**
   * Delete file (soft delete)
   */
  async remove(id: string, userId: string) {
    const file = await this.findOne(id);

    if (file.userId !== userId) {
      throw new NotFoundException('File not found');
    }

    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`File soft deleted: ${id}`);

    return { success: true };
  }

  /**
   * Calculate SHA256 hash of buffer
   */
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get file extension from filename
   */
  private getFileExtensionFromName(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'bin';
  }
}
