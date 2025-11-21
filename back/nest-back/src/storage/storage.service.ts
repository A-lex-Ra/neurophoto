import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'generations';
    
    const accessKeyId = process.env.MINIO_ACCESS_KEY ?? '';
    const secretAccessKey = process.env.MINIO_SECRET_KEY ?? '';
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set');
    }
    this.s3Client = new S3Client({
      endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.logger.log(`Storage initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload file to MinIO
   */
  async uploadFile(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ path: string; hash: string }> {
    try {
      const hash = this.calculateHash(buffer);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded: ${path}`);

      return { path, hash };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download file from MinIO
   */
  async downloadFile(path: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get signed URL for file download
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file from MinIO
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate SHA256 hash of buffer
   */
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(path: string): string {
    return `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${this.bucket}/${path}`;
  }
}
