'use client';

import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileRecord } from '../types/api';

interface GalleryProps {
  userId: string;
}

export function Gallery({ userId }: GalleryProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [userId]);

  async function loadFiles() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUserFiles(userId);
      setFiles(response.data);
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(fileId: string) {
    try {
      await api.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative group bg-white rounded-lg shadow-sm overflow-hidden"
        >
          {/* Image Preview */}
          <div className="aspect-square bg-gray-100">
            <img
              src={file.path}
              alt={file.originalName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Overlay with Actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <a
              href={file.path}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              title="View"
            >
              👁️
            </a>
            <button
              onClick={() => handleDelete(file.id)}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors text-red-600"
              title="Delete"
            >
              🗑️
            </button>
          </div>

          {/* File Info */}
          <div className="p-2 text-sm">
            <div className="font-medium truncate" title={file.originalName}>
              {file.originalName}
            </div>
            <div className="text-gray-500 text-xs">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}