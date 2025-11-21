import { UploadFileData } from "src/gallery/gallery.service";

// utils/file-conversion.util.ts
// TODO review it
export class FileConversionUtil {
  /**
   * Преобразует base64 строку изображения в GalleryService's UploadFileData
   */
  static base64ToUploadFileData(
    base64String: string, 
    filename?: string
  ): UploadFileData {
    // Определяем MIME type из base64 строки
    const mimeType = this.getMimeTypeFromBase64(base64String);
    const extension = this.getExtensionFromMimeType(mimeType);
    
    // Извлекаем чистые base64 данные (убираем data URL префикс если есть)
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    
    // Конвертируем в Buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    return {
      originalname: filename,
      extension,
      mimetype: mimeType,
      buffer,
    };
  }

  /**
   * Определяет MIME type из base64 строки
   */
  private static getMimeTypeFromBase64(base64String: string): string {
    const signature = base64String.substring(0, 30);
    
    if (signature.includes('data:image/png')) return 'image/png';
    if (signature.includes('data:image/jpeg')) return 'image/jpeg';
    if (signature.includes('data:image/jpg')) return 'image/jpeg';
    if (signature.includes('data:image/webp')) return 'image/webp';
    if (signature.includes('data:image/gif')) return 'image/gif';
    
    // Если data URL префикса нет, проверяем magic numbers после декодирования
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    return this.getMimeTypeFromBuffer(buffer);
  }

  /**
   * Определяет MIME type по содержимому Buffer
   */
  private static getMimeTypeFromBuffer(buffer: Buffer): string {
    // PNG: первые 8 байт
    if (buffer.length >= 8 && 
        buffer[0] === 0x89 && 
        buffer[1] === 0x50 && 
        buffer[2] === 0x4E && 
        buffer[3] === 0x47 && 
        buffer[4] === 0x0D && 
        buffer[5] === 0x0A && 
        buffer[6] === 0x1A && 
        buffer[7] === 0x0A) {
      return 'image/png';
    }
    
    // JPEG: начинается с FF D8 FF
    if (buffer.length >= 3 && 
        buffer[0] === 0xFF && 
        buffer[1] === 0xD8 && 
        buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // WebP: начинается с RIFF....WEBP
    if (buffer.length >= 12 && 
        buffer.toString('utf8', 0, 4) === 'RIFF' &&
        buffer.toString('utf8', 8, 12) === 'WEBP') {
      return 'image/webp';
    }
    
    // По умолчанию предполагаем PNG (наиболее вероятный формат для генерации)
    return 'image/png';
  }

  /**
   * Получает расширение файла из MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const extensionMap: { [key: string]: string } = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    
    return extensionMap[mimeType] || 'png';
  }
}