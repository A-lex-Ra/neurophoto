export interface FileRecord {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  bucket: string;
  hash: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  userId: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FilesResponse {
  data: FileRecord[]; //files
  total: number;
  limit: number;
  offset: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface GenerationResponse {
  id: string;
  jobId: string;
  status: string;
  streamUrl: string;
}