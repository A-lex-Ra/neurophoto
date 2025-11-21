'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../services/api';
import { FileRecord } from '../types/api';
import { cn } from '../utils/cn';
// NOW UNUSED
interface FileUploadProps {
  onUploadComplete?: (file: FileRecord) => void;
  onUploadError?: (error: Error) => void;
}
// NOW UNUSED
export function FileUpload({ onUploadComplete, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      setIsUploading(true);
      const file = acceptedFiles[0];
      const uploadedFile = await api.uploadFile(file);
      onUploadComplete?.(uploadedFile);
    } catch (error) {
      console.error('Upload failed:', error);
      onUploadError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
        isUploading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <div className="space-y-4">
        <div className="text-4xl">📸</div>
        {isUploading ? (
          <p className="text-gray-600">Загрузка...</p>
        ) : isDragActive ? (
          <p className="text-blue-600">Отпустите файл здесь...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600">
              Перетащите изображение сюда или кликните для выбора
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, GIF до 10MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}