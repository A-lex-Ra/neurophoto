import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.galleryService.uploadFile(user.id, file);
  }

  @Get('user/me')
  async getMyFiles(
    @CurrentUser() user,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.galleryService.findUserFiles(
      user.id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('user/:userId')
  async getUserFiles(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.galleryService.findUserFiles(
      userId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':fileId')
  async downloadFile(@Param('fileId') fileId: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, filename, mimeType } = await this.galleryService.downloadFile(fileId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    });

    return new StreamableFile(buffer);
  }

  @Get(':fileId/url')
  async getPublicUrl(@Param('fileId') fileId: string) {
    const url = await this.galleryService.getPublicUrl(fileId);
    return { url };
  }

  @Delete(':fileId')
  async remove(@Param('fileId') fileId: string, @CurrentUser() user) {
    return this.galleryService.remove(fileId, user.id);
  }
}
